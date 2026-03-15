import requests
import json
import time
import sys

def fetch_comfy_registry():
    base_url = "https://api.comfy.org/nodes/search"
    all_nodes = []
    page = 1
    limit = 100
    
    print("开始拉取 ComfyRegistry 数据...")
    
    while True:
        try:
            response = requests.get(f"{base_url}?page={page}&limit={limit}", timeout=30)
            # 如果状态码不是 200，直接抛出异常让 Actions 发现
            response.raise_for_status()
                
            data = response.json()
            items = data if isinstance(data, list) else data.get("data", data.get("nodes", []))
            
            if not items:
                print("所有数据拉取完毕！")
                break
                
            all_nodes.extend(items)
            print(f"成功拉取第 {page} 页，当前共获取 {len(all_nodes)} 个节点。")
            
            page += 1
            time.sleep(0.5)
            
        except Exception as e:
            print(f"脚本运行出错: {e}")
            sys.exit(1) # 关键：告诉 GitHub Actions 这里出错了，不要跑下一步
            
    return all_nodes

if __name__ == "__main__":
    nodes = fetch_comfy_registry()
    
    if not nodes:
        print("警告：未获取到任何数据，检查 API 是否变更")
        sys.exit(1)

    filename = "comfyui_api_nodes.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(nodes, f, ensure_ascii=False, indent=2)
        
    print(f"任务完成！文件已写入: {filename}")
