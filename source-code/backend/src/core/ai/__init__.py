"""
AI 助手模块

提供多模型支持的智能对话功能，包括：
- 多轮对话管理
- 话题管理
- 消息持久化
- 多 AI 服务商支持（OpenAI、讯飞星火、火山引擎、智谱 AI、Ollama）
"""

__version__ = "0.1.0"

from .models import Topic, Message, AIConfig
from .database import init_database

__all__ = [
    "Topic",
    "Message",
    "AIConfig",
    "init_database",
]
