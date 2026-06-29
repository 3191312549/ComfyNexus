"""
插件管理数据结构定义

定义插件管理功能所需的所有数据类。
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
from datetime import datetime


@dataclass
class PluginInfo:
    """插件信息"""
    name: str                           # 插件名称 (目录名)
    path: Path                          # 插件路径
    is_git_repo: bool                   # 是否为 Git 仓库
    git_url: str = ""                   # Git 远端地址
    branch: str = ""                    # 当前分支
    default_branch: str = ""            # 默认分支
    commit_hash: str = ""               # 当前提交 hash (短hash, 7位)
    commit_date: str = ""               # 提交时间 (ISO格式)
    has_update: bool = False            # 是否有更新
    behind_commits: int = 0             # 落后提交数
    dependency_updated: bool = False    # 依赖是否有更新
    dependency_viewed: bool = False     # 用户是否已查看依赖
    install_date: str = ""              # 安装日期 (文件夹创建时间, ISO格式)
    git_fetch_error: str = ""           # Git 信息获取失败的简短描述
    git_fetch_error_detail: str = ""    # Git 信息获取失败的详细日志
    git_fetch_error_type: str = ""      # 错误类型: timeout/permission/network/unknown
    git_fetch_error_causes: str = ""    # 错误可能原因 (JSON 字符串)
    git_fetch_error_solutions: str = "" # 错误解决方案 (JSON 字符串)
    source: str = "primary"              # 插件来源: "primary" | model_path_config 的 name


@dataclass
class Dependency:
    """依赖信息"""
    package: str                        # 包名
    version: str                        # 版本要求 (如 ">=1.24.0")
    installed: bool = False             # 是否已安装
    installed_version: str = ""         # 已安装版本
    environment_marker: str = ""        # 环境标记 (如 "platform_machine == 'aarch64'")
    marker_match: bool = True           # 环境标记是否匹配当前系统
    pip_options: List[str] = field(default_factory=list)  # pip 安装选项 (如 ["--extra-index-url", "https://..."])


@dataclass
class CommitInfo:
    """提交信息"""
    hash: str                           # 短hash (7位)
    message: str                        # 提交信息
    date: str                           # 提交时间 (ISO格式)


@dataclass
class BranchInfo:
    """分支信息"""
    name: str                           # 分支名
    is_default: bool = False            # 是否为默认分支
    is_current: bool = False            # 是否为当前分支


@dataclass
class GitInfo:
    """Git 仓库信息"""
    remote_url: str                     # 远端地址
    current_branch: str                 # 当前分支
    default_branch: str                 # 默认分支
    commit_hash: str                    # 当前提交 hash (短)
    commit_date: str                    # 提交时间
    has_update: bool = False            # 是否有更新
    behind_commits: int = 0             # 落后提交数


@dataclass
class UpdateInfo:
    """更新信息"""
    plugin_name: str                    # 插件名称
    current_hash: str                   # 当前版本 hash
    latest_hash: str                    # 最新版本 hash
    commits: List[CommitInfo] = field(default_factory=list)  # 提交日志列表
    behind_commits: int = 0             # 落后提交数


@dataclass
class UpdateResult:
    """更新结果"""
    plugin_name: str                    # 插件名称
    success: bool                       # 是否成功
    message: str                        # 结果消息
    dependency_changed: bool = False    # 依赖是否变化
    new_dependencies: List[Dependency] = field(default_factory=list)  # 新增依赖
    dependencies_installed: int = 0     # 已安装的依赖数量（用于批量更新统计）
    error: Optional[str] = None         # 错误信息
    installed_deps: List[dict] = field(default_factory=list)  # 自动安装成功的依赖
    failed_deps: List[dict] = field(default_factory=list)     # 自动安装失败的依赖


@dataclass
class InstallResult:
    """安装结果"""
    package: str                        # 包名
    success: bool                       # 是否成功
    message: str                        # 结果消息
    error: Optional[str] = None         # 错误信息
    log_file: Optional[str] = None      # 日志文件路径


@dataclass
class DependencyStatus:
    """依赖状态"""
    dependency: Dependency              # 依赖信息
    installed: bool                     # 是否已安装
    version_match: bool                 # 版本是否匹配
    message: str = ""                   # 状态消息


@dataclass
class Conflict:
    """依赖冲突"""
    package: str                        # 包名
    required_versions: List[str]        # 要求的版本列表
    plugins: List[str]                  # 涉及的插件列表
    severity: str = "warning"           # 严重程度: warning/error
    message: str = ""                   # 冲突描述
