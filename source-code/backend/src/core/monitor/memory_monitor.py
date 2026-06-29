"""
内存监控模块

提供系统内存、虚拟内存和 GPU 显存的监控功能
"""

import psutil
import GPUtil

from ...utils.logger import app_logger as logger


class MemoryMonitor:
    """内存监控类"""
    
    def __init__(self):
        """初始化内存监控"""
        pass
    
    def get_memory_data(self) -> dict:
        """
        获取系统内存数据
        
        Returns:
            dict: {
                "used": float,    # 使用百分比 (0-100)
                "total": float,   # 总容量 (GB)
                "used_gb": float  # 已使用 (GB)
            }
        """
        try:
            memory = psutil.virtual_memory()
            return {
                "used": round(memory.percent, 1),
                "total": round(memory.total / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2)
            }
        except Exception as e:
            logger.warning(f"Failed to get memory data: {e}")
            return {"used": None, "total": 0, "used_gb": 0}
    
    def get_virtual_memory_data(self) -> dict:
        """
        获取虚拟内存（Swap）数据
        
        Returns:
            dict: {
                "used": float,    # 使用百分比 (0-100)
                "total": float,   # 总容量 (GB)
                "used_gb": float  # 已使用 (GB)
            }
        """
        try:
            swap = psutil.swap_memory()
            return {
                "used": round(swap.percent, 1),
                "total": round(swap.total / (1024**3), 2),
                "used_gb": round(swap.used / (1024**3), 2)
            }
        except Exception as e:
            logger.warning(f"Failed to get virtual memory data: {e}")
            return {"used": None, "total": 0, "used_gb": 0}
    
    def get_vram_data(self) -> dict:
        """
        获取 GPU 显存（VRAM）数据
        
        Returns:
            dict: {
                "used": float,    # 使用百分比 (0-100)
                "total": float,   # 总容量 (GB)
                "used_gb": float  # 已使用 (GB)
            }
        """
        try:
            gpus = GPUtil.getGPUs()
            if not gpus:
                return {"used": None, "total": 0, "used_gb": 0}
            
            # 获取第一个 GPU 的显存信息
            gpu = gpus[0]
            used_percent = (gpu.memoryUsed / gpu.memoryTotal) * 100
            
            return {
                "used": round(used_percent, 1),
                "total": round(gpu.memoryTotal / 1024, 2),  # MB -> GB
                "used_gb": round(gpu.memoryUsed / 1024, 2)
            }
            
        except Exception as e:
            logger.warning(f"Failed to get VRAM data: {e}")
            return {"used": None, "total": 0, "used_gb": 0}
