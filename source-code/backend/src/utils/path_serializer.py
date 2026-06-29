"""
路径序列化工具模块
负责将数据结构中的 pathlib.Path 对象转换为字符串，解决 pywebview 序列化问题
"""

from pathlib import Path
from typing import Any, Dict, List, Union, Callable
import functools
import time

from backend.src.utils.logger import app_logger as logger


class PathSerializationError(Exception):
    """路径序列化异常"""
    pass


def serialize_paths(data: Any) -> Any:
    """
    递归序列化数据结构中的 Path 对象为字符串
    
    Args:
        data: 待序列化的数据（可能包含 Path 对象）
        
    Returns:
        序列化后的数据（Path 对象转为字符串）
        
    Raises:
        PathSerializationError: 序列化过程中发生错误
    """
    try:
        # 处理 Path 对象
        if isinstance(data, Path):
            return str(data)
        
        # 处理字典
        elif isinstance(data, dict):
            return {key: serialize_paths(value) for key, value in data.items()}
        
        # 处理列表
        elif isinstance(data, list):
            return [serialize_paths(item) for item in data]
        
        # 处理元组
        elif isinstance(data, tuple):
            return tuple(serialize_paths(item) for item in data)
        
        # 处理集合
        elif isinstance(data, set):
            return {serialize_paths(item) for item in data}
        
        # 处理自定义对象（检查 __dict__ 属性）
        elif hasattr(data, '__dict__') and not isinstance(data, type):
            try:
                return serialize_paths(data.__dict__)
            except Exception as e:
                logger.debug(f"自定义对象序列化失败: {type(data).__name__}, 错误: {e}")
                return str(data)
        
        # 其他类型直接返回
        else:
            return data
            
    except Exception as e:
        # 序列化失败时记录警告并返回字符串表示
        logger.warning(f"序列化失败，返回字符串表示: {type(data).__name__}, 错误: {e}")
        try:
            return str(data)
        except Exception:
            return f"<无法序列化的对象: {type(data).__name__}>"


def serialize_response(func: Callable) -> Callable:
    """
    装饰器：自动序列化 API 响应中的 Path 对象
    
    Args:
        func: 被装饰的 API 方法
        
    Returns:
        包装后的方法
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            result = func(*args, **kwargs)
            
            # 性能监控
            start_time = time.perf_counter()
            serialized_result = serialize_paths(result)
            end_time = time.perf_counter()
            
            duration_ms = (end_time - start_time) * 1000
            if duration_ms > 10:  # 超过 10ms 记录警告
                logger.warning(f"路径序列化耗时 {duration_ms:.2f}ms，方法: {func.__name__}")
            
            return serialized_result
            
        except PathSerializationError as e:
            # 序列化失败时记录警告并返回原始数据
            logger.warning(f"路径序列化失败，返回原始数据: {e}")
            return result
        except Exception as e:
            # 其他异常正常抛出
            logger.error(f"方法 {func.__name__} 执行异常: {e}")
            raise
    return wrapper