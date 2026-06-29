"""
API 配置迁移器

负责将旧版本的单配置模式迁移到新的多配置模式。
"""

import json
import logging
from typing import Dict, Any, Optional

from backend.src.core.ai.database import get_db_connection
from backend.src.core.ai.models import AIConfig, APIConfigEntity

logger = logging.getLogger(__name__)


class ConfigMigrator:
    """配置迁移器，负责从旧版本配置迁移到新的多配置模式"""
    
    def __init__(self, config_manager):
        """
        初始化迁移器
        
        Args:
            config_manager: 配置管理器实例
        """
        self.config_manager = config_manager
    
    def needs_migration(self) -> bool:
        """
        检查是否需要迁移
        
        Returns:
            bool: 如果需要迁移返回 True，否则返回 False
        """
        # 检查 api_configs 表是否为空
        configs = self.config_manager.list_configs()
        if len(configs) > 0:
            # 已有新配置，不需要迁移
            return False
        
        # 检查是否有旧配置
        old_config = self._load_old_config()
        return old_config is not None
    
    def migrate(self) -> bool:
        """
        执行迁移
        
        Returns:
            bool: 迁移成功返回 True，失败返回 False
        """
        try:
            # 检查是否需要迁移
            if not self.needs_migration():
                logger.info("无需迁移或已迁移完成")
                return True
            
            # 读取旧配置
            old_config = self._load_old_config()
            if not old_config:
                logger.info("没有找到旧配置，无需迁移")
                return True
            
            logger.info("开始迁移旧配置到新的多配置模式")
            
            # 解析旧配置
            ai_config = AIConfig.from_dict(old_config)
            
            # 为每个启用的服务商创建配置
            default_config_id = None
            migrated_count = 0
            
            for provider_name, provider_config in ai_config.providers.items():
                if not provider_config.enabled:
                    logger.debug(f"跳过未启用的服务商: {provider_name}")
                    continue
                
                # 确定模型
                if provider_name == ai_config.default_provider:
                    model = ai_config.default_model
                else:
                    model = provider_config.models[0] if provider_config.models else ""
                
                # 创建配置实体
                config_entity = APIConfigEntity.create(
                    alias=self._get_provider_display_name(provider_name),
                    provider=provider_name,
                    api_key=provider_config.api_key or "",
                    model=model,
                    base_url=provider_config.base_url,
                    models=provider_config.models,
                    extra=provider_config.extra
                )
                
                # 保存配置
                config_id = self.config_manager.create_config(config_entity)
                logger.info(f"已迁移服务商 {provider_name} 的配置，ID: {config_id}")
                migrated_count += 1
                
                # 记录默认服务商的配置 ID
                if provider_name == ai_config.default_provider:
                    default_config_id = config_id
            
            # 设置默认配置（优先使用旧配置中的默认服务商）
            if default_config_id:
                self.config_manager.set_default_config(default_config_id)
                logger.info(f"已设置默认配置: {default_config_id}")
            
            logger.info(f"配置迁移完成，共迁移 {migrated_count} 个配置")
            return True
            
        except Exception as e:
            logger.error(f"配置迁移失败: {e}", exc_info=True)
            return False
    
    def _load_old_config(self) -> Optional[Dict[str, Any]]:
        """
        从旧的 ai_settings 表加载配置
        
        Returns:
            Optional[Dict[str, Any]]: 旧配置字典，不存在则返回 None
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT value FROM ai_settings WHERE key = 'config'"
                )
                row = cursor.fetchone()
                if row:
                    return json.loads(row["value"])
                return None
        except Exception as e:
            logger.debug(f"加载旧配置失败: {e}")
            return None
    
    def _get_provider_display_name(self, provider: str) -> str:
        """
        获取服务商的显示名称
        
        Args:
            provider: 服务商标识
            
        Returns:
            str: 服务商的显示名称
        """
        display_names = {
            "openai": "OpenAI",
            "xflow": "XFlow（心流）",
            "iflow": "iFlow",
            "custom-openai": "通用 OpenAI API",
            "spark": "讯飞星火",
            "volcengine": "火山引擎（豆包）",
            "zhipu": "智谱 AI",
            "ollama": "Ollama（本地模型）"
        }
        return display_names.get(provider, provider)
