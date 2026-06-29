"""
预设文件管理器模块

该模块负责预设文件的读写操作，包括：
- 保存预设文件到磁盘
- 从磁盘加载预设文件
- 删除预设文件
- 生成唯一预设 ID
- 验证预设文件格式
"""

import json
import threading
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime
import re

from ...utils.logger import app_logger as logger


class PresetFileManager:
    """预设文件管理器"""
    
    def __init__(self, presets_dir: Path):
        """
        初始化预设文件管理器
        
        Args:
            presets_dir: 预设文件存储目录
        """
        self.presets_dir = presets_dir
        self._lock = threading.Lock()
        
        # 确保预设目录存在
        self.presets_dir.mkdir(parents=True, exist_ok=True)
    
    def save_preset(self, preset_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        保存预设到文件
        
        Args:
            preset_data: 预设数据字典，包含 id, name, description, config 等
            
        Returns:
            操作结果字典
        """
        with self._lock:
            try:
                # 验证预设数据
                if not self._validate_preset_structure(preset_data):
                    return {
                        "success": False,
                        "error_message": "预设数据格式无效"
                    }
                
                preset_id = preset_data.get("id")
                if not preset_id:
                    return {
                        "success": False,
                        "error_message": "预设 ID 不能为空"
                    }
                
                # 生成文件名
                filename = f"{preset_id}.json"
                filepath = self.presets_dir / filename
                
                # 保存到文件
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(preset_data, f, indent=2, ensure_ascii=False)
                
                return {
                    "success": True,
                    "data": {
                        "preset_id": preset_id,
                        "file_path": str(filepath)
                    }
                }
            except Exception as e:
                return {
                    "success": False,
                    "error_message": f"保存预设文件失败: {str(e)}"
                }
    
    def load_preset(self, preset_id: str) -> Optional[Dict[str, Any]]:
        """
        从文件加载预设
        
        Args:
            preset_id: 预设 ID
            
        Returns:
            预设数据字典，如果加载失败则返回 None
        """
        with self._lock:
            try:
                # 生成文件名和路径
                filename = f"{preset_id}.json"
                filepath = self.presets_dir / filename
                
                # 检查文件是否存在
                if not filepath.exists():
                    return None
                
                # 读取文件
                with open(filepath, 'r', encoding='utf-8') as f:
                    preset_data = json.load(f)
                
                # 验证预设数据
                if not self._validate_preset_structure(preset_data):
                    return None
                
                return preset_data
            except Exception as e:
                logger.warning(f"[PresetFileManager] 加载预设文件失败 ({preset_id}): {e}")
                return None
    
    def delete_preset(self, preset_id: str) -> bool:
        """
        删除预设文件
        
        Args:
            preset_id: 预设 ID
            
        Returns:
            删除是否成功
        """
        with self._lock:
            try:
                # 生成文件名和路径
                filename = f"{preset_id}.json"
                filepath = self.presets_dir / filename
                
                # 检查文件是否存在
                if not filepath.exists():
                    return False
                
                # 删除文件
                filepath.unlink()
                
                return True
            except Exception as e:
                logger.error(f"[PresetFileManager] 删除预设文件失败 ({preset_id}): {e}")
                return False
    
    def generate_preset_id(self, name: str = None) -> str:
        """
        生成唯一的预设 ID
        
        Args:
            name: 可选的预设名称，用于生成更友好的 ID
            
        Returns:
            唯一的预设 ID
        """
        with self._lock:
            # 生成基础 ID
            if name:
                # 从名称生成 ID，只保留字母、数字、下划线和连字符
                base_id = re.sub(r'[^\w-]', '_', name.lower())
                base_id = re.sub(r'_+', '_', base_id).strip('_')
                # 截断长度
                base_id = base_id[:50]
            else:
                base_id = "custom"
            
            # 添加时间戳确保唯一性
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            preset_id = f"{base_id}_{timestamp}"
            
            # 检查是否已存在，如果存在则添加后缀
            counter = 1
            while self._preset_file_exists(preset_id):
                preset_id = f"{base_id}_{timestamp}_{counter}"
                counter += 1
            
            return preset_id
    
    def _preset_file_exists(self, preset_id: str) -> bool:
        """
        检查预设文件是否存在
        
        Args:
            preset_id: 预设 ID
            
        Returns:
            文件是否存在
        """
        filename = f"{preset_id}.json"
        filepath = self.presets_dir / filename
        return filepath.exists()
    
    def validate_preset(self, preset_data: Dict[str, Any]) -> tuple[bool, str]:
        """
        验证预设数据格式
        
        Args:
            preset_data: 预设数据字典
            
        Returns:
            (是否有效, 错误信息)
        """
        # 验证必需字段
        if not preset_data:
            return False, "预设数据不能为空"
        
        # 检查必需字段
        required_fields = ["id", "name", "config"]
        for field in required_fields:
            if field not in preset_data:
                return False, f"缺少必需字段: {field}"
        
        # 验证 ID 格式
        preset_id = preset_data.get("id", "")
        if not re.match(r'^[a-zA-Z0-9_-]+$', preset_id):
            return False, "预设 ID 只能包含字母、数字、下划线和连字符"
        
        # 验证 config 字典
        config = preset_data.get("config", {})
        if not isinstance(config, dict):
            return False, "config 必须是字典类型"
        
        # 验证可选字段
        if "description" in preset_data:
            description = preset_data["description"]
            if not isinstance(description, str):
                return False, "description 必须是字符串"
            if len(description) > 500:
                return False, "description 长度不能超过 500 字符"
        
        if "vram_requirement" in preset_data:
            vram_req = preset_data["vram_requirement"]
            if not isinstance(vram_req, str):
                return False, "vram_requirement 必须是字符串"
        
        return True, ""
    
    def _validate_preset_structure(self, preset_data: Dict[str, Any]) -> bool:
        """
        内部方法：验证预设数据结构
        
        Args:
            preset_data: 预设数据字典
            
        Returns:
            数据结构是否有效
        """
        try:
            # 基本类型检查
            if not isinstance(preset_data, dict):
                return False
            
            # 检查必需字段
            if "id" not in preset_data or not isinstance(preset_data["id"], str):
                return False
            
            if "name" not in preset_data or not isinstance(preset_data["name"], str):
                return False
            
            if "config" not in preset_data or not isinstance(preset_data["config"], dict):
                return False
            
            return True
        except Exception:
            return False
    
    def list_all_presets(self) -> list[Dict[str, Any]]:
        """
        列出所有预设文件
        
        Returns:
            预设信息列表，包含 id, file_path 等
        """
        with self._lock:
            presets = []
            
            try:
                # 遍历预设目录
                for filepath in self.presets_dir.glob("*.json"):
                    try:
                        # 读取预设 ID
                        preset_id = filepath.stem
                        
                        # 读取文件获取元数据
                        with open(filepath, 'r', encoding='utf-8') as f:
                            preset_data = json.load(f)
                        
                        presets.append({
                            "id": preset_id,
                            "file_path": str(filepath),
                            "name": preset_data.get("name", ""),
                            "description": preset_data.get("description", ""),
                            "vram_requirement": preset_data.get("vram_requirement", "N/A")
                        })
                    except Exception as e:
                        logger.warning(f"[PresetFileManager] 读取预设文件失败 ({filepath}): {e}")
                        continue
                
                return presets
            except Exception as e:
                logger.error(f"[PresetFileManager] 列出预设文件失败: {e}")
                return []
