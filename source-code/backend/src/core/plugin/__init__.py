"""
插件管理模块

提供 ComfyUI 插件的扫描、管理、更新和依赖管理功能。
"""

from .models import (
    PluginInfo,
    Dependency,
    CommitInfo,
    BranchInfo,
    GitInfo,
    UpdateInfo,
    UpdateResult,
    InstallResult,
    DependencyStatus,
    Conflict,
)

__all__ = [
    "PluginInfo",
    "Dependency",
    "CommitInfo",
    "BranchInfo",
    "GitInfo",
    "UpdateInfo",
    "UpdateResult",
    "InstallResult",
    "DependencyStatus",
    "Conflict",
]
