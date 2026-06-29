"""
预设索引管理器模块

该模块负责预设索引文件的管理，包括：
- 加载/保存索引文件
- 添加/更新/删除索引条目
- 同步文件和索引
- 查询预设列表
"""

import json
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from ..config.config_migrator import ConfigMigrator
from ...utils.logger import app_logger as logger


class PresetIndexManager(ConfigMigrator):
    """预设索引管理器"""
    
    CURRENT_VERSION = "1.0.0"
    CONFIG_FILENAME = "preset_index.json"
    
    def __init__(self, index_file: Path):
        """
        初始化预设索引管理器
        
        Args:
            index_file: 索引文件路径
        """
        # 提取目录路径
        config_dir = index_file.parent
        
        # 调用父类初始化
        super().__init__(config_dir)
        
        # 保留线程锁
        self._lock = threading.Lock()
        
        # 保留原有的 index_file 属性（向后兼容）
        self.index_file = index_file
    
    def get_default_config(self) -> Dict[str, Any]:
        """
        获取默认配置，包含内置预设
        
        Returns:
            默认配置字典
        """
        return {
            "version": self.CURRENT_VERSION,
            "presets": [
                {
                    "id": "flux",
                    "name": "标准模式（推荐）",
                    "description": "适用于 8-16GB 显存，平衡性能与质量",
                    "vram_requirement": "8-16GB",
                    "type": "builtin",
                    "file": None,
                    "created_at": None,
                    "updated_at": None
                },
                {
                    "id": "flagship",
                    "name": "高显存模式",
                    "description": "适用于 24GB+ 显存，追求极致画质",
                    "vram_requirement": "24GB+",
                    "type": "builtin",
                    "file": None,
                    "created_at": None,
                    "updated_at": None
                },
                {
                    "id": "legacy",
                    "name": "低显存模式",
                    "description": "适用于 4-6GB 显存，优化内存占用",
                    "vram_requirement": "4-6GB",
                    "type": "builtin",
                    "file": None,
                    "created_at": None,
                    "updated_at": None
                },
                {
                    "id": "debug",
                    "name": "Debug 模式",
                    "description": "不使用任何参数启动，适用于调试和测试",
                    "vram_requirement": "N/A",
                    "type": "builtin",
                    "file": None,
                    "created_at": None,
                    "updated_at": None
                }
            ]
        }
    
    def load_index(self) -> Dict[str, Any]:
        """
        加载索引文件
        
        Returns:
            索引数据字典，如果加载失败则返回空索引
        """
        with self._lock:
            return self.load_config()
    
    def save_index(self, index_data: Dict[str, Any]) -> bool:
        """
        保存索引文件
        
        Args:
            index_data: 索引数据字典
            
        Returns:
            保存是否成功
        """
        with self._lock:
            try:
                # 验证索引结构
                if not self._validate_index_structure(index_data):
                    return False
                
                # 使用基类的保存方法
                return self.save_config(index_data)
            except Exception as e:
                logger.error(f"[PresetIndexManager] 保存索引文件失败: {e}")
                return False
    
    def add_preset_index(self, preset_info: Dict[str, Any]) -> bool:
        """
        添加预设索引
        
        Args:
            preset_info: 预设信息字典，必须包含 id, name, type, file 等字段
            
        Returns:
            添加是否成功
        """
        with self._lock:
            try:
                # 验证预设信息
                if not self._validate_preset_info(preset_info):
                    return False
                
                # 加载索引
                index_data = self.load_config()
                
                # 检查是否已存在
                preset_id = preset_info.get("id")
                if self._find_preset_index(index_data, preset_id):
                    logger.warning(f"[PresetIndexManager] 预设索引已存在: {preset_id}")
                    return False
                
                # 添加时间戳
                timestamp = datetime.now().isoformat()
                preset_info.setdefault("created_at", timestamp)
                preset_info.setdefault("updated_at", timestamp)
                
                # 添加到索引
                index_data["presets"].append(preset_info)
                
                # 保存索引
                return self.save_config(index_data)
            except Exception as e:
                logger.error(f"[PresetIndexManager] 添加预设索引失败: {e}")
                return False
    
    def update_preset_index(self, preset_id: str, updates: Dict[str, Any]) -> bool:
        """
        更新预设索引
        
        Args:
            preset_id: 预设 ID
            updates: 更新字段字典
            
        Returns:
            更新是否成功
        """
        with self._lock:
            try:
                # 加载索引
                index_data = self.load_config()
                
                # 查找预设
                preset_index = self._find_preset_index(index_data, preset_id)
                if not preset_index:
                    logger.warning(f"[PresetIndexManager] 预设索引不存在: {preset_id}")
                    return False
                
                # 不能修改内置预设的类型和 ID
                if preset_index.get("type") == "builtin":
                    if "type" in updates or "id" in updates:
                        logger.warning(f"[PresetIndexManager] 不能修改内置预设的类型或 ID: {preset_id}")
                        return False
                
                # 更新字段
                preset_index.update(updates)
                
                # 更新时间戳
                preset_index["updated_at"] = datetime.now().isoformat()
                
                # 保存索引
                return self.save_config(index_data)
            except Exception as e:
                logger.error(f"[PresetIndexManager] 更新预设索引失败: {e}")
                return False
    
    def delete_preset_index(self, preset_id: str) -> bool:
        """
        删除预设索引
        
        Args:
            preset_id: 预设 ID
            
        Returns:
            删除是否成功
        """
        with self._lock:
            try:
                # 加载索引
                index_data = self.load_config()
                
                # 查找预设
                preset_index = self._find_preset_index(index_data, preset_id)
                if not preset_index:
                    logger.warning(f"[PresetIndexManager] 预设索引不存在: {preset_id}")
                    return False
                
                # 不能删除内置预设
                if preset_index.get("type") == "builtin":
                    logger.warning(f"[PresetIndexManager] 不能删除内置预设: {preset_id}")
                    return False
                
                # 从索引中删除
                index_data["presets"].remove(preset_index)
                
                # 保存索引
                return self.save_config(index_data)
            except Exception as e:
                logger.error(f"[PresetIndexManager] 删除预设索引失败: {e}")
                return False
    
    def get_preset_list(self) -> List[Dict[str, Any]]:
        """
        获取预设列表
        
        Returns:
            预设信息列表
        """
        with self._lock:
            try:
                index_data = self.load_config()
                return index_data.get("presets", [])
            except Exception as e:
                logger.error(f"[PresetIndexManager] 获取预设列表失败: {e}")
                return []
    
    def get_preset_info(self, preset_id: str) -> Optional[Dict[str, Any]]:
        """
        获取预设信息
        
        Args:
            preset_id: 预设 ID
            
        Returns:
            预设信息字典，如果不存在则返回 None
        """
        with self._lock:
            try:
                index_data = self.load_config()
                preset_index = self._find_preset_index(index_data, preset_id)
                return preset_index
            except Exception as e:
                logger.error(f"[PresetIndexManager] 获取预设信息失败: {e}")
                return None
    
    def _find_preset_index(self, index_data: Dict[str, Any], preset_id: str) -> Optional[Dict[str, Any]]:
        """
        在索引中查找预设
        
        Args:
            index_data: 索引数据
            preset_id: 预设 ID
            
        Returns:
            预设索引字典，如果不存在则返回 None
        """
        for preset in index_data.get("presets", []):
            if preset.get("id") == preset_id:
                return preset
        return None
    
    def _validate_index_structure(self, index_data: Dict[str, Any]) -> bool:
        """
        验证索引结构
        
        Args:
            index_data: 索引数据
            
        Returns:
            结构是否有效
        """
        try:
            # 基本类型检查
            if not isinstance(index_data, dict):
                return False
            
            # 检查必需字段
            if "presets" not in index_data or not isinstance(index_data["presets"], list):
                return False
            
            # 检查每个预设条目的结构
            for preset in index_data["presets"]:
                if not self._validate_preset_info(preset):
                    return False
            
            return True
        except Exception:
            return False
    
    def _validate_preset_info(self, preset_info: Dict[str, Any]) -> bool:
        """
        验证预设信息结构
        
        Args:
            preset_info: 预设信息
            
        Returns:
            结构是否有效
        """
        try:
            # 基本类型检查
            if not isinstance(preset_info, dict):
                return False
            
            # 检查必需字段
            required_fields = ["id", "name", "type"]
            for field in required_fields:
                if field not in preset_info:
                    return False
            
            # 验证字段类型
            if not isinstance(preset_info["id"], str):
                return False
            
            if not isinstance(preset_info["name"], str):
                return False
            
            if not isinstance(preset_info["type"], str):
                return False
            
            # type 只能是 builtin 或 custom
            if preset_info["type"] not in ["builtin", "custom"]:
                return False
            
            return True
        except Exception:
            return False
