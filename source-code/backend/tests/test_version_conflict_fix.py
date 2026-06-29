"""
测试版本冲突检测修复

验证修复后不再出现 "Invalid specifier" 错误
"""

import sys
from pathlib import Path

# 添加 backend 到 Python 路径
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from src.core.dependency.conflict_detector import ConflictDetector
from src.core.dependency.models import DependencyNode


def test_version_conflict_detection():
    """测试版本冲突检测（模拟真实场景）"""
    
    print("=" * 80)
    print("测试版本冲突检测修复")
    print("=" * 80)
    
    # 创建模拟的依赖树（模拟用户环境中的实际情况）
    tree = [
        # 根级别包（没有 required_version）
        DependencyNode(
            id='accelerate-0.32.1',
            package_name='accelerate',
            installed_version='0.32.1',
            required_version=None,  # 根级别包没有版本要求
            depth=0,
            parent_id=None
        ),
        # 有版本要求的子依赖
        DependencyNode(
            id='numpy-2.4.2',
            package_name='numpy',
            installed_version='2.4.2',
            required_version='>=1.17,<2.0.0',  # 版本冲突
            depth=1,
            parent_id='accelerate-0.32.1'
        ),
        # 未安装的包
        DependencyNode(
            id='torch-?',
            package_name='torch',
            installed_version='?',
            required_version='>=1.10.0',
            depth=1,
            parent_id='accelerate-0.32.1'
        ),
        # 特殊版本标记
        DependencyNode(
            id='filelock-Any',
            package_name='filelock',
            installed_version='3.0.0',
            required_version='Any',
            depth=1,
            parent_id='accelerate-0.32.1'
        ),
    ]
    
    # 添加子依赖到父节点
    tree[0].dependencies = [tree[1], tree[2], tree[3]]
    
    # 创建冲突检测器
    detector = ConflictDetector()
    
    print("\n1. 测试 detect_conflicts() 方法")
    print("-" * 80)
    
    try:
        conflicts = detector.detect_conflicts([tree[0]])
        print(f"✓ 成功检测冲突，未出现异常")
        print(f"  检测到 {len(conflicts)} 个冲突")
        
        for i, conflict in enumerate(conflicts, 1):
            print(f"\n  冲突 #{i}:")
            print(f"    包名: {conflict.package_name}")
            print(f"    类型: {conflict.type}")
            print(f"    已安装: {conflict.installed_version}")
            print(f"    要求: {conflict.required_version}")
            print(f"    来源: {conflict.source}")
            print(f"    描述: {conflict.description}")
    
    except Exception as e:
        print(f"✗ 检测失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # 测试 pipdeptree 警告解析
    print("\n2. 测试 parse_pipdeptree_warnings() 方法")
    print("-" * 80)
    
    warnings = """Warning!!! Possibly conflicting dependencies found:
* accelerate==0.32.1
  - numpy [required: >=1.17,<2.0.0, installed: 2.4.2]
  - torch [required: >=1.10.0, installed: ?]
* aiohttp==3.13.3
  - charset-normalizer [required: >=2.0,<4.0, installed: 3.4.2]
"""
    
    try:
        warning_conflicts = detector.parse_pipdeptree_warnings(warnings)
        print(f"✓ 成功解析警告信息")
        print(f"  解析出 {len(warning_conflicts)} 个冲突")
        
        for i, conflict in enumerate(warning_conflicts, 1):
            print(f"\n  冲突 #{i}:")
            print(f"    包名: {conflict.package_name}")
            print(f"    类型: {conflict.type}")
            print(f"    已安装: {conflict.installed_version}")
            print(f"    要求: {conflict.required_version}")
            print(f"    来源: {conflict.source}")
    
    except Exception as e:
        print(f"✗ 解析失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 80)
    print("✓ 所有测试通过！")
    print("=" * 80)
    return True


if __name__ == '__main__':
    success = test_version_conflict_detection()
    sys.exit(0 if success else 1)
