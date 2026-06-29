"""
LoRA 配置管理器
用于管理 LoRA 模型管理器的配置
"""

from pathlib import Path
from typing import Dict, List, Optional

from .config_migrator import ConfigMigrator
from backend.src.utils.logger import app_logger as logger


class LoraConfigManager(ConfigMigrator):
    """LoRA 配置管理器"""
    
    CURRENT_VERSION = "1.0.0"
    CONFIG_FILENAME = "lora_config.json"
    
    def __init__(self, config_dir: str = None):
        """
        初始化 LoRA 配置管理器
        
        Args:
            config_dir: 配置文件目录，如果为 None 则使用默认路径
        """
        if config_dir is None:
            from backend.src.utils.paths import get_config_dir
            config_dir = get_config_dir()
        
        super().__init__(Path(config_dir))
    
    def get_default_config(self) -> Dict:
        """
        获取默认配置
        
        Returns:
            默认配置字典
        """
        return {
            "version": self.CURRENT_VERSION,
            "civitai": {
                "api_key": "",
                "enabled": True,
                "auto_sync": False,
                "sync_interval_hours": 24,
                "preview_download_limit": 5
            },
            "scan_paths": [],
            "display": {
                "grid_view": True,
                "show_preview": True,
                "show_trigger_words": True,
                "card_size": "medium",
                "grid_columns": 2,
                "preview_short_edge": 200,
                "minimal_list": False,
                "sort_order": "asc"
            },
            "metadata_cache": {
                "enabled": True,
                "cache_days": 30
            },
            "categories": [
                {"id": "flux", "name": "FLUX", "order": 0},
                {"id": "sdxl", "name": "SDXL", "order": 1},
                {"id": "sd15", "name": "SD1.5", "order": 2}
            ]
        }
    
    def get_config(self) -> Dict:
        """
        获取完整配置
        
        Returns:
            dict: 操作结果
        """
        try:
            config = self.load_config()
            return {
                "success": True,
                "config": config
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 读取配置失败: {str(e)}")
            return {
                "success": False,
                "message": f"读取配置失败: {str(e)}",
                "config": {}
            }
    
    def update_config(self, updates: Dict) -> Dict:
        """
        更新配置
        
        Args:
            updates: 要更新的配置项
            
        Returns:
            dict: 操作结果
        """
        try:
            config = self.load_config()
            
            for section, values in updates.items():
                if section in config and isinstance(config[section], dict) and isinstance(values, dict):
                    config[section].update(values)
                else:
                    config[section] = values
            
            save_result = self.save_config(config)
            
            if not save_result:
                logger.error("[LoraConfigManager] 保存配置失败")
                return {
                    "success": False,
                    "message": "保存配置失败"
                }
            
            logger.debug("[LoraConfigManager] 配置已成功保存")
            return {
                "success": True,
                "message": "配置已保存",
                "config": config
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 更新配置失败: {str(e)}")
            return {
                "success": False,
                "message": f"更新配置失败: {str(e)}"
            }
    
    def get_civitai_config(self) -> Dict:
        """
        获取 Civitai 配置
        
        Returns:
            dict: 操作结果
        """
        try:
            config = self.load_config()
            civitai_config = config.get("civitai", {})
            
            if not civitai_config:
                civitai_config = self.get_default_config()["civitai"]
            
            return {
                "success": True,
                "config": civitai_config
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 读取 Civitai 配置失败: {str(e)}")
            return {
                "success": False,
                "message": f"读取 Civitai 配置失败: {str(e)}",
                "config": {}
            }
    
    def update_civitai_config(self, updates: Dict) -> Dict:
        """
        更新 Civitai 配置
        
        Args:
            updates: 要更新的配置项（api_key, enabled, auto_sync, sync_interval_hours）
            
        Returns:
            dict: 操作结果
        """
        return self.update_config({"civitai": updates})
    
    def set_civitai_api_key(self, api_key: str) -> Dict:
        """
        设置 Civitai API Key
        
        Args:
            api_key: API Key 字符串
            
        Returns:
            dict: 操作结果
        """
        return self.update_civitai_config({"api_key": api_key})
    
    def get_scan_paths(self) -> Dict:
        """
        获取扫描路径列表
        
        Returns:
            dict: 操作结果
        """
        try:
            config = self.load_config()
            scan_paths = config.get("scan_paths", [])
            
            return {
                "success": True,
                "paths": scan_paths
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 读取扫描路径失败: {str(e)}")
            return {
                "success": False,
                "message": f"读取扫描路径失败: {str(e)}",
                "paths": []
            }
    
    def add_scan_path(self, path: str, name: str = None, category: str = None) -> Dict:
        """
        添加扫描路径
        
        Args:
            path: 文件夹路径
            name: 路径名称（可选）
            category: 分类（可选）
            
        Returns:
            dict: 操作结果
        """
        import os
        import uuid
        
        if not path or not path.strip():
            return {
                "success": False,
                "message": "路径不能为空"
            }
        
        path = path.strip()
        
        if not os.path.exists(path):
            return {
                "success": False,
                "message": f"路径不存在: {path}"
            }
        
        if not os.path.isdir(path):
            return {
                "success": False,
                "message": f"路径不是有效目录: {path}"
            }
        
        try:
            config = self.load_config()
            scan_paths = config.get("scan_paths", [])
            
            for existing in scan_paths:
                if existing.get("path") == path:
                    return {
                        "success": False,
                        "message": f"路径已存在: {path}"
                    }
            
            new_path = {
                "id": str(uuid.uuid4()),
                "path": path,
                "name": name or os.path.basename(path),
                "category": category or "uncategorized",
                "enabled": True
            }
            
            scan_paths.append(new_path)
            config["scan_paths"] = scan_paths
            
            save_result = self.save_config(config)
            
            if not save_result:
                return {
                    "success": False,
                    "message": "保存配置失败"
                }
            
            return {
                "success": True,
                "message": "扫描路径已添加",
                "path": new_path
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 添加扫描路径失败: {str(e)}")
            return {
                "success": False,
                "message": f"添加扫描路径失败: {str(e)}"
            }
    
    def update_scan_path(self, path_id: str, updates: Dict) -> Dict:
        """
        更新扫描路径
        
        Args:
            path_id: 路径 ID
            updates: 要更新的字段
            
        Returns:
            dict: 操作结果
        """
        try:
            config = self.load_config()
            scan_paths = config.get("scan_paths", [])
            
            found = False
            for i, path_item in enumerate(scan_paths):
                if path_item.get("id") == path_id:
                    scan_paths[i].update(updates)
                    found = True
                    break
            
            if not found:
                return {
                    "success": False,
                    "message": f"路径 ID 不存在: {path_id}"
                }
            
            config["scan_paths"] = scan_paths
            save_result = self.save_config(config)
            
            if not save_result:
                return {
                    "success": False,
                    "message": "保存配置失败"
                }
            
            return {
                "success": True,
                "message": "扫描路径已更新"
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 更新扫描路径失败: {str(e)}")
            return {
                "success": False,
                "message": f"更新扫描路径失败: {str(e)}"
            }
    
    def remove_scan_path(self, path_id: str) -> Dict:
        """
        删除扫描路径
        
        Args:
            path_id: 路径 ID
            
        Returns:
            dict: 操作结果
        """
        try:
            config = self.load_config()
            scan_paths = config.get("scan_paths", [])
            
            original_count = len(scan_paths)
            scan_paths = [p for p in scan_paths if p.get("id") != path_id]
            
            if len(scan_paths) == original_count:
                return {
                    "success": False,
                    "message": f"路径 ID 不存在: {path_id}"
                }
            
            config["scan_paths"] = scan_paths
            save_result = self.save_config(config)
            
            if not save_result:
                return {
                    "success": False,
                    "message": "保存配置失败"
                }
            
            return {
                "success": True,
                "message": "扫描路径已删除"
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 删除扫描路径失败: {str(e)}")
            return {
                "success": False,
                "message": f"删除扫描路径失败: {str(e)}"
            }
    
    def get_categories(self) -> Dict:
        """
        获取分类列表
        
        Returns:
            dict: 操作结果
        """
        try:
            config = self.load_config()
            categories = config.get("categories", [])
            
            return {
                "success": True,
                "categories": categories
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 读取分类失败: {str(e)}")
            return {
                "success": False,
                "message": f"读取分类失败: {str(e)}",
                "categories": []
            }
    
    def add_category(self, name: str, id: str = None) -> Dict:
        """
        添加分类
        
        Args:
            name: 分类名称
            id: 分类 ID（可选，默认使用 name 的小写形式）
            
        Returns:
            dict: 操作结果
        """
        if not name or not name.strip():
            return {
                "success": False,
                "message": "分类名称不能为空"
            }
        
        name = name.strip()
        category_id = id or name.lower().replace(" ", "-")
        
        try:
            config = self.load_config()
            categories = config.get("categories", [])
            
            for existing in categories:
                if existing.get("id") == category_id:
                    return {
                        "success": False,
                        "message": f"分类 ID 已存在: {category_id}"
                    }
                if existing.get("name") == name:
                    return {
                        "success": False,
                        "message": f"分类名称已存在: {name}"
                    }
            
            new_category = {
                "id": category_id,
                "name": name,
                "order": len(categories)
            }
            
            categories.append(new_category)
            config["categories"] = categories
            
            save_result = self.save_config(config)
            
            if not save_result:
                return {
                    "success": False,
                    "message": "保存配置失败"
                }
            
            return {
                "success": True,
                "message": "分类已添加",
                "category": new_category
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 添加分类失败: {str(e)}")
            return {
                "success": False,
                "message": f"添加分类失败: {str(e)}"
            }
    
    def update_category(self, category_id: str, updates: Dict) -> Dict:
        """
        更新分类
        
        Args:
            category_id: 分类 ID
            updates: 要更新的字段
            
        Returns:
            dict: 操作结果
        """
        try:
            config = self.load_config()
            categories = config.get("categories", [])
            
            found = False
            for i, cat in enumerate(categories):
                if cat.get("id") == category_id:
                    categories[i].update(updates)
                    found = True
                    break
            
            if not found:
                return {
                    "success": False,
                    "message": f"分类 ID 不存在: {category_id}"
                }
            
            config["categories"] = categories
            save_result = self.save_config(config)
            
            if not save_result:
                return {
                    "success": False,
                    "message": "保存配置失败"
                }
            
            return {
                "success": True,
                "message": "分类已更新"
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 更新分类失败: {str(e)}")
            return {
                "success": False,
                "message": f"更新分类失败: {str(e)}"
            }
    
    def remove_category(self, category_id: str) -> Dict:
        """
        删除分类
        
        Args:
            category_id: 分类 ID
            
        Returns:
            dict: 操作结果
        """
        try:
            config = self.load_config()
            categories = config.get("categories", [])
            
            original_count = len(categories)
            categories = [c for c in categories if c.get("id") != category_id]
            
            if len(categories) == original_count:
                return {
                    "success": False,
                    "message": f"分类 ID 不存在: {category_id}"
                }
            
            config["categories"] = categories
            save_result = self.save_config(config)
            
            if not save_result:
                return {
                    "success": False,
                    "message": "保存配置失败"
                }
            
            return {
                "success": True,
                "message": "分类已删除"
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 删除分类失败: {str(e)}")
            return {
                "success": False,
                "message": f"删除分类失败: {str(e)}"
            }
    
    def get_display_config(self) -> Dict:
        """
        获取显示配置
        
        Returns:
            dict: 操作结果
        """
        try:
            config = self.load_config()
            display_config = config.get("display", {})
            
            if not display_config:
                display_config = self.get_default_config()["display"]
            
            return {
                "success": True,
                "config": display_config
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 读取显示配置失败: {str(e)}")
            return {
                "success": False,
                "message": f"读取显示配置失败: {str(e)}",
                "config": {}
            }
    
    def update_display_config(self, updates: Dict) -> Dict:
        """
        更新显示配置
        
        Args:
            updates: 要更新的配置项
            
        Returns:
            dict: 操作结果
        """
        return self.update_config({"display": updates})
    
    def reset_config(self) -> Dict:
        """
        重置配置为默认值
        
        Returns:
            dict: 操作结果
        """
        try:
            default_config = self.get_default_config()
            self.save_config(default_config)
            
            return {
                "success": True,
                "message": "配置已重置为默认值"
            }
        except Exception as e:
            logger.error(f"[LoraConfigManager] 重置配置失败: {str(e)}")
            return {
                "success": False,
                "message": f"重置配置失败: {str(e)}"
            }
