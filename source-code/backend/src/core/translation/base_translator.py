"""
翻译器基类

定义翻译器的接口规范，所有翻译器实现都需要继承此类。
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime


@dataclass
class TranslationResult:
    """翻译结果"""
    success: bool
    translated_text: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    provider: Optional[str] = None
    error_message: Optional[str] = None
    latency: Optional[float] = None
    cached: bool = False
    timestamp: Optional[str] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'success': self.success,
            'translated_text': self.translated_text,
            'source_language': self.source_language,
            'target_language': self.target_language,
            'provider': self.provider,
            'error_message': self.error_message,
            'latency': self.latency,
            'cached': self.cached,
            'timestamp': self.timestamp,
        }


class BaseTranslator(ABC):
    """
    翻译器基类
    
    所有翻译器实现都需要继承此类并实现 translate 方法。
    """
    
    PROVIDER_NAME: str = "base"
    
    def __init__(
        self,
        source_language: str = "auto",
        target_language: str = "zh-CN",
        proxy_config: Optional[Dict[str, Any]] = None,
    ):
        """
        初始化翻译器
        
        Args:
            source_language: 源语言，默认为 auto（自动检测）
            target_language: 目标语言，默认为 zh-CN
            proxy_config: 代理配置，格式为 {"enabled": bool, "host": str, "port": str}
        """
        self.source_language = source_language
        self.target_language = target_language
        self.proxy_config = proxy_config or {}
    
    @abstractmethod
    def translate(self, text: str) -> TranslationResult:
        """
        翻译文本
        
        Args:
            text: 要翻译的文本
            
        Returns:
            TranslationResult: 翻译结果
        """
        pass
    
    def _get_proxy_url(self) -> Optional[str]:
        """
        获取代理URL
        
        Returns:
            代理URL，如果未启用代理则返回 None
        """
        if not self.proxy_config.get('enabled', False):
            return None
        
        host = self.proxy_config.get('host', '')
        port = self.proxy_config.get('port', '')
        
        if not host or not port:
            return None
        
        return f"http://{host}:{port}"
    
    def is_available(self) -> bool:
        """
        检查翻译器是否可用
        
        Returns:
            bool: 是否可用
        """
        return True
