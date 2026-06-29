"""
Trae CN 路径迁移工具
用于在重装系统或更换电脑后，修复工作区路径

使用方法:
1. 备份 Trae CN 数据
2. 恢复到新系统
3. 修改下面的 OLD_PATHS 和 NEW_PATHS 配置
4. 运行此脚本: python trae_path_migrator.py
"""

import sqlite3
import os
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote, unquote

# ==================== 配置区域 ====================
# 旧路径 -> 新路径 映射
# 根据你的实际情况修改

OLD_PATHS = {
    # 用户目录 (如果用户名变化)
    "C:\\Users\\AllenPC": "C:\\Users\\新用户名",
    
    # 项目目录 (如果盘符或路径变化)
    "G:\\AI-Code-test": "D:\\Projects",  # 例如：G盘变D盘
    "G:/AI-Code-test": "D:/Projects",
    
    # 其他可能变化的路径
    # "F:\\DesktopDL": "E:\\Downloads",
}

# 是否创建备份 (强烈建议开启)
CREATE_BACKUP = True

# ==================== 以下为处理逻辑 ====================

def url_encode_path(path: str) -> str:
    """将路径转换为 URL 编码格式"""
    # 处理 Windows 路径
    path = path.replace("\\", "/")
    # URL 编码
    encoded = quote(path, safe="/")
    return f"file:///{encoded}"

def create_url_mappings(old_paths: dict) -> dict:
    """创建 URL 格式的路径映射"""
    url_mappings = {}
    for old, new in old_paths.items():
        # 生成 URL 编码格式
        old_url = url_encode_path(old)
        new_url = url_encode_path(new)
        url_mappings[old_url] = new_url
        
        # 同时处理不同大小写的盘符
        if len(old) >= 2 and old[1] == ":":
            # 小写盘符版本
            old_lower = old[0].lower() + old[1:]
            old_upper = old[0].upper() + old[1:]
            url_mappings[url_encode_path(old_lower)] = url_encode_path(new)
            url_mappings[url_encode_path(old_upper)] = url_encode_path(new)
    
    return url_mappings

def replace_in_json(data, old_paths: dict, url_mappings: dict):
    """递归替换 JSON 中的路径"""
    if isinstance(data, dict):
        return {k: replace_in_json(v, old_paths, url_mappings) for k, v in data.items()}
    elif isinstance(data, list):
        return [replace_in_json(item, old_paths, url_mappings) for item in data]
    elif isinstance(data, str):
        result = data
        # 替换 URL 编码格式
        for old_url, new_url in url_mappings.items():
            result = result.replace(old_url, new_url)
        # 替换普通路径格式
        for old, new in old_paths.items():
            result = result.replace(old, new)
        return result
    else:
        return data

