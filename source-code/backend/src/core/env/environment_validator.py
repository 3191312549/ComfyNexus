"""
Environment validator for ComfyUI installations.

This module provides functionality to validate ComfyUI installations,
including path validation, file structure validation, and version detection.
"""

import os
import platform
import re
import subprocess
from pathlib import Path
from typing import Optional, Tuple

from .error_codes import ErrorCode
from .types import EnvironmentInfo


class EnvironmentValidator:
    """Validator for ComfyUI environments."""
    
    def __init__(self, lang: str = "en"):
        """
        Initialize the environment validator.
        
        Args:
            lang: Language code ("en" or "zh")
        """
        self.lang = lang
        self.required_files = ["main.py"]
        self.required_dirs = []  # 移除目录验证，所有目录都可以外置或自动创建
        self.python_dir_names = ["python", "python_embeded"]
        
        # Error messages
        self.messages = {
            "en": {
                "path_not_exist": "Path does not exist",
                "path_not_dir": "Path is not a directory",
                "path_validation_error": "Path validation error: {error}",
                "file_not_found": "Required file not found: {file}",
                "dir_not_found": "Required directory not found: {dir}",
                "python_not_found": "Python executable not found",
                "python_not_file": "Python path is not a file",
                "python_check_failed": "Python version check failed: {error}",
                "python_timeout": "Python version check timeout",
                "python_validation_error": "Python validation error: {error}",
            },
            "zh": {
                "path_not_exist": "路径不存在",
                "path_not_dir": "路径不是目录",
                "path_validation_error": "路径验证错误: {error}",
                "file_not_found": "缺少必需文件: {file}",
                "dir_not_found": "缺少必需目录: {dir}",
                "python_not_found": "未找到 Python 可执行文件",
                "python_not_file": "Python 路径不是文件",
                "python_check_failed": "Python 版本检查失败: {error}",
                "python_timeout": "Python 版本检查超时",
                "python_validation_error": "Python 验证错误: {error}",
            }
        }
    
    def _get_message(self, key: str, **kwargs) -> str:
        """Get localized message."""
        messages = self.messages.get(self.lang, self.messages["en"])
        message = messages.get(key, key)
        return message.format(**kwargs) if kwargs else message
    
    def validate_path(self, path: str) -> Tuple[bool, str]:
        """
        Validate if the given path exists and is accessible.
        
        Args:
            path: The path to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            path_obj = Path(path)
            if not path_obj.exists():
                return False, self._get_message("path_not_exist")
            if not path_obj.is_dir():
                return False, self._get_message("path_not_dir")
            return True, ""
        except Exception as e:
            return False, self._get_message("path_validation_error", error=str(e))
    
    def validate_comfyui_installation(self, path: str) -> Tuple[bool, str]:
        """
        Validate if the given path is a valid ComfyUI installation.
        
        Args:
            path: The path to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # First validate the path
        is_valid, error_msg = self.validate_path(path)
        if not is_valid:
            return False, error_msg
        
        path_obj = Path(path)
        
        # Check for required files
        for file_name in self.required_files:
            file_path = path_obj / file_name
            if not file_path.exists():
                return False, self._get_message("file_not_found", file=file_name)
        
        # Check for required directories
        for dir_name in self.required_dirs:
            dir_path = path_obj / dir_name
            if not dir_path.exists() or not dir_path.is_dir():
                return False, self._get_message("dir_not_found", dir=dir_name)
        
        return True, ""
    
    def validate_python_environment(self, python_path: str) -> Tuple[bool, str]:
        """
        Validate if the given path is a valid Python environment.
        
        Args:
            python_path: The path to the Python executable
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            python_exe = Path(python_path)
            if not python_exe.exists():
                return False, self._get_message("python_not_found")
            if not python_exe.is_file():
                return False, self._get_message("python_not_file")
            
            # Try to run python --version
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                [str(python_exe), "--version"],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=creation_flags
            )
            
            if result.returncode != 0:
                return False, self._get_message("python_check_failed", error=result.stderr)
            
            return True, ""
        except subprocess.TimeoutExpired:
            return False, self._get_message("python_timeout")
        except Exception as e:
            return False, self._get_message("python_validation_error", error=str(e))
    
    def get_version_info(self, path: str) -> Tuple[str, str]:
        """
        Get version information for ComfyUI and Python.
        
        Args:
            path: The path to the ComfyUI installation
            
        Returns:
            Tuple of (comfyui_version, python_version)
        """
        comfyui_version = ""
        python_version = ""
        
        # Try to get ComfyUI version from version.txt or __init__.py
        path_obj = Path(path)
        
        # Check version.txt
        version_file = path_obj / "version.txt"
        if version_file.exists():
            try:
                with open(version_file, 'r', encoding='utf-8') as f:
                    comfyui_version = f.read().strip()
            except Exception:
                pass
        
        # Check __init__.py
        if not comfyui_version:
            init_file = path_obj / "__init__.py"
            if init_file.exists():
                try:
                    with open(init_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Look for version pattern
                        match = re.search(r'__version__\s*=\s*["\']([^"\']+)["\']', content)
                        if match:
                            comfyui_version = match.group(1)
                except Exception:
                    pass
        
        # Try to find Python and get its version
        python_exe = self._find_python_executable(path)
        if python_exe:
            try:
                creation_flags = 0
                if platform.system() == "Windows":
                    creation_flags = subprocess.CREATE_NO_WINDOW
                
                result = subprocess.run(
                    [str(python_exe), "--version"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    creationflags=creation_flags
                )
                if result.returncode == 0:
                    # Parse version from output like "Python 3.10.0"
                    match = re.search(r'Python\s+(\d+\.\d+\.\d+)', result.stderr or result.stdout)
                    if match:
                        python_version = match.group(1)
            except Exception:
                pass
        
        return comfyui_version, python_version
    
    def _find_python_executable(self, path: str) -> Optional[Path]:
        """
        Find Python executable in the ComfyUI installation.
        
        Args:
            path: The path to the ComfyUI installation
            
        Returns:
            Path to Python executable or None
        """
        path_obj = Path(path)
        
        # Check common Python directory names
        for dir_name in self.python_dir_names:
            python_dir = path_obj / dir_name
            if python_dir.exists() and python_dir.is_dir():
                # Check for python.exe (Windows) or python (Linux/Mac)
                for exe_name in ["python.exe", "python"]:
                    python_exe = python_dir / exe_name
                    if python_exe.exists() and python_exe.is_file():
                        return python_exe
        
        return None
    
    def validate_environment(self, path: str) -> EnvironmentInfo:
        """
        Validate a ComfyUI environment and return detailed information.
        
        Args:
            path: The path to the ComfyUI installation
            
        Returns:
            EnvironmentInfo with validation results
        """
        info = EnvironmentInfo(is_valid=False)
        
        # Validate ComfyUI installation
        is_valid, error_msg = self.validate_comfyui_installation(path)
        if not is_valid:
            info.error_message = error_msg
            return info
        
        # Get version information
        comfyui_version, python_version = self.get_version_info(path)
        info.comfyui_version = comfyui_version
        info.python_version = python_version
        
        # Find Python executable
        python_exe = self._find_python_executable(path)
        if python_exe:
            # Validate Python environment
            is_valid, error_msg = self.validate_python_environment(str(python_exe))
            if not is_valid:
                info.error_message = error_msg
                return info
        
        info.is_valid = True
        return info

    
    def validate_acceleration_settings(self, config: dict) -> dict:
        """
        验证加速配置设置
        
        Args:
            config: 加速配置字典
            
        Returns:
            验证结果字典
        """
        errors = []
        
        # 验证端口范围
        port = config.get("port", 8188)
        if not (1024 <= port <= 65535):
            errors.append({
                "field": "port",
                "value": port,
                "message": "端口号必须在 1024-65535 范围内"
            })
        
        # 验证 reserve_vram
        reserve_vram = config.get("reserve_vram", 0.5)
        if reserve_vram < 0:
            errors.append({
                "field": "reserve_vram",
                "value": reserve_vram,
                "message": "预留显存必须大于等于 0"
            })
        
        # 验证 cache_lru
        cache_lru = config.get("cache_lru", 0)
        if cache_lru < 0:
            errors.append({
                "field": "cache_lru",
                "value": cache_lru,
                "message": "LRU 缓存大小必须大于等于 0"
            })
        
        # 验证 preview_size
        preview_size = config.get("preview_size", 512)
        if not (128 <= preview_size <= 2048):
            errors.append({
                "field": "preview_size",
                "value": preview_size,
                "message": "预览图大小必须在 128-2048 范围内"
            })
        
        # 验证 compute_device 格式
        compute_device = config.get("compute_device", "")
        valid_prefixes = ["gpu:", "nvidia:", "intel:", "intel-arc:", "amd:", "auto"]
        is_valid = (
            compute_device == "cpu" or
            compute_device == "" or
            any(compute_device.startswith(prefix) for prefix in valid_prefixes)
        )
        if not is_valid:
            errors.append({
                "field": "compute_device",
                "value": compute_device,
                "message": "计算设备格式必须为 'nvidia:N', 'intel:N', 'amd:N', 'cpu' 或 'auto'"
            })
        
        # 验证路径字段
        path_fields = [
            "base_directory", "input_directory", "output_directory",
            "temp_directory", "user_directory", "tls_keyfile", "tls_certfile"
        ]
        
        for field in path_fields:
            path_value = config.get(field, "")
            if path_value and path_value.strip():
                if not os.path.exists(path_value):
                    errors.append({
                        "field": field,
                        "value": path_value,
                        "message": f"路径不存在: {path_value}"
                    })
        
        # 返回验证结果
        if errors:
            return {
                "success": False,
                "error_code": "VALIDATION_FAILED",
                "error_message": "配置验证失败",
                "errors": errors
            }
        
        return {
            "success": True,
            "message": "配置验证通过"
        }
