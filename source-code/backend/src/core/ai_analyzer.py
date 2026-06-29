"""
AI 日志分析器
用于分析依赖安装日志并提供诊断和解决方案
"""

import asyncio
from typing import Dict, Optional, AsyncGenerator
from pathlib import Path

from ..utils.logger import app_logger as logger


class AIAnalyzer:
    """AI 日志分析器"""
    
    def __init__(self):
        """初始化 AI 分析器"""
        self._window = None
    
    def set_window(self, window):
        """
        设置 pywebview 窗口引用
        
        Args:
            window: pywebview 窗口实例
        """
        self._window = window
    
    def analyze_logs(self, logs: str, api_config_id: Optional[str] = None) -> Dict:
        """
        使用 AI 分析日志
        
        Args:
            logs: 日志内容
            api_config_id: API 配置 ID（可选，如果为 None 则使用默认配置）
            
        Returns:
            dict: {
                "success": bool,
                "topic_id": str,  # 创建的话题 ID
                "error_message": str (可选)
            }
            
        注意：此方法会创建一个新话题并发送消息，流式响应通过 window.evaluate_js 发送到前端
        """
        try:
            logger.info(f"[AIAnalyzer] 开始 AI 日志分析，日志长度: {len(logs)} 字符")
            
            # 导入 AI 相关模块
            from ..core.ai.topic_manager import TopicManager
            from ..core.ai.ai_service import AIService
            from ..core.ai.config_manager import ConfigManager
            from ..core.ai.default_config_manager import DefaultConfigManager
            
            # 初始化服务
            topic_manager = TopicManager()
            ai_service = AIService()
            config_manager = ConfigManager()
            default_config_manager = DefaultConfigManager()
            
            # 获取 API 配置
            if api_config_id:
                # 使用指定的配置
                logger.info(f"[AIAnalyzer] 使用指定的 API 配置: {api_config_id}")
                config = config_manager.get_config_by_id(api_config_id)
                if not config:
                    return {
                        "success": False,
                        "error_message": f"未找到指定的 API 配置: {api_config_id}"
                    }
                provider = config.provider
                model = config.model
            else:
                # 使用默认配置
                logger.info("[AIAnalyzer] 使用默认 API 配置")
                default_config_id = default_config_manager.get_default_config_id()
                if not default_config_id:
                    return {
                        "success": False,
                        "error_message": "未设置默认 API 配置，请先在 AI 助手中配置"
                    }
                
                config = config_manager.get_config_by_id(default_config_id)
                if not config:
                    return {
                        "success": False,
                        "error_message": f"默认 API 配置不存在: {default_config_id}"
                    }
                provider = config.provider
                model = config.model
            
            # 构建分析提示词
            analysis_prompt = self.build_analysis_prompt(logs)
            
            # 创建新话题
            topic = topic_manager.create_topic("依赖安装日志分析")
            topic_id = topic.id
            logger.info(f"[AIAnalyzer] 创建话题: {topic_id}")
            
            # 获取 AI 配置
            # 构建 Provider 配置
            provider_config = {
                "api_key": config.api_key,
                "base_url": config.base_url if config.base_url else None,
                "temperature": 0.7,  # 使用默认值
                "max_tokens": 2048,  # 使用默认值
                "model": model,
                "use_system_proxy": config.use_system_proxy,  # 添加系统代理开关
            }
            
            logger.info(f"[AIAnalyzer] Provider 配置: provider={provider}, model={model}, use_system_proxy={config.use_system_proxy}")
            
            # 定义异步函数来处理流式响应
            async def process_streaming():
                import json
                events = []
                total_content_length = 0
                
                async for event in ai_service.send_message(
                    topic_id, analysis_prompt, provider, model, provider_config, 
                    web_search_enabled=False, system_prompt=None, files=None
                ):
                    events.append(event)
                    
                    # 如果有窗口，每个 chunk 立即发送到前端（打字机效果）
                    if self._window and event["type"] == "chunk":
                        chunk_content = event['chunk']
                        if chunk_content:
                            chunk_json = json.dumps(chunk_content)
                            total_content_length += len(chunk_content)
                            
                            try:
                                self._window.evaluate_js(f"""
                                    window.dispatchEvent(new CustomEvent('dependency_ai_analysis_chunk', {{
                                        detail: {{
                                            topic_id: '{topic_id}',
                                            chunk: {chunk_json},
                                            done: false
                                        }}
                                    }}))
                                """)
                            except Exception as e:
                                logger.error(f"[AIAnalyzer] 发送 chunk 失败: {e}")
                
                logger.info(f"[AIAnalyzer] 流式响应处理完成，共收到 {len(events)} 个事件，总内容长度: {total_content_length}")
                return events
            
            # 使用 asyncio 运行异步方法
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                events = loop.run_until_complete(process_streaming())
                
                # 查找最终结果
                done_event = next((e for e in events if e["type"] == "done"), None)
                error_event = next((e for e in events if e["type"] == "error"), None)
                
                if error_event:
                    return {
                        "success": False,
                        "error_message": error_event.get("error", "AI 分析失败")
                    }
                elif done_event:
                    # 发送完成事件到前端
                    if self._window:
                        self._window.evaluate_js(f"""
                            window.dispatchEvent(new CustomEvent('dependency_ai_analysis_chunk', {{
                                detail: {{
                                    topic_id: '{topic_id}',
                                    chunk: '',
                                    done: true
                                }}
                            }}))
                        """)
                    
                    logger.info(f"[AIAnalyzer] AI 分析完成，话题 ID: {topic_id}")
                    return {
                        "success": True,
                        "topic_id": topic_id
                    }
                else:
                    return {
                        "success": False,
                        "error_message": "未收到完成事件"
                    }
            finally:
                loop.close()
        
        except Exception as e:
            logger.error(f"[AIAnalyzer] AI 分析失败: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error_message": f"AI 分析失败: {str(e)}"
            }
    
    def build_analysis_prompt(self, logs: str) -> str:
        """
        构建 AI 分析提示词
        
        Args:
            logs: 日志内容
            
        Returns:
            str: 分析提示词
        """
        prompt = f"""你是一个 Python 依赖安装专家。请分析以下依赖安装日志，并提供详细的诊断和解决方案。

请按以下格式输出：

## 问题诊断
[简要描述发现的问题]

## 错误原因
[详细解释错误的根本原因]

## 解决方案
[提供具体的解决步骤，使用编号列表]

## 预防措施
[提供避免类似问题的建议]

---

日志内容：

```
{logs}
```

请开始分析："""
        
        return prompt
    
    def save_to_ai_assistant(self, logs: str, analysis: str) -> Dict:
        """
        保存对话到 AI 助手
        
        Args:
            logs: 原始日志内容
            analysis: AI 分析结果
            
        Returns:
            dict: {
                "success": bool,
                "topic_id": str,  # 话题 ID
                "error_message": str (可选)
            }
            
        注意：此方法已被 analyze_logs 方法集成，通常不需要单独调用
        """
        try:
            logger.info("[AIAnalyzer] 保存对话到 AI 助手")
            
            # 导入 AI 相关模块
            from ..core.ai.topic_manager import TopicManager
            
            # 初始化服务
            topic_manager = TopicManager()
            
            # 创建新话题
            topic = topic_manager.create_topic("依赖安装日志分析")
            topic_id = topic.id
            
            # 添加用户消息（日志）
            topic_manager.add_message(
                topic_id=topic_id,
                role="user",
                content=f"请分析以下依赖安装日志：\n\n```\n{logs}\n```"
            )
            
            # 添加助手消息（分析结果）
            topic_manager.add_message(
                topic_id=topic_id,
                role="assistant",
                content=analysis
            )
            
            logger.info(f"[AIAnalyzer] 对话已保存到话题: {topic_id}")
            
            return {
                "success": True,
                "topic_id": topic_id
            }
        
        except Exception as e:
            logger.error(f"[AIAnalyzer] 保存对话失败: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error_message": f"保存对话失败: {str(e)}"
            }
