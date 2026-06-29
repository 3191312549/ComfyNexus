"""
Desktop launch arguments builder for ComfyUI desktop version.

This module provides functionality to build launch arguments for
ComfyUI desktop version (Electron app).
"""

from pathlib import Path
from typing import List, Optional


class DesktopLaunchArgsBuilder:
    """
    桌面版启动参数构建器
    
    构建 ComfyUI 桌面版所需的启动参数：
    - --front-end-root: 前端静态文件目录
    - --base-directory: ComfyUI 基础目录
    - --user-directory: 用户目录
    - --database-url: 数据库路径
    - --log-stdout: 日志输出到 stdout
    """
    
    @staticmethod
    def build_args(comfyui_path: str, desktop_data_path: str = "") -> List[str]:
        """
        构建桌面版必需的启动参数
        
        Args:
            comfyui_path: ComfyUI 安装目录（resources/ComfyUI）
            desktop_data_path: 桌面版数据目录（包含 .venv、user、input、output 等）
            
        Returns:
            List[str]: 启动参数列表
        """
        args = []
        comfyui_path_obj = Path(comfyui_path)
        
        # 查找 resources 目录
        # 桌面版结构: ComfyUI.exe 所在目录/resources/ComfyUI/
        # 所以 comfyui_path 的父目录就是 resources 目录
        if comfyui_path_obj.name == "ComfyUI":
            resources_path = comfyui_path_obj.parent
        else:
            resources_path = comfyui_path_obj
        
        # 数据目录：优先使用传入的 desktop_data_path，否则使用 comfyui_path
        data_path = Path(desktop_data_path) if desktop_data_path else comfyui_path_obj
        
        # 前端文件目录（在安装目录下）
        web_root = resources_path / "ComfyUI" / "web_custom_versions" / "desktop_app"
        if web_root.exists():
            args.extend(["--front-end-root", str(web_root)])
        
        # 基础目录（数据目录）
        args.extend(["--base-directory", str(data_path)])
        
        # 用户目录（数据目录下）
        user_dir = data_path / "user"
        args.extend(["--user-directory", str(user_dir)])
        
        # 输入目录（数据目录下）
        input_dir = data_path / "input"
        args.extend(["--input-directory", str(input_dir)])
        
        # 输出目录（数据目录下）
        output_dir = data_path / "output"
        args.extend(["--output-directory", str(output_dir)])
        
        # 数据库路径（数据目录下）
        db_path = user_dir / "comfyui.db"
        args.extend(["--database-url", f"sqlite:///{db_path}"])
        
        # 日志输出
        args.append("--log-stdout")
        
        return args
    
    @staticmethod
    def find_resources_path(comfyui_path: str) -> Optional[str]:
        """
        根据 ComfyUI 路径推断 resources 目录位置
        
        Args:
            comfyui_path: ComfyUI 目录路径
            
        Returns:
            str: resources 目录路径，或 None
        """
        path = Path(comfyui_path)
        if path.name == "ComfyUI" and path.parent.name == "resources":
            return str(path.parent)
        return None
    
    @staticmethod
    def find_web_root_path(comfyui_path: str) -> Optional[str]:
        """
        查找前端静态文件目录
        
        Args:
            comfyui_path: ComfyUI 目录路径
            
        Returns:
            str: 前端目录路径，或 None
        """
        resources_path = DesktopLaunchArgsBuilder.find_resources_path(comfyui_path)
        if resources_path:
            web_root = Path(resources_path) / "ComfyUI" / "web_custom_versions" / "desktop_app"
            if web_root.exists():
                return str(web_root)
        return None
    
    @staticmethod
    def validate_desktop_environment(comfyui_path: str, desktop_data_path: str = "") -> tuple[bool, Optional[str]]:
        """
        验证桌面版环境是否完整
        
        Args:
            comfyui_path: ComfyUI 目录路径（resources/ComfyUI）
            desktop_data_path: 桌面版数据目录路径（包含 .venv、user 等）
            
        Returns:
            tuple[bool, Optional[str]]: (是否有效, 错误信息)
        """
        path = Path(comfyui_path)
        
        # 检查 main.py 是否存在
        if not (path / "main.py").exists():
            return False, "main.py 不存在"
        
        # 检查 .venv 目录是否存在
        # 桌面版的 .venv 在数据目录下，不在 comfyui_path 下
        venv_base = Path(desktop_data_path) if desktop_data_path else path
        if not (venv_base / ".venv").exists():
            return False, f".venv 目录不存在 (检查路径: {venv_base / '.venv'})"
        
        # 检查前端文件目录是否存在
        web_root = DesktopLaunchArgsBuilder.find_web_root_path(comfyui_path)
        if not web_root:
            return False, "前端文件目录不存在"
        
        return True, None
