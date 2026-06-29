"""
计算设备检测器模块

此模块负责检测系统中的所有计算设备（GPU 和 CPU），
并识别设备类型以便生成对应的 ComfyUI 启动参数。
"""

import subprocess
import json
import platform
from typing import List, Dict, Any, Optional

from .types import ComputeDevice, PyTorchBackend
from ...utils.logger import app_logger as logger


class DeviceDetector:
    """计算设备检测器"""
    
    # PowerShell 命令：获取所有显卡信息
    POWERSHELL_COMMAND = """
    $cards = @(Get-WmiObject Win32_VideoController)
    $result = @()
    for ($i=0; $i -lt $cards.Count; $i++) {
        $gpu = $cards[$i]
        $result += [PSCustomObject]@{
            "Index" = $i
            "Name" = $gpu.Name
            "Driver" = $gpu.DriverVersion
        }
    }
    $result | ConvertTo-Json
    """
    
    def detect_devices(self) -> List[ComputeDevice]:
        """
        检测所有计算设备（仅 GPU，不包括 CPU）
        
        Returns:
            ComputeDevice 对象列表
        """
        devices = []
        
        try:
            # 检测 NVIDIA GPU
            nvidia_devices = self._detect_nvidia_gpus()
            devices.extend(nvidia_devices)
            
            # 检测 AMD GPU
            amd_devices = self._detect_amd_gpus()
            devices.extend(amd_devices)
            
            # 检测 Intel GPU
            intel_devices = self._detect_intel_gpus()
            devices.extend(intel_devices)
            
            # 注意：不再添加 CPU 设备，因为 CPU 选项在前端单独处理
            
            logger.info(f"[DeviceDetector] 检测到 {len(devices)} 个 GPU 设备")
            return devices
            
        except Exception as e:
            logger.error(f"[DeviceDetector] 设备检测失败: {e}")
            return []
    
    def _detect_nvidia_gpus(self) -> List[ComputeDevice]:
        """检测 NVIDIA GPU"""
        devices = []
        try:
            # 尝试使用 nvidia-smi
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=index,name,driver_version,memory.total", "--format=csv,noheader,nounits"],
                capture_output=True,
                text=True,
                timeout=5,
                creationflags=creation_flags
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    parts = [p.strip() for p in line.split(',')]
                    if len(parts) >= 4:
                        devices.append(ComputeDevice(
                            index=int(parts[0]),
                            name=parts[1],
                            type="nvidia",
                            driver=parts[2],
                            memory=int(float(parts[3]))
                        ))
        except FileNotFoundError:
            logger.debug("[DeviceDetector] nvidia-smi 未找到，跳过 NVIDIA GPU 检测")
        except subprocess.TimeoutExpired:
            logger.debug("[DeviceDetector] nvidia-smi 命令超时，跳过 NVIDIA GPU 检测")
        except Exception as e:
            logger.warning(f"[DeviceDetector] NVIDIA GPU 检测失败: {e}")
        
        return devices
    
    def _detect_amd_gpus(self) -> List[ComputeDevice]:
        """检测 AMD GPU
        
        使用独立编号（仅对 AMD GPU 计数），与 ROCm/HIP 运行时的设备枚举索引一致。
        ROCm 版 PyTorch 的 torch.cuda 仅可见 AMD GPU，因此独立编号与 HIP 索引对应。
        注意：此索引不适用于 DirectML（DirectML 使用全局设备枚举，包含所有 D3D12 设备）。
        """
        devices = []
        try:
            output = self._execute_powershell(self.POWERSHELL_COMMAND)
            gpu_list = json.loads(output)
            
            if isinstance(gpu_list, dict):
                gpu_list = [gpu_list]
            
            amd_index = 0
            for gpu in gpu_list:
                name = gpu.get("Name", "")
                if "amd" in name.lower() or "radeon" in name.lower():
                    devices.append(ComputeDevice(
                        index=amd_index,
                        name=name,
                        type="amd",
                        driver=gpu.get("Driver", "Unknown")
                    ))
                    amd_index += 1
        except Exception as e:
            logger.warning(f"[DeviceDetector] AMD GPU 检测失败: {e}")
        
        return devices
    
    def _detect_intel_gpus(self) -> List[ComputeDevice]:
        """检测 Intel GPU"""
        devices = []
        try:
            output = self._execute_powershell(self.POWERSHELL_COMMAND)
            gpu_list = json.loads(output)
            
            if isinstance(gpu_list, dict):
                gpu_list = [gpu_list]
            
            intel_index = 0
            for gpu in gpu_list:
                name = gpu.get("Name", "")
                if "intel" in name.lower():
                    device_type = "intel-arc" if "arc" in name.lower() else "intel"
                    devices.append(ComputeDevice(
                        index=intel_index,
                        name=name,
                        type=device_type,
                        driver=gpu.get("Driver", "Unknown")
                    ))
                    intel_index += 1
        except Exception as e:
            logger.warning(f"[DeviceDetector] Intel GPU 检测失败: {e}")
        
        return devices
    
    def _get_cpu_device(self) -> ComputeDevice:
        """获取 CPU 设备信息"""
        from ...utils.subprocess_utils import run_powershell_command
        
        try:
            ps_command = "(Get-CimInstance -ClassName Win32_Processor).Name"
            result = run_powershell_command(ps_command, timeout=5)
            
            if result and result.returncode == 0:
                cpu_name = result.stdout.strip()
                if cpu_name:
                    return ComputeDevice(
                        index=-1,
                        name=cpu_name,
                        type="cpu",
                        driver="N/A"
                    )
        except RuntimeError as e:
            logger.warning(f"[DeviceDetector] PowerShell 未找到: {e}")
        except Exception as e:
            logger.warning(f"[DeviceDetector] CPU 信息获取失败: {e}")
        
        return ComputeDevice(
            index=-1,
            name="CPU",
            type="cpu",
            driver="N/A"
        )
    
    @staticmethod
    def get_compute_devices() -> List[Dict[str, Any]]:
        """
        获取所有计算设备列表（向后兼容方法）
        
        Returns:
            设备列表，例如：
            [
                {
                    "index": 0,
                    "name": "Intel(R) UHD Graphics 630",
                    "type": "intel",
                    "driver": "27.20.100.9316"
                },
                {
                    "index": 1,
                    "name": "NVIDIA GeForce RTX 4090",
                    "type": "nvidia",
                    "driver": "31.0.15.3623"
                }
            ]
        """
        detector = DeviceDetector()
        devices = detector.detect_devices()
        return [device.to_dict() for device in devices]

    def detect_pytorch_backend(self, python_path: str) -> PyTorchBackend:
        """
        检测指定 Python 环境中的 PyTorch 后端类型

        通过运行临时脚本获取版本和后端信息

        Args:
            python_path: Python 可执行文件路径

        Returns:
            PyTorchBackend 对象
        """
        import tempfile
        from pathlib import Path

        python_exe = Path(python_path)
        if python_exe.is_dir():
            python_exe = python_exe / "python.exe"

        if not python_exe.exists():
            return PyTorchBackend(
                backend="none",
                error=f"Python 路径不存在: {python_path}"
            )

        detection_script = (
            "ver=''\n"
            "cuda_avail=False\n"
            "xpu_avail=False\n"
            "ipex_installed=False\n"
            "err=''\n"
            "try:\n"
            "    import torch\n"
            "    ver=torch.__version__\n"
            "    cuda_avail=torch.cuda.is_available()\n"
            "    try:\n"
            "        xpu_avail=torch.xpu.is_available()\n"
            "    except Exception:\n"
            "        xpu_avail=False\n"
            "    try:\n"
            "        import intel_extension_for_pytorch as ipex\n"
            "        ipex_installed=True\n"
            "    except ImportError:\n"
            "        ipex_installed=False\n"
            "except ImportError:\n"
            "    err='PyTorch 未安装'\n"
            "except Exception as e:\n"
            "    err=str(e)\n"
            "print(f'{ver}|{cuda_avail}|{xpu_avail}|{ipex_installed}|{err}')"
        )

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode='w', suffix='.py', delete=False, encoding='utf-8'
            ) as f:
                f.write(detection_script)
                tmp_path = f.name

            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW

            result = subprocess.run(
                [str(python_exe), tmp_path],
                capture_output=True,
                text=True,
                timeout=30,
                creationflags=creation_flags
            )

            if result.returncode != 0:
                stderr = result.stderr.strip()
                return PyTorchBackend(
                    backend="none",
                    error=f"检测脚本执行失败: {stderr[:200]}"
                )

            output = result.stdout.strip()
            if not output:
                return PyTorchBackend(
                    backend="none",
                    error="检测脚本无输出"
                )

            parts = output.split("|")
            if len(parts) < 5:
                return PyTorchBackend(
                    backend="unknown",
                    torch_version=output,
                    error="输出格式异常"
                )

            torch_version = parts[0]
            cuda_available = parts[1].lower() == "true"
            xpu_available = parts[2].lower() == "true"
            ipex_installed = parts[3].lower() == "true"
            error_msg = parts[4] if len(parts) > 4 else ""

            if error_msg and "未安装" in error_msg:
                return PyTorchBackend(
                    backend="none",
                    torch_version="",
                    error=error_msg
                )

            backend = self._classify_backend(torch_version, cuda_available, xpu_available, ipex_installed)

            return PyTorchBackend(
                backend=backend,
                torch_version=torch_version,
                cuda_available=cuda_available,
                xpu_available=xpu_available,
                ipex_installed=ipex_installed,
                error=None if not error_msg else error_msg
            )

        except subprocess.TimeoutExpired:
            return PyTorchBackend(
                backend="unknown",
                error="检测超时（30秒）"
            )
        except Exception as e:
            return PyTorchBackend(
                backend="unknown",
                error=f"检测失败: {str(e)}"
            )
        finally:
            if tmp_path:
                try:
                    import os
                    os.unlink(tmp_path)
                except OSError:
                    pass

    @staticmethod
    def _classify_backend(torch_version: str, cuda_available: bool, xpu_available: bool, ipex_installed: bool = False) -> str:
        """
        根据 torch 版本字符串和可用性判断后端类型

        Args:
            torch_version: torch.__version__ 字符串
            cuda_available: torch.cuda.is_available()
            xpu_available: torch.xpu.is_available()
            ipex_installed: intel_extension_for_pytorch 是否已安装

        Returns:
            后端类型: "cuda" | "rocm" | "xpu" | "cuda_with_ipex" | "none" | "unknown"
        """
        ver_lower = torch_version.lower()

        if "rocm" in ver_lower:
            return "rocm"

        if "+cu" in ver_lower or "+cuda" in ver_lower:
            if ipex_installed and xpu_available:
                return "cuda_with_ipex"
            return "cuda"

        if "cpu" in ver_lower and not cuda_available and not xpu_available:
            return "none"

        if xpu_available and not cuda_available:
            return "xpu"

        if cuda_available:
            if ipex_installed and xpu_available:
                return "cuda_with_ipex"
            return "cuda"

        if xpu_available:
            return "xpu"

        return "unknown"

    @staticmethod
    def filter_devices_by_backend(
        devices: List[ComputeDevice],
        backend: PyTorchBackend
    ) -> List[ComputeDevice]:
        """
        根据 PyTorch 后端类型过滤设备列表，标记兼容性

        Args:
            devices: 所有硬件 GPU 设备列表
            backend: PyTorch 后端信息

        Returns:
            标记了兼容性的设备列表
        """
        backend_type = backend.backend

        if backend_type == "unknown":
            for device in devices:
                device.compatible = True
                device.incompatibility_reason = ""
            return devices

        if backend_type == "none":
            for device in devices:
                device.compatible = False
                device.incompatibility_reason = "当前环境未安装 PyTorch，无法使用 GPU"
            return devices

        for device in devices:
            is_nvidia = device.type == "nvidia"
            is_amd = device.type == "amd"
            is_intel = device.type in ("intel", "intel-arc")

            if backend_type == "cuda_with_ipex":
                if is_nvidia:
                    device.compatible = True
                    device.incompatibility_reason = "⚠️ 已安装 intel-extension-for-pytorch (ipex)，ComfyUI 可能优先使用 Intel GPU 而非 NVIDIA GPU"
                elif is_intel:
                    device.compatible = True
                    device.incompatibility_reason = ""
                elif is_amd:
                    device.compatible = False
                    device.incompatibility_reason = "当前环境安装的是 CUDA 版 PyTorch，不支持 AMD GPU。请安装 ROCm 版 PyTorch。"
                else:
                    device.compatible = False
                    device.incompatibility_reason = f"当前 PyTorch 后端不支持 {device.type} 设备"

            elif backend_type == "cuda":
                if is_nvidia:
                    device.compatible = True
                    device.incompatibility_reason = ""
                elif is_amd:
                    device.compatible = False
                    device.incompatibility_reason = "当前环境安装的是 CUDA 版 PyTorch，不支持 AMD GPU。请安装 ROCm 版 PyTorch。"
                elif is_intel:
                    device.compatible = False
                    device.incompatibility_reason = "当前环境安装的是 CUDA 版 PyTorch，未安装 intel-extension-for-pytorch (ipex)，无法使用 Intel GPU。请安装 ipex 或切换到 XPU 版 PyTorch。"
                else:
                    device.compatible = False
                    device.incompatibility_reason = f"当前 PyTorch 后端不支持 {device.type} 设备"

            elif backend_type == "rocm":
                if is_amd:
                    device.compatible = True
                    device.incompatibility_reason = ""
                elif is_nvidia:
                    device.compatible = False
                    device.incompatibility_reason = "当前环境安装的是 ROCm 版 PyTorch，不支持 NVIDIA GPU。请安装 CUDA 版 PyTorch。"
                elif is_intel:
                    device.compatible = False
                    device.incompatibility_reason = "当前环境安装的是 ROCm 版 PyTorch，不支持 Intel GPU。请安装 XPU 版 PyTorch。"
                else:
                    device.compatible = False
                    device.incompatibility_reason = f"当前 PyTorch 后端不支持 {device.type} 设备"

            elif backend_type == "xpu":
                if is_intel:
                    device.compatible = True
                    device.incompatibility_reason = ""
                elif is_nvidia:
                    device.compatible = False
                    device.incompatibility_reason = "当前环境安装的是 XPU 版 PyTorch，不支持 NVIDIA GPU。请安装 CUDA 版 PyTorch。"
                elif is_amd:
                    device.compatible = False
                    device.incompatibility_reason = "当前环境安装的是 XPU 版 PyTorch，不支持 AMD GPU。请安装 ROCm 版 PyTorch。"
                else:
                    device.compatible = False
                    device.incompatibility_reason = f"当前 PyTorch 后端不支持 {device.type} 设备"

        return devices
    
    @staticmethod
    def _execute_powershell(command: str) -> str:
        """执行 PowerShell 命令"""
        from ...utils.subprocess_utils import run_powershell_command
        
        result = run_powershell_command(command, timeout=10)
        
        if not result or result.returncode != 0:
            stderr = result.stderr if result else "PowerShell 未找到"
            raise RuntimeError(f"PowerShell 执行失败: {stderr}")
        
        return result.stdout.strip()
    
    @staticmethod
    def _detect_device_type(name: str) -> str:
        """
        根据设备名称识别设备类型
        
        Args:
            name: 设备名称
            
        Returns:
            设备类型：'nvidia' | 'amd' | 'intel-arc' | 'intel' | 'unknown'
        """
        name_lower = name.lower()
        
        # NVIDIA 显卡
        if "nvidia" in name_lower:
            return "nvidia"
        
        # AMD 显卡
        if "amd" in name_lower or "radeon" in name_lower:
            return "amd"
        
        # Intel 显卡
        if "intel" in name_lower:
            # Intel Arc 独显
            if "arc" in name_lower:
                return "intel-arc"
            # Intel 集显
            else:
                return "intel"
        
        # 未知类型
        return "unknown"
