"""
插件控制器

暴露插件管理 API 接口给前端。
"""

from pathlib import Path
from typing import Dict, List, Optional, Any
import threading
import logging

from .plugin_manager import PluginManager
from .plugin_scanner import PluginScanner
from .plugin_cache import PluginCache
from .dependency_manager import DependencyManager
from .git_concurrent import GitConcurrent
from .dependency_checker import DependencyChecker
from .models import PluginInfo
from .git_permission_fixer import GitPermissionFixer
from .git_utils import GitUtils

# 导入日志工具
from ...utils.logger import app_logger as logger


class PluginController:
    """插件控制器 - API 接口层"""
    
    def __init__(
        self,
        cache_dir: Path,
        git_path: str = None,
        python_path: Optional[Path] = None,
        max_workers: int = 10
    ):
        """
        初始化插件控制器
        
        Args:
            cache_dir: 缓存目录
            git_path: Git 可执行文件路径（可选，默认使用项目内置 MinGit）
            python_path: Python 可执行文件路径
            max_workers: 最大并发数
        """
        # 如果未提供 git_path，使用项目内置的 MinGit
        if git_path is None:
            from ...utils.git_config import get_git_executable
            git_path = get_git_executable()
        
        # 创建共享的 GitUtils 实例
        git_utils = GitUtils(git_path=git_path)
        
        self.cache = PluginCache(cache_dir)
        self.scanner = PluginScanner()
        self.manager = PluginManager(git_path=git_path, max_workers=max_workers)
        self.dependency_manager = DependencyManager(python_path=python_path)
        self.git_concurrent = GitConcurrent(git_utils=git_utils, max_workers=max_workers)
        self.dependency_checker = DependencyChecker()
        
        # 初始化 Git 权限修复器
        self.git_permission_fixer = GitPermissionFixer(
            git_utils=git_utils,
            max_workers=max_workers,
            timeout=10
        )
        
        # 当前环境配置
        self.current_env_id: Optional[str] = None
        self.custom_nodes_paths: List[Path] = []  # 所有 custom_nodes 路径（主路径 + 外置路径）
        self.primary_custom_nodes_path: Optional[Path] = None  # 主路径（路径列表第一项）
        
        # 刷新进度跟踪（增强版）
        self._refresh_progress = {
            'is_updating': False,
            'stage': '',  # 当前阶段标识
            'stage_name': '',  # 当前阶段名称（中文）
            'current': 0,
            'total': 0,
            'updated_plugins': []
        }
        self._refresh_lock = threading.Lock()
        
        # 后台更新任务跟踪
        self._background_thread: Optional[threading.Thread] = None
        self._cancel_background_update = False
    
    def set_environment(self, env_id: str, custom_nodes_paths: List[Path], python_path: Optional[Path] = None):
        """
        设置当前环境（增强版：支持多路径）
        
        增强功能：
        1. 设置环境 ID 和 custom_nodes 路径列表
        2. 支持主路径 + 外置路径的多目录聚合
        3. 如果提供了 python_path，更新 DependencyManager 的 Python 路径
        4. 确保后台任务使用正确的 Python 环境
        
        Args:
            env_id: 环境 ID
            custom_nodes_paths: custom_nodes 目录路径列表（第一个为主路径）
            python_path: Python 可执行文件路径（可选）
        """
        self.current_env_id = env_id
        self.custom_nodes_paths = custom_nodes_paths
        self.primary_custom_nodes_path = custom_nodes_paths[0] if custom_nodes_paths else None
        
        # 如果提供了 python_path，更新 DependencyManager
        if python_path:
            current_python_path = self.dependency_manager._python_path
            if str(current_python_path) != str(python_path):
                self.dependency_manager._python_path = python_path
                logger.info(f"[PluginController] 已更新 Python 路径: {python_path}")
    
    def _find_plugin_path(self, plugin_name: str) -> Optional[Path]:
        """
        在所有 custom_nodes 路径中查找插件目录
        
        按路径列表顺序查找，返回第一个匹配的路径。
        主路径优先，外置路径次之。
        
        Args:
            plugin_name: 插件名称
            
        Returns:
            插件目录路径，未找到返回 None
        """
        for base_path in self.custom_nodes_paths:
            plugin_path = base_path / plugin_name
            if plugin_path.exists():
                return plugin_path
        return None
    
    def _scan_all_paths(self, paths: List[Path], skip_git_info: bool = True) -> List[PluginInfo]:
        """
        扫描所有 custom_nodes 路径，合并结果
        
        主路径优先，后续路径如有同名插件则跳过。
        为每个 PluginInfo 标记 source 字段。
        
        Args:
            paths: custom_nodes 路径列表
            skip_git_info: 是否跳过 Git 信息
            
        Returns:
            合并后的插件列表
        """
        all_scanned = []
        seen_names = set()
        
        for i, path in enumerate(paths):
            if not path.exists():
                continue
            
            try:
                scanned = self.scanner.scan_plugins(
                    path,
                    fetch_updates=False,
                    skip_git_info=skip_git_info
                )
                for p in scanned:
                    if p.name not in seen_names:
                        seen_names.add(p.name)
                        p.source = "primary" if i == 0 else f"external_{i}"
                        all_scanned.append(p)
            except Exception as e:
                logger.warning(f"[_scan_all_paths] 扫描路径失败 {path}: {e}")
        
        return all_scanned
    
    def trigger_background_update(self, env_id: Optional[str] = None, custom_nodes_paths: Optional[List[Path]] = None):
        """
        触发后台高并发更新任务（增强版 - 支持多路径）
        
        功能：
        1. 参数验证：检查 env_id 和 custom_nodes_paths 的有效性
        2. 检查是否有旧任务在运行
        3. 如果有，取消之前的任务
        4. 启动新的后台线程
        5. 执行并发更新任务
        6. 更新进度状态
        
        Args:
            env_id: 环境 ID（可选，使用当前环境）
            custom_nodes_paths: custom_nodes 目录路径列表（可选，使用当前路径列表）
        
        Returns:
            dict: 操作结果
            {
                "success": bool,
                "message": str,
                "background_updating": bool,
                "total_plugins": int  # 插件总数（成功时）
                "error": str  # 错误信息（失败时）
            }
        """
        try:
            # 使用提供的参数或当前环境配置
            target_env_id = env_id or self.current_env_id
            target_paths = custom_nodes_paths or self.custom_nodes_paths
            
            # 参数验证 1: 检查 env_id 是否有效（包括空白字符串）
            if not target_env_id or (isinstance(target_env_id, str) and not target_env_id.strip()):
                logger.warning("[trigger_background_update] 环境 ID 无效或未设置")
                return {
                    'success': False,
                    'error': '环境 ID 无效或未设置',
                    'background_updating': False
                }
            
            # 参数验证 2: 检查 custom_nodes_paths 是否有效
            if not target_paths:
                logger.warning(f"[trigger_background_update] custom_nodes 路径列表无效或未设置，env_id={target_env_id}")
                return {
                    'success': False,
                    'error': 'custom_nodes 路径列表无效或未设置',
                    'background_updating': False
                }
            
            # 参数验证 3: 确保主路径存在（不存在则尝试创建）
            primary_path = target_paths[0] if target_paths else None
            if primary_path and not primary_path.exists():
                logger.info(f"[trigger_background_update] 主 custom_nodes 路径不存在，尝试创建: {primary_path}, env_id={target_env_id}")
                try:
                    primary_path.mkdir(parents=True, exist_ok=True)
                    logger.info(f"[trigger_background_update] 主 custom_nodes 目录创建成功: {primary_path}")
                except Exception as e:
                    logger.warning(f"[trigger_background_update] 无法创建主 custom_nodes 目录: {primary_path}, 错误: {e}")
                    return {
                        'success': False,
                        'error': f'无法创建主 custom_nodes 目录: {primary_path}',
                        'background_updating': False
                    }
            
            # 检查是否有旧任务在运行
            with self._refresh_lock:
                if self._background_thread and self._background_thread.is_alive():
                    logger.info(f"[trigger_background_update] 检测到旧任务正在运行，正在取消，env_id={target_env_id}")
                    # 设置取消标志
                    self._cancel_background_update = True
                    # 等待旧任务结束（最多等待1秒）
                    self._background_thread.join(timeout=1.0)
                
                # 重置取消标志
                self._cancel_background_update = False
            
            # 快速扫描所有插件目录（获取基础信息，多路径聚合）
            logger.info(f"[trigger_background_update] 开始扫描 {len(target_paths)} 个插件目录, env_id={target_env_id}")
            scanned_plugins = self._scan_all_paths(target_paths, skip_git_info=True)
            logger.info(f"[trigger_background_update] 扫描完成，发现 {len(scanned_plugins)} 个插件")
            
            # 从缓存加载详细信息
            cached_plugins = self.cache.load_plugins_cache(target_env_id)
            
            # 合并基础信息和缓存信息
            merged_plugins = self.cache.incremental_update(cached_plugins, scanned_plugins)
            
            # 重置刷新进度
            with self._refresh_lock:
                self._refresh_progress = {
                    'is_updating': True,
                    'stage': '',  # 添加阶段标识
                    'stage_name': '',  # 添加阶段名称
                    'current': 0,
                    'total': len(merged_plugins),
                    'updated_plugins': []
                }
            
            # 启动新的后台线程
            self._background_thread = threading.Thread(
                target=self._background_update_task,
                args=(target_env_id, merged_plugins),
                daemon=True
            )
            self._background_thread.start()
            
            logger.info(f"[trigger_background_update] 后台更新任务已启动: env_id={target_env_id}, plugins={len(merged_plugins)}")
            
            return {
                'success': True,
                'message': '后台更新任务已启动',
                'background_updating': True,
                'total_plugins': len(merged_plugins)
            }
        
        except Exception as e:
            logger.error(f"[trigger_background_update] 触发后台更新失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f'触发后台更新失败: {str(e)}',
                'background_updating': False
            }
    
    def _background_update_task(self, env_id: str, plugins: List[PluginInfo]):
        """
        后台并发更新任务（增强版 - 带详细进度和错误处理）
        
        增强功能：
        1. 并发获取所有插件的 Git 信息（32线程）
        2. 执行 pip list 获取已安装包
        3. 并发解析所有插件的依赖文件（32线程）
        4. 批量检查依赖安装状态
        5. 检测依赖变化
        6. 更新所有缓存
        7. 支持取消操作
        8. 详细的阶段进度跟踪
        9. 完善的错误处理和日志记录
        
        Args:
            env_id: 环境 ID
            plugins: 插件列表（PluginInfo.path 已是绝对路径）
        """
        logger.info(f"[_background_update_task] 开始后台更新任务: env_id={env_id}, plugins_count={len(plugins)}")
        
        try:
            # 检查是否被取消
            if self._cancel_background_update:
                logger.info("[_background_update_task] 任务在启动时被取消")
                with self._refresh_lock:
                    self._refresh_progress['is_updating'] = False
                return
            
            # 步骤 1: 更新 Git 信息
            logger.debug("[_background_update_task] 步骤 1: 开始更新 Git 信息")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'git_info'
                    self._refresh_progress['stage_name'] = '正在更新 Git 信息'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = len([p for p in plugins if p.is_git_repo])
                
                # 定义进度回调函数（保留阶段信息 + 流式更新插件数据）
                def progress_callback(current, total):
                    try:
                        with self._refresh_lock:
                            # 只更新进度，不覆盖阶段信息
                            self._refresh_progress['current'] = current
                            self._refresh_progress['total'] = total
                            
                            # 流式更新：每次进度更新时，保存当前已更新的插件数据
                            self._refresh_progress['updated_plugins'] = self._serialize_plugins(plugins)
                        
                        # 流式保存到缓存：每次进度更新时，立即保存到缓存
                        if self.current_env_id:
                            self.cache.save_plugins_cache(env_id, plugins)
                    except Exception as e:
                        logger.warning(f"[_background_update_task] 进度回调失败: {str(e)}")
                
                updated_plugins = self.git_concurrent.update_git_info_concurrent(
                    plugins,
                    progress_callback=progress_callback,
                    timeout_per_plugin=30  # 30秒超时
                )
                logger.debug(f"[_background_update_task] 步骤 1 完成: 更新了 {len(updated_plugins)} 个插件的 Git 信息")
                
                # 步骤 1 完成后,立即保存缓存
                try:
                    if self.current_env_id:
                        self.cache.save_plugins_cache(env_id, updated_plugins)
                        logger.info("[_background_update_task] 步骤 1 完成后已保存插件缓存")
                except Exception as e:
                    logger.error(f"[_background_update_task] 步骤 1 完成后保存缓存失败: {str(e)}")
                    
            except Exception as e:
                logger.error(f"[_background_update_task] 步骤 1 失败 - 更新 Git 信息时出错: {str(e)}")
                import traceback
                logger.error(f"[_background_update_task] 堆栈跟踪:\n{traceback.format_exc()}")
                # 使用原始插件列表继续执行
                updated_plugins = plugins
            
            # 检查是否被取消
            if self._cancel_background_update:
                logger.info("[_background_update_task] 任务在步骤 1 后被取消")
                with self._refresh_lock:
                    self._refresh_progress['is_updating'] = False
                return
            
            # 步骤 2: 获取已安装包
            logger.info("[_background_update_task] 步骤 2: 开始获取已安装包列表")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'pip_list'
                    self._refresh_progress['stage_name'] = '正在获取已安装包列表'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = 1
                
                installed_packages = self.dependency_manager.get_all_installed_packages()
                with self._refresh_lock:
                    self._refresh_progress['current'] = 1
                logger.info(f"[_background_update_task] 步骤 2 完成: 获取了 {len(installed_packages)} 个已安装包")
            except Exception as e:
                logger.warning(f"[_background_update_task] 步骤 2 失败 - pip list 执行失败: {str(e)}")
                import traceback
                logger.warning(f"[_background_update_task] 堆栈跟踪:\n{traceback.format_exc()}")
                installed_packages = {}
            
            # 检查是否被取消
            if self._cancel_background_update:
                logger.info("[_background_update_task] 任务在步骤 2 后被取消")
                with self._refresh_lock:
                    self._refresh_progress['is_updating'] = False
                return
            
            # 步骤 3: 解析依赖文件
            logger.info("[_background_update_task] 步骤 3: 开始解析插件依赖")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'parse_deps'
                    self._refresh_progress['stage_name'] = '正在解析插件依赖'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = len(updated_plugins)
                
                plugins_deps = self.scanner.parse_all_dependencies(updated_plugins)
                
                with self._refresh_lock:
                    self._refresh_progress['current'] = len(plugins_deps)
                logger.info(f"[_background_update_task] 步骤 3 完成: 解析了 {len(plugins_deps)} 个插件的依赖")
            except Exception as e:
                logger.error(f"[_background_update_task] 步骤 3 失败 - 解析依赖时出错: {str(e)}")
                import traceback
                logger.error(f"[_background_update_task] 堆栈跟踪:\n{traceback.format_exc()}")
                plugins_deps = {}
            
            # 检查是否被取消
            if self._cancel_background_update:
                logger.info("[_background_update_task] 任务在步骤 3 后被取消")
                with self._refresh_lock:
                    self._refresh_progress['is_updating'] = False
                return
            
            # 步骤 4: 检查依赖安装状态
            logger.info("[_background_update_task] 步骤 4: 开始检查依赖安装状态")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'check_deps'
                    self._refresh_progress['stage_name'] = '正在检查依赖安装状态'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = len(plugins_deps) if installed_packages else 0
                
                if installed_packages:
                    deps_status = self.dependency_manager.batch_check_dependencies(
                        plugins_deps,
                        installed_packages
                    )
                    
                    with self._refresh_lock:
                        self._refresh_progress['current'] = len(deps_status)
                    logger.info(f"[_background_update_task] 步骤 4 完成: 检查了 {len(deps_status)} 个插件的依赖状态")
                else:
                    deps_status = {}
                    logger.warning("[_background_update_task] 步骤 4 跳过: 没有已安装包信息")
            except Exception as e:
                logger.error(f"[_background_update_task] 步骤 4 失败 - 检查依赖状态时出错: {str(e)}")
                import traceback
                logger.error(f"[_background_update_task] 堆栈跟踪:\n{traceback.format_exc()}")
                deps_status = {}
            
            # 检查是否被取消
            if self._cancel_background_update:
                logger.info("[_background_update_task] 任务在步骤 4 后被取消")
                with self._refresh_lock:
                    self._refresh_progress['is_updating'] = False
                return
            
            # 步骤 5: 检测依赖变化
            logger.info("[_background_update_task] 步骤 5: 开始检测依赖变化")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'detect_changes'
                    self._refresh_progress['stage_name'] = '正在检测依赖变化'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = len(updated_plugins)
                
                # 加载缓存的依赖信息
                cached_deps_data = self.cache.load_dependencies_cache(env_id)
                cached_deps = cached_deps_data.get('dependencies', {})
                
                # 批量检测所有插件的依赖变化
                changes_summary = self.dependency_checker.batch_check_all_changes(
                    plugins_deps,
                    cached_deps
                )
                
                with self._refresh_lock:
                    self._refresh_progress['current'] = len(updated_plugins)
                
                # 更新插件的 dependency_updated 标记
                for plugin in updated_plugins:
                    if plugin.name in changes_summary['changes']:
                        change_info = changes_summary['changes'][plugin.name]
                        
                        if change_info['has_changes']:
                            # 有变化：设置 dependency_updated=True, dependency_viewed=False
                            plugin.dependency_updated = True
                            plugin.dependency_viewed = False
                        # 如果没有变化，保持原状态（不修改）
                
                logger.info(f"[_background_update_task] 步骤 5 完成: 检测到 {changes_summary.get('total_changes', 0)} 个插件有依赖变化")
            except Exception as e:
                logger.error(f"[_background_update_task] 步骤 5 失败 - 检测依赖变化时出错: {str(e)}")
                import traceback
                logger.error(f"[_background_update_task] 堆栈跟踪:\n{traceback.format_exc()}")
            
            # 检查是否被取消
            if self._cancel_background_update:
                logger.info("[_background_update_task] 任务在步骤 5 后被取消")
                with self._refresh_lock:
                    self._refresh_progress['is_updating'] = False
                return
            
            # 步骤 6-7: 保存缓存
            logger.info("[_background_update_task] 步骤 6-7: 开始保存缓存")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'saving'
                    self._refresh_progress['stage_name'] = '正在保存缓存'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = 2
                
                # 步骤 6: 保存依赖缓存
                try:
                    deps_cache_data = {
                        'pip_list_snapshot': installed_packages,
                        'dependencies': plugins_deps,
                        'viewed_status': cached_deps_data.get('viewed_status', {})
                    }
                    self.cache.save_dependencies_cache(env_id, deps_cache_data)
                    
                    with self._refresh_lock:
                        self._refresh_progress['current'] = 1
                    logger.info("[_background_update_task] 步骤 6 完成: 依赖缓存已保存")
                except Exception as e:
                    logger.error(f"[_background_update_task] 步骤 6 失败 - 保存依赖缓存时出错: {str(e)}")
                    import traceback
                    logger.error(f"[_background_update_task] 堆栈跟踪:\n{traceback.format_exc()}")
                
                # 步骤 7: 保存插件缓存
                try:
                    self.cache.save_plugins_cache(env_id, updated_plugins)
                    
                    with self._refresh_lock:
                        self._refresh_progress['current'] = 2
                    logger.info("[_background_update_task] 步骤 7 完成: 插件缓存已保存")
                except Exception as e:
                    logger.error(f"[_background_update_task] 步骤 7 失败 - 保存插件缓存时出错: {str(e)}")
                    import traceback
                    logger.error(f"[_background_update_task] 堆栈跟踪:\n{traceback.format_exc()}")
            except Exception as e:
                logger.error(f"[_background_update_task] 步骤 6-7 失败 - 保存缓存时出错: {str(e)}")
                import traceback
                logger.error(f"[_background_update_task] 堆栈跟踪:\n{traceback.format_exc()}")
            
            # 标记更新完成
            with self._refresh_lock:
                self._refresh_progress['is_updating'] = False
                self._refresh_progress['stage'] = ''
                self._refresh_progress['stage_name'] = ''
                self._refresh_progress['updated_plugins'] = self._serialize_plugins(updated_plugins)
            
            logger.info("[_background_update_task] 后台更新任务成功完成")
        
        except Exception as e:
            logger.error(f"[_background_update_task] 后台更新任务失败 - 顶层异常: {str(e)}")
            import traceback
            logger.error(f"[_background_update_task] 完整堆栈跟踪:\n{traceback.format_exc()}")
            
            # 确保任务状态被正确清理
            try:
                with self._refresh_lock:
                    self._refresh_progress['is_updating'] = False
                    self._refresh_progress['stage'] = 'error'
                    self._refresh_progress['stage_name'] = '任务失败'
                    self._refresh_progress['error'] = str(e)
            except Exception as cleanup_error:
                logger.error(f"[_background_update_task] 清理任务状态时出错: {str(cleanup_error)}")
        
        finally:
            # 最终确保任务状态被清理
            try:
                with self._refresh_lock:
                    if self._refresh_progress.get('is_updating', False):
                        logger.warning("[_background_update_task] finally 块中检测到任务状态未清理，强制清理")
                        self._refresh_progress['is_updating'] = False
            except Exception as final_error:
                logger.error(f"[_background_update_task] finally 块中出错: {str(final_error)}")
    
    def get_plugins(self, use_cache: bool = True) -> Dict:
        """
        获取插件列表（优化版 - 快速返回）
        
        策略：
        1. 快速扫描插件目录（只获取基础信息：名称、路径、是否Git仓库）
        2. 从缓存加载详细信息（Git信息、依赖信息）
        3. 以缓存为主，只更新新增/删除的插件
        4. 立即返回（目标 < 100ms）
        
        注意：不再同步获取 Git 信息，Git 信息由后台任务更新
        
        Args:
            use_cache: 是否使用缓存（保留参数以兼容现有调用）
            
        Returns:
            插件列表响应
        """
        try:
            if not self.current_env_id or not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            # 步骤 1: 快速扫描插件目录（只获取基础信息，跳过 Git 信息，多路径聚合）
            scanned_plugins = self._scan_all_paths(self.custom_nodes_paths, skip_git_info=True)
            
            # 步骤 2: 从缓存加载详细信息
            cached_plugins = self.cache.load_plugins_cache(self.current_env_id)
            
            # 步骤 3: 以缓存为主，只处理新增/删除的插件
            # 构建扫描结果的名称集合
            scanned_names = {p.name for p in scanned_plugins}
            
            # 过滤缓存中仍然存在的插件
            result_plugins = [p for p in cached_plugins if p.name in scanned_names]
            
            # 添加新增的插件（在扫描结果中但不在缓存中）
            cached_names = {p.name for p in cached_plugins}
            for scanned_plugin in scanned_plugins:
                if scanned_plugin.name not in cached_names:
                    result_plugins.append(scanned_plugin)
            
            # 立即返回
            return {
                'success': True,
                'plugins': self._serialize_plugins(result_plugins),
                'from_cache': True  # 使用缓存数据
            }
        
        except Exception as e:
            logger.error(f"[PluginController] 获取插件列表失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }
    
    def search_plugins(self, keyword: str) -> Dict:
        """
        搜索插件
        
        Args:
            keyword: 搜索关键词
            
        Returns:
            搜索结果
        """
        try:
            if not self.current_env_id:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            # 从缓存加载
            plugins = self.cache.load_plugins_cache(self.current_env_id)
            
            # 过滤
            keyword_lower = keyword.lower()
            filtered = [
                p for p in plugins
                if keyword_lower in p.name.lower()
            ]
            
            return {
                'success': True,
                'plugins': self._serialize_plugins(filtered)
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def refresh_plugins(self) -> Dict:
        """
        刷新插件列表（增量更新 - 流式返回）
        
        策略：
        1. 立即返回缓存数据
        2. 启动后台任务并发更新Git信息
        3. 前端可以轮询获取更新进度
        
        Returns:
            刷新结果
        """
        try:
            if not self.current_env_id or not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            # 检查是否已有后台任务在运行
            with self._refresh_lock:
                if self._refresh_progress['is_updating']:
                    # 立即返回缓存数据
                    cached = self.cache.load_plugins_cache(self.current_env_id)
                    return {
                        'success': True,
                        'plugins': self._serialize_plugins(cached),
                        'updated': False,
                        'from_cache': True,
                        'background_updating': True,
                        'message': '后台更新任务正在进行中'
                    }
            
            # 立即加载并返回缓存数据
            cached = self.cache.load_plugins_cache(self.current_env_id)
            
            # 快速扫描目录（检测新增/删除，多路径聚合）
            scanned = self._scan_all_paths(self.custom_nodes_paths, skip_git_info=True)
            
            # 增量更新
            merged = self.cache.incremental_update(cached, scanned)
            
            # 保存缓存
            self.cache.save_plugins_cache(self.current_env_id, merged)
            
            # 重置刷新进度
            with self._refresh_lock:
                self._refresh_progress = {
                    'is_updating': True,
                    'stage': '',  # 添加阶段标识
                    'stage_name': '',  # 添加阶段名称
                    'current': 0,
                    'total': len(merged),
                    'updated_plugins': []
                }
            
            # 启动后台任务更新Git信息（并发）
            thread = threading.Thread(
                target=self._background_update_git_info,
                args=(merged,),
                daemon=True
            )
            thread.start()
            
            # 立即返回缓存数据
            return {
                'success': True,
                'plugins': self._serialize_plugins(merged),
                'updated': True,
                'from_cache': True,
                'background_updating': True  # 标记后台正在更新
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def refresh_plugin_git_info(self, plugin_name: str) -> Dict:
        """
        刷新单个插件的 Git 信息
        
        用于用户点击"获取超时"等错误按钮后的重试操作，
        只刷新指定插件的 Git 信息，不影响其他插件。
        
        Args:
            plugin_name: 插件名称
            
        Returns:
            刷新结果，包含更新后的插件信息
        """
        try:
            if not self.current_env_id or not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            # 从缓存中查找插件
            cached_plugins = self.cache.load_plugins_cache(self.current_env_id)
            plugin = None
            for p in cached_plugins:
                if p.name == plugin_name:
                    plugin = p
                    break
            
            if not plugin:
                return {
                    'success': False,
                    'error': f'未找到插件: {plugin_name}'
                }
            
            if not plugin.is_git_repo:
                return {
                    'success': False,
                    'error': f'插件 {plugin_name} 不是 Git 仓库'
                }
            
            # 调用 git_concurrent 的单插件更新方法
            updated_plugin = self.git_concurrent.update_single_plugin_git_info(plugin)
            
            if updated_plugin:
                # 更新缓存中的该插件信息
                for i, p in enumerate(cached_plugins):
                    if p.name == plugin_name:
                        cached_plugins[i] = updated_plugin
                        break
                
                # 保存缓存
                self.cache.save_plugins_cache(self.current_env_id, cached_plugins)
                
                # 根据是否有错误信息判断是否真正成功
                if updated_plugin.git_fetch_error:
                    return {
                        'success': False,
                        'error': updated_plugin.git_fetch_error,
                        'plugin': self._plugin_to_dict(updated_plugin)
                    }
                else:
                    return {
                        'success': True,
                        'plugin': self._plugin_to_dict(updated_plugin)
                    }
            else:
                return {
                    'success': False,
                    'error': f'获取插件 {plugin_name} 的 Git 信息失败'
                }
        
        except Exception as e:
            logger.error(f"[PluginController] 刷新单个插件 Git 信息失败: {plugin_name}, {str(e)}")
            import traceback
            logger.error(f"[PluginController] 堆栈跟踪:\n{traceback.format_exc()}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _background_update_git_info(self, plugins: List[PluginInfo]):
        """
        后台并发更新Git信息和依赖变化检测
        
        增强功能：
        1. 并发更新 Git 信息
        2. 批量获取已安装包（pip list）
        3. 并发解析所有插件的依赖文件
        4. 批量检查依赖安装状态
        5. 检测依赖变化并更新标记
        6. 保存所有缓存
        7. 确保任务状态的正确设置和清理（任务 3.1）
        
        Args:
            plugins: 插件列表
        """
        logger.debug(f"[_background_update_git_info] 开始后台更新任务: plugins_count={len(plugins)}")
        
        try:
            # 步骤 1: 更新 Git 信息
            logger.debug("[_background_update_git_info] 步骤 1: 开始更新 Git 信息")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'git_info'
                    self._refresh_progress['stage_name'] = '正在更新 Git 信息'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = len([p for p in plugins if p.is_git_repo])
                
                # 定义进度回调函数（保留阶段信息 + 流式更新插件数据）
                def progress_callback(current, total):
                    try:
                        with self._refresh_lock:
                            # 只更新进度，不覆盖阶段信息
                            self._refresh_progress['current'] = current
                            self._refresh_progress['total'] = total
                            
                            # 流式更新：每次进度更新时，保存当前已更新的插件数据
                            self._refresh_progress['updated_plugins'] = self._serialize_plugins(plugins)
                        
                        # 流式保存到缓存：每次进度更新时，立即保存到缓存
                        if self.current_env_id:
                            self.cache.save_plugins_cache(self.current_env_id, plugins)
                    except Exception as e:
                        logger.warning(f"[_background_update_git_info] 进度回调失败: {str(e)}")
                
                # 使用GitConcurrent并发更新Git信息
                updated_plugins = self.git_concurrent.update_git_info_concurrent(
                    plugins,
                    progress_callback=progress_callback
                )
                logger.debug(f"[_background_update_git_info] 步骤 1 完成: 更新了 {len(updated_plugins)} 个插件的 Git 信息")
            except Exception as e:
                logger.error(f"[_background_update_git_info] 步骤 1 失败 - 更新 Git 信息时出错: {str(e)}")
                import traceback
                logger.error(f"[_background_update_git_info] 堆栈跟踪:\n{traceback.format_exc()}")
                # 使用原始插件列表继续执行
                updated_plugins = plugins
            
            # 步骤 2: 批量获取已安装包（pip list）
            logger.debug("[_background_update_git_info] 步骤 2: 开始获取已安装包列表")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'pip_list'
                    self._refresh_progress['stage_name'] = '正在获取已安装包列表'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = 1
                
                installed_packages = self.dependency_manager.get_all_installed_packages()
                with self._refresh_lock:
                    self._refresh_progress['current'] = 1
                logger.debug(f"[_background_update_git_info] 步骤 2 完成: 获取了 {len(installed_packages)} 个已安装包")
            except Exception as e:
                logger.warning(f"[_background_update_git_info] 步骤 2 失败 - pip list 执行失败: {str(e)}")
                import traceback
                logger.warning(f"[_background_update_git_info] 堆栈跟踪:\n{traceback.format_exc()}")
                installed_packages = {}
            
            # 步骤 3: 并发解析所有插件的依赖文件
            logger.debug("[_background_update_git_info] 步骤 3: 开始解析插件依赖")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'parse_deps'
                    self._refresh_progress['stage_name'] = '正在解析插件依赖'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = len(updated_plugins)
                
                plugins_deps = self.scanner.parse_all_dependencies(updated_plugins)
                
                with self._refresh_lock:
                    self._refresh_progress['current'] = len(plugins_deps)
                logger.debug(f"[_background_update_git_info] 步骤 3 完成: 解析了 {len(plugins_deps)} 个插件的依赖")
            except Exception as e:
                logger.error(f"[_background_update_git_info] 步骤 3 失败 - 解析依赖时出错: {str(e)}")
                import traceback
                logger.error(f"[_background_update_git_info] 堆栈跟踪:\n{traceback.format_exc()}")
                plugins_deps = {}
            
            # 步骤 4: 批量检查依赖安装状态
            logger.debug("[_background_update_git_info] 步骤 4: 开始检查依赖安装状态")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'check_deps'
                    self._refresh_progress['stage_name'] = '正在检查依赖安装状态'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = len(plugins_deps) if installed_packages else 0
                
                if installed_packages:
                    deps_status = self.dependency_manager.batch_check_dependencies(
                        plugins_deps,
                        installed_packages
                    )
                    
                    with self._refresh_lock:
                        self._refresh_progress['current'] = len(deps_status)
                    logger.debug(f"[_background_update_git_info] 步骤 4 完成: 检查了 {len(deps_status)} 个插件的依赖状态")
                else:
                    deps_status = {}
                    logger.warning("[_background_update_git_info] 步骤 4 跳过: 没有已安装包信息")
            except Exception as e:
                logger.error(f"[_background_update_git_info] 步骤 4 失败 - 检查依赖状态时出错: {str(e)}")
                import traceback
                logger.error(f"[_background_update_git_info] 堆栈跟踪:\n{traceback.format_exc()}")
                deps_status = {}
            
            # 步骤 5: 检测依赖变化并更新标记
            logger.debug("[_background_update_git_info] 步骤 5: 开始检测依赖变化")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'detect_changes'
                    self._refresh_progress['stage_name'] = '正在检测依赖变化'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = len(updated_plugins)
                
                if self.current_env_id:
                    # 加载缓存的依赖信息
                    cached_deps_data = self.cache.load_dependencies_cache(self.current_env_id)
                    cached_deps = cached_deps_data.get('dependencies', {})
                    
                    # 批量检测所有插件的依赖变化
                    changes_summary = self.dependency_checker.batch_check_all_changes(
                        plugins_deps,
                        cached_deps
                    )
                    
                    with self._refresh_lock:
                        self._refresh_progress['current'] = len(updated_plugins)
                    
                    # 更新插件的 dependency_updated 标记
                    for plugin in updated_plugins:
                        if plugin.name in changes_summary['changes']:
                            change_info = changes_summary['changes'][plugin.name]
                            
                            if change_info['has_changes']:
                                # 有变化：设置 dependency_updated=True, dependency_viewed=False
                                plugin.dependency_updated = True
                                plugin.dependency_viewed = False
                            # 如果没有变化，保持原状态（不修改）
                    
                    logger.debug(f"[_background_update_git_info] 步骤 5 完成: 检测到 {changes_summary.get('total_changes', 0)} 个插件有依赖变化")
            except Exception as e:
                logger.error(f"[_background_update_git_info] 步骤 5 失败 - 检测依赖变化时出错: {str(e)}")
                import traceback
                logger.error(f"[_background_update_git_info] 堆栈跟踪:\n{traceback.format_exc()}")
            
            # 步骤 6-7: 保存缓存
            logger.debug("[_background_update_git_info] 步骤 6-7: 开始保存缓存")
            try:
                with self._refresh_lock:
                    self._refresh_progress['stage'] = 'saving'
                    self._refresh_progress['stage_name'] = '正在保存缓存'
                    self._refresh_progress['current'] = 0
                    self._refresh_progress['total'] = 2
                
                # 步骤 6: 保存依赖缓存
                if self.current_env_id:
                    try:
                        deps_cache_data = {
                            'pip_list_snapshot': installed_packages,
                            'dependencies': plugins_deps,
                            'viewed_status': cached_deps_data.get('viewed_status', {})
                        }
                        self.cache.save_dependencies_cache(self.current_env_id, deps_cache_data)
                        
                        with self._refresh_lock:
                            self._refresh_progress['current'] = 1
                        logger.debug("[_background_update_git_info] 步骤 6 完成: 依赖缓存已保存")
                    except Exception as e:
                        logger.error(f"[_background_update_git_info] 步骤 6 失败 - 保存依赖缓存时出错: {str(e)}")
                        import traceback
                        logger.error(f"[_background_update_git_info] 堆栈跟踪:\n{traceback.format_exc()}")
                
                # 步骤 7: 保存插件缓存
                if self.current_env_id:
                    try:
                        self.cache.save_plugins_cache(self.current_env_id, updated_plugins)
                        
                        with self._refresh_lock:
                            self._refresh_progress['current'] = 2
                        logger.debug("[_background_update_git_info] 步骤 7 完成: 插件缓存已保存")
                    except Exception as e:
                        logger.error(f"[_background_update_git_info] 步骤 7 失败 - 保存插件缓存时出错: {str(e)}")
                        import traceback
                        logger.error(f"[_background_update_git_info] 堆栈跟踪:\n{traceback.format_exc()}")
            except Exception as e:
                logger.error(f"[_background_update_git_info] 步骤 6-7 失败 - 保存缓存时出错: {str(e)}")
                import traceback
                logger.error(f"[_background_update_git_info] 堆栈跟踪:\n{traceback.format_exc()}")
            
            # 标记更新完成
            with self._refresh_lock:
                self._refresh_progress['is_updating'] = False
                self._refresh_progress['stage'] = ''
                self._refresh_progress['stage_name'] = ''
                self._refresh_progress['updated_plugins'] = self._serialize_plugins(updated_plugins)
            
            logger.debug("[_background_update_git_info] 后台更新任务成功完成")
        
        except Exception as e:
            logger.error(f"[_background_update_git_info] 后台更新任务失败 - 顶层异常: {str(e)}")
            import traceback
            logger.error(f"[_background_update_git_info] 完整堆栈跟踪:\n{traceback.format_exc()}")
            
            # 确保任务状态被正确清理
            try:
                with self._refresh_lock:
                    self._refresh_progress['is_updating'] = False
                    self._refresh_progress['stage'] = 'error'
                    self._refresh_progress['stage_name'] = '任务失败'
                    self._refresh_progress['error'] = str(e)
            except Exception as cleanup_error:
                logger.error(f"[_background_update_git_info] 清理任务状态时出错: {str(cleanup_error)}")
        
        finally:
            # 最终确保任务状态被清理（任务 3.1 要求）
            try:
                with self._refresh_lock:
                    if self._refresh_progress.get('is_updating', False):
                        logger.warning("[_background_update_git_info] finally 块中检测到任务状态未清理，强制清理")
                        self._refresh_progress['is_updating'] = False
            except Exception as final_error:
                logger.error(f"[_background_update_git_info] finally 块中出错: {str(final_error)}")
    
    def get_refresh_progress(self) -> Dict:
        """
        获取刷新进度（优化版 - 高性能）
        
        优化点：
        1. 只读取必要的字段，避免完整拷贝
        2. 减少锁的持有时间
        3. 避免不必要的计算和 I/O 操作
        4. 确保在 100ms 内返回
        
        Returns:
            刷新进度信息
        """
        try:
            # 在锁内快速读取必要的字段（避免完整拷贝）
            with self._refresh_lock:
                is_updating = self._refresh_progress['is_updating']
                stage = self._refresh_progress.get('stage', '')
                stage_name = self._refresh_progress.get('stage_name', '')
                current = self._refresh_progress['current']
                total = self._refresh_progress['total']
                # 注意：updated_plugins 可能是一个大列表，这里直接引用而不是拷贝
                # 因为我们只是读取，不会修改它
                plugins = self._refresh_progress.get('updated_plugins', [])
            
            # 在锁外构建返回结果（减少锁持有时间）
            return {
                'success': True,
                'is_updating': is_updating,
                'stage': stage,
                'stage_name': stage_name,
                'current': current,
                'total': total,
                'plugins': plugins
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def cancel_background_update(self) -> Dict:
        """
        取消后台更新任务
        
        Returns:
            操作结果
        """
        try:
            with self._refresh_lock:
                if not self._refresh_progress['is_updating']:
                    return {
                        'success': False,
                        'error': '没有正在进行的更新任务'
                    }
                
                # 设置取消标志
                self._cancel_background_update = True
            
            # 等待后台线程结束（最多等待5秒）
            if self._background_thread and self._background_thread.is_alive():
                self._background_thread.join(timeout=5.0)
                
                # 如果线程还在运行，记录警告
                if self._background_thread.is_alive():
                    logger.warning("[PluginController] 后台线程未能在5秒内停止")
            
            # 清理状态
            with self._refresh_lock:
                self._refresh_progress['is_updating'] = False
                self._refresh_progress['stage'] = ''
                self._refresh_progress['stage_name'] = ''
                self._refresh_progress['current'] = 0
                self._refresh_progress['total'] = 0
            
            # 重置取消标志
            self._cancel_background_update = False
            
            return {
                'success': True,
                'message': '后台更新任务已取消'
            }
        
        except Exception as e:
            logger.error(f"[PluginController] 取消后台更新失败: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_plugin_dependencies(self, plugin_name: str) -> Dict:
        """
        获取插件依赖列表（增强版）
        
        增强点：
        1. 调用 PluginCache.mark_dependency_viewed() 标记已查看
        2. 清除依赖更新提示
        
        Args:
            plugin_name: 插件名称
            
        Returns:
            依赖列表
        """
        try:
            if not self.current_env_id or not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            # 查找插件
            plugin_path = self._find_plugin_path(plugin_name)
            if not plugin_path or not plugin_path.exists():
                return {
                    'success': False,
                    'error': '插件不存在'
                }
            
            # 解析依赖
            dependencies = self.scanner.parse_dependencies(plugin_path)
            
            # 检测安装状态
            statuses = self.dependency_manager.get_dependencies_status(dependencies)
            
            # 标记用户已查看（使用 PluginCache 的方法）
            self.cache.mark_dependency_viewed(self.current_env_id, plugin_name)
            
            return {
                'success': True,
                'dependencies': [
                    {
                        'package': s.dependency.package,
                        'version': s.dependency.version,
                        'installed': s.installed,
                        'installed_version': s.dependency.installed_version,
                        'version_match': s.version_match,
                        'message': s.message,
                        'environment_marker': getattr(s.dependency, 'environment_marker', ''),  # 安全获取
                        'marker_match': getattr(s.dependency, 'marker_match', True),  # 安全获取，默认True
                        'pip_options': getattr(s.dependency, 'pip_options', [])  # 安全获取 pip 选项
                    }
                    for s in statuses
                ]
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def install_dependency(
        self,
        plugin_name: str,
        package: str,
        version: str = "",
        python_path: Optional[Path] = None,
        pip_options: Optional[List[str]] = None
    ) -> Dict:
        """
        安装依赖（增强版：支持指定 Python 路径和 pip 选项）
        
        增强功能:
        - 支持传入 python_path 参数，确保使用正确的 Python 环境
        - 支持传入 pip_options 参数（如 --extra-index-url）
        - 安装成功后自动检测依赖状态
        - 返回更新后的安装状态
        
        Args:
            plugin_name: 插件名称
            package: 包名
            version: 版本要求
            python_path: Python 可执行文件路径（可选，未提供时使用初始化时的路径）
            pip_options: pip 额外选项列表（可选，如 ["--extra-index-url", "https://..."]）
            
        Returns:
            安装结果（包含更新后的安装状态）
        """
        try:
            # 如果提供了 python_path，创建临时的 DependencyManager
            if python_path:
                temp_manager = DependencyManager(python_path=python_path)
                result = temp_manager.install_dependency(package, version, pip_options)
            else:
                # 使用默认的 DependencyManager
                result = self.dependency_manager.install_dependency(package, version, pip_options)
            
            # 如果安装成功，刷新依赖状态
            installed = False
            installed_version = ""
            
            if result.success:
                # 使用相同的 manager 重新检测依赖安装状态
                if python_path:
                    installed, installed_version = temp_manager.check_dependency_installed(
                        package, version
                    )
                else:
                    installed, installed_version = self.dependency_manager.check_dependency_installed(
                        package, version
                    )
            
            return {
                'success': result.success,
                'message': result.message,
                'error': result.error,
                'installed': installed,
                'installed_version': installed_version,
                'log_file': result.log_file  # 添加日志文件路径
            }
        
        except Exception as e:
            logger.error(f"[PluginController] 安装依赖异常: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'installed': False,
                'installed_version': '',
                'log_file': None
            }
    
    def update_plugin(
        self, 
        plugin_name: str, 
        force: bool = False,
        backup: bool = True,
        progress_callback: Optional[callable] = None,
        auto_install_deps: bool = True
    ) -> Dict:
        """
        更新单个插件
        
        Args:
            plugin_name: 插件名称
            force: 是否强制覆盖本地修改
            backup: 是否在更新前备份(默认True)
            progress_callback: 进度回调函数
            auto_install_deps: 是否自动安装新增依赖(默认True)
            
        Returns:
            更新结果,包含更新后的插件信息
        """
        try:
            if not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            plugin_path = self._find_plugin_path(plugin_name)
            if not plugin_path or not plugin_path.exists():
                return {
                    'success': False,
                    'error': '插件不存在'
                }
            
            python_path = None
            if auto_install_deps:
                python_path = self.dependency_manager._python_path
            
            result = self.manager.update_plugin(
                plugin_path, 
                force=force,
                backup=backup,
                progress_callback=progress_callback,
                auto_install_deps=auto_install_deps,
                python_path=python_path
            )
            
            # 如果更新成功,重新获取插件信息
            updated_plugin = None
            if result.success and self.current_env_id:
                # 优化:只扫描更新的插件,而不是所有插件
                try:
                    # 检查是否为 Git 仓库
                    is_git = self.scanner.git_utils.is_git_repo(plugin_path)
                    
                    # 获取安装日期
                    install_date = ""
                    try:
                        from datetime import datetime
                        stat_info = plugin_path.stat()
                        timestamp = stat_info.st_ctime
                        install_date = datetime.fromtimestamp(timestamp).isoformat()
                    except Exception as e:
                        logger.debug(f"获取插件 {plugin_name} 的创建时间失败: {e}")
                    
                    # 创建插件信息
                    updated_plugin = PluginInfo(
                        name=plugin_name,
                        path=plugin_path,
                        is_git_repo=is_git,
                        install_date=install_date
                    )
                    
                    # 获取 Git 信息(跳过更新检查,因为刚更新完)
                    if is_git:
                        git_info = self.scanner.get_git_info(plugin_path, fetch_updates=False)
                        if git_info:
                            updated_plugin.git_url = git_info.remote_url
                            updated_plugin.branch = git_info.current_branch
                            updated_plugin.default_branch = git_info.default_branch
                            updated_plugin.commit_hash = git_info.commit_hash
                            updated_plugin.commit_date = git_info.commit_date
                            updated_plugin.has_update = False  # 刚更新完,没有更新
                            updated_plugin.behind_commits = 0
                    
                    # 更新缓存
                    cached_plugins = self.cache.load_plugins_cache(self.current_env_id)
                    for i, p in enumerate(cached_plugins):
                        if p.name == plugin_name:
                            cached_plugins[i] = updated_plugin
                            break
                    self.cache.save_plugins_cache(self.current_env_id, cached_plugins)
                    
                except Exception as e:
                    logger.warning(f"[PluginController] 扫描更新后的插件 {plugin_name} 失败: {e}")
            
            return {
                'success': result.success,
                'message': result.message,
                'dependency_changed': result.dependency_changed,
                'new_dependencies': [
                    {'package': d.package, 'version': d.version}
                    for d in result.new_dependencies
                ],
                'installed_deps': result.installed_deps,
                'failed_deps': result.failed_deps,
                'plugin': self._plugin_to_dict(updated_plugin) if updated_plugin else None,
                'error': result.error
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_all_plugins(
        self,
        python_path: Optional[Path] = None,
        max_workers: Optional[int] = None,
        backup: bool = True
    ) -> Dict:
        """
        一键更新所有插件(增强版)
        
        增强功能:
        1. 获取当前环境配置
        2. 获取并发数配置
        3. 获取待更新插件列表
        4. 调用 PluginManager.update_all_plugins()
        5. 统计结果摘要(总数、成功、失败、依赖安装数)
        6. 返回结果和摘要
        7. 支持更新前备份和失败回滚
        
        Args:
            python_path: Python 可执行文件路径(用于安装依赖)
            max_workers: 最大并发数(None 使用默认值)
            backup: 是否在更新前备份(默认True)
        
        Returns:
            dict: 更新结果摘要
            {
                "success": bool,
                "results": [
                    {
                        "plugin_name": str,
                        "success": bool,
                        "message": str,
                        "dependency_changed": bool,
                        "dependencies_installed": int
                    }
                ],
                "summary": {
                    "total": int,
                    "success": int,
                    "failed": int,
                    "dependencies_installed": int
                }
            }
        """
        try:
            if not self.current_env_id or not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            # 如果没有提供 python_path,使用默认的
            if python_path is None:
                python_path = Path("python")  # 使用系统 Python
            
            # 获取有更新的插件
            plugins = self.cache.load_plugins_cache(self.current_env_id)
            plugins_to_update = [p for p in plugins if p.has_update]
            
            if not plugins_to_update:
                return {
                    'success': True,
                    'message': '没有需要更新的插件',
                    'results': [],
                    'summary': {
                        'total': 0,
                        'success': 0,
                        'failed': 0,
                        'dependencies_installed': 0
                    }
                }
            
            # 批量更新(传递 python_path, max_workers 和 backup)
            results = self.manager.update_all_plugins(
                plugins=plugins_to_update,
                python_path=python_path,
                max_workers=max_workers,
                backup=backup
            )
            
            # 统计结果
            success_count = sum(1 for r in results if r.success)
            failed_count = len(results) - success_count
            dependencies_installed = sum(
                getattr(r, 'dependencies_installed', 0) for r in results
            )
            
            # 优化:只重新扫描已更新的插件,而不是所有插件
            # 这样可以大幅减少响应时间
            updated_plugins_dict = {}
            
            # 只扫描成功更新的插件
            for result in results:
                if result.success:
                    plugin_path = self._find_plugin_path(result.plugin_name)
                    if plugin_path and plugin_path.exists():
                        try:
                            # 检查是否为 Git 仓库
                            is_git = self.scanner.git_utils.is_git_repo(plugin_path)
                            
                            # 获取安装日期
                            install_date = ""
                            try:
                                from datetime import datetime
                                stat_info = plugin_path.stat()
                                timestamp = stat_info.st_ctime
                                install_date = datetime.fromtimestamp(timestamp).isoformat()
                            except Exception as e:
                                logger.debug(f"获取插件 {result.plugin_name} 的创建时间失败: {e}")
                            
                            # 创建插件信息
                            plugin = PluginInfo(
                                name=result.plugin_name,
                                path=plugin_path,
                                is_git_repo=is_git,
                                install_date=install_date
                            )
                            
                            # 获取 Git 信息(跳过更新检查,因为刚更新完)
                            if is_git:
                                git_info = self.scanner.get_git_info(plugin_path, fetch_updates=False)
                                if git_info:
                                    plugin.git_url = git_info.remote_url
                                    plugin.branch = git_info.current_branch
                                    plugin.default_branch = git_info.default_branch
                                    plugin.commit_hash = git_info.commit_hash
                                    plugin.commit_date = git_info.commit_date
                                    plugin.has_update = False  # 刚更新完,没有更新
                                    plugin.behind_commits = 0
                            
                            updated_plugins_dict[result.plugin_name] = plugin
                        except Exception as e:
                            logger.warning(f"[PluginController] 扫描已更新插件 {result.plugin_name} 失败: {e}")
            
            # 更新缓存:合并已更新的插件信息
            if updated_plugins_dict:
                cached_plugins = self.cache.load_plugins_cache(self.current_env_id)
                plugins_dict = {p.name: p for p in cached_plugins}
                
                # 更新已更新的插件信息
                for name, updated_plugin in updated_plugins_dict.items():
                    plugins_dict[name] = updated_plugin
                
                # 保存更新后的缓存
                self.cache.save_plugins_cache(self.current_env_id, list(plugins_dict.values()))
            
            return {
                'success': True,
                'results': [
                    {
                        'plugin_name': r.plugin_name,
                        'success': r.success,
                        'message': r.message,
                        'dependency_changed': r.dependency_changed,
                        'dependencies_installed': getattr(r, 'dependencies_installed', 0),
                        'plugin': self._plugin_to_dict(updated_plugins_dict.get(r.plugin_name)) if r.success and r.plugin_name in updated_plugins_dict else None
                    }
                    for r in results
                ],
                'summary': {
                    'total': len(results),
                    'success': success_count,
                    'failed': failed_count,
                    'dependencies_installed': dependencies_installed
                }
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_update_info(self, plugin_name: str) -> Dict:
        """
        获取更新信息
        
        Args:
            plugin_name: 插件名称
            
        Returns:
            更新信息
        """
        try:
            if not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            plugin_path = self._find_plugin_path(plugin_name)
            if not plugin_path or not plugin_path.exists():
                return {
                    'success': False,
                    'error': '插件不存在'
                }
            
            # 获取提交日志 - 获取最近的所有提交（不限于待更新的）
            # 使用 origin/branch 作为起点，获取最近20个提交
            branch = self.git_concurrent.git_utils.get_current_branch(plugin_path)
            if not branch:
                return {
                    'success': False,
                    'error': '无法获取当前分支'
                }
            
            logger.debug(f"[PluginController] 获取 {plugin_name} 的提交历史，分支: {branch}")
            
            # 获取当前分支远程最新的20个提交
            commits = self.git_concurrent.get_all_commits(plugin_path, limit=20, branch=branch)
            
            logger.debug(f"[PluginController] 获取到 {len(commits)} 个提交")
            
            if commits:
                logger.debug(f"[PluginController] 第一个提交: {commits[0].hash} - {commits[0].message}")
                if len(commits) > 1:
                    logger.debug(f"[PluginController] 最后一个提交: {commits[-1].hash} - {commits[-1].message}")
            
            return {
                'success': True,
                'commits': [
                    {
                        'hash': c.hash,
                        'message': c.message,
                        'date': c.date
                    }
                    for c in commits
                ]
            }
        
        except Exception as e:
            logger.error(f"[PluginController] 获取更新信息失败: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e)
            }
    
    def switch_branch(
        self, 
        plugin_name: str, 
        branch: str,
        commit_hash: Optional[str] = None,
        commit_date: Optional[str] = None
    ) -> Dict:
        """
        切换分支（终极优化版 - 零 Git 查询）
        
        策略：
        1. 执行 Git 切换操作
        2. 使用前端传来的分支信息（commit_hash, commit_date）
        3. 立即返回，完全不需要任何 Git 查询
        
        Args:
            plugin_name: 插件名称
            branch: 分支名
            commit_hash: 分支的 commit hash（前端已获取）
            commit_date: 分支的 commit date（前端已获取）
            
        Returns:
            切换结果，包含更新后的插件信息
        """
        try:
            if not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            plugin_path = self._find_plugin_path(plugin_name)
            if not plugin_path or not plugin_path.exists():
                return {
                    'success': False,
                    'error': '插件不存在'
                }
            
            # 执行 Git 切换操作
            success, message = self.manager.switch_branch(plugin_path, branch)
            
            # 立即返回结果，使用前端传来的信息或缓存信息
            updated_plugin = None
            if success and self.current_env_id:
                # 从缓存获取插件信息
                cached_plugins = self.cache.load_plugins_cache(self.current_env_id)
                for p in cached_plugins:
                    if p.name == plugin_name:
                        # 更新分支相关字段
                        p.branch = branch
                        # 如果前端传来了 commit 信息，直接使用
                        if commit_hash:
                            p.commit_hash = commit_hash
                        if commit_date:
                            p.commit_date = commit_date
                        # 切换分支后，重置更新状态
                        p.has_update = False
                        p.behind_commits = 0
                        updated_plugin = p
                        break
                
                # 立即保存缓存
                if updated_plugin:
                    for i, p in enumerate(cached_plugins):
                        if p.name == plugin_name:
                            cached_plugins[i] = updated_plugin
                            break
                    self.cache.save_plugins_cache(self.current_env_id, cached_plugins)
            
            return {
                'success': success,
                'message': message,
                'plugin': self._plugin_to_dict(updated_plugin) if updated_plugin else None
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def switch_plugin_version(
        self,
        plugin_name: str,
        commit_hash: str,
        commit_date: Optional[str] = None,
        behind_commits: Optional[int] = None,
        force: bool = False,
        backup: bool = True,
        progress_callback: Optional[callable] = None,
        auto_install_deps: bool = True
    ) -> Dict:
        """
        切换插件版本（增强版 - 支持进度回调、备份和依赖检测）
        
        Args:
            plugin_name: 插件名称
            commit_hash: 目标 commit hash
            commit_date: 提交日期（可选，前端已获取）
            behind_commits: 落后提交数（可选，前端已计算）
            force: 是否强制覆盖本地修改
            backup: 是否在切换前备份(默认True)
            progress_callback: 进度回调函数
            auto_install_deps: 是否自动安装新增依赖(默认True)
            
        Returns:
            切换结果,包含更新后的插件信息
        """
        try:
            if not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            plugin_path = self._find_plugin_path(plugin_name)
            if not plugin_path or not plugin_path.exists():
                return {
                    'success': False,
                    'error': '插件不存在'
                }
            
            python_path = None
            if auto_install_deps:
                python_path = self.dependency_manager._python_path
            
            result = self.manager.switch_version(
                plugin_path,
                commit_hash,
                force=force,
                backup=backup,
                progress_callback=progress_callback,
                auto_install_deps=auto_install_deps,
                python_path=python_path
            )
            
            updated_plugin = None
            if result.success and self.current_env_id:
                try:
                    is_git = self.scanner.git_utils.is_git_repo(plugin_path)
                    
                    install_date = ""
                    try:
                        from datetime import datetime
                        stat_info = plugin_path.stat()
                        timestamp = stat_info.st_ctime
                        install_date = datetime.fromtimestamp(timestamp).isoformat()
                    except Exception as e:
                        logger.debug(f"获取插件 {plugin_name} 的创建时间失败: {e}")
                    
                    updated_plugin = PluginInfo(
                        name=plugin_name,
                        path=plugin_path,
                        is_git_repo=is_git,
                        install_date=install_date
                    )
                    
                    if is_git:
                        git_info = self.scanner.get_git_info(plugin_path, fetch_updates=False)
                        if git_info:
                            updated_plugin.git_url = git_info.remote_url
                            updated_plugin.branch = git_info.current_branch
                            updated_plugin.default_branch = git_info.default_branch
                            updated_plugin.commit_hash = commit_hash
                            updated_plugin.commit_date = commit_date or git_info.commit_date
                            behind = behind_commits if behind_commits is not None else 0
                            updated_plugin.has_update = behind > 0
                            updated_plugin.behind_commits = behind
                    
                    cached_plugins = self.cache.load_plugins_cache(self.current_env_id)
                    for i, p in enumerate(cached_plugins):
                        if p.name == plugin_name:
                            cached_plugins[i] = updated_plugin
                            break
                    self.cache.save_plugins_cache(self.current_env_id, cached_plugins)
                    
                except Exception as e:
                    logger.warning(f"[PluginController] 扫描切换版本后的插件 {plugin_name} 失败: {e}")
            
            return {
                'success': result.success,
                'message': result.message,
                'dependency_changed': result.dependency_changed,
                'new_dependencies': [
                    {'package': d.package, 'version': d.version}
                    for d in result.new_dependencies
                ],
                'installed_deps': result.installed_deps,
                'failed_deps': result.failed_deps,
                'plugin': self._plugin_to_dict(updated_plugin) if updated_plugin else None,
                'error': result.error
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_branches(self, plugin_name: str) -> Dict:
        """
        获取分支列表
        
        Args:
            plugin_name: 插件名称
            
        Returns:
            分支列表
        """
        try:
            if not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            plugin_path = self._find_plugin_path(plugin_name)
            if not plugin_path or not plugin_path.exists():
                return {
                    'success': False,
                    'error': '插件不存在'
                }
            
            branches = self.manager.get_branches(plugin_path)
            
            return {
                'success': True,
                'branches': branches
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def uninstall_plugin(self, plugin_name: str) -> Dict:
        """
        卸载插件
        
        Args:
            plugin_name: 插件名称
            
        Returns:
            卸载结果，包含 removed 标记用于前端移除插件
        """
        try:
            if not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            plugin_path = self._find_plugin_path(plugin_name)
            if not plugin_path or not plugin_path.exists():
                return {
                    'success': False,
                    'error': '插件不存在'
                }
            
            success, error_msg = self.manager.uninstall_plugin(plugin_path)
            
            if success:
                # 从缓存中移除
                if self.current_env_id:
                    plugins = self.cache.load_plugins_cache(self.current_env_id)
                    plugins = [p for p in plugins if p.name != plugin_name]
                    self.cache.save_plugins_cache(self.current_env_id, plugins)
                
                return {
                    'success': True,
                    'message': '卸载成功',
                    'removed': True,
                    'plugin_name': plugin_name
                }
            else:
                return {
                    'success': False,
                    'error': error_msg or '卸载失败',
                    'message': '卸载失败',
                    'removed': False,
                    'plugin_name': plugin_name
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def open_plugin_folder(self, plugin_name: str) -> Dict:
        """
        打开插件文件夹
        
        Args:
            plugin_name: 插件名称
            
        Returns:
            操作结果
        """
        try:
            if not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            plugin_path = self._find_plugin_path(plugin_name)
            if not plugin_path or not plugin_path.exists():
                return {
                    'success': False,
                    'error': '插件不存在'
                }
            
            success = self.manager.open_plugin_folder(plugin_path)
            
            return {
                'success': success
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def toggle_plugin_enabled(self, plugin_name: str, enabled: bool) -> Dict:
        """
        切换插件启用/禁用状态
        
        通过添加或移除 .disabled 后缀来控制插件状态
        
        Args:
            plugin_name: 插件名称
            enabled: True 启用，False 禁用
            
        Returns:
            操作结果，包含更新后的插件信息
        """
        try:
            if not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            # 检查插件是否存在（可能带或不带 .disabled 后缀）
            plugin_path = self._find_plugin_path(plugin_name)
            plugin_path_disabled = self._find_plugin_path(f"{plugin_name}.disabled")
            
            updated_plugin = None
            
            if enabled:
                # 启用插件：移除 .disabled 后缀
                if plugin_path_disabled and plugin_path_disabled.exists():
                    plugin_path = plugin_path_disabled.parent / plugin_name
                    plugin_path_disabled.rename(plugin_path)
                    
                    # 更新缓存并获取更新后的插件信息
                    if self.current_env_id:
                        plugins = self.cache.load_plugins_cache(self.current_env_id)
                        # 找到并更新插件信息
                        for i, p in enumerate(plugins):
                            if p.name == f"{plugin_name}.disabled":
                                p.name = plugin_name
                                p.path = plugin_path
                                updated_plugin = p
                                break
                        self.cache.save_plugins_cache(self.current_env_id, plugins)
                    
                    return {
                        'success': True,
                        'message': '插件已启用',
                        'plugin': self._plugin_to_dict(updated_plugin) if updated_plugin else None
                    }
                elif plugin_path and plugin_path.exists():
                    # 获取当前插件信息
                    if self.current_env_id:
                        plugins = self.cache.load_plugins_cache(self.current_env_id)
                        for p in plugins:
                            if p.name == plugin_name:
                                updated_plugin = p
                                break
                    
                    return {
                        'success': True,
                        'message': '插件已经是启用状态',
                        'plugin': self._plugin_to_dict(updated_plugin) if updated_plugin else None
                    }
                else:
                    return {
                        'success': False,
                        'error': '插件不存在'
                    }
            else:
                # 禁用插件：添加 .disabled 后缀
                if plugin_path and plugin_path.exists():
                    plugin_path_disabled = plugin_path.parent / f"{plugin_name}.disabled"
                    plugin_path.rename(plugin_path_disabled)
                    
                    # 更新缓存并获取更新后的插件信息
                    if self.current_env_id:
                        plugins = self.cache.load_plugins_cache(self.current_env_id)
                        # 找到并更新插件信息
                        for i, p in enumerate(plugins):
                            if p.name == plugin_name:
                                p.name = f"{plugin_name}.disabled"
                                p.path = plugin_path_disabled
                                updated_plugin = p
                                break
                        self.cache.save_plugins_cache(self.current_env_id, plugins)
                    
                    return {
                        'success': True,
                        'message': '插件已禁用',
                        'plugin': self._plugin_to_dict(updated_plugin) if updated_plugin else None
                    }
                elif plugin_path_disabled and plugin_path_disabled.exists():
                    # 获取当前插件信息
                    if self.current_env_id:
                        plugins = self.cache.load_plugins_cache(self.current_env_id)
                        for p in plugins:
                            if p.name == f"{plugin_name}.disabled":
                                updated_plugin = p
                                break
                    
                    return {
                        'success': True,
                        'message': '插件已经是禁用状态',
                        'plugin': self._plugin_to_dict(updated_plugin) if updated_plugin else None
                    }
                else:
                    return {
                        'success': False,
                        'error': '插件不存在'
                    }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_conflicts(self) -> Dict:
        """
        检测依赖冲突
        
        Returns:
            冲突检测结果
        """
        try:
            if not self.current_env_id or not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            # 获取所有插件
            plugins = self.cache.load_plugins_cache(self.current_env_id)
            
            # 收集所有插件的依赖
            all_dependencies = {}
            for plugin in plugins:
                plugin_path = self._find_plugin_path(plugin.name)
                if plugin_path and plugin_path.exists():
                    deps = self.scanner.parse_dependencies(plugin_path)
                    if deps:
                        all_dependencies[plugin.name] = deps
            
            # 检测冲突
            conflicts = self.dependency_manager.detect_version_conflicts(all_dependencies)
            
            return {
                'success': True,
                'conflicts': [
                    {
                        'package': c.package,
                        'required_versions': c.required_versions,
                        'plugins': c.plugins,
                        'severity': c.severity,
                        'message': c.message
                    }
                    for c in conflicts
                ]
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def check_git_permissions(self) -> Dict[str, Any]:
        """
        检查所有插件仓库的权限状态
        
        Returns:
            {
                'success': bool,
                'total': int,
                'problem_count': int,
                'problem_repos': List[Dict],
                'git_version': str,
                'is_supported': bool,
                'error': str  # 错误信息（失败时）
            }
        """
        try:
            # 检查环境是否已设置
            if not self.current_env_id or not self.custom_nodes_paths or not self.primary_custom_nodes_path:
                logger.warning("[PluginController] check_git_permissions - 环境未设置")
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            # 检查主 custom_nodes 路径是否存在
            if not self.primary_custom_nodes_path.exists():
                logger.warning(f"[PluginController] check_git_permissions - 路径不存在: {self.primary_custom_nodes_path}")
                return {
                    'success': False,
                    'error': f'custom_nodes 主路径不存在: {self.primary_custom_nodes_path}'
                }
            
            # 获取所有插件路径
            plugins = self.cache.load_plugins_cache(self.current_env_id)
            
            # 过滤出 Git 仓库
            git_repo_paths = [
                Path(p.path) for p in plugins 
                if p.is_git_repo and Path(p.path).exists()
            ]
            
            if not git_repo_paths:
                logger.debug("[PluginController] check_git_permissions - 没有 Git 仓库需要检查")
                return {
                    'success': True,
                    'total': 0,
                    'problem_count': 0,
                    'problem_repos': [],
                    'git_version': self.git_permission_fixer.git_utils.get_git_version() or "未知",
                    'is_supported': self.git_permission_fixer.git_utils.is_safe_directory_supported()
                }
            
            logger.debug(f"[PluginController] check_git_permissions - 开始检查 {len(git_repo_paths)} 个 Git 仓库")
            
            # 调用 GitPermissionFixer 批量检查
            result = self.git_permission_fixer.check_all_repositories(git_repo_paths)
            
            logger.info(
                f"[PluginController] check_git_permissions - 完成，"
                f"共 {result['total']} 个仓库，{result['problem_count']} 个有问题"
            )
            
            return {
                'success': True,
                'total': result['total'],
                'problem_count': result['problem_count'],
                'problem_repos': result['problem_repos'],
                'git_version': result['git_version'],
                'is_supported': result['is_supported']
            }
            
        except Exception as e:
            logger.error(f"[PluginController] check_git_permissions - 失败: {str(e)}")
            import traceback
            logger.error(f"[PluginController] 堆栈跟踪:\n{traceback.format_exc()}")
            return {
                'success': False,
                'error': f'检查权限失败: {str(e)}'
            }
    
    def fix_git_permissions(self) -> Dict[str, Any]:
        """
        修复所有插件仓库的权限问题
        
        Returns:
            {
                'success': bool,
                'total': int,
                'fixed': int,
                'failed': int,
                'failed_repos': List[Dict],
                'duration': float,
                'error': str  # 错误信息（失败时）
            }
        """
        try:
            # 检查环境是否已设置
            if not self.current_env_id or not self.custom_nodes_paths or not self.primary_custom_nodes_path:
                logger.warning("[PluginController] fix_git_permissions - 环境未设置")
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            # 检查主 custom_nodes 路径是否存在
            if not self.primary_custom_nodes_path.exists():
                logger.warning(f"[PluginController] fix_git_permissions - 路径不存在: {self.primary_custom_nodes_path}")
                return {
                    'success': False,
                    'error': f'custom_nodes 主路径不存在: {self.primary_custom_nodes_path}'
                }
            
            # 获取所有插件路径
            plugins = self.cache.load_plugins_cache(self.current_env_id)
            
            # 过滤出 Git 仓库
            git_repo_paths = [
                Path(p.path) for p in plugins 
                if p.is_git_repo and Path(p.path).exists()
            ]
            
            if not git_repo_paths:
                logger.debug("[PluginController] fix_git_permissions - 没有 Git 仓库需要修复")
                return {
                    'success': True,
                    'total': 0,
                    'fixed': 0,
                    'failed': 0,
                    'failed_repos': [],
                    'duration': 0.0
                }
            
            logger.debug(f"[PluginController] fix_git_permissions - 开始修复 {len(git_repo_paths)} 个 Git 仓库")
            
            # 调用 GitPermissionFixer 批量修复
            result = self.git_permission_fixer.fix_all_repositories(git_repo_paths)
            
            logger.info(
                f"[PluginController] fix_git_permissions - 完成，"
                f"共 {result['total']} 个仓库，成功 {result['fixed']} 个，失败 {result['failed']} 个，"
                f"耗时 {result['duration']:.2f} 秒"
            )
            
            return {
                'success': result['success'],
                'total': result['total'],
                'fixed': result['fixed'],
                'failed': result['failed'],
                'failed_repos': result['failed_repos'],
                'duration': result['duration']
            }
            
        except Exception as e:
            logger.error(f"[PluginController] fix_git_permissions - 失败: {str(e)}")
            import traceback
            logger.error(f"[PluginController] 堆栈跟踪:\n{traceback.format_exc()}")
            return {
                'success': False,
                'error': f'修复权限失败: {str(e)}'
            }
    
    def set_plugin_remote_url(self, plugin_name: str, remote_url: str) -> Dict:
        """
        设置插件的远端地址
        
        Args:
            plugin_name: 插件名称
            remote_url: 远端仓库地址
            
        Returns:
            dict: 操作结果
        """
        try:
            if not self.custom_nodes_paths:
                return {
                    'success': False,
                    'error': '未设置环境'
                }
            
            plugin_path = self._find_plugin_path(plugin_name)
            if not plugin_path or not plugin_path.exists():
                return {
                    'success': False,
                    'error': '插件不存在'
                }
            
            is_valid, error_msg = self.git_concurrent.git_utils.validate_remote_url(remote_url)
            if not is_valid:
                return {
                    'success': False,
                    'error': error_msg
                }
            
            success, message = self.git_concurrent.git_utils.add_remote_url(plugin_path, remote_url)
            
            if success:
                fetch_success = self.git_concurrent.git_utils.fetch(plugin_path)
                if not fetch_success:
                    logger.warning(f"[PluginController] 设置远端成功但 fetch 失败: {plugin_name}")
                
                return {
                    'success': True,
                    'message': message
                }
            else:
                return {
                    'success': False,
                    'error': message
                }
        
        except Exception as e:
            logger.error(f"[PluginController] 设置远端地址失败: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _serialize_plugins(self, plugins: List[PluginInfo]) -> List[Dict]:
        """序列化插件列表"""
        return [
            {
                'name': p.name,
                'path': str(p.path),
                'is_git_repo': p.is_git_repo,
                'git_url': p.git_url,
                'branch': p.branch,
                'default_branch': p.default_branch,
                'commit_hash': p.commit_hash,
                'commit_date': p.commit_date,
                'has_update': p.has_update,
                'behind_commits': p.behind_commits,
                'dependency_updated': p.dependency_updated,
                'dependency_viewed': p.dependency_viewed,
                'git_fetch_error': p.git_fetch_error,
                'git_fetch_error_detail': p.git_fetch_error_detail,
                'git_fetch_error_type': p.git_fetch_error_type,
                'git_fetch_error_causes': p.git_fetch_error_causes,
                'git_fetch_error_solutions': p.git_fetch_error_solutions,
                'install_date': p.install_date,
                'source': p.source
            }
            for p in plugins
        ]

    def _plugin_to_dict(self, plugin: PluginInfo) -> Dict:
        """序列化单个插件信息"""
        return {
            'name': plugin.name,
            'path': str(plugin.path),
            'is_git_repo': plugin.is_git_repo,
            'git_url': plugin.git_url,
            'branch': plugin.branch,
            'default_branch': plugin.default_branch,
            'commit_hash': plugin.commit_hash,
            'commit_date': plugin.commit_date,
            'has_update': plugin.has_update,
            'behind_commits': plugin.behind_commits,
            'dependency_updated': plugin.dependency_updated,
            'dependency_viewed': plugin.dependency_viewed,
            'git_fetch_error': plugin.git_fetch_error,
            'git_fetch_error_detail': plugin.git_fetch_error_detail,
            'git_fetch_error_type': plugin.git_fetch_error_type,
            'git_fetch_error_causes': plugin.git_fetch_error_causes,
            'git_fetch_error_solutions': plugin.git_fetch_error_solutions,
            'install_date': plugin.install_date,
            'source': plugin.source
        }
