"""
Git 管理器
用于管理 Git 操作
"""

import subprocess
import platform
import re
import os
import threading
from typing import Dict, List, Optional, Callable
from pathlib import Path
from datetime import datetime

from ..utils.logger import app_logger as logger
from .version_cache import _parse_version


class GitManager:
    """Git 操作管理器"""
    
    def __init__(self, repo_path: str = None):
        """
        初始化 Git 管理器
        
        Args:
            repo_path: Git 仓库路径
        """
        self._repo_path_str = str(Path(repo_path)) if repo_path else None
        self._git_executable = self._find_git_executable()
        self._proxy_config = None
        self._release_notes_service = None
        self._version_cache = None
        self._background_update_callbacks: Dict[str, Callable] = {}
        self._background_update_lock = threading.Lock()
    
    @property
    def repo_path(self) -> Path:
        """Git 仓库路径（Path 对象）"""
        return Path(self._repo_path_str) if self._repo_path_str else None
    
    def _get_release_notes_service(self):
        """
        获取 Release Notes 服务实例（延迟初始化）
        
        Returns:
            ReleaseNotesService 实例
        """
        if self._release_notes_service is None:
            from .release_notes_service import ReleaseNotesService
            self._release_notes_service = ReleaseNotesService()
        
        proxy_config = self._get_proxy_config()
        self._release_notes_service.set_proxy_config(proxy_config)
        
        return self._release_notes_service
    
    def _get_version_cache(self):
        """
        获取版本缓存实例（延迟初始化）
        
        Returns:
            VersionCache 实例
        """
        if self._version_cache is None:
            from .version_cache import VersionCache
            self._version_cache = VersionCache()
        
        return self._version_cache
    
    def set_background_update_callback(self, key: str, callback: Callable):
        """
        设置后台更新回调函数
        
        Args:
            key: 回调标识（如 'version_list_updated'）
            callback: 回调函数，接收参数 (version_type, page, data)
        """
        with self._background_update_lock:
            self._background_update_callbacks[key] = callback
    
    def remove_background_update_callback(self, key: str):
        """
        移除后台更新回调函数
        
        Args:
            key: 回调标识
        """
        with self._background_update_lock:
            self._background_update_callbacks.pop(key, None)
    
    def _trigger_background_update(
        self,
        version_type: str,
        page: int,
        page_size: int,
        branch: str = None
    ):
        """
        触发后台更新任务
        
        Args:
            version_type: 版本类型
            page: 页码
            page_size: 每页数量
            branch: 分支名称
        """
        def _update_task():
            try:
                logger.debug(f"[GitManager] 后台更新任务开始: {version_type}, page={page}")
                
                result = self._fetch_versions_from_git(version_type, page, page_size, branch)
                
                if "error_type" not in result:
                    cache = self._get_version_cache()
                    if self._repo_path_str:
                        cache.set_cache(
                            self._repo_path_str,
                            version_type,
                            page,
                            {
                                "versions": result.get("versions", []),
                                "has_more": result.get("has_more", False)
                            },
                            branch
                        )
                    
                    with self._background_update_lock:
                        callbacks = self._background_update_callbacks.copy()
                    
                    for callback in callbacks.values():
                        try:
                            callback(version_type, page, result)
                        except Exception as cb_error:
                            logger.warning(f"[GitManager] 后台更新回调执行失败: {cb_error}")
                    
                    logger.debug(f"[GitManager] 后台更新任务完成: {version_type}, page={page}")
                else:
                    logger.warning(f"[GitManager] 后台更新失败: {result.get('error_type')}")
                    
            except Exception as e:
                logger.error(f"[GitManager] 后台更新任务异常: {str(e)}")
        
        thread = threading.Thread(target=_update_task, daemon=True)
        thread.start()
    
    def clear_version_cache(self, version_type: str = None) -> bool:
        """
        清除版本列表缓存
        
        Args:
            version_type: 版本类型，如果为 None 则清除所有类型
            
        Returns:
            是否成功
        """
        if not self._repo_path_str:
            return False
        
        cache = self._get_version_cache()
        return cache.clear_cache(self._repo_path_str, version_type)
    
    def _find_git_executable(self) -> str:
        """
        查找 Git 可执行文件
        
        优先使用项目内置的 MinGit
        
        Returns:
            Git 可执行文件路径
        """
        from ..utils.git_config import get_git_executable
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
        
        同时会清除系统中可能存在的错误代理配置。
        
        Returns:
            dict: 代理配置环境变量字典，包含所有代理相关变量
        """
        if self._proxy_config is not None:
            return self._proxy_config if self._proxy_config else self._get_clear_proxy_config()
        
        try:
            from backend.src.core.settings_manager import SettingsManager
            
            settings_manager = SettingsManager()
            result = settings_manager.get_settings()
            
            if not result.get("success"):
                self._proxy_config = self._get_clear_proxy_config()
                return self._proxy_config
            
            settings = result.get("settings", {})
            proxy = settings.get("proxy", {})
            
            if not proxy.get("enabled"):
                self._proxy_config = self._get_clear_proxy_config()
                return self._proxy_config
            
            host = proxy.get("host", "").strip()
            port = proxy.get("port", "").strip()
            
            if not host or not port:
                logger.warning("[GitManager] 代理配置不完整")
                self._proxy_config = self._get_clear_proxy_config()
                return self._proxy_config
            
            proxy_url = f"http://{host}:{port}"
            
            if not self._validate_proxy_url(proxy_url):
                logger.error(f"[GitManager] 无效的代理 URL 格式: {proxy_url}")
                self._proxy_config = self._get_clear_proxy_config()
                return self._proxy_config
            
            proxy_config = {
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
            
            self._proxy_config = proxy_config
            return proxy_config
        except Exception as e:
            logger.error(f"[GitManager] 获取代理配置失败: {str(e)}")
            self._proxy_config = self._get_clear_proxy_config()
            return self._proxy_config
    
    def refresh_proxy_config(self):
        """刷新代理配置缓存（当用户修改代理设置时调用）"""
        self._proxy_config = None
        if self._release_notes_service:
            self._release_notes_service.set_proxy_config(None)
    
    def _is_ownership_error(self, error_msg: str) -> bool:
        """
        判断是否为所有权错误
        
        Args:
            error_msg: 错误信息
            
        Returns:
            bool: 是否为所有权错误
        """
        if not error_msg:
            return False
        
        error_lower = error_msg.lower()
        keywords = [
            'dubious ownership',
            'detected dubious ownership',
            'safe.directory'
        ]
        
        return any(keyword in error_lower for keyword in keywords)
    
    def _is_fetch_ref_error(self, error_msg: str) -> bool:
        """
        判断是否为 fetch ref 错误（远程分支被 force push 导致）
        
        Args:
            error_msg: 错误信息
            
        Returns:
            bool: 是否为 fetch ref 错误
        """
        if not error_msg:
            return False
        
        return 'incorrect old value provided' in error_msg.lower()
    
    def _fix_fetch_ref_error(self) -> bool:
        """
        修复 fetch ref 错误（清理过期的远程跟踪分支引用）
        
        Returns:
            bool: 修复是否成功
        """
        try:
            logger.debug("[GitManager] 尝试清理过期的远程分支引用...")
            
            result = self._run_git_command(['remote', 'prune', 'origin'], retry_on_ownership_error=False)
            if result["success"]:
                logger.debug("[GitManager] 清理过期远程分支引用成功")
                return True
            
            logger.warning(f"[GitManager] remote prune 失败，尝试强制 fetch: {result.get('error', '')}")
            force_result = self._run_git_command(['fetch', 'origin', '--prune', '--force'], retry_on_ownership_error=False)
            if force_result["success"]:
                logger.debug("[GitManager] 强制 fetch 成功")
                return True
            
            logger.warning(f"[GitManager] 强制 fetch 也失败: {force_result.get('error', '')}")
            return False
        except Exception as e:
            logger.error(f"[GitManager] 修复 fetch ref 错误失败: {str(e)}")
            return False
    
    def _fix_ownership_issue(self) -> bool:
        """
        修复 Git 仓库所有权问题
        
        执行命令：git config --global --add safe.directory <repo_path>
        
        Returns:
            bool: 修复是否成功
        """
        try:
            if not self.repo_path:
                logger.warning("[GitManager] 仓库路径未设置，无法修复")
                return False
            
            # 规范化路径（处理 Windows 路径）
            repo_path_str = str(self.repo_path).replace('\\', '/')
            
            cmd = [
                self._git_executable,
                'config',
                '--global',
                '--add',
                'safe.directory',
                repo_path_str
            ]
            
            logger.debug(f"[GitManager] 执行修复命令: {' '.join(cmd)}")
            
            # Windows 平台需要隐藏控制台窗口
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10,
                encoding='utf-8',
                errors='replace',
                creationflags=creation_flags
            )
            
            if result.returncode == 0:
                logger.debug(f"[GitManager] 所有权问题修复成功")
                return True
            else:
                logger.error(f"[GitManager] 修复失败: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.warning("[GitManager] 修复命令执行超时")
            return False
        except Exception as e:
            logger.error(f"[GitManager] 修复所有权问题失败: {str(e)}")
            return False
    
    def _run_git_command(self, args: List[str], cwd: Optional[Path] = None, retry_on_ownership_error: bool = True, timeout: Optional[int] = None) -> Dict:
        """
        执行 Git 命令（带镜像源 fallback 机制）
        
        Args:
            args: Git 命令参数
            cwd: 工作目录
            retry_on_ownership_error: 遇到所有权错误时是否自动修复并重试
            timeout: 超时时间（秒），None 使用默认值 30 秒
            
        Returns:
            包含 success, output, error 的字典
        """
        try:
            work_dir = cwd or self.repo_path
            if not work_dir:
                return {
                    "success": False,
                    "error": "未设置仓库路径"
                }
            
            proxy_config = self._get_proxy_config()
            proxy_url = proxy_config.get('HTTP_PROXY', '')
            
            base_env = os.environ.copy()
            base_env.update(proxy_config)
            base_env["GIT_TERMINAL_PROMPT"] = "0"
            
            creation_flags = 0
            if platform.system() == "Windows":
                creation_flags = subprocess.CREATE_NO_WINDOW
            
            cmd = [
                self._git_executable,
                '-c', f'http.proxy={proxy_url}',
                '-c', f'https.proxy={proxy_url}',
            ] + args
            
            logger.dev(f"[GitManager] 执行 Git 命令 | 路径: {self._git_executable} | 命令: {' '.join(args[:3])}{'...' if len(args) > 3 else ''} | 目录: {work_dir.name}")
            
            mirrors_to_try = self._get_git_mirror_priority_list()
            last_error = ""
            
            for attempt, mirror in enumerate(mirrors_to_try):
                env = base_env.copy()
                
                if mirror:
                    env["GIT_CONFIG_COUNT"] = "1"
                    env["GIT_CONFIG_KEY_0"] = f"url.https://{mirror}/.insteadOf"
                    env["GIT_CONFIG_VALUE_0"] = "https://github.com/"
                    logger.dev(f"[GitManager] 尝试镜像 ({attempt + 1}/{len(mirrors_to_try)}): {mirror}")
                else:
                    logger.dev(f"[GitManager] 尝试直连 GitHub ({attempt + 1}/{len(mirrors_to_try)})")
                
                result = subprocess.run(
                    cmd,
                    cwd=str(work_dir),
                    capture_output=True,
                    text=True,
                    timeout=timeout or 30,
                    encoding='utf-8',
                    errors='replace',
                    env=env,
                    creationflags=creation_flags
                )
                
                if result.returncode == 0:
                    if attempt > 0:
                        logger.dev(f"[GitManager] 镜像 fallback 成功: {mirror or '直连 GitHub'}")
                    return {
                        "success": True,
                        "output": result.stdout.strip(),
                        "error": ""
                    }
                
                error_msg = result.stderr.strip()
                last_error = error_msg
                
                if self._is_mirror_failure(error_msg):
                    if mirror:
                        logger.warning(f"[GitManager] 镜像 {mirror} 失败: {error_msg[:100]}")
                    continue
                else:
                    break
            
            if retry_on_ownership_error and self._is_ownership_error(last_error):
                logger.warning(f"[GitManager] 检测到所有权问题，尝试自动修复...")
                
                if self._fix_ownership_issue():
                    logger.debug(f"[GitManager] 所有权问题修复成功，重试命令...")
                    return self._run_git_command(args, cwd, retry_on_ownership_error=False)
                else:
                    return {
                        "success": False,
                        "error": (
                            f"Git 仓库权限问题\n"
                            f"仓库路径：{self.repo_path}\n"
                            f"请尝试手动修复或联系管理员"
                        )
                    }
            
            return {
                "success": False,
                "output": "",
                "error": last_error
            }
            
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Git 命令执行超时"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_git_mirror_priority_list(self) -> List[Optional[str]]:
        """
        获取 Git 镜像优先级列表
        
        Returns:
            镜像列表，None 表示直连 GitHub
        """
        mirrors = []
        try:
            from backend.src.utils.github_mirror import github_mirror_manager
            
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
            logger.dev(f"[GitManager] 获取镜像优先级列表失败: {e}")
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
    
    def get_versions(self, version_type: str = 'stable', page: int = 1, page_size: int = 20, branch: str = None, force_refresh: bool = False) -> Dict:
        """
        获取版本列表（带缓存和增量获取）
        
        优先返回缓存数据，支持增量获取新标签/提交。
        
        Args:
            version_type: 版本类型 ('stable' 或 'dev')
            page: 页码
            page_size: 每页数量
            branch: 指定分支名称（可选，如果不提供则使用当前 HEAD 指向的分支）
            force_refresh: 是否强制全量刷新
            
        Returns:
            dict: 版本列表，包含错误类型和详细信息
        """
        if not self._repo_path_str:
            return {
                "versions": [],
                "has_more": False,
                "error_type": "no_repo",
                "error": "未设置仓库路径"
            }
        
        cache = self._get_version_cache()
        
        if force_refresh:
            logger.info(f"[GitManager] 强制全量刷新: {version_type}")
            cache.clear_cache(self._repo_path_str, version_type)
        
        if version_type == 'stable':
            return self._get_versions_stable_incremental(cache, page, page_size, force_refresh)
        else:
            return self._get_versions_dev_incremental(cache, page, page_size, branch, force_refresh)
    
    def _get_versions_stable_incremental(self, cache, page: int, page_size: int, force_refresh: bool) -> Dict:
        """
        增量获取 stable 版本列表
        
        优先返回缓存数据，后台检测更新
        
        Args:
            cache: 缓存实例
            page: 页码
            page_size: 每页数量
            force_refresh: 是否强制刷新
            
        Returns:
            dict: 版本列表
        """
        from .version_cache import STABLE_CACHE_DURATION
        
        if not force_refresh:
            cached_details = cache.get_all_cached_tags(self._repo_path_str)
            
            if cached_details:
                cache_age = cache.get_cache_age(self._repo_path_str, "stable")
                is_expired = cache_age > STABLE_CACHE_DURATION.total_seconds()
                
                sorted_tags = sorted(cached_details.keys(), key=_parse_version, reverse=True)
                start_idx = (page - 1) * page_size
                end_idx = start_idx + page_size
                page_tags = sorted_tags[start_idx:end_idx]
                versions = [cached_details[tag] for tag in page_tags if tag in cached_details]
                
                if not is_expired:
                    logger.debug(f"[GitManager] 缓存未过期，直接返回缓存数据: {len(cached_details)} 个标签")
                    return {
                        "versions": versions,
                        "has_more": end_idx < len(sorted_tags),
                        "fromCache": True,
                        "cacheAge": cache_age,
                        "isUpdating": False,
                        "totalCached": len(cached_details),
                        "newTagsCount": 0,
                        "needBackgroundUpdate": False
                    }
                
                logger.debug(f"[GitManager] 缓存已过期，先返回缓存数据，触发后台更新")
                self._trigger_background_stable_update(cache, page, page_size)
                
                return {
                    "versions": versions,
                    "has_more": end_idx < len(sorted_tags),
                    "fromCache": True,
                    "cacheAge": cache_age,
                    "isUpdating": True,
                    "totalCached": len(cached_details),
                    "newTagsCount": 0,
                    "needBackgroundUpdate": True
                }
        
        try:
            fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
            if not fetch_result["success"]:
                error_msg = fetch_result.get('error', '')
                if self._is_ownership_error(error_msg):
                    return {
                        "versions": [],
                        "has_more": False,
                        "error_type": "ownership",
                        "error": error_msg,
                        "repo_path": str(self.repo_path) if self.repo_path else ""
                    }
            
            result = self._run_git_command(['tag', '-l', '--sort=-version:refname'])
            if not result["success"]:
                error_msg = result["error"]
                if self._is_ownership_error(error_msg):
                    return {
                        "versions": [],
                        "has_more": False,
                        "error_type": "ownership",
                        "error": error_msg,
                        "repo_path": str(self.repo_path) if self.repo_path else ""
                    }
                raise Exception(error_msg)
            
            all_tags = result["output"].split('\n') if result["output"] else []
            all_tags = [t for t in all_tags if t]
            
            if not all_tags:
                return {
                    "versions": [],
                    "has_more": False,
                    "error_type": "no_tags",
                    "error": "仓库中没有任何标签（稳定版本）",
                    "repo_path": str(self.repo_path) if self.repo_path else ""
                }
            
            cached_details = cache.get_all_cached_tags(self._repo_path_str)
            all_known_tags = cache.get_all_known_tags(self._repo_path_str)
            
            new_tags = [t for t in all_tags if t not in all_known_tags]
            
            if new_tags:
                logger.info(f"[GitManager] 发现 {len(new_tags)} 个新标签，开始增量获取")
                
                new_details = {}
                release_notes_service = self._get_release_notes_service()
                
                for tag in new_tags:
                    tag_info = self._get_tag_info(tag)
                    if tag_info:
                        new_details[tag] = tag_info
                
                if new_details:
                    try:
                        version_tags = list(new_details.keys())
                        release_notes = release_notes_service.get_release_notes(version_tags)
                        
                        for tag, details in new_details.items():
                            normalized_tag = release_notes_service._normalize_version(tag)
                            if normalized_tag in release_notes:
                                release_info = release_notes[normalized_tag]
                                details['releaseNotesHtml'] = release_info.release_notes_html
                                details['releaseName'] = release_info.name
                                details['releaseUrl'] = release_info.url
                                if release_info.published_at:
                                    details['publishedAt'] = release_info.published_at
                    except Exception as e:
                        logger.warning(f"[GitManager] 获取 Release Notes 失败: {e}")
                
                cache.set_tag_details(self._repo_path_str, new_details, all_tags)
                
                if force_refresh:
                    cache.set_last_full_refresh(self._repo_path_str, "stable")
            
            cached_details = cache.get_all_cached_tags(self._repo_path_str)
            
            sorted_tags = sorted(cached_details.keys(), key=_parse_version, reverse=True)
            
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            page_tags = sorted_tags[start_idx:end_idx]
            
            versions = [cached_details[tag] for tag in page_tags if tag in cached_details]
            
            return {
                "versions": versions,
                "has_more": end_idx < len(sorted_tags),
                "fromCache": len(new_tags) == 0,
                "cacheAge": cache.get_cache_age(self._repo_path_str, "stable"),
                "isUpdating": False,
                "totalCached": len(cached_details),
                "newTagsCount": len(new_tags),
                "needBackgroundUpdate": False
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[GitManager] 获取 stable 版本列表失败: {error_msg}")
            
            if self._is_ownership_error(error_msg):
                return {
                    "versions": [],
                    "has_more": False,
                    "error_type": "ownership",
                    "error": error_msg,
                    "repo_path": str(self.repo_path) if self.repo_path else ""
                }
            
            return {
                "versions": [],
                "has_more": False,
                "error_type": "unknown",
                "error": error_msg,
                "repo_path": str(self.repo_path) if self.repo_path else ""
            }
    
    def _trigger_background_stable_update(self, cache, page: int, page_size: int):
        """
        触发后台 stable 版本更新
        
        Args:
            cache: 缓存实例
            page: 页码
            page_size: 每页数量
        """
        def _update_task():
            try:
                logger.debug(f"[GitManager] 后台更新 stable 版本开始")
                
                fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
                if not fetch_result["success"]:
                    error_msg = fetch_result.get('error', '')
                    if self._is_ownership_error(error_msg):
                        logger.warning(f"[GitManager] 后台更新失败（权限问题）: {error_msg}")
                        return
                
                result = self._run_git_command(['tag', '-l', '--sort=-version:refname'])
                if not result["success"]:
                    logger.warning(f"[GitManager] 后台更新失败: {result.get('error', '')}")
                    return
                
                all_tags = result["output"].split('\n') if result["output"] else []
                all_tags = [t for t in all_tags if t]
                
                if not all_tags:
                    return
                
                all_known_tags = cache.get_all_known_tags(self._repo_path_str)
                new_tags = [t for t in all_tags if t not in all_known_tags]
                
                if new_tags:
                    logger.info(f"[GitManager] 后台更新发现 {len(new_tags)} 个新标签")
                    
                    new_details = {}
                    release_notes_service = self._get_release_notes_service()
                    
                    for tag in new_tags:
                        tag_info = self._get_tag_info(tag)
                        if tag_info:
                            new_details[tag] = tag_info
                    
                    if new_details:
                        try:
                            version_tags = list(new_details.keys())
                            release_notes = release_notes_service.get_release_notes(version_tags)
                            
                            for tag, details in new_details.items():
                                normalized_tag = release_notes_service._normalize_version(tag)
                                if normalized_tag in release_notes:
                                    release_info = release_notes[normalized_tag]
                                    details['releaseNotesHtml'] = release_info.release_notes_html
                                    details['releaseName'] = release_info.name
                                    details['releaseUrl'] = release_info.url
                                    if release_info.published_at:
                                        details['publishedAt'] = release_info.published_at
                        except Exception as e:
                            logger.warning(f"[GitManager] 后台更新获取 Release Notes 失败: {e}")
                    
                    cache.set_tag_details(self._repo_path_str, new_details, all_tags)
                    
                    with self._background_update_lock:
                        callbacks = self._background_update_callbacks.copy()
                    
                    cached_details = cache.get_all_cached_tags(self._repo_path_str)
                    sorted_tags = sorted(cached_details.keys(), key=_parse_version, reverse=True)
                    start_idx = (page - 1) * page_size
                    end_idx = start_idx + page_size
                    page_tags = sorted_tags[start_idx:end_idx]
                    versions = [cached_details[tag] for tag in page_tags if tag in cached_details]
                    
                    update_data = {
                        "versions": versions,
                        "has_more": end_idx < len(sorted_tags),
                        "totalCached": len(cached_details),
                        "newTagsCount": len(new_tags)
                    }
                    
                    for callback in callbacks.values():
                        try:
                            callback('stable', page, update_data)
                        except Exception as cb_error:
                            logger.warning(f"[GitManager] 后台更新回调执行失败: {cb_error}")
                    
                    logger.debug(f"[GitManager] 后台更新 stable 版本完成")
                else:
                    cache.touch_cache_timestamp(self._repo_path_str, "stable")
                    logger.debug(f"[GitManager] 后台更新完成，无新标签，已更新时间戳")
                    
            except Exception as e:
                logger.error(f"[GitManager] 后台更新任务异常: {str(e)}")
        
        thread = threading.Thread(target=_update_task, daemon=True)
        thread.start()
    
    def _get_versions_dev_incremental(self, cache, page: int, page_size: int, branch: str, force_refresh: bool) -> Dict:
        """
        增量获取 dev 版本列表
        
        优先返回缓存数据，后台检测更新
        
        Args:
            cache: 缓存实例
            page: 页码
            page_size: 每页数量
            branch: 分支名称
            force_refresh: 是否强制刷新
            
        Returns:
            dict: 版本列表
        """
        from .version_cache import DEV_CACHE_DURATION
        
        if branch is None:
            branch_result = self._run_git_command(['rev-parse', '--abbrev-ref', 'HEAD'])
            current_branch = branch_result["output"] if branch_result["success"] else "master"
        else:
            current_branch = branch
        
        if not force_refresh:
            cached_commits, cached_latest = cache.get_cached_commits(self._repo_path_str, current_branch)
            
            if cached_commits:
                cache_age = cache.get_cache_age(self._repo_path_str, "dev")
                is_expired = cache_age > DEV_CACHE_DURATION.total_seconds()
                
                start_idx = (page - 1) * page_size
                end_idx = start_idx + page_size
                page_commits = cached_commits[start_idx:end_idx]
                
                if not is_expired:
                    logger.debug(f"[GitManager] dev 缓存未过期，直接返回缓存数据: {len(cached_commits)} 个提交")
                    return {
                        "versions": page_commits,
                        "has_more": end_idx < len(cached_commits),
                        "fromCache": True,
                        "cacheAge": cache_age,
                        "isUpdating": False,
                        "branch": current_branch,
                        "totalCached": len(cached_commits),
                        "newCommitsCount": 0,
                        "needBackgroundUpdate": False
                    }
                
                logger.debug(f"[GitManager] dev 缓存已过期，先返回缓存数据，触发后台更新")
                self._trigger_background_dev_update(cache, page, page_size, current_branch)
                
                return {
                    "versions": page_commits,
                    "has_more": end_idx < len(cached_commits),
                    "fromCache": True,
                    "cacheAge": cache_age,
                    "isUpdating": True,
                    "branch": current_branch,
                    "totalCached": len(cached_commits),
                    "newCommitsCount": 0,
                    "needBackgroundUpdate": True
                }
        
        try:
            fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
            if not fetch_result["success"]:
                error_msg = fetch_result.get('error', '')
                if self._is_ownership_error(error_msg):
                    return {
                        "versions": [],
                        "has_more": False,
                        "error_type": "ownership",
                        "error": error_msg,
                        "repo_path": str(self.repo_path) if self.repo_path else ""
                    }
            
            latest_commit_result = self._run_git_command([
                'rev-parse', f'origin/{current_branch}'
            ])
            
            if not latest_commit_result["success"]:
                error_msg = latest_commit_result.get("error", "")
                if "unknown revision" in error_msg.lower():
                    return {
                        "versions": [],
                        "has_more": False,
                        "error_type": "branch_not_found",
                        "error": f"远程分支 'origin/{current_branch}' 不存在",
                        "branch": current_branch,
                        "repo_path": str(self.repo_path) if self.repo_path else ""
                    }
                raise Exception(error_msg)
            
            latest_commit = latest_commit_result["output"]
            
            cached_commits, cached_latest = cache.get_cached_commits(self._repo_path_str, current_branch)
            
            new_commits = []
            if force_refresh or not cached_latest:
                result = self._run_git_command([
                    'log',
                    f'origin/{current_branch}',
                    f'--max-count={500}',
                    '--pretty=format:%H|%h|%ai|%an|%s'
                ])
                
                if result["success"] and result["output"]:
                    new_commits = self._parse_commit_log(result["output"])
            elif latest_commit != cached_latest:
                logger.info(f"[GitManager] 发现新提交，开始增量获取")
                
                result = self._run_git_command([
                    'log',
                    f'origin/{current_branch}',
                    f'^{cached_latest}',
                    '--pretty=format:%H|%h|%ai|%an|%s'
                ])
                
                if result["success"] and result["output"]:
                    new_commits = self._parse_commit_log(result["output"])
            
            if new_commits:
                cache.set_commit_details(
                    self._repo_path_str,
                    current_branch,
                    new_commits,
                    latest_commit
                )
                
                if force_refresh:
                    cache.set_last_full_refresh(self._repo_path_str, "dev")
            
            cached_commits, _ = cache.get_cached_commits(self._repo_path_str, current_branch)
            
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            page_commits = cached_commits[start_idx:end_idx]
            
            return {
                "versions": page_commits,
                "has_more": end_idx < len(cached_commits),
                "fromCache": len(new_commits) == 0,
                "cacheAge": cache.get_cache_age(self._repo_path_str, "dev"),
                "isUpdating": False,
                "branch": current_branch,
                "totalCached": len(cached_commits),
                "newCommitsCount": len(new_commits),
                "needBackgroundUpdate": False
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[GitManager] 获取 dev 版本列表失败: {error_msg}")
            
            if self._is_ownership_error(error_msg):
                return {
                    "versions": [],
                    "has_more": False,
                    "error_type": "ownership",
                    "error": error_msg,
                    "repo_path": str(self.repo_path) if self.repo_path else ""
                }
            
            return {
                "versions": [],
                "has_more": False,
                "error_type": "unknown",
                "error": error_msg,
                "repo_path": str(self.repo_path) if self.repo_path else ""
            }
    
    def _trigger_background_dev_update(self, cache, page: int, page_size: int, branch: str):
        """
        触发后台 dev 版本更新
        
        Args:
            cache: 缓存实例
            page: 页码
            page_size: 每页数量
            branch: 分支名称
        """
        def _update_task():
            try:
                logger.debug(f"[GitManager] 后台更新 dev 版本开始，分支: {branch}")
                
                fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
                if not fetch_result["success"]:
                    error_msg = fetch_result.get('error', '')
                    if self._is_ownership_error(error_msg):
                        logger.warning(f"[GitManager] 后台更新失败（权限问题）: {error_msg}")
                        return
                
                latest_commit_result = self._run_git_command([
                    'rev-parse', f'origin/{branch}'
                ])
                
                if not latest_commit_result["success"]:
                    logger.warning(f"[GitManager] 后台更新失败: 无法获取最新提交")
                    return
                
                latest_commit = latest_commit_result["output"]
                cached_commits, cached_latest = cache.get_cached_commits(self._repo_path_str, branch)
                
                new_commits = []
                if not cached_latest:
                    result = self._run_git_command([
                        'log',
                        f'origin/{branch}',
                        f'--max-count={500}',
                        '--pretty=format:%H|%h|%ai|%an|%s'
                    ])
                    
                    if result["success"] and result["output"]:
                        new_commits = self._parse_commit_log(result["output"])
                elif latest_commit != cached_latest:
                    logger.info(f"[GitManager] 后台更新发现新提交")
                    
                    result = self._run_git_command([
                        'log',
                        f'origin/{branch}',
                        f'^{cached_latest}',
                        '--pretty=format:%H|%h|%ai|%an|%s'
                    ])
                    
                    if result["success"] and result["output"]:
                        new_commits = self._parse_commit_log(result["output"])
                
                if new_commits:
                    cache.set_commit_details(
                        self._repo_path_str,
                        branch,
                        new_commits,
                        latest_commit
                    )
                    
                    with self._background_update_lock:
                        callbacks = self._background_update_callbacks.copy()
                    
                    cached_commits, _ = cache.get_cached_commits(self._repo_path_str, branch)
                    start_idx = (page - 1) * page_size
                    end_idx = start_idx + page_size
                    page_commits = cached_commits[start_idx:end_idx]
                    
                    update_data = {
                        "versions": page_commits,
                        "has_more": end_idx < len(cached_commits),
                        "totalCached": len(cached_commits),
                        "newCommitsCount": len(new_commits),
                        "branch": branch
                    }
                    
                    for callback in callbacks.values():
                        try:
                            callback('dev', page, update_data)
                        except Exception as cb_error:
                            logger.warning(f"[GitManager] 后台更新回调执行失败: {cb_error}")
                    
                    logger.debug(f"[GitManager] 后台更新 dev 版本完成")
                else:
                    cache.touch_cache_timestamp(self._repo_path_str, "dev")
                    logger.debug(f"[GitManager] 后台更新完成，无新提交，已更新时间戳")
                    
            except Exception as e:
                logger.error(f"[GitManager] 后台更新任务异常: {str(e)}")
        
        thread = threading.Thread(target=_update_task, daemon=True)
        thread.start()
    
    def _parse_commit_log(self, log_output: str) -> List[Dict]:
        """
        解析 git log 输出
        
        Args:
            log_output: git log 输出字符串
            
        Returns:
            提交列表
        """
        commits = []
        lines = log_output.split('\n') if log_output else []
        
        for line in lines:
            if not line:
                continue
            
            parts = line.split('|')
            if len(parts) >= 5:
                full_hash, short_hash, date, author, message = parts[0], parts[1], parts[2], parts[3], '|'.join(parts[4:])
                commits.append({
                    "id": short_hash,
                    "fullHash": full_hash,
                    "timestamp": date,
                    "message": message,
                    "type": "dev",
                    "author": author
                })
        
        return commits
    

    
    def _fetch_versions_from_git(self, version_type: str = 'stable', page: int = 1, page_size: int = 20, branch: str = None) -> Dict:
        """
        从 Git 获取版本列表（原始逻辑）
        
        Args:
            version_type: 版本类型 ('stable' 或 'dev')
            page: 页码
            page_size: 每页数量
            branch: 指定分支名称（可选）
            
        Returns:
            dict: 版本列表，包含错误类型和详细信息
        """
        try:
            # 先拉取最新的远程更新（使用 --prune 清理远程已删除的分支引用）
            fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
            if not fetch_result["success"]:
                error_msg = fetch_result.get('error', '')
                logger.warning(f"[GitManager] 拉取远程更新失败: {error_msg}")
                
                # 检查是否为权限错误
                if self._is_ownership_error(error_msg):
                    return {
                        "versions": [],
                        "has_more": False,
                        "error_type": "ownership",
                        "error": error_msg,
                        "repo_path": str(self.repo_path) if self.repo_path else ""
                    }
                
                # 检查是否为 fetch ref 错误（远程分支被 force push）
                if self._is_fetch_ref_error(error_msg):
                    logger.info("[GitManager] 检测到远程分支引用冲突，尝试自动修复...")
                    if self._fix_fetch_ref_error():
                        logger.info("[GitManager] 修复成功，重试拉取...")
                        fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
                        if fetch_result["success"]:
                            logger.info("[GitManager] 重试拉取成功")
                        else:
                            logger.warning(f"[GitManager] 重试拉取仍失败: {fetch_result.get('error', '')}")
                
                # 继续执行，使用本地缓存的数据
            
            if version_type == 'stable':
                # 获取所有标签（稳定版）
                result = self._run_git_command(['tag', '-l', '--sort=-version:refname'])
                if not result["success"]:
                    # 检查错误类型
                    error_msg = result["error"]
                    if self._is_ownership_error(error_msg):
                        return {
                            "versions": [],
                            "has_more": False,
                            "error_type": "ownership",
                            "error": error_msg,
                            "repo_path": str(self.repo_path) if self.repo_path else ""
                        }
                    else:
                        raise Exception(error_msg)
                
                tags = result["output"].split('\n') if result["output"] else []
                
                # 如果没有任何标签
                if not tags or (len(tags) == 1 and not tags[0]):
                    return {
                        "versions": [],
                        "has_more": False,
                        "error_type": "no_tags",
                        "error": "仓库中没有任何标签（稳定版本）",
                        "repo_path": str(self.repo_path) if self.repo_path else ""
                    }
                
                # 分页
                start_idx = (page - 1) * page_size
                end_idx = start_idx + page_size
                page_tags = tags[start_idx:end_idx]
                
                versions = []
                for tag in page_tags:
                    if not tag:
                        continue
                    
                    tag_info = self._get_tag_info(tag)
                    if tag_info:
                        versions.append(tag_info)
                
                try:
                    release_notes_service = self._get_release_notes_service()
                    version_tags = [v['tag'] for v in versions if v.get('tag')]
                    release_notes = release_notes_service.get_release_notes(version_tags)
                    
                    for version in versions:
                        tag = version.get('tag', '')
                        normalized_tag = release_notes_service._normalize_version(tag)
                        if normalized_tag in release_notes:
                            release_info = release_notes[normalized_tag]
                            version['releaseNotesHtml'] = release_info.release_notes_html
                            version['releaseName'] = release_info.name
                            version['releaseUrl'] = release_info.url
                            if release_info.published_at:
                                version['publishedAt'] = release_info.published_at
                except Exception as e:
                    logger.warning(f"[GitManager] 获取 Release Notes 失败: {e}")
                
                return {
                    "versions": versions,
                    "has_more": end_idx < len(tags)
                }
            else:
                # 获取当前分支（如果没有指定分支参数）
                if branch is None:
                    branch_result = self._run_git_command(['rev-parse', '--abbrev-ref', 'HEAD'])
                    current_branch = branch_result["output"] if branch_result["success"] else "master"
                else:
                    current_branch = branch
                
                logger.debug(f"[GitManager] 获取开发版本列表，分支: {current_branch}")
                
                # 获取最近的提交（开发版）- 使用远程分支
                skip = (page - 1) * page_size
                result = self._run_git_command([
                    'log',
                    f'origin/{current_branch}',  # 指定远程分支
                    f'--skip={skip}',
                    f'--max-count={page_size}',
                    '--pretty=format:%H|%h|%ai|%an|%s'
                ])
                
                if not result["success"]:
                    error_msg = result["error"]
                    
                    # 检查是否为权限错误
                    if self._is_ownership_error(error_msg):
                        return {
                            "versions": [],
                            "has_more": False,
                            "error_type": "ownership",
                            "error": error_msg,
                            "repo_path": str(self.repo_path) if self.repo_path else ""
                        }
                    
                    # 检查是否为远程分支不存在
                    if "unknown revision" in error_msg.lower() or "does not have any commits" in error_msg.lower():
                        return {
                            "versions": [],
                            "has_more": False,
                            "error_type": "branch_not_found",
                            "error": f"远程分支 'origin/{current_branch}' 不存在",
                            "branch": current_branch,
                            "repo_path": str(self.repo_path) if self.repo_path else ""
                        }
                    
                    # 其他错误
                    raise Exception(error_msg)
                
                lines = result["output"].split('\n') if result["output"] else []
                versions = []
                
                for line in lines:
                    if not line:
                        continue
                    
                    parts = line.split('|')
                    if len(parts) >= 5:
                        full_hash, short_hash, date, author, message = parts[0], parts[1], parts[2], parts[3], '|'.join(parts[4:])
                        versions.append({
                            "id": short_hash,
                            "fullHash": full_hash,
                            "timestamp": date,
                            "message": message,
                            "type": "dev",
                            "author": author
                        })
                
                # 如果没有任何提交
                if not versions and page == 1:
                    return {
                        "versions": [],
                        "has_more": False,
                        "error_type": "no_commits",
                        "error": f"分支 'origin/{current_branch}' 中没有任何提交",
                        "branch": current_branch,
                        "repo_path": str(self.repo_path) if self.repo_path else ""
                    }
                
                # 检查是否还有更多
                next_result = self._run_git_command([
                    'log',
                    f'origin/{current_branch}',  # 指定远程分支
                    f'--skip={skip + page_size}',
                    '--max-count=1',
                    '--pretty=format:%H'
                ])
                has_more = next_result["success"] and bool(next_result["output"])
                
                return {
                    "versions": versions,
                    "has_more": has_more
                }
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[GitManager] 获取版本列表失败: {error_msg}")
            
            # 检查是否为权限错误
            if self._is_ownership_error(error_msg):
                return {
                    "versions": [],
                    "has_more": False,
                    "error_type": "ownership",
                    "error": error_msg,
                    "repo_path": str(self.repo_path) if self.repo_path else ""
                }
            
            # 检查是否为网络错误
            if any(keyword in error_msg.lower() for keyword in ['network', 'connection', 'timeout', 'could not resolve host']):
                return {
                    "versions": [],
                    "has_more": False,
                    "error_type": "network",
                    "error": error_msg,
                    "repo_path": str(self.repo_path) if self.repo_path else ""
                }
            
            # 未知错误
            return {
                "versions": [],
                "has_more": False,
                "error_type": "unknown",
                "error": error_msg,
                "repo_path": str(self.repo_path) if self.repo_path else ""
            }
    
    def _get_tag_info(self, tag: str) -> Optional[Dict]:
        """
        获取标签信息
        
        Args:
            tag: 标签名
            
        Returns:
            标签信息字典
        """
        try:
            # 获取标签对应的提交信息
            result = self._run_git_command([
                'log',
                '-1',
                '--pretty=format:%H|%h|%ai|%an|%s',
                tag
            ])
            
            if not result["success"] or not result["output"]:
                return None
            
            parts = result["output"].split('|')
            if len(parts) >= 5:
                full_hash, short_hash, date, author, message = parts[0], parts[1], parts[2], parts[3], '|'.join(parts[4:])
                return {
                    "id": short_hash,
                    "tag": tag,
                    "fullHash": full_hash,
                    "timestamp": date,
                    "message": message,
                    "type": "stable",
                    "author": author
                }
            
            return None
        except Exception as e:
            logger.warning(f"[GitManager] 获取标签信息失败: {tag}, {str(e)}")
            return None
    
    def get_current_version(self) -> Dict:
        """
        获取当前版本信息
        
        Returns:
            dict: 当前版本信息
        """
        try:
            # 获取当前提交的 hash
            result = self._run_git_command(['rev-parse', '--short', 'HEAD'])
            if not result["success"]:
                raise Exception(result["error"])
            
            short_hash = result["output"]
            
            # 获取完整 hash
            full_result = self._run_git_command(['rev-parse', 'HEAD'])
            full_hash = full_result["output"] if full_result["success"] else ""
            
            # 获取提交信息
            info_result = self._run_git_command([
                'log',
                '-1',
                '--pretty=format:%ai|%an|%s',
                'HEAD'
            ])
            
            if info_result["success"] and info_result["output"]:
                parts = info_result["output"].split('|')
                if len(parts) >= 3:
                    date, author, message = parts[0], parts[1], '|'.join(parts[2:])
                else:
                    date, author, message = "", "", ""
            else:
                date, author, message = "", "", ""
            
            # 检查是否有标签
            tag_result = self._run_git_command(['describe', '--tags', '--exact-match', 'HEAD'])
            tag = tag_result["output"] if tag_result["success"] else None
            version_type = "stable" if tag else "dev"
            
            return {
                "id": short_hash,
                "tag": tag,
                "fullHash": full_hash,
                "timestamp": date,
                "message": message,
                "type": version_type,
                "author": author
            }
        except Exception as e:
            logger.error(f"[GitManager] 获取当前版本失败: {str(e)}")
            return {
                "id": "unknown",
                "timestamp": datetime.now().isoformat(),
                "message": "无法获取版本信息",
                "type": "dev",
                "author": ""
            }
    
    def get_remote_info(self) -> Dict:
        """
        获取远端信息
        
        Returns:
            dict: 远端信息
        """
        try:
            # 获取当前分支
            branch_result = self._run_git_command(['rev-parse', '--abbrev-ref', 'HEAD'])
            branch = branch_result["output"] if branch_result["success"] else "main"
            
            # 获取远端 URL
            url_result = self._run_git_command(['remote', 'get-url', 'origin'])
            url = url_result["output"] if url_result["success"] else ""
            
            # 获取所有远端
            remotes_result = self._run_git_command(['remote', '-v'])
            history = []
            if remotes_result["success"] and remotes_result["output"]:
                lines = remotes_result["output"].split('\n')
                seen_urls = set()
                for line in lines:
                    if '(fetch)' in line:
                        parts = line.split()
                        if len(parts) >= 2:
                            remote_url = parts[1]
                            if remote_url not in seen_urls:
                                history.append(remote_url)
                                seen_urls.add(remote_url)
            
            return {
                "branch": branch,
                "url": url,
                "history": history if history else [url] if url else []
            }
        except Exception as e:
            logger.error(f"[GitManager] 获取远端信息失败: {str(e)}")
            return {
                "branch": "main",
                "url": "",
                "history": []
            }
    
    def get_current_commit(self) -> Optional[str]:
        """
        获取当前 commit hash
        
        Returns:
            str: 当前 commit 的完整 hash，失败返回 None
        """
        try:
            result = self._run_git_command(['rev-parse', 'HEAD'])
            if result["success"] and result["output"]:
                return result["output"].strip()
            return None
        except Exception as e:
            logger.error(f"[GitManager] 获取当前 commit 失败: {str(e)}")
            return None
    
    def switch_version(self, version_id: str, force: bool = False) -> Dict:
        """
        切换版本（保持在当前分支上，避免进入游离状态）
        
        Args:
            version_id: 版本 ID (commit hash 或 tag)
            force: 是否强制切换（丢弃本地修改）
            
        Returns:
            dict: 切换结果
        """
        try:
            before_result = self._run_git_command(['rev-parse', '--short', 'HEAD'])
            before_hash = before_result.get('output', 'unknown') if before_result['success'] else 'unknown'
            logger.dev(f"[GitManager] 版本切换开始 | 目标: {version_id} | 当前 HEAD: {before_hash}")
            
            fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
            if not fetch_result["success"]:
                error_msg = fetch_result.get('error', '')
                logger.warning(f"[GitManager] 拉取更新失败: {error_msg}")
                
                # 检查是否为 fetch ref 错误（远程分支被 force push）
                if self._is_fetch_ref_error(error_msg):
                    logger.info("[GitManager] 检测到远程分支引用冲突，尝试自动修复...")
                    if self._fix_fetch_ref_error():
                        logger.info("[GitManager] 修复成功，重试拉取...")
                        fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
                        if fetch_result["success"]:
                            logger.info("[GitManager] 重试拉取成功")
            
            # 检查是否有 untracked 文件可能冲突
            # 先尝试切换，如果失败则 stash 后重试
            if force:
                logger.debug(f"[GitManager] 强制切换版本到: {version_id}")
                # 强制切换：使用 reset --hard（丢弃本地修改）
                result = self._run_git_command(['reset', '--hard', version_id])
                
                if result["success"]:
                    # 清理未跟踪文件，避免后续 pull 冲突
                    clean_result = self._run_git_command(['clean', '-fd', '--'])
                    if clean_result["success"]:
                        cleaned_output = clean_result.get('output', '').strip()
                        if cleaned_output:
                            logger.info(f"[GitManager] 已清理未跟踪文件:\n{cleaned_output}")
                
                if not result["success"]:
                    error_msg = result.get('error', '')
                    # 检查是否为 untracked 文件冲突
                    if 'untracked' in error_msg.lower() or 'would be overwritten' in error_msg:
                        logger.info(f"[GitManager] 检测到 untracked 文件冲突，尝试 stash 后重试")
                        # stash untracked 文件
                        stash_result = self._run_git_command(['stash', '--include-untracked', '-m', f'auto-stash before switch to {version_id}'])
                        if stash_result["success"]:
                            logger.info(f"[GitManager] 已暂存 untracked 文件到 stash")
                            # 重试 reset
                            result = self._run_git_command(['reset', '--hard', version_id])
                            if result["success"]:
                                return {
                                    "success": True,
                                    "message": "版本切换成功（已暂存本地文件到 stash，如需恢复请使用 git stash pop）",
                                    "stashed": True
                                }
                        return {
                            "success": False,
                            "message": f"切换版本失败: {error_msg}",
                            "error": error_msg,
                            "requires_force": True
                        }
            else:
                logger.debug(f"[GitManager] 切换版本到: {version_id}")
                # 非强制切换：先使用 reset --mixed 移动 HEAD
                result = self._run_git_command(['reset', '--mixed', version_id])
                
                if result["success"]:
                    # 清理新版本新增但旧版本不存在的未跟踪文件，避免后续 pull 冲突
                    clean_result = self._run_git_command(['clean', '-fd', '--'])
                    if clean_result["success"]:
                        cleaned_output = clean_result.get('output', '').strip()
                        if cleaned_output:
                            logger.info(f"[GitManager] 已清理未跟踪文件:\n{cleaned_output}")
                    
                    # 然后使用 checkout 更新工作区文件（不会切换分支）
                    logger.debug(f"[GitManager] 更新工作区文件到版本: {version_id}")
                    checkout_result = self._run_git_command(['checkout', '.'])
                    if not checkout_result["success"]:
                        error_msg = checkout_result.get('error', '')
                        # 检查是否为 untracked 文件冲突
                        if 'untracked' in error_msg.lower() or 'would be overwritten' in error_msg:
                            logger.info(f"[GitManager] 检测到 untracked 文件冲突，尝试 stash 后重试")
                            # stash untracked 文件
                            stash_result = self._run_git_command(['stash', '--include-untracked', '-m', f'auto-stash before switch to {version_id}'])
                            if stash_result["success"]:
                                logger.info(f"[GitManager] 已暂存 untracked 文件到 stash")
                                # 重试 checkout
                                checkout_result = self._run_git_command(['checkout', '.'])
                                if checkout_result["success"]:
                                    return {
                                        "success": True,
                                        "message": "版本切换成功（已暂存本地文件到 stash，如需恢复请使用 git stash pop）",
                                        "stashed": True
                                    }
                            return {
                                "success": False,
                                "message": f"更新工作区文件失败: {error_msg}",
                                "error": error_msg,
                                "requires_force": True
                            }
                        logger.warning(f"[GitManager] 更新工作区文件失败: {checkout_result['error']}")
                        # 即使 checkout 失败，reset 已经成功，所以不返回失败
            
            if not result["success"]:
                # 检查是否为本地修改冲突
                error_msg = result.get('error', '')
                if 'would be overwritten' in error_msg or 'local changes' in error_msg.lower():
                    return {
                        "success": False,
                        "message": "切换版本失败：工作区有未提交的修改",
                        "error": error_msg,
                        "requires_force": True  # 标记需要强制切换
                    }
                
                return {
                    "success": False,
                    "message": f"切换版本失败: {result['error']}"
                }
            
            logger.debug(f"[GitManager] 版本切换成功，工作区已更新")
            
            after_result = self._run_git_command(['rev-parse', '--short', 'HEAD'])
            after_hash = after_result.get('output', 'unknown') if after_result['success'] else 'unknown'
            logger.dev(f"[GitManager] 版本切换完成 | 目标: {version_id[:7]} | 实际 HEAD: {after_hash}")
            
            if after_hash.startswith(version_id[:7]):
                logger.dev(f"[GitManager] 版本切换验证成功")
            else:
                logger.warning(f"[GitManager] 版本切换验证失败: 期望 {version_id[:7]}, 实际 {after_hash}")
            
            submodule_result = self._run_git_command(
                ['submodule', 'update', '--init', '--recursive'],
                timeout=120
            )
            if not submodule_result["success"]:
                logger.warning(f"[GitManager] 子模块更新失败: {submodule_result.get('error', '')}")
            
            return {
                "success": True,
                "message": "版本切换成功"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"版本切换失败: {str(e)}"
            }
    
    def rollback_to_commit(self, commit_hash: str) -> Dict:
        """
        回退到指定 commit（保持在当前分支上，避免进入游离状态）
        
        Args:
            commit_hash: 目标 commit hash
            
        Returns:
            dict: 回退结果
        """
        try:
            logger.debug(f"[GitManager] 开始回退到 commit: {commit_hash}")
            
            # 使用 reset --mixed 回退（保留工作区修改，但取消暂存）
            result = self._run_git_command(['reset', '--mixed', commit_hash])
            
            if not result["success"]:
                logger.error(f"[GitManager] 回退失败: {result['error']}")
                return {
                    "success": False,
                    "message": f"回退失败: {result['error']}"
                }
            
            logger.debug(f"[GitManager] 回退成功，当前仍在分支上")
            return {
                "success": True,
                "message": "回退成功"
            }
        except Exception as e:
            logger.error(f"[GitManager] 回退异常: {str(e)}")
            return {
                "success": False,
                "message": f"回退失败: {str(e)}"
            }
    
    def update_remote_url(self, url: str) -> Dict:
        """
        更新远端地址
        
        Args:
            url: 远端仓库地址
            
        Returns:
            dict: 更新结果
        """
        try:
            # 更新 origin 远端地址
            result = self._run_git_command(['remote', 'set-url', 'origin', url])
            
            if not result["success"]:
                return {
                    "success": False,
                    "message": f"更新远端地址失败: {result['error']}"
                }
            
            # 拉取新远端的更新（使用 --prune 清理远程已删除的分支引用）
            fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
            if not fetch_result["success"]:
                error_msg = fetch_result.get('error', '')
                logger.warning(f"[GitManager] 拉取更新失败: {error_msg}")
                
                # 检查是否为 fetch ref 错误（远程分支被 force push）
                if self._is_fetch_ref_error(error_msg):
                    logger.info("[GitManager] 检测到远程分支引用冲突，尝试自动修复...")
                    if self._fix_fetch_ref_error():
                        logger.info("[GitManager] 修复成功，重试拉取...")
                        fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
                        if fetch_result["success"]:
                            logger.info("[GitManager] 重试拉取成功")
            
            return {
                "success": True,
                "message": "远端地址更新成功"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"远端地址更新失败: {str(e)}"
            }
    
    def fetch_updates(self) -> Dict:
        """
        拉取更新
        
        Returns:
            dict: 拉取结果
        """
        try:
            result = self._run_git_command(['fetch', 'origin', '--prune'])
            
            if not result["success"]:
                error_msg = result.get('error', '')
                
                # 检查是否为 fetch ref 错误（远程分支被 force push）
                if self._is_fetch_ref_error(error_msg):
                    logger.info("[GitManager] 检测到远程分支引用冲突，尝试自动修复...")
                    if self._fix_fetch_ref_error():
                        logger.info("[GitManager] 修复成功，重试拉取...")
                        result = self._run_git_command(['fetch', 'origin', '--prune'])
                        if result["success"]:
                            return {
                                "success": True,
                                "message": "拉取更新成功"
                            }
                
                return {
                    "success": False,
                    "message": f"拉取更新失败: {error_msg}"
                }
            
            return {
                "success": True,
                "message": "拉取更新成功"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"拉取更新失败: {str(e)}"
            }
    
    def get_branches(self) -> Dict:
        """
        获取所有分支列表
        
        Returns:
            dict: 分支列表
        """
        try:
            # 获取本地分支
            local_result = self._run_git_command(['branch'])
            if not local_result["success"]:
                raise Exception(local_result["error"])
            
            # 获取远程分支
            remote_result = self._run_git_command(['branch', '-r'])
            remote_success = remote_result["success"]
            
            # 解析本地分支
            local_branches = []
            current_branch = None
            if local_result["output"]:
                for line in local_result["output"].split('\n'):
                    line = line.strip()
                    if line:
                        is_current = line.startswith('*')
                        branch_name = line.lstrip('* ').strip()
                        
                        # 处理 detached HEAD 状态
                        if branch_name.startswith('(') and 'detached' in branch_name.lower():
                            # 处于 detached HEAD 状态，尝试获取实际分支
                            if is_current:
                                # 首先尝试使用 symbolic-ref 获取当前分支（最可靠的方法）
                                symbolic_result = self._run_git_command(['symbolic-ref', '--short', 'HEAD'])
                                if symbolic_result["success"] and symbolic_result["output"].strip():
                                    current_branch = symbolic_result["output"].strip()
                                    logger.debug(f"[GitManager] 通过 symbolic-ref 获取当前分支: {current_branch}")
                                else:
                                    # 如果 symbolic-ref 失败，说明真的处于 detached HEAD 状态
                                    # 尝试从本地分支中查找包含当前 commit 的分支
                                    contains_result = self._run_git_command(['branch', '--contains', 'HEAD'])
                                    if contains_result["success"] and contains_result["output"]:
                                        lines = contains_result["output"].split('\n')
                                        for local_line in lines:
                                            local_line = local_line.strip().lstrip('* ').strip()
                                            if local_line and not local_line.startswith('('):
                                                current_branch = local_line
                                                logger.debug(f"[GitManager] 检测到 detached HEAD，从本地分支推断: {current_branch}")
                                                break
                                    
                                    # 如果本地分支没找到，再尝试从远程分支推断
                                    if not current_branch:
                                        remote_contains_result = self._run_git_command(['branch', '-r', '--contains', 'HEAD'])
                                        if remote_contains_result["success"] and remote_contains_result["output"]:
                                            lines = remote_contains_result["output"].split('\n')
                                            for remote_line in lines:
                                                remote_line = remote_line.strip()
                                                if remote_line and 'origin/' in remote_line and '->' not in remote_line:
                                                    # 移除 origin/ 前缀
                                                    detected_branch = remote_line.replace('origin/', '').strip()
                                                    current_branch = detected_branch
                                                    logger.debug(f"[GitManager] 检测到 detached HEAD，从远程分支推断: {detected_branch}")
                                                    break
                            continue
                        
                        local_branches.append(branch_name)
                        if is_current:
                            current_branch = branch_name
            
            # 解析远程分支
            remote_branches = []
            if remote_success and remote_result["output"]:
                for line in remote_result["output"].split('\n'):
                    line = line.strip()
                    if line and not '->' in line:  # 排除 HEAD -> 指向
                        # 移除 origin/ 前缀
                        branch_name = line.replace('origin/', '').strip()
                        if branch_name and branch_name not in remote_branches:
                            remote_branches.append(branch_name)
            
            logger.debug(f"[GitManager] 获取分支列表成功，当前分支: {current_branch}")
            
            return {
                "success": True,
                "current_branch": current_branch,
                "local_branches": local_branches,
                "remote_branches": remote_branches
            }
        except Exception as e:
            logger.error(f"[GitManager] 获取分支列表失败: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "current_branch": None,
                "local_branches": [],
                "remote_branches": []
            }
    
    def switch_branch(self, branch_name: str) -> Dict:
        """
        切换分支
        
        Args:
            branch_name: 分支名称
            
        Returns:
            dict: 切换结果
        """
        try:
            # 先拉取最新更新（使用 --prune 清理远程已删除的分支引用）
            fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
            if not fetch_result["success"]:
                error_msg = fetch_result.get('error', '')
                logger.warning(f"[GitManager] 拉取更新失败: {error_msg}")
                
                # 检查是否为 fetch ref 错误（远程分支被 force push）
                if self._is_fetch_ref_error(error_msg):
                    logger.info("[GitManager] 检测到远程分支引用冲突，尝试自动修复...")
                    if self._fix_fetch_ref_error():
                        logger.info("[GitManager] 修复成功，重试拉取...")
                        fetch_result = self._run_git_command(['fetch', 'origin', '--prune'])
                        if fetch_result["success"]:
                            logger.info("[GitManager] 重试拉取成功")
            
            # 检查分支是否存在于本地
            local_branches_result = self._run_git_command(['branch'])
            local_branches = []
            if local_branches_result["success"]:
                local_branches = [b.lstrip('* ').strip() for b in local_branches_result["output"].split('\n') if b.strip()]
            
            # 如果分支不存在于本地，尝试从远程检出
            if branch_name not in local_branches:
                # 尝试从远程检出新分支
                result = self._run_git_command(['checkout', '-b', branch_name, f'origin/{branch_name}'])
            else:
                # 切换到已存在的本地分支
                result = self._run_git_command(['checkout', branch_name])
            
            if not result["success"]:
                error_msg = result.get('error', '')
                # 检查是否为 untracked 文件冲突
                if 'untracked' in error_msg.lower() or 'would be overwritten' in error_msg:
                    logger.info(f"[GitManager] 检测到 untracked 文件冲突，尝试 stash 后重试")
                    # stash untracked 文件
                    stash_result = self._run_git_command(['stash', '--include-untracked', '-m', f'auto-stash before switch to branch {branch_name}'])
                    if stash_result["success"]:
                        logger.info(f"[GitManager] 已暂存 untracked 文件到 stash")
                        # 重试切换分支
                        if branch_name not in local_branches:
                            result = self._run_git_command(['checkout', '-b', branch_name, f'origin/{branch_name}'])
                        else:
                            result = self._run_git_command(['checkout', branch_name])
                        
                        if result["success"]:
                            return {
                                "success": True,
                                "message": f"已切换到分支: {branch_name}（已暂存本地文件到 stash，如需恢复请使用 git stash pop）",
                                "stashed": True
                            }
                
                return {
                    "success": False,
                    "message": f"切换分支失败: {error_msg}"
                }
            
            return {
                "success": True,
                "message": f"已切换到分支: {branch_name}"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"切换分支失败: {str(e)}"
            }
