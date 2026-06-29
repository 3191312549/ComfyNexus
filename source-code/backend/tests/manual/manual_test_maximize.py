"""
手动测试窗口最大化功能

运行此脚本可以手动测试窗口最大化功能是否正常工作。
"""

import webview
import time
from backend.src.bridge.api import Api


def test_maximize_functionality():
    """测试最大化功能"""
    
    print("=" * 60)
    print("🧪 窗口最大化功能测试")
    print("=" * 60)
    
    # 创建 API 实例
    api = Api()
    
    # 创建测试窗口
    window = webview.create_window(
        title='最大化功能测试',
        html='<h1>窗口最大化功能测试</h1><p>请观察窗口行为：</p><ul><li>窗口应该最大化但保留任务栏</li><li>可以正常访问系统托盘</li></ul>',
        width=800,
        height=600,
        resizable=True,
        frameless=False
    )
    
    # 设置窗口引用
    api.set_window(window)
    
    def test_sequence():
        """测试序列"""
        time.sleep(2)
        
        print("\n📋 测试步骤：")
        print("1. 初始状态检查...")
        print(f"   - 是否最大化: {api.isMaximized()}")
        
        time.sleep(2)
        print("\n2. 执行最大化...")
        api.maximizeApp()
        time.sleep(1)
        print(f"   - 是否最大化: {api.isMaximized()}")
        print("   ✅ 请检查：窗口是否最大化但保留了任务栏？")
        
        time.sleep(3)
        print("\n3. 执行还原...")
        api.maximizeApp()
        time.sleep(1)
        print(f"   - 是否最大化: {api.isMaximized()}")
        print("   ✅ 请检查：窗口是否还原到原始大小？")
        
        time.sleep(2)
        print("\n4. 再次最大化...")
        api.maximizeApp()
        time.sleep(1)
        print(f"   - 是否最大化: {api.isMaximized()}")
        
        time.sleep(2)
        print("\n" + "=" * 60)
        print("✅ 测试完成！")
        print("=" * 60)
        print("\n验收标准：")
        print("  [√] 窗口最大化时保留了任务栏")
        print("  [√] 可以正常访问系统托盘")
        print("  [√] 窗口可以正常还原")
        print("  [√] 状态跟踪正确")
        print("\n按任意键关闭窗口...")
    
    # 启动测试序列
    import threading
    thread = threading.Thread(target=test_sequence, daemon=True)
    thread.start()
    
    # 启动窗口
    webview.start()


if __name__ == '__main__':
    test_maximize_functionality()
