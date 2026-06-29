"""
数据库迁移脚本：为 messages 表添加文件支持

迁移版本：003
创建时间：2026-02-12
功能：支持消息中包含图片和文档文件

变更内容：
1. 为 messages 表添加 files 字段（TEXT 类型，存储 JSON 数组）
2. 创建 message_files 表用于优化文件查询
3. 添加相关索引以优化查询性能
"""

import sqlite3
import logging
from pathlib import Path

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


def check_table_exists(conn: sqlite3.Connection, table: str) -> bool:
    """
    检查表是否存在
    
    Args:
        conn: 数据库连接
        table: 表名
        
    Returns:
        bool: 表是否存在
    """
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
        """,
        (table,)
    )
    return cursor.fetchone() is not None


def migrate_up(conn: sqlite3.Connection) -> bool:
    """
    执行迁移：添加文件支持
    
    Args:
        conn: 数据库连接
        
    Returns:
        bool: 迁移是否成功
    """
    try:
        cursor = conn.cursor()
        
        logger.info("开始迁移：为 messages 表添加文件支持")
        
        # 1. 为 messages 表添加 files 字段
        if not check_column_exists(conn, 'messages', 'files'):
            cursor.execute(
                """
                ALTER TABLE messages 
                ADD COLUMN files TEXT
                """
            )
            logger.info("✓ 添加 files 字段成功")
        else:
            logger.info("✓ files 字段已存在，跳过")
        
        # 2. 创建 message_files 表（用于优化查询）
        if not check_table_exists(conn, 'message_files'):
            cursor.execute(
                """
                CREATE TABLE message_files (
                    id TEXT PRIMARY KEY,
                    message_id TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    mime_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    thumbnail TEXT,
                    metadata TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
                )
                """
            )
            logger.info("✓ 创建 message_files 表成功")
        else:
            logger.info("✓ message_files 表已存在，跳过")
        
        # 3. 创建索引以优化查询性能
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_message_files_message_id 
            ON message_files(message_id)
            """
        )
        logger.info("✓ 创建 message_id 索引成功")
        
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_message_files_file_type 
            ON message_files(file_type)
            """
        )
        logger.info("✓ 创建 file_type 索引成功")
        
        conn.commit()
        logger.info("迁移完成：messages 表已成功添加文件支持")
        return True
        
    except Exception as e:
        logger.error(f"迁移失败: {e}", exc_info=True)
        conn.rollback()
        return False


def migrate_down(conn: sqlite3.Connection) -> bool:
    """
    回滚迁移：移除文件支持
    
    注意：SQLite 不支持直接删除列，需要重建表
    
    Args:
        conn: 数据库连接
        
    Returns:
        bool: 回滚是否成功
    """
    try:
        cursor = conn.cursor()
        
        logger.info("开始回滚：移除文件支持")
        
        # 1. 删除 message_files 表
        cursor.execute("DROP TABLE IF EXISTS message_files")
        logger.info("✓ 删除 message_files 表成功")
        
        # 2. 删除索引
        cursor.execute("DROP INDEX IF EXISTS idx_message_files_message_id")
        cursor.execute("DROP INDEX IF EXISTS idx_message_files_file_type")
        logger.info("✓ 删除索引成功")
        
        # 3. 重建 messages 表（不包含 files 字段）
        # SQLite 不支持 ALTER TABLE DROP COLUMN，需要重建表
        cursor.execute(
            """
            CREATE TABLE messages_backup (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                model TEXT,
                FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
            )
            """
        )
        
        # 复制数据到临时表
        cursor.execute(
            """
            INSERT INTO messages_backup (id, topic_id, role, content, timestamp, model)
            SELECT id, topic_id, role, content, timestamp, model
            FROM messages
            """
        )
        
        # 删除原表
        cursor.execute("DROP TABLE messages")
        
        # 重命名临时表
        cursor.execute("ALTER TABLE messages_backup RENAME TO messages")
        
        # 重建索引
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_messages_topic_id 
            ON messages(topic_id)
            """
        )
        
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
            ON messages(timestamp)
            """
        )
        
        conn.commit()
        logger.info("回滚完成：已移除文件支持")
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
    MIGRATION_VERSION = 3
    
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
