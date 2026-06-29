"""
启动参数构建器模块

该模块负责根据环境配置生成 ComfyUI 的启动参数列表
"""

from typing import List, Dict, Optional
from .types import Environment, AccelerationSettings, GeekMode


class LaunchArgsBuilder:
    """启动参数构建器"""
    
    def build_args(self, environment: Environment) -> List[str]:
        """
        构建启动参数列表
        
        Args:
            environment: 环境对象
            
        Returns:
            启动参数列表
        """
        config = environment.config.acceleration
        
        # 检查是否启用极客模式
        if hasattr(config, 'geek_mode') and config.geek_mode and hasattr(config.geek_mode, 'enabled') and config.geek_mode.enabled:
            # 极客模式：直接使用自定义参数
            return self._parse_geek_mode_args(config.geek_mode.custom_args)
        
        # 普通模式：通过配置字段构建参数
        args = []
        
        # 添加各类参数
        self._add_vram_args(args, config)
        self._add_precision_args(args, config)
        self._add_optimization_args(args, config)
        self._add_network_args(args, config)
        self._add_path_args(args, config, environment)
        self._add_misc_args(args, config)
        
        return args
    
    def build_args_from_dict(self, acceleration_config: Dict) -> List[str]:
        """
        从字典配置构建启动参数列表
        
        Args:
            acceleration_config: 加速配置字典（支持驼峰命名和蛇形命名）
            
        Returns:
            启动参数列表
        """
        geek_mode = acceleration_config.get("geek_mode") or acceleration_config.get("geekMode", {})
        if geek_mode and geek_mode.get("enabled", False):
            custom_args = geek_mode.get("custom_args") or geek_mode.get("customArgs", "")
            return self._parse_geek_mode_args(custom_args)
        
        # 将字典转换为 AccelerationSettings 对象
        config = self._dict_to_acceleration_settings(acceleration_config)
        
        # 构建参数
        args = []
        self._add_vram_args(args, config)
        self._add_precision_args(args, config)
        self._add_optimization_args(args, config)
        self._add_network_args(args, config)
        self._add_path_args_from_dict(args, acceleration_config)
        self._add_misc_args(args, config)
        
        return args
    
    def _dict_to_acceleration_settings(self, data: Dict) -> AccelerationSettings:
        """将字典转换为 AccelerationSettings 对象，支持驼峰和蛇形命名"""
        geek_mode_data = data.get("geekMode") or data.get("geek_mode")
        if geek_mode_data:
            geek_mode = GeekMode.from_dict(geek_mode_data)
        else:
            geek_mode = GeekMode()
        
        return AccelerationSettings(
            vram_mode=data.get("vramStrategy") or data.get("vram_mode", "auto"),
            use_cpu=data.get("cpuOnly") or data.get("use_cpu", False),
            use_gpu_only=data.get("gpuOnly") or data.get("use_gpu_only", False),
            reserve_vram=(
                data.get("reserveVram") if data.get("reserveVram") not in (None, "")
                else data.get("reserve_vram") if data.get("reserve_vram") not in (None, "")
                else 0
            ),
            compute_device=data.get("computeDevice") or data.get("compute_device", ""),
            geek_mode=geek_mode,
            unet_precision=data.get("unetPrecision") or data.get("unet_precision", "auto"),
            vae_precision=data.get("vaePrecision") or data.get("vae_precision", "auto"),
            text_enc_precision=data.get("textEncPrecision") or data.get("text_enc_precision", "auto"),
            attention_type=data.get("attentionMode") or data.get("attention_type", "auto"),
            disable_xformers=data.get("disableXformers") or data.get("disable_xformers", False),
            disable_smart_memory=data.get("disableSmartMemory") or data.get("disable_smart_memory", False),
            force_channels_last=data.get("forceChannelsLast") or data.get("force_channels_last", False),
            cache_lru=data.get("cacheLru") or data.get("cache_lru", 0),
            deterministic=data.get("deterministic", False),
            fast_mode=data.get("fastMode") or data.get("fast_mode", False),
            cuda_malloc=data.get("cudaMalloc") or data.get("cuda_malloc", "auto"),
            listen=data.get("listenNetwork") or data.get("listen", False),
            listen_address=data.get("listenAddress") or data.get("listen_address", ""),
            port=data.get("port", 8188),
            enable_cors=data.get("enableCors") or data.get("enable_cors", False),
            tls_keyfile=data.get("tlsKeyfile") or data.get("tls_keyfile", ""),
            tls_certfile=data.get("tlsCertfile") or data.get("tls_certfile", ""),
            base_directory=data.get("baseDirectory") or data.get("base_directory", ""),
            input_directory=data.get("inputDirectory") or data.get("input_directory", ""),
            output_directory=data.get("outputDirectory") or data.get("output_directory", ""),
            temp_directory=data.get("tempDirectory") or data.get("temp_directory", ""),
            user_directory=data.get("userDirectory") or data.get("user_directory", ""),
            extra_model_paths_config=data.get("extraModelPathsConfig") or data.get("extra_model_paths_config", ""),
            preview_method=data.get("previewMethod") or data.get("preview_method", "auto"),
            preview_size=data.get("previewSize") or data.get("preview_size", 512),
            disable_all_custom_nodes=data.get("safeMode") or data.get("disable_all_custom_nodes", False),
            enable_manager=data.get("enableManager") or data.get("enable_manager", False),
            verbose=data.get("logLevel") or data.get("verbose", "INFO"),
            disable_metadata=data.get("disableMetadata") or data.get("disable_metadata", False),
        )
    
    def _parse_geek_mode_args(self, custom_args: str) -> List[str]:
        """
        解析极客模式的自定义参数字符串
        
        Args:
            custom_args: 自定义参数字符串（每行一个参数）
            
        Returns:
            参数列表
        """
        if not custom_args:
            return []
        
        args = []
        
        # 按行分割
        lines = custom_args.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            
            # 跳过空行和注释行
            if not line or line.startswith('#'):
                continue
            
            # 分割参数和值
            # 支持格式：
            # 1. --port 8188
            # 2. --port=8188
            # 3. --listen（无值参数）
            if '=' in line:
                # 格式：--port=8188
                args.append(line)
            elif line.startswith('--') or line.startswith('-'):
                # 格式：--port 8188 或 --listen
                parts = line.split(None, 1)  # 最多分割一次
                args.extend(parts)
            else:
                # 其他格式，直接添加
                args.append(line)
        
        return args
    
    def _add_vram_args(self, args: List[str], config: AccelerationSettings):
        """添加显存相关参数"""
        device = config.compute_device
        if device == "auto":
            device = ""
        is_cpu_mode = device == "cpu"
        is_nvidia = device.startswith(("gpu:", "nvidia:"))
        is_intel = device.startswith(("intel:", "intel-arc:"))
        is_amd = device.startswith("amd:")
        
        if is_cpu_mode:
            args.append("--cpu")
            return
        
        if is_amd:
            pass

        if is_intel:
            index = device.split(":")[1] if ":" in device else "0"
            oneapi_selector = f"gpu.{index}" if index.isdigit() else index
            args.extend(["--oneapi-device-selector", oneapi_selector])
        
        if is_nvidia:
            index = device.split(":")[1] if ":" in device else "0"
            args.extend(["--cuda-device", str(int(index))])
        
        if config.use_gpu_only:
            args.append("--gpu-only")
        else:
            if config.vram_mode == "auto" or config.vram_mode == "normal":
                pass
            elif config.vram_mode == "low":
                args.append("--lowvram")
            elif config.vram_mode == "high":
                args.append("--highvram")
            elif config.vram_mode == "no":
                args.append("--novram")
        
        if config.reserve_vram > 0:
            args.extend(["--reserve-vram", str(config.reserve_vram)])
    
    def _add_precision_args(self, args: List[str], config: AccelerationSettings):
        """添加精度相关参数"""
        unet_precision = config.unet_precision
        if unet_precision == "fp8_e4m3fn":
            args.append("--fp8_e4m3fn-unet")
        elif unet_precision == "fp8_e5m2":
            args.append("--fp8_e5m2-unet")
        elif unet_precision == "fp16":
            args.append("--fp16-unet")
        elif unet_precision == "bf16":
            args.append("--bf16-unet")
        elif unet_precision == "fp32":
            args.append("--fp32-unet")
        
        vae_precision = config.vae_precision
        if vae_precision == "fp16":
            args.append("--fp16-vae")
        elif vae_precision == "fp32":
            args.append("--fp32-vae")
        elif vae_precision == "bf16":
            args.append("--bf16-vae")
        elif vae_precision == "cpu":
            args.append("--cpu-vae")
        
        text_enc_precision = config.text_enc_precision
        if text_enc_precision == "fp8_e4m3fn":
            args.append("--fp8_e4m3fn-text-enc")
        elif text_enc_precision == "fp8_e5m2":
            args.append("--fp8_e5m2-text-enc")
        elif text_enc_precision == "fp16":
            args.append("--fp16-text-enc")
        elif text_enc_precision == "fp32":
            args.append("--fp32-text-enc")
        elif text_enc_precision == "bf16":
            args.append("--bf16-text-enc")
    
    def _add_optimization_args(self, args: List[str], config: AccelerationSettings):
        """添加优化相关参数"""
        if config.attention_type == "flash":
            args.append("--use-flash-attention")
        elif config.attention_type == "sage":
            args.append("--use-sage-attention")
        elif config.attention_type == "split":
            args.append("--use-split-cross-attention")
        elif config.attention_type == "pytorch":
            args.append("--use-pytorch-cross-attention")
        elif config.attention_type == "quad":
            args.append("--use-quad-cross-attention")
        
        # 其他优化选项
        if config.disable_xformers:
            args.append("--disable-xformers")
        
        if config.disable_smart_memory:
            args.append("--disable-smart-memory")
        
        if config.force_channels_last:
            args.append("--force-channels-last")
        
        if config.cache_lru > 0:
            args.extend(["--cache-lru", str(config.cache_lru)])
        
        if config.deterministic:
            args.append("--deterministic")
        
        if config.fast_mode:
            args.append("--fast")
        
        if config.cuda_malloc == "enable":
            args.append("--cuda-malloc")
        elif config.cuda_malloc == "disable":
            args.append("--disable-cuda-malloc")
    
    def _add_network_args(self, args: List[str], config: AccelerationSettings):
        """添加网络相关参数"""
        if config.listen:
            if config.listen_address:
                args.extend(["--listen", config.listen_address])
            else:
                args.append("--listen")
        
        if config.port != 8188:
            args.extend(["--port", str(config.port)])
        
        if config.enable_cors:
            args.append("--enable-cors-header")
        
        if config.tls_keyfile:
            args.extend(["--tls-keyfile", config.tls_keyfile])
        
        if config.tls_certfile:
            args.extend(["--tls-certfile", config.tls_certfile])
    
    def _add_path_args(self, args: List[str], config: AccelerationSettings, environment: Environment):
        """添加路径相关参数"""
        if config.base_directory:
            args.extend(["--base-directory", config.base_directory])
        
        if config.input_directory:
            args.extend(["--input-directory", config.input_directory])
        
        if config.output_directory:
            args.extend(["--output-directory", config.output_directory])
        
        if config.temp_directory:
            args.extend(["--temp-directory", config.temp_directory])
        
        if config.user_directory:
            args.extend(["--user-directory", config.user_directory])
        
        # 模型路径配置
        if environment.model_path_configs:
            args.extend(["--extra-model-paths-config", "extra_model_paths.yaml"])
    
    def _add_path_args_from_dict(self, args: List[str], config: Dict):
        """从字典添加路径相关参数（支持 camelCase 和 snake_case）"""
        base_dir = config.get("baseDirectory") or config.get("base_directory")
        if base_dir:
            args.extend(["--base-directory", base_dir])

        input_dir = config.get("inputDirectory") or config.get("input_directory")
        if input_dir:
            args.extend(["--input-directory", input_dir])

        output_dir = config.get("outputDirectory") or config.get("output_directory")
        if output_dir:
            args.extend(["--output-directory", output_dir])

        temp_dir = config.get("tempDirectory") or config.get("temp_directory")
        if temp_dir:
            args.extend(["--temp-directory", temp_dir])

        user_dir = config.get("userDirectory") or config.get("user_directory")
        if user_dir:
            args.extend(["--user-directory", user_dir])

        extra_model_paths = config.get("extraModelPathsConfig") or config.get("extra_model_paths_config")
        if extra_model_paths:
            args.extend(["--extra-model-paths-config", extra_model_paths])
    
    def _add_misc_args(self, args: List[str], config: AccelerationSettings):
        """添加其他参数"""
        if config.preview_method == "none":
            args.extend(["--preview-method", "none"])
        elif config.preview_method not in ("auto", ""):
            args.extend(["--preview-method", config.preview_method])

        if config.preview_size != 512 and config.preview_method not in ("auto", ""):
            args.extend(["--preview-size", str(config.preview_size)])
        
        if config.disable_all_custom_nodes:
            args.append("--disable-all-custom-nodes")
        
        if config.enable_manager:
            args.append("--enable-manager")
        
        if config.verbose == "DEBUG":
            args.append("--verbose")
        
        if config.disable_metadata:
            args.append("--disable-metadata")
