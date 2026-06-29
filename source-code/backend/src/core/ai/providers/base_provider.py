"""
BaseProvider 抽象基类

定义所有 AI 服务商 Provider 必须实现的统一接口。
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator, Dict, Any, Tuple, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class StreamChunk:
    """流式响应的数据结构
    
    Attributes:
        content: 文本内容片段
        finish_reason: 结束原因，可选值: stop, length, content_filter
    """
    content: str = ""
    finish_reason: Optional[str] = None


class BaseProvider(ABC):
    """AI Provider 抽象基类
    
    所有 AI 服务商 Provider 必须继承此类并实现所有抽象方法。
    """
    
    def __init__(self, config: Dict[str, Any], use_proxy: bool = False):
        """初始化 Provider
        
        Args:
            config: 服务商配置字典
                {
                    "api_key": str,           # API 密钥
                    "base_url": str,          # 可选，API 基础 URL
                    "model": str,             # 模型名称
                    "temperature": float,     # 温度参数 (0.0 - 2.0)
                    "max_tokens": int,        # 最大 Token 数
                    ...                       # 其他服务商特定配置
                }
            use_proxy: 是否使用系统代理
        """
        self.config = config
        self.use_proxy = use_proxy
        self._validate_config()
    
    def _validate_config(self) -> None:
        """验证配置参数
        
        子类可以重写此方法以添加特定的配置验证逻辑。
        
        Raises:
            ValueError: 配置参数无效时抛出
        """
        # 基础验证
        if not isinstance(self.config, dict):
            raise ValueError("配置必须是字典类型")
        
        # 验证必需参数
        if "model" not in self.config:
            raise ValueError("配置中缺少必需参数: model")
        
        # 验证温度参数
        if "temperature" in self.config:
            temp = self.config["temperature"]
            if not isinstance(temp, (int, float)) or temp < 0.0 or temp > 2.0:
                raise ValueError("temperature 必须在 0.0 到 2.0 之间")
        
        # 验证最大 Token 数
        if "max_tokens" in self.config:
            max_tokens = self.config["max_tokens"]
            if not isinstance(max_tokens, int) or max_tokens <= 0:
                raise ValueError("max_tokens 必须是正整数")
    
    @abstractmethod
    async def chat_stream(
        self, 
        messages: List[Dict[str, str]], 
        system_prompt: str = None,
        deep_thinking: bool = False
    ) -> AsyncIterator[StreamChunk]:
        """流式聊天
        
        发送消息到 AI 服务商并以流式方式接收响应。
        
        Args:
            messages: 消息列表，每条消息包含 role 和 content
                [
                    {"role": "user", "content": "你好"},
                    {"role": "assistant", "content": "你好！有什么可以帮助你的吗？"},
                    {"role": "user", "content": "介绍一下 ComfyUI"}
                ]
            system_prompt: 可选的系统提示词，用于设定 AI 的行为和角色
            deep_thinking: 是否启用深度思考模式（可选，默认 False）
            
        Yields:
            StreamChunk: 流式响应数据结构，包含 content 和 finish_reason
            
        Raises:
            Exception: API 调用失败时抛出相应异常
            
        Example:
            async for chunk in provider.chat_stream(messages):
                if chunk.content:
                    print(chunk.content, end='', flush=True)
                if chunk.finish_reason:
                    print(f"结束原因: {chunk.finish_reason}")
        """
        pass
    
    @abstractmethod
    async def test_connection(self) -> Tuple[bool, str, float]:
        """测试与 AI 服务商的连接
        
        发送一个简单的测试请求以验证配置是否正确，服务是否可用。
        
        Returns:
            Tuple[bool, str, float]: 
                - success: 连接是否成功
                - message: 成功或失败的描述信息
                - latency: 请求延迟（毫秒），失败时为 0.0
                
        Example:
            success, message, latency = await provider.test_connection()
            if success:
                print(f"连接成功，延迟: {latency}ms")
            else:
                print(f"连接失败: {message}")
        """
        pass
    
    @abstractmethod
    async def get_available_models_async(self) -> List[str]:
        """异步获取服务商支持的可用模型列表（从 API 动态获取）
        
        此方法从服务商 API 动态获取最新的模型列表，反映服务商实际支持的模型。
        通常调用服务商的 /v1/models 端点或类似接口。
        
        Returns:
            List[str]: 模型名称列表，按字母顺序排序
            
        Raises:
            Exception: 获取失败时抛出，包含详细的失败原因和解决建议
            
        Example:
            try:
                models = await provider.get_available_models_async()
                print(f"可用模型: {models}")
                # ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
            except Exception as e:
                print(f"获取失败: {e}")
                # 提示用户手动输入模型名称
        
        Note:
            - 此方法应该设置合理的超时时间（建议 30 秒）
            - 返回的模型列表应该过滤掉非聊天模型（如 embedding、whisper 等）
            - 返回的模型列表应该按字母顺序排序
            - 如果 API 调用失败，应该抛出包含详细错误信息的异常
            - 异常信息应该包含失败原因和解决建议，提示用户手动输入模型名称
        """
        pass
    
    def get_model(self) -> str:
        """获取当前配置的模型名称
        
        Returns:
            str: 模型名称
        """
        return self.config.get("model", "")
    
    def get_temperature(self) -> float:
        """获取当前配置的温度参数
        
        Returns:
            float: 温度值，默认 0.7
        """
        return self.config.get("temperature", 0.7)
    
    def get_max_tokens(self) -> Optional[int]:
        """获取当前配置的最大 Token 数
        
        Returns:
            Optional[int]: 最大 Token 数，如果未设置则返回 None（使用模型默认值）
        """
        return self.config.get("max_tokens", None)

