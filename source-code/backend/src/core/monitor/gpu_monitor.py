"""
GPU 监控模块

提供 GPU 占用率、温度和功率的监控功能
优先使用 LibreHardwareMonitor，降级使用 GPUtil
"""

import platform
from typing import Optional

from ...utils.logger import app_logger as logger


class GPUMonitor:
    """GPU 监控类"""
    
    def __init__(self):
        """初始化 GPU 监控"""
        self._hw_monitor = None
        self._gpu_name = None
        self._gpu_vendor = None
        self._vram_total = 0
        self._init_hardware_monitor()
        self._detect_gpu_info()
        
        logger.info(f"[GPUMonitor] GPU: {self._gpu_name or 'None'}, Vendor: {self._gpu_vendor or 'None'}")
    
    def _init_hardware_monitor(self):
        """初始化 LibreHardwareMonitor"""
        try:
            from .hardware_monitor import get_hardware_monitor
            self._hw_monitor = get_hardware_monitor()
            if self._hw_monitor.is_available():
                logger.info("[GPUMonitor] LibreHardwareMonitor 初始化成功")
        except ImportError as e:
            logger.debug(f"[GPUMonitor] hardware_monitor 模块未找到: {e}")
            self._hw_monitor = None
        except Exception as e:
            logger.warning(f"[GPUMonitor] 初始化 LibreHardwareMonitor 失败: {e}")
            self._hw_monitor = None
    
    def _detect_gpu_info(self):
        """检测 GPU 信息"""
        if self._hw_monitor and self._hw_monitor.is_available():
            gpu_info = self._hw_monitor.get_gpu_info()
            if gpu_info:
                self._gpu_name = gpu_info.get('name')
                self._gpu_vendor = gpu_info.get('vendor')
                self._vram_total = gpu_info.get('vram_total', 0)
                return
        
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            if gpus:
                gpu = gpus[0]
                self._gpu_name = gpu.name
                name_upper = gpu.name.upper()
                if 'NVIDIA' in name_upper or 'GEFORCE' in name_upper or 'RTX' in name_upper or 'GTX' in name_upper:
                    self._gpu_vendor = 'NVIDIA'
                elif 'AMD' in name_upper or 'RADEON' in name_upper:
                    self._gpu_vendor = 'AMD'
                elif 'INTEL' in name_upper or 'ARC' in name_upper:
                    self._gpu_vendor = 'Intel'
                else:
                    self._gpu_vendor = 'Unknown'
                self._vram_total = int(gpu.memoryTotal) if hasattr(gpu, 'memoryTotal') else 0
        except Exception as e:
            logger.debug(f"[GPUMonitor] GPUtil 检测失败: {e}")
    
    def get_gpu_data(self) -> dict:
        """
        获取 GPU 监控数据
        
        Returns:
            dict: {
                "usage": float|None,          # GPU 占用率 (%)
                "power": float|None,          # GPU 功率 (W)
                "temperature": float|None,    # GPU 温度 (°C)
                "core_clock": float|None      # GPU 核心频率
            }
        """
        usage = None
        temperature = None
        power = None
        core_clock = None
        
        if self._hw_monitor and self._hw_monitor.is_available():
            usage = self._hw_monitor.get_gpu_load()
            temperature = self._hw_monitor.get_gpu_temperature()
            power = self._hw_monitor.get_gpu_power()
            core_clock = self._hw_monitor.get_gpu_core_clock()
        
        if usage is None or temperature is None:
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]
                    if usage is None:
                        usage = gpu.load * 100 if hasattr(gpu, 'load') and gpu.load else None
                    if temperature is None:
                        temperature = gpu.temperature if hasattr(gpu, 'temperature') else None
            except Exception:
                pass
        
        gpu_available = self._gpu_name is not None and self._gpu_name != "Unknown GPU"
        
        return {
            "usage": round(usage, 1) if usage is not None else None,
            "power": round(power, 1) if power is not None else None,
            "temperature": round(temperature, 1) if temperature is not None else None,
            "core_clock": round(core_clock, 1) if core_clock is not None else None,
            "gpu_available": gpu_available
        }
    
    def get_gpu_info(self) -> dict:
        """
        获取 GPU 基本信息
        
        Returns:
            dict: {
                "name": str,       # GPU 名称
                "vendor": str,     # 厂商 (NVIDIA/AMD/Intel)
                "vram_total": int  # 显存总量 (MB)
            }
        """
        return {
            "name": self._gpu_name or "Unknown GPU",
            "vendor": self._gpu_vendor or "Unknown",
            "vram_total": self._vram_total or 0
        }
