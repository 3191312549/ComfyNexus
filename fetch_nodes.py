import requests
import json
import time

def fetch_comfy_registry():
    base_url = "https://api.comfy.org/nodes/search"
    all_nodes = []
    page = 1
    limit = 100
    
    print("开始拉取 ComfyRegistry 数据...")
    
    while True:
        try:
            # 请求带分页的 API
            response = requests.get(f"{base_url}?page={page}&limit={limit}")
            if response.status_code != 200:
                print(f"请求失败，状态码: {response.status_code}")
                break
                
            data = response.json()
            
            # 兼容 API 返回的直接列表或嵌套字典结构
            items = data if isinstance(data, list) else data.get("data", data.get("nodes", []))
            
            if not items:
                print("所有数据拉取完毕！")
                break
                
            all_nodes.extend(items)
            print(f"成功拉取第 {page} 页，当前共获取 {len(all_nodes)} 个节点。")
            
            page += 1
            time.sleep(0.5)  # 停顿半秒，避免请求过快被服务器限流
            
        except Exception as e:
            print(f"发生错误: {e}")
            break
            
    return all_nodes

if __name__ == "__main__":
    nodes = fetch_comfy_registry()
    
    # 将全量数据写入本地文件
    with open("comfynexus_nodes.json", "w", encoding="utf-8") as f:
        json.dump(nodes, f, ensure_ascii=False, indent=2)
        
    print(f"任务完成！总共保存了 {len(nodes)} 个插件。")
