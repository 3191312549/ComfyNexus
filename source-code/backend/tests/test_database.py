"""
AI 助手数据库模块测试

测试数据库初始化、表创建、索引创建和外键约束。
"""

import sqlite3
import pytest
from pathlib import Path
import sys
import tempfile
import shutil

# 添加 src 目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from core.ai.database import init_database, get_db_connection, DB_PATH


@pytest.fixture
def temp_db():
    """创建临时数据库用于测试"""
    # 保存原始数据库路径
    original_db_path = DB_PATH
    
    # 创建临时目录
    temp_dir = tempfile.mkdtemp()
    temp_db_path = Path(temp_dir) / "test_ai_assistant.db"
    
    # 修改数据库路径
    import core.ai.database as db_module
    db_module.DB_PATH = temp_db_path
    
    yield temp_db_path
    
    # 清理：恢复原始路径并删除临时目录
    db_module.DB_PATH = original_db_path
    shutil.rmtree(temp_dir, ignore_errors=True)


class TestDatabaseInitialization:
    """测试数据库初始化功能"""
    
    def test_init_database_creates_tables(self, temp_db):
        """测试 init_database() 创建所有必需的表"""
        # 执行初始化
        init_database()
        
        # 验证数据库文件已创建
        assert temp_db.exists(), "数据库文件应该被创建"
        
        # 连接数据库并检查表
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        
        # 查询所有表
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        # 验证所有必需的表都已创建
        assert 'topics' in tables, "topics 表应该被创建"
        assert 'messages' in tables, "messages 表应该被创建"
        assert 'ai_settings' in tables, "ai_settings 表应该被创建"
        
        conn.close()
    
    def test_topics_table_schema(self, temp_db):
        """测试 topics 表的 schema 是否正确"""
        init_database()
        
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        
        # 获取 topics 表的列信息
        cursor.execute("PRAGMA table_info(topics)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        
        # 验证列名和类型
        assert 'id' in columns, "topics 表应该有 id 列"
        assert 'name' in columns, "topics 表应该有 name 列"
        assert 'created_at' in columns, "topics 表应该有 created_at 列"
        assert 'updated_at' in columns, "topics 表应该有 updated_at 列"
        
        assert columns['id'] == 'TEXT', "id 列应该是 TEXT 类型"
        assert columns['name'] == 'TEXT', "name 列应该是 TEXT 类型"
        assert columns['created_at'] == 'TEXT', "created_at 列应该是 TEXT 类型"
        assert columns['updated_at'] == 'TEXT', "updated_at 列应该是 TEXT 类型"
        
        conn.close()
    
    def test_messages_table_schema(self, temp_db):
        """测试 messages 表的 schema 是否正确"""
        init_database()
        
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        
        # 获取 messages 表的列信息
        cursor.execute("PRAGMA table_info(messages)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        
        # 验证列名和类型
        assert 'id' in columns, "messages 表应该有 id 列"
        assert 'topic_id' in columns, "messages 表应该有 topic_id 列"
        assert 'role' in columns, "messages 表应该有 role 列"
        assert 'content' in columns, "messages 表应该有 content 列"
        assert 'timestamp' in columns, "messages 表应该有 timestamp 列"
        assert 'model' in columns, "messages 表应该有 model 列"
        
        assert columns['id'] == 'TEXT', "id 列应该是 TEXT 类型"
        assert columns['topic_id'] == 'TEXT', "topic_id 列应该是 TEXT 类型"
        assert columns['role'] == 'TEXT', "role 列应该是 TEXT 类型"
        assert columns['content'] == 'TEXT', "content 列应该是 TEXT 类型"
        assert columns['timestamp'] == 'TEXT', "timestamp 列应该是 TEXT 类型"
        assert columns['model'] == 'TEXT', "model 列应该是 TEXT 类型"
        
        conn.close()
    
    def test_ai_settings_table_schema(self, temp_db):
        """测试 ai_settings 表的 schema 是否正确"""
        init_database()
        
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        
        # 获取 ai_settings 表的列信息
        cursor.execute("PRAGMA table_info(ai_settings)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        
        # 验证列名和类型
        assert 'key' in columns, "ai_settings 表应该有 key 列"
        assert 'value' in columns, "ai_settings 表应该有 value 列"
        assert 'updated_at' in columns, "ai_settings 表应该有 updated_at 列"
        
        assert columns['key'] == 'TEXT', "key 列应该是 TEXT 类型"
        assert columns['value'] == 'TEXT', "value 列应该是 TEXT 类型"
        assert columns['updated_at'] == 'TEXT', "updated_at 列应该是 TEXT 类型"
        
        conn.close()
    
    def test_indexes_created(self, temp_db):
        """测试索引是否正确创建"""
        init_database()
        
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        
        # 查询所有索引
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='index' 
            ORDER BY name
        """)
        indexes = [row[0] for row in cursor.fetchall()]
        
        # 验证必需的索引已创建
        assert 'idx_messages_topic_id' in indexes, "idx_messages_topic_id 索引应该被创建"
        assert 'idx_messages_timestamp' in indexes, "idx_messages_timestamp 索引应该被创建"
        
        conn.close()
    
    def test_foreign_key_constraint(self, temp_db):
        """测试外键约束是否有效"""
        init_database()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 尝试插入一条消息，但不存在对应的话题
            # 这应该失败（因为外键约束）
            with pytest.raises(sqlite3.IntegrityError):
                cursor.execute("""
                    INSERT INTO messages (id, topic_id, role, content, timestamp)
                    VALUES ('msg1', 'nonexistent_topic', 'user', 'test', '2024-01-01T00:00:00')
                """)
                conn.commit()
    
    def test_cascade_delete(self, temp_db):
        """测试级联删除是否有效"""
        init_database()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 插入一个话题
            cursor.execute("""
                INSERT INTO topics (id, name, created_at, updated_at)
                VALUES ('topic1', '测试话题', '2024-01-01T00:00:00', '2024-01-01T00:00:00')
            """)
            
            # 插入一条消息
            cursor.execute("""
                INSERT INTO messages (id, topic_id, role, content, timestamp)
                VALUES ('msg1', 'topic1', 'user', '测试消息', '2024-01-01T00:00:00')
            """)
            conn.commit()
            
            # 验证消息已插入
            cursor.execute("SELECT COUNT(*) FROM messages WHERE topic_id = 'topic1'")
            count_before = cursor.fetchone()[0]
            assert count_before == 1, "消息应该被插入"
            
            # 删除话题
            cursor.execute("DELETE FROM topics WHERE id = 'topic1'")
            conn.commit()
            
            # 验证消息也被删除（级联删除）
            cursor.execute("SELECT COUNT(*) FROM messages WHERE topic_id = 'topic1'")
            count_after = cursor.fetchone()[0]
            assert count_after == 0, "消息应该被级联删除"
    
    def test_init_database_idempotent(self, temp_db):
        """测试多次调用 init_database() 是幂等的"""
        # 第一次初始化
        init_database()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 插入测试数据
            cursor.execute("""
                INSERT INTO topics (id, name, created_at, updated_at)
                VALUES ('topic1', '测试话题', '2024-01-01T00:00:00', '2024-01-01T00:00:00')
            """)
            conn.commit()
        
        # 第二次初始化（不应该删除现有数据）
        init_database()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 验证数据仍然存在
            cursor.execute("SELECT COUNT(*) FROM topics WHERE id = 'topic1'")
            count = cursor.fetchone()[0]
            assert count == 1, "多次初始化不应该删除现有数据"


class TestDatabaseConnection:
    """测试数据库连接管理"""
    
    def test_get_db_connection_context_manager(self, temp_db):
        """测试 get_db_connection() 上下文管理器"""
        init_database()
        
        # 使用上下文管理器
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            assert len(tables) > 0, "应该能够查询数据库"
        
        # 连接应该已关闭
        # 注意：sqlite3.Connection 没有 is_closed 属性，
        # 但尝试使用已关闭的连接会抛出异常
    
    def test_row_factory_enabled(self, temp_db):
        """测试 Row 工厂是否启用（可以通过列名访问）"""
        init_database()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 插入测试数据
            cursor.execute("""
                INSERT INTO topics (id, name, created_at, updated_at)
                VALUES ('topic1', '测试话题', '2024-01-01T00:00:00', '2024-01-01T00:00:00')
            """)
            conn.commit()
            
            # 查询数据
            cursor.execute("SELECT * FROM topics WHERE id = 'topic1'")
            row = cursor.fetchone()
            
            # 验证可以通过列名访问
            assert row['id'] == 'topic1', "应该能够通过列名访问"
            assert row['name'] == '测试话题', "应该能够通过列名访问"
    
    def test_foreign_keys_enabled(self, temp_db):
        """测试外键约束是否启用"""
        init_database()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 检查外键是否启用
            cursor.execute("PRAGMA foreign_keys")
            result = cursor.fetchone()[0]
            assert result == 1, "外键约束应该被启用"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
