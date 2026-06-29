"""
依赖冲突检测器

负责从依赖树中检测各种类型的冲突，包括版本不匹配和循环依赖。
"""

import logging
import uuid
from typing import List, Dict, Set, Optional
from packaging import version
from packaging.specifiers import SpecifierSet, InvalidSpecifier

from .models import DependencyNode, ConflictInfo

logger = logging.getLogger(__name__)


class ConflictDetector:
    """冲突检测器
    
    负责从依赖树中检测各种类型的冲突。
    """
    
    def detect_conflicts(self, tree: List[DependencyNode]) -> List[ConflictInfo]:
        """检测依赖冲突
        
        Args:
            tree: 依赖树
            
        Returns:
            List[ConflictInfo]: 冲突信息列表
        """
        conflicts = []
        
        # 检测版本冲突
        version_conflicts = self._detect_version_conflicts(tree)
        conflicts.extend(version_conflicts)
        
        # 检测循环依赖
        circular_conflicts = self._detect_circular_dependencies(tree)
        conflicts.extend(circular_conflicts)
        
        logger.info(f"检测到 {len(conflicts)} 个冲突")
        return conflicts
    
    def parse_pipdeptree_warnings(self, warnings: str) -> List[ConflictInfo]:
        """解析 pipdeptree 的警告信息
        
        pipdeptree 的警告格式：
        Warning!!! Possibly conflicting dependencies found:
        * package-a==1.0.0
          - package-b [required: >=2.0.0, installed: 1.0.0]
        
        Args:
            warnings: pipdeptree 的 stderr 输出
            
        Returns:
            List[ConflictInfo]: 解析出的冲突信息列表
        """
        conflicts = []
        
        if not warnings or not warnings.strip():
            return conflicts
        
        lines = warnings.strip().split('\n')
        current_package = None
        
        for line in lines:
            line = line.strip()
            
            # 跳过标题行
            if 'Warning' in line or 'conflicting' in line or '---' in line:
                continue
            
            # 解析包行（以 * 开头）
            if line.startswith('*'):
                # 格式: * package-name==version
                parts = line[1:].strip().split('==')
                if len(parts) == 2:
                    current_package = parts[0].strip()
                    logger.debug(f"解析到包: {current_package}")
            
            # 解析依赖行（以 - 开头）
            elif line.startswith('-') and current_package:
                # 格式: - dependency [required: >=1.0.0, installed: 0.9.0]
                try:
                    # 提取依赖名称和版本信息
                    dep_part = line[1:].strip()
                    
                    # 分离包名和版本信息
                    if '[' in dep_part:
                        dep_name = dep_part.split('[')[0].strip()
                        version_info = dep_part.split('[')[1].split(']')[0]
                        
                        # 解析 required 和 installed 版本
                        # 注意：required 可能包含逗号（如 >=1.17,<2.0.0）
                        # 需要先找到 'installed:' 的位置，然后分割
                        required_version = ''
                        installed_version = ''
                        
                        if 'installed:' in version_info:
                            # 分割 required 和 installed 部分
                            parts = version_info.split('installed:')
                            if len(parts) == 2:
                                # required 部分（移除 'required:' 前缀）
                                required_part = parts[0].strip()
                                if required_part.startswith('required:'):
                                    required_version = required_part[9:].strip().rstrip(',')
                                
                                # installed 部分
                                installed_version = parts[1].strip().rstrip(',')
                        else:
                            # 没有 installed 信息，只有 required
                            if version_info.startswith('required:'):
                                required_version = version_info[9:].strip()
                        
                        # 如果 installed 是 ?，说明未安装
                        if installed_version == '?':
                            conflict_type = 'missing_dependency'
                            description = f"包 {current_package} 依赖 {dep_name}{required_version}，但该包未安装"
                            severity = 'critical'
                        else:
                            conflict_type = 'version_mismatch'
                            description = f"包 {current_package} 要求 {dep_name}{required_version}，但当前安装的是 {installed_version}"
                            severity = 'warning'
                        
                        # 创建冲突信息
                        conflict = ConflictInfo(
                            id=str(uuid.uuid4()),
                            type=conflict_type,
                            severity=severity,
                            package_name=dep_name,
                            installed_version=installed_version if installed_version != '?' else '',
                            required_version=required_version,
                            source=current_package,
                            description=description,
                            suggestion=self._generate_suggestion({
                                'type': conflict_type,
                                'package_name': dep_name,
                                'required_version': required_version,
                                'installed_version': installed_version
                            }),
                            related_node_ids=[]
                        )
                        conflicts.append(conflict)
                        logger.debug(f"解析到冲突: {dep_name} - {description}")
                
                except Exception as e:
                    logger.warning(f"解析警告行时出错: {line} - {str(e)}")
        
        logger.info(f"从 pipdeptree 警告中解析出 {len(conflicts)} 个冲突")
        return conflicts
    
    
    def _detect_version_conflicts(self, tree: List[DependencyNode]) -> List[ConflictInfo]:
        """检测版本不匹配冲突
        
        遍历依赖树，检测实际安装的版本是否满足要求的版本范围。
        
        Args:
            tree: 依赖树
            
        Returns:
            List[ConflictInfo]: 版本冲突列表
        """
        conflicts = []
        
        # 递归遍历依赖树
        def traverse(nodes: List[DependencyNode], parent_name: Optional[str] = None):
            for node in nodes:
                # 只检查有明确版本要求的节点
                # 根级别的包通常没有 required_version（它们是顶层依赖）
                if node.required_version and node.required_version.strip():
                    try:
                        # 跳过特殊标记（如 'Any', '?'）
                        if node.required_version.lower() in ['any', '?', 'none']:
                            logger.debug(f"跳过特殊版本要求: {node.package_name} - {node.required_version}")
                            continue
                        
                        # 跳过未安装的包（installed_version 为 '?'）
                        if not node.installed_version or node.installed_version == '?':
                            logger.debug(f"跳过未安装的包: {node.package_name}")
                            continue
                        
                        # 解析要求的版本范围
                        spec = SpecifierSet(node.required_version)
                        installed_ver = version.parse(node.installed_version)
                        
                        # 检查实际版本是否满足要求
                        if installed_ver not in spec:
                            # 创建冲突信息
                            conflict = ConflictInfo(
                                id=str(uuid.uuid4()),
                                type='version_mismatch',
                                severity=self._calculate_severity('version_mismatch', node),
                                package_name=node.package_name,
                                installed_version=node.installed_version,
                                required_version=node.required_version,
                                source=parent_name or 'unknown',
                                description=f"包 {parent_name or 'unknown'} 要求 {node.package_name}{node.required_version}，但当前安装的是 {node.installed_version}",
                                suggestion=self._generate_suggestion({
                                    'type': 'version_mismatch',
                                    'package_name': node.package_name,
                                    'required_version': node.required_version,
                                    'installed_version': node.installed_version
                                }),
                                related_node_ids=[node.id]
                            )
                            conflicts.append(conflict)
                            
                            logger.debug(f"检测到版本冲突: {node.package_name} {node.installed_version} 不满足 {node.required_version}")
                    
                    except (InvalidSpecifier, version.InvalidVersion) as e:
                        # 只记录 debug 级别的日志，避免刷屏
                        logger.debug(f"跳过无效版本: {node.package_name} (required: {node.required_version}, installed: {node.installed_version}) - {str(e)}")
                
                # 递归检查子依赖
                if node.dependencies:
                    traverse(node.dependencies, node.package_name)
        
        traverse(tree)
        return conflicts
    
    def _detect_circular_dependencies(self, tree: List[DependencyNode]) -> List[ConflictInfo]:
        """检测循环依赖
        
        使用深度优先搜索检测依赖树中的循环。
        
        Args:
            tree: 依赖树
            
        Returns:
            List[ConflictInfo]: 循环依赖冲突列表
        """
        conflicts = []
        visited: Set[str] = set()
        rec_stack: List[str] = []  # 递归栈，用于记录当前路径
        
        def dfs(node: DependencyNode) -> bool:
            """深度优先搜索检测循环
            
            Args:
                node: 当前节点
                
            Returns:
                bool: 是否检测到循环
            """
            # 如果节点在递归栈中，说明存在循环
            if node.package_name in rec_stack:
                # 找到循环路径
                cycle_start = rec_stack.index(node.package_name)
                cycle_path = rec_stack[cycle_start:] + [node.package_name]
                
                # 创建冲突信息
                conflict = ConflictInfo(
                    id=str(uuid.uuid4()),
                    type='circular_dependency',
                    severity=self._calculate_severity('circular_dependency', node),
                    package_name=node.package_name,
                    installed_version=node.installed_version,
                    required_version='',
                    source=' -> '.join(cycle_path[:-1]),
                    description=f"检测到循环依赖: {' -> '.join(cycle_path)}",
                    suggestion=self._generate_suggestion({
                        'type': 'circular_dependency',
                        'package_name': node.package_name,
                        'cycle_path': cycle_path
                    }),
                    related_node_ids=[node.id]
                )
                conflicts.append(conflict)
                
                logger.debug(f"检测到循环依赖: {' -> '.join(cycle_path)}")
                return True
            
            # 如果节点已访问过，跳过
            if node.package_name in visited:
                return False
            
            # 标记为已访问并加入递归栈
            visited.add(node.package_name)
            rec_stack.append(node.package_name)
            
            # 递归检查子依赖
            for dep in node.dependencies:
                dfs(dep)
            
            # 从递归栈中移除
            rec_stack.pop()
            return False
        
        # 对每个根节点执行 DFS
        for node in tree:
            if node.package_name not in visited:
                dfs(node)
        
        return conflicts
    
    def _calculate_severity(self, conflict_type: str, node: DependencyNode) -> str:
        """计算冲突严重程度
        
        根据冲突类型和影响范围判断严重程度。
        
        Args:
            conflict_type: 冲突类型
            node: 冲突节点
            
        Returns:
            str: 严重程度 ('critical' | 'warning' | 'info')
        """
        # 循环依赖通常是严重问题
        if conflict_type == 'circular_dependency':
            return 'critical'
        
        # 版本不匹配根据深度判断
        if conflict_type == 'version_mismatch':
            # 顶层依赖的版本冲突更严重
            if node.depth <= 1:
                return 'warning'
            else:
                return 'info'
        
        # 缺失依赖是严重问题
        if conflict_type == 'missing_dependency':
            return 'critical'
        
        # 默认为警告级别
        return 'warning'
    
    def _generate_suggestion(self, conflict_info: Dict) -> str:
        """生成解决建议
        
        根据冲突类型生成具体的解决建议。
        
        Args:
            conflict_info: 冲突信息字典
            
        Returns:
            str: 解决建议
        """
        conflict_type = conflict_info.get('type')
        
        if conflict_type == 'version_mismatch':
            package_name = conflict_info.get('package_name')
            required_version = conflict_info.get('required_version')
            installed_version = conflict_info.get('installed_version')
            
            # 判断是升级还是降级
            try:
                req_spec = SpecifierSet(required_version)
                installed_ver = version.parse(installed_version)
                
                # 尝试提取最小版本要求
                suggestion = f"运行 'pip install \"{package_name}{required_version}\"' 来安装兼容版本"
                
                # 如果是简单的 >= 要求，提供更具体的建议
                if required_version.startswith('>='):
                    min_version = required_version[2:].strip()
                    suggestion = f"运行 'pip install --upgrade {package_name}>={min_version}' 升级到兼容版本"
                elif required_version.startswith('=='):
                    exact_version = required_version[2:].strip()
                    suggestion = f"运行 'pip install {package_name}=={exact_version}' 安装指定版本"
                
                return suggestion
            
            except Exception as e:
                logger.warning(f"生成版本建议时出错: {str(e)}")
                return f"请检查 {package_name} 的版本要求并手动调整"
        
        elif conflict_type == 'circular_dependency':
            package_name = conflict_info.get('package_name')
            cycle_path = conflict_info.get('cycle_path', [])
            
            return (
                f"循环依赖通常需要重构包结构来解决。"
                f"请检查 {' -> '.join(cycle_path)} 的依赖关系，"
                f"考虑将共同依赖提取到单独的包中。"
            )
        
        elif conflict_type == 'missing_dependency':
            package_name = conflict_info.get('package_name')
            return f"运行 'pip install {package_name}' 安装缺失的依赖"
        
        return "请查看文档或联系包维护者获取帮助"
