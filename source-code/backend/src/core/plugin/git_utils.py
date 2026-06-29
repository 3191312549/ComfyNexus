"""
Git 工具类

提供插件管理所需的 Git 基础操作方法。
复用现有 GitManager 的核心功能，针对插件管理场景进行封装。
"""

import subprocess
import os
import platform
import re
import time
from typing import Dict, List, Optional, Tuple
from pathlib import Path

from .git_error_mapper import GitErrorMapper, GitError
from backend.src.utils.logger import app_logger as logger


class GitUtils:
    """Git 工具类 - 用于插件管理的 Git 操作"""
    
    PROXY_CACHE_TTL = 60  # 代理配置缓存有效期（秒）
    
    def __init__(self, git_path: str = None, timeout: int = 30):
        """
        初始化 Git 工具类
        
        Args:
            git_path: Git 可执行文件路径（可选，默认动态获取）
            timeout: 命令执行超时时间（秒）
        """
        self._git_path_override = git_path
        self.timeout = timeout
        self.error_mapper = GitErrorMapper()
        self._proxy_config: Optional[Dict] = None
        self._proxy_config_time: Optional[float] = None
    
    @property
    def git_path(self) -> str:
        """
        动态获取 Git 可执行文件路径
        
        如果初始化时显式指定了路径，则使用指定的路径；
        否则动态从设置中获取，确保用户更改设置后能生效。
        
        Returns:
            Git 可执行文件路径
        """
        if self._git_path_override:
            return self._git_path_override
        from backend.src.utils.git_config import get_git_executable
        return get_git_executable()
    
    @staticmethod
    def _validate_proxy_url(proxy_url: str) -> bool:
        """
        验证代理 URL 格式是否有效
        
        有效的代理格式：
        - http://host:port
        - https://host:port
        - socks5://host:port
        
        无效的格式（会触发 Git 错误）：
        - https://mirrors.tuna.tsinghua.edu.cn/git/git/ (包含路径)
        - 任何包含路径的 HTTP/HTTPS 代理
        
        Args:
            proxy_url: 代理 URL 字符串
            
        Returns:
            bool: 是否为有效的代理 URL 格式
        """
        if not proxy_url:
            return True
        
        pattern = r'^(https?|socks5?)://[^/]+:\d+/?$'
        return bool(re.match(pattern, proxy_url))
    
    @staticmethod
    def _get_clear_proxy_config() -> Dict:
        """
        返回清除所有代理配置的环境变量字典
        
        用于清除系统中可能存在的错误代理配置。
        使用 GIT_CONFIG_* 环境变量覆盖 Git 全局配置（Git 2.32+）。
        
        Returns:
            dict: 清除代理的环境变量字典
        """
        return {
            "http_proxy": "",
            "https_proxy": "",
            "HTTP_PROXY": "",
            "HTTPS_PROXY": "",
            "ALL_PROXY": "",
            "all_proxy": "",
            "NO_PROXY": "",
            "no_proxy": "",
            "GIT_CONFIG_COUNT": "2",
            "GIT_CONFIG_KEY_0": "http.proxy",
            "GIT_CONFIG_VALUE_0": "",
            "GIT_CONFIG_KEY_1": "https.proxy",
            "GIT_CONFIG_VALUE_1": "",
        }
    
    def _get_proxy_config(self) -> Dict:
        """
        获取代理配置（带缓存）
        
        缓存策略：
        - 缓存有效期 60 秒
        - 缓存命中时不重新加载配置文件
        - 缓存过期或不存在时重新加载
        
        同时会清除系统中可能存在的错误代理配置。
        
        Returns:
            dict: 代理配置环境变量字典，包含所有代理相关变量
        """
        current_time = time.time()
        
        if self._proxy_config is not None and self._proxy_config_time is not None:
            if (current_time - self._proxy_config_time) < self.PROXY_CACHE_TTL:
                return self._proxy_config
        
        try:
            from backend.src.core.settings_manager import SettingsManager
            
            settings_manager = SettingsManager()
            result = settings_manager.get_settings()
            
            if not result.get("success"):
                self._proxy_config = self._get_clear_proxy_config()
                self._proxy_config_time = current_time
                return self._proxy_config
            
            settings = result.get("settings", {})
            proxy = settings.get("proxy", {})
            
            if not proxy.get("enabled"):
                self._proxy_config = self._get_clear_proxy_config()
                self._proxy_config_time = current_time
                return self._proxy_config
            
            host = proxy.get("host", "").strip()
            port = proxy.get("port", "").strip()
            
            if not host or not port:
                logger.warning("[GitUtils] 代理配置不完整")
                self._proxy_config = self._get_clear_proxy_config()
                self._proxy_config_time = current_time
                return self._proxy_config
            
            proxy_url = f"http://{host}:{port}"
            
            if not self._validate_proxy_url(proxy_url):
                logger.error(f"[GitUtils] 无效的代理 URL 格式: {proxy_url}")
                self._proxy_config = self._get_clear_proxy_config()
                self._proxy_config_time = current_time
                return self._proxy_config
            
            logger.debug(f"[GitUtils] 使用代理: {proxy_url}")
            
            self._proxy_config = {
                "http_proxy": proxy_url,
                "https_proxy": proxy_url,
                "HTTP_PROXY": proxy_url,
                "HTTPS_PROXY": proxy_url,
                "ALL_PROXY": "",
                "all_proxy": "",
                "NO_PROXY": "",
                "no_proxy": "",
                "GIT_CONFIG_COUNT": "2",
                "GIT_CONFIG_KEY_0": "http.proxy",
                "GIT_CONFIG_VALUE_0": proxy_url,
                "GIT_CONFIG_KEY_1": "https.proxy",
                "GIT_CONFIG_VALUE_1": proxy_url,
            }
            self._proxy_config_time = current_time
            
            return self._proxy_config
        except Exception as e:
            logger.error(f"[GitUtils] 获取代理配置失败: {str(e)}")
            return self._get_clear_proxy_config()
    
    def _run_command(
        self,
        args: List[str],
        cwd: Path,
        timeout: Optional[int] = None,
        env: Optional[Dict] = None
    ) -> Tuple[bool, str, str]:
        """
        执行 Git 命令（带镜像源 fallback 机制）
        
        Args:
            args: Git 命令参数列表
            cwd: 工作目录
            timeout: 超时时间（秒），None 使用默认值
            env: 环境变量字典
            
        Returns:
            (成功标志, 标准输出, 错误输出)
        """
        try:
            proxy_config = self._get_proxy_config()
            proxy_url = proxy_config.get('HTTP_PROXY', '')
            
            current_git_path = self.git_path
            cmd = [
                current_git_path,
                '-c', 'safe.directory=*',
                '-c', f'http.proxy={proxy_url}',
                '-c', f'https.proxy={proxy_url}',
            ] + args
            
            logger.dev(f"[GitUtils] 执行 Git 命令 | 路径: {current_git_path} | 命令: {' '.join(args[:3])}{'...' if len(args) > 3 else ''} | 目录: {cwd.name}")
            
            command_env = os.environ.copy()
            command_env.update(proxy_config)
            command_env["GIT_TERMINAL_PROMPT"] = "0"
            
            if env:
                command_env.update(env)
            
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            mirrors_to_try = self._get_git_mirror_priority_list()
            last_stderr = ""
            
            for attempt, mirror in enumerate(mirrors_to_try):
                env_copy = command_env.copy()
                
                if mirror:
                    env_copy["GIT_CONFIG_COUNT"] = "1"
                    env_copy["GIT_CONFIG_KEY_0"] = f"url.https://{mirror}/.insteadOf"
                    env_copy["GIT_CONFIG_VALUE_0"] = "https://github.com/"
                    logger.dev(f"[GitUtils] 尝试镜像 ({attempt + 1}/{len(mirrors_to_try)}): {mirror}")
                else:
                    logger.dev(f"[GitUtils] 尝试直连 GitHub ({attempt + 1}/{len(mirrors_to_try)})")
                
                result = subprocess.run(
                    cmd,
                    cwd=str(cwd),
                    capture_output=True,
                    text=True,
                    timeout=timeout or self.timeout,
                    encoding='utf-8',
                    errors='replace',
                    env=env_copy,
                    creationflags=creation_flags
                )
                
                success = result.returncode == 0
                stdout = result.stdout.strip()
                stderr = result.stderr.strip()
                
                if success:
                    if attempt > 0:
                        logger.dev(f"[GitUtils] 镜像 fallback 成功: {mirror or '直连 GitHub'}")
                    return True, stdout, stderr
                
                last_stderr = stderr
                
                if self._is_mirror_failure(stderr):
                    if mirror:
                        logger.warning(f"[GitUtils] 镜像 {mirror} 失败: {stderr[:100]}")
                    continue
                else:
                    return False, stdout, stderr
            
            return False, "", last_stderr
            
        except subprocess.TimeoutExpired:
            return False, "", f"命令执行超时（{timeout or self.timeout}秒）"
        except Exception as e:
            return False, "", str(e)
    
    def _get_git_mirror_priority_list(self) -> List[Optional[str]]:
        """
        获取 Git 镜像优先级列表
        
        Returns:
            镜像列表，None 表示直连 GitHub
        """
        mirrors = []
        try:
            from backend.src.utils.github_mirror import github_mirror_manager, MIRROR_PRESETS
            
            if not github_mirror_manager.is_enabled():
                return [None]
            
            preset = github_mirror_manager.get_current_preset()
            if not preset:
                return [None]
            
            primary = preset.get("github")
            fallbacks = preset.get("fallback", {}).get("github", [])
            
            if primary:
                mirrors.append(primary)
            mirrors.extend(fallbacks)
            
            if None not in mirrors:
                mirrors.append(None)
            
            return list(dict.fromkeys(mirrors))
            
        except Exception as e:
            logger.dev(f"[GitUtils] 获取镜像优先级列表失败: {e}")
            return [None]
    
    def _is_mirror_failure(self, stderr: str) -> bool:
        """检测是否为镜像源失败"""
        failure_patterns = [
            "not found",
            "404",
            "could not resolve host",
            "connection timed out",
            "repository",
            "unable to access",
            "fatal:",
        ]
        stderr_lower = stderr.lower()
        return any(pattern in stderr_lower for pattern in failure_patterns)
    
    def is_git_repo(self, path: Path) -> bool:
        """
        检查目录是否为 Git 仓库
        
        Args:
            path: 目录路径
            
        Returns:
            是否为 Git 仓库
        """
        git_dir = path / ".git"
        return git_dir.exists() and git_dir.is_dir()
    
    def get_remote_url(self, repo_path: Path) -> Optional[str]:
        """
        获取远端地址
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            远端地址，失败返回 None
            
        Raises:
            GitError: 如果命令失败，抛出包含错误映射信息的 GitError 异常
        """
        success, stdout, stderr = self._run_command(
            ['remote', 'get-url', 'origin'],
            repo_path
        )
        if success:
            return stdout
        else:
            # 如果失败且有错误输出，使用错误映射器映射错误并抛出 GitError
            if stderr:
                error_info = self.error_mapper.map_error(stderr)
                raise GitError(error_info)
            else:
                return None
    
    def get_current_branch(self, repo_path: Path) -> Optional[str]:
        """
        获取当前分支
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            当前分支名，失败返回 None
            
        Raises:
            GitError: 如果命令失败，抛出包含错误映射信息的 GitError 异常
        """
        success, stdout, stderr = self._run_command(
            ['rev-parse', '--abbrev-ref', 'HEAD'],
            repo_path
        )
        
        if success and stdout:
            # 如果返回 "HEAD"，说明处于 detached HEAD 状态
            if stdout == "HEAD":
                # 尝试获取当前 commit 所在的分支
                # 使用 git branch --contains HEAD 找到包含当前 commit 的分支
                branch_success, branch_stdout, branch_stderr = self._run_command(
                    ['branch', '--contains', 'HEAD'],
                    repo_path
                )
                
                if branch_success and branch_stdout:
                    # 解析分支列表，找到当前分支（带 * 标记的）
                    for line in branch_stdout.split('\n'):
                        line = line.strip()
                        if line.startswith('*'):
                            # 移除 * 和空格，获取分支名
                            branch_name = line.lstrip('* ').strip()
                            # 如果不是 detached HEAD 状态的描述，返回分支名
                            if not branch_name.startswith('(') and branch_name != 'HEAD':
                                return branch_name
                    
                    # 如果没有找到当前分支，返回第一个包含此 commit 的分支
                    lines = [l.strip().lstrip('* ').strip() for l in branch_stdout.split('\n') if l.strip()]
                    for line in lines:
                        if not line.startswith('(') and line != 'HEAD':
                            logger.debug(f"[GitUtils] {repo_path.name} 处于 detached HEAD，使用分支: {line}")
                            return line
                
                # 如果还是找不到，尝试从远程分支获取
                remote_success, remote_stdout, remote_stderr = self._run_command(
                    ['branch', '-r', '--contains', 'HEAD'],
                    repo_path
                )
                
                if remote_success and remote_stdout:
                    lines = remote_stdout.split('\n')
                    for line in lines:
                        line = line.strip()
                        if line and 'origin/' in line and '->' not in line:
                            # 移除 origin/ 前缀
                            branch_name = line.replace('origin/', '').strip()
                            logger.debug(f"[GitUtils] {repo_path.name} 处于 detached HEAD，使用远程分支: {branch_name}")
                            return branch_name
                
                # 如果所有方法都失败，返回默认分支
                logger.warning(f"[GitUtils] {repo_path.name} 处于 detached HEAD 状态且无法确定分支")
                default_branch = self.get_default_branch(repo_path)
                if default_branch:
                    return default_branch
                
                # 最后返回 None，让调用者处理
                return None
            
            return stdout
        else:
            # 如果失败且有错误输出，使用错误映射器映射错误并抛出 GitError
            if stderr:
                error_info = self.error_mapper.map_error(stderr)
                raise GitError(error_info)
            else:
                return None
    
    def get_default_branch(self, repo_path: Path) -> Optional[str]:
        """
        获取默认分支
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            默认分支名，失败返回 None
        """
        # 先尝试从远端获取
        success, stdout, _ = self._run_command(
            ['symbolic-ref', 'refs/remotes/origin/HEAD'],
            repo_path
        )
        
        if success and stdout:
            # 格式: refs/remotes/origin/main
            parts = stdout.split('/')
            if len(parts) >= 4:
                return parts[-1]
        
        # 如果失败，尝试常见的默认分支名
        for branch in ['main', 'master']:
            success, _, _ = self._run_command(
                ['rev-parse', '--verify', f'origin/{branch}'],
                repo_path
            )
            if success:
                return branch
        
        return None
    
    def get_commit_hash(self, repo_path: Path, ref: str = 'HEAD', short: bool = True) -> Optional[str]:
        """
        获取指定 ref 的提交 hash
        
        Args:
            repo_path: 仓库路径
            ref: 要查询的 ref（分支名、标签名、commit hash 等），默认为 HEAD
            short: 是否返回短 hash（7位）
            
        Returns:
            提交 hash，失败返回 None
            
        Raises:
            GitError: 如果命令失败，抛出包含错误映射信息的 GitError 异常
        """
        args = ['rev-parse']
        if short:
            args.append('--short=7')
        args.append(ref)
        
        success, stdout, stderr = self._run_command(args, repo_path)
        if success:
            return stdout
        else:
            # 如果失败且有错误输出，使用错误映射器映射错误并抛出 GitError
            if stderr:
                error_info = self.error_mapper.map_error(stderr)
                raise GitError(error_info)
            else:
                return None
    
    def get_commit_date(self, repo_path: Path, ref: str = 'HEAD') -> Optional[str]:
        """
        获取指定 ref 的提交时间
        
        Args:
            repo_path: 仓库路径
            ref: 要查询的 ref（分支名、标签名、commit hash 等），默认为 HEAD
            
        Returns:
            提交时间（ISO格式），失败返回 None
        """
        success, stdout, _ = self._run_command(
            ['log', '-1', '--format=%aI', ref],
            repo_path
        )
        return stdout if success else None
    
    def fetch(self, repo_path: Path) -> bool:
        """
        拉取远端更新
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            是否成功
        """
        success, _, _ = self._run_command(
            ['fetch', 'origin'],
            repo_path
        )
        return success
    
    def check_update_available_fast(
        self,
        repo_path: Path,
        timeout: int = 15,
        branch: Optional[str] = None
    ) -> Tuple[bool, str, str, Optional[str]]:
        """
        极速检测是否有更新（使用 ls-remote，不执行 fetch）
        
        核心优化：使用 git ls-remote 获取远程最新 hash，
        只传输几个 hash 字符串，网络开销极小，可以瞬间完成检测。
        
        Args:
            repo_path: 仓库路径
            timeout: 超时时间（秒），默认15秒
            branch: 指定分支名，None 时使用 --symref origin HEAD（向后兼容）
            
        Returns:
            Tuple[bool, str, str, Optional[str]]: 
                (has_update, local_hash, remote_hash, default_branch)
                - has_update: 是否有更新
                - local_hash: 本地 commit hash（短）
                - remote_hash: 远程最新 commit hash（短）
                - default_branch: 默认分支名（如 'main'），明确分支模式下为空字符串，失败返回 None
        """
        try:
            logger.debug(f"[GitUtils] 极速检测更新: {repo_path.name}, 分支: {branch or '默认(HEAD)'}")
            
            local_success, local_hash, local_stderr = self._run_command(
                ['rev-parse', '--short=7', 'HEAD'],
                repo_path,
                timeout=timeout
            )
            
            if not local_success:
                logger.warning(f"[GitUtils] 获取本地 hash 失败: {local_stderr}")
                return False, "", "", None
            
            if branch:
                # 明确分支模式：查询指定分支的远程 hash，锁定当前分支
                remote_success, remote_output, remote_stderr = self._run_command(
                    ['ls-remote', 'origin', branch],
                    repo_path,
                    timeout=timeout
                )
                
                if not remote_success or not remote_output:
                    logger.warning(f"[GitUtils] ls-remote origin/{branch} 失败: {remote_stderr}")
                    return False, local_hash, "", None
                
                # 精确过滤 refs/heads/{branch}，避免同名 tag 干扰
                target_ref = f'refs/heads/{branch}'
                remote_hash = ""
                for line in remote_output.strip().split('\n'):
                    line = line.strip()
                    if target_ref in line:
                        hash_parts = line.split()
                        if hash_parts and len(hash_parts[0]) >= 7:
                            remote_hash = hash_parts[0][:7]
                        break
                
                if not remote_hash:
                    logger.warning(f"[GitUtils] 无法从 ls-remote origin/{branch} 解析远程 hash (目标: {target_ref})")
                    return False, local_hash, "", None
                
                default_branch = None
                
            else:
                # 向后兼容：原有 --symref origin HEAD 逻辑
                remote_success, remote_output, remote_stderr = self._run_command(
                    ['ls-remote', '--symref', 'origin', 'HEAD'],
                    repo_path,
                    timeout=timeout
                )
                
                if not remote_success or not remote_output:
                    logger.warning(f"[GitUtils] ls-remote 失败: {remote_stderr}")
                    return False, local_hash, "", None
                
                default_branch = None
                remote_hash = ""
                
                lines = remote_output.strip().split('\n')
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    if line.startswith('ref:'):
                        parts = line.split()
                        if len(parts) >= 2:
                            branch_ref = parts[1]
                            if branch_ref.startswith('refs/heads/'):
                                default_branch = branch_ref.replace('refs/heads/', '')
                                logger.debug(f"[GitUtils] 检测到默认分支: {default_branch}")
                    elif len(line.split()) >= 1:
                        hash_parts = line.split()
                        if hash_parts[0] and len(hash_parts[0]) >= 7:
                            remote_hash = hash_parts[0][:7]
                            logger.debug(f"[GitUtils] 检测到远程 hash: {remote_hash}")
            
            if not remote_hash:
                logger.warning(f"[GitUtils] 无法从 ls-remote 输出解析远程 hash")
                return False, local_hash, "", default_branch
            
            has_update = (local_hash != remote_hash)
            
            logger.debug(
                f"[GitUtils] 极速检测完成: {repo_path.name}, "
                f"本地={local_hash}, 远程={remote_hash}, "
                f"有更新={has_update}, 默认分支={default_branch}"
            )
            
            return has_update, local_hash, remote_hash, default_branch
            
        except Exception as e:
            logger.error(f"[GitUtils] 极速检测异常: {str(e)}")
            return False, "", "", None
    
    def get_behind_commits(self, repo_path: Path, branch: Optional[str] = None) -> int:
        """
        获取落后的提交数
        
        Args:
            repo_path: 仓库路径
            branch: 分支名，None 使用当前分支
            
        Returns:
            落后的提交数，失败返回 0
        """
        if branch is None:
            branch = self.get_current_branch(repo_path)
            if not branch:
                logger.dev(f"[GitUtils] {repo_path.name} 无法获取当前分支")
                return 0
        
        logger.dev(f"[GitUtils] 计算 {repo_path.name} 在分支 {branch} 上落后的提交数")
        
        success, stdout, stderr = self._run_command(
            ['rev-list', '--count', f'HEAD..origin/{branch}'],
            repo_path
        )
        
        if not success:
            logger.dev(f"[GitUtils] {repo_path.name} 计算落后提交数失败: {stderr}")
            return 0
        
        if stdout.isdigit():
            count = int(stdout)
            logger.dev(f"[GitUtils] {repo_path.name} 落后 {count} 个提交")
            return count
        else:
            logger.dev(f"[GitUtils] {repo_path.name} 输出不是数字: {stdout}")
            return 0
    
    def get_commit_logs(
        self,
        repo_path: Path,
        from_ref: str = 'HEAD',
        to_ref: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        获取提交日志列表
        
        Args:
            repo_path: 仓库路径
            from_ref: 起始引用（默认 HEAD）
            to_ref: 结束引用（默认 origin/当前分支）
            
        Returns:
            提交日志列表，每项包含 hash, message, date
        """
        if to_ref is None:
            branch = self.get_current_branch(repo_path)
            if not branch:
                return []
            to_ref = f'origin/{branch}'
        
        # 格式: hash|message|date
        success, stdout, _ = self._run_command(
            ['log', f'{from_ref}..{to_ref}', '--format=%h|%s|%aI'],
            repo_path
        )
        
        if not success or not stdout:
            return []
        
        commits = []
        for line in stdout.split('\n'):
            if not line:
                continue
            
            parts = line.split('|', 2)
            if len(parts) >= 3:
                commits.append({
                    'hash': parts[0],
                    'message': parts[1],
                    'date': parts[2]
                })
        
        return commits
    
    def get_all_commits(
        self,
        repo_path: Path,
        limit: int = 20,
        branch: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        获取所有提交历史（不限于待更新的）
        
        当指定 branch 时，使用 origin/{branch} 作为远程引用，锁定当前分支
        当未指定 branch 时，使用 FETCH_HEAD（向后兼容）
        
        Args:
            repo_path: 仓库路径
            limit: 限制数量
            branch: 指定的分支名，None 时使用 FETCH_HEAD
            
        Returns:
            提交日志列表，每项包含 hash, message, date
        """
        logger.debug(f"[GitUtils] 获取 {repo_path.name} 的提交历史，限制: {limit}, 分支: {branch or 'FETCH_HEAD'}")
        
        fetch_success, fetch_stdout, fetch_stderr = self._run_command(
            ['fetch', '--quiet', 'origin'],
            repo_path
        )
        if not fetch_success:
            logger.debug(f"[GitUtils] {repo_path.name} fetch 失败: {fetch_stderr}")
        
        # 确定主查询引用：明确分支使用 origin/{branch}，否则使用 FETCH_HEAD
        primary_ref = f'origin/{branch}' if branch else 'FETCH_HEAD'
        
        success, stdout, stderr = self._run_command(
            ['log', primary_ref, f'-{limit}', '--format=%h|%s|%aI'],
            repo_path
        )
        
        if not success or not stdout:
            logger.debug(f"[GitUtils] {repo_path.name} 从 {primary_ref} 获取失败: {stderr}")
            logger.debug(f"[GitUtils] {repo_path.name} 尝试从 HEAD 获取")
            success, stdout, stderr = self._run_command(
                ['log', 'HEAD', f'-{limit}', '--format=%h|%s|%aI'],
                repo_path
            )
        
        if not success or not stdout:
            logger.debug(f"[GitUtils] {repo_path.name} 从 HEAD 获取失败: {stderr}")
            logger.debug(f"[GitUtils] {repo_path.name} 尝试获取所有可达的提交")
            success, stdout, stderr = self._run_command(
                ['log', '--all', f'-{limit}', '--format=%h|%s|%aI'],
                repo_path
            )
        
        if not success:
            logger.debug(f"[GitUtils] {repo_path.name} 获取提交历史失败: {stderr}")
            return []
        
        if not stdout:
            logger.debug(f"[GitUtils] {repo_path.name} 提交历史为空")
            return []
        
        logger.debug(f"[GitUtils] {repo_path.name} Git log 输出: {stdout[:200]}...")
        
        commits = []
        for line in stdout.split('\n'):
            if not line:
                continue
            
            parts = line.split('|', 2)
            if len(parts) >= 3:
                commits.append({
                    'hash': parts[0],
                    'message': parts[1],
                    'date': parts[2]
                })
        
        logger.debug(f"[GitUtils] {repo_path.name} 解析到 {len(commits)} 个提交")
        
        return commits
    
    def check_dirty_tree(self, repo_path: Path) -> Tuple[bool, List[str]]:
        """
        检测工作树是否有未提交的修改
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            (is_dirty, modified_files)
            - is_dirty: 是否有未提交的修改
            - modified_files: 修改的文件列表
        """
        success, stdout, stderr = self._run_command(
            ['status', '--porcelain'],
            repo_path
        )
        
        if not success:
            logger.debug(f"[GitUtils] {repo_path.name} 检测工作树状态失败: {stderr}")
            return False, []
        
        if not stdout or not stdout.strip():
            return False, []
        
        modified_files = []
        for line in stdout.strip().split('\n'):
            if line:
                modified_files.append(line.strip())
        
        logger.debug(f"[GitUtils] {repo_path.name} 检测到 {len(modified_files)} 个未提交的修改")
        return True, modified_files
    
    def update_submodules(
        self,
        repo_path: Path,
        timeout: int = 120
    ) -> Tuple[bool, str]:
        """
        更新 Git 子模块
        
        许多复杂插件（如 3D 渲染、外部库）使用 Git 子模块。
        只更新主仓库会导致子模块代码陈旧，启动 ComfyUI 时可能报错。
        
        Args:
            repo_path: 仓库路径
            timeout: 超时时间（秒），默认 120 秒
            
        Returns:
            (是否成功, 消息)
        """
        logger.debug(f"[GitUtils] {repo_path.name} 检查并更新子模块")
        
        success, stdout, stderr = self._run_command(
            ['submodule', 'update', '--init', '--recursive'],
            repo_path,
            timeout=timeout
        )
        
        if success:
            if stdout:
                logger.debug(f"[GitUtils] {repo_path.name} 子模块更新输出: {stdout[:200]}")
            return True, "子模块更新成功"
        else:
            logger.warning(f"[GitUtils] {repo_path.name} 子模块更新失败: {stderr}")
            return False, f"子模块更新失败: {stderr}"
    
    def pull(
        self, 
        repo_path: Path, 
        branch: Optional[str] = None, 
        force: bool = False,
        backup: bool = True,
        progress_callback: Optional[callable] = None
    ) -> Tuple[bool, str]:
        """
        拉取并合并更新(增强版 - 支持备份和回滚)
        
        增强功能:
        1. 更新前备份插件目录(可选)
        2. 更新失败时自动从备份恢复
        3. 更新成功后清理备份
        4. 支持进度回调
        
        Args:
            repo_path: 仓库路径
            branch: 分支名,None 使用当前分支
            force: 是否强制覆盖本地修改
            backup: 是否在更新前备份(默认True)
            progress_callback: 进度回调函数，接收 dict 参数
            
        Returns:
            (是否成功, 消息)
        """
        backup_path = None
        
        try:
            if branch is None:
                branch = self.get_current_branch(repo_path)
                if not branch:
                    return False, "无法获取当前分支"
            
            # 1. 更新前备份(如果启用)
            if backup:
                if progress_callback:
                    progress_callback({'stage': 'backup', 'progress': 10, 'message': f'正在备份 {repo_path.name}...'})
                try:
                    from .plugin_backup import backup_plugin, cleanup_backup
                    backup_path = backup_plugin(repo_path)
                    if backup_path:
                        logger.debug(f"[GitUtils] {repo_path.name} 已备份到: {backup_path}")
                    else:
                        logger.warning(f"[GitUtils] {repo_path.name} 备份失败,继续更新")
                except Exception as e:
                    logger.warning(f"[GitUtils] {repo_path.name} 备份异常: {e},继续更新")
            
            # 2. 执行Git更新
            if force:
                logger.debug(f"[GitUtils] {repo_path.name} 强制更新模式,将覆盖本地修改")
                
                if progress_callback:
                    progress_callback({'stage': 'fetching', 'progress': 30, 'message': f'正在拉取 {repo_path.name} 的远程更新...'})
                fetch_success, _, fetch_stderr = self._run_command(['fetch', 'origin'], repo_path)
                if not fetch_success:
                    raise Exception(f"拉取远程更新失败: {fetch_stderr}")
                
                if progress_callback:
                    progress_callback({'stage': 'pulling', 'progress': 50, 'message': f'正在强制更新 {repo_path.name}...'})
                success, stdout, stderr = self._run_command(
                    ['reset', '--hard', f'origin/{branch}'],
                    repo_path
                )
                
                if not success:
                    raise Exception(f"强制更新失败: {stderr}")
                
                submodule_success, submodule_msg = self.update_submodules(repo_path)
                if not submodule_success:
                    logger.warning(f"[GitUtils] {repo_path.name} 主仓库更新成功,但子模块更新失败: {submodule_msg}")
                
                result_msg = "更新成功(已覆盖本地修改)"
            else:
                if progress_callback:
                    progress_callback({'stage': 'pulling', 'progress': 40, 'message': f'正在更新 {repo_path.name}...'})
                success, stdout, stderr = self._run_command(
                    ['pull', '--rebase', '--autostash', 'origin', branch],
                    repo_path
                )
                
                if not success:
                    raise Exception(stderr)
                
                if progress_callback:
                    progress_callback({'stage': 'pulled', 'progress': 60, 'message': f'{repo_path.name} 代码更新完成'})
                submodule_success, submodule_msg = self.update_submodules(repo_path)
                if not submodule_success:
                    logger.warning(f"[GitUtils] {repo_path.name} 主仓库更新成功,但子模块更新失败: {submodule_msg}")
                
                if stdout:
                    import re
                    match = re.search(r'Updating\s+([0-9a-f]+)\.\.([0-9a-f]+)', stdout)
                    if match:
                        result_msg = f"更新成功 ({match.group(1)[:7]}..{match.group(2)[:7]})"
                    elif 'Already up to date' in stdout or 'Already up-to-date' in stdout:
                        result_msg = "已是最新版本"
                    else:
                        result_msg = "更新成功"
                else:
                    result_msg = "更新成功"
            
            # 3. 更新成功,清理备份
            if backup_path:
                try:
                    from .plugin_backup import cleanup_backup
                    cleanup_backup(backup_path)
                    logger.debug(f"[GitUtils] {repo_path.name} 已清理备份")
                except Exception as e:
                    logger.warning(f"[GitUtils] {repo_path.name} 清理备份失败: {e}")
            
            return True, result_msg
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[GitUtils] {repo_path.name} 更新失败: {error_msg}")
            
            # 4. 更新失败,从备份恢复
            if backup_path and backup_path.exists():
                try:
                    from .plugin_backup import restore_plugin, cleanup_backup
                    logger.info(f"[GitUtils] {repo_path.name} 更新失败,正在从备份恢复...")
                    restore_success = restore_plugin(backup_path, repo_path)
                    
                    if restore_success:
                        logger.info(f"[GitUtils] {repo_path.name} 已从备份恢复")
                        error_msg = f"更新失败(已回滚): {error_msg}"
                    else:
                        logger.error(f"[GitUtils] {repo_path.name} 从备份恢复失败")
                        error_msg = f"更新失败且回滚失败: {error_msg}"
                    
                    cleanup_backup(backup_path)
                except Exception as restore_error:
                    logger.error(f"[GitUtils] {repo_path.name} 回滚异常: {restore_error}")
                    error_msg = f"更新失败且回滚异常: {error_msg}"
            
            return False, error_msg
    
    def checkout(self, repo_path: Path, branch: str) -> Tuple[bool, str]:
        """
        切换分支
        
        Args:
            repo_path: 仓库路径
            branch: 分支名
            
        Returns:
            (是否成功, 消息)
        """
        success, stdout, stderr = self._run_command(
            ['checkout', branch],
            repo_path
        )
        
        message = stdout if success else stderr
        return success, message
    
    def checkout_commit(
        self,
        repo_path: Path,
        commit_hash: str,
        force: bool = False,
        backup: bool = True,
        progress_callback: Optional[callable] = None
    ) -> Tuple[bool, str]:
        """
        切换到指定 commit（增强版 - 支持备份和回滚）
        
        增强功能:
        1. 切换前备份插件目录(可选)
        2. 切换失败时自动从备份恢复
        3. 切换成功后清理备份
        4. 支持进度回调
        
        Args:
            repo_path: 仓库路径
            commit_hash: 目标 commit hash
            force: 是否强制覆盖本地修改
            backup: 是否在切换前备份(默认True)
            progress_callback: 进度回调函数，接收 dict 参数
            
        Returns:
            (是否成功, 消息)
        """
        backup_path = None
        
        try:
            if progress_callback:
                progress_callback({'stage': 'preparing', 'progress': 5, 'message': f'正在准备切换 {repo_path.name} 的版本...'})
            
            if backup:
                if progress_callback:
                    progress_callback({'stage': 'backup', 'progress': 10, 'message': f'正在备份 {repo_path.name}...'})
                try:
                    from .plugin_backup import backup_plugin
                    backup_path = backup_plugin(repo_path)
                    if backup_path:
                        logger.debug(f"[GitUtils] {repo_path.name} 已备份到: {backup_path}")
                    else:
                        logger.warning(f"[GitUtils] {repo_path.name} 备份失败,继续切换")
                except Exception as e:
                    logger.warning(f"[GitUtils] {repo_path.name} 备份异常: {e},继续切换")
            
            if progress_callback:
                progress_callback({'stage': 'switching', 'progress': 30, 'message': f'正在切换 {repo_path.name} 到 {commit_hash[:7]}...'})
            
            if force:
                success, stdout, stderr = self._run_command(
                    ['reset', '--hard', commit_hash],
                    repo_path
                )
            else:
                success, stdout, stderr = self._run_command(
                    ['checkout', commit_hash],
                    repo_path
                )
            
            if not success:
                raise Exception(stderr)
            
            if progress_callback:
                progress_callback({'stage': 'switched', 'progress': 60, 'message': f'{repo_path.name} 版本切换完成'})
            
            submodule_success, submodule_msg = self.update_submodules(repo_path)
            if not submodule_success:
                logger.warning(f"[GitUtils] {repo_path.name} 版本切换成功,但子模块更新失败: {submodule_msg}")
            
            if backup_path:
                try:
                    from .plugin_backup import cleanup_backup
                    cleanup_backup(backup_path)
                    logger.debug(f"[GitUtils] {repo_path.name} 已清理备份")
                except Exception as e:
                    logger.warning(f"[GitUtils] {repo_path.name} 清理备份失败: {e}")
            
            result_msg = f"版本切换成功 ({commit_hash[:7]})"
            return True, result_msg
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[GitUtils] {repo_path.name} 版本切换失败: {error_msg}")
            
            if backup_path and backup_path.exists():
                try:
                    from .plugin_backup import restore_plugin, cleanup_backup
                    logger.info(f"[GitUtils] {repo_path.name} 版本切换失败,正在从备份恢复...")
                    restore_success = restore_plugin(backup_path, repo_path)
                    
                    if restore_success:
                        logger.info(f"[GitUtils] {repo_path.name} 已从备份恢复")
                        error_msg = f"版本切换失败(已回滚): {error_msg}"
                    else:
                        logger.error(f"[GitUtils] {repo_path.name} 从备份恢复失败")
                        error_msg = f"版本切换失败且回滚失败: {error_msg}"
                    
                    cleanup_backup(backup_path)
                except Exception as restore_error:
                    logger.error(f"[GitUtils] {repo_path.name} 回滚异常: {restore_error}")
                    error_msg = f"版本切换失败且回滚异常: {error_msg}"
            
            if progress_callback:
                progress_callback({'stage': 'error', 'progress': -1, 'message': error_msg})
            
            return False, error_msg
    
    def get_branches(self, repo_path: Path) -> List[Dict[str, any]]:
        """
        获取分支列表（增强版 - 包含每个分支的详细信息）
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            分支列表，每项包含:
            - name: 分支名称
            - is_current: 是否为当前分支
            - is_default: 是否为默认分支
            - commit_hash: 提交哈希
            - commit_date: 提交日期
        """
        # 获取当前分支
        current_branch = self.get_current_branch(repo_path)
        
        # 获取默认分支
        default_branch = self.get_default_branch(repo_path)
        
        # 获取远程分支列表
        success, stdout, _ = self._run_command(
            ['branch', '-r'],
            repo_path
        )
        
        if not success or not stdout:
            return []
        
        branches = []
        for line in stdout.split('\n'):
            line = line.strip()
            if not line or '->' in line:  # 跳过 HEAD 指向
                continue
            
            # 移除 origin/ 前缀
            branch_name = line.replace('origin/', '').strip()
            if not branch_name:
                continue
            
            # 获取该分支的 commit hash 和 date
            commit_hash = self.get_commit_hash(repo_path, ref=f'origin/{branch_name}', short=True) or ''
            commit_date = self.get_commit_date(repo_path, ref=f'origin/{branch_name}') or ''
            
            branches.append({
                'name': branch_name,
                'is_current': branch_name == current_branch,
                'is_default': branch_name == default_branch,
                'commit_hash': commit_hash,
                'commit_date': commit_date
            })
        
        return branches

    def get_git_version(self) -> Optional[str]:
        """
        获取 Git 版本号
        
        用于检查 Git 版本是否支持 safe.directory 功能（>= 2.35.2）
        
        Returns:
            版本号字符串（如 "2.35.2"），失败返回 None
        """
        try:
            # Windows 平台隐藏控制台窗口
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                [self.git_path, '--version'],
                capture_output=True,
                text=True,
                timeout=5,
                encoding='utf-8',
                errors='replace',
                creationflags=creation_flags
            )
            
            if result.returncode != 0:
                return None
            
            # 输出格式: "git version 2.35.2.windows.1"
            # 提取版本号
            output = result.stdout.strip()
            match = re.search(r'git version (\d+\.\d+\.\d+)', output)
            if match:
                return match.group(1)
            
            return None
            
        except Exception:
            return None
    
    def is_safe_directory_supported(self) -> bool:
        """
        检查当前 Git 版本是否支持 safe.directory 功能
        
        safe.directory 功能在 Git 2.35.2 版本引入
        
        Returns:
            是否支持
        """
        version = self.get_git_version()
        if not version:
            return False
        
        try:
            # 解析版本号
            parts = version.split('.')
            if len(parts) < 3:
                return False
            
            major = int(parts[0])
            minor = int(parts[1])
            patch = int(parts[2])
            
            # 检查版本是否 >= 2.35.2
            if major > 2:
                return True
            if major == 2:
                if minor > 35:
                    return True
                if minor == 35 and patch >= 2:
                    return True
            
            return False
            
        except (ValueError, IndexError):
            return False
    
    def check_safe_directory_issue(
        self,
        repo_path: Path
    ) -> Tuple[bool, Optional[str]]:
        """
        检查仓库是否存在 safe.directory 问题
        
        通过执行简单的 Git 命令（git status）并检查错误输出
        来判断是否存在所有权问题
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            (是否有问题, 错误信息)
            - (False, None): 无权限问题
            - (True, error_msg): 有权限问题
        """
        try:
            # 检查路径是否存在
            if not repo_path.exists():
                return True, f"仓库路径不存在: {repo_path}"
            
            # 检查是否为 Git 仓库
            if not self.is_git_repo(repo_path):
                return True, f"不是有效的 Git 仓库: {repo_path}"
            
            # 执行 git status 命令，不使用 safe.directory 配置
            # 这样可以检测到所有权问题
            
            # Windows 平台隐藏控制台窗口
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                [self.git_path, 'status'],
                cwd=str(repo_path),
                capture_output=True,
                text=True,
                timeout=10,
                encoding='utf-8',
                errors='replace',
                creationflags=creation_flags
            )
            
            # 检查错误输出中是否包含 safe.directory 相关的错误
            stderr = result.stderr.lower()
            
            # Git 2.35.2+ 的所有权错误特征
            ownership_keywords = [
                'fatal: detected dubious ownership',
                'fatal: unsafe repository',
                'safe.directory'
            ]
            
            for keyword in ownership_keywords:
                if keyword in stderr:
                    return True, result.stderr.strip()
            
            # 如果命令成功或者是其他类型的错误，认为没有所有权问题
            return False, None
            
        except subprocess.TimeoutExpired:
            return True, "检测超时（10秒）"
        except Exception as e:
            return True, f"检测失败: {str(e)}"
    
    def add_safe_directory(
        self,
        repo_path: Path
    ) -> Tuple[bool, str]:
        """
        将仓库添加到 Git 全局安全目录列表
        
        执行命令: git config --global --add safe.directory <path>
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            (是否成功, 消息)
        """
        try:
            # 检查路径是否存在
            if not repo_path.exists():
                return False, f"仓库路径不存在: {repo_path}"
            
            # 转换为绝对路径
            abs_path = repo_path.resolve()
            
            # Windows 平台隐藏控制台窗口
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            # 执行 git config --global --add safe.directory 命令
            result = subprocess.run(
                [self.git_path, 'config', '--global', '--add', 'safe.directory', str(abs_path)],
                capture_output=True,
                text=True,
                timeout=10,
                encoding='utf-8',
                errors='replace',
                creationflags=creation_flags
            )
            
            if result.returncode == 0:
                return True, f"成功添加到 safe.directory: {abs_path}"
            else:
                error_msg = result.stderr.strip() if result.stderr else "未知错误"
                return False, f"添加失败: {error_msg}"
            
        except subprocess.TimeoutExpired:
            return False, "操作超时（10秒）"
        except Exception as e:
            return False, f"操作失败: {str(e)}"
    
    def validate_remote_url(self, url: str) -> Tuple[bool, str]:
        """
        验证远端地址格式是否有效
        
        Args:
            url: 远端仓库地址
            
        Returns:
            (是否有效, 错误消息)
        """
        if not url or not url.strip():
            return False, "地址不能为空"
        
        url = url.strip()
        
        patterns = [
            r'^https?://.+\.git$',
            r'^https?://github\.com/[^/]+/[^/]+$',
            r'^https?://gitlab\.com/[^/]+/[^/]+$',
            r'^git@[^:]+:[^/]+/[^/]+\.git$',
            r'^git://.+\.git$',
        ]
        
        for pattern in patterns:
            if re.match(pattern, url):
                return True, ""
        
        return False, "无效的 Git 仓库地址格式"
    
    def add_remote_url(self, repo_path: Path, url: str) -> Tuple[bool, str]:
        """
        添加或更新远端地址
        
        Args:
            repo_path: 仓库路径
            url: 远端仓库地址
            
        Returns:
            (是否成功, 消息)
        """
        try:
            success, stdout, _ = self._run_command(['remote'], repo_path)
            has_origin = success and 'origin' in stdout
            
            if has_origin:
                success, _, stderr = self._run_command(
                    ['remote', 'set-url', 'origin', url],
                    repo_path
                )
            else:
                success, _, stderr = self._run_command(
                    ['remote', 'add', 'origin', url],
                    repo_path
                )
            
            if success:
                return True, "远端地址设置成功"
            else:
                return False, stderr or "设置远端地址失败"
                
        except Exception as e:
            return False, f"设置远端地址失败: {str(e)}"
