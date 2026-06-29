# -*- coding: utf-8 -*-
"""
PyInstaller hook for googleapiclient
排除不需要的 Google API discovery documents，只保留 customsearch

原始大小: ~90 MB (573 个 JSON 文件)
优化后: ~62 KB (只保留 customsearch.v1.json)
"""

from PyInstaller.utils.hooks import collect_data_files

# 收集所有数据文件
all_datas = collect_data_files('googleapiclient')

# 过滤：只保留 customsearch 相关的 discovery document
datas = []
for source, dest in all_datas:
    source_lower = source.lower().replace('\\', '/')
    
    # 排除 discovery_cache/documents 目录中的所有 JSON 文件
    if 'discovery_cache/documents' in source_lower:
        # 只保留 customsearch.v1.json
        if 'customsearch.v1.json' in source_lower:
            datas.append((source, dest))
        # 跳过其他所有 discovery documents
        continue
    else:
        # 保留其他所有文件
        datas.append((source, dest))

print(f"[hook-googleapiclient] 原始文件数: {len(all_datas)}, 过滤后: {len(datas)}")
