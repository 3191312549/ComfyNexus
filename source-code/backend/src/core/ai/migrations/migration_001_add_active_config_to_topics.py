"""
数据库迁移脚本：为 topics 表添加 active_config_id 字段

迁移版本：001
创建时间：2026-02-11
功能：支持对话级别的模型配置选择

变更内容：
1. 为 topics 表添加 active_config_id 字段（TEXT 类型，可为 NULL）
2. 添加索引以优化查询性能
3. 为现有对话设置默认配置（如果存在）
"""

import sqlite3
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def get_migration_version(conn: sqlite3.Connection) -> int:
    """
    获取当前数据库迁移版本
    
    Args:
        conn: 数据库连接
        
    Returns:
        int: 当前迁移版本号，如果表不存在则返回 0
    """
    cursor = conn.cursor()
    
    # 检查迁移版本表是否存在
    cursor.execute(
        """
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='schema_migrations'
        """
    )
    
    if cursor.fetchone() is None:
        # 创建迁移版本表
        cursor.execute(
            """
            CREATE TABLE schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
        return 0
    
    # 获取最新版本号
    cursor.execute("SELECT MAX(version) FROM schema_migrations")
    result = cursor.fetchone()
    return result[0] if result[0] is not None else 0


def record_migration(conn: sqlite3.Connection, version: int) -> None:
    """
    记录迁移版本
    
    Args:
        conn: 数据库连接
        version: 迁移版本号
    """
    from datetime import datetime
    
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        (version, datetime.now().isoformat())
    )
    conn.commit()


def check_column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    """
    检查表中是否存在指定列
    
    Args:
        conn: 数据库连接
        table: 表名
        column: 列名
        
    Returns:
        bool: 列是否存在
    """
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def migrate_up(conn: sqlite3.Connection) -> bool:
    """
    执行迁移：添加 active_config_id 字段
    
    Args:
        conn: 数据库连接
        
    Returns:
        bool: 迁移是否成功
    """
    try:
        cursor = conn.cursor()
        
        # 检查字段是否已存在
        if check_column_exists(conn, 'topics', 'active_config_id'):
            logger.info("active_config_id 字段已存在，跳过迁移")
            return True
        
        logger.info("开始迁移：为 topics 表添加 active_config_id 字段")
        
        # 1. 添加 active_config_id 字段
        cursor.execute(
            """
            ALTER TABLE topics 
            ADD COLUMN active_config_id TEXT
            """
        )
        logger.info("✓ 添加 active_config_id 字段成功")
        
        # 2. 创建索引以优化查询性能
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_topics_active_config_id 
            ON topics(active_config_id)
            """
        )
        logger.info("✓ 创建索引成功")
        
        # 3. 为现有对话设置默认配置（如果存在）
        # 查找当前的默认配置
        cursor.execute(
            """
            SELECT id FROM api_configs 
            WHERE is_default = 1 
            LIMIT 1
            """
        )
        default_config = cursor.fetchone()
        
        if default_config:
            default_config_id = default_config[0]
            cursor.execute(
                """
                UPDATE topics 
                SET active_config_id = ?
                WHERE active_config_id IS NULL
                """,
                (default_config_id,)
            )
            updated_count = cursor.rowcount
            logger.info(f"✓ 为 {updated_count} 个现有对话设置默认配置: {default_config_id}")
        else:
            logger.info("✓ 未找到默认配置，现有对话的 active_config_id 保持为 NULL")
        
        conn.commit()
        logger.info("迁移完成：topics 表已成功添加 active_config_id 字段")
        return True
        
    except Exception as e:
        logger.error(f"迁移失败: {e}", exc_info=True)
        conn.rollback()
        return False


def migrate_down(conn: sqlite3.Connection) -> bool:
    """
    回滚迁移：移除 active_config_id 字段
    
    注意：SQLite 不支持直接删除列，需要重建表
    
    Args:
        conn: 数据库连接
        
    Returns:
        bool: 回滚是否成功
    """
    try:
        cursor = conn.cursor()
        
        logger.info("开始回滚：移除 topics 表的 active_config_id 字段")
        
        # SQLite 不支持 ALTER TABLE DROP COLUMN，需要重建表
        # 1. 创建临时表（不包含 active_config_id）
        cursor.execute(
            """
            CREATE TABLE topics_backup (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        
        # 2. 复制数据到临时表
        cursor.execute(
            """
            INSERT INTO topics_backup (id, name, created_at, updated_at)
            SELECT id, name, created_at, updated_at
            FROM topics
            """
        )
        
        # 3. 删除原表
        cursor.execute("DROP TABLE topics")
        
        # 4. 重命名临时表
        cursor.execute("ALTER TABLE topics_backup RENAME TO topics")
        
        # 5. 删除索引（如果存在）
        cursor.execute("DROP INDEX IF EXISTS idx_topics_active_config_id")
        
        conn.commit()
        logger.info("回滚完成：已移除 active_config_id 字段")
        return True
        
    except Exception as e:
        logger.error(f"回滚失败: {e}", exc_info=True)
        conn.rollback()
        return False


def run_migration(db_path: Path) -> bool:
    """
    运行迁移脚本
    
    Args:
        db_path: 数据库文件路径
        
    Returns:
        bool: 迁移是否成功
    """
    MIGRATION_VERSION = 1
    
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        
        # 获取当前版本
        current_version = get_migration_version(conn)
        
        if current_version >= MIGRATION_VERSION:
            logger.info(f"数据库已是最新版本 (v{current_version})，无需迁移")
            conn.close()
            return True
        
        # 执行迁移
        logger.info(f"当前数据库版本: v{current_version}")
        logger.info(f"目标版本: v{MIGRATION_VERSION}")
        
        success = migrate_up(conn)
        
        if success:
            # 记录迁移版本
            record_migration(conn, MIGRATION_VERSION)
            logger.info(f"数据库已升级到版本 v{MIGRATION_VERSION}")
        
        conn.close()
        return success
        
    except Exception as e:
        logger.error(f"迁移过程中发生错误: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    # 用于测试的独立运行
    import sys
    from backend.src.utils.paths import get_data_dir
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    db_path = get_data_dir() / "ai_assistant.db"
    
    if not db_path.exists():
        logger.error(f"数据库文件不存在: {db_path}")
        sys.exit(1)
    
    success = run_migration(db_path)
    sys.exit(0 if success else 1)
