import requests
import json

# 测试官方 API
response = requests.get('https://api.comfy.org/nodes?limit=2&page=1')
data = response.json()

print("=== 第一个插件的完整数据 ===")
print(json.dumps(data['nodes'][0], indent=2, ensure_ascii=False))

print("\n=== 可用字段列表 ===")
print(list(data['nodes'][0].keys()))
