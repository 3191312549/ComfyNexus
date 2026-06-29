"""
配置转换层

负责前后端配置格式的自动转换，处理 snake_case 和 camelCase 之间的映射。
"""

from typing import Dict, Any, TypeVar, get_type_hints
from copy import deepcopy

T = TypeVar('T')


class ConfigTransformer:
    """配置转换器"""
    
    # 前端 camelCase -> 后端 snake_case 映射
    FRONTEND_TO_BACKEND = {
        # VRAM 策略
        "vramStrategy": "vram_mode",
        "cpuOnly": "use_cpu",
        "gpuOnly": "use_gpu_only",
        "reserveVram": "reserve_vram",
        "computeDevice": "compute_device",
        "currentPresetId": "current_preset_id",
        
        # 极客模式
        "geekMode": "geek_mode",
        "customArgs": "custom_args",
        
        # 模型精度
        "unetPrecision": "unet_precision",
        "vaePrecision": "vae_precision",
        "textEncPrecision": "text_enc_precision",
        
        # 性能优化
        "attentionMode": "attention_type",
        "disableXformers": "disable_xformers",
        "disableSmartMemory": "disable_smart_memory",
        "forceChannelsLast": "force_channels_last",
        "cacheLru": "cache_lru",
        "deterministic": "deterministic",
        "fastMode": "fast_mode",
        "cudaMalloc": "cuda_malloc",
        
        # 网络服务
        "listenNetwork": "listen",
        "enableCors": "enable_cors",
        "tlsKeyfile": "tls_keyfile",
        "tlsCertfile": "tls_certfile",
        
        # 路径配置
        "baseDirectory": "base_directory",
        "inputDirectory": "input_directory",
        "outputDirectory": "output_directory",
        "tempDirectory": "temp_directory",
        "userDirectory": "user_directory",
        "extraModelPathsConfig": "extra_model_paths_config",
        
        # 辅助功能
        "previewMethod": "preview_method",
        "previewSize": "preview_size",
        "safeMode": "disable_all_custom_nodes",
        "enableManager": "enable_manager",
        "logLevel": "verbose",
        "disableMetadata": "disable_metadata",
        
        # 通用配置
        "comfyuiPath": "comfyui_path",
        "pythonPath": "python_path",
        "pipPath": "pip_path",
        "gitPath": "git_path",
        
        # 依赖信息
        "pythonVersion": "python",
        "pytorchVersion": "pytorch",
        "cudaVersion": "cuda",
        "sageAttentionVersion": "sageattention",
        "flashAttnVersion": "flash_attention",
        "tritonVersion": "triton",
        "xformersVersion": "xformers",
    }
    
    # 后端 snake_case -> 前端 camelCase 映射（反向映射）
    BACKEND_TO_FRONTEND = {v: k for k, v in FRONTEND_TO_BACKEND.items()}
    
    @classmethod
    def frontend_to_backend(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        将前端配置（camelCase）转换为后端配置（snake_case）
        
        Args:
            data: 前端配置字典
            
        Returns:
            转换后的后端配置字典
        """
        if not data:
            return {}
        
        transformed = {}
        for key, value in data.items():
            # 查找映射，如果没有映射则保持原样
            backend_key = cls.FRONTEND_TO_BACKEND.get(key, key)
            
            # 如果值是字典，递归转换
            if isinstance(value, dict):
                transformed[backend_key] = cls.frontend_to_backend(value)
            # 如果值是列表，且列表元素是字典，递归转换
            elif isinstance(value, list):
                transformed[backend_key] = [
                    cls.frontend_to_backend(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                transformed[backend_key] = value
        
        return transformed
    
    @classmethod
    def backend_to_frontend(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        将后端配置（snake_case）转换为前端配置（camelCase）
        
        Args:
            data: 后端配置字典
            
        Returns:
            转换后的前端配置字典
        """
        if not data:
            return {}
        
        transformed = {}
        for key, value in data.items():
            # 查找映射，如果没有映射则保持原样
            frontend_key = cls.BACKEND_TO_FRONTEND.get(key, key)
            
            # 如果值是字典，递归转换
            if isinstance(value, dict):
                transformed[frontend_key] = cls.backend_to_frontend(value)
            # 如果值是列表，且列表元素是字典，递归转换
            elif isinstance(value, list):
                transformed[frontend_key] = [
                    cls.backend_to_frontend(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                transformed[frontend_key] = value
        
        return transformed
    
    @classmethod
    def transform_list_to_backend(cls, data_list: list) -> list:
        """
        转换列表中的字典配置
        
        Args:
            data_list: 包含字典的列表
            
        Returns:
            转换后的列表
        """
        return [
            cls.frontend_to_backend(item) if isinstance(item, dict) else item
            for item in data_list
        ]
    
    @classmethod
    def transform_list_to_frontend(cls, data_list: list) -> list:
        """
        转换列表中的字典配置
        
        Args:
            data_list: 包含字典的列表
            
        Returns:
            转换后的列表
        """
        return [
            cls.backend_to_frontend(item) if isinstance(item, dict) else item
            for item in data_list
        ]
    
    @staticmethod
    def to_snake_case(camel_str: str) -> str:
        """
        将 camelCase 转换为 snake_case
        
        Args:
            camel_str: camelCase 字符串
            
        Returns:
            snake_case 字符串
        """
        import re
        # 在大写字母前插入下划线
        snake_str = re.sub('([A-Z])', r'_\1', camel_str)
        # 转换为小写并去掉开头的下划线
        return snake_str.lower().lstrip('_')
    
    @staticmethod
    def to_camel_case(snake_str: str) -> str:
        """
        将 snake_case 转换为 camelCase
        
        Args:
            snake_str: snake_case 字符串
            
        Returns:
            camelCase 字符串
        """
        components = snake_str.split('_')
        # 第一个单词小写，其余单词首字母大写
        return components[0] + ''.join(x.title() for x in components[1:])
    
    @classmethod
    def auto_transform_to_backend(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        自动将 camelCase 转换为 snake_case（不使用预定义映射）
        
        Args:
            data: 前端配置字典
            
        Returns:
            转换后的后端配置字典
        """
        if not data:
            return {}
        
        transformed = {}
        for key, value in data.items():
            snake_key = cls.to_snake_case(key)
            
            if isinstance(value, dict):
                transformed[snake_key] = cls.auto_transform_to_backend(value)
            elif isinstance(value, list):
                transformed[snake_key] = [
                    cls.auto_transform_to_backend(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                transformed[snake_key] = value
        
        return transformed
    
    @classmethod
    def auto_transform_to_frontend(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        自动将 snake_case 转换为 camelCase（不使用预定义映射）
        
        Args:
            data: 后端配置字典
            
        Returns:
            转换后的前端配置字典
        """
        if not data:
            return {}
        
        transformed = {}
        for key, value in data.items():
            camel_key = cls.to_camel_case(key)
            
            if isinstance(value, dict):
                transformed[camel_key] = cls.auto_transform_to_frontend(value)
            elif isinstance(value, list):
                transformed[camel_key] = [
                    cls.auto_transform_to_frontend(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                transformed[camel_key] = value
        
        return transformed
