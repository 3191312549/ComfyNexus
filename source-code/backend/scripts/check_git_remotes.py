"""
检查插件的 Git 远程地址

用于诊断哪些插件使用了加速源地址
"""

import subprocess
from pathlib import Path
import sys

# 导入项目内置的 Git 配置
sys.path.insert(0, str(Path(__file__).parent.parent))
from src.utils.git_config import GIT_EXECUTABLE

def check_git_remote(plugin_path: Path) -> dict:
    """
    检查插件的 Git 远程地址
    
    Returns:
        {
            'name': str,
            'remote_url': str,
            'is_mirror': bool,
            'mirror_type': str  # ghproxy, cnpmjs, etc.
        }
    """
    try:
        # 检查是否为 Git 仓库
        git_dir = plugin_path / '.git'
        if not git_dir.exists():
            return None
        
        # 获取远程地址
        result = subprocess.run(
            [GIT_EXECUTABLE, 'remote', 'get-url', 'origin'],
            cwd=str(plugin_path),
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode != 0:
            return None
        
        remote_url = result.stdout.strip()
        
        # 检查是否为加速源
        is_mirror = False
        mirror_type = None
        
        mirror_keywords = {
            'ghproxy': ['ghproxy.com', 'ghproxy.net'],
            'cnpmjs': ['cnpmjs.org', 'npm.taobao.org'],
            'fastgit': ['fastgit.org', 'fastgit.xyz'],
            'gitclone': ['gitclone.com'],
            'other': ['mirror', 'proxy', 'cdn']
        }
        
        for mtype, keywords in mirror_keywords.items():
            for keyword in keywords:
                if keyword in remote_url.lower():
                    is_mirror = True
                    mirror_type = mtype
                    break
            if is_mirror:
                break
        
        return {
            'name': plugin_path.name,
            'remote_url': remote_url,
            'is_mirror': is_mirror,
            'mirror_type': mirror_type
        }
    
    except Exception as e:
        return None


def main():
    """主函数"""
    # 获取 custom_nodes 路径
    if len(sys.argv) > 1:
        custom_nodes_path = Path(sys.argv[1])
    else:
        print("用法: python check_git_remotes.py <custom_nodes_path>")
        print("示例: python check_git_remotes.py D:/ComfyUI/custom_nodes")
        return
    
    if not custom_nodes_path.exists():
        print(f"错误: 路径不存在: {custom_nodes_path}")
        return
    
    print(f"正在扫描: {custom_nodes_path}\n")
    
    # 扫描所有插件
    mirror_plugins = []
    normal_plugins = []
    
    for plugin_dir in custom_nodes_path.iterdir():
        if not plugin_dir.is_dir():
            continue
        
        result = check_git_remote(plugin_dir)
        if result:
            if result['is_mirror']:
                mirror_plugins.append(result)
            else:
                normal_plugins.append(result)
    
    # 输出结果
    print(f"=== 扫描结果 ===")
    print(f"总插件数: {len(mirror_plugins) + len(normal_plugins)}")
    print(f"使用加速源: {len(mirror_plugins)}")
    print(f"使用原始地址: {len(normal_plugins)}\n")
    
    if mirror_plugins:
        print("=== 使用加速源的插件 ===")
        for plugin in mirror_plugins:
            print(f"\n插件: {plugin['name']}")
            print(f"  类型: {plugin['mirror_type']}")
            print(f"  地址: {plugin['remote_url']}")
    
    # 生成修复脚本
    if mirror_plugins:
        print("\n=== 生成修复脚本 ===")
        
        # Windows 批处理脚本
        bat_script = f"@echo off\ncd /d {custom_nodes_path}\n\n"
        for plugin in mirror_plugins:
            # 尝试提取原始 GitHub 地址
            url = plugin['remote_url']
            if 'github.com' in url:
                # 从加速源 URL 中提取原始地址
                import re
                match = re.search(r'github\.com[:/]([^/]+/[^/]+?)(?:\.git)?$', url)
                if match:
                    repo = match.group(1)
                    original_url = f"https://github.com/{repo}.git"
                    bat_script += f"echo 修复 {plugin['name']}...\n"
                    bat_script += f"cd {plugin['name']}\n"
                    bat_script += f"git remote set-url origin {original_url}\n"
                    bat_script += f"cd ..\n\n"
        
        bat_script += "echo 完成！\npause\n"
        
        script_path = custom_nodes_path / 'fix_git_remotes.bat'
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(bat_script)
        
        print(f"已生成修复脚本: {script_path}")
        print("\n运行此脚本将把所有加速源地址替换为原始 GitHub 地址")
        print("注意: 运行前请确保你的网络可以访问 GitHub")


if __name__ == '__main__':
    main()
