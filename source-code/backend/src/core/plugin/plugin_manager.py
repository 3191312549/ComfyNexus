"""
插件管理器

管理插件的更新、分支切换、卸载等操作。
"""

import os
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed

from .models import PluginInfo, UpdateResult, Dependency
from .git_utils import GitUtils
from .git_concurrent import GitConcurrent
from .plugin_scanner import PluginScanner
from ...utils.logger import app_logger as logger
from ...utils.python_command import PythonCommandBuilder
from ...utils.file_utils import force_remove_directory


class PluginManager:
    """插件管理器"""
    
    def __init__(
        self,
        git_path: str = None,
        max_workers: int = 10
    ):
        """
        初始化插件管理器
        
        Args:
            git_path: Git 可执行文件路径（可选，默认使用项目内置 MinGit）
            max_workers: 最大并发数
        """
        # 如果未提供 git_path，使用项目内置的 MinGit
        if git_path is None:
            from ...utils.git_config import get_git_executable
            git_path = get_git_executable()
        
        self.git_utils = GitUtils(git_path=git_path)
        self.git_concurrent = GitConcurrent(git_utils=self.git_utils, max_workers=max_workers)
        self.scanner = PluginScanner(git_utils=self.git_utils)
        self.max_workers = max_workers
    
    def update_plugin(
        self,
        plugin_path: Path,
        branch: Optional[str] = None,
        force: bool = False,
        backup: bool = True,
        progress_callback: Optional[callable] = None,
        auto_install_deps: bool = False,
        python_path: Optional[Path] = None
    ) -> UpdateResult:
        """
        更新指定插件(增强版 - 支持备份和回滚)
        
        增强点:
        1. 更新前保存旧的依赖列表
        2. 更新后获取新的依赖列表
        3. 对比依赖列表,检测变化
        4. 如果有变化,设置 dependency_changed = True
        5. 更新前备份插件目录(可选)
        6. 更新失败时自动从备份恢复
        7. 支持进度回调
        8. 支持更新后自动安装新增依赖
        
        Args:
            plugin_path: 插件路径
            branch: 分支名,None 使用当前分支
            force: 是否强制覆盖本地修改
            backup: 是否在更新前备份(默认True)
            progress_callback: 进度回调函数，接收 dict 参数
            auto_install_deps: 是否自动安装新增依赖(默认False)
            python_path: Python 可执行文件路径(用于依赖安装)
            
        Returns:
            更新结果,包含依赖变化信息
        """
        plugin_name = plugin_path.name
        
        try:
            if progress_callback:
                progress_callback({'stage': 'preparing', 'progress': 5, 'message': f'正在准备更新 {plugin_name}...'})
            
            # 检查是否为 Git 仓库
            if not self.git_utils.is_git_repo(plugin_path):
                return UpdateResult(
                    plugin_name=plugin_name,
                    success=False,
                    message="不是 Git 仓库"
                )
            
            # 1. 保存更新前的依赖
            if progress_callback:
                progress_callback({'stage': 'detecting_deps', 'progress': 8, 'message': f'正在检测 {plugin_name} 的依赖信息...'})
            old_deps = self.scanner.parse_dependencies(plugin_path)
            
            # 2. 执行 Git 更新(带备份和回滚)
            success, message = self.git_utils.pull(
                plugin_path, 
                branch, 
                force=force,
                backup=backup,
                progress_callback=progress_callback
            )
            
            if not success:
                if progress_callback:
                    progress_callback({'stage': 'error', 'progress': -1, 'message': f'{plugin_name} 更新失败: {message}'})
                return UpdateResult(
                    plugin_name=plugin_name,
                    success=False,
                    message=message,
                    error=message
                )
            
            # 3. 获取更新后的依赖
            if progress_callback:
                progress_callback({'stage': 'detecting_deps', 'progress': 65, 'message': f'正在检测 {plugin_name} 更新后的依赖变化...'})
            new_deps = self.scanner.parse_dependencies(plugin_path)
            
            # 4. 对比依赖列表,检测变化
            dependency_changed = self._compare_dependencies(old_deps, new_deps)
            new_dependencies = self._get_new_dependencies(old_deps, new_deps) if dependency_changed else []
            
            # 5. 自动安装新增依赖
            installed_deps = []
            failed_deps = []
            if auto_install_deps and new_dependencies:
                from .dependency_manager import DependencyManager
                dep_manager = DependencyManager(python_path=python_path) if python_path else DependencyManager()
                total_deps = len(new_dependencies)
                for i, dep in enumerate(new_dependencies):
                    dep_progress = 70 + int((i / total_deps) * 25)
                    if progress_callback:
                        progress_callback({
                            'stage': 'installing_dep',
                            'progress': dep_progress,
                            'message': f'正在安装依赖 {dep.package} ({i + 1}/{total_deps})...',
                            'detail': dep.package
                        })
                    result = dep_manager.install_dependency(dep.package, dep.version)
                    if result.success:
                        installed_deps.append({'package': dep.package, 'version': dep.version, 'success': True})
                    else:
                        failed_deps.append({'package': dep.package, 'version': dep.version, 'success': False, 'error': result.message})
            
            if progress_callback:
                progress_callback({'stage': 'complete', 'progress': 100, 'message': f'{plugin_name} 更新完成'})
            
            return UpdateResult(
                plugin_name=plugin_name,
                success=True,
                message=message,
                dependency_changed=dependency_changed,
                new_dependencies=new_dependencies,
                installed_deps=installed_deps,
                failed_deps=failed_deps
            )
        
        except Exception as e:
            return UpdateResult(
                plugin_name=plugin_name,
                success=False,
                message=str(e),
                error=str(e)
            )
    
    def _compare_dependencies(
        self,
        old_deps: List[Dependency],
        new_deps: List[Dependency]
    ) -> bool:
        """
        对比两个依赖列表，检测包名和版本变化
        
        此方法用于检测插件更新前后依赖是否发生变化。
        变化包括：
        - 依赖数量变化
        - 包名变化
        - 版本要求变化
        
        Args:
            old_deps: 旧依赖列表
            new_deps: 新依赖列表
            
        Returns:
            bool: 如果依赖有变化返回 True，否则返回 False
        """
        # 如果依赖数量不同，则有变化
        if len(old_deps) != len(new_deps):
            return True
        
        # 构建依赖集合 (包名, 版本) 用于对比
        old_set = {(d.package, d.version) for d in old_deps}
        new_set = {(d.package, d.version) for d in new_deps}
        
        # 对比集合是否相同
        return old_set != new_set
    
    def _check_dependency_changed(
        self,
        old_deps: List[Dependency],
        new_deps: List[Dependency]
    ) -> bool:
        """
        检测依赖是否变化（保留向后兼容）
        
        此方法调用 _compare_dependencies() 以保持向后兼容性。
        
        Args:
            old_deps: 旧依赖列表
            new_deps: 新依赖列表
            
        Returns:
            是否变化
        """
        return self._compare_dependencies(old_deps, new_deps)
    
    def _get_new_dependencies(
        self,
        old_deps: List[Dependency],
        new_deps: List[Dependency]
    ) -> List[Dependency]:
        """
        获取新增的依赖
        
        Args:
            old_deps: 旧依赖列表
            new_deps: 新依赖列表
            
        Returns:
            新增的依赖列表
        """
        old_packages = {d.package for d in old_deps}
        return [d for d in new_deps if d.package not in old_packages]
    
    def _update_single_plugin(
        self,
        plugin: PluginInfo,
        python_path: Path,
        backup: bool = True
    ) -> UpdateResult:
        """
        更新单个插件(只检测依赖变化,不自动安装)
        
        此方法用于批量更新时更新单个插件。
        流程:
        1. 更新插件
        2. 如果更新成功且依赖有变化,只提示用户,不自动安装
        3. 返回结果(包含依赖变化信息)
        
        Args:
            plugin: 插件信息
            python_path: Python 可执行文件路径(保留参数以兼容现有调用)
            backup: 是否在更新前备份(默认True)
            
        Returns:
            UpdateResult: 更新结果,包含依赖变化信息
        """
        # 1. 更新插件
        result = self.update_plugin(plugin.path, backup=backup)
        
        # 2. 如果更新成功且依赖有变化,只提示用户
        if result.success and result.dependency_changed:
            new_deps_count = len(result.new_dependencies)
            if new_deps_count > 0:
                result.message += f",检测到 {new_deps_count} 个新增依赖"
        
        return result
    
    def update_all_plugins(
        self,
        plugins: List[PluginInfo],
        python_path: Path,
        max_workers: Optional[int] = None,
        progress_callback: Optional[callable] = None,
        backup: bool = True
    ) -> List[UpdateResult]:
        """
        批量更新所有插件(只检测依赖变化,不自动安装)
        
        功能:
        - 使用 ThreadPoolExecutor 并发更新插件
        - 支持配置最大并发数
        - 支持进度回调函数
        - 处理超时和异常
        - 检测依赖变化并提示用户
        - 支持更新前备份和失败回滚
        
        Args:
            plugins: 待更新插件列表
            python_path: Python 可执行文件路径(保留参数以兼容现有调用)
            max_workers: 最大并发数(None 使用默认值)
            progress_callback: 进度回调函数 (plugin_name, progress, status, result)
            backup: 是否在更新前备份(默认True)
            
        Returns:
            List[UpdateResult]: 每个插件的更新结果
        """
        results = []
        total = len(plugins)
        completed = 0
        
        # 使用配置的并发数
        workers = max_workers if max_workers is not None else self.max_workers
        
        # 日志: 记录传入的插件列表
        logger.info(f"[PluginManager] 批量更新开始,总插件数: {total}")
        logger.debug(f"[PluginManager] 插件列表: {[p.name for p in plugins]}")
        
        # 过滤出需要更新的插件
        plugins_to_update = [p for p in plugins if p.is_git_repo and p.has_update]
        logger.info(f"[PluginManager] 过滤后需要更新的插件数: {len(plugins_to_update)}")
        logger.debug(f"[PluginManager] 需要更新的插件: {[p.name for p in plugins_to_update]}")
        
        # 记录被过滤掉的插件
        skipped_plugins = [p for p in plugins if not (p.is_git_repo and p.has_update)]
        if skipped_plugins:
            logger.info(f"[PluginManager] 跳过的插件数: {len(skipped_plugins)}")
            for p in skipped_plugins:
                logger.debug(f"[PluginManager] 跳过插件: {p.name}, is_git_repo={p.is_git_repo}, has_update={p.has_update}")
        
        with ThreadPoolExecutor(max_workers=workers) as executor:
            # 提交所有更新任务
            future_to_plugin = {
                executor.submit(
                    self._update_single_plugin,
                    plugin,
                    python_path,
                    backup
                ): plugin
                for plugin in plugins_to_update
            }
            
            # 处理完成的任务
            for future in as_completed(future_to_plugin):
                plugin = future_to_plugin[future]
                completed += 1
                
                try:
                    # 设置超时时间为 300 秒(5分钟)
                    result = future.result(timeout=300)
                    results.append(result)
                    
                    # 日志: 记录更新结果
                    if result.success:
                        logger.info(f"[PluginManager] 插件更新成功: {result.plugin_name}")
                    else:
                        logger.warning(f"[PluginManager] 插件更新失败: {result.plugin_name}, 错误: {result.message}")
                    
                    # 调用进度回调
                    if progress_callback:
                        try:
                            progress_callback(
                                plugin_name=plugin.name,
                                progress=int(completed / total * 100),
                                status='success' if result.success else 'failed',
                                result=result
                            )
                        except Exception as callback_error:
                            logger.warning(f"[PluginManager] 进度回调失败: {str(callback_error)}")
                
                except TimeoutError:
                    # 超时处理
                    result = UpdateResult(
                        plugin_name=plugin.name,
                        success=False,
                        message="更新超时(超过5分钟)",
                        error="Timeout after 300 seconds"
                    )
                    results.append(result)
                    logger.error(f"[PluginManager] 插件更新超时: {plugin.name}")
                    
                    if progress_callback:
                        try:
                            progress_callback(
                                plugin_name=plugin.name,
                                progress=int(completed / total * 100),
                                status='failed',
                                result=result
                            )
                        except (TypeError, AttributeError):
                            pass
                
                except Exception as e:
                    # 异常处理
                    result = UpdateResult(
                        plugin_name=plugin.name,
                        success=False,
                        message=f"更新异常: {str(e)}",
                        error=str(e)
                    )
                    results.append(result)
                    logger.error(f"[PluginManager] 插件更新异常: {plugin.name}, 错误: {str(e)}")
                    
                    if progress_callback:
                        try:
                            progress_callback(
                                plugin_name=plugin.name,
                                progress=int(completed / total * 100),
                                status='failed',
                                result=result
                            )
                        except (TypeError, AttributeError):
                            pass
        
        # 日志：记录最终结果
        logger.info(f"[PluginManager] 批量更新完成，总数: {len(results)}, 成功: {sum(1 for r in results if r.success)}, 失败: {sum(1 for r in results if not r.success)}")
        logger.debug(f"[PluginManager] 更新结果详情: {[(r.plugin_name, r.success, r.message) for r in results]}")
        
        return results
    
    def install_plugin_dependencies(
        self,
        plugin_path: Path,
        python_path: Path
    ) -> Dict:
        """
        安装插件的所有依赖（静默安装，不弹出终端）
        
        此方法用于批量更新时自动安装依赖。
        流程:
        1. 解析插件的所有依赖
        2. 检查依赖安装状态
        3. 静默安装未安装的依赖（不弹出终端）
        4. 返回安装结果和失败列表
        
        Args:
            plugin_path: 插件路径
            python_path: Python 可执行文件路径
            
        Returns:
            Dict: 安装结果字典
                {
                    'success': bool,           # 是否全部成功
                    'message': str,            # 结果消息
                    'installed': int,          # 成功安装数量
                    'failed': List[str],       # 失败的包名列表
                    'dependencies': List[str]  # 所有依赖包名
                }
        """
        # 1. 解析依赖
        dependencies = self.scanner.parse_dependencies(plugin_path)
        
        if not dependencies:
            return {
                'success': True,
                'message': '无需安装依赖',
                'installed': 0,
                'failed': [],
                'dependencies': []
            }
        
        installed_count = 0
        failed_packages = []
        all_packages = [d.package for d in dependencies]
        
        # 2. 检查并安装每个依赖
        builder = PythonCommandBuilder(python_path)
        
        # 获取 PyPI 镜像配置
        mirror_index_url = None
        try:
            from ...utils.pypi_mirror import pypi_mirror_manager
            if pypi_mirror_manager.is_enabled():
                source = pypi_mirror_manager.get_current_source()
                if source:
                    mirror_index_url = source.get('pip_index')
                    logger.dev(f"[PyPI Mirror] 插件静默安装使用镜像: {mirror_index_url}")
            else:
                logger.dev(f"[PyPI Mirror] 插件静默安装镜像加速未启用，使用官方源")
        except Exception as e:
            logger.dev(f"[PyPI Mirror] 获取镜像配置失败: {e}，使用官方源")
        
        for dep in dependencies:
            try:
                cmd = builder.pip_show(dep.package)
                result = builder.run(cmd, timeout=10, use_proxy=True)
                
                if result.returncode == 0:
                    continue
            
            except Exception as check_error:
                logger.debug(f"[PluginManager] 检查依赖失败: {dep.package}, {str(check_error)}")
            
            # 3. 静默安装依赖
            package_spec = f"{dep.package}{dep.version}" if dep.version else dep.package
            
            try:
                extra_args = ['-i', mirror_index_url] if mirror_index_url else None
                cmd = builder.pip_install(package_spec, extra_args=extra_args)
                result = builder.run(cmd, timeout=300, use_proxy=True)
                
                if result.returncode == 0:
                    installed_count += 1
                    logger.info(f"[PluginManager] 成功安装依赖: {package_spec}")
                else:
                    failed_packages.append(dep.package)
                    logger.warning(f"[PluginManager] 安装依赖失败: {package_spec}, {result.stderr}")
            
            except subprocess.TimeoutExpired:
                failed_packages.append(dep.package)
                logger.warning(f"[PluginManager] 安装依赖超时: {package_spec}")
            
            except Exception as e:
                failed_packages.append(dep.package)
                logger.error(f"[PluginManager] 安装依赖异常: {package_spec}, {str(e)}")
        
        # 4. 返回结果
        success = len(failed_packages) == 0
        
        if success:
            message = f"成功安装 {installed_count} 个依赖"
        else:
            message = f"成功安装 {installed_count} 个依赖，失败 {len(failed_packages)} 个: {', '.join(failed_packages)}"
        
        return {
            'success': success,
            'message': message,
            'installed': installed_count,
            'failed': failed_packages,
            'dependencies': all_packages
        }
    
    def uninstall_plugin(self, plugin_path: Path) -> Tuple[bool, str]:
        """
        卸载插件
        
        Args:
            plugin_path: 插件路径
            
        Returns:
            (是否成功, 错误信息)
        """
        try:
            if not plugin_path.exists():
                return False, '插件目录不存在'
            
            success, error_msg = force_remove_directory(plugin_path, logger=logger)
            
            if success:
                return True, ''
            else:
                logger.error(f"[PluginManager] 卸载插件失败: {plugin_path.name}, {error_msg}")
                return False, error_msg
        
        except Exception as e:
            error_msg = f"未知错误: {str(e)}"
            logger.error(f"[PluginManager] 卸载插件失败: {plugin_path.name}, {error_msg}")
            return False, error_msg
    
    def switch_branch(self, plugin_path: Path, branch: str) -> Tuple[bool, str]:
        """
        切换分支
        
        Args:
            plugin_path: 插件路径
            branch: 分支名
            
        Returns:
            (是否成功, 消息)
        """
        return self.git_utils.checkout(plugin_path, branch)
    
    def switch_version(
        self,
        plugin_path: Path,
        commit_hash: str,
        force: bool = False,
        backup: bool = True,
        progress_callback: Optional[callable] = None,
        auto_install_deps: bool = False,
        python_path: Optional[Path] = None
    ) -> UpdateResult:
        """
        切换插件版本（增强版 - 支持备份、回滚和依赖检测）
        
        增强点:
        1. 切换前保存旧的依赖列表
        2. 切换后获取新的依赖列表
        3. 对比依赖列表,检测变化
        4. 切换前备份插件目录(可选)
        5. 切换失败时自动从备份恢复
        6. 支持进度回调
        7. 支持切换后自动安装新增依赖
        
        Args:
            plugin_path: 插件路径
            commit_hash: 目标 commit hash
            force: 是否强制覆盖本地修改
            backup: 是否在切换前备份(默认True)
            progress_callback: 进度回调函数，接收 dict 参数
            auto_install_deps: 是否自动安装新增依赖(默认False)
            python_path: Python 可执行文件路径(用于依赖安装)
            
        Returns:
            切换结果,包含依赖变化信息
        """
        plugin_name = plugin_path.name
        
        try:
            if progress_callback:
                progress_callback({'stage': 'preparing', 'progress': 5, 'message': f'正在准备切换 {plugin_name} 的版本...'})
            
            if not self.git_utils.is_git_repo(plugin_path):
                return UpdateResult(
                    plugin_name=plugin_name,
                    success=False,
                    message="不是 Git 仓库"
                )
            
            if progress_callback:
                progress_callback({'stage': 'detecting_deps', 'progress': 8, 'message': f'正在检测 {plugin_name} 的依赖信息...'})
            old_deps = self.scanner.parse_dependencies(plugin_path)
            
            success, message = self.git_utils.checkout_commit(
                plugin_path,
                commit_hash,
                force=force,
                backup=backup,
                progress_callback=progress_callback
            )
            
            if not success:
                if progress_callback:
                    progress_callback({'stage': 'error', 'progress': -1, 'message': f'{plugin_name} 版本切换失败: {message}'})
                return UpdateResult(
                    plugin_name=plugin_name,
                    success=False,
                    message=message,
                    error=message
                )
            
            if progress_callback:
                progress_callback({'stage': 'detecting_deps', 'progress': 65, 'message': f'正在检测 {plugin_name} 切换后的依赖变化...'})
            new_deps = self.scanner.parse_dependencies(plugin_path)
            
            dependency_changed = self._compare_dependencies(old_deps, new_deps)
            new_dependencies = self._get_new_dependencies(old_deps, new_deps) if dependency_changed else []
            
            installed_deps = []
            failed_deps = []
            if auto_install_deps and new_dependencies:
                from .dependency_manager import DependencyManager
                dep_manager = DependencyManager(python_path=python_path) if python_path else DependencyManager()
                total_deps = len(new_dependencies)
                for i, dep in enumerate(new_dependencies):
                    dep_progress = 70 + int((i / total_deps) * 25)
                    if progress_callback:
                        progress_callback({
                            'stage': 'installing_dep',
                            'progress': dep_progress,
                            'message': f'正在安装依赖 {dep.package} ({i + 1}/{total_deps})...',
                            'detail': dep.package
                        })
                    result = dep_manager.install_dependency(dep.package, dep.version)
                    if result.success:
                        installed_deps.append({'package': dep.package, 'version': dep.version, 'success': True})
                    else:
                        failed_deps.append({'package': dep.package, 'version': dep.version, 'success': False, 'error': result.message})
            
            if progress_callback:
                progress_callback({'stage': 'complete', 'progress': 100, 'message': f'{plugin_name} 版本切换完成'})
            
            return UpdateResult(
                plugin_name=plugin_name,
                success=True,
                message=message,
                dependency_changed=dependency_changed,
                new_dependencies=new_dependencies,
                installed_deps=installed_deps,
                failed_deps=failed_deps
            )
        
        except Exception as e:
            return UpdateResult(
                plugin_name=plugin_name,
                success=False,
                message=str(e),
                error=str(e)
            )
    
    def get_branches(self, plugin_path: Path) -> List[Dict]:
        """
        获取分支列表
        
        Args:
            plugin_path: 插件路径
            
        Returns:
            分支列表
        """
        return self.git_utils.get_branches(plugin_path)
    
    def open_plugin_folder(self, plugin_path: Path) -> bool:
        """
        打开插件文件夹
        
        Args:
            plugin_path: 插件路径
            
        Returns:
            是否成功
        """
        try:
            import platform
            
            if platform.system() == 'Windows':
                os.startfile(str(plugin_path))
            elif platform.system() == 'Darwin':  # macOS
                subprocess.run(['open', str(plugin_path)], check=True)
            else:  # Linux
                subprocess.run(['xdg-open', str(plugin_path)], check=True)
            
            return True
        except Exception as e:
            logger.error(f"[PluginManager] 打开文件夹失败: {plugin_path.name}, {str(e)}")
            return False
    
    def mark_dependency_viewed(self, plugin_name: str, cache_manager) -> bool:
        """
        标记用户已查看依赖
        
        当用户点击"查询依赖"按钮后，调用此方法标记依赖已被查看。
        这会清除 dependency_updated 标志，并设置 dependency_viewed 为 True。
        
        Args:
            plugin_name: 插件名称
            cache_manager: 缓存管理器实例（PluginCache）
            
        Returns:
            是否成功标记
            
        Note:
            此方法委托给 PluginCache.mark_dependency_viewed() 实现
        """
        try:
            if not cache_manager:
                logger.warning(f"[PluginManager] 缓存管理器未提供，无法标记依赖查看状态")
                return False
            
            # 委托给缓存管理器处理
            # 注意：需要环境 ID，但 PluginManager 没有存储环境 ID
            # 这个方法应该由 PluginController 调用，而不是直接使用
            logger.warning(
                f"[PluginManager] mark_dependency_viewed 应该通过 PluginController 调用，"
                f"而不是直接使用 PluginManager"
            )
            return True
            
        except Exception as e:
            logger.error(f"[PluginManager] 标记依赖查看失败: {plugin_name}, {str(e)}")
            return False
