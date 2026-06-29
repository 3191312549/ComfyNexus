"""
进程管理器
用于管理 ComfyUI 进程
"""

from typing import Dict, Optional

from backend.src.utils.logger import app_logger as logger


class ProcessManager:
    """进程管理器"""
    
    def __init__(self, comfyui_process=None, environment_manager=None, settings_manager=None):
        """
        初始化进程管理器
        
        Args:
            comfyui_process: ComfyUIProcess 实例
            environment_manager: 环境管理器实例
            settings_manager: 设置管理器实例
        """
        self._comfyui_process = comfyui_process
        self._environment_manager = environment_manager
        self._settings_manager = settings_manager
        self._is_running = False
        self._has_task = False
    
    def set_comfyui_process(self, comfyui_process):
        """
        设置 ComfyUIProcess 实例
        
        Args:
            comfyui_process: ComfyUIProcess 实例
        """
        self._comfyui_process = comfyui_process
    
    def set_environment_manager(self, environment_manager):
        """
        设置环境管理器实例
        
        Args:
            environment_manager: 环境管理器实例
        """
        self._environment_manager = environment_manager
    
    def set_settings_manager(self, settings_manager):
        """
        设置设置管理器实例
        
        Args:
            settings_manager: 设置管理器实例
        """
        self._settings_manager = settings_manager
    
    def get_status(self) -> Dict:
        """
        获取进程状态
        
        Returns:
            dict: 进程状态
        """
        if self._comfyui_process:
            status = self._comfyui_process.get_status()
            return {
                "is_running": status.get("is_running", False),
                "has_task": status.get("has_task", False)
            }
        
        return {
            "is_running": self._is_running,
            "has_task": self._has_task
        }
    
    def restart(self) -> Dict:
        """
        重启进程
        
        Returns:
            dict: 重启结果
        """
        try:
            if not self._comfyui_process:
                return {
                    "success": False,
                    "message": "进程管理器未初始化"
                }
            
            current_env_id = self._comfyui_process.env_id
            
            if not current_env_id:
                return {
                    "success": False,
                    "message": "无法重启: 未找到当前环境 ID"
                }
            
            status = self._comfyui_process.get_status()
            
            if status.get("is_running"):
                port = self._comfyui_process.port
                
                self._comfyui_process.stop()
                
                import time
                import socket
                
                max_wait = 15
                waited = 0
                
                while waited < max_wait:
                    process_alive = self._comfyui_process.is_alive()
                    
                    port_released = True
                    try:
                        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        sock.settimeout(0.5)
                        result = sock.connect_ex(('127.0.0.1', port))
                        sock.close()
                        port_released = result != 0
                    except (socket.error, OSError) as e:
                        logger.debug(f"端口检测异常: {e}")
                        port_released = True
                    
                    if not process_alive and port_released:
                        break
                    
                    time.sleep(0.5)
                    waited += 0.5
                
                if self._comfyui_process.is_alive():
                    return {
                        "success": False,
                        "message": "进程停止超时"
                    }
                
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(0.5)
                    result = sock.connect_ex(('127.0.0.1', port))
                    sock.close()
                    if result == 0:
                        return {
                            "success": False,
                            "message": "端口未释放，请稍后重试"
                        }
                except (socket.error, OSError) as e:
                    logger.debug(f"端口检测异常: {e}")
            
            if not self._environment_manager:
                return {
                    "success": False,
                    "message": "无法重启: 环境管理器未初始化"
                }
            
            result = self._environment_manager.get_environment(current_env_id)
            if not result.get("success"):
                return {
                    "success": False,
                    "message": f"无法重启: 环境不存在 (ID: {current_env_id})"
                }
            
            env = result.get("environment")
            
            general = env.get("general", {})
            acceleration = env.get("acceleration", {})
            
            python_path = general.get("pythonPath")
            comfyui_path = general.get("comfyuiPath")
            
            if not python_path or not comfyui_path:
                return {
                    "success": False,
                    "message": "无法重启: 环境配置不完整"
                }
            
            args = self._build_launch_args(acceleration)
            
            show_console_window = self._get_console_window_setting()
            
            env_config = {
                'acceleration': acceleration,
                'advanced_env_vars': env.get('advancedEnvVars', ''),
                'env_type': env.get('envType', 'portable'),
                'desktop_data_path': env.get('desktopDataPath', '')
            }
            
            self._comfyui_process.env_id = current_env_id
            self._comfyui_process.start(python_path, comfyui_path, args, env_config, show_console_window=show_console_window)
            self._is_running = True
            self._has_task = False
            
            return {
                "success": True,
                "message": "进程重启成功"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"进程重启失败: {str(e)}"
            }
    
    def _build_launch_args(self, acceleration_config: Dict) -> list:
        """
        根据加速配置构建启动参数
        
        Args:
            acceleration_config: 加速配置字典
            
        Returns:
            list: 启动参数列表
        """
        from .env.launch_args_builder import LaunchArgsBuilder
        builder = LaunchArgsBuilder()
        return builder.build_args_from_dict(acceleration_config)
    
    def stop(self) -> Dict:
        """
        停止进程
        
        Returns:
            dict: 停止结果
        """
        try:
            if not self._comfyui_process:
                return {
                    "success": False,
                    "message": "进程管理器未初始化"
                }
            
            self._comfyui_process.stop()
            self._is_running = False
            self._has_task = False
            
            return {
                "success": True,
                "message": "进程停止成功"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"进程停止失败: {str(e)}"
            }
    
    def _get_console_window_setting(self) -> bool:
        """
        从设置中读取是否显示控制台窗口
        
        Returns:
            bool: 是否显示控制台窗口（默认 False）
        """
        show_console_window = False  # 默认隐藏
        try:
            from backend.src.core.settings_manager import SettingsManager
            settings_manager = SettingsManager()
            settings_result = settings_manager.get_settings()
            if settings_result.get('success') and settings_result.get('settings'):
                show_console_window = settings_result['settings'].get('general', {}).get('showConsoleWindow', False)
        except Exception:
            pass  # 读取失败时使用默认值
        return show_console_window
    
    def start(self, python_path: str, comfyui_path: str, args: list = None, env_config: dict = None) -> Dict:
        """
        启动进程
        
        Args:
            python_path: Python 路径
            comfyui_path: ComfyUI 路径
            args: 启动参数
            env_config: 环境配置字典（包含 acceleration, env_type 等）
            
        Returns:
            dict: 启动结果
        """
        try:
            if not self._comfyui_process:
                return {
                    "success": False,
                    "message": "进程管理器未初始化"
                }
            
            show_console_window = self._get_console_window_setting()
            
            self._comfyui_process.start(python_path, comfyui_path, args, env_config, show_console_window=show_console_window)
            self._is_running = True
            self._has_task = False
            
            return {
                "success": True,
                "message": "进程启动成功"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"进程启动失败: {str(e)}"
            }
