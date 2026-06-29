"""
Google翻译器实现

使用 deep-translator 库实现 Google 翻译功能。
"""

import re
import time
from typing import Optional, Dict, Any, List

from .base_translator import BaseTranslator, TranslationResult
from .html_processor import convert_html_to_readable_text, convert_text_to_html
from backend.src.utils.logger import app_logger as logger


MAX_TEXT_LENGTH = 4900


class GoogleTranslator(BaseTranslator):
    """
    Google翻译器
    
    使用 deep-translator 库的免费网页接口进行翻译。
    """
    
    PROVIDER_NAME = "google"
    
    def __init__(
        self,
        source_language: str = "auto",
        target_language: str = "zh-CN",
        proxy_config: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(source_language, target_language, proxy_config)
        self._translator = None
    
    def _get_translator(self):
        """
        获取翻译器实例（延迟初始化）
        
        Returns:
            GoogleTranslator 实例
        """
        if self._translator is not None:
            return self._translator
        
        try:
            from deep_translator import GoogleTranslator as DeepGoogleTranslator
            
            proxy_url = self._get_proxy_url()
            
            if proxy_url:
                logger.debug(f"[GoogleTranslator] 使用代理: {proxy_url}")
                self._translator = DeepGoogleTranslator(
                    source=self.source_language,
                    target=self._convert_language_code(self.target_language),
                    proxies={"http": proxy_url, "https": proxy_url}
                )
            else:
                self._translator = DeepGoogleTranslator(
                    source=self.source_language,
                    target=self._convert_language_code(self.target_language)
                )
            
            return self._translator
            
        except ImportError as e:
            logger.error(f"[GoogleTranslator] deep-translator 库未安装: {e}")
            raise ImportError("请安装 deep-translator 库: pip install deep-translator")
        except Exception as e:
            logger.error(f"[GoogleTranslator] 初始化翻译器失败: {e}")
            raise
    
    def _convert_language_code(self, lang_code: str) -> str:
        """
        转换语言代码格式
        
        deep-translator 使用的语言代码格式与我们的格式可能不同。
        例如：zh-CN -> zh-CN (Google支持), en-US -> en
        
        Args:
            lang_code: 语言代码
            
        Returns:
            转换后的语言代码
        """
        language_map = {
            'zh-CN': 'zh-CN',
            'zh-TW': 'zh-TW',
            'en-US': 'en',
            'en-GB': 'en',
            'ja': 'ja',
            'ko': 'ko',
            'fr': 'fr',
            'de': 'de',
            'es': 'es',
            'ru': 'ru',
            'auto': 'auto',
        }
        return language_map.get(lang_code, lang_code.split('-')[0] if '-' in lang_code else lang_code)
    
    def _split_text_for_translation(self, text: str, max_length: int = MAX_TEXT_LENGTH) -> List[str]:
        """
        将文本按段落分割成多个片段，每个片段不超过最大长度
        
        Args:
            text: 文本内容
            max_length: 每个片段的最大长度
            
        Returns:
            分割后的文本片段列表
        """
        if len(text) <= max_length:
            return [text]
        
        paragraphs = text.split('\n\n')
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            if not para or not para.strip():
                continue
            
            if len(current_chunk) + len(para) + 2 <= max_length:
                current_chunk += ("\n\n" if current_chunk else "") + para
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                
                if len(para) > max_length:
                    sub_chunks = self._split_by_length(para, max_length)
                    chunks.extend(sub_chunks)
                    current_chunk = ""
                else:
                    current_chunk = para
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _split_by_length(self, text: str, max_length: int) -> List[str]:
        """
        按固定长度分割文本
        
        Args:
            text: 要分割的文本
            max_length: 每个片段的最大长度
            
        Returns:
            分割后的文本片段列表
        """
        chunks = []
        lines = text.split('\n')
        current_chunk = ""
        
        for line in lines:
            if len(current_chunk) + len(line) + 1 <= max_length:
                current_chunk += ("\n" if current_chunk else "") + line
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                
                if len(line) > max_length:
                    for i in range(0, len(line), max_length):
                        chunks.append(line[i:i + max_length])
                    current_chunk = ""
                else:
                    current_chunk = line
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _is_html_content(self, text: str) -> bool:
        """
        检测文本是否包含 HTML 内容
        
        Args:
            text: 文本内容
            
        Returns:
            是否为 HTML 内容
        """
        html_patterns = [
            r'<[a-zA-Z][^>]*>',
            r'</[a-zA-Z]+>',
        ]
        for pattern in html_patterns:
            if re.search(pattern, text):
                return True
        return False
    
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
        
        start_time = time.time()
        
        try:
            translator = self._get_translator()
            
            text_length = len(text)
            is_html = self._is_html_content(text)
            
            logger.debug(f"[GoogleTranslator] 开始翻译，文本长度: {text_length}, HTML内容: {is_html}")
            
            if is_html:
                logger.debug(f"[GoogleTranslator] 检测到 HTML 内容，转换为可读文本")
                text_to_translate = convert_html_to_readable_text(text)
                logger.debug(f"[GoogleTranslator] 转换后文本长度: {len(text_to_translate)}")
            else:
                text_to_translate = text
            
            if len(text_to_translate) > MAX_TEXT_LENGTH:
                logger.debug(f"[GoogleTranslator] 文本过长，启用分段翻译")
                
                chunks = self._split_text_for_translation(text_to_translate)
                logger.debug(f"[GoogleTranslator] 分割为 {len(chunks)} 个片段")
                
                translated_chunks = []
                for i, chunk in enumerate(chunks):
                    if not chunk or not chunk.strip():
                        continue
                    
                    logger.debug(f"[GoogleTranslator] 翻译片段 {i + 1}/{len(chunks)}, 长度: {len(chunk)}")
                    translated_chunk = translator.translate(chunk)
                    translated_chunks.append(translated_chunk)
                
                translated_text = "\n\n".join(translated_chunks)
            else:
                translated_text = translator.translate(text_to_translate)
            
            if is_html:
                logger.debug(f"[GoogleTranslator] 将翻译结果转换为 HTML")
                translated_text = convert_text_to_html(translated_text)
            
            latency = time.time() - start_time
            
            logger.debug(f"[GoogleTranslator] 翻译完成，耗时: {latency:.2f}s")
            
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
            logger.error(f"[GoogleTranslator] 翻译失败: {error_msg}")
            
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
        try:
            from deep_translator import GoogleTranslator as DeepGoogleTranslator
            return True
        except ImportError:
            logger.warning("[GoogleTranslator] deep-translator 库未安装")
            return False
