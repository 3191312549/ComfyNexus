"""
翻译管理器

统一管理翻译服务，提供翻译功能的入口。
"""

from typing import Optional, Dict, Any

from .base_translator import TranslationResult
from .google_translator import GoogleTranslator
from .llm_translator import LLMTranslator
from .translation_cache import TranslationCache
from backend.src.core.settings_manager import SettingsManager
from backend.src.utils.logger import app_logger as logger


class TranslationManager:
    """
    翻译管理器
    
    统一管理翻译服务，支持：
    - 根据设置选择翻译器
    - 缓存翻译结果
    - 代理配置
    """
    
    def __init__(self, settings_manager: Optional[SettingsManager] = None):
        """
        初始化翻译管理器
        
        Args:
            settings_manager: 设置管理器实例
        """
        self.settings_manager = settings_manager or SettingsManager()
        self.cache = TranslationCache()
        self._google_translator = None
        self._llm_translator = None
    
    def _get_proxy_config(self) -> Dict[str, Any]:
        """
        获取代理配置
        
        Returns:
            代理配置字典
        """
        settings = self.settings_manager.load_config()
        proxy_settings = settings.get('proxy', {})
        
        return {
            'enabled': proxy_settings.get('enabled', False),
            'host': proxy_settings.get('host', ''),
            'port': proxy_settings.get('port', ''),
        }
    
    def _get_translation_settings(self) -> Dict[str, Any]:
        """
        获取翻译设置
        
        Returns:
            翻译设置字典
        """
        settings = self.settings_manager.load_config()
        return settings.get('translation', {
            'provider': 'google',
            'llmConfigId': '',
            'sourceLanguage': 'auto',
            'targetLanguage': 'zh-CN',
        })
    
    def _get_google_translator(self, target_lang: str) -> GoogleTranslator:
        """
        获取Google翻译器实例
        
        Args:
            target_lang: 目标语言
            
        Returns:
            GoogleTranslator 实例
        """
        proxy_config = self._get_proxy_config()
        
        return GoogleTranslator(
            source_language='auto',
            target_language=target_lang,
            proxy_config=proxy_config,
        )
    
    def _get_llm_translator(self, config_id: str, target_lang: str) -> LLMTranslator:
        """
        获取LLM翻译器实例
        
        Args:
            config_id: LLM配置ID
            target_lang: 目标语言
            
        Returns:
            LLMTranslator 实例
        """
        proxy_config = self._get_proxy_config()
        
        return LLMTranslator(
            source_language='auto',
            target_language=target_lang,
            proxy_config=proxy_config,
            config_id=config_id,
        )
    
    def translate(
        self,
        text: str,
        provider: Optional[str] = None,
        llm_config_id: Optional[str] = None,
        target_lang: Optional[str] = None,
        use_cache: bool = True,
        cache_key: Optional[str] = None,
    ) -> TranslationResult:
        """
        翻译文本
        
        Args:
            text: 要翻译的文本
            provider: 翻译提供商（"google" 或 "llm"），默认使用设置中的值
            llm_config_id: LLM配置ID（provider为"llm"时使用）
            target_lang: 目标语言，默认使用设置中的值
            use_cache: 是否使用缓存
            cache_key: 可选的自定义缓存键（如 commit hash）
            
        Returns:
            TranslationResult: 翻译结果
        """
        if not text or not text.strip():
            return TranslationResult(
                success=False,
                error_message="翻译文本为空",
                provider="none",
            )
        
        translation_settings = self._get_translation_settings()
        
        provider = provider or translation_settings.get('provider', 'google')
        target_lang = target_lang or translation_settings.get('targetLanguage', 'zh-CN')
        
        if provider == 'llm':
            llm_config_id = llm_config_id or translation_settings.get('llmConfigId', '')
        
        if use_cache:
            cached_result = self.cache.get(text, provider, target_lang, cache_key)
            if cached_result:
                return TranslationResult(
                    success=True,
                    translated_text=cached_result,
                    source_language='auto',
                    target_language=target_lang,
                    provider=provider,
                    cached=True,
                )
        
        logger.debug(f"[TranslationManager] 开始翻译，提供商: {provider}, 目标语言: {target_lang}")
        
        try:
            if provider == 'google':
                translator = self._get_google_translator(target_lang)
                result = translator.translate(text)
            elif provider == 'llm':
                if not llm_config_id:
                    return TranslationResult(
                        success=False,
                        error_message="未配置LLM模型，请在系统设置中选择翻译模型",
                        provider=provider,
                    )
                translator = self._get_llm_translator(llm_config_id, target_lang)
                result = translator.translate(text)
            else:
                return TranslationResult(
                    success=False,
                    error_message=f"不支持的翻译提供商: {provider}",
                    provider=provider,
                )
            
            if result.success and use_cache:
                self.cache.set(
                    text=text,
                    translated_text=result.translated_text,
                    provider=provider,
                    target_lang=target_lang,
                    source_lang=result.source_language,
                    cache_key=cache_key,
                )
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[TranslationManager] 翻译失败: {error_msg}")
            
            return TranslationResult(
                success=False,
                error_message=error_msg,
                provider=provider,
            )
    
    def clear_cache(self) -> Dict[str, Any]:
        """
        清除翻译缓存
        
        Returns:
            操作结果
        """
        try:
            deleted_count = self.cache.clear()
            return {
                'success': True,
                'message': f'已清除 {deleted_count} 条缓存',
                'deleted_count': deleted_count,
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'清除缓存失败: {str(e)}',
            }
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        获取缓存统计信息
        
        Returns:
            统计信息
        """
        return self.cache.get_stats()
    
    def get_settings(self) -> Dict[str, Any]:
        """
        获取翻译设置
        
        Returns:
            翻译设置
        """
        return self._get_translation_settings()
    
    def update_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """
        更新翻译设置
        
        Args:
            settings: 新的翻译设置
            
        Returns:
            操作结果
        """
        try:
            current_config = self.settings_manager.load_config()
            
            if 'translation' not in current_config:
                current_config['translation'] = {}
            
            current_config['translation'].update(settings)
            
            self.settings_manager.save_config(current_config)
            
            logger.info(f"[TranslationManager] 翻译设置已更新: {settings}")
            
            return {
                'success': True,
                'message': '翻译设置已保存',
                'settings': current_config['translation'],
            }
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[TranslationManager] 更新翻译设置失败: {error_msg}")
            
            return {
                'success': False,
                'message': f'更新翻译设置失败: {error_msg}',
            }
    
    def translate_batch(
        self,
        items: list,
        provider: Optional[str] = None,
        llm_config_id: Optional[str] = None,
        target_lang: Optional[str] = None,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        批量翻译多条文本
        
        Args:
            items: 要翻译的条目列表，格式为 [{"id": "xxx", "text": "xxx"}, ...]
            provider: 翻译提供商（"google" 或 "llm"），默认使用设置中的值
            llm_config_id: LLM配置ID（provider为"llm"时使用）
            target_lang: 目标语言，默认使用设置中的值
            use_cache: 是否使用缓存
            
        Returns:
            {
                "success": True,
                "results": [{"id": "xxx", "translated": "翻译结果"}, ...]
            }
        """
        if not items:
            return {
                'success': True,
                'results': [],
            }
        
        translation_settings = self._get_translation_settings()
        provider = provider or translation_settings.get('provider', 'google')
        target_lang = target_lang or translation_settings.get('targetLanguage', 'zh-CN')
        
        if provider == 'llm':
            llm_config_id = llm_config_id or translation_settings.get('llmConfigId', '')
        
        results = []
        
        for item in items:
            item_id = item.get('id', '')
            text = item.get('text', '')
            
            if not text or not text.strip():
                results.append({
                    'id': item_id,
                    'translated': '',
                    'success': False,
                    'error': '翻译文本为空',
                })
                continue
            
            result = self.translate(
                text=text,
                provider=provider,
                llm_config_id=llm_config_id,
                target_lang=target_lang,
                use_cache=use_cache,
                cache_key=item_id,
            )
            
            if result.success:
                results.append({
                    'id': item_id,
                    'translated': result.translated_text,
                    'success': True,
                    'cached': result.cached,
                })
            else:
                results.append({
                    'id': item_id,
                    'translated': text,
                    'success': False,
                    'error': result.error_message,
                })
        
        return {
            'success': True,
            'results': results,
            'provider': provider,
            'target_lang': target_lang,
        }
