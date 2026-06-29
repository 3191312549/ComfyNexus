"""
并发 Git 操作

使用线程池并发执行 Git 操作，提升性能。
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Dict, Optional
from threading import Lock
import logging

from .models import PluginInfo, UpdateInfo, BranchInfo, CommitInfo
from .git_utils import GitUtils
from .git_error_mapper import GitError

from ...utils.logger import app_logger as logger
import json


class GitConcurrent:
    """并发 Git 操作管理器"""
    
    def __init__(self, git_utils: Optional[GitUtils] = None, max_workers: int = 10):
        """
        初始化并发 Git 操作管理器
        
        Args:
            git_utils: Git 工具类实例
            max_workers: 最大并发数
        """
        self.git_utils = git_utils or GitUtils()
        self.max_workers = max_workers
        self._lock = Lock()
    
    def fetch_git_info_concurrent(
        self,
        plugins: List[PluginInfo],
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Dict]:
        """
        并发获取插件的 Git 信息
        
        Args:
            plugins: 插件列表
            progress_callback: 进度回调函数 (current, total)
            
        Returns:
            插件名 -> Git 信息字典
        """
        results = {}
        total = len(plugins)
        completed = 0
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # 提交任务
            future_to_plugin = {
                executor.submit(self._fetch_single_git_info, plugin): plugin
                for plugin in plugins
                if plugin.is_git_repo
            }
            
            # 收集结果
            for future in as_completed(future_to_plugin):
                plugin = future_to_plugin[future]
                
                try:
                    git_info = future.result()
                    if git_info:
                        with self._lock:
                            results[plugin.name] = git_info
                except Exception as e:
                    pass
                
                # 更新进度
                completed += 1
                if progress_callback:
                    try:
                        progress_callback(completed, total)
                    except (TypeError, AttributeError):
                        pass
        
        return results
    
    def _fetch_single_git_info(self, plugin: PluginInfo) -> Optional[Dict]:
        """
        获取单个插件的 Git 信息
        
        Args:
            plugin: 插件信息
            
        Returns:
            Git 信息字典
        """
        try:
            repo_path = plugin.path
            
            # 获取远端地址
            git_url = self.git_utils.get_remote_url(repo_path)
            
            # 获取当前分支
            branch = self.git_utils.get_current_branch(repo_path)
            
            # 获取默认分支
            default_branch = self.git_utils.get_default_branch(repo_path)
            
            # 获取提交 hash
            commit_hash = self.git_utils.get_commit_hash(repo_path, short=True)
            
            # 获取提交时间
            commit_date = self.git_utils.get_commit_date(repo_path)
            
            return {
                'git_url': git_url or '',
                'branch': branch or '',
                'default_branch': default_branch or '',
                'commit_hash': commit_hash or '',
                'commit_date': commit_date or ''
            }
        
        except Exception as e:
            return None
    
    def fetch_updates_concurrent(
        self,
        plugins: List[PluginInfo],
        progress_callback: Optional[callable] = None
    ) -> Dict[str, UpdateInfo]:
        """
        并发检测插件更新
        
        Args:
            plugins: 插件列表
            progress_callback: 进度回调函数 (current, total)
            
        Returns:
            插件名 -> 更新信息字典
        """
        results = {}
        total = len(plugins)
        completed = 0
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # 提交任务
            future_to_plugin = {
                executor.submit(self._check_single_update, plugin): plugin
                for plugin in plugins
                if plugin.is_git_repo
            }
            
            # 收集结果
            for future in as_completed(future_to_plugin):
                plugin = future_to_plugin[future]
                
                try:
                    update_info = future.result()
                    if update_info:
                        with self._lock:
                            results[plugin.name] = update_info
                except Exception as e:
                    pass
                
                # 更新进度
                completed += 1
                if progress_callback:
                    try:
                        progress_callback(completed, total)
                    except (TypeError, AttributeError):
                        pass
        
        return results
    
    def _check_single_update(self, plugin: PluginInfo) -> Optional[UpdateInfo]:
        """
        检测单个插件的更新
        
        Args:
            plugin: 插件信息
            
        Returns:
            更新信息
        """
        try:
            repo_path = plugin.path
            
            # 拉取远端更新
            self.git_utils.fetch(repo_path)
            
            # 获取落后的提交数
            behind_commits = self.git_utils.get_behind_commits(repo_path)
            
            if behind_commits == 0:
                return None
            
            # 获取当前 hash
            current_hash = self.git_utils.get_commit_hash(repo_path, short=True) or ''
            
            # 获取最新 hash
            branch = plugin.branch or self.git_utils.get_current_branch(repo_path)
            if not branch:
                return None
            
            success, latest_hash, _ = self.git_utils._run_command(
                ['rev-parse', '--short=7', f'origin/{branch}'],
                repo_path
            )
            latest_hash = latest_hash if success else ''
            
            # 获取提交日志
            commits = self.get_commit_logs(repo_path, 'HEAD', f'origin/{branch}')
            
            return UpdateInfo(
                plugin_name=plugin.name,
                current_hash=current_hash,
                latest_hash=latest_hash,
                commits=commits,
                behind_commits=behind_commits
            )
        
        except Exception as e:
            return None
    
    def get_commit_logs(
        self,
        repo_path: Path,
        from_ref: str = 'HEAD',
        to_ref: Optional[str] = None
    ) -> List[CommitInfo]:
        """
        获取提交日志列表
        
        Args:
            repo_path: 仓库路径
            from_ref: 起始引用
            to_ref: 结束引用
            
        Returns:
            提交日志列表
        """
        commits_data = self.git_utils.get_commit_logs(repo_path, from_ref, to_ref)
        
        return [
            CommitInfo(
                hash=c['hash'],
                message=c['message'],
                date=c['date']
            )
            for c in commits_data
        ]
    
    def get_all_commits(
        self,
        repo_path: Path,
        limit: int = 20,
        branch: Optional[str] = None
    ) -> List[CommitInfo]:
        """
        获取所有提交历史（不限于待更新的）
        
        Args:
            repo_path: 仓库路径
            limit: 限制数量
            branch: 指定的分支名，None 时使用 FETCH_HEAD
            
        Returns:
            提交日志列表
        """
        commits_data = self.git_utils.get_all_commits(repo_path, limit, branch=branch)
        
        return [
            CommitInfo(
                hash=c['hash'],
                message=c['message'],
                date=c['date']
            )
            for c in commits_data
        ]
    
    def update_git_info_concurrent(
        self,
        plugins: List[PluginInfo],
        progress_callback: Optional[callable] = None,
        timeout_per_plugin: int = 30
    ) -> List[PluginInfo]:
        """
        并发更新插件的Git信息（带超时控制）
        
        Args:
            plugins: 插件列表
            progress_callback: 进度回调函数 (current, total)
            timeout_per_plugin: 每个插件的超时时间（秒），默认30秒
            
        Returns:
            更新后的插件列表
        """
        from concurrent.futures import wait, FIRST_COMPLETED
        import time
        
        total = len([p for p in plugins if p.is_git_repo])
        completed = 0
        failed_plugins = []  # 记录失败的插件
        timeout_plugins = []  # 记录超时的插件
        
        # 不使用with语句，手动管理ThreadPoolExecutor
        # 这样可以在退出时使用shutdown(wait=False)避免等待未完成的任务
        executor = ThreadPoolExecutor(max_workers=self.max_workers)
        try:
            # 提交任务，记录提交时间
            future_to_plugin = {}
            future_to_start_time = {}
            
            for plugin in plugins:
                if plugin.is_git_repo:
                    future = executor.submit(self._update_single_git_info, plugin)
                    future_to_plugin[future] = plugin
                    future_to_start_time[future] = time.time()
            
            # 处理结果
            pending = set(future_to_plugin.keys())
            all_futures = set(future_to_plugin.keys())  # 保存所有任务的引用
            
            while completed < total:  # 使用 completed 计数器而不是 pending 集合
                # 如果没有剩余任务，退出循环
                if len(pending) == 0:
                    break
                
                # 等待任意一个完成，超时时间为1秒（用于检查超时）
                done, pending = wait(pending, timeout=1, return_when=FIRST_COMPLETED)
                
                # 处理已完成的任务
                for future in done:
                    plugin = future_to_plugin[future]
                    
                    try:
                        updated_plugin = future.result()
                        if updated_plugin:
                            # 更新插件信息
                            plugin.git_url = updated_plugin.git_url
                            plugin.branch = updated_plugin.branch
                            plugin.default_branch = updated_plugin.default_branch
                            plugin.commit_hash = updated_plugin.commit_hash
                            plugin.commit_date = updated_plugin.commit_date
                            plugin.has_update = updated_plugin.has_update
                            plugin.behind_commits = updated_plugin.behind_commits
                            # 同步错误信息
                            plugin.git_fetch_error = updated_plugin.git_fetch_error
                            plugin.git_fetch_error_detail = updated_plugin.git_fetch_error_detail
                            plugin.git_fetch_error_type = updated_plugin.git_fetch_error_type
                            plugin.git_fetch_error_causes = updated_plugin.git_fetch_error_causes
                            plugin.git_fetch_error_solutions = updated_plugin.git_fetch_error_solutions
                        else:
                            # 如果返回 None,设置通用错误信息
                            failed_plugins.append(plugin.name)
                            plugin.git_fetch_error = '获取失败'
                            plugin.git_fetch_error_detail = '未知错误'
                            plugin.git_fetch_error_type = 'unknown'
                            plugin.git_fetch_error_causes = ''
                            plugin.git_fetch_error_solutions = ''
                    
                    except Exception as e:
                        # 如果抛出异常,设置错误信息
                        failed_plugins.append(plugin.name)
                        plugin.git_fetch_error = '获取失败'
                        plugin.git_fetch_error_detail = str(e)
                        plugin.git_fetch_error_type = 'unknown'
                        plugin.git_fetch_error_causes = ''
                        plugin.git_fetch_error_solutions = ''
                    
                    # 更新进度
                    completed += 1
                    if progress_callback:
                        try:
                            progress_callback(completed, total)
                        except (TypeError, AttributeError):
                            pass
                
                # 检查超时的任务
                current_time = time.time()
                timeout_futures = []
                
                for future in list(pending):
                    elapsed = current_time - future_to_start_time[future]
                    if elapsed > timeout_per_plugin:
                        timeout_futures.append(future)
                
                # 取消超时的任务
                for future in timeout_futures:
                    plugin = future_to_plugin[future]
                    cancel_result = future.cancel()
                    pending.discard(future)
                    timeout_plugins.append(plugin.name)
                    
                    # 为超时的插件设置错误信息
                    plugin.git_fetch_error = '获取超时'
                    plugin.git_fetch_error_detail = f'获取 Git 信息超时（超过 {timeout_per_plugin} 秒）'
                    plugin.git_fetch_error_type = 'timeout'
                    plugin.git_fetch_error_causes = ''
                    plugin.git_fetch_error_solutions = ''
                    
                    # 更新进度
                    completed += 1
                    if progress_callback:
                        try:
                            progress_callback(completed, total)
                        except (TypeError, AttributeError):
                            pass
                
                # 关键修复：超时处理后，检查是否所有任务都已完成
                # 必须在for循环外部检查，确保所有超时任务都处理完后再退出
                if completed >= total:
                    # 清空pending集合，避免ThreadPoolExecutor等待未完成的任务
                    pending.clear()
                    break  # 退出while循环
        
        finally:
            # 使用shutdown(wait=False)立即关闭线程池，不等待未完成的任务
            executor.shutdown(wait=False)
        
        # 记录失败和超时的插件
        if timeout_plugins:
            logger.warning(f"以下插件更新超时: {', '.join(timeout_plugins)}")
        if failed_plugins:
            logger.warning(f"以下插件更新失败: {', '.join(failed_plugins)}")
        
        return plugins
    
    def _update_single_git_info(self, plugin: PluginInfo) -> Optional[PluginInfo]:
        """
        更新单个插件的Git信息
        
        Args:
            plugin: 插件信息
            
        Returns:
            更新后的插件信息，失败时返回带有错误信息的插件对象
        """
        import traceback
        
        try:
            repo_path = plugin.path
            
            # 步骤 0: 预检查 - 使用 git status 快速检测权限问题
            # git status 是本地命令，执行速度快，可以提前发现权限问题
            has_permission_issue, permission_error = self.git_utils.check_safe_directory_issue(repo_path)
            if has_permission_issue:
                # 如果有权限问题，直接抛出异常，不继续执行后续命令
                raise Exception(f"Git 权限检查失败: {permission_error}")
            
            # 步骤 1: 获取远端地址（如果失败，立即抛出异常）
            git_url = self.git_utils.get_remote_url(repo_path)
            if not git_url:
                raise Exception("无法获取远端地址 (git remote get-url origin 失败)")
            
            # 步骤 2: 获取当前分支（如果失败，立即抛出异常）
            branch = self.git_utils.get_current_branch(repo_path)
            if not branch:
                raise Exception("无法获取当前分支 (git rev-parse --abbrev-ref HEAD 失败)")
            
            # 步骤 3: 获取默认分支（允许失败，使用空字符串）
            default_branch = self.git_utils.get_default_branch(repo_path) or ''
            
            # 步骤 4: 获取提交 hash（如果失败，会抛出异常）
            commit_hash = self.git_utils.get_commit_hash(repo_path, short=True)
            if not commit_hash:
                raise Exception("无法获取提交 hash (git rev-parse HEAD 失败)")
            
            # 步骤 5: 获取提交时间（允许失败，使用空字符串）
            commit_date = self.git_utils.get_commit_date(repo_path) or ''
            
            # 步骤 6: 极速检测更新（使用 ls-remote，无需 fetch）
            # 核心优化：使用 git ls-remote --symref origin HEAD 获取远程最新 hash
            # 只传输几个 hash 字符串，网络开销极小，可以瞬间完成检测
            logger.debug(f"[GitConcurrent] 开始极速检测 {plugin.name} 的更新状态")
            
            has_update = False
            behind_commits = 0
            
            fast_result = self.git_utils.check_update_available_fast(repo_path, timeout=15, branch=branch)
            fast_success = bool(fast_result[2])  # remote_hash 非空表示成功
            
            logger.dev(f"[GitConcurrent] {plugin.name} 极速检测结果: has_update={fast_result[0]}, local={fast_result[1]}, remote={fast_result[2]}, fast_success={fast_success}")
            
            if fast_success and fast_result[2]:  # remote_hash 存在
                has_update = fast_result[0]
                # 如果极速检测成功且有更新，更新 default_branch（可能更准确）
                if fast_result[3]:  # default_branch
                    default_branch = fast_result[3]
                logger.dev(
                    f"[GitConcurrent] {plugin.name} 极速检测完成: "
                    f"本地={fast_result[1]}, 远程={fast_result[2]}, 有更新={has_update}"
                )
            else:
                # Fallback: 使用传统的 fetch 方式检测更新
                logger.dev(f"[GitConcurrent] {plugin.name} 极速检测失败，使用传统 fetch 方式")
                fetch_success = self.git_utils.fetch(repo_path)
                logger.dev(f"[GitConcurrent] {plugin.name} fetch 结果: {fetch_success}")
                
                if fetch_success:
                    behind_commits = self.git_utils.get_behind_commits(repo_path, branch)
                    has_update = behind_commits > 0
                    logger.dev(f"[GitConcurrent] {plugin.name} 落后 {behind_commits} 个提交, has_update={has_update}")
                else:
                    # fetch 失败时，保留之前的 behind_commits 和 has_update 值
                    behind_commits = plugin.behind_commits
                    has_update = plugin.has_update
                    logger.dev(f"[GitConcurrent] {plugin.name} fetch 失败，保留之前的状态: behind_commits={behind_commits}, has_update={has_update}")
            
            # 创建更新后的插件信息
            updated = PluginInfo(
                name=plugin.name,
                path=plugin.path,
                is_git_repo=plugin.is_git_repo,
                install_date=plugin.install_date  # 保留安装日期
            )
            updated.git_url = git_url
            updated.branch = branch
            updated.default_branch = default_branch
            updated.commit_hash = commit_hash
            updated.commit_date = commit_date
            updated.has_update = has_update
            updated.behind_commits = behind_commits
            updated.dependency_updated = plugin.dependency_updated
            updated.dependency_viewed = plugin.dependency_viewed
            
            return updated
        
        except GitError as e:
            error_info = e.error_info
            
            logger.warning(
                f"[GitConcurrent] 获取插件 Git 信息失败 (GitError): {plugin.name}, "
                f"路径: {plugin.path}, 错误类型: {error_info.error_type}, "
                f"用户消息: {error_info.user_message}, 原始错误: {error_info.original_error}"
            )
            
            # 创建带有错误信息的插件对象
            updated = PluginInfo(
                name=plugin.name,
                path=plugin.path,
                is_git_repo=plugin.is_git_repo,
                install_date=plugin.install_date  # 保留安装日期
            )
            updated.git_url = plugin.git_url
            updated.branch = plugin.branch
            updated.default_branch = plugin.default_branch
            updated.commit_hash = plugin.commit_hash
            updated.commit_date = plugin.commit_date
            updated.has_update = plugin.has_update
            updated.behind_commits = plugin.behind_commits
            updated.dependency_updated = plugin.dependency_updated
            updated.dependency_viewed = plugin.dependency_viewed
            
            # 设置错误信息（从 ErrorInfo 提取）
            updated.git_fetch_error = error_info.user_message
            updated.git_fetch_error_detail = error_info.original_error
            updated.git_fetch_error_type = error_info.error_type
            
            # 将 causes 和 solutions 列表序列化为 JSON 字符串
            try:
                updated.git_fetch_error_causes = json.dumps(error_info.causes, ensure_ascii=False)
                updated.git_fetch_error_solutions = json.dumps(error_info.solutions, ensure_ascii=False)
            except Exception as json_error:
                # JSON 序列化失败时使用空列表
                logger.warning(f"[GitConcurrent] JSON 序列化失败: {json_error}")
                updated.git_fetch_error_causes = "[]"
                updated.git_fetch_error_solutions = "[]"
            
            # 调试日志：打印设置的错误信息
            logger.debug(
                f"[GitConcurrent] 为插件设置错误信息 (GitError): {plugin.name}, "
                f"user_message='{error_info.user_message}', error_type='{error_info.error_type}', "
                f"causes={error_info.causes}, solutions={error_info.solutions}"
            )
            
            return updated
        
        except Exception as e:
            # 处理其他异常（向后兼容）
            # 获取简短的错误消息
            error_message = str(e)
            
            # 尝试从 git_utils 的最后一次命令中获取 Git 错误输出
            git_error_detail = self._extract_git_error(error_message)
            
            # 识别错误类型
            error_type = self._identify_error_type(error_message, git_error_detail)
            
            error_summary = self._generate_error_summary(error_type, error_message)
            
            # 记录详细的警告日志
            logger.warning(
                f"[GitConcurrent] 获取插件 Git 信息失败 (Exception): {plugin.name}, "
                f"路径: {plugin.path}, 错误类型: {error_type}, 错误: {error_message}"
            )
            
            # 创建带有错误信息的插件对象
            updated = PluginInfo(
                name=plugin.name,
                path=plugin.path,
                is_git_repo=plugin.is_git_repo,
                install_date=plugin.install_date  # 保留安装日期
            )
            updated.git_url = plugin.git_url
            updated.branch = plugin.branch
            updated.default_branch = plugin.default_branch
            updated.commit_hash = plugin.commit_hash
            updated.commit_date = plugin.commit_date
            updated.has_update = plugin.has_update
            updated.behind_commits = plugin.behind_commits
            updated.dependency_updated = plugin.dependency_updated
            updated.dependency_viewed = plugin.dependency_viewed
            
            # 设置错误信息（向后兼容的方式）
            updated.git_fetch_error = error_summary
            updated.git_fetch_error_detail = git_error_detail  # 使用 Git 错误输出
            updated.git_fetch_error_type = error_type
            # 对于通用异常，causes 和 solutions 保持为空字符串（默认值）
            
            # 调试日志：打印设置的错误信息
            logger.debug(
                f"[GitConcurrent] 为插件设置错误信息 (Exception): {plugin.name}, "
                f"error_summary='{error_summary}', error_type='{error_type}', "
                f"error_message='{error_message[:100]}'"
            )
            
            return updated
    
    def update_single_plugin_git_info(self, plugin: PluginInfo) -> Optional[PluginInfo]:
        """
        更新单个插件的 Git 信息（公开接口）
        
        复用 _update_single_git_info 的完整逻辑，
        提供公开入口供 PluginController 调用。
        
        Args:
            plugin: 插件信息
            
        Returns:
            更新后的插件信息，失败时返回带有错误信息的插件对象
        """
        return self._update_single_git_info(plugin)

    def _extract_git_error(self, error_message: str) -> str:
        """
        从错误消息中提取 Git 命令的错误输出
        
        Args:
            error_message: 错误消息
            
        Returns:
            Git 错误输出（如果有），否则返回原始错误消息
        """
        # 如果错误消息中包含 "fatal:" 或 "error:"，说明是 Git 命令的输出
        if 'fatal:' in error_message or 'error:' in error_message:
            return error_message
        
        # 否则返回简化的错误消息（不包含 Python 堆栈）
        return error_message
    
    def _identify_error_type(self, error_message: str, error_detail: str) -> str:
        """
        识别错误类型
        
        Args:
            error_message: 错误消息
            error_detail: 错误详情
            
        Returns:
            错误类型: timeout/permission/network/repository/unknown
        """
        error_lower = error_message.lower()
        detail_lower = error_detail.lower()
        
        # 检查超时错误
        if 'timeout' in error_lower or 'timed out' in error_lower:
            return 'timeout'
        
        # 检查权限错误
        if any(keyword in error_lower for keyword in [
            'permission denied',
            'access denied',
            'fatal: detected dubious ownership',
            'safe.directory',
        ]):
            return 'permission'
        
        # 检查仓库损坏或不完整错误
        if any(keyword in error_lower or keyword in detail_lower for keyword in [
            'needed a single revision',
            'not a git repository',
            'not a valid object',
            'bad object',
            'corrupt',
            'unable to read',
        ]):
            return 'repository'
        
        # 检查网络错误
        if any(keyword in error_lower for keyword in [
            'network',
            'connection',
            'could not resolve host',
            'failed to connect',
            'unable to access',
            'ssl',
            'certificate'
        ]):
            return 'network'
        
        # 未知错误
        return 'unknown'
    
    def _generate_error_summary(self, error_type: str, error_message: str) -> str:
        """
        生成简短的错误描述
        
        Args:
            error_type: 错误类型
            error_message: 原始错误消息
            
        Returns:
            简短的错误描述
        """
        if error_type == 'timeout':
            return '获取超时'
        elif error_type == 'permission':
            return 'Git 权限不足'
        elif error_type == 'network':
            return '网络连接失败'
        else:
            # 截取前50个字符作为摘要
            return error_message[:50] + ('...' if len(error_message) > 50 else '')
    
    def get_branches_concurrent(
        self,
        plugins: List[PluginInfo],
        progress_callback: Optional[callable] = None
    ) -> Dict[str, List[BranchInfo]]:
        """
        并发获取插件的分支列表
        
        Args:
            plugins: 插件列表
            progress_callback: 进度回调函数 (current, total)
            
        Returns:
            插件名 -> 分支列表字典
        """
        results = {}
        total = len(plugins)
        completed = 0
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # 提交任务
            future_to_plugin = {
                executor.submit(self._get_single_branches, plugin): plugin
                for plugin in plugins
                if plugin.is_git_repo
            }
            
            # 收集结果
            for future in as_completed(future_to_plugin):
                plugin = future_to_plugin[future]
                
                try:
                    branches = future.result()
                    if branches:
                        with self._lock:
                            results[plugin.name] = branches
                except Exception as e:
                    pass
                
                # 更新进度
                completed += 1
                if progress_callback:
                    try:
                        progress_callback(completed, total)
                    except (TypeError, AttributeError):
                        pass
        
        return results
    
    def _get_single_branches(self, plugin: PluginInfo) -> List[BranchInfo]:
        """
        获取单个插件的分支列表
        
        Args:
            plugin: 插件信息
            
        Returns:
            分支列表
        """
        try:
            branches_data = self.git_utils.get_branches(plugin.path)
            
            return [
                BranchInfo(
                    name=b['name'],
                    is_default=b['is_default'],
                    is_current=b['is_current']
                )
                for b in branches_data
            ]
        
        except Exception as e:
            return []
