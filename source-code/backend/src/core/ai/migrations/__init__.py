"""
数据库迁移模块

管理数据库 schema 的版本和迁移。
"""

from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def run_all_migrations(db_path: Path) -> bool:
    """
    运行所有待执行的迁移脚本
    
    Args:
        db_path: 数据库文件路径
        
    Returns:
        bool: 所有迁移是否成功
    """
    try:
        # 导入迁移脚本
        from . import migration_001_add_active_config_to_topics as migration_001
        from . import migration_002_add_use_system_proxy as migration_002
        from . import migration_003_add_files_support as migration_003
        
        # 按顺序执行迁移
        migrations = [
            migration_001,
            migration_002,
            migration_003,
        ]
        
        for migration in migrations:
            logger.info(f"执行迁移: {migration.__name__}")
            success = migration.run_migration(db_path)
            if not success:
                logger.error(f"迁移失败: {migration.__name__}")
                return False
        
        logger.info("所有迁移执行成功")
        return True
        
    except Exception as e:
        logger.error(f"迁移过程中发生错误: {e}", exc_info=True)
        return False


__all__ = ['run_all_migrations']
