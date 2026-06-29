"""
本地节点映射缓存管理器

管理本地节点扫描结果的缓存，包括：
- 缓存读写
- 版本控制
- 过期检测
- 增量更新检测
"""

import json
import time
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any

from backend.src.core.workflow.models import (
    LocalNodeMap,
    LOCAL_NODE_MAP_VERSION,
    LOCAL_NODE_MAP_CACHE_EXPIRE_HOURS,
)
from backend.src.utils.paths import get_cache_dir
from backend.src.utils.logger import app_logger as logger


class LocalNodeMapCacheManager:
    """本地节点映射缓存管理器"""

    CACHE_FILENAME = "local_node_map.json"
    METADATA_FILENAME = "scan_metadata.json"

    def __init__(self, comfyui_path: str):
        self.comfyui_path = Path(comfyui_path)
        self.cache_dir = get_cache_dir()
        self.cache_file = self.cache_dir / self.CACHE_FILENAME
        self.metadata_file = self.cache_dir / self.METADATA_FILENAME

        self._ensure_cache_dir()

    def _ensure_cache_dir(self) -> None:
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_comfyui_hash(self) -> str:
        comfyui_path_str = str(self.comfyui_path.resolve())
        return hashlib.md5(comfyui_path_str.encode()).hexdigest()[:16]

    def get_cache_path(self) -> Path:
        comfyui_hash = self._get_comfyui_hash()
        return self.cache_dir / f"local_node_map_{comfyui_hash}.json"

    def get_metadata_path(self) -> Path:
        comfyui_hash = self._get_comfyui_hash()
        return self.cache_dir / f"scan_metadata_{comfyui_hash}.json"

    def load(self) -> Optional[LocalNodeMap]:
        cache_path = self.get_cache_path()
        
        if not cache_path.exists():
            logger.debug(f"缓存文件不存在: {cache_path}")
            return None

        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            node_map = LocalNodeMap.from_dict(data)
            
            if node_map.version != LOCAL_NODE_MAP_VERSION:
                logger.info(f"缓存版本不匹配: {node_map.version} != {LOCAL_NODE_MAP_VERSION}")
                return None
            
            if node_map.comfyui_path != str(self.comfyui_path):
                logger.info(f"ComfyUI 路径不匹配: {node_map.comfyui_path}")
                return None
            
            logger.info(f"成功加载缓存: {cache_path}")
            return node_map

        except Exception as e:
            logger.error(f"加载缓存失败: {e}")
            return None

    def save(self, node_map: LocalNodeMap) -> bool:
        cache_path = self.get_cache_path()
        
        try:
            node_map.timestamp = time.time()
            
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(node_map.to_dict(), f, ensure_ascii=False, indent=2)
            
            self._save_metadata()
            
            logger.info(f"成功保存缓存: {cache_path}")
            return True

        except Exception as e:
            logger.error(f"保存缓存失败: {e}")
            return False

    def _save_metadata(self) -> None:
        metadata_path = self.get_metadata_path()
        
        custom_nodes_path = self.comfyui_path / "custom_nodes"
        plugin_mtimes: Dict[str, float] = {}
        
        if custom_nodes_path.exists():
            for plugin_dir in custom_nodes_path.iterdir():
                if plugin_dir.is_dir() and not plugin_dir.name.endswith(".disabled"):
                    init_file = plugin_dir / "__init__.py"
                    if init_file.exists():
                        plugin_mtimes[plugin_dir.name] = init_file.stat().st_mtime

        metadata = {
            "timestamp": time.time(),
            "comfyui_path": str(self.comfyui_path),
            "plugin_count": len(plugin_mtimes),
            "plugin_mtimes": plugin_mtimes,
        }

        try:
            with open(metadata_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存元数据失败: {e}")

    def load_metadata(self) -> Optional[Dict[str, Any]]:
        metadata_path = self.get_metadata_path()
        
        if not metadata_path.exists():
            return None

        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"加载元数据失败: {e}")
            return None

    def is_expired(self) -> bool:
        node_map = self.load()
        if node_map is None:
            return True
        
        return node_map.is_expired()

    def needs_rescan(self) -> bool:
        if self.is_expired():
            logger.info("缓存已过期，需要重新扫描")
            return True

        metadata = self.load_metadata()
        if metadata is None:
            logger.info("元数据不存在，需要重新扫描")
            return True

        custom_nodes_path = self.comfyui_path / "custom_nodes"
        if not custom_nodes_path.exists():
            return True

        stored_mtimes = metadata.get("plugin_mtimes", {})
        
        current_plugins = set()
        for plugin_dir in custom_nodes_path.iterdir():
            if plugin_dir.is_dir() and not plugin_dir.name.endswith(".disabled"):
                current_plugins.add(plugin_dir.name)
                
                init_file = plugin_dir / "__init__.py"
                if init_file.exists():
                    current_mtime = init_file.stat().st_mtime
                    stored_mtime = stored_mtimes.get(plugin_dir.name)
                    
                    if stored_mtime is None or current_mtime > stored_mtime:
                        logger.info(f"插件 {plugin_dir.name} 已更新，需要重新扫描")
                        return True

        stored_plugins = set(stored_mtimes.keys())
        if current_plugins != stored_plugins:
            logger.info("插件列表已变更，需要重新扫描")
            return True

        return False

    def clear(self) -> bool:
        cache_path = self.get_cache_path()
        metadata_path = self.get_metadata_path()
        
        try:
            if cache_path.exists():
                cache_path.unlink()
            if metadata_path.exists():
                metadata_path.unlink()
            logger.info("缓存已清除")
            return True
        except Exception as e:
            logger.error(f"清除缓存失败: {e}")
            return False
