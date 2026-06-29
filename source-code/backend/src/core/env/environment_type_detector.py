"""
Environment type detector for ComfyUI installations.

This module provides functionality to detect the type of ComfyUI installation
(portable, desktop, or unknown) based on directory structure and configuration files.
"""

import json
import os
import platform
from pathlib import Path
from typing import Optional, Tuple

from .types import EnvironmentType


class EnvironmentTypeDetector:
    """
    环境类型检测器
    
    检测 ComfyUI 环境类型：
    - desktop: Electron 桌面版（通过 ComfyUI.exe 和 config.json 识别）
    - portable: 便携版（通过 main.py 识别）
    - unknown: 未知类型
    
    桌面版架构说明：
    - 安装目录：包含 ComfyUI.exe 和 resources/ComfyUI/（核心代码）
    - 数据目录：包含 .venv、user、models 等
    - config.json 中的 basePath 指向数据目录
    """
    
    @staticmethod
    def get_electron_config_path() -> Path:
        """获取 Electron 配置文件路径"""
        if platform.system() == "Windows":
            appdata = os.environ.get("APPDATA", "")
            return Path(appdata) / "ComfyUI" / "config.json"
        elif platform.system() == "Darwin":
            return Path.home() / "Library" / "Application Support" / "ComfyUI" / "config.json"
        else:
            return Path.home() / ".config" / "ComfyUI" / "config.json"
    
    @staticmethod
    def read_electron_config() -> Optional[dict]:
        """读取 Electron 配置文件"""
        config_path = EnvironmentTypeDetector.get_electron_config_path()
        if not config_path.exists():
            return None
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    
    @staticmethod
    def detect(user_path: str) -> Tuple[str, str, str, Optional[str]]:
        """
        检测 ComfyUI 环境类型
        
        桌面版架构（程序和数据分离）：
        - 安装目录：用户选择的目录，包含 ComfyUI.exe 和 resources/ComfyUI/
        - 数据目录：config.json 中的 basePath，包含 .venv、user、models 等
        
        检测逻辑：
        1. 检查是否有 ComfyUI.exe -> 桌面版
           - 读取 config.json 获取数据目录 (basePath)
           - ComfyUI 核心代码在 {安装目录}/resources/ComfyUI/
           - Python 虚拟环境在 {数据目录}/.venv/
        2. 检查是否有 main.py -> 便携版
        3. 检查 ComfyUI 子目录是否有 main.py -> 便携版
        4. 否则 -> unknown
        
        Args:
            user_path: 用户选择的目录路径
            
        Returns:
            Tuple[str, str, str, Optional[str]]: (comfyui_path, env_type, desktop_data_path, error_message)
            - comfyui_path: ComfyUI 核心代码目录
            - env_type: "desktop" / "portable" / "unknown"
            - desktop_data_path: 桌面版数据目录（仅桌面版有效，其他类型为空字符串）
            - error_message: 错误信息（如果有）
        """
        path = Path(user_path)
        
        if not path.exists():
            return str(path), EnvironmentType.UNKNOWN.value, "", "目录不存在"
        
        # 1. 检查桌面版：ComfyUI.exe 存在
        if (path / "ComfyUI.exe").exists():
            # 读取 Electron 配置
            config = EnvironmentTypeDetector.read_electron_config()
            if not config:
                return str(path), EnvironmentType.UNKNOWN.value, "", "未找到桌面版配置文件，请先运行一次 ComfyUI 桌面版"
            
            base_path = config.get("basePath")
            if not base_path:
                return str(path), EnvironmentType.UNKNOWN.value, "", "桌面版配置文件中缺少 basePath"
            
            base_path_obj = Path(base_path)
            if not base_path_obj.exists():
                return str(path), EnvironmentType.UNKNOWN.value, "", f"配置的 basePath 不存在: {base_path}"
            
            # 桌面版：用户选择的是安装目录
            # ComfyUI 核心代码在 {安装目录}/resources/ComfyUI/
            resources_comfyui = path / "resources" / "ComfyUI"
            if resources_comfyui.exists() and (resources_comfyui / "main.py").exists():
                return str(resources_comfyui), EnvironmentType.DESKTOP.value, str(base_path_obj), None
            
            # 尝试其他可能的路径
            if (path / "main.py").exists():
                return str(path), EnvironmentType.DESKTOP.value, str(base_path_obj), None
            
            return str(path), EnvironmentType.UNKNOWN.value, "", "无法找到 ComfyUI 核心代码目录 (resources/ComfyUI)"
        
        # 2. 检查便携版：main.py 存在
        if (path / "main.py").exists():
            return str(path), EnvironmentType.PORTABLE.value, "", None
        
        # 3. 检查 ComfyUI 子目录
        comfyui_subdir = path / "ComfyUI"
        if comfyui_subdir.exists() and (comfyui_subdir / "main.py").exists():
            return str(comfyui_subdir), EnvironmentType.PORTABLE.value, "", None
        
        # 4. 无法识别
        return str(path), EnvironmentType.UNKNOWN.value, "", "无法识别的 ComfyUI 目录，请选择正确的安装目录"
    
    @staticmethod
    def get_desktop_config_info() -> Optional[dict]:
        """
        获取桌面版配置信息（用于显示）
        
        Returns:
            包含 basePath, installState, detectedGpu 的字典，或 None
        """
        config = EnvironmentTypeDetector.read_electron_config()
        if not config:
            return None
        
        return {
            "basePath": config.get("basePath"),
            "installState": config.get("installState"),
            "detectedGpu": config.get("detectedGpu"),
        }
    
    @staticmethod
    def is_desktop_environment(path: str) -> bool:
        """
        快速判断是否为桌面版环境
        
        Args:
            path: ComfyUI 目录路径
            
        Returns:
            bool: 是否为桌面版
        """
        comfyui_path, env_type, desktop_data_path, error_message = EnvironmentTypeDetector.detect(path)
        return env_type == EnvironmentType.DESKTOP.value
    
    @staticmethod
    def is_portable_environment(path: str) -> bool:
        """
        快速判断是否为便携版环境
        
        Args:
            path: ComfyUI 目录路径
            
        Returns:
            bool: 是否为便携版
        """
        comfyui_path, env_type, desktop_data_path, error_message = EnvironmentTypeDetector.detect(path)
        return env_type == EnvironmentType.PORTABLE.value
