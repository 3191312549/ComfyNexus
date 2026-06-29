"""
测试依赖获取优化

测试从 GitHub 直接获取 requirements.txt 的性能
"""

import time
from pathlib import Path
import sys
import os

# 添加项目路径
backend_dir = Path(__file__).parent
project_root = backend_dir.parent
sys.path.insert(0, str(project_root))

# 设置环境变量
os.chdir(project_root)

from backend.src.core.marketplace.marketplace_controller import MarketplaceController


def test_fetch_requirements():
    """测试获取 requirements.txt"""
    
    # 创建一个模拟的环境管理器
    class MockEnvManager:
        def get_current_environment(self):
            class MockEnv:
                class MockConfig:
                    class MockGeneral:
                        python_path = r"G:\ComfyUI_windows_portable\python_embeded"
                    general = MockGeneral()
                config = MockConfig()
            return MockEnv()
    
    # 创建控制器
    controller = MarketplaceController(MockEnvManager())
    
    # 测试插件列表
    test_plugins = [
        "https://github.com/kijai/ComfyUI-KJNodes",
        "https://github.com/ltdrdata/ComfyUI-Manager",
        "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite",
    ]
    
    print("=" * 80)
    print("测试依赖获取优化")
    print("=" * 80)
    
    for github_url in test_plugins:
        print(f"\n测试插件: {github_url}")
        print("-" * 80)
        
        # 测试 HTTP 方式
        start_time = time.time()
        content = controller._fetch_requirements_from_github(github_url)
        http_time = time.time() - start_time
        
        if content:
            lines = content.strip().split('\n')
            deps_count = len([l for l in lines if l.strip() and not l.strip().startswith('#')])
            print(f"✅ HTTP 方式成功")
            print(f"   耗时: {http_time:.3f} 秒")
            print(f"   依赖数量: {deps_count} 个")
            print(f"   文件大小: {len(content)} 字节")
        else:
            print(f"❌ HTTP 方式失败")
            print(f"   耗时: {http_time:.3f} 秒")
    
    print("\n" + "=" * 80)
    print("测试完成")
    print("=" * 80)


def test_check_dependencies_performance():
    """测试完整的依赖检查性能"""
    
    # 创建一个模拟的环境管理器
    class MockEnvManager:
        def get_current_environment(self):
            class MockEnv:
                class MockConfig:
                    class MockGeneral:
                        python_path = r"G:\ComfyUI_windows_portable\python_embeded"
                    general = MockGeneral()
                config = MockConfig()
            return MockEnv()
    
    # 创建控制器
    controller = MarketplaceController(MockEnvManager())
    
    # 测试插件
    github_url = "https://github.com/kijai/ComfyUI-KJNodes"
    
    print("\n" + "=" * 80)
    print("测试完整的依赖检查流程")
    print("=" * 80)
    print(f"插件: {github_url}")
    print("-" * 80)
    
    start_time = time.time()
    result = controller.check_dependencies(github_url)
    total_time = time.time() - start_time
    
    print(f"\n结果:")
    print(f"  成功: {result.get('success')}")
    print(f"  总耗时: {total_time:.3f} 秒")
    print(f"  版本冲突: {len(result.get('conflicts', []))} 个")
    print(f"  缺失依赖: {len(result.get('missing', []))} 个")
    
    if result.get('conflicts'):
        print(f"\n版本冲突:")
        for conflict in result['conflicts']:
            print(f"  - {conflict['package']}: 要求 {conflict['required_version']}, 已安装 {conflict['installed_version']}")
    
    if result.get('missing'):
        print(f"\n缺失依赖:")
        for miss in result['missing']:
            print(f"  - {miss['package']}")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    # 测试 HTTP 获取
    test_fetch_requirements()
    
    # 测试完整流程
    test_check_dependencies_performance()
