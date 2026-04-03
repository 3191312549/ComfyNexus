import urllib.request
import re
import json
import sys

URL = "https://raw.githubusercontent.com/wiki/pytorch/pytorch/PyTorch-Versions.md"
OUTPUT_FILE = "pytorch_mapping.json"

def get_mapping():
    req = urllib.request.Request(URL)
    content = urllib.request.urlopen(req).read().decode('utf-8')
    
    mapping = {}
    
    for line in content.split('\n'):
        # 只要一行里包含 3 个以上的 '|'，必定是我们要的表格行
        if line.count('|') >= 3:
            # 以 | 分割单元格，清理首尾空格
            cells = [c.strip() for c in line.split('|')]
            
            # 兼容有没有前后 '|' 边框的两种写法
            if cells and cells[0] == '': cells.pop(0)
            if cells and cells[-1] == '': cells.pop()
            
            # 确保列数足够覆盖到 torchaudio (第4列)
            if len(cells) >= 4:
                # 官方表格的固定索引：[0]是torch, [1]是vision, [3]是audio
                t_str = cells[0]
                v_str = cells[1]
                a_str = cells[3]
                
                # 暴力提取版本号（过滤掉诸如 [2.2.0](link), **, master 等干扰）
                # 只抓取类似于 2.2.0 或者 1.13.1 的纯数字加点组合
                t_match = re.search(r'(\d+\.\d+(?:\.\d+)?)', t_str)
                v_match = re.search(r'(\d+\.\d+(?:\.\d+)?)', v_str)
                a_match = re.search(r'(\d+\.\d+(?:\.\d+)?)', a_str)
                
                # 如果三个组件的版本号都能匹配到，才写入字典
                if t_match and v_match and a_match:
                    mapping[t_match.group(1)] = {
                        "torchvision": v_match.group(1),
                        "torchaudio": a_match.group(1)
                    }
    return mapping

if __name__ == "__main__":
    mapping = get_mapping()
    if not mapping:
        print("解析失败：没有从页面中抓取到任何有效的版本数据。")
        sys.exit(1)
        
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        # sort_keys=True 可以保证生成的 JSON 顺序固定，减少不必要的 git diff
        json.dump(mapping, f, indent=4, sort_keys=True)
    print(f"解析成功！生成了 {len(mapping)} 个版本映射。")
