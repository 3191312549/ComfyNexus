"""
插件扫描器

扫描和解析 ComfyUI 插件信息。
"""

from pathlib import Path
from typing import List, Optional, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed

from .models import PluginInfo, Dependency, GitInfo
from .git_utils import GitUtils
from ...utils.logger import app_logger as logger


class PluginScanner:
    """插件扫描器"""
    
    def __init__(self, git_utils: Optional[GitUtils] = None):
        """
        初始化插件扫描器
        
        Args:
            git_utils: Git 工具类实例
        """
        self.git_utils = git_utils or GitUtils()
    
    def scan_plugins(self, custom_nodes_path: Path, fetch_updates: bool = False, skip_git_info: bool = False) -> List[PluginInfo]:
        """
        扫描插件目录
        
        Args:
            custom_nodes_path: custom_nodes 目录路径
            fetch_updates: 是否拉取远端更新（耗时操作）
            skip_git_info: 是否跳过Git信息获取（快速扫描模式）
            
        Returns:
            插件列表
        """
        if not custom_nodes_path.exists() or not custom_nodes_path.is_dir():
            return []
        
        plugins = []
        
        try:
            # 遍历所有子目录
            items = list(custom_nodes_path.iterdir())
            
            for item in items:
                if not item.is_dir():
                    continue
                
                # 跳过隐藏目录和特殊目录
                if item.name.startswith('.') or item.name.startswith('__'):
                    continue
                
                # 检查是否为 Git 仓库
                is_git = self.git_utils.is_git_repo(item)
                
                # 获取文件夹创建时间
                install_date = ""
                try:
                    # 获取文件夹的创建时间（Windows）或修改时间（Unix）
                    stat_info = item.stat()
                    # Windows: st_ctime 是创建时间
                    # Unix/Linux: st_ctime 是元数据修改时间，st_mtime 是内容修改时间
                    # 使用 st_ctime 作为安装日期的近似值
                    from datetime import datetime
                    timestamp = stat_info.st_ctime
                    install_date = datetime.fromtimestamp(timestamp).isoformat()
                except Exception as e:
                    logger.debug(f"获取插件 {item.name} 的创建时间失败: {e}")
                
                # 创建插件信息（保留原始名称，包括 .disabled 后缀）
                plugin = PluginInfo(
                    name=item.name,
                    path=item,
                    is_git_repo=is_git,
                    install_date=install_date
                )
                
                # 如果是 Git 仓库且不跳过Git信息，获取 Git 信息
                if is_git and not skip_git_info:
                    git_info = self.get_git_info(item, fetch_updates=fetch_updates)
                    if git_info:
                        plugin.git_url = git_info.remote_url
                        plugin.branch = git_info.current_branch
                        plugin.default_branch = git_info.default_branch
                        plugin.commit_hash = git_info.commit_hash
                        plugin.commit_date = git_info.commit_date
                        plugin.has_update = git_info.has_update
                        plugin.behind_commits = git_info.behind_commits
                elif is_git and skip_git_info:
                    # 如果是 Git 仓库但跳过了 Git 信息获取，设置为空字符串
                    # 这样前端会认为数据不完整，触发后台更新
                    # 后台任务会并发更新这些插件的 Git 信息
                    plugin.commit_hash = ""
                    plugin.commit_date = ""
                    plugin.branch = ""
                    plugin.default_branch = ""
                
                plugins.append(plugin)
            
        except Exception as e:
            pass
        
        return plugins
    
    def get_git_info(self, plugin_path: Path, fetch_updates: bool = False) -> Optional[GitInfo]:
        """
        获取 Git 仓库信息
        
        Args:
            plugin_path: 插件路径
            fetch_updates: 是否拉取远端更新（耗时操作）
            
        Returns:
            Git 信息，失败返回 None
        """
        if not self.git_utils.is_git_repo(plugin_path):
            return None
        
        try:
            # 获取远端地址
            remote_url = self.git_utils.get_remote_url(plugin_path) or ''
            
            # 获取当前分支
            current_branch = self.git_utils.get_current_branch(plugin_path) or ''
            
            # 获取默认分支
            default_branch = self.git_utils.get_default_branch(plugin_path) or ''
            
            # 获取提交 hash
            commit_hash = self.git_utils.get_commit_hash(plugin_path, short=True) or ''
            
            # 获取提交时间
            commit_date = self.git_utils.get_commit_date(plugin_path) or ''
            
            # 可选：拉取更新（耗时操作，默认跳过）
            behind_commits = 0
            if fetch_updates:
                self.git_utils.fetch(plugin_path)
                behind_commits = self.git_utils.get_behind_commits(plugin_path, current_branch)
            
            return GitInfo(
                remote_url=remote_url,
                current_branch=current_branch,
                default_branch=default_branch,
                commit_hash=commit_hash,
                commit_date=commit_date,
                has_update=behind_commits > 0,
                behind_commits=behind_commits
            )
        
        except Exception as e:
            return None
    
    def parse_dependencies(self, plugin_path: Path) -> List[Dependency]:
        """
        解析插件依赖
        
        Args:
            plugin_path: 插件路径
            
        Returns:
            依赖列表
        """
        requirements_file = plugin_path / "requirements.txt"
        
        if not requirements_file.exists():
            return []
        
        dependencies = []
        
        try:
            with open(requirements_file, 'r', encoding='utf-8') as f:
                for line in f:
                    # 去除空白和注释
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    # 解析依赖
                    dep = self._parse_dependency_line(line)
                    if dep:
                        dependencies.append(dep)
        
        except Exception as e:
            logger.warning(f"[PluginScanner] 解析依赖文件失败: {plugin_path.name}, {str(e)}")
        
        return dependencies
    
    def parse_all_dependencies(self, plugins: List[PluginInfo], max_workers: int = 32) -> Dict[str, List[Dependency]]:
        """
        并发解析所有插件的依赖文件
        
        Args:
            plugins: 插件列表
            max_workers: 最大并发线程数，默认32
            
        Returns:
            插件依赖字典 {"plugin_name": [Dependency, ...], ...}
        """
        result = {}
        
        if not plugins:
            return result
        
        logger.info(f"[PluginScanner] 开始并发解析依赖，共 {len(plugins)} 个插件，并发数: {max_workers}")
        
        def parse_single_plugin(plugin: PluginInfo) -> tuple[str, List[Dependency]]:
            """解析单个插件的依赖"""
            try:
                deps = self.parse_dependencies(plugin.path)
                return (plugin.name, deps)
            except Exception as e:
                logger.warning(f"[PluginScanner] 解析插件依赖失败: {plugin.name}, {str(e)}")
                return (plugin.name, [])
        
        # 使用线程池并发解析
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 提交所有任务
            future_to_plugin = {
                executor.submit(parse_single_plugin, plugin): plugin 
                for plugin in plugins
            }
            
            # 收集结果
            completed = 0
            for future in as_completed(future_to_plugin):
                plugin_name, deps = future.result()
                result[plugin_name] = deps
                
                completed += 1
                if completed % 20 == 0:
                    logger.debug(f"[PluginScanner] 已解析 {completed}/{len(plugins)} 个插件的依赖")
        
        logger.info(f"[PluginScanner] 依赖解析完成，共 {len(result)} 个插件")
        return result
    
    def _parse_dependency_line(self, line: str) -> Optional[Dependency]:
        """
        解析单行依赖
        
        支持格式:
        - package
        - package==1.0.0
        - package>=1.0.0
        - package~=1.0.0
        - package<=1.0.0
        - package>1.0.0
        - package<1.0.0
        - package!=1.0.0
        - package[extra]  # 增强参数，如 rembg[gpu]
        - package[extra]==1.0.0  # 增强参数 + 版本
        - git+https://github.com/user/repo.git  # Git URL
        - git+https://github.com/user/repo.git#egg=package_name  # Git URL with egg
        - package; environment_marker  # 环境标记，如 jetson-stats; platform_machine == 'aarch64'
        - package==1.0.0 --extra-index-url https://...  # 带额外索引URL
        
        Args:
            line: 依赖行
            
        Returns:
            Dependency 对象，解析失败返回 None
        """
        try:
            # 移除行内注释
            if '#' in line and not line.startswith('git+'):
                # 注意：Git URL 中的 #egg= 不是注释
                line = line.split('#')[0].strip()
            
            # 移除额外选项 (如 --index-url)
            if line.startswith('-'):
                return None
            
            # 处理 Git URL 格式
            if line.startswith('git+'):
                return self._parse_git_url(line)
            
            # 提取 pip 选项（如 --extra-index-url）
            # 这些选项需要在安装时使用，但不是版本要求的一部分
            pip_options = []
            if ' --' in line:
                parts = line.split(' --')
                line = parts[0].strip()  # 只保留包名和版本部分
                # 保存所有 pip 选项，需要正确分割选项名和值
                for i in range(1, len(parts)):
                    option_str = '--' + parts[i].strip()
                    # 分割选项名和值（如 --extra-index-url https://...）
                    option_parts = option_str.split(None, 1)  # 按空白符分割，最多分割一次
                    if len(option_parts) == 2:
                        # 有值的选项（如 --extra-index-url URL）
                        pip_options.extend(option_parts)
                    else:
                        # 无值的选项（如 --no-deps）
                        pip_options.append(option_parts[0])
            
            # 处理环境标记 (PEP 508)
            # 格式: package; environment_marker
            # 例如: jetson-stats; platform_machine == 'aarch64'
            environment_marker = ""
            marker_match = True
            
            if ';' in line:
                parts = line.split(';', 1)
                line = parts[0].strip()  # 只保留包名和版本部分
                environment_marker = parts[1].strip()  # 保存环境标记
                
                # 评估环境标记是否匹配当前系统
                from .environment_markers import get_evaluator
                evaluator = get_evaluator()
                marker_match = evaluator.evaluate(environment_marker)
                
                # 添加调试日志
                logger.info(f"[PluginScanner] 环境标记评估: {line} | 标记: {environment_marker} | 匹配: {marker_match}")
            
            # 解析包名和版本
            package = line
            version = ""
            
            # 检测版本操作符
            operators = ['==', '>=', '<=', '~=', '!=', '>', '<']
            for op in operators:
                if op in line:
                    parts = line.split(op, 1)
                    if len(parts) == 2:
                        package = parts[0].strip()
                        version = f"{op}{parts[1].strip()}"
                        break
            
            if not package:
                return None
            
            dep = Dependency(
                package=package,
                version=version,
                installed=False,
                environment_marker=environment_marker,
                marker_match=marker_match
            )
            
            # 如果有 pip 选项，保存到依赖对象中
            if pip_options:
                dep.pip_options = pip_options
                logger.debug(f"[PluginScanner] 解析依赖: {package}{version}, pip选项: {pip_options}")
            
            return dep
        
        except Exception as e:
            logger.debug(f"[PluginScanner] 解析依赖行失败: {line}, {str(e)}")
            return None
    
    def _parse_git_url(self, git_url: str) -> Optional[Dependency]:
        """
        解析 Git URL 格式的依赖
        
        支持格式:
        - git+https://github.com/user/repo.git
        - git+https://github.com/user/repo.git@branch
        - git+https://github.com/user/repo.git#egg=package_name
        - git+https://github.com/user/repo.git@branch#egg=package_name
        
        Args:
            git_url: Git URL 字符串
            
        Returns:
            Dependency 对象，解析失败返回 None
        """
        try:
            package_name = None
            
            # 1. 尝试从 #egg= 提取包名
            if '#egg=' in git_url:
                egg_part = git_url.split('#egg=')[1]
                # 移除可能的额外参数（如 &subdirectory=...）
                package_name = egg_part.split('&')[0].strip()
            
            # 2. 如果没有 egg，从 URL 路径提取仓库名
            if not package_name:
                # 移除 git+ 前缀
                url = git_url[4:] if git_url.startswith('git+') else git_url
                
                # 移除 @ 后的分支/标签信息
                if '@' in url:
                    url = url.split('@')[0]
                
                # 移除 # 后的片段
                if '#' in url:
                    url = url.split('#')[0]
                
                # 提取路径的最后一部分作为包名
                # 例如：https://github.com/user/repo.git -> repo
                path_parts = url.rstrip('/').split('/')
                if path_parts:
                    repo_name = path_parts[-1]
                    # 移除 .git 后缀
                    if repo_name.endswith('.git'):
                        repo_name = repo_name[:-4]
                    package_name = repo_name
            
            if not package_name:
                logger.debug(f"[PluginScanner] 无法从 Git URL 提取包名: {git_url}")
                return None
            
            # Git URL 依赖通常没有版本要求（由 Git 分支/标签控制）
            return Dependency(
                package=package_name,
                version="",
                installed=False
            )
        
        except Exception as e:
            logger.debug(f"[PluginScanner] 解析 Git URL 失败: {git_url}, {str(e)}")
            return None
