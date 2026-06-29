"""
数据库迁移 002: 添加 use_system_proxy 列

为 api_configs 表添加 use_system_proxy 列，支持 API 配置使用系统代理。
"""

import sqlite3
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# 迁移版本号
MIGRATION_VERSION = 2


def get_current_version(conn: sqlite3.Connection) -> int:
    """
    获取当前数据库版本
    
    Args:
        conn: 数据库连接
        
    Returns:
        int: 当前版本号，如果表不存在则返回 0
    """
    cursor = conn.cursor()
    
    # 检查 schema_migrations 表是否存在
    cursor.execute(
        """
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='schema_migrations'
        """
    )
    
    if not cursor.fetchone():
        # 表不存在，创建表
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


def mark_migration_applied(conn: sqlite3.Connection, version: int) -> None:
    """
    标记迁移已应用
    
    Args:
        conn: 数据库连接
        version: 迁移版本号
    """
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        (version, datetime.now().isoformat())
    )
    conn.commit()


def run_migration(db_path: Path) -> bool:
    """
    执行迁移：添加 use_system_proxy 列
    
    Args:
        db_path: 数据库文件路径
        
    Returns:
        bool: 迁移是否成功
    """
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查当前版本
        current_version = get_current_version(conn)
        
        if current_version >= MIGRATION_VERSION:
            logger.info(f"迁移 {MIGRATION_VERSION} 已应用，跳过")
            conn.close()
            return True
        
        logger.info(f"开始执行迁移 {MIGRATION_VERSION}: 添加 use_system_proxy 列")
        
        # 检查列是否已存在
        cursor.execute("PRAGMA table_info(api_configs)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "use_system_proxy" in columns:
            logger.info("use_system_proxy 列已存在，跳过添加")
        else:
            # 添加 use_system_proxy 列
            cursor.execute("""
                ALTER TABLE api_configs 
                ADD COLUMN use_system_proxy INTEGER DEFAULT 0
            """)
            logger.info("已添加 use_system_proxy 列")
        
        # 标记迁移已应用
        mark_migration_applied(conn, MIGRATION_VERSION)
        
        conn.commit()
        conn.close()
        
        logger.info(f"迁移 {MIGRATION_VERSION} 执行成功")
        return True
        
    except Exception as e:
        logger.error(f"迁移 {MIGRATION_VERSION} 执行失败: {e}", exc_info=True)
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False
