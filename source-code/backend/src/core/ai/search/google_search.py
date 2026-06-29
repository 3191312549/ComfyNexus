"""
Google Custom Search实现

使用Google Custom Search API实现高质量的网络搜索。
"""

import asyncio
import logging
import time
from typing import List
from googleapiclient.discovery import build

from .base_search import (
    BaseSearch,
    SearchResult,
    SearchError,
    SearchTimeoutError,
    SearchConfigError,
    SearchAPIError
)

logger = logging.getLogger(__name__)


class GoogleSearch(BaseSearch):
    """Google Custom Search实现
    
    特点：
    - 搜索质量高
    - 官方API
    - 需要API Key和Search Engine ID
    - 每天100次免费额度
    """
    
    def _validate_config(self) -> None:
        """验证配置
        
        Raises:
            SearchConfigError: 配置无效时抛出
        """
        if not self.config.get('api_key'):
            raise SearchConfigError("缺少Google API Key")
        if not self.config.get('search_engine_id'):
            raise SearchConfigError("缺少Google Search Engine ID")
    
    async def search(
        self, 
        query: str, 
        max_results: int = 5,
        timeout: int = 10
    ) -> List[SearchResult]:
        """执行Google搜索
        
        Args:
            query: 搜索关键词
            max_results: 最大结果数量（Google限制最多10条）
            timeout: 超时时间（秒）
            
        Returns:
            搜索结果列表
            
        Raises:
            SearchTimeoutError: 搜索超时
            SearchAPIError: API错误
            SearchError: 搜索失败
        """
        try:
            logger.info(f"[Google] 开始搜索: query={query}, max_results={max_results}")
            
            # Google限制最多10条结果
            max_results = min(max_results, 10)
            
            # 在线程池中执行同步搜索
            loop = asyncio.get_event_loop()
            results = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    self._sync_search,
                    query,
                    max_results
                ),
                timeout=timeout
            )
            
            logger.info(f"[Google] 搜索完成: 返回{len(results)}条结果")
            return results
            
        except asyncio.TimeoutError:
            error_msg = f"搜索超时（{timeout}秒）"
            logger.warning(f"[Google] {error_msg}")
            raise SearchTimeoutError(error_msg)
        except Exception as e:
            error_msg = f"搜索失败: {str(e)}"
            logger.error(f"[Google] {error_msg}", exc_info=True)
            
            # 判断是否为API错误
            if 'API' in str(e) or 'quota' in str(e).lower():
                raise SearchAPIError(error_msg)
            else:
                raise SearchError(error_msg)
    
    def _sync_search(self, query: str, max_results: int) -> List[SearchResult]:
        """同步搜索方法
        
        在线程池中执行，避免阻塞事件循环。
        
        Args:
            query: 搜索关键词
            max_results: 最大结果数量
            
        Returns:
            搜索结果列表
        """
        # 创建Google Custom Search服务
        service = build(
            "customsearch", 
            "v1", 
            developerKey=self.config['api_key']
        )
        
        # 执行搜索
        result = service.cse().list(
            q=query,
            cx=self.config['search_engine_id'],
            num=max_results
        ).execute()
        
        # 解析结果
        items = result.get('items', [])
        return [
            SearchResult(
                title=item.get('title', ''),
                url=item.get('link', ''),
                snippet=item.get('snippet', ''),
                source='google'
            )
            for item in items
        ]
    
    async def test_connection(self) -> tuple[bool, str, float]:
        """测试Google连接
        
        Returns:
            (成功标志, 消息, 延迟毫秒)
        """
        try:
            start_time = time.time()
            
            # 执行一个简单的测试搜索
            results = await self.search("test", max_results=1, timeout=5)
            
            latency = int((time.time() - start_time) * 1000)  # 转换为毫秒（整数）
            
            if results:
                return True, "连接成功", latency
            else:
                return False, "搜索返回空结果", 0.0
                
        except SearchAPIError as e:
            logger.error(f"[Google] API错误: {e}")
            return False, f"API错误: {str(e)}", 0.0
        except SearchConfigError as e:
            logger.error(f"[Google] 配置错误: {e}")
            return False, f"配置错误: {str(e)}", 0.0
        except Exception as e:
            logger.error(f"[Google] 测试连接失败: {e}")
            return False, f"连接失败: {str(e)}", 0.0
