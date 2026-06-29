"""
Dependency detector for ComfyUI environments.

This module provides functionality to detect Python dependencies
in ComfyUI environments, including key dependencies like PyTorch, CUDA, etc.
"""

import os
import platform
import re
import subprocess
from pathlib import Path
from typing import Dict, List

from .types import DependencyInfo
from ...utils.logger import app_logger as logger


class DependencyDetector:
    """Detector for Python dependencies in ComfyUI environments."""
    
    def __init__(self):
        """Initialize the dependency detector."""
        self.key_dependencies = [
            "torch",  # PyTorch
            "sageattention",  # SageAttention
            "flash-attn",  # Flash Attention
            "triton",  # Triton
            "xformers",  # xFormers
        ]
    
    def get_dependencies(self, python_path: str) -> DependencyInfo:
        """
        Get dependency information from the Python environment.
        
        Args:
            python_path: The path to the Python executable or Python directory
            
        Returns:
            DependencyInfo with detected dependencies
        """
        info = DependencyInfo()
        
        # Normalize python_path to executable
        python_exe = self._normalize_python_path(python_path)
        if not python_exe:
            logger.warning(f"[DependencyDetector] Invalid Python path: {python_path}")
            return info
        
        # Get Python version
        info.python = self._get_python_version(python_exe)
        
        # Run pip list
        pip_list = self.run_pip_list(python_exe)
        if not pip_list:
            return info
        
        # Parse pip list
        dependencies = self.parse_pip_list(pip_list)
        
        # Detect key dependencies
        info.pytorch = dependencies.get("torch", "")
        info.sageattention = dependencies.get("sageattention", "")
        # flash-attn 可能显示为 flash-attn 或 flash_attn
        info.flash_attention = dependencies.get("flash-attn", "") or dependencies.get("flash_attn", "")
        info.xformers = dependencies.get("xformers", "")
        
        # Detect Triton (platform-specific)
        triton_package = "triton" if platform.system() != "Windows" else "triton-windows"
        info.triton = dependencies.get(triton_package, "")
        
        # Detect CUDA version from PyTorch
        info.cuda = self._detect_cuda_version(python_exe, dependencies)
        
        return info
    
    def _normalize_python_path(self, python_path: str) -> str:
        """
        Normalize Python path to executable.
        
        If python_path is a directory, try to find python.exe in it.
        If python_path is already an executable, return it.
        
        Args:
            python_path: The path to Python executable or directory
            
        Returns:
            Path to Python executable, or empty string if not found
        """
        if not python_path:
            return ""
        
        path = Path(python_path)
        
        # If it's already an executable file, return it
        if path.is_file() and path.suffix.lower() in ['.exe', '']:
            return str(path)
        
        # If it's a directory, try to find python.exe
        if path.is_dir():
            # Try common locations
            candidates = [
                path / "python.exe",  # Windows
                path / "python",  # Linux/Mac
                path / "bin" / "python.exe",  # Windows with bin folder
                path / "bin" / "python",  # Linux/Mac with bin folder
            ]
            
            for candidate in candidates:
                if candidate.is_file():
                    return str(candidate)
        
        # If nothing found, return the original path and let subprocess fail
        return python_path
    
    def run_pip_list(self, python_path: str) -> str:
        """
        Run pip list command and return the output.
        
        Args:
            python_path: The path to the Python executable
            
        Returns:
            pip list output or empty string on failure
        """
        try:
            # Windows 平台需要隐藏控制台窗口
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                [python_path, "-m", "pip", "list", "--format=freeze"],
                capture_output=True,
                text=True,
                timeout=30,
                creationflags=creation_flags
            )
            
            if result.returncode == 0:
                return result.stdout
            return ""
        except subprocess.TimeoutExpired:
            logger.warning(f"[DependencyDetector] pip list 命令超时")
            return ""
        except (OSError, subprocess.SubprocessError) as e:
            logger.warning(f"[DependencyDetector] pip list 执行失败: {e}")
            return ""
    
    def parse_pip_list(self, pip_list_output: str) -> Dict[str, str]:
        """
        Parse pip list output and return a dictionary of package versions.
        
        Args:
            pip_list_output: The output from pip list command
            
        Returns:
            Dictionary mapping package names to versions
        """
        dependencies = {}
        
        for line in pip_list_output.strip().split('\n'):
            if not line.strip():
                continue
            
            # Parse line like "torch==2.0.0"
            parts = line.split('==')
            if len(parts) == 2:
                package_name = parts[0].strip().lower()
                version = parts[1].strip()
                dependencies[package_name] = version
        
        return dependencies
    
    def detect_key_dependencies(self, python_path: str) -> Dict[str, str]:
        """
        Detect key dependencies in the Python environment.
        
        Args:
            python_path: The path to the Python executable
            
        Returns:
            Dictionary of key dependencies and their versions
        """
        dependencies = self.get_dependencies(python_path)
        
        return {
            "python": dependencies.python,
            "pytorch": dependencies.pytorch,
            "cuda": dependencies.cuda,
            "sageattention": dependencies.sageattention,
            "flash_attention": dependencies.flash_attention,
            "triton": dependencies.triton,
            "xformers": dependencies.xformers,
        }
    
    def _get_python_version(self, python_path: str) -> str:
        """
        Get Python version.
        
        Args:
            python_path: The path to the Python executable
            
        Returns:
            Python version string
        """
        try:
            # Windows 平台需要隐藏控制台窗口
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                [python_path, "--version"],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=creation_flags
            )
            
            if result.returncode == 0:
                # Parse version from output like "Python 3.10.0"
                output = result.stderr or result.stdout
                version = output.replace("Python ", "").strip()
                return version
            
            return ""
        except Exception:
            return ""
    
    def _detect_cuda_version(self, python_path: str, dependencies: Dict[str, str]) -> str:
        """
        Detect CUDA version from system nvcc.
        
        Args:
            python_path: The path to the Python executable (not used, kept for compatibility)
            dependencies: Dictionary of installed packages (not used, kept for compatibility)
            
        Returns:
            CUDA version string
        """
        try:
            # Windows 平台需要隐藏控制台窗口
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            # Try to get CUDA version from nvcc --version
            result = subprocess.run(
                ["nvcc", "--version"],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=creation_flags
            )
            
            if result.returncode == 0:
                # Parse version from output like:
                # "Cuda compilation tools, release 12.1, V12.1.105"
                output = result.stdout
                
                # Look for "release X.Y" pattern
                import re
                match = re.search(r'release\s+(\d+\.\d+)', output, re.IGNORECASE)
                if match:
                    return match.group(1)
                
                # Alternative pattern: "V12.1.105"
                match = re.search(r'V(\d+\.\d+)\.\d+', output)
                if match:
                    return match.group(1)
            
            return ""
        except FileNotFoundError:
            # nvcc not found in PATH
            return ""
        except Exception:
            return ""
