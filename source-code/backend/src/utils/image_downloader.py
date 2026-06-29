"""
图片下载工具模块

提供图片 URL 验证、保存路径验证和图片下载功能。
"""

import base64
import binascii
import os
from typing import Optional
from urllib.parse import urlparse
import requests

from backend.src.utils.logger import app_logger as logger


def validate_image_url(url: str) -> bool:
    """
    验证图片 URL 是否合法
    
    该函数检查图片 URL 的有效性，支持以下协议：
    - http:// 和 https:// - 网络图片
    - data: - Base64 编码的图片（Canvas 导出）
    
    验证规则：
    1. URL 不能为空
    2. 必须以支持的协议开头
    3. 对于 http/https，必须包含有效的域名
    4. 对于 data URL，必须包含有效的数据部分
    
    Args:
        url: 图片 URL
        
    Returns:
        bool: URL 是否合法
    """
    if not url:
        logger.warning("[图片下载] URL 验证失败: URL 为空")
        return False
    
    # 检查协议：只允许 http、https 和 data 协议
    # data 协议用于支持 Canvas 元素导出的 Base64 图片
    if not url.startswith(('http://', 'https://', 'data:')):
        logger.warning(f"[图片下载] URL 验证失败: 不支持的协议 (URL: {url[:50]}...)")
        return False
    
    # 检查 URL 格式
    try:
        result = urlparse(url)
        # 对于 data: URL，只需要有 scheme 和 path
        if url.startswith('data:'):
            is_valid = bool(
                result.scheme == 'data'
                and result.path.startswith('image/')
                and ';base64,' in result.path
                and result.path.split(',', 1)[1]
            )
            if not is_valid:
                logger.warning("[图片下载] URL 验证失败: data URL 格式不正确或不是 base64 图片")
            return is_valid
        # 对于 http/https URL，需要有 scheme 和 netloc
        is_valid = bool(result.scheme and result.netloc)
        if not is_valid:
            logger.warning(f"[图片下载] URL 验证失败: URL 格式不正确 (URL: {url[:50]}...)")
        return is_valid
    except Exception as e:
        logger.error(f"[图片下载] URL 解析异常: {e}")
        return False


def validate_save_path(path: str) -> bool:
    """
    验证保存路径是否合法
    
    该函数检查文件保存路径的安全性和有效性，防止：
    - 路径遍历攻击（..）
    - 危险字符注入（<, >, |, ?, *）
    - 不支持的文件格式
    
    验证规则：
    1. 路径不能为空
    2. 不能包含危险字符
    3. 不能包含路径遍历字符 '..'
    4. 文件扩展名必须是支持的图片格式
    
    Args:
        path: 保存路径
        
    Returns:
        bool: 路径是否合法
    """
    if not path:
        logger.warning("[图片下载] 路径验证失败: 路径为空")
        return False
    
    # 检查危险字符：这些字符在文件名中可能导致安全问题或系统错误
    # < > | ? * 在 Windows 文件名中是非法字符
    dangerous_chars = ['<', '>', '|', '?', '*']
    found_dangerous = [char for char in dangerous_chars if char in path]
    if found_dangerous:
        logger.warning(f"[图片下载] 路径验证失败: 包含危险字符 {found_dangerous}")
        return False
    
    # 检查是否包含 .. (路径遍历攻击)
    # 防止用户通过 ../../ 访问系统其他目录
    if '..' in path:
        logger.warning("[图片下载] 路径验证失败: 包含路径遍历字符 '..'")
        return False
    
    # 检查文件扩展名：只允许常见的图片格式和工作流格式
    # 这样可以防止用户保存为可执行文件或其他危险格式
    # .json 用于支持 ComfyUI 工作流导出
    allowed_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.json']
    ext = os.path.splitext(path)[1].lower()
    if ext not in allowed_extensions:
        logger.warning(f"[图片下载] 路径验证失败: 不支持的文件扩展名 '{ext}' (支持: {', '.join(allowed_extensions)})")
        return False
    
    logger.debug(f"[图片下载] 路径验证通过: {path}")
    return True


