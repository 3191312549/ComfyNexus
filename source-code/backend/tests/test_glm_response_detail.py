"""
测试 GLM-4.5 的详细响应格式

查看 reasoning_content 的具体内容
"""

import asyncio
import aiohttp
import json


async def test_glm_detail():
    """测试 GLM-4.5 的详细响应"""
    
    api_key = "sk-BRRNDy4F2cdbya7lohV5EOASZxf9wMbZb3ejwmECFrBlXjX9"
    base_url = "https://api.xflow.cc/v1"
    url = f"{base_url}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    request_body = {
        "model": "glm-4.5",
        "messages": [
            {"role": "user", "content": "1+1等于几？请简短回答。"}
        ],
        "temperature": 0.7,
        "max_tokens": 200,
        "stream": True
    }
    
    print("=== 测试 GLM-4.5 详细响应 ===\n")
    print("请求体:", json.dumps(request_body, indent=2, ensure_ascii=False))
    print("\n开始接收响应...\n")
    
    try:
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, json=request_body, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"错误: {error_text}")
                    return
                
                chunk_index = 0
                buffer = b""
                
                async for chunk_bytes in response.content.iter_any():
                    buffer += chunk_bytes
                    
                    while b'\n' in buffer:
                        line_bytes, buffer = buffer.split(b'\n', 1)
                        line = line_bytes.decode('utf-8').strip()
                        
                        if not line or line.startswith(':'):
                            continue
                        
                        if line.startswith('data:'):
                            data_str = line[6:] if line.startswith('data: ') else line[5:]
                            
                            if data_str == '[DONE]':
                                print("\n收到 [DONE] 标记")
                                break
                            
                            try:
                                chunk_data = json.loads(data_str)
                                
                                if 'choices' in chunk_data and len(chunk_data['choices']) > 0:
                                    delta = chunk_data['choices'][0].get('delta', {})
                                    
                                    # 检查所有可能的字段
                                    has_content = 'content' in delta
                                    has_reasoning = 'reasoning_content' in delta
                                    
                                    if has_content or has_reasoning:
                                        chunk_index += 1
                                        print(f"\n--- Chunk #{chunk_index} ---")
                                        
                                        if has_reasoning:
                                            reasoning = delta['reasoning_content']
                                            print(f"reasoning_content: {repr(reasoning)}")
                                        
                                        if has_content:
                                            content = delta['content']
                                            print(f"content: {repr(content)}")
                                        
                                        # 显示完整的 delta
                                        print(f"完整 delta: {json.dumps(delta, ensure_ascii=False)}")
                            
                            except json.JSONDecodeError as e:
                                print(f"JSON 解析错误: {e}")
                                continue
    
    except Exception as e:
        print(f"请求失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_glm_detail())
