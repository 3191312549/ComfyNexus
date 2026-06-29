"""测试数据库初始化和迁移"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.src.core.ai.database import init_database, DB_PATH
import sqlite3

print("=" * 60)
print("测试数据库初始化和迁移")
print("=" * 60)

# 删除旧数据库（如果存在）
if DB_PATH.exists():
    print(f"\n删除旧数据库: {DB_PATH}")
    DB_PATH.unlink()

# 初始化数据库
print(f"\n初始化数据库: {DB_PATH}")
init_database()

if not DB_PATH.exists():
    print(f"\n❌ 数据库文件未创建: {DB_PATH}")
    sys.exit(1)

print(f"\n✓ 数据库文件已创建: {DB_PATH}")

# 验证数据库结构
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("\n" + "=" * 60)
print("验证数据库结构")
print("=" * 60)

# 检查 messages 表的列
cursor.execute('PRAGMA table_info(messages)')
columns = cursor.fetchall()
print("\n✓ messages 表的列：")
for col in columns:
    print(f"  - {col[1]} ({col[2]})")

# 检查 files 列是否存在
has_files_column = any(col[1] == 'files' for col in columns)
if has_files_column:
    print("\n✓ files 字段已成功添加到 messages 表")
else:
    print("\n❌ files 字段不存在于 messages 表")

# 检查 message_files 表是否存在
cursor.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="message_files"')
result = cursor.fetchone()
if result:
    print("\n✓ message_files 表已成功创建")
    
    # 检查 message_files 表的列
    cursor.execute('PRAGMA table_info(message_files)')
    mf_columns = cursor.fetchall()
    print("\n  message_files 表的列：")
    for col in mf_columns:
        print(f"    - {col[1]} ({col[2]})")
else:
    print("\n❌ message_files 表不存在")

# 检查索引
cursor.execute('SELECT name FROM sqlite_master WHERE type="index" AND tbl_name="message_files"')
indexes = cursor.fetchall()
if indexes:
    print("\n✓ message_files 表的索引：")
    for idx in indexes:
        print(f"  - {idx[0]}")
else:
    print("\n⚠ message_files 表没有索引")

# 检查迁移版本
cursor.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="schema_migrations"')
if cursor.fetchone():
    cursor.execute('SELECT version, applied_at FROM schema_migrations ORDER BY version')
    migrations = cursor.fetchall()
    print("\n✓ 已应用的迁移版本：")
    for version, applied_at in migrations:
        print(f"  - v{version} (应用于: {applied_at})")
else:
    print("\n⚠ schema_migrations 表不存在")

conn.close()

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)