def download_image(url: str, save_path: str, timeout: int = 30) -> bool:
    """
    下载图片到指定路径
    
    该函数负责从 URL 下载图片并保存到本地文件系统。
    支持 HTTP/HTTPS 网络图片和 Data URL（Base64 编码的图片）。
    
    工作流程：
    1. 验证 URL 和保存路径的有效性
    2. 确保目标目录存在（如果不存在则创建）
    3. 使用流式下载避免大文件占用内存
    4. 分块写入文件（8KB 每块）
    5. 记录下载进度和结果
    
    错误处理：
    - 超时错误：网络请求超过指定时间
    - HTTP 错误：服务器返回错误状态码
    - 连接错误：网络连接失败
    - 文件系统错误：磁盘空间不足、权限不足等
    
    Args:
        url: 图片 URL（支持 http/https/data 协议）
        save_path: 保存路径（完整的文件路径）
        timeout: 超时时间（秒），默认 30 秒
        
    Returns:
        bool: 是否下载成功
    """
    try:
        # 验证 URL
        if not validate_image_url(url):
            logger.error(f"[图片下载] 下载失败: URL 验证未通过")
            return False
        
        # 验证保存路径
        if not validate_save_path(save_path):
            logger.error(f"[图片下载] 下载失败: 保存路径验证未通过")
            return False
        
        # 确保目标目录存在
        # 注意：这里需要提取目录路径，因为 save_path 是完整的文件路径
        save_dir = os.path.dirname(save_path)
        if save_dir and not os.path.exists(save_dir):
            logger.info(f"[图片下载] 创建目标目录: {save_dir}")
            os.makedirs(save_dir, exist_ok=True)
        
        # 下载图片
        logger.info(f"[图片下载] 开始下载图片")
        logger.debug(f"[图片下载] URL: {url[:100]}{'...' if len(url) > 100 else ''}")
        logger.debug(f"[图片下载] 保存路径: {save_path}")
        logger.debug(f"[图片下载] 超时设置: {timeout}秒")
        
        if url.startswith('data:'):
            header, encoded_data = url.split(',', 1)
            logger.debug(f"[图片下载] Data URL 类型: {header}")
            image_bytes = base64.b64decode(encoded_data, validate=True)
            with open(save_path, 'wb') as f:
                f.write(image_bytes)
            logger.info(f"[图片下载] Data URL 保存成功: {save_path}")
            logger.debug(f"[图片下载] 已写入: {len(image_bytes) / 1024:.2f} KB")
            return True

        # 使用流式下载（stream=True）避免大文件占用内存
        # 这样可以边下载边写入文件，而不是先将整个文件加载到内存
        response = requests.get(url, stream=True, timeout=timeout)
        response.raise_for_status()  # 如果状态码不是 2xx，抛出 HTTPError
        
        # 获取文件大小（如果可用）
        content_length = response.headers.get('content-length')
        if content_length:
            logger.debug(f"[图片下载] 文件大小: {int(content_length) / 1024:.2f} KB")
        
        # 流式写入文件
        # 使用 8KB 的块大小，这是一个平衡性能和内存使用的常见值
        bytes_written = 0
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:  # 过滤掉保持连接的空块
                    f.write(chunk)
                    bytes_written += len(chunk)
        
        logger.info(f"[图片下载] 下载成功: {save_path}")
        logger.debug(f"[图片下载] 已写入: {bytes_written / 1024:.2f} KB")
        return True
        
    except requests.exceptions.Timeout:
        # 超时错误：网络请求超过指定时间
        logger.error(f"[图片下载] 下载超时 (超过 {timeout} 秒)")
        logger.debug(f"[图片下载] 超时 URL: {url[:100]}{'...' if len(url) > 100 else ''}")
        return False
    except requests.exceptions.HTTPError as e:
        # HTTP 错误：服务器返回错误状态码（4xx, 5xx）
        logger.error(f"[图片下载] HTTP 错误: {e.response.status_code} - {e.response.reason}")
        logger.debug(f"[图片下载] 错误 URL: {url[:100]}{'...' if len(url) > 100 else ''}")
        return False
    except requests.exceptions.ConnectionError as e:
        # 连接错误：网络连接失败
        logger.error(f"[图片下载] 网络连接失败: {e}")
        return False
    except requests.exceptions.RequestException as e:
        # 其他请求相关错误
        logger.error(f"[图片下载] 请求失败: {e}")
        return False
    except (ValueError, binascii.Error) as e:
        # Data URL 解析或 Base64 解码失败
        logger.error(f"[图片下载] Data URL 解码失败: {e}")
        return False
    except OSError as e:
        # 文件系统错误：磁盘空间不足、权限不足、路径无效等
        logger.error(f"[图片下载] 文件保存失败: {e}")
        logger.debug(f"[图片下载] 保存路径: {save_path}")
        return False
    except Exception as e:
        # 未知错误：记录详细信息以便调试
        logger.error(f"[图片下载] 未知错误: {e}")
        import traceback
        logger.debug(f"[图片下载] 错误堆栈:\n{traceback.format_exc()}")
        return False
