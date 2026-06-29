"""
LoRA 预览视频诊断脚本

用于诊断预览视频无法显示的问题
"""

import os
import sys
import json
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.src.utils.paths import get_project_root
from backend.src.core.lora import LoraScanner


def diagnose_lora_preview():
    print("=" * 60)
    print("LoRA 预览视频诊断")
    print("=" * 60)
    
    scanner = LoraScanner()
    
    print("\n1. 检查数据目录结构...")
    print(f"   项目根目录: {scanner.project_root}")
    print(f"   数据目录: {scanner.data_dir}")
    print(f"   预览目录: {scanner.preview_dir}")
    
    if not scanner.data_dir.exists():
        print("   [!] 数据目录不存在，可能还没有扫描过模型")
        return
    
    if not scanner.preview_dir.exists():
        print("   [!] 预览目录不存在")
        return
    
    print("\n2. 检查模型数据文件...")
    if not scanner.models_file.exists():
        print("   [!] 模型数据文件不存在")
        return
    
    with open(scanner.models_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    models = data.get("models", [])
    print(f"   共有 {len(models)} 个模型")
    
    print("\n3. 查找目标模型...")
    target_model_name = "Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64"
    target_model = None
    
    for model in models:
        if target_model_name in model.get("name", ""):
            target_model = model
            break
    
    if target_model:
        print(f"   [OK] 找到目标模型:")
        print(f"       ID: {target_model.get('id')}")
        print(f"       名称: {target_model.get('name')}")
        print(f"       路径: {target_model.get('path')}")
        print(f"       Civitai URL: {target_model.get('civitai_url')}")
    else:
        print(f"   [!] 未找到模型: {target_model_name}")
        print("   可用的模型名称:")
        for model in models[:10]:
            print(f"       - {model.get('name')}")
        if len(models) > 10:
            print(f"       ... 还有 {len(models) - 10} 个模型")
    
    print("\n4. 检查预览文件目录...")
    preview_dirs = list(scanner.preview_dir.iterdir()) if scanner.preview_dir.exists() else []
    print(f"   共有 {len(preview_dirs)} 个预览目录")
    
    if target_model:
        model_id = target_model.get('id')
        model_preview_dir = scanner.preview_dir / model_id
        
        if model_preview_dir.exists():
            print(f"\n   目标模型预览目录: {model_preview_dir}")
            preview_files = list(model_preview_dir.iterdir())
            print(f"   预览文件数量: {len(preview_files)}")
            
            for f in preview_files:
                file_size = f.stat().st_size
                print(f"\n   文件: {f.name}")
                print(f"       大小: {file_size:,} bytes ({file_size / 1024:.1f} KB)")
                print(f"       扩展名: {f.suffix}")
                
                with open(f, 'rb') as file:
                    header = file.read(32)
                    print(f"       文件头 (hex): {header[:16].hex()}")
                    
                    if header[:4] == b'\x89PNG':
                        print("       [OK] 文件类型: PNG 图片")
                    elif header[:2] == b'\xff\xd8':
                        print("       [OK] 文件类型: JPEG 图片")
                    elif header[:4] == b'GIF8':
                        print("       [OK] 文件类型: GIF 图片")
                    elif header[:4] == b'RIFF':
                        print("       [?] 文件类型: RIFF (可能是 WebM 或 AVI)")
                    elif header[:3] == b'ID3' or header[:2] == b'\xff\xfb':
                        print("       [?] 文件类型: MP3 音频")
                    elif header[:4] == b'\x00\x00\x00' and header[4:8] == b'ftyp':
                        print("       [OK] 文件类型: MP4 视频")
                    elif header[:4] == b'\x1a\x45\xdf\xa3':
                        print("       [OK] 文件类型: WebM/MKV 视频")
                    else:
                        print(f"       [?] 文件类型: 未知 (可能是视频但扩展名错误)")
                        
                        if f.suffix.lower() in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
                            print("       [!] 警告: 扩展名是图片格式，但文件头不是图片！")
                            print("       [!] 这可能是视频文件被错误保存为图片扩展名")
        else:
            print(f"   [!] 目标模型预览目录不存在: {model_preview_dir}")
    
    print("\n5. 检查所有预览文件的扩展名分布...")
    extension_count = {}
    mismatch_count = 0
    
    for preview_dir in preview_dirs:
        for f in preview_dir.iterdir():
            if f.is_file():
                ext = f.suffix.lower()
                extension_count[ext] = extension_count.get(ext, 0) + 1
                
                with open(f, 'rb') as file:
                    header = file.read(16)
                    
                    is_video_header = (
                        (header[:4] == b'\x00\x00\x00' and len(header) >= 8 and header[4:8] == b'ftyp') or
                        header[:4] == b'\x1a\x45\xdf\xa3' or
                        header[:4] == b'RIFF'
                    )
                    
                    is_image_ext = ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']
                    
                    if is_video_header and is_image_ext:
                        mismatch_count += 1
                        print(f"   [!] 发现扩展名不匹配: {preview_dir.name}/{f.name}")
    
    print(f"\n   扩展名分布:")
    for ext, count in sorted(extension_count.items()):
        print(f"       {ext or '(无扩展名)'}: {count} 个文件")
    
    if mismatch_count > 0:
        print(f"\n   [!] 发现 {mismatch_count} 个文件可能是视频但使用了图片扩展名！")
    
    print("\n" + "=" * 60)
    print("诊断完成")
    print("=" * 60)


if __name__ == "__main__":
    diagnose_lora_preview()
