"""
测试设置保存功能
"""

import sys
import json
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.src.core.settings_manager import SettingsManager
from backend.src.utils.logger import app_logger as logger

def test_settings_save():
    """测试设置保存功能"""
    
    print("=" * 60)
    print("测试设置保存功能")
    print("=" * 60)
    
    # 创建 SettingsManager 实例
    manager = SettingsManager()
    
    # 1. 读取当前设置
    print("\n1. 读取当前设置...")
    result = manager.get_settings()
    if result["success"]:
        print(f"✅ 读取成功")
        current_value = result["settings"].get("pluginManagement", {}).get("hideDisabledPlugins", False)
        print(f"   当前 hideDisabledPlugins 值: {current_value}")
    else:
        print(f"❌ 读取失败: {result['message']}")
        return
    
    # 2. 更新设置
    print("\n2. 更新设置...")
    new_value = not current_value
    print(f"   将 hideDisabledPlugins 设置为: {new_value}")
    
    update_result = manager.update_settings({
        "pluginManagement": {
            "hideDisabledPlugins": new_value
        }
    })
    
    if update_result["success"]:
        print(f"✅ 更新成功: {update_result['message']}")
    else:
        print(f"❌ 更新失败: {update_result['message']}")
        return
    
    # 3. 验证配置文件
    print("\n3. 验证配置文件...")
    config_file = get_settings_file()
    
    if not config_file.exists():
        print(f"❌ 配置文件不存在: {config_file}")
        return
    
    with open(config_file, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    saved_value = config.get("pluginManagement", {}).get("hideDisabledPlugins", False)
    print(f"   配置文件中的值: {saved_value}")
    
    if saved_value == new_value:
        print(f"✅ 配置文件已正确更新")
    else:
        print(f"❌ 配置文件未更新，期望: {new_value}，实际: {saved_value}")
    
    # 4. 重新读取设置
    print("\n4. 重新读取设置...")
    reload_result = manager.get_settings()
    if reload_result["success"]:
        reloaded_value = reload_result["settings"].get("pluginManagement", {}).get("hideDisabledPlugins", False)
        print(f"   重新读取的值: {reloaded_value}")
        
        if reloaded_value == new_value:
            print(f"✅ 重新读取成功")
        else:
            print(f"❌ 重新读取的值不正确，期望: {new_value}，实际: {reloaded_value}")
    else:
        print(f"❌ 重新读取失败: {reload_result['message']}")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    test_settings_save()
