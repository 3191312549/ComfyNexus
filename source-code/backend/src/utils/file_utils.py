"""
文件操作工具函数

提供跨平台的文件和目录操作功能，特别处理 Windows 平台的权限问题。
"""

import os
import shutil
import stat
import time
import logging
from pathlib import Path
from typing import Tuple, Optional, Callable


def _remove_readonly(func: Callable, path: str, exc_info: tuple) -> None:
    """
    处理只读文件的删除回调
    
    当 shutil.rmtree 遇到 PermissionError 时，尝试修改文件权限后重试。
    这是处理 Git 创建的只读文件（如 .git/objects/pack/*.idx）的标准方法。
    
    Args:
        func: 失败的函数（通常是 os.remove 或 os.rmdir）
        path: 失败的文件路径
        exc_info: 异常信息元组 (type, value, traceback)
        
    Raises:
        重新抛出非权限错误
    """
    exc_type, exc_value, exc_tb = exc_info
    
    if isinstance(exc_value, PermissionError):
        os.chmod(path, stat.S_IWRITE | stat.S_IREAD)
        func(path)
    else:
        raise exc_value


def force_remove_directory(
    path: Path,
    max_retries: int = 3,
    retry_delay: float = 0.5,
    logger: Optional[logging.Logger] = None
) -> Tuple[bool, str]:
    """
    强制删除目录（处理 Windows 文件占用和只读问题）
    
    在 Windows 平台上，删除 Git 仓库目录时常遇到以下问题：
    1. Git 创建的 pack 文件（.git/objects/pack/*.idx, *.pack）具有只读属性
    2. 文件可能被其他进程（如 Git 进程、杀毒软件）锁定
    3. shutil.rmtree 默认无法删除只读文件
    
    此函数采用多层策略确保目录能被删除：
    1. 尝试普通删除（带只读文件处理）
    2. 失败时等待并重试（处理文件锁定）
    3. 最终使用 ignore_errors=True 强制删除
    
    Args:
        path: 要删除的目录路径
        max_retries: 最大重试次数（默认 3 次）
        retry_delay: 基础重试间隔（秒），实际延迟 = retry_delay * (attempt + 1)
        logger: 日志记录器（可选）
        
    Returns:
        Tuple[bool, str]: (是否成功, 错误信息)
        - 成功时返回 (True, "")
        - 失败时返回 (False, 错误描述)
        
    Example:
        >>> from pathlib import Path
        >>> success, error = force_remove_directory(Path("/path/to/plugin"))
        >>> if not success:
        ...     print(f"删除失败: {error}")
    """
    if logger is None:
        logger = logging.getLogger(__name__)
    
    if not path.exists():
        logger.debug(f"目录不存在，无需删除: {path}")
        return True, ""
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            shutil.rmtree(path, onerror=_remove_readonly)
            
            if not path.exists():
                logger.debug(f"成功删除目录: {path}")
                return True, ""
            
        except PermissionError as e:
            last_error = e
            wait_time = retry_delay * (attempt + 1)
            logger.warning(
                f"删除目录失败（权限错误），{wait_time:.1f}秒后重试 "
                f"(尝试 {attempt + 1}/{max_retries}): {path}, 错误: {e}"
            )
            time.sleep(wait_time)
            
        except OSError as e:
            last_error = e
            wait_time = retry_delay * (attempt + 1)
            logger.warning(
                f"删除目录失败（系统错误），{wait_time:.1f}秒后重试 "
                f"(尝试 {attempt + 1}/{max_retries}): {path}, 错误: {e}"
            )
            time.sleep(wait_time)
            
        except Exception as e:
            last_error = e
            logger.error(f"删除目录时发生未知错误: {path}, 错误: {e}")
            break
    
    logger.warning(f"常规删除失败，尝试强制删除: {path}")
    shutil.rmtree(path, ignore_errors=True)
    
    if path.exists():
        error_msg = f"无法删除目录（文件被占用或权限不足）: {path}"
        logger.error(error_msg)
        return False, error_msg
    
    logger.info(f"强制删除目录成功: {path}")
    return True, ""


def force_remove_file(
    path: Path,
    max_retries: int = 3,
    retry_delay: float = 0.5,
    logger: Optional[logging.Logger] = None
) -> Tuple[bool, str]:
    """
    强制删除单个文件（处理只读问题）
    
    Args:
        path: 要删除的文件路径
        max_retries: 最大重试次数
        retry_delay: 基础重试间隔（秒）
        logger: 日志记录器（可选）
        
    Returns:
        Tuple[bool, str]: (是否成功, 错误信息)
    """
    if logger is None:
        logger = logging.getLogger(__name__)
    
    if not path.exists():
        return True, ""
    
    if not path.is_file():
        return False, f"路径不是文件: {path}"
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            if not os.access(path, os.W_OK):
                os.chmod(path, stat.S_IWRITE | stat.S_IREAD)
            
            path.unlink()
            
            if not path.exists():
                return True, ""
                
        except PermissionError as e:
            last_error = e
            wait_time = retry_delay * (attempt + 1)
            logger.warning(
                f"删除文件失败（权限错误），{wait_time:.1f}秒后重试 "
                f"(尝试 {attempt + 1}/{max_retries}): {path}"
            )
            time.sleep(wait_time)
            
        except OSError as e:
            last_error = e
            wait_time = retry_delay * (attempt + 1)
            logger.warning(
                f"删除文件失败（系统错误），{wait_time:.1f}秒后重试 "
                f"(尝试 {attempt + 1}/{max_retries}): {path}"
            )
            time.sleep(wait_time)
    
    error_msg = f"无法删除文件: {path}, 最后错误: {last_error}"
    logger.error(error_msg)
    return False, error_msg
