"""
Git 配置工具（向后兼容模块）

此模块已弃用，保留仅为向后兼容。
所有功能已迁移到 git_manager.py 模块。

新代码请直接使用：
    from backend.src.utils.git_manager import get_git_executable, setup_git_environment, git_manager
"""

import warnings

from backend.src.utils.git_manager import (
    get_git_executable as _get_git_executable,
    setup_git_environment as _setup_git_environment,
    git_manager,
)


def get_git_executable() -> str:
    """
    获取 Git 可执行文件路径（向后兼容）
    
    此函数已迁移到 git_manager.py 模块。
    
    Returns:
        Git 可执行文件的完整路径
    """
    return _get_git_executable()


def setup_git_environment():
    """
    设置 Git 环境变量（向后兼容）
    
    此函数已迁移到 git_manager.py 模块。
    """
    _setup_git_environment()


class _GitExecutableAccessor:
    """
    Git 可执行文件访问器
    
    支持动态获取 Git 路径，当用户更改设置后能够获取最新值。
    用于向后兼容 GIT_EXECUTABLE 常量访问方式。
    """
    def __str__(self) -> str:
        return _get_git_executable()
    
    def __repr__(self) -> str:
        return _get_git_executable()
    
    def __fspath__(self) -> str:
        return _get_git_executable()
    
    def __eq__(self, other) -> bool:
        if isinstance(other, str):
            return _get_git_executable() == other
        if isinstance(other, _GitExecutableAccessor):
            return True
        return False
    
    def __hash__(self) -> int:
        return hash(_get_git_executable())


GIT_EXECUTABLE = _GitExecutableAccessor()
