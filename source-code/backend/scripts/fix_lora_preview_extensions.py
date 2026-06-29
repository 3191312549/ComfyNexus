"""
LoRA 预览文件修复脚本

用于修复被错误保存为图片扩展名的视频预览文件
"""

import os
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.src.utils.paths import get_project_root
from backend.src.core.lora import LoraScanner


def fix_preview_extensions():
    print("=" * 60)
    print("LoRA 预览文件修复")
    print("=" * 60)
    
    scanner = LoraScanner()
    
    if not scanner.preview_dir.exists():
        print("[!] 预览目录不存在")
        return
    
    print(f"\n预览目录: {scanner.preview_dir}")
    
    fixed_count = 0
    error_count = 0
    
    print("\n扫描预览文件...")
    
    for preview_dir in scanner.preview_dir.iterdir():
        if not preview_dir.is_dir():
            continue
        
        for f in preview_dir.iterdir():
            if not f.is_file():
                continue
            
            ext = f.suffix.lower()
            
            try:
                with open(f, 'rb') as file:
                    header = file.read(32)
                
                new_ext = None
                
                if len(header) >= 8:
                    if header[4:8] == b'ftyp':
                        new_ext = '.mp4'
                    elif header[:4] == b'\x1a\x45\xdf\xa3':
                        new_ext = '.webm'
                    elif header[:4] == b'RIFF' and len(header) >= 12:
                        if header[8:12] == b'WEBP':
                            new_ext = '.webp'
                        elif header[8:12] == b'AVI ':
                            new_ext = '.avi'
                    elif header[:4] == b'\x89PNG':
                        new_ext = '.png'
                    elif header[:2] == b'\xff\xd8':
                        new_ext = '.jpg'
                    elif header[:6] in [b'GIF87a', b'GIF89a']:
                        new_ext = '.gif'
                
                if new_ext and new_ext != ext:
                    new_name = f.stem + new_ext
                    new_path = f.parent / new_name
                    
                    print(f"\n[修复] {f.name}")
                    print(f"       原扩展名: {ext}")
                    print(f"       新扩展名: {new_ext}")
                    print(f"       文件头: {header[:16].hex()}")
                    
                    f.rename(new_path)
                    fixed_count += 1
                    print(f"       [OK] 已重命名为: {new_name}")
                    
            except Exception as e:
                print(f"\n[错误] 处理文件失败: {f.name}")
                print(f"       错误: {str(e)}")
                error_count += 1
    
    print("\n" + "=" * 60)
    print(f"修复完成")
    print(f"  修复文件数: {fixed_count}")
    print(f"  错误数: {error_count}")
    print("=" * 60)


if __name__ == "__main__":
    fix_preview_extensions()
