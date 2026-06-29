"""
Type definitions for environment management module.

This module defines the data structures used throughout the environment
management system, including environment configurations, dependency information,
and error codes.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any


class ErrorCode(Enum):
    """Error codes for environment management operations."""
    
    SUCCESS = 0
    PATH_NOT_FOUND = 1001
    INVALID_COMFYUI_INSTALLATION = 1002
    PYTHON_NOT_FOUND = 1003
    VALIDATION_FAILED = 1004
    CONFIG_SAVE_FAILED = 1005
    CONFIG_LOAD_FAILED = 1006
    PERMISSION_DENIED = 1007
    TIMEOUT = 1008
    UNKNOWN_ERROR = 9999


class EnvironmentType(Enum):
    """环境类型枚举"""
    PORTABLE = "portable"           # 便携版 (python_embeded)
    DESKTOP = "desktop"             # Electron 桌面版 (.venv)
    UNKNOWN = "unknown"             # 未知类型


@dataclass
class DependencyInfo:
    """Information about Python dependencies in the environment."""
    
    python: str = ""
    pytorch: str = ""
    cuda: str = ""
    sageattention: str = ""
    flash_attention: str = ""
    triton: str = ""
    xformers: str = ""
    
    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary."""
        return {
            "python": self.python,
            "pytorch": self.pytorch,
            "cuda": self.cuda,
            "sageattention": self.sageattention,
            "flash_attention": self.flash_attention,
            "triton": self.triton,
            "xformers": self.xformers,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, str]) -> "DependencyInfo":
        """Create from dictionary."""
        return cls(
            python=data.get("python", ""),
            pytorch=data.get("pytorch", ""),
            cuda=data.get("cuda", ""),
            sageattention=data.get("sageattention", ""),
            flash_attention=data.get("flash_attention", ""),
            triton=data.get("triton", ""),
            xformers=data.get("xformers", ""),
        )


