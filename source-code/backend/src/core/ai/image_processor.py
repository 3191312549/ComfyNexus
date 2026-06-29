"""
图片处理器模块

负责图片文件的处理，包括 Base64 编码和缩略图生成。
"""

from typing import Dict, Any
from io import BytesIO
from PIL import Image
import logging

from backend.src.core.ai.file_processor import FileProcessor

logger = logging.getLogger(__name__)


class ImageProcessor(FileProcessor):
    """
    图片处理器
    
    处理图片文件，提供 Base64 编码和缩略图生成功能。
    支持的格式：jpg, jpeg, png, gif, webp, bmp
    """
    
    # 支持的图片 MIME 类型
    SUPPORTED_MIME_TYPES = {
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp'
    }
    
    # 支持的图片扩展名
    SUPPORTED_EXTENSIONS = {
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'
    }
    
    # 缩略图尺寸
    THUMBNAIL_SIZE = (100, 100)
    
    # 多模态图片最大尺寸（用于发送给 AI）
    # 限制图片尺寸以减小 Base64 数据大小
    MAX_MULTIMODAL_SIZE = (2048, 2048)  # 2048x2048，提高分辨率
    MAX_MULTIMODAL_QUALITY = 95  # JPEG 质量，提高到 95%
    
    def __init__(self):
        """初始化图片处理器"""
        super().__init__()
    
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
        if mime_type.lower() in self.SUPPORTED_MIME_TYPES:
            return True
        
        # 检查文件扩展名
        extension = self.get_file_extension(file_name)
        return extension in self.SUPPORTED_EXTENSIONS
    
    def process(self, file_data: bytes, file_name: str, mime_type: str) -> Dict[str, Any]:
        """
        处理图片文件
        
        流程：
        1. 验证图片格式
        2. Base64 编码
        3. 生成缩略图（100x100）
        4. 返回处理结果
        
        Args:
            file_data: 文件的二进制数据
            file_name: 文件名
            mime_type: 文件的 MIME 类型
            
        Returns:
            Dict[str, Any]: 处理结果，包含以下字段：
                - type: "image"
                - content: Base64 编码的图片数据
                - content_type: "base64"
                - thumbnail: 缩略图 Base64 数据
                - metadata: 文件元数据
                
        Raises:
            ValueError: 如果图片处理失败
        """
        try:
            # 验证文件大小
            if not self.validate_file_size(file_data):
                raise ValueError(f"图片文件大小超过限制（最大 20MB）")
            
            # 验证图片格式并加载图片
            try:
                image = Image.open(BytesIO(file_data))
                image.verify()  # 验证图片完整性
                # 重新打开图片（verify 后需要重新打开）
                image = Image.open(BytesIO(file_data))
            except Exception as e:
                self.logger.error(f"图片格式验证失败: {e}")
                raise ValueError(f"无效的图片格式: {str(e)}")
            
            # Base64 编码
            # 注意：不直接编码原始图片，而是压缩后再编码
            base64_content = self._encode_for_multimodal(image, mime_type, file_data)
            
            # 生成缩略图
            thumbnail_base64 = self._generate_thumbnail(image, mime_type)
            
            # 创建元数据
            metadata = self.create_metadata(
                file_name=file_name,
                file_size=len(file_data),
                mime_type=mime_type,
                width=image.width,
                height=image.height,
                format=image.format
            )
            
            self.logger.info(f"图片处理成功: {file_name} ({len(file_data)} bytes)")
            
            return {
                "type": "image",
                "content": base64_content,
                "content_type": "base64",
                "thumbnail": thumbnail_base64,
                "metadata": metadata
            }
            
        except ValueError:
            # 重新抛出 ValueError
            raise
        except Exception as e:
            self.logger.error(f"图片处理失败: {e}", exc_info=True)
            raise ValueError(f"图片处理失败: {str(e)}")
    
    def _encode_for_multimodal(self, image: Image.Image, mime_type: str, original_data: bytes) -> str:
        """
        为多模态 AI 编码图片（压缩以减小大小）
        
        Args:
            image: PIL Image 对象
            mime_type: 原始图片的 MIME 类型
            original_data: 原始图片数据
            
        Returns:
            str: Base64 编码的图片数据（包含 data URI 前缀）
        """
        try:
            # 检查图片尺寸
            width, height = image.size
            original_size = len(original_data)
            
            self.logger.info(f"原始图片尺寸: {width}x{height}, 大小: {original_size / 1024:.2f} KB")
            
            # 如果图片尺寸或大小超过限制，进行压缩
            needs_resize = width > self.MAX_MULTIMODAL_SIZE[0] or height > self.MAX_MULTIMODAL_SIZE[1]
            needs_compress = original_size > 2 * 1024 * 1024  # 2MB，提高触发阈值
            
            if needs_resize or needs_compress:
                self.logger.info(f"图片需要压缩: needs_resize={needs_resize}, needs_compress={needs_compress}")
                
                # 创建副本
                compressed = image.copy()
                
                # 转换为 RGB（JPEG 不支持透明度）
                if compressed.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', compressed.size, (255, 255, 255))
                    if compressed.mode == 'P':
                        compressed = compressed.convert('RGBA')
                    background.paste(compressed, mask=compressed.split()[-1] if compressed.mode in ('RGBA', 'LA') else None)
                    compressed = background
                elif compressed.mode != 'RGB':
                    compressed = compressed.convert('RGB')
                
                # 调整尺寸（保持宽高比）
                if needs_resize:
                    compressed.thumbnail(self.MAX_MULTIMODAL_SIZE, Image.Resampling.LANCZOS)
                    self.logger.info(f"调整后尺寸: {compressed.size[0]}x{compressed.size[1]}")
                
                # 压缩为 JPEG
                compressed_io = BytesIO()
                compressed.save(compressed_io, format='JPEG', quality=self.MAX_MULTIMODAL_QUALITY, optimize=True)
                compressed_data = compressed_io.getvalue()
                
                compressed_size = len(compressed_data)
                self.logger.info(f"压缩后大小: {compressed_size / 1024:.2f} KB (压缩率: {compressed_size / original_size * 100:.1f}%)")
                
                # 使用压缩后的数据
                return self.encode_base64(compressed_data, 'image/jpeg')
            else:
                # 图片已经足够小，直接使用原始数据
                self.logger.info("图片无需压缩，使用原始数据")
                return self.encode_base64(original_data, mime_type)
                
        except Exception as e:
            self.logger.error(f"图片压缩失败，使用原始数据: {e}")
            # 如果压缩失败，回退到原始数据
            return self.encode_base64(original_data, mime_type)
    
    def _generate_thumbnail(self, image: Image.Image, mime_type: str) -> str:
        """
        生成缩略图
        
        Args:
            image: PIL Image 对象
            mime_type: 原始图片的 MIME 类型
            
        Returns:
            str: 缩略图的 Base64 编码（包含 data URI 前缀）
            
        Raises:
            ValueError: 如果缩略图生成失败
        """
        try:
            # 创建缩略图副本
            thumbnail = image.copy()
            
            # 转换 RGBA 图片为 RGB（某些格式不支持透明度）
            if thumbnail.mode in ('RGBA', 'LA', 'P'):
                # 创建白色背景
                background = Image.new('RGB', thumbnail.size, (255, 255, 255))
                if thumbnail.mode == 'P':
                    thumbnail = thumbnail.convert('RGBA')
                background.paste(thumbnail, mask=thumbnail.split()[-1] if thumbnail.mode in ('RGBA', 'LA') else None)
                thumbnail = background
            elif thumbnail.mode != 'RGB':
                thumbnail = thumbnail.convert('RGB')
            
            # 生成缩略图（保持宽高比）
            thumbnail.thumbnail(self.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
            
            # 将缩略图保存到字节流
            thumbnail_io = BytesIO()
            # 使用 JPEG 格式保存缩略图（更小的文件大小）
            thumbnail.save(thumbnail_io, format='JPEG', quality=85, optimize=True)
            thumbnail_data = thumbnail_io.getvalue()
            
            # Base64 编码
            thumbnail_base64 = self.encode_base64(thumbnail_data, 'image/jpeg')
            
            self.logger.debug(f"缩略图生成成功: {len(thumbnail_data)} bytes")
            
            return thumbnail_base64
            
        except Exception as e:
            self.logger.error(f"缩略图生成失败: {e}", exc_info=True)
            raise ValueError(f"缩略图生成失败: {str(e)}")
