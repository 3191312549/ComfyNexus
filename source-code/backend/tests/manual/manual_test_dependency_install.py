"""
手动测试脚本：依赖安装终端显示

用于手动测试依赖安装功能是否正常工作。
运行此脚本将弹出终端窗口显示安装过程。

使用方法:
    python backend/tests/manual_test_dependency_install.py
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.src.core.plugin.dependency_manager import DependencyManager


def test_install_with_terminal():
    """测试弹出终端窗口安装依赖"""
    
    print("=" * 60)
    print("依赖安装终端显示 - 手动测试")
    print("=" * 60)
    print()
    
    # 创建依赖管理器（使用系统 Python）
    manager = DependencyManager(python_path=Path(sys.executable))
    
    print(f"使用 Python 路径: {sys.executable}")
    print()
    
    # 测试安装一个小型包（用于测试）
    test_package = "requests"
    test_version = ""  # 不指定版本
    
    print(f"准备安装测试包: {test_package}")
    print("即将弹出终端窗口显示安装过程...")
    print()
    
    input("按 Enter 键开始安装...")
    
    # 执行安装
    result = manager.install_dependency(test_package, test_version)
    
    print()
    print("=" * 60)
    print("安装结果:")
    print("=" * 60)
    print(f"包名: {result.package}")
    print(f"成功: {result.success}")
    print(f"消息: {result.message}")
    if result.error:
        print(f"错误: {result.error}")
    print()
    
    # 验证安装状态
    print("验证安装状态...")
    installed, version = manager.check_dependency_installed(test_package)
    print(f"已安装: {installed}")
    print(f"版本: {version}")
    print()
    
    print("=" * 60)
    print("测试完成")
    print("=" * 60)


if __name__ == "__main__":
    test_install_with_terminal()
