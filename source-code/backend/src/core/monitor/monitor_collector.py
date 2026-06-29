"""
监控数据采集器

后台线程持续采集所有监控数据，提供线程安全的数据访问
"""

import time
import threading
from typing import Optional

from .cpu_monitor import CPUMonitor
from .gpu_monitor import GPUMonitor
from .memory_monitor import MemoryMonitor
from .network_monitor import NetworkMonitor
from .disk_monitor import DiskMonitor
from ...utils.logger import app_logger as logger


class MonitorCollector:
    """监控数据采集器"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        self._cpu_monitor = CPUMonitor()
        self._gpu_monitor = GPUMonitor()
        self._memory_monitor = MemoryMonitor()
        self._network_monitor = NetworkMonitor()
        self._disk_monitor = DiskMonitor()
        
        self._data_lock = threading.Lock()
        self._current_data = self._get_empty_data()
        
        self._collector_thread: Optional[threading.Thread] = None
        self._running = False
        self._interval = 1.0
        
        self._initialized = True
        logger.info("MonitorCollector initialized")
    
    def start(self):
        """启动后台采集线程"""
        if self._running:
            return
        
        self._running = True
        self._collector_thread = threading.Thread(
            target=self._collect_loop,
            daemon=True,
            name="MonitorCollector"
        )
        self._collector_thread.start()
        logger.info("Monitor collector started")
    
    def stop(self):
        """停止后台采集线程"""
        self._running = False
        if self._collector_thread:
            self._collector_thread.join(timeout=2.0)
            self._collector_thread = None
        logger.info("Monitor collector stopped")
    
    def close(self):
        """停止后台采集线程并清理资源"""
        self.stop()
        
        try:
            from .hardware_monitor import get_hardware_monitor
            hw = get_hardware_monitor()
            hw.close()
        except Exception:
            pass
    
    def get_data(self) -> dict:
        """
        获取当前监控数据（线程安全）
        
        Returns:
            dict: 监控数据
        """
        with self._data_lock:
            return self._current_data.copy()
    
    def get_hardware_info(self) -> dict:
        """
        获取硬件信息
        
        Returns:
            dict: {
                "cpu": {"name": str, "cores": int, "threads": int, "vendor": str},
                "gpu": {"name": str, "vendor": str, "vram_total": int}
            }
        """
        return {
            "cpu": self._cpu_monitor.get_cpu_info(),
            "gpu": self._gpu_monitor.get_gpu_info()
        }
    
    def get_network_interface_name(self) -> str:
        """
        获取活动网络接口名称
        
        Returns:
            str: 网络接口名称
        """
        return self._network_monitor.get_active_interface_name()
    
    def get_hardware_monitor_status(self) -> dict:
        """
        获取硬件监控状态
        
        Returns:
            dict: {
                "available": bool,
                "hasAdminPrivilege": bool,
                "error": str|None
            }
        """
        try:
            from .hardware_monitor import get_hardware_monitor
            hw = get_hardware_monitor()
            return {
                "available": hw.is_available(),
                "hasAdminPrivilege": hw.has_admin_privilege(),
                "error": hw.get_init_error()
            }
        except Exception as e:
            return {
                "available": False,
                "hasAdminPrivilege": False,
                "error": str(e)
            }
    
    def _collect_loop(self):
        """后台采集循环"""
        while self._running:
            try:
                data = self._collect_all_data()
                with self._data_lock:
                    self._current_data = data
            except Exception as e:
                logger.error(f"Error collecting monitor data: {e}")
            
            time.sleep(self._interval)
    
    def _collect_all_data(self) -> dict:
        """采集所有监控数据"""
        cpu_data = self._safe_get(self._cpu_monitor.get_cpu_data)
        gpu_data = self._safe_get(self._gpu_monitor.get_gpu_data)
        memory_data = self._safe_get(self._memory_monitor.get_memory_data)
        vram_data = self._safe_get(self._memory_monitor.get_vram_data)
        virtual_memory_data = self._safe_get(self._memory_monitor.get_virtual_memory_data)
        network_data = self._safe_get(self._network_monitor.get_network_data)
        disk_data = self._safe_get(self._disk_monitor.get_disk_data)
        
        return {
            "cpu": {
                "load": cpu_data.get("usage", 0) or 0,
                "temp": cpu_data.get("temperature", 0) or 0,
                "power": cpu_data.get("power", 0) or 0,
                "freq": self._get_cpu_frequency(),
                "temp_available": cpu_data.get("temperature_available", False)
            },
            "gpu": {
                "load": gpu_data.get("usage", 0) or 0,
                "temp": gpu_data.get("temperature", 0) or 0,
                "power": gpu_data.get("power", 0) or 0,
                "core_clock": gpu_data.get("core_clock", 0) or 0,
                "gpu_available": gpu_data.get("gpu_available", False)
            },
            "sys": {
                "ram": {
                    "used": memory_data.get("used_gb", 0) or 0,
                    "total": memory_data.get("total", 0) or 0,
                    "percent": memory_data.get("used", 0) or 0
                },
                "vram": {
                    "used": vram_data.get("used_gb", 0) or 0,
                    "total": vram_data.get("total", 0) or 0,
                    "percent": vram_data.get("used", 0) or 0
                },
                "page": {
                    "used": virtual_memory_data.get("used_gb", 0) or 0,
                    "total": virtual_memory_data.get("total", 0) or 0,
                    "percent": virtual_memory_data.get("used", 0) or 0
                }
            },
            "net": network_data,
            "disks": disk_data if disk_data else []
        }
    
    def _safe_get(self, func, default=None):
        """安全调用函数"""
        try:
            return func()
        except Exception as e:
            func_name = getattr(func, '__name__', 'unknown')
            logger.warning(f"Failed to get data from {func_name}: {e}")
            return default or {}
    
    def _get_cpu_frequency(self) -> float:
        """获取 CPU 频率（GHz）"""
        return self._cpu_monitor.get_cpu_frequency()
    
    def _get_empty_data(self) -> dict:
        """返回空数据结构"""
        return {
            "cpu": {"load": 0, "temp": 0, "power": 0, "freq": 0.0},
            "gpu": {"load": 0, "temp": 0, "power": 0, "core_clock": 0},
            "sys": {
                "ram": {"used": 0, "total": 0, "percent": 0},
                "vram": {"used": 0, "total": 0, "percent": 0},
                "page": {"used": 0, "total": 0, "percent": 0}
            },
            "net": {"up": 0.0, "down": 0.0},
            "disks": []
        }
