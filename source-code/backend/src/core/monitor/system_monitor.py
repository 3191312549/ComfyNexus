"""
系统监控核心模块

协调各监控模块，提供统一的监控数据接口
"""

from .cpu_monitor import CPUMonitor
from .gpu_monitor import GPUMonitor
from .memory_monitor import MemoryMonitor
from ...utils.logger import app_logger as logger


class SystemMonitor:
    """系统监控核心类"""
    
    def __init__(self):
        """初始化监控模块"""
        self.cpu_monitor = CPUMonitor()
        self.gpu_monitor = GPUMonitor()
        self.memory_monitor = MemoryMonitor()
    
    def get_monitor_data(self) -> dict:
        """
        获取所有监控数据
        
        Returns:
            dict: 包含所有监控指标的字典
            {
                "vram": {"used": float, "total": float, "used_gb": float},
                "memory": {"used": float, "total": float, "used_gb": float},
                "virtual_memory": {"used": float, "total": float, "used_gb": float},
                "cpu": {"usage": float, "power": float|None, "temperature": float|None},
                "gpu": {"usage": float, "power": float|None, "temperature": float|None}
            }
        """
        # 并行获取数据（使用 _safe_get 确保部分失败不影响其他数据）
        cpu_data = self._safe_get(self.cpu_monitor.get_cpu_data)
        gpu_data = self._safe_get(self.gpu_monitor.get_gpu_data)
        memory_data = self._safe_get(self.memory_monitor.get_memory_data)
        vram_data = self._safe_get(self.memory_monitor.get_vram_data)
        virtual_memory_data = self._safe_get(self.memory_monitor.get_virtual_memory_data)
        
        return {
            "vram": vram_data,
            "memory": memory_data,
            "virtual_memory": virtual_memory_data,
            "cpu": cpu_data,
            "gpu": gpu_data
        }
    
    def _safe_get(self, func, default=None):
        """
        安全调用函数，捕获异常
        
        Args:
            func: 要调用的函数
            default: 失败时的默认返回值
            
        Returns:
            函数返回值或默认值
        """
        try:
            return func()
        except Exception as e:
            func_name = getattr(func, '__name__', 'unknown')
            logger.warning(f"Failed to get data from {func_name}: {e}")
            return default or self._get_null_data()
    
    def _get_null_data(self) -> dict:
        """返回空数据"""
        return {"used": None, "total": 0, "used_gb": 0}
