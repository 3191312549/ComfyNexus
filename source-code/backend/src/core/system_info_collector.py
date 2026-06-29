"""
系统信息收集器
用于收集系统信息、硬件资源和软件依赖
"""

import subprocess
import platform
import json
import re
from typing import Dict

from ..utils.logger import app_logger as logger
from ..utils.python_command import PythonCommandBuilder


class SystemInfoCollector:
    """系统信息收集器"""
    
    def __init__(self):
        """初始化系统信息收集器"""
        pass
    
    def get_windows_version(self) -> str:
        """
        获取 Windows 版本
        
        Returns:
            str: Windows 版本信息
        """
        try:
            return platform.platform()
        except Exception as e:
            logger.error(f"[SystemInfoCollector] 获取 Windows 版本失败: {str(e)}")
            return "未知"
    
    def get_gpu_info(self) -> Dict:
        """
        获取 GPU 信息（型号和显存）
        
        Returns:
            dict: {"model": str, "vram": str}
        """
        try:
            # Windows 平台隐藏控制台窗口
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=name,memory.total', '--format=csv,noheader'],
                capture_output=True,
                text=True,
                timeout=5,
                creationflags=creation_flags
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                if lines:
                    parts = lines[0].split(',')
                    return {
                        "model": parts[0].strip() if len(parts) > 0 else "未知",
                        "vram": parts[1].strip() if len(parts) > 1 else "未知"
                    }
        except Exception as e:
            logger.debug(f"[SystemInfoCollector] 获取 GPU 信息失败: {str(e)}")
        
        return {"model": "未检测到", "vram": "N/A"}

    def get_cpu_info(self) -> Dict:
        """
        获取 CPU 信息（型号和内存）
        
        Returns:
            dict: {"model": str, "ram": str}
        """
        try:
            import psutil
            
            cpu_model = platform.processor()
            ram_total = psutil.virtual_memory().total / (1024 ** 3)  # GB
            
            return {
                "model": cpu_model if cpu_model else "未知",
                "ram": f"{ram_total:.1f} GB"
            }
        except Exception as e:
            logger.error(f"[SystemInfoCollector] 获取 CPU 信息失败: {str(e)}")
            return {"model": "未知", "ram": "未知"}
    
    def get_cuda_version(self) -> str:
        """
        获取 CUDA 版本
        
        Returns:
            str: CUDA 版本
        """
        try:
            # Windows 平台隐藏控制台窗口
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                ['nvidia-smi'],
                capture_output=True,
                text=True,
                timeout=5,
                creationflags=creation_flags
            )
            
            if result.returncode == 0:
                match = re.search(r'CUDA Version:\s*(\d+\.\d+)', result.stdout)
                if match:
                    return match.group(1)
        except Exception as e:
            logger.debug(f"[SystemInfoCollector] 获取 CUDA 版本失败: {str(e)}")
        
        return "未安装"
    
    def get_python_info(self, python_path: str) -> Dict:
        """
        获取 Python 信息（版本和路径）
        
        Args:
            python_path: Python 路径
            
        Returns:
            dict: {"version": str, "path": str}
        """
        try:
            builder = PythonCommandBuilder(python_path)
            cmd = [str(builder.python_exe), '--version']
            result = builder.run(cmd, timeout=5, use_proxy=False)
            
            if result.returncode == 0:
                version = result.stdout.strip().replace('Python ', '')
                return {
                    "version": version,
                    "path": str(builder.python_exe)
                }
        except Exception as e:
            logger.error(f"[SystemInfoCollector] 获取 Python 信息失败: {str(e)}")
        
        return {"version": "未知", "path": str(python_path)}
    
    def get_dependency_versions(self, python_path: str) -> Dict:
        """
        获取核心依赖版本
        
        Args:
            python_path: Python 路径
            
        Returns:
            dict: {包名: 版本}
        """
        try:
            builder = PythonCommandBuilder(python_path)
            cmd = builder.pip_list()
            result = builder.run(cmd, timeout=30, use_proxy=False)
            
            if result.returncode == 0:
                packages = json.loads(result.stdout)
                
                dependencies = {}
                key_packages = ['torch', 'torchvision', 'transformers', 'numpy', 'pillow']
                
                for pkg in packages:
                    pkg_name = pkg['name'].lower()
                    if pkg_name in key_packages:
                        dependencies[pkg_name] = pkg['version']
                
                for key in key_packages:
                    if key not in dependencies:
                        dependencies[key] = "未安装"
                
                return dependencies
        except Exception as e:
            logger.error(f"[SystemInfoCollector] 获取依赖版本失败: {str(e)}")
        
        return {
            "torch": "未安装",
            "torchvision": "未安装",
            "transformers": "未安装",
            "numpy": "未安装",
            "pillow": "未安装"
        }
    
    def collect_all_info(self, python_path: str = None) -> Dict:
        """
        收集所有系统信息
        
        Args:
            python_path: Python 路径（可选）
            
        Returns:
            dict: 完整的系统信息
        """
        info = {
            "windows_version": self.get_windows_version(),
            "gpu": self.get_gpu_info(),
            "cpu": self.get_cpu_info(),
            "cuda": {"version": self.get_cuda_version()}
        }
        
        if python_path:
            info["python"] = self.get_python_info(python_path)
            info["dependencies"] = self.get_dependency_versions(python_path)
        
        return info
