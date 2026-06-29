"""
磁盘监控模块

提供逻辑磁盘列表和空间使用情况的监控功能
"""

import ctypes
import psutil
from typing import List, Optional

from ...utils.logger import app_logger as logger


class DiskMonitor:
    """磁盘监控类"""
    
    def __init__(self):
        """初始化磁盘监控"""
        pass
    
    def get_disk_data(self) -> List[dict]:
        """
        获取所有逻辑磁盘数据
        
        Returns:
            List[dict]: 磁盘列表，每个元素包含:
                {
                    "letter": str,   # 盘符 (C:)
                    "name": str,     # 卷标名称
                    "used": int,     # 已用空间 (GB)
                    "total": int     # 总空间 (GB)
                }
        """
        try:
            disks = []
            partitions = psutil.disk_partitions()
            
            for partition in partitions:
                if partition.mountpoint:
                    try:
                        usage = psutil.disk_usage(partition.mountpoint)
                        
                        letter = partition.mountpoint.rstrip('\\')
                        name = self._get_volume_name(partition.mountpoint)
                        
                        used_gb = int(usage.used / (1024 ** 3))
                        total_gb = int(usage.total / (1024 ** 3))
                        
                        disks.append({
                            "letter": letter,
                            "name": name,
                            "used": used_gb,
                            "total": total_gb
                        })
                    except Exception as e:
                        logger.debug(f"Failed to get usage for {partition.mountpoint}: {e}")
                        continue
            
            return disks
            
        except Exception as e:
            logger.warning(f"Failed to get disk data: {e}")
            return []
    
    def _get_volume_name(self, mountpoint: str) -> str:
        """
        获取磁盘卷标名称（Windows API）
        
        Args:
            mountpoint: 挂载点路径
            
        Returns:
            str: 卷标名称
        """
        try:
            kernel32 = ctypes.windll.kernel32
            volume_name_buffer = ctypes.create_unicode_buffer(1024)
            file_system_name_buffer = ctypes.create_unicode_buffer(1024)
            serial_number = None
            max_component_length = None
            file_system_flags = None
            
            result = kernel32.GetVolumeInformationW(
                ctypes.c_wchar_p(mountpoint),
                volume_name_buffer,
                ctypes.sizeof(volume_name_buffer),
                serial_number,
                max_component_length,
                file_system_flags,
                file_system_name_buffer,
                ctypes.sizeof(file_system_name_buffer)
            )
            
            if result:
                volume_name = volume_name_buffer.value.strip()
                if volume_name:
                    return volume_name
            
        except Exception as e:
            logger.debug(f"Failed to get volume name for {mountpoint}: {e}")
        
        return "本地磁盘"
