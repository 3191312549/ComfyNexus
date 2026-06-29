"""
LibreHardwareMonitor 桥接模块

使用 LibreHardwareMonitorLib 获取 CPU/GPU 温度和功耗
需要管理员权限运行
"""

import os
import platform
import ctypes
import threading
from typing import Optional, Dict, List
from pathlib import Path

from ...utils.logger import app_logger as logger
from ...utils.paths import get_internal_dir


class SensorType:
    """传感器类型常量"""
    TEMPERATURE = 'Temperature'
    POWER = 'Power'
    LOAD = 'Load'
    SMALL_DATA = 'SmallData'
    DATA = 'Data'


class HardwareMonitor:
    """LibreHardwareMonitor 桥接类（单例模式）"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._computer = None
        self._cpu = None
        self._gpu_list: List = []
        self._available = False
        self._admin_privilege = False
        self._init_error: Optional[str] = None
        self._closed = False
        
        if platform.system() != 'Windows':
            logger.info("[HardwareMonitor] 仅支持 Windows 系统")
            return
        
        self._admin_privilege = self._is_admin()
        if not self._admin_privilege:
            logger.warning("[HardwareMonitor] 需要管理员权限才能访问硬件传感器")
            self._init_error = "需要管理员权限"
            return
        
        self._init_hardware_monitor()
    
    def __del__(self):
        """析构时释放 CLR 资源"""
        try:
            if not self._closed:
                self.close()
        except Exception:
            pass
    
    def _is_admin(self) -> bool:
        """检查是否以管理员权限运行"""
        try:
            return ctypes.windll.shell32.IsUserAnAdmin()
        except Exception:
            return False
    
    def _find_dll_path(self) -> Optional[Path]:
        """
        查找 LibreHardwareMonitorLib.dll 路径
        
        优先使用 net8.0 版本（已替换正确版本的依赖 DLL），
        然后尝试 netstandard2.0 版本，
        最后回退到 net472 版本。
        """
        internal_dir = get_internal_dir()
        
        possible_paths = [
            internal_dir / "lib" / "LibreHardwareMonitorLib" / "runtimes" / "win-x64" / "lib" / "net8.0" / "LibreHardwareMonitorLib.dll",
            internal_dir / "backend" / "lib" / "LibreHardwareMonitorLib" / "runtimes" / "win-x64" / "lib" / "net8.0" / "LibreHardwareMonitorLib.dll",
            internal_dir / "lib" / "LibreHardwareMonitorLib" / "runtimes" / "win-x64" / "lib" / "netstandard2.0" / "LibreHardwareMonitorLib.dll",
            internal_dir / "backend" / "lib" / "LibreHardwareMonitorLib" / "runtimes" / "win-x64" / "lib" / "netstandard2.0" / "LibreHardwareMonitorLib.dll",
            internal_dir / "lib" / "LibreHardwareMonitor" / "LibreHardwareMonitorLib.dll",
            internal_dir / "backend" / "lib" / "LibreHardwareMonitor" / "LibreHardwareMonitorLib.dll",
        ]
        
        for path in possible_paths:
            if path.exists():
                logger.info(f"[HardwareMonitor] 找到 DLL: {path}")
                return path
        
        logger.warning("[HardwareMonitor] 未找到 LibreHardwareMonitorLib.dll")
        return None
    
    def _setup_assembly_resolve(self):
        """
        设置程序集解析事件，处理版本重定向
        
        解决 .NET 程序集版本不匹配问题：
        - LibreHardwareMonitorLib 需要 System.Threading.AccessControl 10.0.0.0
        - 但实际 DLL 版本可能是 10.0.0.3
        """
        try:
            import System
            from System.Reflection import Assembly
            
            internal_dir = get_internal_dir()
            
            assembly_names = [
                "System.Threading.AccessControl",
                "System.Security.AccessControl", 
                "System.Security.Principal.Windows",
                "System.Memory",
                "System.Buffers",
                "System.Numerics.Vectors",
                "System.Runtime.CompilerServices.Unsafe",
                "System.Threading.Tasks.Extensions",
                "Microsoft.Bcl.AsyncInterfaces",
                "Microsoft.Bcl.HashCode",
                "HidSharp",
                "DiskInfoToolkit",
                "RAMSPDToolkit-NDD",
                "BlackSharp.Core",
                "Microsoft.Win32.TaskScheduler",
            ]
            
            search_dirs = [
                internal_dir / "lib" / "librehardwaremonitorlib" / "runtimes" / "win-x64" / "lib" / "net8.0",
                internal_dir / "lib" / "LibreHardwareMonitor",
                internal_dir / "backend" / "lib" / "librehardwaremonitorlib" / "runtimes" / "win-x64" / "lib" / "net8.0",
                internal_dir / "backend" / "lib" / "LibreHardwareMonitor",
            ]
            
            def on_assembly_resolve(sender, args):
                name = args.Name
                logger.debug(f"[HardwareMonitor] AssemblyResolve 触发: {name}")
                for assembly_name in assembly_names:
                    if name.startswith(assembly_name):
                        for search_dir in search_dirs:
                            dll_path = search_dir / f"{assembly_name}.dll"
                            if dll_path.exists():
                                logger.info(f"[HardwareMonitor] AssemblyResolve: 加载 {assembly_name} from {dll_path}")
                                return Assembly.LoadFile(str(dll_path))
                return None
            
            System.AppDomain.CurrentDomain.AssemblyResolve += on_assembly_resolve
            logger.debug("[HardwareMonitor] 已注册 AssemblyResolve 事件处理程序")
            
        except Exception as e:
            logger.warning(f"[HardwareMonitor] 注册 AssemblyResolve 事件失败: {e}")
    
    def _init_hardware_monitor(self):
        """初始化 LibreHardwareMonitor"""
        try:
            import clr
            
            dll_path = self._find_dll_path()
            if not dll_path:
                self._init_error = "未找到 LibreHardwareMonitorLib.dll"
                logger.warning(f"[HardwareMonitor] {self._init_error}")
                return
            
            dll_dir = str(dll_path.parent)
            if dll_dir not in os.environ.get('PATH', ''):
                os.environ['PATH'] = dll_dir + os.pathsep + os.environ.get('PATH', '')
            
            internal_dir = get_internal_dir()
            fallback_dirs = [
                internal_dir / "lib" / "LibreHardwareMonitor",
                internal_dir / "backend" / "lib" / "LibreHardwareMonitor",
            ]
            for fallback_dir in fallback_dirs:
                if fallback_dir.exists():
                    fallback_str = str(fallback_dir)
                    if fallback_str not in os.environ.get('PATH', ''):
                        os.environ['PATH'] = fallback_str + os.pathsep + os.environ.get('PATH', '')
                        logger.debug(f"[HardwareMonitor] 添加依赖目录到 PATH: {fallback_str}")
                    break
            
            self._setup_assembly_resolve()
            
            clr.AddReference(str(dll_path))
            
            try:
                import System.Security.Principal
                identity = System.Security.Principal.WindowsIdentity.GetCurrent()
                if identity is not None:
                    logger.debug(f"[HardwareMonitor] WindowsIdentity: {identity.Name}")
                else:
                    logger.warning("[HardwareMonitor] WindowsIdentity.GetCurrent() 返回 null")
            except Exception as e:
                logger.warning(f"[HardwareMonitor] 获取 WindowsIdentity 失败: {e}")
            
            from LibreHardwareMonitor import Hardware
            
            self._computer = Hardware.Computer()
            self._computer.IsCpuEnabled = True
            self._computer.IsGpuEnabled = True
            self._computer.IsMemoryEnabled = False
            self._computer.IsStorageEnabled = False
            self._computer.IsNetworkEnabled = False
            self._computer.IsMotherboardEnabled = False
            self._computer.IsControllerEnabled = False
            self._computer.IsPsuEnabled = False
            self._computer.IsBatteryEnabled = False
            
            self._computer.Open()
            
            for hardware in self._computer.Hardware:
                hw_type = hardware.HardwareType
                if hw_type == Hardware.HardwareType.Cpu:
                    self._cpu = hardware
                    logger.debug(f"[HardwareMonitor] 检测到 CPU: {hardware.Name}")
                elif hw_type in [
                    Hardware.HardwareType.GpuNvidia,
                    Hardware.HardwareType.GpuAmd,
                    Hardware.HardwareType.GpuIntel
                ]:
                    self._gpu_list.append(hardware)
                    logger.debug(f"[HardwareMonitor] 检测到 GPU: {hardware.Name}")
            
            self._available = True
            logger.info(f"[HardwareMonitor] 初始化成功 - CPU: {self._cpu.Name if self._cpu else 'N/A'}, GPU 数量: {len(self._gpu_list)}")
            
        except ImportError as e:
            self._init_error = f"pythonnet 未安装: {e}"
            logger.warning(f"[HardwareMonitor] 初始化失败: {self._init_error}")
        except Exception as e:
            self._init_error = str(e)
            logger.warning(f"[HardwareMonitor] 初始化失败: {e}")
    
    def is_available(self) -> bool:
        """检查硬件监控是否可用"""
        return self._available
    
    def has_admin_privilege(self) -> bool:
        """检查是否有管理员权限"""
        return self._admin_privilege
    
    def get_init_error(self) -> Optional[str]:
        """获取初始化错误信息"""
        return self._init_error
    
    def get_cpu_temperature(self) -> Optional[float]:
        """获取 CPU 温度（摄氏度）"""
        if not self._available or not self._cpu:
            return None
        
        try:
            self._cpu.Update()
            
            package_temp = None
            core_temps = []
            
            for sensor in self._cpu.Sensors:
                sensor_type = str(sensor.SensorType)
                if sensor_type == 'Temperature':
                    sensor_name = sensor.Name
                    value = float(sensor.Value) if sensor.Value else None
                    
                    if value is None:
                        continue
                    
                    if 'Package' in sensor_name or 'Tdie' in sensor_name or 'Tctl' in sensor_name:
                        if package_temp is None or value > package_temp:
                            package_temp = value
                    elif 'Core' in sensor_name:
                        core_temps.append(value)
            
            if package_temp is not None:
                return round(package_temp, 1)
            
            if core_temps:
                return round(sum(core_temps) / len(core_temps), 1)
            
            return None
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 CPU 温度失败: {e}")
            return None
    
    def get_cpu_power(self) -> Optional[float]:
        """
        获取 CPU 功耗（瓦特）
        
        Returns:
            float|None: CPU Package 功耗（瓦特），不可用时返回 None
            
        Note:
            取 CPU Package 功耗，这是整个 CPU 插槽的实时瓦数
        """
        if not self._available or not self._cpu:
            return None
        
        try:
            self._cpu.Update()
            
            for sensor in self._cpu.Sensors:
                sensor_type = str(sensor.SensorType)
                if sensor_type == 'Power':
                    sensor_name = sensor.Name
                    value = sensor.Value
                    
                    if value is None:
                        continue
                    
                    if 'CPU Package' in sensor_name:
                        return round(float(value), 1)
            
            return None
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 CPU 功耗失败: {e}")
            return None
    
    def get_cpu_load(self) -> Optional[float]:
        """获取 CPU 总负载"""
        if not self._available or not self._cpu:
            return None
        
        try:
            self._cpu.Update()
            
            for sensor in self._cpu.Sensors:
                sensor_type = str(sensor.SensorType)
                if sensor_type == 'Load':
                    if 'Total' in sensor.Name or 'CPU Total' in sensor.Name:
                        value = sensor.Value
                        if value is not None:
                            return round(float(value), 1)
            
            return None
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 CPU 负载失败: {e}")
            return None
    
    def get_cpu_name(self) -> Optional[str]:
        """获取 CPU 名称"""
        if not self._available or not self._cpu:
            return None
        try:
            return str(self._cpu.Name) if self._cpu.Name else None
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 CPU 名称失败: {e}")
            return None
    
    def get_cpu_clock(self) -> Optional[float]:
        """
        获取 CPU 实时频率（MHz）
        
        Returns:
            float|None: CPU 核心频率（MHz），不可用时返回 None
            
        Note:
            优先取 P-Core #1 的频率作为代表
            降级取所有核心频率的平均值（排除 Bus Speed）
        """
        if not self._available or not self._cpu:
            return None
        
        try:
            self._cpu.Update()
            
            p_core_1_clock = None
            core_clocks = []
            
            for sensor in self._cpu.Sensors:
                sensor_type = str(sensor.SensorType)
                if sensor_type == 'Clock':
                    sensor_name = sensor.Name
                    value = sensor.Value
                    
                    if value is None or value <= 0:
                        continue
                    
                    if 'P-Core #1' in sensor_name:
                        p_core_1_clock = float(value)
                    
                    if 'Core' in sensor_name and 'Bus' not in sensor_name:
                        core_clocks.append(float(value))
            
            if p_core_1_clock is not None:
                return round(p_core_1_clock, 1)
            
            if core_clocks:
                return round(sum(core_clocks) / len(core_clocks), 1)
            
            return None
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 CPU 频率失败: {e}")
            return None
    
    def get_gpu_temperature(self) -> Optional[float]:
        """
        获取 GPU 核心温度（摄氏度）
        
        Note:
            精确匹配 "GPU Core" 传感器
        """
        if not self._available or not self._gpu_list:
            return None
        
        try:
            for gpu in self._gpu_list:
                gpu.Update()
                
                for sensor in gpu.Sensors:
                    sensor_type = str(sensor.SensorType)
                    if sensor_type == 'Temperature':
                        sensor_name = sensor.Name
                        value = sensor.Value
                        
                        if value is None:
                            continue
                        
                        if sensor_name == 'GPU Core':
                            return round(float(value), 1)
            
            return None
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 GPU 温度失败: {e}")
            return None
    
    def get_gpu_power(self) -> Optional[float]:
        """
        获取 GPU 功耗（瓦特）
        
        Note:
            精确匹配 "GPU Package" 传感器，代表整卡功耗
        """
        if not self._available or not self._gpu_list:
            return None
        
        try:
            for gpu in self._gpu_list:
                gpu.Update()
                
                for sensor in gpu.Sensors:
                    sensor_type = str(sensor.SensorType)
                    if sensor_type == 'Power':
                        sensor_name = sensor.Name
                        value = sensor.Value
                        
                        if value is None:
                            continue
                        
                        if sensor_name == 'GPU Package':
                            return round(float(value), 1)
            
            return None
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 GPU 功耗失败: {e}")
            return None
    
    def get_gpu_load(self) -> Optional[float]:
        """
        获取 GPU 核心负载（3D 负载）
        
        Note:
            精确匹配 "GPU Core" 传感器
        """
        if not self._available or not self._gpu_list:
            return None
        
        try:
            for gpu in self._gpu_list:
                gpu.Update()
                
                for sensor in gpu.Sensors:
                    sensor_type = str(sensor.SensorType)
                    if sensor_type == 'Load':
                        sensor_name = sensor.Name
                        value = sensor.Value
                        
                        if value is None:
                            continue
                        
                        if sensor_name == 'GPU Core':
                            return round(float(value), 1)
            
            return None
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 GPU 负载失败: {e}")
            return None
    
    def get_gpu_core_clock(self) -> Optional[float]:
        """
        获取 GPU 核心频率
        
        Note:
            精确匹配 "GPU Core" 传感器
        """
        if not self._available or not self._gpu_list:
            return None
        
        try:
            for gpu in self._gpu_list:
                gpu.Update()
                
                for sensor in gpu.Sensors:
                    sensor_type = str(sensor.SensorType)
                    if sensor_type == 'Clock':
                        sensor_name = sensor.Name
                        value = sensor.Value
                        
                        if value is None:
                            continue
                        
                        if sensor_name == 'GPU Core':
                            return round(float(value), 1)
            
            return None
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 GPU 核心频率失败: {e}")
            return None
    
    def get_gpu_memory_clock(self) -> Optional[float]:
        """
        获取 GPU 显存频率
        
        Note:
            精确匹配 "GPU Memory" 传感器
        """
        if not self._available or not self._gpu_list:
            return None
        
        try:
            for gpu in self._gpu_list:
                gpu.Update()
                
                for sensor in gpu.Sensors:
                    sensor_type = str(sensor.SensorType)
                    if sensor_type == 'Clock':
                        sensor_name = sensor.Name
                        value = sensor.Value
                        
                        if value is None:
                            continue
                        
                        if sensor_name == 'GPU Memory':
                            return round(float(value), 1)
            
            return None
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 GPU 显存频率失败: {e}")
            return None
    
    def get_gpu_memory_info(self) -> Optional[Dict]:
        """获取 GPU 显存信息"""
        if not self._available or not self._gpu_list:
            return None
        
        try:
            for gpu in self._gpu_list:
                gpu.Update()
                
                memory_used = None
                memory_total = None
                
                for sensor in gpu.Sensors:
                    sensor_type = str(sensor.SensorType)
                    sensor_name = sensor.Name
                    value = sensor.Value
                    
                    if value is None:
                        continue
                    
                    if sensor_type == 'SmallData':
                        if 'Used' in sensor_name or 'Memory Used' in sensor_name:
                            memory_used = float(value)
                        elif 'Total' in sensor_name or 'Memory Total' in sensor_name:
                            memory_total = float(value)
                    elif sensor_type == 'Data':
                        if 'Used' in sensor_name:
                            memory_used = float(value) * 1024
                        elif 'Total' in sensor_name:
                            memory_total = float(value) * 1024
                
                if memory_used is not None and memory_total is not None:
                    return {
                        "used_mb": round(memory_used, 1),
                        "total_mb": round(memory_total, 1),
                        "percent": round(memory_used / memory_total * 100, 1) if memory_total > 0 else 0
                    }
            
            return None
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 GPU 显存信息失败: {e}")
            return None
    
    def get_gpu_info(self) -> Optional[Dict]:
        """
        获取 GPU 基本信息
        
        Returns:
            dict|None: {"name": str, "vendor": str, "vram_total": int} 或 None
        """
        if not self._available or not self._gpu_list:
            return None
        
        try:
            gpu = self._gpu_list[0]
            gpu.Update()
            
            name = str(gpu.Name) if gpu.Name else "Unknown GPU"
            vendor = "Unknown"
            
            hw_type = str(gpu.HardwareType)
            if 'Nvidia' in hw_type:
                vendor = "NVIDIA"
            elif 'Amd' in hw_type:
                vendor = "AMD"
            elif 'Intel' in hw_type:
                vendor = "Intel"
            
            vram_total = 0
            for sensor in gpu.Sensors:
                sensor_type = str(sensor.SensorType)
                sensor_name = sensor.Name
                value = sensor.Value
                
                if value is None:
                    continue
                
                if sensor_type == 'SmallData' and 'Total' in sensor_name:
                    vram_total = int(float(value))
                    break
            
            return {
                "name": name,
                "vendor": vendor,
                "vram_total": vram_total
            }
            
        except Exception as e:
            logger.debug(f"[HardwareMonitor] 获取 GPU 信息失败: {e}")
            return None
    
    def close(self):
        """关闭硬件监控并释放 CLR 资源"""
        if self._closed:
            return
        
        self._closed = True
        
        if self._computer:
            try:
                self._computer.Close()
            except Exception:
                pass
        
        self._cpu = None
        self._gpu_list = []
        self._computer = None
        self._available = False


_hardware_monitor_instance: Optional[HardwareMonitor] = None


def get_hardware_monitor() -> HardwareMonitor:
    """获取 HardwareMonitor 单例实例"""
    global _hardware_monitor_instance
    if _hardware_monitor_instance is None:
        _hardware_monitor_instance = HardwareMonitor()
    return _hardware_monitor_instance
