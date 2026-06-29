"""
版本管理工具模块
提供版本号解析、比较、验证等功能
"""

import re
from typing import Union


class Version:
    """语义化版本类"""
    
    def __init__(self, major: int, minor: int, patch: int):
        """
        初始化版本对象
        
        Args:
            major: 主版本号
            minor: 次版本号
            patch: 修订号
        """
        self.major = major
        self.minor = minor
        self.patch = patch
    
    @classmethod
    def parse(cls, version_str: str) -> 'Version':
        """
        解析版本字符串
        
        Args:
            version_str: 版本字符串，格式为 "MAJOR.MINOR.PATCH" 或 "MAJOR.MINOR" 或 "MAJOR"
        
        Returns:
            Version 对象
        
        Raises:
            ValueError: 版本字符串格式无效
        """
        if not version_str or not isinstance(version_str, str):
            raise ValueError(f"无效的版本字符串: {version_str}")
        
        # 移除前后空格
        version_str = version_str.strip()
        
        # 分割版本号
        parts = version_str.split('.')
        
        if len(parts) > 3:
            raise ValueError(f"版本号部分过多: {version_str}")
        
        try:
            # 解析各部分
            major = int(parts[0]) if len(parts) > 0 else 0
            minor = int(parts[1]) if len(parts) > 1 else 0
            patch = int(parts[2]) if len(parts) > 2 else 0
            
            # 验证非负
            if major < 0 or minor < 0 or patch < 0:
                raise ValueError(f"版本号不能为负数: {version_str}")
            
            return cls(major, minor, patch)
        except (ValueError, IndexError) as e:
            raise ValueError(f"无法解析版本字符串 '{version_str}': {str(e)}")
    
    def __eq__(self, other: 'Version') -> bool:
        """版本相等比较"""
        if not isinstance(other, Version):
            return False
        return (self.major == other.major and 
                self.minor == other.minor and 
                self.patch == other.patch)
    
    def __lt__(self, other: 'Version') -> bool:
        """版本小于比较"""
        if not isinstance(other, Version):
            raise TypeError(f"无法比较 Version 和 {type(other)}")
        
        if self.major != other.major:
            return self.major < other.major
        if self.minor != other.minor:
            return self.minor < other.minor
        return self.patch < other.patch
    
    def __le__(self, other: 'Version') -> bool:
        """版本小于等于比较"""
        return self == other or self < other
    
    def __gt__(self, other: 'Version') -> bool:
        """版本大于比较"""
        return not self <= other
    
    def __ge__(self, other: 'Version') -> bool:
        """版本大于等于比较"""
        return not self < other
    
    def __str__(self) -> str:
        """转换为字符串"""
        return f"{self.major}.{self.minor}.{self.patch}"
    
    def __repr__(self) -> str:
        """对象表示"""
        return f"Version({self.major}, {self.minor}, {self.patch})"


def compare_versions(v1: str, v2: str) -> int:
    """
    比较两个版本号
    
    Args:
        v1: 版本号 1
        v2: 版本号 2
    
    Returns:
        -1: v1 < v2
         0: v1 == v2
         1: v1 > v2
    
    Raises:
        ValueError: 版本号格式无效
    """
    version1 = Version.parse(v1)
    version2 = Version.parse(v2)
    
    if version1 < version2:
        return -1
    elif version1 == version2:
        return 0
    else:
        return 1


def is_version_upgrade(old_version: str, new_version: str) -> bool:
    """
    判断是否为版本升级
    
    Args:
        old_version: 旧版本号
        new_version: 新版本号
    
    Returns:
        是否为升级（new_version > old_version）
    
    Raises:
        ValueError: 版本号格式无效
    """
    return compare_versions(old_version, new_version) < 0


def validate_version(version_str: str) -> bool:
    """
    验证版本号格式
    
    Args:
        version_str: 版本号字符串
    
    Returns:
        是否有效
    """
    try:
        Version.parse(version_str)
        return True
    except (ValueError, TypeError):
        return False
