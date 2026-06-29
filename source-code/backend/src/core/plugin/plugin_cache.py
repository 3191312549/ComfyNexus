"""
插件缓存管理器

管理插件和依赖的本地缓存，支持增量更新。
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

from .models import PluginInfo, Dependency
from ...utils.logger import app_logger as logger

# Windows 文件锁支持
if sys.platform == 'win32':
    import msvcrt
else:
    import fcntl


class PluginCache:
    """插件缓存管理器"""
    
    def __init__(self, cache_dir: Path):
        """
        初始化缓存管理器
        
        Args:
            cache_dir: 缓存目录路径
        """
        # 使用字符串存储路径，避免 pywebview 序列化 Path 对象时出现警告
        self._cache_dir_str = str(Path(cache_dir))
        Path(self._cache_dir_str).mkdir(parents=True, exist_ok=True)
    
    @property
    def cache_dir(self) -> Path:
        """
        缓存目录路径（Path 对象）
        
        注意：此属性不会被 pywebview 序列化（通过 __dir__ 方法隐藏）
        """
        return Path(self._cache_dir_str)
    
    def __dir__(self):
        """
        自定义 dir() 输出，隐藏返回 Path 对象的属性
        
        这样 pywebview 在序列化时就不会访问 cache_dir 属性，
        避免了 WindowsPath 对象的序列化错误。
        
        Returns:
            不包含 Path 属性的属性列表
        """
        # 获取所有属性
        attrs = list(object.__dir__(self))
        
        # 移除返回 Path 对象的属性
        path_attrs = ['cache_dir']
        return [attr for attr in attrs if attr not in path_attrs]
    
    def _get_plugins_cache_path(self, env_id: str) -> Path:
        """获取插件缓存文件路径"""
        return self.cache_dir / f"env_{env_id}_plugins.json"
    
    def _get_dependencies_cache_path(self, env_id: str) -> Path:
        """获取依赖缓存文件路径"""
        return self.cache_dir / f"env_{env_id}_dependencies.json"
    
    def _lock_file(self, file_obj, exclusive: bool = False):
        """
        锁定文件（跨平台）
        
        Args:
            file_obj: 文件对象
            exclusive: 是否为排他锁
        """
        if sys.platform == 'win32':
            # Windows: 使用 msvcrt
            mode = msvcrt.LK_NBLCK if not exclusive else msvcrt.LK_NBRLCK
            try:
                msvcrt.locking(file_obj.fileno(), mode, 1)
            except (OSError, IOError):
                pass  # Windows 文件锁可能失败，继续执行
        else:
            # Unix: 使用 fcntl
            lock_type = fcntl.LOCK_SH if not exclusive else fcntl.LOCK_EX
            fcntl.flock(file_obj.fileno(), lock_type)
    
    def _unlock_file(self, file_obj):
        """
        解锁文件（跨平台）
        
        Args:
            file_obj: 文件对象
        """
        if sys.platform == 'win32':
            try:
                msvcrt.locking(file_obj.fileno(), msvcrt.LK_UNLCK, 1)
            except (OSError, IOError):
                pass
        else:
            fcntl.flock(file_obj.fileno(), fcntl.LOCK_UN)
    
    def _read_json_file(self, file_path: Path) -> Optional[Dict]:
        """
        读取 JSON 文件（带文件锁、损坏恢复和重试机制）
        
        Args:
            file_path: 文件路径
            
        Returns:
            JSON 数据，失败返回 None
        """
        if not file_path.exists():
            return None
        
        import time
        
        max_retries = 3
        retry_delay = 0.1  # 100ms
        
        for attempt in range(max_retries):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    # 获取共享锁（读锁）
                    self._lock_file(f, exclusive=False)
                    try:
                        data = json.load(f)
                        return data
                    finally:
                        self._unlock_file(f)
            except json.JSONDecodeError as e:
                # JSON 解析失败，缓存文件损坏
                logger.warning(f"[PluginCache] 缓存文件损坏，自动删除并重新生成: {file_path}")
                logger.debug(f"[PluginCache] 错误详情: {str(e)}")
                try:
                    # 删除损坏的缓存文件
                    file_path.unlink()
                    logger.info(f"[PluginCache] 已删除损坏的缓存文件: {file_path}")
                except Exception as delete_error:
                    logger.error(f"[PluginCache] 删除损坏文件失败: {str(delete_error)}")
                return None
            except PermissionError as e:
                # 权限错误，可能是文件被占用，重试
                if attempt < max_retries - 1:
                    logger.debug(f"[PluginCache] 文件被占用，等待重试 ({attempt + 1}/{max_retries}): {file_path}")
                    time.sleep(retry_delay)
                    continue
                else:
                    logger.warning(f"[PluginCache] 文件访问权限被拒绝，跳过缓存: {file_path}")
                    return None
            except Exception as e:
                logger.error(f"[PluginCache] 读取文件失败: {file_path}, {str(e)}")
                return None
        
        return None
    
    def _write_json_file(self, file_path: Path, data: Dict) -> bool:
        """
        写入 JSON 文件（带文件锁）
        
        Args:
            file_path: 文件路径
            data: JSON 数据
            
        Returns:
            是否成功
        """
        try:
            # 确保目录存在
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                # 获取排他锁（写锁）
                self._lock_file(f, exclusive=True)
                try:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    return True
                finally:
                    self._unlock_file(f)
        except Exception as e:
            logger.error(f"[PluginCache] 写入文件失败: {file_path}, {str(e)}")
            return False
    
    def load_plugins_cache(self, env_id: str) -> List[PluginInfo]:
        """
        从缓存加载插件列表
        
        Args:
            env_id: 环境 ID
            
        Returns:
            插件列表
        """
        cache_path = self._get_plugins_cache_path(env_id)
        data = self._read_json_file(cache_path)
        
        if not data or 'plugins' not in data:
            return []
        
        # 检查缓存是否过期（24 小时）
        if 'updated_at' in data:
            try:
                from datetime import datetime, timedelta
                updated_at = datetime.fromisoformat(data['updated_at'])
                cache_age = datetime.now() - updated_at
                
                # 如果缓存超过 24 小时，返回空列表（触发重新获取）
                if cache_age > timedelta(hours=24):
                    logger.info(f"[PluginCache] 缓存已过期（{cache_age.total_seconds() / 3600:.1f} 小时），将重新获取")
                    return []
            except Exception as e:
                logger.warning(f"[PluginCache] 检查缓存时间失败: {str(e)}")
        
        plugins = []
        for item in data['plugins']:
            try:
                plugin = PluginInfo(
                    name=item['name'],
                    path=Path(item['path']),
                    is_git_repo=item.get('is_git_repo', False),
                    git_url=item.get('git_url', ''),
                    branch=item.get('branch', ''),
                    default_branch=item.get('default_branch', ''),
                    commit_hash=item.get('commit_hash', ''),
                    commit_date=item.get('commit_date', ''),
                    has_update=item.get('has_update', False),
                    behind_commits=item.get('behind_commits', 0),
                    dependency_updated=item.get('dependency_updated', False),
                    dependency_viewed=item.get('dependency_viewed', False),
                    git_fetch_error=item.get('git_fetch_error', ''),
                    git_fetch_error_detail=item.get('git_fetch_error_detail', ''),
                    git_fetch_error_type=item.get('git_fetch_error_type', ''),
                    git_fetch_error_causes=item.get('git_fetch_error_causes', ''),
                    git_fetch_error_solutions=item.get('git_fetch_error_solutions', ''),
                    install_date=item.get('install_date', ''),
                    source=item.get('source', 'primary')
                )
                plugins.append(plugin)
            except Exception as e:
                logger.warning(f"[PluginCache] 解析插件数据失败: {item.get('name', 'unknown')}, {str(e)}")
                continue
        
        return plugins
    
    def save_plugins_cache(self, env_id: str, plugins: List[PluginInfo]) -> bool:
        """
        保存插件列表到缓存
        
        Args:
            env_id: 环境 ID
            plugins: 插件列表
            
        Returns:
            是否成功
        """
        cache_path = self._get_plugins_cache_path(env_id)
        
        data = {
            'version': '1.0',
            'updated_at': datetime.now().isoformat(),
            'plugins': [
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
        }
        
        return self._write_json_file(cache_path, data)
    
    def load_dependencies_cache(self, env_id: str) -> Dict:
        """
        从缓存加载依赖信息（增强版）
        
        Args:
            env_id: 环境 ID
            
        Returns:
            包含以下内容的字典：
            - pip_list_snapshot: pip list 快照 {"package": "version", ...}
            - dependencies: 依赖字典 {"plugin_name": [Dependency, ...], ...}
            - viewed_status: 用户查看状态 {"plugin_name": bool, ...}
        """
        cache_path = self._get_dependencies_cache_path(env_id)
        data = self._read_json_file(cache_path)
        
        # 如果缓存不存在或损坏，返回空结构
        if not data:
            return {
                'pip_list_snapshot': {},
                'dependencies': {},
                'viewed_status': {}
            }
        
        # 解析 pip list 快照
        pip_list_snapshot = data.get('pip_list_snapshot', {})
        
        # 解析依赖列表
        dependencies = {}
        if 'dependencies' in data:
            for plugin_name, deps_data in data['dependencies'].items():
                deps = []
                for item in deps_data:
                    try:
                        dep = Dependency(
                            package=item['package'],
                            version=item['version'],
                            installed=item.get('installed', False),
                            installed_version=item.get('installed_version', '')
                        )
                        deps.append(dep)
                    except Exception as e:
                        logger.warning(f"[PluginCache] 解析依赖数据失败: {plugin_name}, {str(e)}")
                        continue
                
                # 保存依赖列表（包括空列表）
                dependencies[plugin_name] = deps
        
        # 解析用户查看状态
        viewed_status = data.get('viewed_status', {})
        
        return {
            'pip_list_snapshot': pip_list_snapshot,
            'dependencies': dependencies,
            'viewed_status': viewed_status
        }
    
    def save_dependencies_cache(
        self,
        env_id: str,
        data: Dict
    ) -> bool:
        """
        保存依赖信息到缓存（增强版）
        
        Args:
            env_id: 环境 ID
            data: 包含以下内容的字典：
                - pip_list_snapshot: pip list 快照 {"package": "version", ...}
                - dependencies: 依赖字典 {"plugin_name": [Dependency, ...], ...}
                - viewed_status: 用户查看状态 {"plugin_name": bool, ...}
            
        Returns:
            是否成功
        """
        cache_path = self._get_dependencies_cache_path(env_id)
        
        # 提取数据
        pip_list_snapshot = data.get('pip_list_snapshot', {})
        dependencies = data.get('dependencies', {})
        viewed_status = data.get('viewed_status', {})
        
        # 构建缓存数据结构
        cache_data = {
            'version': '1.0',
            'updated_at': datetime.now().isoformat(),
            'pip_list_snapshot': pip_list_snapshot,
            'dependencies': {
                plugin_name: [
                    {
                        'package': d.package,
                        'version': d.version,
                        'installed': d.installed,
                        'installed_version': d.installed_version
                    }
                    for d in deps
                ]
                for plugin_name, deps in dependencies.items()
            },
            'viewed_status': viewed_status
        }
        
        return self._write_json_file(cache_path, cache_data)
    
    def incremental_update(
        self,
        cached: List[PluginInfo],
        scanned: List[PluginInfo]
    ) -> List[PluginInfo]:
        """
        增量更新插件列表
        
        算法：
        1. 以扫描结果为准（新增、删除）
        2. 保留缓存中的 Git 信息和状态
        3. 合并两者数据
        
        Args:
            cached: 缓存的插件列表
            scanned: 扫描的插件列表
            
        Returns:
            合并后的插件列表
        """
        # 构建缓存字典，key 为插件名
        cached_dict = {p.name: p for p in cached}
        
        # 合并数据
        merged = []
        for scanned_plugin in scanned:
            if scanned_plugin.name in cached_dict:
                # 插件存在于缓存中，合并数据
                cached_plugin = cached_dict[scanned_plugin.name]
                
                # 保留缓存中的 Git 信息和状态
                scanned_plugin.git_url = cached_plugin.git_url
                scanned_plugin.branch = cached_plugin.branch
                scanned_plugin.default_branch = cached_plugin.default_branch
                scanned_plugin.commit_hash = cached_plugin.commit_hash
                scanned_plugin.commit_date = cached_plugin.commit_date
                scanned_plugin.has_update = cached_plugin.has_update
                scanned_plugin.behind_commits = cached_plugin.behind_commits
                scanned_plugin.dependency_updated = cached_plugin.dependency_updated
                scanned_plugin.dependency_viewed = cached_plugin.dependency_viewed
                scanned_plugin.git_fetch_error = cached_plugin.git_fetch_error
                scanned_plugin.git_fetch_error_detail = cached_plugin.git_fetch_error_detail
                scanned_plugin.git_fetch_error_type = cached_plugin.git_fetch_error_type
                scanned_plugin.git_fetch_error_causes = cached_plugin.git_fetch_error_causes
                scanned_plugin.git_fetch_error_solutions = cached_plugin.git_fetch_error_solutions
                
                # 如果扫描时没有获取到安装日期，使用缓存中的值
                if not scanned_plugin.install_date and cached_plugin.install_date:
                    scanned_plugin.install_date = cached_plugin.install_date
            
            merged.append(scanned_plugin)
        
        return merged
    
    def mark_dependency_viewed(self, env_id: str, plugin_name: str) -> bool:
        """
        标记用户已查看依赖
        
        当用户点击"查询依赖"按钮后，调用此方法标记依赖已被查看。
        这会清除 dependency_updated 标志，并设置 dependency_viewed 为 True。
        
        Args:
            env_id: 环境 ID
            plugin_name: 插件名称
            
        Returns:
            是否成功标记
        """
        try:
            # 加载插件缓存
            plugins = self.load_plugins_cache(env_id)
            
            # 查找目标插件
            found = False
            for plugin in plugins:
                if plugin.name == plugin_name:
                    # 标记已查看
                    plugin.dependency_viewed = True
                    # 清除更新标志
                    plugin.dependency_updated = False
                    found = True
                    break
            
            if not found:
                logger.warning(f"[PluginCache] 插件不存在: {plugin_name}")
                return False
            
            # 保存到缓存
            return self.save_plugins_cache(env_id, plugins)
        
        except Exception as e:
            logger.error(f"[PluginCache] 标记已查看失败: {plugin_name}, {str(e)}")
            return False
    
    def get_dependency_viewed_status(self, env_id: str, plugin_name: str) -> bool:
        """
        获取依赖查看状态
        
        Args:
            env_id: 环境 ID
            plugin_name: 插件名称
            
        Returns:
            依赖是否已被查看（True=已查看，False=未查看）
        """
        try:
            # 加载插件缓存
            plugins = self.load_plugins_cache(env_id)
            
            # 查找目标插件
            for plugin in plugins:
                if plugin.name == plugin_name:
                    return plugin.dependency_viewed
            
            # 插件不存在，返回 False
            return False
        
        except Exception as e:
            logger.error(f"[PluginCache] 获取查看状态失败: {plugin_name}, {str(e)}")
            return False