def process_json_file(file_path: str, old_paths: dict, url_mappings: dict, backup: bool = True):
    """处理 JSON 文件"""
    print(f"  处理: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        new_data = replace_in_json(data, old_paths, url_mappings)
        
        if data != new_data:
            if backup:
                shutil.copy2(file_path, f"{file_path}.bak")
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(new_data, f, ensure_ascii=False, indent=4)
            
            print(f"    ✓ 已更新")
            return True
        else:
            print(f"    - 无需更新")
            return False
    except Exception as e:
        print(f"    ✗ 错误: {e}")
        return False

def process_sqlite_db(db_path: str, old_paths: dict, url_mappings: dict, backup: bool = True):
    """处理 SQLite 数据库"""
    print(f"  处理数据库: {db_path}")
    
    try:
        if backup:
            shutil.copy2(db_path, f"{db_path}.bak")
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT key, value FROM ItemTable")
        rows = cursor.fetchall()
        
        updated = 0
        for key, value in rows:
            if value is None:
                continue
            
            new_value = value
            # 替换 URL 编码格式
            for old_url, new_url in url_mappings.items():
                new_value = new_value.replace(old_url, new_url)
            # 替换普通路径格式
            for old, new in old_paths.items():
                new_value = new_value.replace(old, new)
            
            if new_value != value:
                cursor.execute("UPDATE ItemTable SET value = ? WHERE key = ?", (new_value, key))
                updated += 1
        
        conn.commit()
        conn.close()
        
        print(f"    ✓ 更新了 {updated} 条记录")
        return True
    except Exception as e:
        print(f"    ✗ 错误: {e}")
        return False

def main():
    print("=" * 60)
    print("Trae CN 路径迁移工具")
    print("=" * 60)
    print()
    
    # 检查配置
    if not OLD_PATHS or list(OLD_PATHS.values())[0] == "C:\\Users\\新用户名":
        print("⚠ 请先修改脚本中的 OLD_PATHS 配置！")
        print()
        print("示例配置:")
        print('OLD_PATHS = {')
        print('    "C:\\\\Users\\\\AllenPC": "C:\\\\Users\\\\NewUser",')
        print('    "G:\\\\AI-Code-test": "D:\\\\Projects",')
        print('}')
        return
    
    # 获取 Trae CN 数据路径
    trae_path = os.path.expandvars(r'%APPDATA%\Trae CN')
    if not os.path.exists(trae_path):
        print(f"✗ 找不到 Trae CN 数据目录: {trae_path}")
        return
    
    print(f"Trae CN 数据目录: {trae_path}")
    print()
    
    # 创建 URL 映射
    url_mappings = create_url_mappings(OLD_PATHS)
    
    print("路径映射配置:")
    print("-" * 40)
    for old, new in OLD_PATHS.items():
        print(f"  {old}")
        print(f"    → {new}")
    print()
    
    # 确认执行
    confirm = input("确认执行路径替换？(y/n): ")
    if confirm.lower() != 'y':
        print("已取消")
        return
    
    print()
    print("开始处理...")
    print("-" * 40)
    
    # 1. 处理 storage.json
    storage_json = os.path.join(trae_path, "User", "globalStorage", "storage.json")
    if os.path.exists(storage_json):
        process_json_file(storage_json, OLD_PATHS, url_mappings, CREATE_BACKUP)
    
    # 2. 处理 state.vscdb
    state_db = os.path.join(trae_path, "User", "globalStorage", "state.vscdb")
    if os.path.exists(state_db):
        process_sqlite_db(state_db, OLD_PATHS, url_mappings, CREATE_BACKUP)
    
    # 3. 处理 workspaceStorage 目录
    ws_storage = os.path.join(trae_path, "User", "workspaceStorage")
    if os.path.exists(ws_storage):
        for folder in os.listdir(ws_storage):
            ws_json = os.path.join(ws_storage, folder, "workspace.json")
            if os.path.exists(ws_json):
                process_json_file(ws_json, OLD_PATHS, url_mappings, CREATE_BACKUP)
    
    # 4. 处理 Workspaces 目录
    workspaces_dir = os.path.join(trae_path, "Workspaces")
    if os.path.exists(workspaces_dir):
        for root, dirs, files in os.walk(workspaces_dir):
            for file in files:
                if file.endswith('.json'):
                    file_path = os.path.join(root, file)
                    process_json_file(file_path, OLD_PATHS, url_mappings, CREATE_BACKUP)
    
    # 5. 处理 state.vscdb.backup
    state_db_backup = os.path.join(trae_path, "User", "globalStorage", "state.vscdb.backup")
    if os.path.exists(state_db_backup):
        process_sqlite_db(state_db_backup, OLD_PATHS, url_mappings, CREATE_BACKUP)
    
    print()
    print("=" * 60)
    print("✓ 处理完成！")
    print()
    print("注意事项:")
    print("1. 请检查 Trae CN 是否能正常启动")
    print("2. 检查工作区和项目是否正确识别")
    print("3. 如有问题，可使用 .bak 文件恢复")
    print("=" * 60)

if __name__ == "__main__":
    main()
