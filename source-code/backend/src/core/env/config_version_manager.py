"""
配置版本管理器

负责处理配置格式的版本升级和兼容性管理。
支持配置格式的向后兼容和平滑升级。
"""

from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from collections import OrderedDict


class ConfigVersion:
    """配置版本定义"""
    
    def __init__(
        self,
        version: str,
        description: str,
        release_date: str,
        schema: Dict[str, Any],
        migration_func: Optional[Callable] = None
    ):
        """
        初始化配置版本
        
        Args:
            version: 版本号（如 "1.0.0"）
            description: 版本描述
            release_date: 发布日期（ISO格式）
            schema: 配置结构定义
            migration_func: 从上一版本迁移的函数
        """
        self.version = version
        self.description = description
        self.release_date = release_date
        self.schema = schema
        self.migration_func = migration_func


class ConfigVersionManager:
    """配置版本管理器"""
    
    # 当前配置格式版本
    CURRENT_VERSION = "1.2.0"
    
    # 所有支持的版本
    SUPPORTED_VERSIONS: List[str] = ["1.0.0", "1.1.0", "1.2.0"]
    
    # 版本注册表
    _versions: OrderedDict[str, ConfigVersion] = OrderedDict()
    
    @classmethod
    def register_version(cls, version: ConfigVersion):
        """注册一个配置版本"""
        cls._versions[version.version] = version
    
    @classmethod
    def get_version(cls, version: str) -> Optional[ConfigVersion]:
        """获取指定版本的定义"""
        return cls._versions.get(version)
    
    @classmethod
    def get_current_version(cls) -> ConfigVersion:
        """获取当前版本"""
        return cls._versions.get(cls.CURRENT_VERSION)
    
    @classmethod
    def is_version_supported(cls, version: str) -> bool:
        """检查版本是否受支持"""
        return version in cls.SUPPORTED_VERSIONS
    
    @classmethod
    def compare_versions(cls, v1: str, v2: str) -> int:
        """
        比较两个版本号
        
        Args:
            v1: 版本号1
            v2: 版本号2
            
        Returns:
            -1 如果 v1 < v2
            0 如果 v1 == v2
            1 如果 v1 > v2
        """
        def parse_version(v):
            return [int(x) for x in v.split('.')]
        
        v1_parts = parse_version(v1)
        v2_parts = parse_version(v2)
        
        for a, b in zip(v1_parts, v2_parts):
            if a < b:
                return -1
            elif a > b:
                return 1
        
        if len(v1_parts) < len(v2_parts):
            return -1
        elif len(v1_parts) > len(v2_parts):
            return 1
        
        return 0
    
    @classmethod
    def migrate_config(
        cls,
        config: Dict[str, Any],
        from_version: Optional[str] = None,
        to_version: Optional[str] = None
    ) -> tuple[Dict[str, Any], List[str]]:
        """
        迁移配置到目标版本
        
        Args:
            config: 要迁移的配置
            from_version: 源版本（如果不提供，从配置中读取）
            to_version: 目标版本（默认为当前版本）
            
        Returns:
            (迁移后的配置, 迁移日志列表)
        """
        migration_logs = []
        
        # 确定源版本
        if from_version is None:
            from_version = config.get('config_version', '1.0.0')
        
        # 确定目标版本
        if to_version is None:
            to_version = cls.CURRENT_VERSION
        
        # 检查版本是否受支持
        if not cls.is_version_supported(from_version):
            raise ValueError(f"不支持的配置版本: {from_version}")
        
        if not cls.is_version_supported(to_version):
            raise ValueError(f"不支持的目标版本: {to_version}")
        
        # 如果已经是目标版本，直接返回
        if from_version == to_version:
            migration_logs.append(f"配置已是版本 {to_version}，无需迁移")
            config['config_version'] = to_version
            return config, migration_logs
        
        # 按顺序迁移
        current_version = from_version
        sorted_versions = sorted(cls.SUPPORTED_VERSIONS, key=lambda v: [int(x) for x in v.split('.')])
        
        for version in sorted_versions:
            if cls.compare_versions(version, current_version) <= 0:
                continue  # 跳过当前版本及之前的版本
            
            if cls.compare_versions(version, to_version) > 0:
                break  # 超过目标版本，停止迁移
            
            # 获取版本定义
            version_info = cls.get_version(version)
            if version_info and version_info.migration_func:
                try:
                    config = version_info.migration_func(config)
                    migration_logs.append(f"成功迁移到版本 {version}: {version_info.description}")
                    current_version = version
                except Exception as e:
                    migration_logs.append(f"迁移到版本 {version} 失败: {str(e)}")
                    raise
        
        # 更新配置版本号
        config['config_version'] = to_version
        migration_logs.append(f"配置迁移完成: {from_version} -> {to_version}")
        
        return config, migration_logs
    
    @classmethod
    def detect_config_version(cls, config: Dict[str, Any]) -> str:
        """
        自动检测配置的版本
        
        Args:
            config: 配置字典
            
        Returns:
            检测到的版本号
        """
        # 优先使用配置中的版本号
        if 'config_version' in config:
            return config['config_version']
        
        # 根据配置特征推断版本
        # 1.2.0: 包含 enable_manager 和 disable_metadata
        if 'acceleration' in config and isinstance(config['acceleration'], dict):
            acc = config['acceleration']
            if 'enable_manager' in acc or 'disable_metadata' in acc:
                return '1.2.0'
        
        # 1.1.0: 包含 cache_lru, deterministic, fast_mode
        if 'acceleration' in config and isinstance(config['acceleration'], dict):
            acc = config['acceleration']
            if 'cache_lru' in acc or 'deterministic' in acc or 'fast_mode' in acc:
                return '1.1.0'
        
        # 默认为 1.0.0
        return '1.0.0'
    
    @classmethod
    def upgrade_to_latest(cls, config: Dict[str, Any]) -> tuple[Dict[str, Any], List[str]]:
        """
        升级配置到最新版本
        
        Args:
            config: 要升级的配置
            
        Returns:
            (升级后的配置, 升级日志列表)
        """
        current_version = cls.detect_config_version(config)
        return cls.migrate_config(config, current_version, cls.CURRENT_VERSION)
    
    @classmethod
    def get_schema(cls, version: Optional[str] = None) -> Dict[str, Any]:
        """
        获取指定版本的配置结构定义
        
        Args:
            version: 版本号（默认为当前版本）
            
        Returns:
            配置结构定义
        """
        if version is None:
            version = cls.CURRENT_VERSION
        
        version_info = cls.get_version(version)
        return version_info.schema if version_info else {}


