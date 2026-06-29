"""
节点类型映射服务

提供节点类型到插件ID的映射功能，支持：
1. 从缓存加载映射表
2. 启动时检查更新
3. 提供前端 API 获取映射表
"""

import json
import time
from pathlib import Path
from typing import Optional, Dict

from backend.src.utils.paths import get_cache_dir
from backend.src.utils.logger import app_logger as logger


NODE_TYPE_MAP_CACHE_FILE = "node_type_map.json"
CACHE_DURATION = 24 * 60 * 60


class NodeTypeMapService:
    """
    节点类型映射服务
    
    管理节点类型到插件ID的映射表，支持缓存和更新。
    """
    
    _instance: Optional['NodeTypeMapService'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._node_to_plugin: Dict[str, str] = {}
        self._plugin_info: Dict[str, Dict] = {}
        self._cache_path: Path = get_cache_dir("marketplace") / NODE_TYPE_MAP_CACHE_FILE
        self._last_update_time: float = 0
        self._initialized = True
        
        logger.debug("NodeTypeMapService 初始化完成")
    
    def initialize(self, force_refresh: bool = False) -> bool:
        """
        初始化映射表
        
        Args:
            force_refresh: 是否强制刷新
            
        Returns:
            是否初始化成功
        """
        if not force_refresh and self._load_from_cache():
            logger.info("从缓存加载节点类型映射表成功")
            return True
        
        return self.refresh()
    
    def refresh(self) -> bool:
        """
        刷新映射表（从远程获取最新数据）
        
        Returns:
            是否刷新成功
        """
        try:
            from backend.src.core.marketplace.data_fetcher import PluginDataFetcher
            
            logger.info("开始刷新节点类型映射表...")
            
            fetcher = PluginDataFetcher(cache_dir=get_cache_dir("marketplace"))
            node_to_plugin = fetcher.build_node_type_map(self._cache_path)
            
            if node_to_plugin:
                self._node_to_plugin = node_to_plugin
                self._plugin_info = fetcher._plugin_info_map
                self._last_update_time = time.time()
                logger.info(f"节点类型映射表刷新成功: {len(node_to_plugin)} 个节点类型")
                return True
            else:
                logger.warning("节点类型映射表刷新失败，返回空映射")
                return False
                
        except Exception as e:
            logger.error(f"刷新节点类型映射表时发生错误: {e}")
            return False
    
    def _load_from_cache(self) -> bool:
        """
        从缓存加载映射表
        
        Returns:
            是否加载成功
        """
        try:
            if not self._cache_path.exists():
                logger.debug(f"缓存文件不存在: {self._cache_path}")
                return False
            
            with open(self._cache_path, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            
            timestamp = cache_data.get('timestamp', 0)
            if time.time() - timestamp > CACHE_DURATION:
                logger.debug("缓存已过期")
                return False
            
            self._node_to_plugin = cache_data.get('node_to_plugin', {})
            self._plugin_info = cache_data.get('plugin_info', {})
            self._last_update_time = timestamp
            
            logger.debug(f"从缓存加载映射表: {len(self._node_to_plugin)} 个节点类型")
            return True
            
        except Exception as e:
            logger.error(f"加载缓存失败: {e}")
            return False
    
    def get_plugin_id(self, node_type: str) -> Optional[str]:
        """
        根据节点类型获取插件ID
        
        Args:
            node_type: 节点类型
            
        Returns:
            插件ID，未找到时返回 None
        """
        return self._node_to_plugin.get(node_type)
    
    def get_plugin_info(self, plugin_id: str) -> Optional[Dict]:
        """
        获取插件信息
        
        Args:
            plugin_id: 插件ID
            
        Returns:
            插件信息字典，未找到时返回 None
        """
        return self._plugin_info.get(plugin_id)
    
    def get_full_map(self) -> Dict[str, str]:
        """
        获取完整的节点类型到插件ID映射表
        
        Returns:
            {node_type: plugin_id} 字典
        """
        return self._node_to_plugin.copy()
    
    def get_all_plugin_info(self) -> Dict[str, Dict]:
        """
        获取所有插件信息
        
        Returns:
            {plugin_id: plugin_info} 字典
        """
        return self._plugin_info.copy()
    
    def get_cache_data(self) -> Dict:
        """
        获取缓存数据（用于前端API）
        
        Returns:
            包含 node_to_plugin 和 plugin_info 的字典
        """
        return {
            "node_to_plugin": self._node_to_plugin,
            "plugin_info": self._plugin_info,
            "timestamp": self._last_update_time,
            "node_count": len(self._node_to_plugin),
            "plugin_count": len(self._plugin_info)
        }


node_type_map_service = NodeTypeMapService()
