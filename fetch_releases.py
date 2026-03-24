import os
import json
import requests
import markdown
import time

# 目标仓库，未来可以改成列表循环抓取多个仓库
REPO = "Comfy-Org/ComfyUI"
OUTPUT_FILE = "comfyui_releases.json"

# 获取 Actions 提供的 Token，避免 API 频率限制
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
HEADERS = {"Accept": "application/vnd.github.v3+json"}
if GITHUB_TOKEN:
    HEADERS["Authorization"] = f"token {GITHUB_TOKEN}"

def fetch_all_releases():
    releases_data = []
    page = 1
    
    print(f"开始抓取 {REPO} 的 Release 数据...")
    
    while True:
        url = f"https://api.github.com/repos/{REPO}/releases?per_page=100&page={page}"
        response = requests.get(url, headers=HEADERS)
        
        if response.status_code != 200:
            print(f"请求失败: HTTP {response.status_code} - {response.text}")
            break
            
        data = response.json()
        if not data: # 如果返回空列表，说明已经翻到最后一页
            break
            
        print(f"正在处理第 {page} 页，获取到 {len(data)} 条记录...")
        
        for item in data:
            # 获取 Markdown 格式的更新日志，如果没有则为空字符串
            body_md = item.get("body", "")
            
            # 核心：将 Markdown 转换为前端友好的 HTML
            # extensions 参数开启了表格、代码块高亮等常用 Markdown 语法支持
            body_html = markdown.markdown(body_md, extensions=['extra', 'codehilite'])
            
            releases_data.append({
                "tag_name": item.get("tag_name", ""),
                "name": item.get("name", ""),
                "date": item.get("published_at", ""), # 统一叫 date 方便客户端合并
                "content": body_html # 存放转换好的 HTML
            })
            
        page += 1
        time.sleep(0.5) # 稍微加个延时，对 API 友好一点
        
    return releases_data

if __name__ == "__main__":
    data = fetch_all_releases()
    
    # 写入 JSON 文件
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"抓取完成！共提取 {len(data)} 条 Release 记录，已保存至 {OUTPUT_FILE}")
