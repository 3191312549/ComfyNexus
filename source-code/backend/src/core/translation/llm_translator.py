"""
LLM翻译器实现

使用AI模型进行翻译，复用AI助手的配置管理。
"""

import asyncio
import time
from typing import Optional, Dict, Any

from .base_translator import BaseTranslator, TranslationResult
from backend.src.core.ai.config_manager import ConfigManager
from backend.src.core.ai.providers.factory import ProviderFactory
from backend.src.utils.logger import app_logger as logger


TRANSLATION_SYSTEM_PROMPT = """你是一个专业的翻译助手。请将以下文本翻译成{target_language}，保持原文的格式和结构。

翻译要求：
1. 准确传达原文含义
2. 保持专业术语的一致性
3. 保留原文中的代码块、链接、Markdown格式等
4. 如果原文已经是目标语言或相近语言，直接返回原文
5. 只返回翻译结果，不要添加任何解释或说明

原文：
{text}

翻译结果："""


class LLMTranslator(BaseTranslator):
    """
    LLM翻译器
    
    使用AI模型进行翻译，支持多种LLM提供商。
    """
    
    PROVIDER_NAME = "llm"
    
    def __init__(
        self,
        source_language: str = "auto",
        target_language: str = "zh-CN",
        proxy_config: Optional[Dict[str, Any]] = None,
        config_id: Optional[str] = None,
    ):
        super().__init__(source_language, target_language, proxy_config)
        self.config_id = config_id
        self._config_manager = ConfigManager()
    
    def _get_language_name(self, lang_code: str) -> str:
        """
        获取语言名称
        
        Args:
            lang_code: 语言代码
            
        Returns:
            语言名称
        """
        language_names = {
            'zh-CN': '简体中文',
            'zh-TW': '繁体中文',
            'en-US': '英语',
            'en-GB': '英语',
            'ja': '日语',
            'ko': '韩语',
            'fr': '法语',
            'de': '德语',
            'es': '西班牙语',
            'ru': '俄语',
            'auto': '自动检测',
        }
        return language_names.get(lang_code, lang_code)
    
    def _run_async(self, coro):
        """
        在同步上下文中运行异步协程
        
        Args:
            coro: 异步协程对象
            
        Returns:
            协程执行结果
        """
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, coro)
                    return future.result()
            else:
                return loop.run_until_complete(coro)
        except RuntimeError:
            return asyncio.run(coro)
    
    def translate(self, text: str) -> TranslationResult:
        """
        翻译文本
        
        Args:
            text: 要翻译的文本
            
        Returns:
            TranslationResult: 翻译结果
        """
        if not text or not text.strip():
            return TranslationResult(
                success=False,
                error_message="翻译文本为空",
                provider=self.PROVIDER_NAME,
            )
        
        if not self.config_id:
            return TranslationResult(
                success=False,
                error_message="未配置LLM模型，请在系统设置中选择翻译模型",
                provider=self.PROVIDER_NAME,
            )
        
        start_time = time.time()
        
        try:
            config = self._config_manager.get_config_by_id(self.config_id)
            
            if not config:
                return TranslationResult(
                    success=False,
                    error_message=f"未找到配置: {self.config_id}",
                    provider=self.PROVIDER_NAME,
                )
            
            provider_config = {
                'api_key': config.api_key,
                'base_url': config.base_url,
                'model': config.model,
                'temperature': 0.3,
                'max_tokens': 4096,
            }
            
            use_proxy = self.proxy_config.get('enabled', False) if self.proxy_config else False
            
            provider_instance = ProviderFactory.create(
                config.provider,
                provider_config,
                use_proxy=use_proxy
            )
            
            target_lang_name = self._get_language_name(self.target_language)
            
            prompt = TRANSLATION_SYSTEM_PROMPT.format(
                target_language=target_lang_name,
                text=text
            )
            
            logger.debug(f"[LLMTranslator] 使用配置 {config.alias} 进行翻译，文本长度: {len(text)}")
            
            messages = [{"role": "user", "content": prompt}]
            
            async def do_translation():
                result_text = ""
                async for chunk in provider_instance.chat_stream(messages):
                    if chunk.content:
                        result_text += chunk.content
                    if chunk.finish_reason:
                        break
                return result_text
            
            translated_text = self._run_async(do_translation())
            
            latency = time.time() - start_time
            
            self._config_manager.increment_usage_count(self.config_id)
            
            logger.debug(f"[LLMTranslator] 翻译完成，耗时: {latency:.2f}s")
            
            return TranslationResult(
                success=True,
                translated_text=translated_text,
                source_language=self.source_language,
                target_language=self.target_language,
                provider=self.PROVIDER_NAME,
                latency=latency,
            )
                
        except Exception as e:
            latency = time.time() - start_time
            error_msg = str(e)
            logger.error(f"[LLMTranslator] 翻译异常: {error_msg}")
            
            return TranslationResult(
                success=False,
                error_message=error_msg,
                provider=self.PROVIDER_NAME,
                latency=latency,
            )
    
    def is_available(self) -> bool:
        """
        检查翻译器是否可用
        
        Returns:
            bool: 是否可用
        """
        if not self.config_id:
            return False
        
        try:
            config = self._config_manager.get_config_by_id(self.config_id)
            return config is not None and config.status == 'available'
        except Exception:
            return False
