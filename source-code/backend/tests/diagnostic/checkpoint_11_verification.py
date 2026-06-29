"""
检查点 11：当前环境持久化功能验证

手动验证脚本，用于测试：
1. 环境切换功能
2. 重启应用后当前环境的恢复
3. 配置文件中 current_environment_id 的正确性
"""

import sys
import subprocess
from pathlib import Path


def print_section(title: str):
    """打印分隔线"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def run_tests(test_file: str, description: str) -> bool:
    """运行测试文件"""
    print(f"运行测试: {description}")
    print(f"文件: {test_file}\n")
    
    result = subprocess.run(
        [".venv/Scripts/python", "-m", "pytest", test_file, "-v"],
        capture_output=True,
        text=True
    )
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    if result.returncode == 0:
        print(f"✓ {description} - 所有测试通过")
        return True
    else:
        print(f"❌ {description} - 测试失败")
        return False


def verify_current_env_persistence():
    """验证当前环境持久化功能"""
    
    print_section("检查点 11：当前环境持久化功能验证")
    
    all_passed = True
    
    # 测试 1：当前环境 ID 持久化单元测试
    print_section("测试 1：当前环境 ID 持久化单元测试")
    if not run_tests(
        "backend/tests/test_current_env_persistence.py",
        "当前环境 ID 持久化单元测试"
    ):
        all_passed = False
    
    # 测试 2：当前环境 ID 持久化属性测试
    print_section("测试 2：当前环境 ID 持久化属性测试")
    if not run_tests(
        "backend/tests/test_current_env_persistence_properties.py",
        "当前环境 ID 持久化属性测试"
    ):
        all_passed = False
    
    # 测试 3：环境配置加载属性测试
    print_section("测试 3：环境配置加载属性测试")
    if not run_tests(
        "backend/tests/test_env_config_loading_properties.py",
        "环境配置加载属性测试"
    ):
        all_passed = False
    
    # 总结
    print_section("验证总结")
    
    if all_passed:
        print("✅ 所有测试通过！\n")
        print("当前环境持久化功能验证成功：")
        print("  ✓ 环境切换功能正常")
        print("  ✓ 配置文件正确保存 current_environment_id")
        print("  ✓ 应用重启后正确恢复当前环境")
        print("  ✓ 环境列表中 is_active 标记正确")
        print("  ✓ 环境配置加载功能正常")
        print("  ✓ 属性测试验证了多种随机场景")
        print("\n功能验证完成，可以继续下一个任务。")
        return True
    else:
        print("❌ 部分测试失败\n")
        print("请检查失败的测试并修复问题。")
        return False


if __name__ == "__main__":
    success = verify_current_env_persistence()
    sys.exit(0 if success else 1)
