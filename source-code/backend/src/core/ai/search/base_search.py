"""
搜索引擎基类

定义所有搜索引擎必须实现的统一接口。
"""

from abc import ABC, abstractmethod
from typing import List, Tuple
from dataclasses import dataclass


# ========== 数据模型 ==========

@dataclass
class SearchResult:
    """搜索结果数据模型"""
    title: str          # 标题
    url: str            # 链接
    snippet: str        # 摘要
    source: str         # 来源（duckduckgo/google）


# ========== 异常类 ==========

class SearchError(Exception):
    """搜索错误基类"""
    pass


class SearchTimeoutError(SearchError):
    """搜索超时错误"""
    pass


class SearchConfigError(SearchError):
    """配置错误"""
    pass


class SearchAPIError(SearchError):
    """API错误"""
    pass


# ========== 搜索引擎基类 ==========

class BaseSearch(ABC):
    """搜索引擎抽象基类
    
    所有搜索引擎必须继承此类并实现所有抽象方法。
    """
    
    def __init__(self, config: dict):
        """初始化搜索引擎
        
        Args:
            config: 搜索引擎配置
        """
        self.config = config
        self._validate_config()
    
    def _validate_config(self) -> None:
        """验证配置参数
        
        子类可以重写此方法以添加特定的配置验证逻辑。
        
        Raises:
            SearchConfigError: 配置参数无效时抛出
        """
        pass
    
    @abstractmethod
    async def search(
        self, 
        query: str, 
        max_results: int = 5,
        timeout: int = 10
    ) -> List[SearchResult]:
        """执行搜索
        
        Args:
            query: 搜索关键词
            max_results: 最大结果数量
            timeout: 超时时间（秒）
            
        Returns:
            搜索结果列表
            
        Raises:
            SearchError: 搜索失败时抛出
            SearchTimeoutError: 搜索超时时抛出
        """
        pass
    
    @abstractmethod
    async def test_connection(self) -> Tuple[bool, str, float]:
        """测试与搜索引擎的连接
        
        发送一个简单的测试请求以验证配置是否正确，服务是否可用。
        
        Returns:
            Tuple[bool, str, float]: 
                - success: 连接是否成功
                - message: 成功或失败的描述信息
                - latency: 请求延迟（毫秒），失败时为 0.0
        """
        pass
