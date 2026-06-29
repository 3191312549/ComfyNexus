"""
路径验证器模块

提供路径安全验证功能，防止路径遍历攻击和非法路径访问。
"""

import os
import re
from pathlib import Path
from typing import List, Optional, Union


class PathValidationError(Exception):
    """路径验证错误"""
    pass


def check_path_traversal(path: str) -> Path:
    """
    检查路径是否包含路径遍历攻击
    
    Args:
        path: 要检查的路径
        
    Returns:
        Path: 规范化后的路径对象
        
    Raises:
        PathValidationError: 如果路径包含路径遍历攻击
    """
    if not path:
        raise PathValidationError("路径不能为空")
    
    path_str = str(path)
    
    if '\x00' in path_str:
        raise PathValidationError("路径包含空字节，可能是注入攻击")
    
    traversal_patterns = [
        r'\.\.[\\/]',
        r'[\\/]\.\.[\\/]',
        r'[\\/]\.\.$',
        r'^\.\.[\\/]',
    ]
    
    for pattern in traversal_patterns:
        if re.search(pattern, path_str):
            raise PathValidationError(f"路径包含非法的父目录遍历: {path}")
    
    try:
        resolved_path = Path(path_str).resolve()
    except (OSError, ValueError) as e:
        raise PathValidationError(f"无法解析路径: {e}")
    
    return resolved_path


def validate_path_in_allowed_dirs(
    path: str,
    allowed_base_dirs: List[str],
    allow_creation: bool = False
) -> bool:
    """
    验证路径是否在允许的目录范围内
    
    Args:
        path: 要验证的路径
        allowed_base_dirs: 允许的基础目录列表
        allow_creation: 是否允许创建不存在的路径
        
    Returns:
        bool: 如果路径在允许范围内返回 True
        
    Raises:
        PathValidationError: 如果路径不在允许范围内
    """
    if not path:
        raise PathValidationError("路径不能为空")
    
    if not allowed_base_dirs:
        raise PathValidationError("未指定允许的基础目录")
    
    resolved_path = check_path_traversal(path)
    
    resolved_allowed_dirs = []
    for base_dir in allowed_base_dirs:
        try:
            resolved_base = Path(base_dir).resolve()
            resolved_allowed_dirs.append(resolved_base)
        except (OSError, ValueError):
            continue
    
    for allowed_dir in resolved_allowed_dirs:
        try:
            resolved_path.relative_to(allowed_dir)
            return True
        except ValueError:
            continue
    
    allowed_str = ", ".join(str(d) for d in resolved_allowed_dirs)
    raise PathValidationError(
        f"路径 '{resolved_path}' 不在允许的目录范围内。允许的目录: {allowed_str}"
    )


def sanitize_path(path: str) -> Path:
    """
    清理和规范化路径
    
    Args:
        path: 要清理的路径
        
    Returns:
        Path: 清理后的路径对象
    """
    if not path:
        return Path(".")
    
    path = path.strip()
    
    path = re.sub(r'[\\/]+', os.sep, path)
    
    path = path.rstrip(os.sep) if len(path) > 1 else path
    
    return Path(path).resolve()


def validate_file_path(
    file_path: str,
    allowed_extensions: Optional[List[str]] = None,
    allowed_base_dirs: Optional[List[str]] = None
) -> Path:
    """
    验证文件路径
    
    Args:
        file_path: 要验证的文件路径
        allowed_extensions: 允许的文件扩展名列表（如 ['.json', '.yaml']）
        allowed_base_dirs: 允许的基础目录列表
        
    Returns:
        Path: 验证后的路径对象
        
    Raises:
        PathValidationError: 如果路径验证失败
    """
    resolved_path = check_path_traversal(file_path)
    
    if allowed_extensions:
        ext = resolved_path.suffix.lower()
        if ext not in [e.lower() for e in allowed_extensions]:
            raise PathValidationError(
                f"文件扩展名 '{ext}' 不在允许的列表中: {allowed_extensions}"
            )
    
    if allowed_base_dirs:
        validate_path_in_allowed_dirs(file_path, allowed_base_dirs)
    
    return resolved_path


def is_safe_path(path: str, base_dir: str) -> bool:
    """
    检查路径是否安全（在基础目录内且无遍历）
    
    Args:
        path: 要检查的路径
        base_dir: 基础目录
        
    Returns:
        bool: 如果路径安全返回 True，否则返回 False
    """
    try:
        validate_path_in_allowed_dirs(path, [base_dir])
        return True
    except PathValidationError:
        return False
