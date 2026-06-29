"""
文件夹快捷方式控制器
用于管理首页的文件夹快捷方式配置
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

from ...utils.logger import app_logger as logger


class FolderShortcutController:
    """文件夹快捷方式控制器"""
    
    # 默认文件夹快捷方式配置
    # 使用 i18n key 作为 name，前端通过 t() 函数翻译
    # 注意：folder 键在 home 命名空间下，所以完整的 key 是 'home.folder.input'
    DEFAULT_SHORTCUTS = [
        {
            "id": "input",
            "name": "home.folder.input",
            "path": "",
            "icon": "FolderInput",
            "order": 0,
            "isDefault": True,
            "visible": True
        },
        {
            "id": "output",
            "name": "home.folder.output",
            "path": "",
            "icon": "FolderOutput",
            "order": 1,
            "isDefault": True,
            "visible": True
        },
        {
            "id": "models",
            "name": "home.folder.models",
            "path": "",
            "icon": "FolderCog",
            "order": 2,
            "isDefault": True,
            "visible": True
        }
    ]
    
    def __init__(self, environment_manager):
        """
        初始化控制器
        
        Args:
            environment_manager: 环境管理器实例
        """
        self.environment_manager = environment_manager
        # 窗口引用（用于文件对话框）
        self._window = None
    
    def get_folder_shortcuts(self) -> Dict:
        """
        获取当前环境的文件夹快捷方式配置
        
        Returns:
            dict: 包含快捷方式列表的响应
        """
        try:
            # 获取当前环境
            current_env = self.environment_manager.get_current_environment()
            
            # 如果没有当前环境，返回默认配置（深拷贝，避免状态污染）
            if not current_env:
                import copy
                return {
                    "success": True,
                    "shortcuts": copy.deepcopy(self.DEFAULT_SHORTCUTS)
                }
            
            # 获取环境配置中的文件夹快捷方式
            shortcuts = current_env.config.folder_shortcuts
            
            # 如果环境配置中没有快捷方式或为空数组，返回默认配置
            if not shortcuts or len(shortcuts) == 0:
                import copy
                # 返回默认配置，并自动同步路径
                default_shortcuts = copy.deepcopy(self.DEFAULT_SHORTCUTS)
                
                # 从环境配置中获取路径并同步到默认快捷方式
                comfyui_path = current_env.config.general.comfyui_path
                input_dir = current_env.config.acceleration.input_directory
                output_dir = current_env.config.acceleration.output_directory
                base_dir = current_env.config.acceleration.base_directory
                
                # 生成默认路径的辅助函数
                def get_default_path(config_path: str, default_subdir: str) -> str:
                    # 如果配置中有路径且不为空，使用配置的路径
                    if config_path and config_path.strip():
                        return config_path
                    
                    # 否则，使用 ComfyUI 安装路径 + 默认子目录
                    if comfyui_path:
                        # 处理路径分隔符（Windows 使用 \，Unix 使用 /）
                        separator = '\\' if '\\' in comfyui_path else '/'
                        return f"{comfyui_path}{separator}{default_subdir}"
                    
                    # 如果连 ComfyUI 路径都没有，返回空字符串
                    return ""
                
                # 同步路径到默认快捷方式
                for shortcut in default_shortcuts:
                    if shortcut["id"] == "input":
                        shortcut["path"] = get_default_path(input_dir, "input")
                    elif shortcut["id"] == "output":
                        shortcut["path"] = get_default_path(output_dir, "output")
                    elif shortcut["id"] == "models":
                        shortcut["path"] = get_default_path(base_dir, "models")
                
                # 保存到环境配置（避免下次再次生成）
                current_env.config.folder_shortcuts = default_shortcuts
                self.environment_manager.save_environment_config(current_env.id, current_env.config)
                
                return {
                    "success": True,
                    "shortcuts": default_shortcuts
                }
            
            # 修复：确保默认文件夹的 name 使用 i18n key
            for shortcut in shortcuts:
                if shortcut.get("isDefault"):
                    default_shortcut = next(
                        (s for s in self.DEFAULT_SHORTCUTS if s["id"] == shortcut["id"]),
                        None
                    )
                    if default_shortcut:
                        shortcut["name"] = default_shortcut["name"]

            return {
                "success": True,
                "shortcuts": shortcuts
            }

        except Exception as e:
            return {
                "success": False,
                "error_message": f"读取文件夹配置失败: {str(e)}"
            }
    
    def save_folder_shortcuts(self, shortcuts: List[Dict]) -> Dict:
        """
        保存文件夹快捷方式配置到当前环境
        
        Args:
            shortcuts: 快捷方式列表
            
        Returns:
            dict: 操作结果
        """
        try:
            # 验证快捷方式数据
            validation_result = self._validate_shortcuts(shortcuts)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error_message": validation_result["error"]
                }
            
            # 获取当前环境
            current_env = self.environment_manager.get_current_environment()
            
            # 如果没有当前环境，返回错误
            if not current_env:
                return {
                    "success": False,
                    "error_message": "没有当前环境"
                }
            
            # 更新环境配置中的文件夹快捷方式
            current_env.config.folder_shortcuts = shortcuts
            
            # 保存环境配置
            self.environment_manager.save_environment_config(current_env.id, current_env.config)
            
            return {
                "success": True,
                "message": "文件夹配置保存成功"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error_message": f"保存文件夹配置失败: {str(e)}"
            }
    
    def _validate_shortcuts(self, shortcuts: List[Dict]) -> Dict:
        """
        验证快捷方式数据的有效性
        
        Args:
            shortcuts: 快捷方式列表
            
        Returns:
            dict: 验证结果 {"valid": bool, "error": str}
        """
        # 检查是否为列表
        if not isinstance(shortcuts, list):
            return {
                "valid": False,
                "error": "快捷方式数据必须是列表类型"
            }
        
        # 检查数量限制
        if len(shortcuts) > 6:
            return {
                "valid": False,
                "error": "最多只能添加6个文件夹快捷方式"
            }
        
        # 检查每个快捷方式的必需字段
        required_fields = ["id", "name", "icon", "order", "isDefault"]
        for i, shortcut in enumerate(shortcuts):
            if not isinstance(shortcut, dict):
                return {
                    "valid": False,
                    "error": f"第{i+1}个快捷方式数据格式错误"
                }
            
            # 检查必需字段
            for field in required_fields:
                if field not in shortcut:
                    return {
                        "valid": False,
                        "error": f"第{i+1}个快捷方式缺少必需字段: {field}"
                    }
            
            # path 字段可选，但必须是字符串
            if "path" in shortcut and not isinstance(shortcut["path"], str):
                return {
                    "valid": False,
                    "error": f"第{i+1}个快捷方式的路径必须是字符串类型"
                }
        
        # 检查 ID 唯一性
        ids = [s["id"] for s in shortcuts]
        if len(ids) != len(set(ids)):
            return {
                "valid": False,
                "error": "快捷方式 ID 不能重复"
            }
        
        return {"valid": True, "error": None}

    
    def open_folder(self, path: str) -> Dict:
        """
        在文件管理器中打开文件夹
        
        Args:
            path: 文件夹路径
            
        Returns:
            dict: 操作结果
        """
        try:
            # 验证路径
            if not path:
                return {
                    "success": False,
                    "error_message": "文件夹路径不能为空"
                }
            
            folder_path = Path(path)
            
            # 检查路径是否存在
            if not folder_path.exists():
                return {
                    "success": False,
                    "error_message": f"文件夹不存在: {path}"
                }
            
            # 检查是否为目录
            if not folder_path.is_dir():
                return {
                    "success": False,
                    "error_message": f"路径不是文件夹: {path}"
                }
            
            # 根据操作系统打开文件夹
            if os.name == 'nt':  # Windows
                os.startfile(str(folder_path))
            elif sys.platform == 'darwin':  # macOS
                subprocess.run(['open', str(folder_path)], check=True)
            else:  # Linux
                subprocess.run(['xdg-open', str(folder_path)], check=True)
            
            return {
                "success": True,
                "message": "文件夹已打开"
            }
            
        except PermissionError:
            return {
                "success": False,
                "error_message": "没有权限访问该文件夹"
            }
        except subprocess.CalledProcessError as e:
            return {
                "success": False,
                "error_message": f"打开文件夹失败: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error_message": f"打开文件夹时发生错误: {str(e)}"
            }
    
    def validate_folder_path(self, path: str) -> Dict:
        """
        验证文件夹路径是否有效
        
        Args:
            path: 文件夹路径
            
        Returns:
            dict: 验证结果 {"success": bool, "isValid": bool, "error": str}
        """
        try:
            # 空路径视为无效
            if not path:
                return {
                    "success": True,
                    "isValid": False,
                    "error_message": "路径不能为空"
                }
            
            folder_path = Path(path)
            
            # 检查路径是否存在
            if not folder_path.exists():
                return {
                    "success": True,
                    "isValid": False,
                    "error_message": "路径不存在"
                }
            
            # 检查是否为目录
            if not folder_path.is_dir():
                return {
                    "success": True,
                    "isValid": False,
                    "error_message": "路径不是文件夹"
                }
            
            # 检查是否有读取权限
            if not os.access(folder_path, os.R_OK):
                return {
                    "success": True,
                    "isValid": False,
                    "error_message": "没有读取权限"
                }
            
            return {
                "success": True,
                "isValid": True,
                "message": "路径有效"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error_message": f"验证路径时发生错误: {str(e)}"
            }
    
    def browse_folder(self, window=None) -> Dict:
        """
        打开系统文件夹选择器
        
        Args:
            window: pywebview 窗口对象（可选）
            
        Returns:
            dict: 选择结果 {"success": bool, "path": str, "error_message": str}
        """
        import time
        
        try:
            # 如果提供了窗口对象，使用 pywebview 的文件对话框
            if window:
                import webview
                
                logger.debug(f"[browse_folder] 开始调用文件对话框...")
                start_time = time.time()
                
                result = window.create_file_dialog(
                    dialog_type=webview.FileDialog.FOLDER,
                    allow_multiple=False
                )
                
                end_time = time.time()
                elapsed = (end_time - start_time) * 1000  # 转换为毫秒
                logger.debug(f"[browse_folder] 文件对话框返回，耗时: {elapsed:.2f}ms")
                
                if result and len(result) > 0:
                    logger.debug(f"[browse_folder] 用户选择了路径: {result[0]}")
                    return {
                        "success": True,
                        "path": result[0]
                    }
                else:
                    # 用户取消选择
                    logger.debug(f"[browse_folder] 用户取消了选择")
                    return {
                        "success": True,
                        "path": None
                    }
            else:
                # 如果没有窗口对象，返回错误
                return {
                    "success": False,
                    "error_message": "窗口对象未初始化"
                }
                
        except Exception as e:
            logger.error(f"[browse_folder] 发生异常: {str(e)}")
            return {
                "success": False,
                "error_message": f"打开文件夹选择器失败: {str(e)}"
            }
    
    def set_window(self, window):
        """
        设置窗口引用
        
        Args:
            window: pywebview 窗口对象
        """
        self._window = window
