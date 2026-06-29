"""
配置验证器

负责验证配置的完整性、正确性和一致性，确保前后端配置一致。
"""

from typing import Dict, Any, List, Optional, Tuple, Set, Union
from dataclasses import dataclass
from enum import Enum


class ValidationResult:
    """验证结果"""
    
    def __init__(self, is_valid: bool = True, errors: List[str] = None, warnings: List[str] = None):
        self.is_valid = is_valid
        self.errors = errors or []
        self.warnings = warnings or []
    
    def add_error(self, error: str):
        """添加错误"""
        self.errors.append(error)
        self.is_valid = False
    
    def add_warning(self, warning: str):
        """添加警告"""
        self.warnings.append(warning)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "is_valid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings
        }


class ConfigValidator:
    """配置验证器"""
    
    # 加速配置的有效值范围
    VRAM_MODES = {'normal', 'low', 'high', 'no'}
    COMPUTE_DEVICE_PREFIXES = ['gpu:', 'nvidia:', 'intel:', 'intel-arc:', 'amd:', 'auto']
    UNET_PRECISIONS = {'auto', 'fp16', 'bf16', 'fp8_e4m3fn', 'fp8_e5m2', 'fp32'}
    VAE_PRECISIONS = {'fp32', 'fp16', 'cpu'}
    TEXT_ENCODER_PRECISIONS = {'fp8_e4m3fn', 'fp16'}
    ATTENTION_TYPES = {'auto', 'flash', 'sage', 'sage3', 'split', 'pytorch', 'quad'}
    PREVIEW_METHODS = {'auto', 'taesd', 'latent2rgb', 'none'}
    LOG_LEVELS = {'DEBUG', 'INFO'}
    PORT_RANGE = (1024, 65535)
    
    # 必需字段
    REQUIRED_ACCELERATION_FIELDS = {
        'vram_mode',
        'use_cpu',
        'use_gpu_only',
        'unet_precision',
        'vae_precision',
        'attention_type'
    }
    
    @classmethod
    def validate_acceleration_config(cls, config: Dict[str, Any]) -> ValidationResult:
        """
        验证加速配置
        
        Args:
            config: 加速配置字典
            
        Returns:
            验证结果
        """
        result = ValidationResult()
        
        if not config:
            result.add_error("配置为空")
            return result
        
        # 检查必需字段
        missing_fields = cls.REQUIRED_ACCELERATION_FIELDS - set(config.keys())
        if missing_fields:
            result.add_error(f"缺少必需字段: {', '.join(missing_fields)}")
        
        # 验证 VRAM 模式
        if 'vram_mode' in config:
            vram_mode = config['vram_mode']
            if vram_mode not in cls.VRAM_MODES:
                result.add_error(f"无效的 vram_mode: {vram_mode}，有效值为: {cls.VRAM_MODES}")
        
        # 验证计算设备
        if 'compute_device' in config:
            compute_device = config['compute_device']
            if isinstance(compute_device, str):
                is_valid = (
                    compute_device == "cpu" or
                    any(compute_device.startswith(prefix) for prefix in cls.COMPUTE_DEVICE_PREFIXES)
                )
                if not is_valid and compute_device != "":
                    result.add_error(f"无效的 compute_device: {compute_device}，有效格式为: cpu, auto, nvidia:N, amd:N, intel:N, intel-arc:N")
            elif isinstance(compute_device, int):
                if compute_device < 0:
                    result.add_error(f"compute_device 索引不能为负数: {compute_device}")
        
        # 验证 UNet 精度
        if 'unet_precision' in config:
            unet_precision = config['unet_precision']
            if unet_precision not in cls.UNET_PRECISIONS:
                result.add_error(f"无效的 unet_precision: {unet_precision}，有效值为: {cls.UNET_PRECISIONS}")
        
        # 验证 VAE 精度
        if 'vae_precision' in config:
            vae_precision = config['vae_precision']
            if vae_precision not in cls.VAE_PRECISIONS:
                result.add_error(f"无效的 vae_precision: {vae_precision}，有效值为: {cls.VAE_PRECISIONS}")
        
        # 验证文本编码器精度
        if 'text_enc_precision' in config:
            text_enc_precision = config['text_enc_precision']
            if text_enc_precision not in cls.TEXT_ENCODER_PRECISIONS:
                result.add_error(f"无效的 text_enc_precision: {text_enc_precision}，有效值为: {cls.TEXT_ENCODER_PRECISIONS}")
        
        # 验证注意力类型
        if 'attention_type' in config:
            attention_type = config['attention_type']
            if attention_type not in cls.ATTENTION_TYPES:
                result.add_error(f"无效的 attention_type: {attention_type}，有效值为: {cls.ATTENTION_TYPES}")
        
        # 验证预览方法
        if 'preview_method' in config:
            preview_method = config['preview_method']
            if preview_method not in cls.PREVIEW_METHODS:
                result.add_error(f"无效的 preview_method: {preview_method}，有效值为: {cls.PREVIEW_METHODS}")
        
        # 验证日志级别
        if 'verbose' in config:
            verbose = config['verbose']
            if verbose not in cls.LOG_LEVELS:
                result.add_error(f"无效的 log_level: {verbose}，有效值为: {cls.LOG_LEVELS}")
        
        # 验证端口
        if 'port' in config:
            port = config['port']
            if not isinstance(port, int):
                result.add_error(f"port 必须是整数，当前值: {port} (类型: {type(port)})")
            elif not (cls.PORT_RANGE[0] <= port <= cls.PORT_RANGE[1]):
                result.add_error(f"port 值超出范围: {port}，有效范围: {cls.PORT_RANGE}")
        
        # 验证显存预留
        if 'reserve_vram' in config:
            reserve_vram = config['reserve_vram']
            if not isinstance(reserve_vram, (int, float)):
                result.add_error(f"reserve_vram 必须是数字，当前值: {reserve_vram} (类型: {type(reserve_vram)})")
            elif reserve_vram < 0:
                result.add_warning(f"reserve_vram 值为负数: {reserve_vram}，可能不符合预期")
        
        # 验证预览大小
        if 'preview_size' in config:
            preview_size = config['preview_size']
            if not isinstance(preview_size, int):
                result.add_error(f"preview_size 必须是整数，当前值: {preview_size} (类型: {type(preview_size)})")
            elif preview_size < 0:
                result.add_warning(f"preview_size 值为负数: {preview_size}，可能不符合预期")
        
        # 验证 LRU 缓存
        if 'cache_lru' in config:
            cache_lru = config['cache_lru']
            if not isinstance(cache_lru, int):
                result.add_error(f"cache_lru 必须是整数，当前值: {cache_lru} (类型: {type(cache_lru)})")
            elif cache_lru < 0:
                result.add_warning(f"cache_lru 值为负数: {cache_lru}，可能不符合预期")
        
        # 验证布尔值字段
        boolean_fields = [
            'use_cpu', 'use_gpu_only', 'disable_xformers', 'disable_smart_memory',
            'force_channels_last', 'deterministic', 'fast_mode', 'listen',
            'enable_cors', 'disable_all_custom_nodes',
            'enable_manager', 'disable_metadata'
        ]
        for field in boolean_fields:
            if field in config and not isinstance(config[field], bool):
                result.add_error(f"{field} 必须是布尔值，当前值: {config[field]} (类型: {type(config[field])})")
        
        # 检查冲突配置
        cls._check_conflicting_configs(config, result)
        
        return result
    
    @classmethod
    def _check_conflicting_configs(cls, config: Dict[str, Any], result: ValidationResult):
        """检查冲突的配置"""
        
        # CPU 和 GPU 不能同时启用
        if config.get('use_cpu') and config.get('use_gpu_only'):
            result.add_warning("同时启用了 CPU 和 GPU Only，可能存在配置冲突")
        
        # 安全模式下不应该启用管理器
        if config.get('disable_all_custom_nodes') and config.get('enable_manager'):
            result.add_warning("安全模式禁用了所有自定义节点，但启用了管理器，可能存在冲突")
        
        # 显存策略与 GPU Only 冲突检测
        vram_mode = config.get('vram_mode')
        if config.get('use_gpu_only'):
            if vram_mode == 'no':
                result.add_error("无显存模式(--novram)与仅使用GPU(--gpu-only)完全冲突，无法同时启用")
            elif vram_mode == 'low':
                result.add_error("低显存模式(--lowvram)与仅使用GPU(--gpu-only)语义矛盾，无法同时启用")
            elif vram_mode == 'high':
                result.add_warning("高显存模式(--highvram)与仅使用GPU(--gpu-only)语义重叠，--gpu-only 已隐含高显存行为")
        
        # 高显存模式不应该使用 CPU
        if vram_mode == 'high' and config.get('use_cpu'):
            result.add_warning("高显存模式使用 CPU 可能不符合预期")
    
    @classmethod
    def validate_general_config(cls, config: Dict[str, Any]) -> ValidationResult:
        """
        验证通用配置
        
        Args:
            config: 通用配置字典
            
        Returns:
            验证结果
        """
        result = ValidationResult()
        
        if not config:
            result.add_error("配置为空")
            return result
        
        # 检查必需字段
        required_fields = {'comfyui_path', 'python_path', 'pip_path'}
        missing_fields = required_fields - set(config.keys())
        if missing_fields:
            result.add_error(f"缺少必需字段: {', '.join(missing_fields)}")
        
        # 验证路径字段是否为字符串
        path_fields = ['comfyui_path', 'python_path', 'pip_path', 'git_path']
        for field in path_fields:
            if field in config and config[field] and not isinstance(config[field], str):
                result.add_error(f"{field} 必须是字符串，当前值: {config[field]} (类型: {type(config[field])})")
        
        return result
    
    @classmethod
    def validate_environment_config(cls, config: Dict[str, Any]) -> ValidationResult:
        """
        验证完整的环境配置
        
        Args:
            config: 环境配置字典
            
        Returns:
            验证结果
        """
        result = ValidationResult()
        
        if not config:
            result.add_error("配置为空")
            return result
        
        # 检查必需字段
        required_fields = {'id', 'name', 'alias', 'path'}
        missing_fields = required_fields - set(config.keys())
        if missing_fields:
            result.add_error(f"缺少必需字段: {', '.join(missing_fields)}")
        
        # 验证通用配置
        if 'general' in config:
            general_result = cls.validate_general_config(config['general'])
            if not general_result.is_valid:
                result.errors.extend([f"通用配置错误: {err}" for err in general_result.errors])
            if general_result.warnings:
                result.warnings.extend([f"通用配置警告: {warn}" for warn in general_result.warnings])
        
        # 验证加速配置
        if 'acceleration' in config:
            acceleration_result = cls.validate_acceleration_config(config['acceleration'])
            if not acceleration_result.is_valid:
                result.errors.extend([f"加速配置错误: {err}" for err in acceleration_result.errors])
            if acceleration_result.warnings:
                result.warnings.extend([f"加速配置警告: {warn}" for warn in acceleration_result.warnings])
        
        return result
    
    @classmethod
    def validate_preset_config(cls, config: Dict[str, Any]) -> ValidationResult:
        """
        验证预设配置
        
        Args:
            config: 预设配置字典
            
        Returns:
            验证结果
        """
        result = ValidationResult()
        
        if not config:
            result.add_error("预设配置为空")
            return result
        
        # 检查必需字段
        required_fields = {'id', 'name', 'description', 'config'}
        missing_fields = required_fields - set(config.keys())
        if missing_fields:
            result.add_error(f"缺少必需字段: {', '.join(missing_fields)}")
        
        # 验证配置部分
        if 'config' in config and isinstance(config['config'], dict):
            config_result = cls.validate_acceleration_config(config['config'])
            if not config_result.is_valid:
                result.errors.extend([f"配置错误: {err}" for err in config_result.errors])
            if config_result.warnings:
                result.warnings.extend([f"配置警告: {warn}" for warn in config_result.warnings])
        
        return result
    
    @classmethod
    def get_missing_fields(
        cls, 
        config: Dict[str, Any], 
        expected_fields: Set[str]
    ) -> Set[str]:
        """
        获取缺失的字段
        
        Args:
            config: 配置字典
            expected_fields: 期望的字段集合
            
        Returns:
            缺失的字段集合
        """
        return expected_fields - set(config.keys())
    
    @classmethod
    def get_unknown_fields(
        cls, 
        config: Dict[str, Any], 
        known_fields: Set[str]
    ) -> Set[str]:
        """
        获取未知的字段
        
        Args:
            config: 配置字典
            known_fields: 已知的字段集合
            
        Returns:
            未知的字段集合
        """
        return set(config.keys()) - known_fields
    
    @classmethod
    def merge_configs(
        cls, 
        base_config: Dict[str, Any], 
        override_config: Dict[str, Any],
        skip_validation: bool = False
    ) -> Tuple[Dict[str, Any], ValidationResult]:
        """
        合并两个配置，override_config 中的值会覆盖 base_config 中的值
        
        Args:
            base_config: 基础配置
            override_config: 覆盖配置
            skip_validation: 是否跳过验证
            
        Returns:
            (合并后的配置, 验证结果)
        """
        merged = deepcopy(base_config)
        result = ValidationResult()
        
        def deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
            """深度合并字典"""
            for key, value in override.items():
                if isinstance(value, dict) and key in base and isinstance(base[key], dict):
                    base[key] = deep_merge(base[key], value)
                else:
                    base[key] = value
            return base
        
        merged = deep_merge(merged, override_config)
        
        # 验证合并后的配置
        if not skip_validation:
            if 'acceleration' in merged:
                acc_result = cls.validate_acceleration_config(merged['acceleration'])
                if not acc_result.is_valid:
                    result.errors.extend(acc_result.errors)
                if acc_result.warnings:
                    result.warnings.extend(acc_result.warnings)
            
            if 'general' in merged:
                gen_result = cls.validate_general_config(merged['general'])
                if not gen_result.is_valid:
                    result.errors.extend(gen_result.errors)
                if gen_result.warnings:
                    result.warnings.extend(gen_result.warnings)
        
        return merged, result
