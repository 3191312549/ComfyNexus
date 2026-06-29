"""
批量 Git 版本历史诊断脚本

用于批量诊断多个插件的 Git 历史获取情况
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


def diagnose_plugin_summary(plugin_path: Path, git_utils: GitUtils) -> dict:
    """
    快速诊断插件的 Git 历史获取情况（摘要版）
    
    Args:
        plugin_path: 插件路径
        git_utils: GitUtils 实例
        
    Returns:
        诊断结果字典
    """
    result = {
        'name': plugin_path.name,
        'path': str(plugin_path),
        'is_repo': False,
        'is_shallow': False,
        'branch': None,
        'commits_count': 0,
        'error': None
    }
    
    try:
        # 1. 检查是否是 Git 仓库
        result['is_repo'] = git_utils.is_git_repo(plugin_path)
        if not result['is_repo']:
            result['error'] = '不是 Git 仓库'
            return result
        
        # 2. 检查是否是浅克隆
        shallow_file = plugin_path / '.git' / 'shallow'
        result['is_shallow'] = shallow_file.exists()
        
        # 3. 获取当前分支
        try:
            result['branch'] = git_utils.get_current_branch(plugin_path)
        except Exception as e:
            result['error'] = f'获取分支失败: {str(e)}'
            return result
        
        # 4. 获取提交历史
        try:
            commits = git_utils.get_all_commits(plugin_path, limit=20)
            result['commits_count'] = len(commits)
        except Exception as e:
            result['error'] = f'获取提交历史失败: {str(e)}'
            return result
        
    except Exception as e:
        result['error'] = f'诊断失败: {str(e)}'
    
    return result


def batch_diagnose(custom_nodes_path: Path):
    """
    批量诊断 custom_nodes 目录下的所有插件
    
    Args:
        custom_nodes_path: custom_nodes 目录路径
    """
    print(f"\n{'='*80}")
    print(f"批量诊断 Git 版本历史")
    print(f"目录: {custom_nodes_path}")
    print(f"{'='*80}\n")
    
    if not custom_nodes_path.exists():
        print(f"❌ 错误: 目录不存在: {custom_nodes_path}")
        return
    
    if not custom_nodes_path.is_dir():
        print(f"❌ 错误: 不是目录: {custom_nodes_path}")
        return
    
    git_utils = GitUtils()
    
    # 获取所有子目录
    plugin_dirs = [d for d in custom_nodes_path.iterdir() if d.is_dir()]
    
    print(f"发现 {len(plugin_dirs)} 个插件目录\n")
    
    # 诊断结果
    results = []
    
    for plugin_dir in plugin_dirs:
        result = diagnose_plugin_summary(plugin_dir, git_utils)
        results.append(result)
    
    # 统计
    total = len(results)
    git_repos = [r for r in results if r['is_repo']]
    shallow_repos = [r for r in results if r['is_shallow']]
    limited_history = [r for r in results if r['is_repo'] and r['commits_count'] < 20]
    
    print(f"\n{'='*80}")
    print(f"诊断统计")
    print(f"{'='*80}\n")
    print(f"总插件数: {total}")
    print(f"Git 仓库: {len(git_repos)}")
    print(f"浅克隆: {len(shallow_repos)}")
    print(f"历史记录不完整 (<20条): {len(limited_history)}")
    
    # 详细结果
    print(f"\n{'='*80}")
    print(f"详细结果")
    print(f"{'='*80}\n")
    
    # 按提交数量排序
    results.sort(key=lambda r: r['commits_count'])
    
    for i, result in enumerate(results, 1):
        status_icon = '✅' if result['is_repo'] and result['commits_count'] >= 20 else '⚠️'
        shallow_icon = '🔸' if result['is_shallow'] else '  '
        
        print(f"{status_icon} {shallow_icon} [{i:3d}] {result['name']}")
        
        if result['is_repo']:
            print(f"       分支: {result['branch']}")
            print(f"       提交数: {result['commits_count']}")
            if result['is_shallow']:
                print(f"       ⚠️  浅克隆")
        else:
            print(f"       ❌ {result['error']}")
        
        print()
    
    # 重点关注：历史记录不完整的仓库
    if limited_history:
        print(f"\n{'='*80}")
        print(f"⚠️  需要关注的插件（历史记录不完整）")
        print(f"{'='*80}\n")
        
        for result in limited_history:
            print(f"插件: {result['name']}")
            print(f"  路径: {result['path']}")
            print(f"  分支: {result['branch']}")
            print(f"  提交数: {result['commits_count']}")
            print(f"  浅克隆: {'是' if result['is_shallow'] else '否'}")
            print()


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python batch_diagnose_git_history.py <custom_nodes路径>")
        print("示例: python batch_diagnose_git_history.py D:\\ComfyUI_windows_portable\\ComfyUI\\custom_nodes")
        sys.exit(1)
    
    custom_nodes_path = Path(sys.argv[1])
    batch_diagnose(custom_nodes_path)


if __name__ == '__main__':
    main()
