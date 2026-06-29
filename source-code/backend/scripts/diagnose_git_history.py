"""
Git 版本历史诊断脚本

用于诊断为什么在不同环境下获取的版本历史数量不同
"""

import sys
from pathlib import Path
import os

# 添加项目根目录到 Python 路径
backend_root = Path(__file__).parent.parent
project_root = backend_root.parent
sys.path.insert(0, str(backend_root))
sys.path.insert(0, str(project_root))

# 设置工作目录为 backend
os.chdir(str(backend_root))

from src.core.plugin.git_utils import GitUtils
from src.utils.logger import app_logger as logger


def diagnose_plugin_git_history(plugin_path: Path):
    """
    诊断插件的 Git 历史获取情况
    
    Args:
        plugin_path: 插件路径
    """
    print(f"\n{'='*80}")
    print(f"诊断插件: {plugin_path.name}")
    print(f"路径: {plugin_path}")
    print(f"{'='*80}\n")
    
    git_utils = GitUtils()
    
    # 1. 检查是否是 Git 仓库
    is_repo = git_utils.is_git_repo(plugin_path)
    print(f"1. 是否是 Git 仓库: {is_repo}")
    if not is_repo:
        print("   ❌ 不是有效的 Git 仓库，退出诊断")
        return
    
    # 2. 检查是否是浅克隆
    shallow_file = plugin_path / '.git' / 'shallow'
    is_shallow = shallow_file.exists()
    print(f"2. 是否是浅克隆: {is_shallow}")
    if is_shallow:
        print(f"   ⚠️  检测到浅克隆文件: {shallow_file}")
        try:
            with open(shallow_file, 'r') as f:
                shallow_commits = f.readlines()
            print(f"   浅克隆深度: {len(shallow_commits)} 个提交")
        except Exception as e:
            print(f"   无法读取浅克隆文件: {e}")
    
    # 3. 获取当前分支
    try:
        branch = git_utils.get_current_branch(plugin_path)
        print(f"3. 当前分支: {branch}")
    except Exception as e:
        print(f"3. 获取当前分支失败: {e}")
        branch = None
    
    # 4. 获取远端地址
    try:
        remote_url = git_utils.get_remote_url(plugin_path)
        print(f"4. 远端地址: {remote_url}")
    except Exception as e:
        print(f"4. 获取远端地址失败: {e}")
    
    # 5. 尝试不同的方式获取提交历史
    print(f"\n5. 尝试不同方式获取提交历史:")
    
    if branch:
        # 方式1: origin/branch
        print(f"\n   方式1: git log origin/{branch} -20")
        success, stdout, stderr = git_utils._run_command(
            ['log', f'origin/{branch}', '-20', '--format=%h|%s|%aI'],
            plugin_path
        )
        if success and stdout:
            commits = [line for line in stdout.split('\n') if line]
            print(f"   ✅ 成功获取 {len(commits)} 个提交")
            if commits:
                print(f"   第一个提交: {commits[0]}")
        else:
            print(f"   ❌ 失败: {stderr}")
        
        # 方式2: 本地 branch
        print(f"\n   方式2: git log {branch} -20")
        success, stdout, stderr = git_utils._run_command(
            ['log', branch, '-20', '--format=%h|%s|%aI'],
            plugin_path
        )
        if success and stdout:
            commits = [line for line in stdout.split('\n') if line]
            print(f"   ✅ 成功获取 {len(commits)} 个提交")
            if commits:
                print(f"   第一个提交: {commits[0]}")
        else:
            print(f"   ❌ 失败: {stderr}")
    
    # 方式3: HEAD
    print(f"\n   方式3: git log HEAD -20")
    success, stdout, stderr = git_utils._run_command(
        ['log', 'HEAD', '-20', '--format=%h|%s|%aI'],
        plugin_path
    )
    if success and stdout:
        commits = [line for line in stdout.split('\n') if line]
        print(f"   ✅ 成功获取 {len(commits)} 个提交")
        if commits:
            print(f"   第一个提交: {commits[0]}")
    else:
        print(f"   ❌ 失败: {stderr}")
    
    # 方式4: --all
    print(f"\n   方式4: git log --all -20")
    success, stdout, stderr = git_utils._run_command(
        ['log', '--all', '-20', '--format=%h|%s|%aI'],
        plugin_path
    )
    if success and stdout:
        commits = [line for line in stdout.split('\n') if line]
        print(f"   ✅ 成功获取 {len(commits)} 个提交")
        if commits:
            print(f"   第一个提交: {commits[0]}")
    else:
        print(f"   ❌ 失败: {stderr}")
    
    # 6. 使用 get_all_commits 方法
    print(f"\n6. 使用 get_all_commits 方法:")
    try:
        commits = git_utils.get_all_commits(plugin_path, limit=20)
        print(f"   ✅ 成功获取 {len(commits)} 个提交")
        if commits:
            print(f"   第一个提交: {commits[0]['hash']} - {commits[0]['message']}")
            if len(commits) > 1:
                print(f"   最后一个提交: {commits[-1]['hash']} - {commits[-1]['message']}")
    except Exception as e:
        print(f"   ❌ 失败: {e}")
    
    # 7. 检查 fetch 状态
    print(f"\n7. 检查 fetch 状态:")
    print(f"   执行 git fetch origin...")
    success = git_utils.fetch(plugin_path)
    if success:
        print(f"   ✅ fetch 成功")
        
        # 再次尝试获取提交历史
        print(f"\n   fetch 后再次尝试获取提交历史:")
        try:
            commits = git_utils.get_all_commits(plugin_path, limit=20)
            print(f"   ✅ 成功获取 {len(commits)} 个提交")
        except Exception as e:
            print(f"   ❌ 失败: {e}")
    else:
        print(f"   ❌ fetch 失败")
    
    print(f"\n{'='*80}\n")


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python diagnose_git_history.py <插件路径>")
        print("示例: python diagnose_git_history.py D:\\ComfyUI_windows_portable\\ComfyUI\\custom_nodes\\ComfyUI-Manager")
        sys.exit(1)
    
    plugin_path = Path(sys.argv[1])
    
    if not plugin_path.exists():
        print(f"错误: 插件路径不存在: {plugin_path}")
        sys.exit(1)
    
    diagnose_plugin_git_history(plugin_path)


if __name__ == '__main__':
    main()
