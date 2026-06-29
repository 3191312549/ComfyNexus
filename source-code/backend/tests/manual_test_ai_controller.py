"""
手动测试 AIController 的 ai_get_available_models 方法

这是一个简单的测试脚本，用于验证新实现的接口是否正常工作。
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.src.bridge.controllers.ai_controller import AIController


def test_ai_get_available_models():
    """测试 ai_get_available_models 方法"""
    
    print("=" * 80)
    print("测试 AIController.ai_get_available_models 方法")
    print("=" * 80)
    
    # 创建 AIController 实例
    controller = AIController()
    
    # 测试配置（使用无效的 API Key，应该降级到静态列表）
    test_config = {
        "api_key": "sk-test-invalid-key-for-testing",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 2048
    }
    
    print("\n1. 测试使用无效 API Key（应该降级到静态列表）")
    print("-" * 80)
    result = controller.ai_get_available_models("openai", test_config)
    
    print(f"成功: {result.get('success')}")
    print(f"模型数量: {len(result.get('models', []))}")
    print(f"来自缓存: {result.get('from_cache', False)}")
    print(f"降级模式: {result.get('fallback', False)}")
    
    if result.get('models'):
        print(f"前 5 个模型: {result['models'][:5]}")
    
    if result.get('error_message'):
        print(f"错误信息: {result['error_message']}")
    
    print("\n2. 测试缓存机制（再次请求相同配置）")
    print("-" * 80)
    result2 = controller.ai_get_available_models("openai", test_config)
    
    print(f"成功: {result2.get('success')}")
    print(f"模型数量: {len(result2.get('models', []))}")
    print(f"来自缓存: {result2.get('from_cache', False)}")
    
    print("\n3. 测试不同的服务商（XFlow）")
    print("-" * 80)
    xflow_config = {
        "api_key": "sk-test-xflow-key",
        "base_url": "https://api.xflow.com/v1",
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 2048
    }
    
    result3 = controller.ai_get_available_models("xflow", xflow_config)
    
    print(f"成功: {result3.get('success')}")
    print(f"模型数量: {len(result3.get('models', []))}")
    print(f"来自缓存: {result3.get('from_cache', False)}")
    
    print("\n" + "=" * 80)
    print("测试完成！")
    print("=" * 80)


if __name__ == "__main__":
    test_ai_get_available_models()
