"""
CPU 监控模块

提供 CPU 占用率、温度和功率的监控功能
"""

import platform
import psutil
from typing import Optional

from ...utils.logger import app_logger as logger


class CPUMonitor:
    """CPU 监控类"""
    
    def __init__(self):
        """初始化 CPU 监控"""
        self._last_cpu_percent = 0
        self._temperature_available = None
        self._hw_monitor = None
        self._wmi_warning_logged = False
        self._init_hardware_monitor()
    
    def _init_hardware_monitor(self):
        """初始化 LibreHardwareMonitor"""
        try:
            from .hardware_monitor import get_hardware_monitor
            self._hw_monitor = get_hardware_monitor()
            if self._hw_monitor.is_available():
                logger.info("[CPUMonitor] LibreHardwareMonitor 初始化成功")
            else:
                error = self._hw_monitor.get_init_error()
                if error:
                    logger.debug(f"[CPUMonitor] LibreHardwareMonitor 不可用: {error}")
        except ImportError as e:
            logger.debug(f"[CPUMonitor] hardware_monitor 模块未找到: {e}")
            self._hw_monitor = None
        except Exception as e:
            logger.warning(f"[CPUMonitor] 初始化 LibreHardwareMonitor 失败: {e}")
            self._hw_monitor = None
    
    def _check_temperature_available(self) -> bool:
        """
        检测 CPU 温度是否可用
        
        Returns:
            bool: 温度是否可用
        """
        if self._temperature_available is not None:
            return self._temperature_available
        
        try:
            temp = self._get_cpu_temperature()
            self._temperature_available = temp is not None and temp > 0
            return self._temperature_available
        except Exception:
            self._temperature_available = False
            return False
    
    def get_cpu_data(self) -> dict:
        """
        获取 CPU 监控数据
        
        Returns:
            dict: {
                "usage": float,           # CPU 占用率 (%)
                "power": float|None,      # CPU 功率 (W)
                "temperature": float|None, # CPU 温度 (°C)
                "temperature_available": bool  # 温度是否可用
            }
        """
        usage = self._get_cpu_usage()
        temperature = self._get_cpu_temperature()
        power = self._get_cpu_power()
        temp_available = self._check_temperature_available()
        
        return {
            "usage": round(usage, 1) if usage is not None else None,
            "power": round(power, 1) if power is not None else None,
            "temperature": round(temperature, 1) if temperature is not None else None,
            "temperature_available": temp_available
        }
    
    def _get_cpu_usage(self) -> float:
        """
        获取 CPU 占用率
        
        Returns:
            float: CPU 占用率 (0-100)
        """
        try:
            # 使用 interval=0.1 获取短时间内的平均值
            # 第一次调用会阻塞0.1秒，后续调用返回上次调用后的平均值
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            # 更新缓存
            if cpu_percent > 0:
                self._last_cpu_percent = cpu_percent
            
            return cpu_percent
        except Exception as e:
            logger.warning(f"Failed to get CPU usage: {e}")
            return self._last_cpu_percent if self._last_cpu_percent > 0 else 0.0
    
    def _get_cpu_temperature(self) -> Optional[float]:
        """
        获取 CPU 温度
        
        Returns:
            float|None: CPU 温度（摄氏度），不可用时返回 None
            
        Note:
            - 优先使用 LibreHardwareMonitor
            - 降级到 psutil (Linux)
            - 最后尝试 WMI (Windows)
        """
        try:
            if self._hw_monitor and self._hw_monitor.is_available():
                temp = self._hw_monitor.get_cpu_temperature()
                if temp is not None and temp > 0:
                    return temp
            
            if hasattr(psutil, "sensors_temperatures"):
                temps = psutil.sensors_temperatures()
                
                for name in ['coretemp', 'cpu_thermal', 'k10temp', 'zenpower', 'cpu-thermal']:
                    if name in temps:
                        entries = temps[name]
                        if entries:
                            return entries[0].current
            
            if platform.system() == 'Windows':
                return self._get_cpu_temperature_windows()
            
            return None
            
        except Exception as e:
            logger.debug(f"Failed to get CPU temperature: {e}")
            return None
    
    def _get_cpu_temperature_windows(self) -> Optional[float]:
        """
        Windows 系统获取 CPU 温度
        
        Returns:
            float|None: CPU 温度或 None
        """
        try:
            import wmi
            w = wmi.WMI(namespace="root\\wmi")
            
            # 尝试多种方法获取温度
            # 方法1: MSAcpi_ThermalZoneTemperature
            try:
                temperature_info = w.MSAcpi_ThermalZoneTemperature()[0]
                # WMI 返回的温度单位是 0.1 开尔文
                temp_kelvin = temperature_info.CurrentTemperature / 10.0
                temp_celsius = temp_kelvin - 273.15
                
                # 验证温度是否合理（0-120°C）
                if 0 <= temp_celsius <= 120:
                    return temp_celsius
            except Exception:
                pass
            
            # 方法2: Win32_TemperatureProbe
            try:
                for temp_probe in w.Win32_TemperatureProbe():
                    if temp_probe.CurrentReading:
                        # 单位是 0.1 开尔文
                        temp_kelvin = temp_probe.CurrentReading / 10.0
                        temp_celsius = temp_kelvin - 273.15
                        
                        if 0 <= temp_celsius <= 120:
                            return temp_celsius
            except Exception:
                pass
            
            # 方法3: OpenHardwareMonitor (如果安装了)
            try:
                w_ohm = wmi.WMI(namespace="root\\OpenHardwareMonitor")
                for sensor in w_ohm.Sensor():
                    if sensor.SensorType == 'Temperature' and 'CPU' in sensor.Name:
                        temp = sensor.Value
                        if temp and 0 <= temp <= 120:
                            return temp
            except Exception:
                pass
            
            return None
            
        except ImportError:
            if not self._wmi_warning_logged:
                logger.debug("WMI library not installed, CPU temperature unavailable on Windows")
                self._wmi_warning_logged = True
            return None
        except Exception as e:
            logger.debug(f"WMI temperature query failed: {e}")
            return None
    
    def _get_cpu_power(self) -> Optional[float]:
        """
        获取 CPU 功率
        
        Returns:
            float|None: CPU 功率（瓦特），不可用时返回 None
            
        Note:
            优先使用 LibreHardwareMonitor 获取功耗
        """
        if self._hw_monitor and self._hw_monitor.is_available():
            power = self._hw_monitor.get_cpu_power()
            if power is not None:
                return power
        
        return None
    
    def get_cpu_frequency(self) -> float:
        """
        获取 CPU 实时频率（GHz）
        
        Returns:
            float: CPU 频率（GHz），不可用时返回 0.0
            
        Note:
            优先使用 LibreHardwareMonitor 获取实时频率
            降级使用 psutil（Windows 上返回基准频率）
        """
        if self._hw_monitor and self._hw_monitor.is_available():
            clock = self._hw_monitor.get_cpu_clock()
            if clock is not None and clock > 0:
                return round(clock / 1000, 2)
        
        try:
            freq = psutil.cpu_freq()
            if freq and freq.current:
                return round(freq.current / 1000, 2)
        except Exception:
            pass
        
        return 0.0
    
    def get_cpu_info(self) -> dict:
        """
        获取 CPU 基本信息
        
        Returns:
            dict: {
                "name": str,      # CPU 名称
                "cores": int,     # 物理核心数
                "threads": int,   # 逻辑线程数
                "vendor": str     # 厂商 (Intel/AMD)
            }
        """
        name = None
        cores = 0
        threads = 0
        vendor = "Unknown"
        
        if self._hw_monitor and self._hw_monitor.is_available():
            name = self._hw_monitor.get_cpu_name()
        
        if not name:
            name = self._get_cpu_name_from_registry()
        
        if not name:
            name = self._get_cpu_name_from_wmi()
        
        cores = psutil.cpu_count(logical=False) or 0
        threads = psutil.cpu_count(logical=True) or 0
        
        if name:
            vendor = self._detect_vendor_from_name(name)
        
        return {
            "name": name or "Unknown CPU",
            "cores": cores,
            "threads": threads,
            "vendor": vendor
        }
    
    def _get_cpu_name_from_registry(self) -> Optional[str]:
        """
        从 Windows 注册表获取 CPU 名称
        
        Returns:
            str|None: CPU 名称或 None
        """
        if platform.system() != 'Windows':
            return None
        
        try:
            import winreg
            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0"
            )
            name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
            winreg.CloseKey(key)
            return name.strip() if name else None
        except Exception as e:
            logger.debug(f"Failed to get CPU name from registry: {e}")
            return None
    
    def _get_cpu_name_from_wmi(self) -> Optional[str]:
        """
        从 WMI 获取 CPU 名称
        
        Returns:
            str|None: CPU 名称或 None
        """
        try:
            import wmi
            c = wmi.WMI()
            for processor in c.Win32_Processor():
                if processor.Name:
                    return processor.Name.strip()
        except ImportError:
            if not self._wmi_warning_logged:
                logger.debug("WMI library not installed")
                self._wmi_warning_logged = True
        except Exception as e:
            logger.debug(f"Failed to get CPU name from WMI: {e}")
        return None
    
    def _detect_vendor_from_name(self, name: str) -> str:
        """
        从 CPU 名称推断厂商
        
        Args:
            name: CPU 名称
            
        Returns:
            str: 厂商名称
        """
        name_lower = name.lower()
        if 'intel' in name_lower:
            return "Intel"
        elif 'amd' in name_lower:
            return "AMD"
        return "Unknown"
