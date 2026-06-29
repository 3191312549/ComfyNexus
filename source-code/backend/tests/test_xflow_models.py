"""
测试 xFlow 支持的模型列表

检查哪些模型支持 thinking 参数
"""

import asyncio
import aiohttp
import json
import sys


async def get_xflow_models(api_key: str):
    """
    获取 xFlow 支持的模型列表
    
    Args:
        api_key: xFlow API Key
    """
    base_url = "https://api.xflow.cc/v1"
    url = f"{base_url}/models"
    
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    print(f"=== 获取 xFlow 模型列表 ===")
    print(f"URL: {url}\n")
    
    try:
        timeout = aiohttp.ClientTimeout(total=10)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"错误: {error_text}")
                    return
                
                data = await response.json()
                
                if "data" not in data:
                    print(f"响应格式: {json.dumps(data, indent=2, ensure_ascii=False)}")
                    return
                
                models = data["data"]
                print(f"找到 {len(models)} 个模型:\n")
                
                # 按模型 ID 分组
                glm_models = []
                qwen_models = []
                other_models = []
                
                for model in models:
                    model_id = model.get("id", "")
                    
                    if "glm" in model_id.lower():
                        glm_models.append(model_id)
                    elif "qwen" in model_id.lower():
                        qwen_models.append(model_id)
                    else:
                        other_models.append(model_id)
                
                if glm_models:
                    print(f"GLM 系列模型 ({len(glm_models)} 个):")
                    for model_id in sorted(glm_models):
                        print(f"  - {model_id}")
                    print()
                
                if qwen_models:
                    print(f"Qwen 系列模型 ({len(qwen_models)} 个):")
                    for model_id in sorted(qwen_models):
                        print(f"  - {model_id}")
                    print()
                
                if other_models:
                    print(f"其他模型 ({len(other_models)} 个):")
                    for model_id in sorted(other_models):
                        print(f"  - {model_id}")
                    print()
    
    except Exception as e:
        print(f"请求失败: {e}")
        import traceback
        traceback.print_exc()


async def test_model_thinking(api_key: str, model_id: str):
    """
    测试指定模型是否支持 thinking 参数
    
    Args:
        api_key: xFlow API Key
        model_id: 模型 ID
    """
    base_url = "https://api.xflow.cc/v1"
    url = f"{base_url}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    print(f"\n{'='*80}")
    print(f"测试模型: {model_id}")
    print(f"{'='*80}\n")
    
    # 测试两种情况
    tests = [
        {"name": "默认（无 thinking 参数）", "params": {}},
        {"name": "thinking disabled", "params": {"thinking": {"type": "disabled"}}},
    ]
    
    for test in tests:
        print(f"--- {test['name']} ---\n")
        
        request_body = {
            "model": model_id,
            "messages": [
                {"role": "user", "content": "1+1=?"}
            ],
            "temperature": 0.7,
            "max_tokens": 50,
            "stream": True,
            **test['params']
        }
        
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, json=request_body, headers=headers) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        print(f"错误 ({response.status}): {error_text}\n")
                        continue
                    
                    # 读取前几个 chunk
                    has_reasoning = False
                    has_content = False
                    chunk_count = 0
                    max_chunks = 3
                    
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
                                        
                                        if chunk_count >= max_chunks:
                                            break
                                
                                except json.JSONDecodeError:
                                    continue
                        
                        if chunk_count >= max_chunks:
                            break
                    
                    print(f"结果: reasoning_content={has_reasoning}, content={has_content}\n")
        
        except Exception as e:
            print(f"请求失败: {e}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python test_xflow_models.py <API_KEY> [model_id]")
        print("示例: python test_xflow_models.py sk-xxx")
        print("      python test_xflow_models.py sk-xxx glm-4.5")
        sys.exit(1)
    
    api_key = sys.argv[1]
    
    # 获取模型列表
    asyncio.run(get_xflow_models(api_key))
    
    # 如果指定了模型，测试该模型
    if len(sys.argv) > 2:
        model_id = sys.argv[2]
        asyncio.run(test_model_thinking(api_key, model_id))
