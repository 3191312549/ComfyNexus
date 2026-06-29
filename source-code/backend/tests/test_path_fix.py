"""
测试路径修复

验证 AI 助手模块的数据库和缓存文件路径是否正确。
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.src.utils.paths import (
    get_project_root,
    get_data_dir,
    get_cache_dir,
    PROJECT_ROOT,
    DATA_DIR,
    CACHE_DIR
)
from backend.src.core.ai.database import DB_PATH
from backend.src.core.ai.model_list_cache import ModelListCache


def test_path_utils():
    """测试路径工具"""
    print("=" * 60)
    print("路径工具测试")
    print("=" * 60)
    
    print(f"项目根目录: {get_project_root()}")
    print(f"  - 是否存在: {get_project_root().exists()}")
    print(f"  - 是否为绝对路径: {get_project_root().is_absolute()}")
    
    print(f"\n数据目录: {get_data_dir()}")
    print(f"  - 是否存在: {get_data_dir().exists()}")
    print(f"  - 是否为绝对路径: {get_data_dir().is_absolute()}")
    
    print(f"\n缓存目录: {get_cache_dir()}")
    print(f"  - 是否存在: {get_cache_dir().exists()}")
    print(f"  - 是否为绝对路径: {get_cache_dir().is_absolute()}")
    
    print(f"\nAI 助手数据目录: {get_data_dir('ai_assistant')}")
    print(f"  - 是否存在: {get_data_dir('ai_assistant').exists()}")
    
    print(f"\nAI 模型缓存目录: {get_cache_dir('ai_models')}")
    print(f"  - 是否存在: {get_cache_dir('ai_models').exists()}")


def test_database_path():
    """测试数据库路径"""
    print("\n" + "=" * 60)
    print("数据库路径测试")
    print("=" * 60)
    
    print(f"数据库文件路径: {DB_PATH}")
    print(f"  - 是否为绝对路径: {DB_PATH.is_absolute()}")
    print(f"  - 父目录是否存在: {DB_PATH.parent.exists()}")
    print(f"  - 是否在项目根目录下: {str(get_project_root()) in str(DB_PATH)}")
    
    # 检查是否包含桌面路径
    desktop_keywords = ['Desktop', '桌面', 'desktop']
    has_desktop = any(keyword in str(DB_PATH) for keyword in desktop_keywords)
    print(f"  - 是否包含桌面路径: {has_desktop}")
    
    if has_desktop:
        print("  ⚠️  警告：数据库路径包含桌面目录！")
    else:
        print("  ✓ 数据库路径正确")


def test_cache_path():
    """测试缓存路径"""
    print("\n" + "=" * 60)
    print("缓存路径测试")
    print("=" * 60)
    
    # 创建缓存实例（使用默认路径）
    cache = ModelListCache()
    
    print(f"缓存目录: {cache.cache_dir}")
    print(f"  - 是否为绝对路径: {cache.cache_dir.is_absolute()}")
    print(f"  - 是否存在: {cache.cache_dir.exists()}")
    print(f"  - 是否在项目根目录下: {str(get_project_root()) in str(cache.cache_dir)}")
    
    # 检查是否包含桌面路径
    desktop_keywords = ['Desktop', '桌面', 'desktop']
    has_desktop = any(keyword in str(cache.cache_dir) for keyword in desktop_keywords)
    print(f"  - 是否包含桌面路径: {has_desktop}")
    
    if has_desktop:
        print("  ⚠️  警告：缓存路径包含桌面目录！")
    else:
        print("  ✓ 缓存路径正确")


def test_path_consistency():
    """测试路径一致性"""
    print("\n" + "=" * 60)
    print("路径一致性测试")
    print("=" * 60)
    
    # 检查数据库路径和数据目录是否一致
    expected_db_path = get_data_dir() / "ai_assistant.db"
    print(f"预期数据库路径: {expected_db_path}")
    print(f"实际数据库路径: {DB_PATH}")
    print(f"  - 路径一致: {expected_db_path == DB_PATH}")
    
    # 检查缓存路径和缓存目录是否一致
    cache = ModelListCache()
    expected_cache_dir = get_cache_dir("ai_models")
    print(f"\n预期缓存目录: {expected_cache_dir}")
    print(f"实际缓存目录: {cache.cache_dir}")
    print(f"  - 路径一致: {expected_cache_dir == cache.cache_dir}")


def main():
    """主函数"""
    print("\n🔍 AI 助手模块路径修复验证")
    print("=" * 60)
    
    try:
        test_path_utils()
        test_database_path()
        test_cache_path()
        test_path_consistency()
        
        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
