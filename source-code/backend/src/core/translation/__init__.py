"""
翻译模块

提供统一的翻译服务，支持多种翻译方式：
- Google翻译（免费网页接口）
- LLM翻译（使用AI模型）
"""

from .base_translator import BaseTranslator, TranslationResult
from .google_translator import GoogleTranslator
from .llm_translator import LLMTranslator
from .translation_cache import TranslationCache
from .translation_manager import TranslationManager

__all__ = [
    'BaseTranslator',
    'TranslationResult',
    'GoogleTranslator',
    'LLMTranslator',
    'TranslationCache',
    'TranslationManager',
]