# ==================== 迁移函数定义 ====================

def migrate_to_1_1_0(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    从 1.0.0 迁移到 1.1.0
    
    新增字段:
    - cache_lru: LRU 缓存大小
    - deterministic: 确定性模式
    - fast_mode: 快速模式
    - preview_size: 预览大小
    """
    from .config_transformer import ConfigTransformer
    
    # 转换为 snake_case（确保字段名一致）
    config = ConfigTransformer.frontend_to_backend(config)
    
    if 'acceleration' in config and isinstance(config['acceleration'], dict):
        acc = config['acceleration']
        
        # 添加新字段（使用默认值）
        if 'cache_lru' not in acc:
            acc['cache_lru'] = 0
        
        if 'deterministic' not in acc:
            acc['deterministic'] = False
        
        if 'fast_mode' not in acc:
            acc['fast_mode'] = False
        
        if 'preview_size' not in acc:
            acc['preview_size'] = 512
    
    return config


def migrate_to_1_2_0(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    从 1.1.0 迁移到 1.2.0
    
    新增字段:
    - enable_manager: 启用 ComfyUI-Manager
    - disable_metadata: 禁用元数据保存
    
    字段变更:
    - safeMode -> disable_all_custom_nodes
    """
    from .config_transformer import ConfigTransformer
    
    # 转换为 snake_case（确保字段名一致）
    config = ConfigTransformer.frontend_to_backend(config)
    
    if 'acceleration' in config and isinstance(config['acceleration'], dict):
        acc = config['acceleration']
        
        # 添加新字段（使用默认值）
        if 'enable_manager' not in acc:
            acc['enable_manager'] = False
        
        if 'disable_metadata' not in acc:
            acc['disable_metadata'] = False
    
    if 'general' in config and isinstance(config['general'], dict):
        gen = config['general']
        
        # 添加 git_path 字段
        if 'git_path' not in gen:
            gen['git_path'] = ''
    
    return config


# ==================== 注册版本 ====================

# 注册 1.0.0 版本（初始版本）
ConfigVersionManager.register_version(ConfigVersion(
    version="1.0.0",
    description="初始版本，包含基本的 ComfyUI 配置",
    release_date="2024-01-01",
    schema={
        "version": "1.0.0",
        "fields": {
            "vram_mode": {"type": "string", "default": "normal"},
            "use_cpu": {"type": "boolean", "default": False},
            "use_gpu_only": {"type": "boolean", "default": False},
            "unet_precision": {"type": "string", "default": "auto"},
            "vae_precision": {"type": "string", "default": "fp32"},
            "text_enc_precision": {"type": "string", "default": "fp16"},
            "attention_type": {"type": "string", "default": "flash"},
            # ... 其他字段
        }
    }
))

# 注册 1.1.0 版本
ConfigVersionManager.register_version(ConfigVersion(
    version="1.1.0",
    description="新增 LRU 缓存、确定性模式和快速模式",
    release_date="2024-06-01",
    schema={
        "version": "1.1.0",
        "new_fields": [
            "cache_lru",
            "deterministic",
            "fast_mode",
            "preview_size"
        ]
    },
    migration_func=migrate_to_1_1_0
))

# 注册 1.2.0 版本（当前版本）
ConfigVersionManager.register_version(ConfigVersion(
    version="1.2.0",
    description="新增 Manager 支持和元数据控制",
    release_date="2025-01-28",
    schema={
        "version": "1.2.0",
        "new_fields": [
            "enable_manager",
            "disable_metadata"
        ],
        "field_changes": [
            {"old": "safeMode", "new": "disable_all_custom_nodes"}
        ]
    },
    migration_func=migrate_to_1_2_0
))


# ==================== 便捷函数 ====================

def ensure_latest_version(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    确保配置是最新版本
    
    Args:
        config: 配置字典
        
    Returns:
        最新版本的配置
    """
    config, logs = ConfigVersionManager.upgrade_to_latest(config)
    return config


def get_config_version_info() -> Dict[str, Any]:
    """
    获取配置版本信息
    
    Returns:
        版本信息字典
    """
    return {
        "current_version": ConfigVersionManager.CURRENT_VERSION,
        "supported_versions": ConfigVersionManager.SUPPORTED_VERSIONS,
        "versions": [
            {
                "version": v.version,
                "description": v.description,
                "release_date": v.release_date
            }
            for v in ConfigVersionManager._versions.values()
        ]
    }
