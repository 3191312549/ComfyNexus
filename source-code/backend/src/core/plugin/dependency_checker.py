"""
依赖变化检测器

检测插件依赖的变化，用于准确提示用户依赖更新。
"""

from typing import List, Dict, Set, Tuple, Optional
from .models import Dependency


class DependencyChecker:
    """依赖变化检测器"""
    
    def __init__(self):
        """初始化依赖变化检测器"""
        pass
    
    def check_dependency_changes(
        self,
        plugin_name: str,
        current_deps: List[Dependency],
        cached_deps: Dict[str, List[Dependency]]
    ) -> Dict:
        """
        检查单个插件的依赖是否有变化
        
        算法逻辑：
        1. 如果缓存中没有该插件，返回 has_changes=False（首次扫描）
        2. 转换为可比较的集合：{(package, version), ...}
        3. 对比当前集合和缓存集合
        4. 识别新增、删除、修改的依赖
        
        Args:
            plugin_name: 插件名称
            current_deps: 当前依赖列表
            cached_deps: 缓存的依赖字典 {"plugin_name": [Dependency, ...], ...}
            
        Returns:
            变化信息字典：
            {
                'has_changes': bool,           # 是否有变化
                'added': [Dependency, ...],    # 新增的依赖
                'removed': [Dependency, ...],  # 删除的依赖
                'modified': [Dependency, ...]  # 修改的依赖（版本要求变化）
            }
        """
        # 如果缓存中没有该插件，说明是首次扫描
        if plugin_name not in cached_deps:
            return {
                'has_changes': False,
                'added': [],
                'removed': [],
                'modified': []
            }
        
        # 获取缓存的依赖列表
        cached_plugin_deps = cached_deps[plugin_name]
        
        # 转换为可比较的集合：{(package, version), ...}
        current_set = self._deps_to_set(current_deps)
        cached_set = self._deps_to_set(cached_plugin_deps)
        
        # 识别新增的依赖
        added_tuples = current_set - cached_set
        added_deps = [
            dep for dep in current_deps
            if (dep.package.lower(), dep.version) in added_tuples
        ]
        
        # 识别删除的依赖
        removed_tuples = cached_set - current_set
        removed_deps = [
            dep for dep in cached_plugin_deps
            if (dep.package.lower(), dep.version) in removed_tuples
        ]
        
        # 识别修改的依赖（包名相同但版本要求不同）
        modified_deps = []
        current_packages = {dep.package.lower(): dep for dep in current_deps}
        cached_packages = {dep.package.lower(): dep for dep in cached_plugin_deps}
        
        for package_lower in current_packages:
            if package_lower in cached_packages:
                current_dep = current_packages[package_lower]
                cached_dep = cached_packages[package_lower]
                
                # 如果版本要求不同，且不在新增/删除列表中
                if current_dep.version != cached_dep.version:
                    # 确保不重复计入新增或删除
                    if (package_lower, current_dep.version) not in added_tuples:
                        modified_deps.append(current_dep)
        
        # 判断是否有变化
        has_changes = bool(added_deps or removed_deps or modified_deps)
        
        return {
            'has_changes': has_changes,
            'added': added_deps,
            'removed': removed_deps,
            'modified': modified_deps
        }
    
    def _deps_to_set(self, deps: List[Dependency]) -> Set[Tuple[str, str]]:
        """
        将依赖列表转换为可比较的集合
        
        Args:
            deps: 依赖列表
            
        Returns:
            集合 {(package_lower, version), ...}
        """
        return {
            (dep.package.lower(), dep.version)
            for dep in deps
        }
    
    def batch_check_all_changes(
        self,
        plugins_deps: Dict[str, List[Dependency]],
        cached_deps: Dict[str, List[Dependency]]
    ) -> Dict:
        """
        批量检查所有插件的依赖变化
        
        Args:
            plugins_deps: 当前插件依赖字典 {"plugin_name": [Dependency, ...], ...}
            cached_deps: 缓存的依赖字典 {"plugin_name": [Dependency, ...], ...}
            
        Returns:
            变化摘要字典：
            {
                'total_plugins': int,                    # 总插件数
                'changed_plugins': int,                  # 有变化的插件数
                'changes': {                             # 每个插件的变化详情
                    'plugin_name': {
                        'has_changes': bool,
                        'added': [Dependency, ...],
                        'removed': [Dependency, ...],
                        'modified': [Dependency, ...]
                    },
                    ...
                }
            }
        """
        changes = {}
        changed_count = 0
        
        # 遍历所有插件
        for plugin_name, current_deps in plugins_deps.items():
            # 检查单个插件的依赖变化
            change_info = self.check_dependency_changes(
                plugin_name,
                current_deps,
                cached_deps
            )
            
            changes[plugin_name] = change_info
            
            if change_info['has_changes']:
                changed_count += 1
        
        return {
            'total_plugins': len(plugins_deps),
            'changed_plugins': changed_count,
            'changes': changes
        }
