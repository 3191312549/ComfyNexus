"""
OpenAI Provider 实现

提供 OpenAI API 的流式聊天功能，支持：
- 流式响应（SSE）
- 连接测试
- 模型列表获取
- 错误处理和超时控制
- 系统代理支持
"""

import asyncio
import time
from typing import AsyncIterator, Dict, Any, List, Tuple
import aiohttp
import logging

from .base_provider import BaseProvider, StreamChunk
from .network_utils import create_proxy_connector, get_proxy_from_settings
from ._deep_thinking_prompt import DEEP_THINKING_PROMPT

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseProvider):
    """OpenAI Provider 实现类"""
    
    def __init__(self, config: Dict[str, Any], use_proxy: bool = False):
        """
        初始化 OpenAI Provider
        
        Args:
            config: 配置字典
                {
                    "api_key": str,          # API Key（必需）
                    "base_url": str,         # API 基础 URL（可选，默认 https://api.openai.com/v1）
                    "model": str,            # 模型名称（必需）
                    "temperature": float,    # 温度参数（可选，默认 0.7）
                    "max_tokens": int,       # 最大 Token 数（可选，默认 2048）
                    "timeout": int,          # 超时时间（秒，可选，默认 300）
                }
            use_proxy: 是否使用系统代理
        """
        super().__init__(config, use_proxy=use_proxy)
        # 获取 base_url，如果为 None 或空字符串，使用默认值
        base_url = config.get('base_url')
        if not base_url:  # None 或空字符串都使用默认值
            base_url = 'https://api.openai.com/v1'
        self.base_url = base_url
        self.timeout = config.get('timeout', 300)  # 默认 5 分钟
        
        # 验证 API Key
        if not config.get('api_key'):
            raise ValueError("OpenAI Provider 需要提供 api_key")
    
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
        session = None
        try:
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
            
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            connector = create_proxy_connector()
            
            # 根据 use_proxy 决定是否使用代理
            proxy = get_proxy_from_settings(force_enable=self.use_proxy)
            
            logger.info(f"[OpenAI] 开始请求: url={url}, use_proxy={self.use_proxy}, proxy={proxy}")
            
            logger.debug(f"[OpenAI] 请求体: {request_body}")
            
            session = aiohttp.ClientSession(timeout=timeout, connector=connector)
            
            async with session.post(url, json=request_body, headers=headers, proxy=proxy) as response:
                logger.info(f"[OpenAI] 收到响应: status={response.status}")
                
                # 检查响应状态
                if response.status != 200:
                    error_text = await response.text()
                    error_msg = self._extract_error_message(error_text)
                    detailed_error = self._format_error_message(response.status, error_msg)
                    logger.error(f"[OpenAI] API 错误: status={response.status}, error={error_msg}")
                    raise ValueError(detailed_error)
                
                # 逐行读取 SSE 流
                logger.info("[OpenAI] 开始读取 SSE 流")
                chunk_count = 0
                raw_data_count = 0
                
                # 使用 aiohttp 的按行读取方法
                import json
                buffer = b""
                async for chunk_bytes in response.content.iter_any():
                    raw_data_count += 1
                    buffer += chunk_bytes
                    
                    # 按行分割
                    while b'\n' in buffer:
                        line_bytes, buffer = buffer.split(b'\n', 1)
                        line = line_bytes.decode('utf-8').strip()
                        
                        if not line:
                            continue
                        
                        # 跳过注释行
                        if line.startswith(':'):
                            continue
                        
                        # 解析 SSE 数据
                        if line.startswith('data:'):
                            # 移除 "data:" 或 "data: " 前缀
                            if line.startswith('data: '):
                                data_str = line[6:]  # 有空格
                            else:
                                data_str = line[5:]  # 没有空格
                            
                            # 检查是否是结束标记
                            if data_str == '[DONE]':
                                logger.info(f"[OpenAI] 收到结束标记，共 {chunk_count} 个 chunk")
                                break
                            
                            # 解析 JSON 数据
                            try:
                                chunk_data = json.loads(data_str)
                                
                                # 提取内容
                                if 'choices' in chunk_data and len(chunk_data['choices']) > 0:
                                    choice = chunk_data['choices'][0]
                                    delta = choice.get('delta', {})
                                    finish_reason = choice.get('finish_reason')
                                    
                                    # 处理不同模型的响应格式
                                    content = delta.get('content', '')
                                    reasoning_content = delta.get('reasoning_content', '')
                                    
                                    # 根据深度思考标志决定显示哪些内容
                                    if deep_thinking:
                                        text = content or reasoning_content
                                    else:
                                        text = content or reasoning_content
                                    
                                    if text:
                                        chunk_count += 1
                                        logger.debug(f"[OpenAI] Chunk #{chunk_count}: {text}")
                                        yield StreamChunk(content=text)
                                    
                                    # 返回 finish_reason 信息
                                    if finish_reason:
                                        logger.info(f"[OpenAI] finish_reason: {finish_reason}")
                                        yield StreamChunk(content="", finish_reason=finish_reason)
                            
                            except json.JSONDecodeError as e:
                                logger.warning(f"[OpenAI] 解析 SSE 数据失败: {e}, 数据: {data_str[:200]}")
                                continue
                
                # 检查是否收到任何数据
                if raw_data_count == 0:
                    # HTTP 200 但响应体为空，通常是风控拦截
                    error_msg = "API风控拦截：您提供的图片或文本触发了云端大模型的内容安全审查，请求被拒绝。"
                    logger.warning(f"[OpenAI] 响应体为空（HTTP 200），可能是风控拦截")
                    raise ValueError(error_msg)
                
                logger.info(f"[OpenAI] SSE 流读取完成，共 {chunk_count} 个 chunk")
        
        except asyncio.CancelledError:
            logger.info("[OpenAI] 请求被取消")
            raise
        except asyncio.TimeoutError:
            raise asyncio.TimeoutError(f"OpenAI API 请求超时（{self.timeout}秒）")
        except aiohttp.ClientError as e:
            raise aiohttp.ClientError(f"OpenAI API 网络错误: {str(e)}")
        finally:
            if session and not session.closed:
                await session.close()
                logger.debug("[OpenAI] HTTP session 已关闭")
    
    def _extract_error_message(self, error_text: str) -> str:
        """
        从 API 错误响应中提取错误消息
        
        Args:
            error_text: API 返回的错误文本
            
        Returns:
            提取后的错误消息
        """
        import json
        try:
            error_data = json.loads(error_text)
            # 尝试从常见的错误格式中提取消息
            if 'error' in error_data:
                error_obj = error_data['error']
                if isinstance(error_obj, dict):
                    return error_obj.get('message', str(error_obj))
                return str(error_obj)
            return error_text
        except (json.JSONDecodeError, TypeError):
            return error_text
    
    def _format_error_message(self, status_code: int, error_msg: str) -> str:
        """
        格式化错误消息，包含错误代码、原因和解决方案
        
        Args:
            status_code: HTTP 状态码
            error_msg: 错误消息
            
        Returns:
            格式化后的详细错误消息
        """
        error_solutions = {
            400: "请求格式错误，请检查消息内容或参数设置",
            401: "API Key 无效或已过期，请检查配置",
            403: "API Key 权限不足或账户余额不足，请检查账户状态",
            404: "API 地址或模型名称不正确，请检查配置",
            429: "请求过于频繁或配额已用尽，请稍后重试",
            500: "服务器内部错误，请稍后重试",
            502: "网关错误，请稍后重试",
            503: "服务暂时不可用，请稍后重试",
            504: "网关超时，请检查网络连接或稍后重试",
        }
        
        solution = error_solutions.get(status_code, "请检查网络连接和配置")
        
        # 截断过长的错误消息
        if len(error_msg) > 200:
            error_msg = error_msg[:200] + "..."
        
        return f"API 错误 ({status_code}): {error_msg}\n💡 建议: {solution}"
    
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
            # 发送一个简单的测试请求
            url = f"{self.base_url}/models"
            headers = {
                "Authorization": f"Bearer {self.config['api_key']}"
            }
            
            timeout = aiohttp.ClientTimeout(total=10)
            connector = create_proxy_connector()
            
            # 根据 use_proxy 决定是否使用代理
            proxy = get_proxy_from_settings(force_enable=self.use_proxy)
            
            async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                async with session.get(url, headers=headers, proxy=proxy) as response:
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
        从 OpenAI API 动态获取可用模型列表
        
        调用 GET /v1/models 端点获取服务商实际支持的模型列表。
        如果服务商不支持此端点或获取失败，抛出异常并提示用户手动输入。
        
        Returns:
            List[str]: 模型名称列表，按字母顺序排序
            
        Raises:
            Exception: 获取失败时抛出，包含详细的失败原因
            
        Example:
            try:
                models = await provider.get_available_models_async()
            except Exception as e:
                print(f"获取失败: {e}，请手动输入模型名称")
        """
        # 构建 URL（处理 base_url 末尾的斜杠）
        base_url = self.base_url.rstrip('/')
        url = f"{base_url}/models"
        
        # Debug 日志：输出完整的请求地址
        logger.debug(f"[获取模型列表] 请求地址: {url}")
        
        # 构建请求头
        headers = {
            "Authorization": f"Bearer {self.config['api_key']}"
        }
        
        # 设置超时时间：30 秒（增加超时时间以适应 Cloudflare Workers 等边缘服务）
        # 对于某些服务商（如使用 Workers 的代理），首次请求可能需要冷启动时间
        timeout = aiohttp.ClientTimeout(total=30)
        
        try:
            # 创建支持系统代理的连接器
            connector = create_proxy_connector()
            
            # 根据 use_proxy 决定是否使用代理
            proxy = get_proxy_from_settings(force_enable=self.use_proxy)
            
            async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                logger.debug(f"[获取模型列表] 开始请求: {url}")
                start_time = time.time()
                
                async with session.get(url, headers=headers, proxy=proxy) as response:
                    elapsed = time.time() - start_time
                    logger.debug(f"[获取模型列表] 收到响应: status={response.status}, 耗时={elapsed:.2f}秒")
                    
                    # 处理认证错误（401/403）
                    if response.status in (401, 403):
                        error_msg = "API Key 无效或权限不足，请检查配置后重试，或手动输入模型名称"
                        logger.warning(f"认证失败 ({response.status}): {error_msg}")
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
                    
                    # 过滤非聊天模型（排除 embedding、whisper、tts、dall-e）
                    excluded_keywords = ["embedding", "whisper", "tts", "dall-e", "davinci", "babbage", "curie", "ada"]
                    chat_models = [
                        m for m in models 
                        if not any(keyword in m.lower() for keyword in excluded_keywords)
                    ]
                    
                    if not chat_models:
                        error_msg = "未找到可用的聊天模型，请手动输入模型名称"
                        logger.warning(error_msg)
                        raise Exception(error_msg)
                    
                    logger.info(f"成功获取 {len(chat_models)} 个聊天模型")
                    
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
