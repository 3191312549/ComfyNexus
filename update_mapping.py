import urllib.request
import re
import json
import os

# PyTorch Wiki 版本的 Raw Markdown 地址
WIKI_URL = "https://raw.githubusercontent.com/wiki/pytorch/pytorch/PyTorch-Versions.md"
OUTPUT_FILE = "pytorch_mapping.json"

def fetch_and_parse_wiki():
    print(f"Fetching data from {WIKI_URL}...")
    req = urllib.request.Request(WIKI_URL)
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')

    lines = content.split('\n')
    mapping = {}
    in_table = False
    headers = []

    for line in lines:
        line = line.strip()
        # 判断是否是 Markdown 表格行
        if not line.startswith('|') or not line.endswith('|'):
            in_table = False
            continue
            
        # 提取单元格并清理空白
        cells = [cell.strip() for cell in line.split('|')[1:-1]]
        
        # 定位目标表格（必须包含这些关键字）
        line_lower = line.lower()
        if 'pytorch' in line_lower and 'torchvision' in line_lower and 'torchaudio' in line_lower:
            in_table = True
            headers = [c.lower() for c in cells]
            continue
            
        # 跳过 Markdown 表格的分隔符行 (如 |---|---|)
        if in_table and '---' in line:
            continue
            
        if in_table and headers:
            try:
                # 动态获取列索引，防止官方调整表格列顺序
                torch_idx = next(i for i, h in enumerate(headers) if 'pytorch' in h)
                vision_idx = next(i for i, h in enumerate(headers) if 'torchvision' in h)
                audio_idx = next(i for i, h in enumerate(headers) if 'torchaudio' in h)
                
                torch_v = cells[torch_idx]
                vision_v = cells[vision_idx]
                audio_v = cells[audio_idx]
                
                # 清理 Markdown 链接语法，例如将 "[2.2.0](link)" 转换为 "2.2.0"
                torch_v = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', torch_v)
                vision_v = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', vision_v)
                audio_v = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', audio_v)
                
                # 排除非版本号的内容（如 master 分支或空字符串）
                if torch_v and torch_v != "master" and not torch_v.startswith("Nightly"):
                    mapping[torch_v] = {
                        "torchvision": vision_v,
                        "torchaudio": audio_v
                    }
            except (ValueError, StopIteration, IndexError):
                # 如果某一行解析失败，跳过该行
                pass

    return mapping

if __name__ == "__main__":
    version_mapping = fetch_and_parse_wiki()
    
    if not version_mapping:
        print("Error: Could not parse any version mapping from the Wiki.")
        exit(1)
        
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(version_mapping, f, indent=4, sort_keys=True)
        
    print(f"Successfully generated {OUTPUT_FILE} with {len(version_mapping)} PyTorch versions.")
