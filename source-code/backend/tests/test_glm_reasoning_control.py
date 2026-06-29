"""
测试 GLM-4.5 的 reasoning 控制参数

检查是否有参数可以控制 reasoning_content 的输出
"""

import asyncio
import aiohttp
import json
import sys


async def test_reasoning_control(api_key: str, enable_reasoning: bool = False):
    """
    测试不同参数下的 reasoning 行为
    
    Args:
        api_key: xFlow API Key
        enable_reasoning: 是否启用 reasoning
    """
    base_url = "https://api.xflow.cc/v1"
    url = f"{base_url}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # 尝试不同的参数组合
    test_params = [
        {"name": "默认（无特殊参数）", "params": {}},
        {"name": "enable_reasoning=False", "params": {"enable_reasoning": False}},
        {"name": "enable_reasoning=True", "params": {"enable_reasoning": True}},
        {"name": "reasoning=False", "params": {"reasoning": False}},
        {"name": "reasoning=True", "params": {"reasoning": True}},
        {"name": "stream_options with reasoning", "params": {"stream_options": {"include_reasoning": False}}},
    ]
    
    for test in test_params:
        print(f"\n{'='*80}")
        print(f"测试: {test['name']}")
        print(f"{'='*80}\n")
        
        request_body = {
            "model": "glm-4.5",
            "messages": [
                {"role": "user", "content": "1+1等于几？"}
            ],
            "temperature": 0.7,
            "max_tokens": 100,
            "stream": True,
            **test['params']  # 添加测试参数
        }
        
        print(f"请求参数: {json.dumps(request_body, indent=2, ensure_ascii=False)}\n")
        
        try:
            timeout = aiohttp.ClientTimeout(total=30)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, json=request_body, headers=headers) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        print(f"错误: {error_text}\n")
                        continue
                    
                    # 读取前几个 chunk
                    has_reasoning = False
                    has_content = False
                    chunk_count = 0
                    max_chunks = 5
                    
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
                                    break
                                
                                try:
                                    chunk_data = json.loads(data_str)
                                    
                                    if 'choices' in chunk_data and len(chunk_data['choices']) > 0:
                                        delta = chunk_data['choices'][0].get('delta', {})
                                        
                                        if 'reasoning_content' in delta:
                                            has_reasoning = True
                                        
                                        if 'content' in delta:
                                            has_content = True
                                        
                                        chunk_count += 1
                                        
                                        if chunk_count <= max_chunks:
                                            print(f"Chunk #{chunk_count}: {json.dumps(delta, ensure_ascii=False)}")
                                        
                                        if chunk_count >= max_chunks:
                                            break
                                
                                except json.JSONDecodeError:
                                    continue
                        
                        if chunk_count >= max_chunks:
                            break
                    
                    print(f"\n结果:")
                    print(f"  - 包含 reasoning_content: {has_reasoning}")
                    print(f"  - 包含 content: {has_content}")
                    print(f"  - 总 chunk 数: {chunk_count}")
        
        except Exception as e:
            print(f"请求失败: {e}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python test_glm_reasoning_control.py <API_KEY>")
        sys.exit(1)
    
    api_key = sys.argv[1]
    
    asyncio.run(test_reasoning_control(api_key))
