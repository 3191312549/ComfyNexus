"""
OllamaProvider 实现（本地模型）

提供 Ollama API 的流式聊天功能，支持：
- 流式响应
- 连接测试
- 模型列表获取（动态）
- 错误处理和超时控制
- 系统代理支持

Ollama API 文档：https://github.com/ollama/ollama/blob/main/docs/api.md
"""

import asyncio
import time
import json
from typing import AsyncIterator, Dict, Any, List, Tuple
import aiohttp
import logging

from .base_provider import BaseProvider, StreamChunk
from .network_utils import create_proxy_connector
from ._deep_thinking_prompt import DEEP_THINKING_PROMPT

logger = logging.getLogger(__name__)

DEFAULT_CONNECT_TIMEOUT = 60
DEFAULT_MODEL_LOAD_TIMEOUT = 600
DEFAULT_STREAM_IDLE_TIMEOUT = 300


def _get_timeout_seconds(config: Dict[str, Any], key: str, default: int) -> int:
    """Read timeout values from config, accepting UI-provided strings."""
    value = config.get(key, default)
    try:
        seconds = int(value)
    except (TypeError, ValueError):
        logger.warning("Ollama 超时配置无效: %s=%r，使用默认值 %s", key, value, default)
        return default
    return seconds if seconds > 0 else default


