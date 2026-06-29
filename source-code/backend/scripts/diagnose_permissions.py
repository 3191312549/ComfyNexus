"""
权限诊断工具

用于检查 ComfyUI 启动所需的文件和目录权限
"""

import os
import sys
from pathlib import Path
import json

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.src.utils.paths import get_config_dir


def check_path_permissions(path: Path, name: str):
    """检查路径权限"""
    print(f"\n{'='*60}")
    print(f"检查 {name}: {path}")
    print(f"{'='*60}")
    
    # 检查是否存在
    if not path.exists():
        print(f"❌ 路径不存在")
        return False
    else:
        print(f"✅ 路径存在")
    
    # 检查是否可读
    if os.access(path, os.R_OK):
        print(f"✅ 可读")
    else:
        print(f"❌ 不可读")
        return False
    
    # 如果是文件，检查是否可执行
    if path.is_file():
        if os.access(path, os.X_OK):
            print(f"✅ 可执行")
        else:
            print(f"❌ 不可执行")
            return False
    
    # 如果是目录，检查是否可写
    if path.is_dir():
        if os.access(path, os.W_OK):
            print(f"✅ 可写")
        else:
            print(f"❌ 不可写")
            return False
    
    return True


def main():
    """主函数"""
    print("ComfyUI 权限诊断工具")
    print("="*60)
    
    # 读取环境配置
    config_path = get_config_dir() / "environments.json"
    
    if not config_path.exists():
        print(f"❌ 配置文件不存在: {config_path}")
        return
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    environments = config.get("environments", [])
    current_env_id = config.get("current_environment_id")
    
    if not environments:
        print("❌ 没有找到任何环境配置")
        return
    
    # 找到当前环境
    current_env = None
    for env in environments:
        if env.get("id") == current_env_id:
            current_env = env
            break
    
    if not current_env:
        print(f"❌ 没有找到当前环境 (ID: {current_env_id})")
        print(f"可用环境:")
        for env in environments:
            print(f"  - {env.get('alias')} (ID: {env.get('id')})")
        return
    
    print(f"\n当前环境: {current_env.get('alias')}")
    
    # 获取路径
    general = current_env.get("config", {}).get("general", {})
    python_path = general.get("python_path")
    comfyui_path = general.get("comfyui_path")
    
    if not python_path or not comfyui_path:
        print("❌ 环境配置不完整")
        print(f"Python 路径: {python_path}")
        print(f"ComfyUI 路径: {comfyui_path}")
        return
    
    # 检查 Python 路径
    python_path_obj = Path(python_path)
    
    # 如果是目录，自动拼接 python.exe
    if python_path_obj.is_dir():
        python_exe = python_path_obj / "python.exe"
        print(f"\n⚠️  Python 路径是目录，自动拼接 python.exe")
        print(f"   原路径: {python_path}")
        print(f"   实际路径: {python_exe}")
        python_path_obj = python_exe
    
    check_path_permissions(python_path_obj, "Python 可执行文件")
    
    # 检查 ComfyUI 路径
    comfyui_path_obj = Path(comfyui_path)
    check_path_permissions(comfyui_path_obj, "ComfyUI 目录")
    
    # 检查 main.py
    main_py_path = comfyui_path_obj / "main.py"
    check_path_permissions(main_py_path, "main.py")
    
    # 检查输出目录
    acceleration = current_env.get("config", {}).get("acceleration", {})
    output_dir = acceleration.get("output_directory")
    if output_dir:
        output_dir_obj = Path(output_dir)
        check_path_permissions(output_dir_obj, "输出目录")
    
    # 检查输入目录
    input_dir = acceleration.get("input_directory")
    if input_dir:
        input_dir_obj = Path(input_dir)
        check_path_permissions(input_dir_obj, "输入目录")
    
    # 检查临时目录
    temp_dir = acceleration.get("temp_directory")
    if temp_dir:
        temp_dir_obj = Path(temp_dir)
        check_path_permissions(temp_dir_obj, "临时目录")
    
    print(f"\n{'='*60}")
    print("诊断完成")
    print(f"{'='*60}")
    
    # 检查是否以管理员身份运行
    try:
        import ctypes
        is_admin = ctypes.windll.shell32.IsUserAnAdmin()
        if is_admin:
            print("✅ 当前以管理员身份运行")
        else:
            print("⚠️  当前未以管理员身份运行")
            print("   如果遇到权限问题，请尝试以管理员身份运行应用")
    except:
        print("⚠️  无法检查管理员权限")


if __name__ == "__main__":
    main()