@dataclass
class VersionInfo:
    """Detailed version information for ComfyUI environment."""
    
    commit_hash: str = ""  # 核心版本:稳定版显示tag,开发版显示短hash(前7位)
    is_dev: bool = False   # 是否为dev标签
    last_updated: str = "" # 版本更新时间戳(ISO格式)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary with camelCase keys for frontend."""
        return {
            "commitHash": self.commit_hash,  # 驼峰命名
            "isDev": self.is_dev,            # 驼峰命名
            "lastUpdated": self.last_updated, # 驼峰命名
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "VersionInfo":
        """Create from dictionary (supports both snake_case and camelCase)."""
        return cls(
            commit_hash=data.get("commit_hash") or data.get("commitHash", ""),
            is_dev=data.get("is_dev") or data.get("isDev", False),
            last_updated=data.get("last_updated") or data.get("lastUpdated", ""),
        )


@dataclass
class GeneralSettings:
    """General environment settings."""
    
    comfyui_path: str = ""
    python_path: str = ""
    pip_path: str = ""
    git_path: str = ""
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "comfyui_path": self.comfyui_path,
            "python_path": self.python_path,
            "pip_path": self.pip_path,
            "git_path": self.git_path,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GeneralSettings":
        """Create from dictionary."""
        return cls(
            comfyui_path=data.get("comfyui_path", ""),
            python_path=data.get("python_path", ""),
            pip_path=data.get("pip_path", ""),
            git_path=data.get("git_path", ""),
        )


@dataclass
class GeekMode:
    """极客模式配置"""
    enabled: bool = False  # 是否启用极客模式
    custom_args: str = ""  # 自定义启动参数（多行文本）
    current_preset_id: str = "custom"  # 当前激活的极客预设ID
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "enabled": self.enabled,
            "custom_args": self.custom_args,
            "current_preset_id": self.current_preset_id,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GeekMode":
        """Create from dictionary (supports both snake_case and camelCase)."""
        return cls(
            enabled=data.get("enabled", False),
            custom_args=data.get("custom_args") or data.get("customArgs", ""),
            current_preset_id=data.get("current_preset_id") or data.get("currentPresetId", "custom"),
        )


@dataclass
class AccelerationSettings:
    """Acceleration settings for ComfyUI."""
    
    vram_mode: str = "auto"
    use_cpu: bool = False
    use_gpu_only: bool = False
    reserve_vram: float = 0
    compute_device: str = ""
    
    geek_mode: Optional[GeekMode] = None
    
    unet_precision: str = "auto"
    vae_precision: str = "auto"
    text_enc_precision: str = "auto"
    
    attention_type: str = "auto"
    disable_xformers: bool = False
    disable_smart_memory: bool = False
    force_channels_last: bool = False
    cache_lru: int = 0
    deterministic: bool = False
    fast_mode: bool = False
    cuda_malloc: str = "auto"
    
    listen: bool = False
    listen_address: str = ""
    port: int = 8188
    enable_cors: bool = False
    tls_keyfile: str = ""
    tls_certfile: str = ""
    
    base_directory: str = ""
    input_directory: str = ""
    output_directory: str = ""
    temp_directory: str = ""
    user_directory: str = ""
    extra_model_paths_config: str = ""
    
    preview_method: str = "auto"
    preview_size: int = 512
    disable_all_custom_nodes: bool = False
    enable_manager: bool = False
    verbose: str = "INFO"
    disable_metadata: bool = False
    
    def __post_init__(self):
        """验证字段值的有效性"""
        self._validate_reserve_vram()
        self._validate_port()
        self._validate_compute_device()
    
    def _validate_reserve_vram(self):
        """验证 reserve_vram 值"""
        if self.reserve_vram < 0:
            raise ValueError("reserve_vram 必须为非负数")
        if self.reserve_vram > 64:
            raise ValueError("reserve_vram 不能超过 64GB")
    
    def _validate_port(self):
        """验证 port 值"""
        if not isinstance(self.port, int):
            raise TypeError("port 必须为整数")
        if self.port < 1 or self.port > 65535:
            raise ValueError("port 必须在 1-65535 范围内")
    
    def _validate_compute_device(self):
        """验证 compute_device 值"""
        if isinstance(self.compute_device, int):
            if self.compute_device < 0:
                raise ValueError("compute_device 索引不能为负数")
        elif isinstance(self.compute_device, str):
            valid_prefixes = ["gpu:", "nvidia:", "intel:", "intel-arc:", "amd:", "cpu", "auto"]
            if not any(self.compute_device.startswith(prefix) for prefix in valid_prefixes):
                if self.compute_device != "":
                    raise ValueError(f"compute_device 格式无效: {self.compute_device}")
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        result = {
            "vram_mode": self.vram_mode,
            "use_cpu": self.use_cpu,
            "use_gpu_only": self.use_gpu_only,
            "reserve_vram": self.reserve_vram,
            "compute_device": self.compute_device,
            "unet_precision": self.unet_precision,
            "vae_precision": self.vae_precision,
            "text_enc_precision": self.text_enc_precision,
            "attention_type": self.attention_type,
            "disable_xformers": self.disable_xformers,
            "disable_smart_memory": self.disable_smart_memory,
            "force_channels_last": self.force_channels_last,
            "cache_lru": self.cache_lru,
            "deterministic": self.deterministic,
            "fast_mode": self.fast_mode,
            "cuda_malloc": self.cuda_malloc,
            "listen": self.listen,
            "listen_address": self.listen_address,
            "port": self.port,
            "enable_cors": self.enable_cors,
            "tls_keyfile": self.tls_keyfile,
            "tls_certfile": self.tls_certfile,
            "base_directory": self.base_directory,
            "input_directory": self.input_directory,
            "output_directory": self.output_directory,
            "temp_directory": self.temp_directory,
            "user_directory": self.user_directory,
            "extra_model_paths_config": self.extra_model_paths_config,
            "preview_method": self.preview_method,
            "preview_size": self.preview_size,
            "disable_all_custom_nodes": self.disable_all_custom_nodes,
            "enable_manager": self.enable_manager,
            "verbose": self.verbose,
            "disable_metadata": self.disable_metadata,
        }
        
        # 添加极客模式配置（总是包含，即使为 None）
        if self.geek_mode:
            # 检查 geek_mode 是否已经是字典
            if isinstance(self.geek_mode, dict):
                result["geek_mode"] = self.geek_mode
            else:
                # 如果是 GeekMode 对象，调用 to_dict()
                result["geek_mode"] = self.geek_mode.to_dict()
        else:
            # 如果没有极客模式配置，返回默认值（包含 current_preset_id）
            result["geek_mode"] = {
                "enabled": False,
                "custom_args": "",
                "current_preset_id": "custom"
            }
        
        return result
    
    @classmethod
    def from_dict(cls, data: Dict) -> "AccelerationSettings":
        """Create from dictionary (supports both snake_case and camelCase)."""
        geek_mode_data = data.get("geek_mode") or data.get("geekMode")
        if geek_mode_data:
            geek_mode = GeekMode.from_dict(geek_mode_data)
        else:
            geek_mode = GeekMode(
                enabled=False,
                custom_args="",
                current_preset_id="custom"
            )
        
        return cls(
            vram_mode=data.get("vram_mode", "auto"),
            use_cpu=data.get("use_cpu", False),
            use_gpu_only=data.get("use_gpu_only", False),
            reserve_vram=data.get("reserve_vram", 0),
            compute_device=data.get("compute_device", ""),
            geek_mode=geek_mode,
            unet_precision=data.get("unet_precision", "auto"),
            vae_precision=data.get("vae_precision", "auto"),
            text_enc_precision=data.get("text_enc_precision", "auto"),
            attention_type=data.get("attention_type", "auto"),
            disable_xformers=data.get("disable_xformers", False),
            disable_smart_memory=data.get("disable_smart_memory", False),
            force_channels_last=data.get("force_channels_last", False),
            cache_lru=data.get("cache_lru", 0),
            deterministic=data.get("deterministic", False),
            fast_mode=data.get("fast_mode", False),
            cuda_malloc=data.get("cuda_malloc", "auto"),
            listen=data.get("listen", False),
            listen_address=data.get("listen_address") or data.get("listenAddress", ""),
            port=data.get("port", 8188),
            enable_cors=data.get("enable_cors", False),
            tls_keyfile=data.get("tls_keyfile", ""),
            tls_certfile=data.get("tls_certfile", ""),
            base_directory=data.get("base_directory", ""),
            input_directory=data.get("input_directory", ""),
            output_directory=data.get("output_directory", ""),
            temp_directory=data.get("temp_directory", ""),
            user_directory=data.get("user_directory", ""),
            extra_model_paths_config=data.get("extra_model_paths_config", ""),
            preview_method=data.get("preview_method", "auto"),
            preview_size=data.get("preview_size", 512),
            disable_all_custom_nodes=data.get("disable_all_custom_nodes", False),
            enable_manager=data.get("enable_manager", False),
            verbose=data.get("verbose", "INFO"),
            disable_metadata=data.get("disable_metadata", False),
        )


@dataclass
class EnvironmentConfig:
    """Complete environment configuration."""
    
    general: GeneralSettings = field(default_factory=GeneralSettings)
    acceleration: AccelerationSettings = field(default_factory=AccelerationSettings)
    folder_shortcuts: List[Dict] = field(default_factory=list)  # 文件夹快捷方式配置
    advanced_env_vars: str = ""  # 高级环境变量配置（多行文本）
    config_version: str = "1.2.0"  # 配置格式版本
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "general": self.general.to_dict(),
            "acceleration": self.acceleration.to_dict(),
            "folder_shortcuts": self.folder_shortcuts,
            "advanced_env_vars": self.advanced_env_vars,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "EnvironmentConfig":
        """Create from dictionary."""
        return cls(
            general=GeneralSettings.from_dict(data.get("general", {})),
            acceleration=AccelerationSettings.from_dict(data.get("acceleration", {})),
            folder_shortcuts=data.get("folder_shortcuts", []),
            advanced_env_vars=data.get("advanced_env_vars") or "",  # 向后兼容：None 或缺失时使用空字符串
        )


@dataclass
class Environment:
    """Represents a ComfyUI environment."""
    
    id: str
    name: str
    alias: str  # 环境别名，用于显示
    path: str
    version: str = ""  # ComfyUI 版本号（独立字段，不可修改）
    version_info: VersionInfo = field(default_factory=VersionInfo)  # 版本详细信息
    config: EnvironmentConfig = field(default_factory=EnvironmentConfig)
    is_default: bool = False
    dependencies: DependencyInfo = field(default_factory=DependencyInfo)  # 依赖信息（持久化）
    model_path_configs: List["ModelPathConfig"] = field(default_factory=list)  # 模型路径配置列表
    env_type: str = "portable"  # 环境类型: portable, desktop, unknown
    desktop_data_path: str = ""  # 桌面版数据目录（仅桌面版有效）
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "alias": self.alias,
            "path": self.path,
            "version": self.version,  # 序列化版本号
            "versionInfo": self.version_info.to_dict(),  # 序列化版本详细信息（使用camelCase）
            "config": self.config.to_dict(),
            "is_default": self.is_default,
            "dependencies": self.dependencies.to_dict(),  # 序列化依赖信息
            "model_path_configs": [cfg.to_dict() for cfg in self.model_path_configs],
            "envType": self.env_type,  # 序列化环境类型 (camelCase)
            "desktopDataPath": self.desktop_data_path,  # 序列化桌面版数据目录 (camelCase)
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "Environment":
        """Create from dictionary."""
        # 导入 ModelPathConfig（避免循环导入）
        model_path_configs_data = data.get("model_path_configs", [])
        model_path_configs = [ModelPathConfig.from_dict(cfg) for cfg in model_path_configs_data]
        
        # 加载依赖信息
        dependencies_data = data.get("dependencies", {})
        dependencies = DependencyInfo.from_dict(dependencies_data) if dependencies_data else DependencyInfo()
        
        # 加载版本详细信息
        version_info_data = data.get("versionInfo", {})
        version_info = VersionInfo.from_dict(version_info_data) if version_info_data else VersionInfo()
        
        return cls(
            id=data["id"],
            name=data["name"],
            alias=data.get("alias", data["name"]),  # 如果没有alias，使用name
            path=data["path"],
            version=data.get("version", ""),  # 加载版本号
            version_info=version_info,  # 加载版本详细信息
            config=EnvironmentConfig.from_dict(data.get("config", {})),
            is_default=data.get("is_default", False),
            dependencies=dependencies,  # 加载依赖信息
            model_path_configs=model_path_configs,
            env_type=data.get("env_type") or data.get("envType", "portable"),  # 支持 camelCase 和 snake_case
            desktop_data_path=data.get("desktop_data_path") or data.get("desktopDataPath", ""),  # 支持 camelCase 和 snake_case
            created_at=data.get("created_at", datetime.now().isoformat()),
            updated_at=data.get("updated_at", datetime.now().isoformat()),
        )


@dataclass
class EnvironmentInfo:
    """Information about a scanned environment."""
    
    is_valid: bool
    python_version: str = ""
    comfyui_version: str = ""
    dependencies: DependencyInfo = field(default_factory=DependencyInfo)
    available_gpus: List[int] = field(default_factory=list)
    error_message: str = ""
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "is_valid": self.is_valid,
            "python_version": self.python_version,
            "comfyui_version": self.comfyui_version,
            "dependencies": self.dependencies.to_dict(),
            "available_gpus": self.available_gpus,
            "error_message": self.error_message,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "EnvironmentInfo":
        """Create from dictionary."""
        return cls(
            is_valid=data.get("is_valid", False),
            python_version=data.get("python_version", ""),
            comfyui_version=data.get("comfyui_version", ""),
            dependencies=DependencyInfo.from_dict(data.get("dependencies", {})),
            available_gpus=data.get("available_gpus", []),
            error_message=data.get("error_message", ""),
        )


@dataclass
class PresetConfig:
    """预设方案配置"""
    id: str  # 预设方案 ID：flux, flagship, legacy, custom
    name: str  # 显示名称
    description: str  # 描述信息
    vram_requirement: str  # 显存要求：如 "8GB+", "12GB+", "4GB+"
    config: Dict[str, Any]  # 配置项字典
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "vram_requirement": self.vram_requirement,
            "config": self.config,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "PresetConfig":
        """Create from dictionary."""
        return cls(
            id=data["id"],
            name=data["name"],
            description=data["description"],
            vram_requirement=data["vram_requirement"],
            config=data["config"],
        )


@dataclass
class ModelPathConfig:
    """模型路径配置"""
    name: str  # 配置名称（唯一）
    base_path: str  # 基础路径
    is_default: bool  # 是否为默认配置
    paths: Dict[str, str]  # 模型类型到路径的映射
    
    # 支持的模型类型
    SUPPORTED_TYPES = [
        "checkpoints", "clip", "clip_vision", "configs",
        "controlnet", "diffusion_models", "embeddings", "loras",
        "upscale_models", "vae", "gligen", "hypernetworks", "custom_nodes",
        "style_models", "diffusers", "vae_approx", "t2i_adapter",
        "latent_upscale_models", "photomaker", "classifiers",
        "model_patches", "audio_encoders", "frame_interpolation",
    ]
    
    def to_dict(self) -> Dict:
        """Convert to dictionary with camelCase keys for frontend."""
        return {
            "name": self.name,
            "basePath": self.base_path,
            "isDefault": self.is_default,
            "paths": self.paths,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "ModelPathConfig":
        """Create from dictionary."""
        return cls(
            name=data["name"],
            base_path=data.get("base_path", data.get("basePath", "")),
            is_default=data.get("is_default", data.get("isDefault", False)),
            paths=data.get("paths", {}),
        )


@dataclass
class PyTorchBackend:
    """PyTorch 后端信息"""
    backend: str = "unknown"
    torch_version: str = ""
    cuda_available: bool = False
    xpu_available: bool = False
    ipex_installed: bool = False
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "backend": self.backend,
            "torchVersion": self.torch_version,
            "cudaAvailable": self.cuda_available,
            "xpuAvailable": self.xpu_available,
            "ipexInstalled": self.ipex_installed,
            "error": self.error,
        }


@dataclass
class ComputeDevice:
    """计算设备信息"""
    index: int
    name: str
    type: str
    driver: str
    memory: Optional[int] = None
    compatible: bool = True
    incompatibility_reason: str = ""

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "index": self.index,
            "name": self.name,
            "type": self.type,
            "driver": self.driver,
            "memory": self.memory,
            "compatible": self.compatible,
            "incompatibilityReason": self.incompatibility_reason,
        }