class OllamaProvider(BaseProvider):
    """Ollama Provider 实现类
    
    Ollama 是一个本地运行的 AI 模型服务，支持多种开源模型。
    """
    
    def __init__(self, config: Dict[str, Any], use_proxy: bool = False):
        """
        初始化 Ollama Provider
        
        Args:
            config: 配置字典
                {
                    "base_url": str,         # API 基础 URL（可选，默认 http://localhost:11434）
                    "model": str,            # 模型名称（必需）
                    "temperature": float,    # 温度参数（可选，默认 0.7）
                    "max_tokens": int,       # 最大 Token 数（可选，默认 2048）
                    "timeout": int,          # 流式空闲超时时间（秒，可选，默认 300）
                    "connect_timeout": int,  # 连接 Ollama 服务超时（秒，可选，默认 60）
                    "model_load_timeout": int,  # 等待模型加载/首响应超时（秒，可选，默认 600）
                    "stream_idle_timeout": int, # 生成中等待下一段内容超时（秒，可选，默认 300）
                }
            use_proxy: 是否使用系统代理（Ollama 是本地服务，通常不需要代理）
        
        Note:
            Ollama 不需要 API Key，因为它是本地服务
        """
        super().__init__(config, use_proxy=use_proxy)
        # 获取 base_url，如果为 None 或空字符串，使用默认值
        base_url = config.get('base_url')
        if not base_url:  # None 或空字符串都使用默认值
            base_url = 'http://localhost:11434'
        self.base_url = base_url
        # Ollama 会按需加载模型，不能用整次请求总时长限制流式生成。
        # timeout 保持向后兼容，作为“已开始输出后的空闲超时”。
        self.connect_timeout = _get_timeout_seconds(config, 'connect_timeout', DEFAULT_CONNECT_TIMEOUT)
        self.model_load_timeout = _get_timeout_seconds(config, 'model_load_timeout', DEFAULT_MODEL_LOAD_TIMEOUT)
        self.stream_idle_timeout = _get_timeout_seconds(
            config,
            'stream_idle_timeout',
            _get_timeout_seconds(config, 'timeout', DEFAULT_STREAM_IDLE_TIMEOUT)
        )
        self.timeout = self.stream_idle_timeout
    
    async def chat_stream(
        self, 
        messages: List[Dict[str, str]], 
        system_prompt: str = None,
        deep_thinking: bool = False
    ) -> AsyncIterator[StreamChunk]:
        """
        流式聊天
        
        Args:
            messages: 消息列表
                [
                    {"role": "user", "content": "你好"},
                    {"role": "assistant", "content": "你好！有什么可以帮助你的吗？"},
                    ...
                ]
            system_prompt: 系统提示词（可选）
            deep_thinking: 是否启用深度思考（可选，默认 False）
        
        Yields:
            StreamChunk: 流式响应数据结构，包含 content 和 finish_reason
        
        Raises:
            aiohttp.ClientError: 网络请求错误
            asyncio.TimeoutError: 请求超时
            ValueError: API 返回错误
        """
        # 构建请求消息列表
        request_messages = []
        
        # 添加系统提示词
        if system_prompt:
            request_messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        # 如果启用深度思考，添加深度思考指令
        if deep_thinking:
            if system_prompt:
                # 如果已有系统提示，追加深度思考指令
                request_messages[0]["content"] += "\n\n" + DEEP_THINKING_PROMPT
            else:
                # 如果没有系统提示，创建一个
                request_messages.insert(0, {
                    "role": "system",
                    "content": DEEP_THINKING_PROMPT
                })
        
        # 添加对话消息
        request_messages.extend(messages)
        
        # 构建请求体
        # Ollama 使用不同的参数名称
        request_body = {
            "model": self.get_model(),
            "messages": request_messages,
            "stream": True,
            "options": {
                "temperature": self.get_temperature(),
            }
        }
        
        # 只有在设置了 max_tokens 时才添加到请求体
        max_tokens = self.get_max_tokens()
        if max_tokens is not None:
            request_body["options"]["num_predict"] = max_tokens  # Ollama 使用 num_predict 而不是 max_tokens
        
        # 发送流式请求
        url = f"{self.base_url}/api/chat"
        
        try:
            timeout = aiohttp.ClientTimeout(
                total=None,
                connect=self.connect_timeout,
                sock_connect=self.connect_timeout,
                sock_read=None
            )
            connector = create_proxy_connector(use_proxy=False)  # Ollama 是本地服务，不使用代理
            
            async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                async with session.post(url, json=request_body) as response:
                    # 检查响应状态
                    if response.status != 200:
                        error_text = await response.text()
                        raise ValueError(f"Ollama API 错误 ({response.status}): {error_text}")
                    
                    # Ollama 返回的是 NDJSON（换行分隔的 JSON）
                    first_response_received = False
                    while True:
                        wait_timeout = self.stream_idle_timeout if first_response_received else self.model_load_timeout
                        try:
                            raw_line = await asyncio.wait_for(
                                response.content.readline(),
                                timeout=wait_timeout
                            )
                        except asyncio.TimeoutError:
                            if first_response_received:
                                raise asyncio.TimeoutError(
                                    f"Ollama 生成空闲超时：已开始输出，但 {self.stream_idle_timeout} 秒内没有新的内容。"
                                )
                            raise asyncio.TimeoutError(
                                f"Ollama 模型加载超时：请求已发送，但 {self.model_load_timeout} 秒内未收到首个响应。"
                            )
                        
                        if not raw_line:
                            break
                        
                        line = raw_line.decode('utf-8').strip()
                        if not line:
                            continue
                        
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError as e:
                            logger.warning(f"解析 Ollama 响应失败: {e}, 数据: {line}")
                            continue
                        
                        if not first_response_received:
                            first_response_received = True
                            logger.debug("Ollama 首个流式响应已收到，切换到生成空闲超时控制")
                        
                        # 提取内容
                        if 'message' in chunk:
                            content = chunk['message'].get('content', '')
                            if content:
                                yield StreamChunk(content=content)
                        
                        # 检查是否完成
                        if chunk.get('done', False):
                            # Ollama 使用 done 字段表示完成
                            yield StreamChunk(content="", finish_reason="stop")
                            break
        
        except asyncio.TimeoutError as e:
            if str(e):
                raise
            raise asyncio.TimeoutError(
                f"Ollama 连接超时：{self.connect_timeout} 秒内无法连接到服务，请确认 Ollama 正在运行。"
            )
        
        except aiohttp.ClientError as e:
            raise aiohttp.ClientError(f"Ollama API 网络错误: {str(e)}")
    
    async def test_connection(self) -> Tuple[bool, str, float]:
        """
        测试连接
        
        Returns:
            (success, message, latency)
            - success: 是否成功
            - message: 结果消息
            - latency: 延迟（毫秒）
        """
        start_time = time.time()
        
        try:
            # 检查 Ollama 服务是否运行
            url = f"{self.base_url}/api/tags"
            
            timeout = aiohttp.ClientTimeout(total=10)
            connector = create_proxy_connector(use_proxy=False)  # Ollama 是本地服务，不使用代理
            async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                async with session.get(url) as response:
                    latency = int((time.time() - start_time) * 1000)  # 转换为毫秒（整数）
                    
                    if response.status == 200:
                        # 检查模型是否存在
                        data = await response.json()
                        models = data.get('models', [])
                        model_names = [m.get('name', '') for m in models]
                        
                        if self.get_model() in model_names:
                            return True, f"连接成功，模型 '{self.get_model()}' 可用", latency
                        else:
                            available = ', '.join(model_names) if model_names else '无'
                            return False, f"模型 '{self.get_model()}' 不存在。可用模型: {available}", latency
                    else:
                        error_text = await response.text()
                        return False, f"连接失败 ({response.status}): {error_text}", latency
        
        except asyncio.TimeoutError:
            latency = int((time.time() - start_time) * 1000)
            return False, "连接超时，请确保 Ollama 服务正在运行", latency
        
        except aiohttp.ClientConnectorError:
            latency = int((time.time() - start_time) * 1000)
            return False, f"无法连接到 Ollama 服务 ({self.base_url})，请确保服务正在运行", latency
        
        except Exception as e:
            latency = int((time.time() - start_time) * 1000)
            return False, f"连接错误: {str(e)}", latency
    

    async def get_available_models_async(self) -> List[str]:
        """
        异步获取可用模型列表（从 Ollama API 动态获取）
        
        Returns:
            已安装的模型名称列表
        
        Raises:
            Exception: 获取失败时抛出，包含详细的失败原因
        
        Note:
            Ollama 支持动态获取本地已安装的模型列表。
            如果获取失败，抛出异常提示用户手动输入。
        """
        try:
            models = await self.get_installed_models()
            if not models:
                error_msg = "Ollama 服务未安装任何模型，请先使用 'ollama pull <模型名>' 安装模型，或手动输入模型名称"
                logger.warning(error_msg)
                raise Exception(error_msg)
            return models
        except Exception as e:
            # 如果已经是我们自己抛出的异常，直接重新抛出
            if "手动输入模型名称" in str(e):
                raise
            # 否则包装成新的异常
            error_msg = f"无法获取 Ollama 模型列表: {str(e)}，请确保 Ollama 服务正在运行，或手动输入模型名称"
            logger.warning(error_msg)
            raise Exception(error_msg)
    
    async def get_installed_models(self) -> List[str]:
        """
        获取本地已安装的模型列表（异步方法）
        
        Returns:
            已安装的模型名称列表
        
        Raises:
            Exception: 无法获取模型列表时抛出
        """
        try:
            url = f"{self.base_url}/api/tags"
            
            timeout = aiohttp.ClientTimeout(total=10)
            connector = create_proxy_connector(use_proxy=False)  # Ollama 是本地服务，不使用代理
            async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        models = data.get('models', [])
                        return [m.get('name', '') for m in models]
                    else:
                        raise Exception(f"获取模型列表失败 ({response.status})")
        
        except Exception as e:
            raise Exception(f"无法获取 Ollama 模型列表: {str(e)}")
