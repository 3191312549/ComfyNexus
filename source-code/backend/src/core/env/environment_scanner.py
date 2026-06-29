"""
Environment scanner for ComfyUI installations.

This module provides functionality to scan ComfyUI installations,
detect Python and pip directories, and detect available GPUs.
"""

import os
import platform
import subprocess
from pathlib import Path
from typing import List, Optional

from .environment_validator import EnvironmentValidator
from .types import EnvironmentInfo
from ...utils.logger import app_logger as logger


class EnvironmentScanner:
    """Scanner for ComfyUI environments."""
    
    def __init__(self, lang: str = "en"):
        """
        Initialize the environment scanner.
        
        Args:
            lang: Language code ("en" or "zh")
        """
        self.lang = lang
        self.validator = EnvironmentValidator(lang=lang)
        self.python_dir_names = ["python", "python_embeded"]
    
    def scan(self, path: str) -> EnvironmentInfo:
        """
        Scan a ComfyUI environment and return detailed information.
        
        Args:
            path: The path to the ComfyUI installation
            
        Returns:
            EnvironmentInfo with scan results
        """
        # First validate the environment
        info = self.validator.validate_environment(path)
        if not info.is_valid:
            return info
        
        # Detect available GPUs
        info.available_gpus = self.detect_available_gpus()
        
        return info
    
    def detect_python_directory(self, path: str, env_type: str = "portable", desktop_data_path: str = "") -> Optional[str]:
        """
        Detect Python directory in the ComfyUI installation.
        
        Args:
            path: The path to the ComfyUI installation
            env_type: Environment type ("desktop" / "portable" / "unknown")
            desktop_data_path: Desktop data path (for desktop version)
            
        Returns:
            Path to Python directory or None
        """
        path_obj = Path(path)
        
        # 桌面版：从数据目录的 .venv 中检测
        if env_type == "desktop" and desktop_data_path:
            venv_path = Path(desktop_data_path) / ".venv"
            if venv_path.exists():
                # Windows: .venv/Scripts/python.exe
                # Linux/Mac: .venv/bin/python
                if platform.system() == "Windows":
                    python_exe = venv_path / "Scripts" / "python.exe"
                    scripts_dir = venv_path / "Scripts"
                else:
                    python_exe = venv_path / "bin" / "python"
                    scripts_dir = venv_path / "bin"
                
                if python_exe.exists():
                    return str(scripts_dir)
        
        # 便携版：检测 python_embeded 目录
        # Check common Python directory names in current directory
        for dir_name in self.python_dir_names:
            python_dir = path_obj / dir_name
            if python_dir.exists() and python_dir.is_dir():
                # Check for python.exe (Windows) or python (Linux/Mac)
                for exe_name in ["python.exe", "python"]:
                    python_exe = python_dir / exe_name
                    if python_exe.exists() and python_exe.is_file():
                        return str(python_dir)
        
        # Check parent directory (for portable installations)
        parent_path = path_obj.parent
        for dir_name in self.python_dir_names:
            python_dir = parent_path / dir_name
            if python_dir.exists() and python_dir.is_dir():
                # Check for python.exe (Windows) or python (Linux/Mac)
                for exe_name in ["python.exe", "python"]:
                    python_exe = python_dir / exe_name
                    if python_exe.exists() and python_exe.is_file():
                        return str(python_dir)
        
        # unknown 类型：尝试所有可能的路径
        if env_type == "unknown":
            # 尝试 .venv
            venv_path = path_obj / ".venv"
            if venv_path.exists():
                if platform.system() == "Windows":
                    python_exe = venv_path / "Scripts" / "python.exe"
                    scripts_dir = venv_path / "Scripts"
                else:
                    python_exe = venv_path / "bin" / "python"
                    scripts_dir = venv_path / "bin"
                
                if python_exe.exists():
                    return str(scripts_dir)
        
        return None
    
    def detect_pip_directory(self, python_path: str) -> Optional[str]:
        """
        Detect pip directory based on Python path.
        
        Args:
            python_path: The path to the Python directory or executable
            
        Returns:
            Path to pip executable or None
        """
        try:
            python_dir = Path(python_path)
            
            # If python_path is a directory, find python.exe
            if python_dir.is_dir():
                python_exe = python_dir / ("python.exe" if platform.system() == "Windows" else "python")
            else:
                python_exe = python_dir
            
            if not python_exe.exists():
                return None
            
            # Check for pip.exe in Scripts directory (Windows)
            if platform.system() == "Windows":
                scripts_dir = python_exe.parent / "Scripts"
                pip_exe = scripts_dir / "pip.exe"
                if pip_exe.exists():
                    return str(pip_exe)
            
            # Check for pip in the same directory as python
            pip_exe = python_exe.parent / ("pip.exe" if platform.system() == "Windows" else "pip")
            if pip_exe.exists():
                return str(pip_exe)
            
            # Try to find pip using python -m pip
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                [str(python_exe), "-m", "pip", "--version"],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=creation_flags
            )
            
            if result.returncode == 0:
                # pip is available via python -m pip
                # Return the Scripts directory path if it exists
                if platform.system() == "Windows":
                    scripts_dir = python_exe.parent / "Scripts"
                    if scripts_dir.exists():
                        return str(scripts_dir / "pip.exe")
                
                # Otherwise return python directory with pip command
                return str(python_exe.parent / ("pip.exe" if platform.system() == "Windows" else "pip"))
            
            return None
        except Exception as e:
            logger.debug(f"[detect_pip_directory] Error: {e}")
            return None
    
    def detect_available_gpus(self) -> List[int]:
        """
        Detect available GPUs.
        
        Returns:
            List of GPU IDs
        """
        gpus = []
        
        try:
            # Try to use nvidia-smi to detect GPUs
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=index", "--format=csv,noheader"],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=creation_flags
            )
            
            if result.returncode == 0:
                # Parse GPU IDs
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        try:
                            gpu_id = int(line.strip())
                            gpus.append(gpu_id)
                        except ValueError:
                            pass
        except subprocess.TimeoutExpired:
            logger.debug("[detect_available_gpus] nvidia-smi 命令超时")
        except FileNotFoundError:
            logger.debug("[detect_available_gpus] nvidia-smi 未找到")
        except (OSError, subprocess.SubprocessError) as e:
            logger.debug(f"[detect_available_gpus] GPU 检测失败: {e}")
        
        # If no GPUs detected, assume GPU 0 is available (for testing)
        if not gpus:
            gpus = [0]
        
        return gpus
    
    def scan_environment(self, path: str, env_type: str = "portable", desktop_data_path: str = "") -> dict:
        """
        Scan a ComfyUI environment and return all detected information.
        
        Args:
            path: The path to the ComfyUI installation
            env_type: Environment type ("desktop" / "portable" / "unknown")
            desktop_data_path: Desktop data path (for desktop version)
            
        Returns:
            Dictionary with scan results
        """
        # 防呆策略：如果用户选择的目录下没有 main.py，尝试查找子目录 ComfyUI
        path_obj = Path(path)
        main_py = path_obj / "main.py"
        
        if not main_py.exists():
            # 尝试在 ComfyUI 子目录中查找
            comfyui_subdir = path_obj / "ComfyUI"
            comfyui_main_py = comfyui_subdir / "main.py"
            
            if comfyui_main_py.exists():
                # 找到了！使用 ComfyUI 子目录作为实际路径
                logger.info(f"[scan_environment] 在子目录中找到 ComfyUI: {comfyui_subdir}")
                path = str(comfyui_subdir)
                path_obj = comfyui_subdir
            # 如果子目录也没有，继续执行，让后续的验证逻辑报错
        
        # Scan the environment
        info = self.scan(path)
        
        # Detect Python directory (with env_type and desktop_data_path)
        python_dir = self.detect_python_directory(path, env_type, desktop_data_path)
        
        # Detect pip directory
        pip_dir = None
        if python_dir:
            python_exe = Path(python_dir) / ("python.exe" if platform.system() == "Windows" else "python")
            pip_dir = self.detect_pip_directory(str(python_exe))
        
        return {
            "is_valid": info.is_valid,
            "python_version": info.python_version,
            "comfyui_version": info.comfyui_version,
            "python_directory": python_dir,
            "pip_directory": pip_dir,
            "available_gpus": info.available_gpus,
            "error_message": info.error_message,
        }
