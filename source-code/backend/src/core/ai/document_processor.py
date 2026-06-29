"""
文档处理器模块

负责文档文件的处理，包括文本提取和 Base64 编码降级方案。
"""

from typing import Dict, Any
import logging

from backend.src.core.ai.file_processor import FileProcessor
from backend.src.core.ai.text_extractors import TextExtractorFactory

logger = logging.getLogger(__name__)


class DocumentProcessor(FileProcessor):
    """
    文档处理器
    
    处理文档文件，提供文本提取和 Base64 编码降级方案。
    支持的格式：
    - 纯文本：txt, md, json, xml, csv, log
    - 代码文件：py, js, ts, jsx, tsx, java, cpp, c, h, cs, go, rs, rb, php, html, css, scss, yaml, yml, toml, ini, sh, bat
    - Office 文档：pdf, docx, xlsx（后续实现）
    """
    
    # 纯文本文件的 MIME 类型
    TEXT_MIME_TYPES = {
        'text/plain',
        'text/markdown',
        'text/csv',
        'text/xml',
        'application/json',
        'application/xml',
    }
    
    # 纯文本文件的扩展名
    TEXT_EXTENSIONS = {
        'txt', 'md', 'json', 'xml', 'csv', 'log',
        # 代码文件
        'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'h', 'cs',
        'go', 'rs', 'rb', 'php', 'html', 'css', 'scss', 'sass', 'less',
        'yaml', 'yml', 'toml', 'ini', 'sh', 'bat', 'ps1', 'vue', 'svelte',
    }
    
    # Office 文档的 MIME 类型（后续支持）
    OFFICE_MIME_TYPES = {
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # xlsx
        'application/msword',  # doc
        'application/vnd.ms-excel',  # xls
    }
    
    # Office 文档的扩展名（后续支持）
    OFFICE_EXTENSIONS = {
        'pdf', 'docx', 'xlsx', 'doc', 'xls'
    }
    
    def __init__(self):
        """初始化文档处理器"""
        super().__init__()
        self.text_extractor_factory = TextExtractorFactory()
    
    def can_process(self, mime_type: str, file_name: str) -> bool:
        """
        判断是否可以处理指定类型的文件
        
        Args:
            mime_type: 文件的 MIME 类型
            file_name: 文件名
            
        Returns:
            bool: 是否可以处理
        """
        # 检查 MIME 类型
        mime_lower = mime_type.lower()
        if mime_lower in self.TEXT_MIME_TYPES or mime_lower in self.OFFICE_MIME_TYPES:
            return True
        
        # 检查文件扩展名
        extension = self.get_file_extension(file_name)
        return extension in self.TEXT_EXTENSIONS or extension in self.OFFICE_EXTENSIONS

    def process(self, file_data: bytes, file_name: str, mime_type: str) -> Dict[str, Any]:
        """
        处理文档文件
        
        流程：
        1. 检测文档类型
        2. 纯文本文件：直接读取文本内容
        3. Office 文档：尝试提取文本，失败则使用 Base64 编码
        4. 返回处理结果
        
        Args:
            file_data: 文件的二进制数据
            file_name: 文件名
            mime_type: 文件的 MIME 类型
            
        Returns:
            Dict[str, Any]: 处理结果，包含以下字段：
                - type: "document"
                - content: 文本内容或 Base64 编码
                - content_type: "text" 或 "base64"
                - metadata: 文件元数据
                
        Raises:
            ValueError: 如果文档处理失败
        """
        try:
            # 验证文件大小
            if not self.validate_file_size(file_data):
                raise ValueError(f"文档文件大小超过限制（最大 20MB）")
            
            # 检测文档类型
            extension = self.get_file_extension(file_name)
            
            # 处理纯文本文件
            if self._is_text_file(mime_type, extension):
                return self._process_text_file(file_data, file_name, mime_type)
            
            # 处理 Office 文档（后续实现，当前使用 Base64 降级）
            if self._is_office_file(mime_type, extension):
                return self._process_office_file(file_data, file_name, mime_type)
            
            # 未知类型，使用 Base64 编码
            self.logger.warning(f"未知文档类型，使用 Base64 编码: {file_name}")
            return self._fallback_to_base64(file_data, file_name, mime_type)
            
        except ValueError:
            # 重新抛出 ValueError
            raise
        except Exception as e:
            self.logger.error(f"文档处理失败: {e}", exc_info=True)
            raise ValueError(f"文档处理失败: {str(e)}")
    
    def _is_text_file(self, mime_type: str, extension: str) -> bool:
        """
        判断是否为纯文本文件
        
        Args:
            mime_type: MIME 类型
            extension: 文件扩展名
            
        Returns:
            bool: 是否为纯文本文件
        """
        return mime_type.lower() in self.TEXT_MIME_TYPES or extension in self.TEXT_EXTENSIONS
    
    def _is_office_file(self, mime_type: str, extension: str) -> bool:
        """
        判断是否为 Office 文档
        
        Args:
            mime_type: MIME 类型
            extension: 文件扩展名
            
        Returns:
            bool: 是否为 Office 文档
        """
        return mime_type.lower() in self.OFFICE_MIME_TYPES or extension in self.OFFICE_EXTENSIONS
    
    def _process_text_file(self, file_data: bytes, file_name: str, mime_type: str) -> Dict[str, Any]:
        """
        处理纯文本文件
        
        Args:
            file_data: 文件的二进制数据
            file_name: 文件名
            mime_type: MIME 类型
            
        Returns:
            Dict[str, Any]: 处理结果
            
        Raises:
            ValueError: 如果文本读取失败
        """
        try:
            # 尝试使用 UTF-8 解码
            try:
                text_content = file_data.decode('utf-8')
            except UnicodeDecodeError:
                # 尝试使用 GBK 解码（中文文件）
                try:
                    text_content = file_data.decode('gbk')
                    self.logger.debug(f"使用 GBK 编码读取文件: {file_name}")
                except UnicodeDecodeError:
                    # 尝试使用 Latin-1 解码（兜底方案）
                    text_content = file_data.decode('latin-1')
                    self.logger.debug(f"使用 Latin-1 编码读取文件: {file_name}")
            
            # 创建元数据
            metadata = self.create_metadata(
                file_name=file_name,
                file_size=len(file_data),
                mime_type=mime_type,
                extracted_text_length=len(text_content),
                extraction_method='plain_text',
                extraction_success=True
            )
            
            self.logger.info(f"纯文本文件处理成功: {file_name} ({len(text_content)} 字符)")
            
            return {
                "type": "document",
                "content": text_content,
                "content_type": "text",
                "metadata": metadata
            }
            
        except Exception as e:
            self.logger.error(f"纯文本文件读取失败: {e}", exc_info=True)
            # 降级到 Base64 编码
            self.logger.warning(f"降级到 Base64 编码: {file_name}")
            return self._fallback_to_base64(file_data, file_name, mime_type)
    
    def _process_office_file(self, file_data: bytes, file_name: str, mime_type: str) -> Dict[str, Any]:
        """
        处理 Office 文档
        
        尝试提取文本，失败则使用 Base64 编码降级方案。
        
        Args:
            file_data: 文件的二进制数据
            file_name: 文件名
            mime_type: MIME 类型
            
        Returns:
            Dict[str, Any]: 处理结果
        """
        # 获取文件扩展名
        extension = self.get_file_extension(file_name)
        
        # 尝试使用文本提取器提取文本
        try:
            extracted_text = self.text_extractor_factory.extract_text(
                file_data, file_name, mime_type, extension
            )
            
            if extracted_text:
                # 文本提取成功
                metadata = self.create_metadata(
                    file_name=file_name,
                    file_size=len(file_data),
                    mime_type=mime_type,
                    extracted_text_length=len(extracted_text),
                    extraction_method=self._get_extraction_method(extension),
                    extraction_success=True
                )
                
                self.logger.info(f"Office 文档文本提取成功: {file_name} ({len(extracted_text)} 字符)")
                
                return {
                    "type": "document",
                    "content": extracted_text,
                    "content_type": "text",
                    "metadata": metadata
                }
        except Exception as e:
            self.logger.warning(f"Office 文档文本提取失败，降级到 Base64 编码: {file_name}, 错误: {e}")
        
        # 文本提取失败，使用 Base64 编码降级方案
        return self._fallback_to_base64(file_data, file_name, mime_type)
    
    def _get_extraction_method(self, extension: str) -> str:
        """
        根据文件扩展名获取提取方法名称
        
        Args:
            extension: 文件扩展名
            
        Returns:
            str: 提取方法名称
        """
        if extension == 'pdf':
            return 'pdf'
        elif extension in ('docx', 'doc'):
            return 'docx'
        elif extension in ('xlsx', 'xls'):
            return 'xlsx'
        else:
            return 'unknown'
    
    def _fallback_to_base64(self, file_data: bytes, file_name: str, mime_type: str) -> Dict[str, Any]:
        """
        降级方案：使用 Base64 编码
        
        Args:
            file_data: 文件的二进制数据
            file_name: 文件名
            mime_type: MIME 类型
            
        Returns:
            Dict[str, Any]: 处理结果
        """
        try:
            # Base64 编码
            base64_content = self.encode_base64(file_data, mime_type)
            
            # 创建元数据
            metadata = self.create_metadata(
                file_name=file_name,
                file_size=len(file_data),
                mime_type=mime_type,
                extraction_method='base64',
                extraction_success=False
            )
            
            self.logger.info(f"文档使用 Base64 编码: {file_name} ({len(file_data)} bytes)")
            
            return {
                "type": "document",
                "content": base64_content,
                "content_type": "base64",
                "metadata": metadata
            }
            
        except Exception as e:
            self.logger.error(f"Base64 编码失败: {e}", exc_info=True)
            raise ValueError(f"Base64 编码失败: {str(e)}")
