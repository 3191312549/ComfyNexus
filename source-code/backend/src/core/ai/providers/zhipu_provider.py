"""
ZhipuProvider 实现（智谱 AI）

提供智谱 AI API 的流式聊天功能，支持：
- 流式响应（SSE）
- 连接测试
- 模型列表获取
- 错误处理和超时控制
- 系统代理支持

智谱 AI API 文档：https://open.bigmodel.cn/dev/api
"""

import asyncio
import time
import json
from typing import AsyncIterator, Dict, Any, List, Tuple
import aiohttp
import logging

from .base_provider import BaseProvider, StreamChunk
from .network_utils import create_proxy_connector, get_proxy_from_settings
from ._deep_thinking_prompt import DEEP_THINKING_PROMPT

logger = logging.getLogger(__name__)


class ZhipuProvider(BaseProvider):
    """智谱 AI Provider 实现类
    
    智谱 AI（ChatGLM）使用类似 OpenAI 的 HTTP API，支持流式响应。
    """
    
    def __init__(self, config: Dict[str, Any], use_proxy: bool = False):
        """
        初始化智谱 AI Provider
        
        Args:
            config: 配置字典
                {
                    "api_key": str,          # API Key（必需）
                    "base_url": str,         # API 基础 URL（可选）
                    "model": str,            # 模型名称（必需）
                    "temperature": float,    # 温度参数（可选，默认 0.7）
                    "max_tokens": int,       # 最大 Token 数（可选，默认 2048）
                    "timeout": int,          # 超时时间（秒，可选，默认 30）
                }
            use_proxy: 是否使用系统代理
        """
        super().__init__(config, use_proxy=use_proxy)
        # 获取 base_url，如果为 None 或空字符串，使用默认值
        base_url = config.get('base_url')
        if not base_url:  # None 或空字符串都使用默认值
            base_url = 'https://open.bigmodel.cn/api/paas/v4'
        self.base_url = base_url
        self.timeout = config.get('timeout', 300)  # 默认 5 分钟
        
        # 验证 API Key
        if not config.get('api_key'):
            raise ValueError("智谱 AI Provider 需要提供 api_key")
    
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
        request_body = {
            "model": self.get_model(),
            "messages": request_messages,
            "temperature": self.get_temperature(),
            "stream": True
        }
        
        # 只有在设置了 max_tokens 时才添加到请求体
        max_tokens = self.get_max_tokens()
        if max_tokens is not None:
            request_body["max_tokens"] = max_tokens
        
        # 构建请求头
        headers = {
            "Authorization": f"Bearer {self.config['api_key']}",
            "Content-Type": "application/json"
        }
        
        # 发送流式请求
        url = f"{self.base_url}/chat/completions"
        
        try:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            connector = create_proxy_connector()
            
            # 根据 use_proxy 决定是否使用代理
            proxy = get_proxy_from_settings(force_enable=self.use_proxy)
            
            async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                async with session.post(url, json=request_body, headers=headers, proxy=proxy) as response:
                    # 检查响应状态
                    if response.status != 200:
                        error_text = await response.text()
                        raise ValueError(f"智谱 AI API 错误 ({response.status}): {error_text}")
                    
                    # 逐行读取 SSE 流
                    async for line in response.content:
                        line = line.decode('utf-8').strip()
                        
                        # 跳过空行
                        if not line:
                            continue
                        
                        # 跳过注释行
                        if line.startswith(':'):
                            continue
                        
                        # 解析 SSE 数据
                        if line.startswith('data: '):
                            data = line[6:]  # 移除 "data: " 前缀
                            
                            # 检查是否是结束标记
                            if data == '[DONE]':
                                break
                            
                            # 解析 JSON 数据
                            try:
                                chunk = json.loads(data)
                                
                                # 提取内容
                                if 'choices' in chunk and len(chunk['choices']) > 0:
                                    choice = chunk['choices'][0]
                                    delta = choice.get('delta', {})
                                    finish_reason = choice.get('finish_reason')
                                    content = delta.get('content', '')
                                    
                                    if content:
                                        yield StreamChunk(content=content)
                                    
                                    # 返回 finish_reason 信息
                                    if finish_reason:
                                        logger.info(f"[智谱AI] finish_reason: {finish_reason}")
                                        yield StreamChunk(content="", finish_reason=finish_reason)
                            
                            except json.JSONDecodeError as e:
                                logger.warning(f"解析 SSE 数据失败: {e}, 数据: {data}")
                                continue
        
        except asyncio.TimeoutError:
            raise asyncio.TimeoutError(f"智谱 AI API 请求超时（{self.timeout}秒）")
        
        except aiohttp.ClientError as e:
            raise aiohttp.ClientError(f"智谱 AI API 网络错误: {str(e)}")
    
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
            # 发送一个简单的测试请求（非流式）
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.config['api_key']}",
                "Content-Type": "application/json"
            }
            
            request_body = {
                "model": self.get_model(),
                "messages": [{"role": "user", "content": "你好"}],
                "max_tokens": 10,
                "stream": False
            }
            
            timeout = aiohttp.ClientTimeout(total=10)
            connector = create_proxy_connector()
            
            # 根据 use_proxy 决定是否使用代理
            proxy = get_proxy_from_settings(force_enable=self.use_proxy)
            
            async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                async with session.post(url, json=request_body, headers=headers, proxy=proxy) as response:
                    latency = int((time.time() - start_time) * 1000)  # 转换为毫秒（整数）
                    
                    if response.status == 200:
                        return True, "连接成功", latency
                    else:
                        error_text = await response.text()
                        return False, f"连接失败 ({response.status}): {error_text}", latency
        
        except asyncio.TimeoutError:
            latency = int((time.time() - start_time) * 1000)
            return False, "连接超时", latency
        
        except Exception as e:
            latency = int((time.time() - start_time) * 1000)
            return False, f"连接错误: {str(e)}", latency
    

    async def get_available_models_async(self) -> List[str]:
        """
        异步获取可用模型列表
        
        Returns:
            模型名称列表
        
        Raises:
            Exception: 智谱 AI 不支持动态获取模型列表
        
        Note:
            智谱 AI 目前不提供动态获取模型列表的 API，
            抛出异常提示用户手动输入模型名称。
        """
        # 智谱 AI 没有提供获取模型列表的 API，抛出异常
        error_msg = "智谱 AI 不支持动态获取模型列表，请手动输入模型名称（如：glm-4、glm-4-plus、glm-4-air 等）"
        logger.warning(error_msg)
        raise Exception(error_msg)
