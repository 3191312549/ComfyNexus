"""
测试 xFlow API 调用

用于诊断 xFlow glm-4.5 模型返回通义千问的问题
"""

import asyncio
import aiohttp
import json
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def test_xflow_api(api_key: str, model: str = "glm-4.5"):
    """
    测试 xFlow API 调用
    
    Args:
        api_key: xFlow API Key
        model: 模型名称
    """
    base_url = "https://api.xflow.cc/v1"
    url = f"{base_url}/chat/completions"
    
    # 构建请求
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    request_body = {
        "model": model,
        "messages": [
            {"role": "user", "content": "你是谁？请介绍一下你自己。"}
        ],
        "temperature": 0.7,
        "max_tokens": 500,
        "stream": True
    }
    
    print(f"=== 测试 xFlow API ===")
    print(f"URL: {url}")
    print(f"Model: {model}")
    print(f"Request Body: {json.dumps(request_body, indent=2, ensure_ascii=False)}")
    print(f"\n=== 开始请求 ===\n")
    
    try:
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, json=request_body, headers=headers) as response:
                print(f"Response Status: {response.status}")
                print(f"Response Headers: {dict(response.headers)}")
                print(f"\n=== 流式响应 ===\n")
                
                if response.status != 200:
                    error_text = await response.text()
                    print(f"错误: {error_text}")
                    return
                
                # 读取流式响应
                full_content = ""
                chunk_count = 0
                
                buffer = b""
                async for chunk_bytes in response.content.iter_any():
                    buffer += chunk_bytes
                    
                    # 按行分割
                    while b'\n' in buffer:
                        line_bytes, buffer = buffer.split(b'\n', 1)
                        line = line_bytes.decode('utf-8').strip()
                        
                        if not line or line.startswith(':'):
                            continue
                        
                        # 解析 SSE 数据
                        if line.startswith('data:'):
                            data_str = line[6:] if line.startswith('data: ') else line[5:]
                            
                            if data_str == '[DONE]':
                                print("\n\n=== 收到结束标记 ===")
                                break
                            
                            try:
                                chunk_data = json.loads(data_str)
                                
                                # 打印原始 chunk 数据（第一个 chunk）
                                if chunk_count == 0:
                                    print(f"第一个 Chunk 数据: {json.dumps(chunk_data, indent=2, ensure_ascii=False)}")
                                    print("\n")
                                
                                # 提取内容
                                if 'choices' in chunk_data and len(chunk_data['choices']) > 0:
                                    delta = chunk_data['choices'][0].get('delta', {})
                                    content = delta.get('content', '')
                                    
                                    if content:
                                        chunk_count += 1
                                        full_content += content
                                        print(content, end='', flush=True)
                            
                            except json.JSONDecodeError as e:
                                print(f"\n解析错误: {e}, 数据: {data_str[:200]}")
                
                print(f"\n\n=== 响应完成 ===")
                print(f"总 Chunk 数: {chunk_count}")
                print(f"总内容长度: {len(full_content)}")
                print(f"\n完整内容:\n{full_content}")
    
    except Exception as e:
        print(f"请求失败: {e}")
        import traceback
        traceback.print_exc()


async def test_xflow_models(api_key: str):
    """
    测试 xFlow 模型列表
    
    Args:
        api_key: xFlow API Key
    """
    base_url = "https://api.xflow.cc/v1"
    url = f"{base_url}/models"
    
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    print(f"\n=== 测试 xFlow 模型列表 ===")
    print(f"URL: {url}")
    
    try:
        timeout = aiohttp.ClientTimeout(total=10)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, headers=headers) as response:
                print(f"Response Status: {response.status}")
                
                if response.status != 200:
                    error_text = await response.text()
                    print(f"错误: {error_text}")
                    return
                
                data = await response.json()
                print(f"\n模型列表:")
                
                if "data" in data:
                    for model in data["data"]:
                        model_id = model.get("id", "unknown")
                        print(f"  - {model_id}")
                else:
                    print(f"响应格式: {json.dumps(data, indent=2, ensure_ascii=False)}")
    
    except Exception as e:
        print(f"请求失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # 从命令行参数获取 API Key
    if len(sys.argv) < 2:
        print("用法: python test_xflow_api.py <API_KEY> [model]")
        print("示例: python test_xflow_api.py sk-xxx glm-4.5")
        sys.exit(1)
    
    api_key = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else "glm-4.5"
    
    # 运行测试
    asyncio.run(test_xflow_models(api_key))
    print("\n" + "="*80 + "\n")
    asyncio.run(test_xflow_api(api_key, model))
