# -*- coding: utf-8 -*-
"""
PyInstaller hook for opencv-python-headless (cv2)
排除不需要的 haarcascade 人脸检测模型文件

原始大小: ~8 MB (haarcascade 文件)
优化后: 0 MB (完全排除)
"""

from PyInstaller.utils.hooks import collect_data_files

# 收集所有数据文件
all_datas = collect_data_files('cv2')

# 过滤：排除 haarcascade 文件
datas = []
for source, dest in all_datas:
    source_lower = source.lower()
    
    # 排除 haarcascade XML 文件（人脸检测模型，代码中未使用）
    if 'haarcascade' in source_lower:
        continue
    
    datas.append((source, dest))

print(f"[hook-cv2] 原始文件数: {len(all_datas)}, 过滤后: {len(datas)}")
