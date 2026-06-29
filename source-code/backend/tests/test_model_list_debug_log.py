"""
测试获取模型列表的 Debug 日志

验证在获取模型列表时，后台会输出完整的请求地址。
"""

import sys
import logging
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

# 配置日志级别为 DEBUG，以便看到 Debug 日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

from backend.src.bridge.controllers.ai_controller import AIController


def test_get_models_debug_log():
    """测试获取模型列表的 Debug 日志"""
    print("=" * 60)
    print("测试获取模型列表的 Debug 日志")
    print("=" * 60)
    
    # 创建 AI Controller 实例
    controller = AIController()
    
    # 测试配置（使用无效的 API Key，只是为了测试日志输出）
    test_config = {
        "api_key": "sk-test-key-for-debug-log",
        "base_url": "https://iflow.1861233365.workers.dev/v1"
    }
    
    print("\n📝 测试配置:")
    print(f"  Provider: openai")
    print(f"  Base URL: {test_config['base_url']}")
    print(f"  API Key: {test_config['api_key'][:20]}...")
    
    print("\n🔍 开始获取模型列表（观察 Debug 日志）...")
    print("-" * 60)
    
    # 调用获取模型列表方法
    result = controller.ai_get_available_models("openai", test_config)
    
    print("-" * 60)
    print("\n📊 结果:")
    print(f"  Success: {result.get('success')}")
    print(f"  From Cache: {result.get('from_cache')}")
    print(f"  Models Count: {len(result.get('models', []))}")
    
    if result.get('error_message'):
        print(f"  Error: {result.get('error_message')}")
    
    print("\n" + "=" * 60)
    print("✅ 测试完成！")
    print("=" * 60)
    print("\n💡 提示：")
    print("  - 查看上面的日志输出，应该能看到 [获取模型列表] 的 Debug 日志")
    print("  - Debug 日志会显示完整的请求地址")
    print("  - 格式：[获取模型列表] 请求地址: https://xxx/v1/models")


if __name__ == "__main__":
    test_get_models_debug_log()
