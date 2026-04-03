import json
import requests
import re

def get_latest_versions_from_whl(cuda_version="cu128"):
    """
    直接从 PyTorch 的 nightly 或 release 索引页获取版本号
    这比爬 Wiki 更可靠，因为这是安装程序实际读取的地方
    """
    index_url = f"https://download.pytorch.org/whl/nightly/{cuda_version}/"
    response = requests.get(index_url)
    content = response.text

    # 匹配文件名示例: torch-2.9.1%2Bcu128-cp311-cp311-win_amd64.whl
    # 提取版本号部分
    torch_match = re.findall(r'torch-(\d+\.\d+\.\d+\+cu\d+)', content)
    vision_match = re.findall(r'torchvision-(\d+\.\d+\.\d+\+cu\d+)', content)
    audio_match = re.findall(r'torchaudio-(\d+\.\d+\.\d+\+cu\d+)', content)

    # 去重并排序，取最新的一个
    latest_torch = sorted(list(set(torch_match)))[-1] if torch_match else None
    
    # 核心逻辑：过滤出与 torch 主版本号匹配的 vision 和 audio
    # 比如 torch 2.6.0 对应 audio 2.6.0
    mapping = {
        "cuda": cuda_version,
        "torch": latest_torch,
        "torchvision": None,
        "torchaudio": None
    }

    if latest_torch:
        base_ver = latest_torch.split('+')[0] # 得到 2.9.1
        major_minor = ".".join(base_ver.split('.')[:2]) # 得到 2.9

        for v in vision_match:
            if v.startswith(f"0.{int(major_minor.split('.')[1]) + 15}"): # Vision 的版本规律通常是 Torch次版本+15
                mapping["torchvision"] = v
        
        for a in audio_match:
            if a.startswith(major_minor): # Audio 通常与 Torch 版本号同步
                mapping["torchaudio"] = a

    return mapping

if __name__ == "__main__":
    # 可以循环多个 CUDA 版本
    results = []
    for cv in ["cu121", "cu124", "cu128", "cu131"]:
        try:
            results.append(get_latest_versions_from_whl(cv))
        except Exception as e:
            print(f"Error fetching {cv}: {e}")

    with open("pytorch_mapping.json", "w") as f:
        json.dump(results, f, indent=4)
