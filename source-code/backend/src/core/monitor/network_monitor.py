"""
网络监控模块

提供网络上下行速率的监控功能
"""

import time
import psutil
from typing import Optional

from ...utils.logger import app_logger as logger


class NetworkMonitor:
    """网络监控类"""
    
    def __init__(self):
        """初始化网络监控"""
        self._last_net_io = None
        self._last_time = None
    
    def get_network_data(self) -> dict:
        """
        获取网络速率数据
        
        Returns:
            dict: {
                "up": float,    # 上行速率 (MB/s)
                "down": float   # 下行速率 (MB/s)
            }
        """
        try:
            current_time = time.time()
            current_net_io = psutil.net_io_counters()
            
            if self._last_net_io is None or self._last_time is None:
                self._last_net_io = current_net_io
                self._last_time = current_time
                return {"up": 0.0, "down": 0.0}
            
            time_delta = current_time - self._last_time
            if time_delta <= 0:
                return {"up": 0.0, "down": 0.0}
            
            bytes_sent_delta = current_net_io.bytes_sent - self._last_net_io.bytes_sent
            bytes_recv_delta = current_net_io.bytes_recv - self._last_net_io.bytes_recv
            
            up_speed = (bytes_sent_delta / time_delta) / (1024 * 1024)
            down_speed = (bytes_recv_delta / time_delta) / (1024 * 1024)
            
            self._last_net_io = current_net_io
            self._last_time = current_time
            
            return {
                "up": round(up_speed, 1),
                "down": round(down_speed, 1)
            }
            
        except Exception as e:
            logger.warning(f"Failed to get network data: {e}")
            return {"up": 0.0, "down": 0.0}
    
    def get_active_interface_name(self) -> str:
        """
        获取当前活动网络接口名称
        
        Returns:
            str: 网络接口名称（如 "以太网"、"WLAN" 等）
        """
        try:
            stats = psutil.net_if_stats()
            io_counters = psutil.net_io_counters(pernic=True)
            
            active_interfaces = []
            for name, stat in stats.items():
                if stat.isup and name in io_counters:
                    io = io_counters[name]
                    total_bytes = io.bytes_sent + io.bytes_recv
                    if total_bytes > 0:
                        active_interfaces.append((name, total_bytes))
            
            if active_interfaces:
                active_interfaces.sort(key=lambda x: x[1], reverse=True)
                return active_interfaces[0][0]
            
            return "Network"
            
        except Exception as e:
            logger.warning(f"Failed to get active interface name: {e}")
            return "Network"
