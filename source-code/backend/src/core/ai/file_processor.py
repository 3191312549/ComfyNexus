"""
文件处理器模块

提供统一的文件处理接口，支持图片和文档的处理。
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pathlib import Path
import base64
import logging

logger = logging.getLogger(__name__)


class FileProcessor(ABC):
    """
    文件处理器抽象基类
    
    定义统一的文件处理接口，所有具体的文件处理器都应该继承此类。
    """
    
    def __init__(self):
        """初始化文件处理器"""
        self.logger = logging.getLogger(self.__class__.__name__)
    
    @abstractmethod
    def can_process(self, mime_type: str, file_name: str) -> bool:
        """
        判断是否可以处理指定类型的文件
        
        Args:
            mime_type: 文件的 MIME 类型
            file_name: 文件名
            
        Returns:
            bool: 是否可以处理
        """
        pass
    
    @abstractmethod
    def process(self, file_data: bytes, file_name: str, mime_type: str) -> Dict[str, Any]:
        """
        处理文件
        
        Args:
            file_data: 文件的二进制数据
            file_name: 文件名
            mime_type: 文件的 MIME 类型
            
        Returns:
            Dict[str, Any]: 处理结果，包含以下字段：
                - type: 文件类型（"image" 或 "document"）
                - content: 处理后的内容（Base64 或文本）
                - content_type: 内容类型（"base64" 或 "text"）
                - thumbnail: 缩略图 Base64（仅图片，可选）
                - metadata: 文件元数据
        """
        pass
    
    def validate_file_size(self, file_data: bytes, max_size: int = 20 * 1024 * 1024) -> bool:
        """
        验证文件大小
        
        Args:
            file_data: 文件的二进制数据
            max_size: 最大文件大小（字节），默认 20MB
            
        Returns:
            bool: 文件大小是否符合要求
        """
        return len(file_data) <= max_size
    
    def encode_base64(self, file_data: bytes, mime_type: str) -> str:
        """
        将文件编码为 Base64 格式
        
        Args:
            file_data: 文件的二进制数据
            mime_type: 文件的 MIME 类型
            
        Returns:
            str: Base64 编码的字符串（包含 data URI 前缀）
        """
        try:
            base64_data = base64.b64encode(file_data).decode('utf-8')
            return f"data:{mime_type};base64,{base64_data}"
        except Exception as e:
            self.logger.error(f"Base64 编码失败: {e}")
            raise
    
    def get_file_extension(self, file_name: str) -> str:
        """
        获取文件扩展名
        
        Args:
            file_name: 文件名
            
        Returns:
            str: 文件扩展名（小写，不包含点）
        """
        return Path(file_name).suffix.lower().lstrip('.')
    
    def create_metadata(self, file_name: str, file_size: int, mime_type: str, **kwargs) -> Dict[str, Any]:
        """
        创建文件元数据
        
        Args:
            file_name: 文件名
            file_size: 文件大小（字节）
            mime_type: MIME 类型
            **kwargs: 其他元数据字段
            
        Returns:
            Dict[str, Any]: 文件元数据
        """
        metadata = {
            "original_name": file_name,
            "size": file_size,
            "mime_type": mime_type,
        }
        metadata.update(kwargs)
        return metadata


class FileProcessorFactory:
    """
    文件处理器工厂类
    
    根据文件类型选择合适的处理器。
    """
    
    def __init__(self):
        """初始化工厂"""
        self.processors = []
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def register_processor(self, processor: FileProcessor) -> None:
        """
        注册文件处理器
        
        Args:
            processor: 文件处理器实例
        """
        self.processors.append(processor)
        self.logger.debug(f"注册文件处理器: {processor.__class__.__name__}")
    
    def get_processor(self, mime_type: str, file_name: str) -> Optional[FileProcessor]:
        """
        获取合适的文件处理器
        
        Args:
            mime_type: 文件的 MIME 类型
            file_name: 文件名
            
        Returns:
            Optional[FileProcessor]: 文件处理器实例，如果没有合适的处理器则返回 None
        """
        for processor in self.processors:
            if processor.can_process(mime_type, file_name):
                self.logger.debug(f"选择处理器: {processor.__class__.__name__}")
                return processor
        
        self.logger.warning(f"未找到合适的处理器: mime_type={mime_type}, file_name={file_name}")
        return None
    
    def process_file(self, file_data: bytes, file_name: str, mime_type: str) -> Dict[str, Any]:
        """
        处理文件
        
        Args:
            file_data: 文件的二进制数据
            file_name: 文件名
            mime_type: 文件的 MIME 类型
            
        Returns:
            Dict[str, Any]: 处理结果
            
        Raises:
            ValueError: 如果没有合适的处理器或处理失败
        """
        processor = self.get_processor(mime_type, file_name)
        
        if processor is None:
            raise ValueError(f"不支持的文件类型: {mime_type}")
        
        try:
            return processor.process(file_data, file_name, mime_type)
        except Exception as e:
            self.logger.error(f"文件处理失败: {e}", exc_info=True)
            raise ValueError(f"文件处理失败: {str(e)}")


# 全局工厂实例
_factory = None


def get_file_processor_factory() -> FileProcessorFactory:
    """
    获取全局文件处理器工厂实例
    
    Returns:
        FileProcessorFactory: 工厂实例
    """
    global _factory
    if _factory is None:
        _factory = FileProcessorFactory()
        # 注册默认处理器
        _register_default_processors(_factory)
    return _factory


def _register_default_processors(factory: FileProcessorFactory) -> None:
    """
    注册默认的文件处理器
    
    Args:
        factory: 工厂实例
    """
    # 延迟导入，避免循环依赖
    from backend.src.core.ai.image_processor import ImageProcessor
    from backend.src.core.ai.document_processor import DocumentProcessor
    
    factory.register_processor(ImageProcessor())
    factory.register_processor(DocumentProcessor())
