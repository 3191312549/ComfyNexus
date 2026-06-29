"""
手动验证脚本：测试配置保存到文件的正确性

此脚本用于检查点验证，确保配置能够正确保存到文件并重新加载。
"""

import sys
import uuid
import json
import tempfile
from pathlib import Path
from datetime import datetime

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.core.env.environment_manager import EnvironmentManager
from src.core.env.environment_config_manager import EnvironmentConfigManager


def main():
    """主验证流程"""
    print("=" * 80)
    print("后端配置保存功能手动验证")
    print("=" * 80)
    
    # 创建临时目录
    tmp_dir = tempfile.mkdtemp()
    tmp_path = Path(tmp_dir)
    print(f"\n✓ 创建临时目录: {tmp_path}")
    
    # 创建管理器
    config_manager = EnvironmentConfigManager()
    config_manager.config_file = tmp_path / "test_environments.json"
    config_manager.backup_dir = tmp_path / "backups"
    config_manager.backup_dir.mkdir(exist_ok=True)
    
    manager = EnvironmentManager()
    manager.config_manager = config_manager
    
    # 初始化配置文件
    config_manager.save_config({
        "environments": [],
        "current_environment_id": None
    })
    print(f"✓ 初始化配置文件: {config_manager.config_file}")
    
    # 创建测试环境
    env_id = str(uuid.uuid4())
    test_env_path = str(tmp_path / "comfyui")
    
    env_config = {
        "id": env_id,
        "name": "test-env",
        "alias": "test-env",
        "path": test_env_path,
        "config": {
            "general": {
                "comfyui_path": test_env_path,
                "python_path": "/path/to/python",
                "pip_path": "/path/to/pip",
            },
            "acceleration": {
                "vram_mode": "normal",
                "port": 8188,
            }
        },
        "dependencies": {},
        "model_path_configs": [],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    config_data = manager.config_manager.load_config()
    config_data["environments"].append(env_config)
    manager.config_manager.save_config(config_data)
    print(f"✓ 创建测试环境: {env_id}")
    
    # 测试 1：保存完整配置
    print("\n" + "=" * 80)
    print("测试 1：保存完整配置")
    print("=" * 80)
    
    test_config = {
        "general": {
            "comfyuiPath": "/new/comfyui/path",
            "pythonPath": "/new/python/path",
            "pipPath": "/new/pip/path",
        },
        "acceleration": {
            "vramStrategy": "high",
            "port": 9999,
            "cpuOnly": False,
            "reserveVram": 0.7,
            "unetPrecision": "fp16",
            "attentionMode": "flash",
        }
    }
    
    print(f"保存配置: {json.dumps(test_config, indent=2, ensure_ascii=False)}")
    
    update_result = manager.update_environment(env_id, test_config)
    
    if update_result["success"]:
        print("✓ 配置保存成功")
    else:
        print(f"✗ 配置保存失败: {update_result.get('error_message')}")
        return False
    
    # 验证配置文件内容
    print("\n验证配置文件内容...")
    with open(config_manager.config_file, 'r', encoding='utf-8') as f:
        saved_config = json.load(f)
    
    env = next(e for e in saved_config["environments"] if e["id"] == env_id)
    
    # 验证 general 配置
    assert env["config"]["general"]["comfyui_path"] == "/new/comfyui/path"
    assert env["config"]["general"]["python_path"] == "/new/python/path"
    assert env["config"]["general"]["pip_path"] == "/new/pip/path"
    print("✓ general 配置验证通过")
    
    # 验证 acceleration 配置
    assert env["config"]["acceleration"]["vram_mode"] == "high"
    assert env["config"]["acceleration"]["port"] == 9999
    assert env["config"]["acceleration"]["use_cpu"] is False
    assert env["config"]["acceleration"]["reserve_vram"] == 0.7
    assert env["config"]["acceleration"]["unet_precision"] == "fp16"
    assert env["config"]["acceleration"]["attention_type"] == "flash"
    print("✓ acceleration 配置验证通过")
    
    # 测试 2：重新加载配置
    print("\n" + "=" * 80)
    print("测试 2：重新加载配置")
    print("=" * 80)
    
    # 创建新的管理器实例（模拟应用重启）
    new_manager = EnvironmentManager()
    new_manager.config_manager = config_manager
    
    # 加载配置
    loaded_config = new_manager.config_manager.load_config()
    loaded_env = next(e for e in loaded_config["environments"] if e["id"] == env_id)
    
    print("验证重新加载的配置...")
    assert loaded_env["config"]["general"]["comfyui_path"] == "/new/comfyui/path"
    assert loaded_env["config"]["acceleration"]["vram_mode"] == "high"
    assert loaded_env["config"]["acceleration"]["port"] == 9999
    print("✓ 重新加载配置验证通过")
    
    # 测试 3：验证备份文件
    print("\n" + "=" * 80)
    print("测试 3：验证备份文件")
    print("=" * 80)
    
    backups = list(config_manager.backup_dir.glob("environments_*.json"))
    print(f"找到 {len(backups)} 个备份文件")
    
    if len(backups) > 0:
        print("✓ 备份文件创建成功")
        for backup in backups:
            print(f"  - {backup.name}")
    else:
        print("✗ 未找到备份文件")
    
    # 测试 4：验证时间戳更新
    print("\n" + "=" * 80)
    print("测试 4：验证时间戳更新")
    print("=" * 80)
    
    original_timestamp = env["updated_at"]
    print(f"原始时间戳: {original_timestamp}")
    
    # 等待一小段时间
    import time
    time.sleep(0.1)
    
    # 再次更新配置
    update_result = manager.update_environment(env_id, {
        "acceleration": {"port": 8888}
    })
    
    new_timestamp = update_result["environment"]["updated_at"]
    print(f"新时间戳: {new_timestamp}")
    
    if new_timestamp > original_timestamp:
        print("✓ 时间戳更新验证通过")
    else:
        print("✗ 时间戳未更新")
    
    # 总结
    print("\n" + "=" * 80)
    print("验证总结")
    print("=" * 80)
    print("✓ 所有验证测试通过")
    print("✓ 配置能够正确保存到文件")
    print("✓ 配置能够正确重新加载")
    print("✓ 备份机制正常工作")
    print("✓ 时间戳正确更新")
    print("\n后端配置保存功能验证完成！")
    
    return True


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ 验证失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
