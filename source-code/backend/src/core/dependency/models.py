"""
依赖分析数据模型

定义依赖节点和冲突信息的数据结构。
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class DependencyNode:
    """依赖节点
    
    表示依赖树中的一个包节点，包含包的基本信息和依赖关系。
    
    Attributes:
        id: 节点唯一标识
        package_name: 包名
        installed_version: 已安装版本
        required_version: 要求的版本范围（如果是子依赖）
        dependencies: 子依赖列表
        has_conflict: 是否存在冲突
        conflict_type: 冲突类型
        depth: 节点深度（从 0 开始）
        parent_id: 父节点 ID
    """
    
    id: str
    package_name: str
    installed_version: str
    required_version: Optional[str] = None
    dependencies: List['DependencyNode'] = field(default_factory=list)
    has_conflict: bool = False
    conflict_type: Optional[str] = None
    depth: int = 0
    parent_id: Optional[str] = None
    
    def to_dict(self) -> dict:
        """转换为字典
        
        将数据模型转换为前端可用的字典格式，字段名使用驼峰命名。
        
        Returns:
            dict: 包含所有字段的字典
        """
        return {
            'id': self.id,
            'packageName': self.package_name,
            'installedVersion': self.installed_version,
            'requiredVersion': self.required_version,
            'dependencies': [dep.to_dict() for dep in self.dependencies],
            'hasConflict': self.has_conflict,
            'conflictType': self.conflict_type,
            'depth': self.depth,
            'parentId': self.parent_id
        }


@dataclass
class ConflictInfo:
    """冲突信息
    
    表示依赖树中检测到的冲突详情。
    
    Attributes:
        id: 冲突唯一标识
        type: 冲突类型 ('version_mismatch' | 'circular_dependency' | 'missing_dependency')
        severity: 严重程度 ('critical' | 'warning' | 'info')
        package_name: 涉及的包名
        installed_version: 已安装版本
        required_version: 要求的版本
        source: 冲突来源（哪个包依赖了它）
        description: 冲突描述
        suggestion: 解决建议
        related_node_ids: 相关节点 ID 列表
    """
    
    id: str
    type: str
    severity: str
    package_name: str
    installed_version: str
    required_version: str
    source: str
    description: str
    suggestion: str
    related_node_ids: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        """转换为字典
        
        将数据模型转换为前端可用的字典格式，字段名使用驼峰命名。
        
        Returns:
            dict: 包含所有字段的字典
        """
        return {
            'id': self.id,
            'type': self.type,
            'severity': self.severity,
            'packageName': self.package_name,
            'installedVersion': self.installed_version,
            'requiredVersion': self.required_version,
            'source': self.source,
            'description': self.description,
            'suggestion': self.suggestion,
            'relatedNodeIds': self.related_node_ids
        }
