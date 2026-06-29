"""
搜索模块

提供AI助手的联网搜索功能，支持多种搜索引擎。
"""

from .base_search import (
    BaseSearch,
    SearchResult,
    SearchError,
    SearchTimeoutError,
    SearchConfigError,
    SearchAPIError
)
from .duckduckgo_search import DuckDuckGoSearch
from .google_search import GoogleSearch
from .search_manager import SearchManager
from .search_config import SearchConfig

__all__ = [
    'BaseSearch',
    'SearchResult',
    'SearchError',
    'SearchTimeoutError',
    'SearchConfigError',
    'SearchAPIError',
    'DuckDuckGoSearch',
    'GoogleSearch',
    'SearchManager',
    'SearchConfig',
]
