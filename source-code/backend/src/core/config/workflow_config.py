"""
工作流配置管理器
用于管理工作流目录的自定义配置
"""

from pathlib import Path
from typing import Dict, Optional

from .config_migrator import ConfigMigrator
from backend.src.utils.logger import app_logger as logger


class WorkflowConfigManager(ConfigMigrator):
    """工作流配置管理器"""

    CURRENT_VERSION = "1.0.0"
    CONFIG_FILENAME = "workflow_config.json"

    def __init__(self, config_dir: str = None):
        if config_dir is None:
            from backend.src.utils.paths import get_config_dir
            config_dir = get_config_dir()

        super().__init__(Path(config_dir))

    def get_default_config(self) -> Dict:
        return {
            "version": self.CURRENT_VERSION,
            "use_global_path": False,
            "global_path": "",
            "env_paths": {}
        }

    def get_config(self) -> Dict:
        try:
            config = self.load_config()
            return {
                "success": True,
                "config": config
            }
        except Exception as e:
            logger.error(f"[WorkflowConfigManager] 读取配置失败: {str(e)}")
            return {
                "success": False,
                "message": f"读取配置失败: {str(e)}",
                "config": {}
            }

    def update_config(self, updates: Dict) -> Dict:
        try:
            config = self.load_config()

            for section, values in updates.items():
                if section in config and isinstance(config[section], dict) and isinstance(values, dict):
                    config[section].update(values)
                else:
                    config[section] = values

            save_result = self.save_config(config)

            if not save_result:
                logger.error("[WorkflowConfigManager] 保存配置失败")
                return {
                    "success": False,
                    "message": "保存配置失败"
                }

            logger.debug("[WorkflowConfigManager] 配置已成功保存")
            return {
                "success": True,
                "message": "配置已保存",
                "config": config
            }
        except Exception as e:
            logger.error(f"[WorkflowConfigManager] 更新配置失败: {str(e)}")
            return {
                "success": False,
                "message": f"更新配置失败: {str(e)}"
            }

    def get_workflow_dir(self, env_id: str) -> Optional[str]:
        try:
            config = self.load_config()
            if config.get("use_global_path", False):
                return config.get("global_path", "") or None
            env_paths = config.get("env_paths", {})
            return env_paths.get(env_id, None)
        except Exception as e:
            logger.error(f"[WorkflowConfigManager] 获取工作流目录失败: {str(e)}")
            return None

    def set_env_path(self, env_id: str, path: str) -> Dict:
        try:
            config = self.load_config()
            if "env_paths" not in config:
                config["env_paths"] = {}
            config["env_paths"][env_id] = path
            save_result = self.save_config(config)
            if not save_result:
                return {"success": False, "message": "保存配置失败"}
            return {"success": True, "message": "环境工作流目录已更新"}
        except Exception as e:
            logger.error(f"[WorkflowConfigManager] 设置环境工作流目录失败: {str(e)}")
            return {"success": False, "message": f"设置环境工作流目录失败: {str(e)}"}

    def set_global_path(self, path: str) -> Dict:
        try:
            config = self.load_config()
            config["global_path"] = path
            save_result = self.save_config(config)
            if not save_result:
                return {"success": False, "message": "保存配置失败"}
            return {"success": True, "message": "全局工作流目录已更新"}
        except Exception as e:
            logger.error(f"[WorkflowConfigManager] 设置全局工作流目录失败: {str(e)}")
            return {"success": False, "message": f"设置全局工作流目录失败: {str(e)}"}

    def set_use_global_path(self, use_global: bool) -> Dict:
        try:
            config = self.load_config()
            config["use_global_path"] = use_global
            save_result = self.save_config(config)
            if not save_result:
                return {"success": False, "message": "保存配置失败"}
            return {"success": True, "message": "全局开关已更新"}
        except Exception as e:
            logger.error(f"[WorkflowConfigManager] 设置全局开关失败: {str(e)}")
            return {"success": False, "message": f"设置全局开关失败: {str(e)}"}

    def remove_env_path(self, env_id: str) -> Dict:
        try:
            config = self.load_config()
            env_paths = config.get("env_paths", {})
            if env_id in env_paths:
                del env_paths[env_id]
                config["env_paths"] = env_paths
                save_result = self.save_config(config)
                if not save_result:
                    return {"success": False, "message": "保存配置失败"}
                return {"success": True, "message": "环境工作流目录已移除"}
            return {"success": True, "message": "环境工作流目录不存在，无需移除"}
        except Exception as e:
            logger.error(f"[WorkflowConfigManager] 移除环境工作流目录失败: {str(e)}")
            return {"success": False, "message": f"移除环境工作流目录失败: {str(e)}"}

    def ensure_env_path(self, env_id: str, default_path: str) -> Dict:
        try:
            config = self.load_config()
            env_paths = config.get("env_paths", {})
            if env_id not in env_paths:
                env_paths[env_id] = default_path
                config["env_paths"] = env_paths
                save_result = self.save_config(config)
                if not save_result:
                    return {"success": False, "message": "保存配置失败"}
                return {"success": True, "message": "环境工作流目录已初始化", "updated": True}
            return {"success": True, "message": "环境工作流目录已存在", "updated": False}
        except Exception as e:
            logger.error(f"[WorkflowConfigManager] 初始化环境工作流目录失败: {str(e)}")
            return {"success": False, "message": f"初始化环境工作流目录失败: {str(e)}"}

    def initialize_all_env_paths(self, environments: list) -> Dict:
        try:
            config = self.load_config()
            env_paths = config.get("env_paths", {})
            updated = False
            for env in environments:
                env_id = env.get("id")
                if not env_id:
                    continue
                if env_id not in env_paths:
                    env_type = env.get("envType", "portable")
                    desktop_data_path = env.get("desktopDataPath", "")
                    comfyui_path = env.get("path", "")
                    if env_type == "desktop" and desktop_data_path:
                        default_path = str(Path(desktop_data_path) / "user" / "default" / "workflows")
                    elif comfyui_path:
                        default_path = str(Path(comfyui_path) / "user" / "default" / "workflows")
                    else:
                        continue
                    env_paths[env_id] = default_path
                    updated = True
            if updated:
                config["env_paths"] = env_paths
                save_result = self.save_config(config)
                if not save_result:
                    return {"success": False, "message": "保存配置失败"}
            return {"success": True, "message": "环境工作流目录已初始化"}
        except Exception as e:
            logger.error(f"[WorkflowConfigManager] 批量初始化环境工作流目录失败: {str(e)}")
            return {"success": False, "message": f"批量初始化环境工作流目录失败: {str(e)}"}
