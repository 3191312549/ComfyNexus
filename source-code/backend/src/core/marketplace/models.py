"""
插件市场数据模型

定义插件市场功能所需的所有数据结构
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pathlib import Path


class InstallStage(str, Enum):
    """安装阶段枚举"""
    CLONING = "cloning"                    # 正在克隆仓库
    CHECKING_DEPS = "checking_deps"        # 正在检查依赖
    INSTALLING_DEPS = "installing_deps"    # 正在安装依赖
    SUCCESS = "success"                    # 安装成功
    FAILED = "failed"                      # 安装失败


class InstallStatus(str, Enum):
    """安装状态枚举"""
    PENDING = "pending"      # 等待中
    RUNNING = "running"      # 运行中
    SUCCESS = "success"      # 成功
    FAILED = "failed"        # 失败


class ConflictType(str, Enum):
    """依赖冲突类型枚举"""
    VERSION_MISMATCH = "version_mismatch"  # 版本不匹配
    MISSING = "missing"                    # 缺失依赖


class ConflictSeverity(str, Enum):
    """冲突严重程度枚举"""
    WARNING = "warning"  # 警告级别
    ERROR = "error"      # 错误级别


class PluginInstallStatus(str, Enum):
    """插件安装状态枚举"""
    NOT_INSTALLED = "not_installed"  # 未安装
    INSTALLED = "installed"          # 已安装（正常启用）
    DISABLED = "disabled"            # 已禁用（.disabled 后缀）


@dataclass
class Plugin:
    """
    统一的插件数据模型
    
    该模型整合了来自不同数据源（官方 API 和 Manager 数据库）的插件信息
    """
    name: str                              # 插件名称
    description: str                       # 简介
    repository: str                        # GitHub 仓库地址
    version_tag: str                       # 版本标识（tag 或 commit hash）
    updated_at: str                        # 更新时间（ISO 8601 格式，精确到秒）
    node_count: int                        # 节点数量
    is_installed: bool = False             # 是否已安装（兼容旧字段，已安装或已禁用时为 True）
    install_status: str = "not_installed"  # 安装状态：not_installed / installed / disabled
    author: str = ""                       # 作者
    stars: int = 0                         # GitHub stars
    downloads: int = 0                     # 下载次数
    tags: List[str] = field(default_factory=list)  # 标签
    
    def to_dict(self) -> dict:
        """
        转换为字典格式
        
        Returns:
            包含所有字段的字典
        """
        return {
            'name': self.name,
            'description': self.description,
            'repository': self.repository,
            'version_tag': self.version_tag,
            'updated_at': self.updated_at,
            'node_count': self.node_count,
            'is_installed': self.is_installed,
            'install_status': self.install_status,
            'author': self.author,
            'stars': self.stars,
            'downloads': self.downloads,
            'tags': self.tags
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Plugin':
        """
        从字典创建 Plugin 实例
        
        Args:
            data: 包含插件数据的字典
            
        Returns:
            Plugin 实例
        """
        # 辅助函数：安全获取字符串值
        def get_str(key: str, default: str = '') -> str:
            value = data.get(key, default)
            return str(value) if value is not None else default
        
        # 辅助函数：安全获取整数值
        def get_int(key: str, default: int = 0) -> int:
            value = data.get(key, default)
            if value is None:
                return default
            try:
                return int(value)
            except (ValueError, TypeError):
                return default
        
        # 辅助函数：安全获取布尔值
        def get_bool(key: str, default: bool = False) -> bool:
            value = data.get(key, default)
            if value is None:
                return default
            if isinstance(value, bool):
                return value
            # 处理字符串形式的布尔值
            if isinstance(value, str):
                return value.lower() in ('true', '1', 'yes')
            # 处理数字形式的布尔值
            try:
                return bool(int(value))
            except (ValueError, TypeError):
                return default
        
        # 辅助函数：安全获取列表值
        def get_list(key: str) -> list:
            value = data.get(key, [])
            if value is None:
                return []
            if isinstance(value, list):
                return value
            # 如果不是列表，返回空列表
            return []
        
        return cls(
            name=get_str('name'),
            description=get_str('description'),
            repository=get_str('repository'),
            version_tag=get_str('version_tag'),
            updated_at=get_str('updated_at'),
            node_count=get_int('node_count'),
            is_installed=get_bool('is_installed'),
            install_status=get_str('install_status', 'not_installed'),
            author=get_str('author'),
            stars=get_int('stars'),
            downloads=get_int('downloads'),
            tags=get_list('tags')
        )


@dataclass
class Dependency:
    """
    依赖包信息
    
    表示插件所需的 Python 依赖包及其版本要求
    """
    package: str          # 包名
    version_spec: str     # 版本要求（如 ">=1.0.0", "==2.3.4", "~=1.5"）
    
    def __str__(self) -> str:
        """字符串表示"""
        return f"{self.package}{self.version_spec}"
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            'package': self.package,
            'version_spec': self.version_spec
        }


@dataclass
class DependencyConflict:
    """
    依赖冲突信息
    
    表示插件依赖与当前环境已安装包之间的冲突
    """
    package: str                           # 包名
    required_version: str                  # 插件要求的版本
    installed_version: str                 # 已安装的版本
    conflict_type: ConflictType            # 冲突类型
    severity: ConflictSeverity             # 严重程度
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            'package': self.package,
            'required_version': self.required_version,
            'installed_version': self.installed_version,
            'conflict_type': self.conflict_type.value,
            'severity': self.severity.value
        }
    
    def __str__(self) -> str:
        """字符串表示"""
        if self.conflict_type == ConflictType.MISSING:
            return f"{self.package}: 需要 {self.required_version}，但未安装"
        else:
            return f"{self.package}: 需要 {self.required_version}，但已安装 {self.installed_version}"


@dataclass
class InstallTask:
    """
    安装任务信息
    
    跟踪插件安装过程的状态和进度
    """
    task_id: str                           # 任务 ID（唯一标识）
    plugin_name: str                       # 插件名称
    github_url: str                        # GitHub 地址
    stage: InstallStage                    # 当前阶段
    progress: float                        # 进度（0-100）
    current_package: str = ""              # 当前安装的包
    status: InstallStatus = InstallStatus.PENDING  # 状态
    error_message: str = ""                # 错误信息
    log_path: str = ""                     # 日志文件路径
    started_at: Optional[datetime] = None  # 开始时间
    finished_at: Optional[datetime] = None # 完成时间
    
    def to_dict(self) -> dict:
        """
        转换为字典格式
        
        Returns:
            包含所有字段的字典，时间字段转换为 ISO 8601 格式
        """
        return {
            'task_id': self.task_id,
            'plugin_name': self.plugin_name,
            'github_url': self.github_url,
            'stage': self.stage.value,
            'progress': self.progress,
            'current_package': self.current_package,
            'status': self.status.value,
            'error_message': self.error_message,
            'log_path': self.log_path,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'finished_at': self.finished_at.isoformat() if self.finished_at else None
        }
    
    def update_progress(
        self,
        stage: InstallStage,
        progress: float,
        current_package: str = ""
    ) -> None:
        """
        更新任务进度
        
        Args:
            stage: 当前阶段
            progress: 进度百分比（0-100）
            current_package: 当前处理的包名称
        """
        self.stage = stage
        self.progress = min(100.0, max(0.0, progress))  # 确保在 0-100 范围内
        self.current_package = current_package
        
        # 根据阶段自动更新状态
        if stage == InstallStage.SUCCESS:
            self.status = InstallStatus.SUCCESS
            self.finished_at = datetime.now()
        elif stage == InstallStage.FAILED:
            self.status = InstallStatus.FAILED
            self.finished_at = datetime.now()
        else:
            self.status = InstallStatus.RUNNING
    
    def mark_failed(self, error_message: str) -> None:
        """
        标记任务失败
        
        Args:
            error_message: 错误信息
        """
        self.stage = InstallStage.FAILED
        self.status = InstallStatus.FAILED
        self.error_message = error_message
        self.finished_at = datetime.now()
    
    def mark_success(self) -> None:
        """标记任务成功"""
        self.stage = InstallStage.SUCCESS
        self.status = InstallStatus.SUCCESS
        self.progress = 100.0
        self.finished_at = datetime.now()


@dataclass
class PluginMarketplaceConfig:
    """
    插件市场配置
    
    存储插件市场的配置选项
    """
    auto_install_deps: bool = True         # 是否自动安装依赖
    cache_duration: int = 24 * 60 * 60     # 缓存有效期（秒），默认 24 小时
    request_timeout: int = 10              # 网络请求超时时间（秒）
    max_retries: int = 1                   # 最大重试次数
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            'auto_install_deps': self.auto_install_deps,
            'cache_duration': self.cache_duration,
            'request_timeout': self.request_timeout,
            'max_retries': self.max_retries
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'PluginMarketplaceConfig':
        """从字典创建配置实例"""
        # 辅助函数：安全获取布尔值
        def get_bool(key: str, default: bool) -> bool:
            value = data.get(key)
            if value is None:
                return default
            if isinstance(value, bool):
                return value
            # 处理字符串形式的布尔值
            if isinstance(value, str):
                return value.lower() in ('true', '1', 'yes')
            # 处理数字形式的布尔值
            try:
                return bool(int(value)) if int(value) != 0 else False
            except (ValueError, TypeError):
                return default
        
        # 辅助函数：安全获取整数值
        def get_int(key: str, default: int) -> int:
            value = data.get(key)
            if value is None:
                return default
            try:
                return int(value)
            except (ValueError, TypeError):
                return default
        
        return cls(
            auto_install_deps=get_bool('auto_install_deps', True),
            cache_duration=get_int('cache_duration', 24 * 60 * 60),
            request_timeout=get_int('request_timeout', 10),
            max_retries=get_int('max_retries', 1)
        )
