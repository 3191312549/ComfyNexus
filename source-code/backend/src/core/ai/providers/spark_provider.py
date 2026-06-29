"""
SparkProvider 实现（讯飞星火）

提供讯飞星火 API 的流式聊天功能，支持：
- WebSocket 流式响应
- 连接测试
- 模型列表获取
- 错误处理和超时控制

讯飞星火 API 文档：https://www.xfyun.cn/doc/spark/Web.html
"""

import asyncio
import time
import json
import hmac
import hashlib
import base64
from typing import AsyncIterator, Dict, Any, List, Tuple
from urllib.parse import urlencode, urlparse
from datetime import datetime, timezone
import logging

try:
    import websockets
except ImportError:
    websockets = None

from .base_provider import BaseProvider, StreamChunk
from .network_utils import get_websocket_proxy
from ._deep_thinking_prompt import DEEP_THINKING_PROMPT

logger = logging.getLogger(__name__)


class SparkProvider(BaseProvider):
    """讯飞星火 Provider 实现类
    
    讯飞星火使用 WebSocket 协议进行通信，需要特殊的鉴权方式。
    """
    
    # 模型版本对应的 API 地址
    MODEL_URLS = {
        'v1.5': 'wss://spark-api.xf-yun.com/v1.1/chat',
        'v2.0': 'wss://spark-api.xf-yun.com/v2.1/chat',
        'v3.0': 'wss://spark-api.xf-yun.com/v3.1/chat',
        'v3.5': 'wss://spark-api.xf-yun.com/v3.5/chat',
        'v4.0': 'wss://spark-api.xf-yun.com/v4.0/chat',
    }
    
    # 模型版本对应的 domain
    MODEL_DOMAINS = {
        'v1.5': 'general',
        'v2.0': 'generalv2',
        'v3.0': 'generalv3',
        'v3.5': 'generalv3.5',
        'v4.0': 'generalv4',
    }
    
    def __init__(self, config: Dict[str, Any], use_proxy: bool = False):
        """
        初始化讯飞星火 Provider
        
        Args:
            config: 配置字典
                {
                    "app_id": str,           # 应用 ID（必需）
                    "api_key": str,          # API Key（必需）
                    "api_secret": str,       # API Secret（必需）
                    "model": str,            # 模型版本（必需，如 v3.5）
                    "temperature": float,    # 温度参数（可选，默认 0.5）
                    "max_tokens": int,       # 最大 Token 数（可选，默认 2048）
                    "timeout": int,          # 超时时间（秒，可选，默认 30）
                }
            use_proxy: 是否使用系统代理
        """
        super().__init__(config, use_proxy=use_proxy)
        
        # 检查 websockets 库是否可用
        if websockets is None:
            raise ImportError(
                "SparkProvider 需要 websockets 库。"
                "请运行: pip install websockets"
            )
        
        self.app_id = config.get('app_id', '')
        self.api_key = config.get('api_key', '')
        self.api_secret = config.get('api_secret', '')
        self.timeout = config.get('timeout', 300)  # 默认 5 分钟
        
        # 验证必需参数
        if not self.app_id:
            raise ValueError("讯飞星火 Provider 需要提供 app_id")
        if not self.api_key:
            raise ValueError("讯飞星火 Provider 需要提供 api_key")
        if not self.api_secret:
            raise ValueError("讯飞星火 Provider 需要提供 api_secret")
        
        # 验证模型版本
        model = self.get_model()
        if model not in self.MODEL_URLS:
            available = ', '.join(self.MODEL_URLS.keys())
            raise ValueError(
                f"不支持的讯飞星火模型: '{model}'. "
                f"可用模型: {available}"
            )
    
    def _generate_auth_url(self, base_url: str) -> str:
        """
        生成带鉴权参数的 WebSocket URL
        
        讯飞星火使用 HMAC-SHA256 签名进行鉴权。
        
        Args:
            base_url: 基础 WebSocket URL
        
        Returns:
            带鉴权参数的完整 URL
        """
        # 解析 URL
        parsed = urlparse(base_url)
        host = parsed.netloc
        path = parsed.path
        
        # 生成 RFC1123 格式的时间戳
        now = datetime.now(timezone.utc)
        date = now.strftime('%a, %d %b %Y %H:%M:%S GMT')
        
        # 构建签名原文
        signature_origin = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"
        
        # 使用 HMAC-SHA256 生成签名
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            signature_origin.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        # Base64 编码签名
        signature_base64 = base64.b64encode(signature).decode('utf-8')
        
        # 构建 authorization 字符串
        authorization_origin = (
            f'api_key="{self.api_key}", '
            f'algorithm="hmac-sha256", '
            f'headers="host date request-line", '
            f'signature="{signature_base64}"'
        )
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode('utf-8')
        
        # 构建完整 URL
        auth_params = {
            'authorization': authorization,
            'date': date,
            'host': host
        }
        
        return f"{base_url}?{urlencode(auth_params)}"
    
    def _build_request_body(
        self, 
        messages: List[Dict[str, str]], 
        system_prompt: str = None,
        deep_thinking: bool = False
    ) -> dict:
        """
        构建请求体
        
        Args:
            messages: 消息列表
            system_prompt: 系统提示词（可选）
            deep_thinking: 是否启用深度思考（可选）
        
        Returns:
            请求体字典
        """
        # 获取模型对应的 domain
        model = self.get_model()
        domain = self.MODEL_DOMAINS.get(model, 'general')
        
        # 构建消息列表
        request_messages = []
        
        # 讯飞星火不支持 system role，需要将 system prompt 转换为 user 消息
        if system_prompt:
            request_messages.append({
                "role": "user",
                "content": system_prompt
            })
        
        # 如果启用深度思考，添加深度思考提示词
        if deep_thinking:
            request_messages.append({
                "role": "user",
                "content": DEEP_THINKING_PROMPT
            })
        
        # 添加对话消息
        request_messages.extend(messages)
        
        # 构建请求体
        request_body = {
            "header": {
                "app_id": self.app_id,
                "uid": "user"
            },
            "parameter": {
                "chat": {
                    "domain": domain,
                    "temperature": self.get_temperature(),
                }
            },
            "payload": {
                "message": {
                    "text": request_messages
                }
            }
        }
        
        # 只有在设置了 max_tokens 时才添加到请求体
        max_tokens = self.get_max_tokens()
        if max_tokens is not None:
            request_body["parameter"]["chat"]["max_tokens"] = max_tokens
        
        return request_body
    
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
            Exception: WebSocket 连接或通信错误
        """
        # 获取模型对应的 WebSocket URL
        model = self.get_model()
        base_url = self.MODEL_URLS[model]
        
        # 生成鉴权 URL
        auth_url = self._generate_auth_url(base_url)
        
        # 构建请求体
        request_body = self._build_request_body(messages, system_prompt, deep_thinking)
        
        # 获取代理配置
        proxy = get_websocket_proxy()
        
        try:
            # 建立 WebSocket 连接
            connect_kwargs = {
                'ping_interval': None,
                'close_timeout': self.timeout
            }
            
            # 如果有代理配置，添加代理参数
            if proxy:
                logger.debug(f"[讯飞星火] 使用代理: {proxy}")
                # 注意：websockets 库的代理支持可能有限
                # 某些版本可能不支持 proxy 参数
                try:
                    connect_kwargs['proxy'] = proxy
                except TypeError:
                    logger.warning("[讯飞星火] 当前 websockets 版本不支持代理参数")
            
            async with websockets.connect(auth_url, **connect_kwargs) as websocket:
                # 发送请求
                await websocket.send(json.dumps(request_body, ensure_ascii=False))
                
                # 接收响应
                while True:
                    try:
                        # 设置接收超时
                        response_text = await asyncio.wait_for(
                            websocket.recv(),
                            timeout=self.timeout
                        )
                        
                        # 解析响应
                        response = json.loads(response_text)
                        
                        # 检查错误
                        header = response.get('header', {})
                        code = header.get('code', 0)
                        
                        if code != 0:
                            message = header.get('message', '未知错误')
                            raise ValueError(f"讯飞星火 API 错误 ({code}): {message}")
                        
                        # 提取内容
                        payload = response.get('payload', {})
                        choices = payload.get('choices', {})
                        text_list = choices.get('text', [])
                        
                        for text_item in text_list:
                            content = text_item.get('content', '')
                            if content:
                                yield StreamChunk(content=content)
                        
                        # 检查是否结束
                        status = choices.get('status', 0)
                        if status == 2:  # 2 表示结束
                            yield StreamChunk(content="", finish_reason="stop")
                            break
                    
                    except asyncio.TimeoutError:
                        raise asyncio.TimeoutError(f"讯飞星火 API 接收超时（{self.timeout}秒）")
        
        except websockets.exceptions.WebSocketException as e:
            raise Exception(f"讯飞星火 WebSocket 错误: {str(e)}")
        
        except Exception as e:
            if isinstance(e, (asyncio.TimeoutError, ValueError)):
                raise
            raise Exception(f"讯飞星火 API 错误: {str(e)}")
    
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
            # 发送一个简单的测试消息
            test_messages = [
                {"role": "user", "content": "你好"}
            ]
            
            # 尝试获取第一个响应片段
            response_received = False
            async for chunk in self.chat_stream(test_messages):
                if chunk:
                    response_received = True
                    break
            
            latency = int((time.time() - start_time) * 1000)  # 转换为毫秒（整数）
            
            if response_received:
                return True, "连接成功", latency
            else:
                return False, "未收到响应", latency
        
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
        
        Note:
            讯飞星火的模型列表是固定的，由 MODEL_URLS 定义。
        """
        # 讯飞星火的模型列表是固定的，返回固定列表
        return list(self.MODEL_URLS.keys())
