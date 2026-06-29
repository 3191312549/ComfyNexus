"""
测试 GLM-4.5 的响应格式

验证修改后的代码是否能正确处理 GLM-4.5 的响应
"""

import asyncio
import sys
import os

# 添加 backend/src 到 Python 路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(backend_dir, 'src')
sys.path.insert(0, src_dir)

# 同时添加项目根目录
project_root = os.path.dirname(backend_dir)
sys.path.insert(0, project_root)

from core.ai.providers.openai_provider import OpenAIProvider


async def test_glm_response():
    """测试 GLM-4.5 的响应"""
    
    # 配置
    config = {
        "api_key": "sk-BRRNDy4F2cdbya7lohV5EOASZxf9wMbZb3ejwmECFrBlXjX9",
        "base_url": "https://api.xflow.cc/v1",
        "model": "glm-4.5",
        "temperature": 0.7,
        "max_tokens": 100
    }
    
    # 创建 Provider
    provider = OpenAIProvider(config)
    
    # 测试消息
    messages = [
        {"role": "user", "content": "1+1等于几？请简短回答。"}
    ]
    
    print("=== 测试 GLM-4.5 响应（深度思考关闭） ===\n")
    
    # 发送请求
    response_text = ""
    try:
        async for chunk in provider.chat_stream(messages, deep_thinking=False):
            response_text += chunk
            print(chunk, end="", flush=True)
        
        print("\n")
        print(f"完整响应: {response_text}")
        print(f"响应长度: {len(response_text)} 字符")
        
        if len(response_text) > 0:
            print("\n✅ 测试通过：成功接收到响应")
        else:
            print("\n❌ 测试失败：响应为空")
    
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_glm_response())
