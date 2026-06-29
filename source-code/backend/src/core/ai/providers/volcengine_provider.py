"""
VolcengineProvider 实现（火山引擎/豆包）

提供火山引擎 API 的流式聊天功能，支持：
- 流式响应（SSE）
- 连接测试
- 模型列表获取
- 错误处理和超时控制
- 系统代理支持

火山引擎 API 文档：https://www.volcengine.com/docs/82379
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


class VolcengineProvider(BaseProvider):
    """火山引擎 Provider 实现类
    
    火山引擎（豆包）使用类似 OpenAI 的 HTTP API，支持流式响应。
    """
    
    def __init__(self, config: Dict[str, Any], use_proxy: bool = False):
        """
        初始化火山引擎 Provider
        
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
            base_url = 'https://ark.cn-beijing.volces.com/api/v3'
        self.base_url = base_url
        self.timeout = config.get('timeout', 300)  # 默认 5 分钟
        
        # 验证 API Key
        if not config.get('api_key'):
            raise ValueError("火山引擎 Provider 需要提供 api_key")
    
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
                        raise ValueError(f"火山引擎 API 错误 ({response.status}): {error_text}")
                    
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
                                
                                # 检查是否有错误
                                if 'error' in chunk:
                                    error_info = chunk['error']
                                    error_code = error_info.get('code', 'unknown')
                                    error_message = error_info.get('message', '未知错误')
                                    
                                    # 特殊处理内容审查错误
                                    if error_code == 'data_inspection_failed':
                                        raise ValueError(
                                            "内容审查失败：输入内容可能包含敏感信息或不适当的内容。\n"
                                            "建议：\n"
                                            "1. 如果发送的是 JSON 文件，请尝试精简文件内容或分段发送\n"
                                            "2. 检查文件中是否包含敏感词汇或特殊字符\n"
                                            "3. 尝试使用其他 AI 模型（如 OpenAI、智谱等）"
                                        )
                                    else:
                                        raise ValueError(f"火山引擎 API 错误 [{error_code}]: {error_message}")
                                
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
                                        logger.info(f"[火山引擎] finish_reason: {finish_reason}")
                                        yield StreamChunk(content="", finish_reason=finish_reason)
                            
                            except json.JSONDecodeError as e:
                                logger.warning(f"解析 SSE 数据失败: {e}, 数据: {data}")
                                continue
        
        except asyncio.TimeoutError:
            raise asyncio.TimeoutError(f"火山引擎 API 请求超时（{self.timeout}秒）")
        
        except aiohttp.ClientError as e:
            raise aiohttp.ClientError(f"火山引擎 API 网络错误: {str(e)}")
    
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
                    elif response.status == 404:
                        error_text = await response.text()
                        return False, f"连接失败 ({response.status}): {error_text}", latency
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
        
        从火山引擎 API 动态获取模型列表。
        
        Returns:
            模型名称列表（如：doubao-seed-1-8-251228）
        
        Raises:
            Exception: 获取失败时抛出，包含详细的失败原因
        
        Note:
            火山引擎兼容 OpenAI API，调用 /models 端点获取模型列表。
        """
        # 构建 URL（处理 base_url 末尾的斜杠）
        base_url = self.base_url.rstrip('/')
        url = f"{base_url}/models"
        
        # Debug 日志：输出完整的请求地址
        logger.debug(f"[获取模型列表] 火山引擎请求地址: {url}")
        
        # 构建请求头
        headers = {
            "Authorization": f"Bearer {self.config['api_key']}",
            "Content-Type": "application/json"
        }
        
        # 设置超时时间：30 秒
        timeout = aiohttp.ClientTimeout(total=30)
        
        try:
            # 创建支持系统代理的连接器
            connector = create_proxy_connector()
            
            # 根据 use_proxy 决定是否使用代理
            proxy = get_proxy_from_settings(force_enable=self.use_proxy)
            
            async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                logger.debug(f"[获取模型列表] 开始请求火山引擎: {url}")
                start_time = time.time()
                
                async with session.get(url, headers=headers, proxy=proxy) as response:
                    elapsed = time.time() - start_time
                    logger.debug(f"[获取模型列表] 收到响应: status={response.status}, 耗时={elapsed:.2f}秒")
                    
                    # 处理认证错误（401/403）
                    if response.status in (401, 403):
                        error_msg = "API Key 无效或权限不足，请检查配置后重试，或手动输入模型名称"
                        logger.warning(f"认证失败 ({response.status}): {error_msg}")
                        raise Exception(error_msg)
                    
                    # 处理 404 - API 不支持此端点
                    if response.status == 404:
                        error_msg = "火山引擎 API 不支持 /models 端点，请手动输入模型 ID（如：doubao-seed-1-8-251228）"
                        logger.warning(f"API 不支持 ({response.status}): {error_msg}")
                        raise Exception(error_msg)
                    
                    # 处理服务器错误（5xx）
                    if response.status >= 500:
                        error_msg = f"服务器错误 ({response.status})，服务暂时不可用，请稍后重试或手动输入模型名称"
                        logger.warning(error_msg)
                        raise Exception(error_msg)
                    
                    # 处理其他 HTTP 错误
                    if response.status != 200:
                        error_text = await response.text()
                        error_msg = f"API 错误 ({response.status}): {error_text[:200]}，请手动输入模型名称"
                        logger.warning(error_msg)
                        raise Exception(error_msg)
                    
                    # 解析 JSON 响应
                    try:
                        data = await response.json()
                    except Exception as e:
                        error_msg = f"JSON 解析错误: {str(e)}，请手动输入模型名称"
                        logger.warning(error_msg)
                        raise Exception(error_msg)
                    
                    # 提取模型 ID 列表
                    if "data" not in data:
                        error_msg = "API 响应格式错误（缺少 'data' 字段），请手动输入模型名称"
                        logger.warning(error_msg)
                        raise Exception(error_msg)
                    
                    models = []
                    for model in data.get("data", []):
                        if not isinstance(model, dict):
                            continue
                        
                        model_id = model.get("id")
                        if not model_id:
                            continue
                        
                        models.append(model_id)
                    
                    # 过滤非聊天模型（排除 embedding 等）
                    excluded_keywords = ["embedding", "whisper", "tts"]
                    chat_models = [
                        m for m in models 
                        if not any(keyword in m.lower() for keyword in excluded_keywords)
                    ]
                    
                    if not chat_models:
                        error_msg = "未找到可用的聊天模型，请手动输入模型 ID（如：doubao-seed-1-8-251228）"
                        logger.warning(error_msg)
                        raise Exception(error_msg)
                    
                    logger.info(f"成功获取 {len(chat_models)} 个火山引擎聊天模型")
                    
                    # 返回排序后的模型列表
                    return sorted(chat_models)
        
        except asyncio.TimeoutError:
            error_msg = f"请求超时（30秒），请检查网络连接或代理设置，或手动输入模型名称"
            logger.warning(error_msg)
            raise Exception(error_msg)
        
        except aiohttp.ClientError as e:
            error_msg = f"网络错误: {str(e)}，请检查网络连接或代理设置，或手动输入模型名称"
            logger.warning(error_msg)
            raise Exception(error_msg)
        
        except Exception as e:
            # 如果已经是我们自己抛出的异常，直接重新抛出
            if "手动输入模型名称" in str(e):
                raise
            # 否则包装成新的异常
            error_msg = f"获取模型列表失败: {str(e)}，请手动输入模型名称"
            logger.warning(error_msg)
            raise Exception(error_msg)
