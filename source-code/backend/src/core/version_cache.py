"""
版本列表缓存管理器

管理 ComfyUI 版本列表的本地缓存，支持：
- 按环境路径隔离缓存
- 分页数据累积缓存
- 不同版本类型的不同有效期（stable: 24h, dev: 1h）
- 后台更新触发判断
- 增量获取支持（标签详情、提交详情）
"""

import json
import sys
import hashlib
import time
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

from ..utils.logger import app_logger as logger
from ..utils.paths import get_cache_dir

if sys.platform == 'win32':
    import msvcrt
else:
    import fcntl


STABLE_CACHE_DURATION = timedelta(hours=24)
DEV_CACHE_DURATION = timedelta(hours=6)
BACKGROUND_UPDATE_THRESHOLD = timedelta(minutes=5)

MAX_TAG_CACHE_COUNT = 500
MAX_COMMIT_CACHE_COUNT = 1000


def _parse_version(version: str) -> Tuple[int, ...]:
    """
    解析版本号为可比较的元组
    
    Args:
        version: 版本号字符串，如 "v0.18.1" 或 "0.18.1"
        
    Returns:
        版本号元组，如 (0, 18, 1)
    """
    version = version.strip().lstrip('v')
    parts = re.findall(r'\d+', version)
    return tuple(int(p) for p in parts) if parts else (0,)


class VersionCache:
    """
    版本列表缓存管理器
    
    管理版本列表的本地缓存，提供读写、有效期检查和清除功能。
    缓存文件使用 JSON 格式存储，包含数据和元数据（时间戳）。
    """
    
    def __init__(self, cache_dir: Optional[Path] = None):
        """
        初始化缓存管理器
        
        Args:
            cache_dir: 缓存目录路径，如果为 None 则使用默认路径
        """
        self._cache_dir_str = str(cache_dir or get_cache_dir("version_list"))
        Path(self._cache_dir_str).mkdir(parents=True, exist_ok=True)
        
        logger.debug(f"[VersionCache] 缓存管理器已初始化，缓存目录: {self._cache_dir_str}")
    
    @property
    def cache_dir(self) -> Path:
        """缓存目录路径（Path 对象）"""
        return Path(self._cache_dir_str)
    
    def __dir__(self):
        """自定义 dir() 输出，隐藏返回 Path 对象的属性"""
        attrs = list(object.__dir__(self))
        path_attrs = ['cache_dir']
        return [attr for attr in attrs if attr not in path_attrs]
    
    def _get_cache_key(self, repo_path: str, version_type: str) -> str:
        """
        生成缓存文件名
        
        Args:
            repo_path: 仓库路径
            version_type: 版本类型 ('stable' 或 'dev')
            
        Returns:
            缓存文件名（不含扩展名）
        """
        normalized_path = str(Path(repo_path).resolve()).lower().replace('\\', '/')
        path_hash = hashlib.md5(normalized_path.encode('utf-8')).hexdigest()[:8]
        cache_key = f"{path_hash}_{version_type}"
        logger.debug(f"[VersionCache] 生成缓存键: {cache_key} (路径: {normalized_path})")
        return cache_key
    
    def _get_cache_path(self, repo_path: str, version_type: str) -> Path:
        """
        获取缓存文件路径
        
        Args:
            repo_path: 仓库路径
            version_type: 版本类型
            
        Returns:
            缓存文件的完整路径
        """
        cache_key = self._get_cache_key(repo_path, version_type)
        return self.cache_dir / f"{cache_key}.json"
    
    def _lock_file(self, file_obj, exclusive: bool = False):
        """
        锁定文件（跨平台）
        
        Args:
            file_obj: 文件对象
            exclusive: 是否为排他锁（默认为共享锁）
        """
        if sys.platform == 'win32':
            if exclusive:
                mode = msvcrt.LK_NBLCK
            else:
                mode = msvcrt.LK_RLCK
            try:
                msvcrt.locking(file_obj.fileno(), mode, 1)
            except (OSError, IOError):
                pass
        else:
            lock_type = fcntl.LOCK_EX if exclusive else fcntl.LOCK_SH
            fcntl.flock(file_obj.fileno(), lock_type)
    
    def _unlock_file(self, file_obj):
        """
        解锁文件（跨平台）
        
        Args:
            file_obj: 文件对象
        """
        if sys.platform == 'win32':
            try:
                msvcrt.locking(file_obj.fileno(), msvcrt.LK_UNLCK, 1)
            except (OSError, IOError):
                pass
        else:
            fcntl.flock(file_obj.fileno(), fcntl.LOCK_UN)
    
    def _read_json_file(self, file_path: Path) -> Optional[Dict]:
        """
        读取 JSON 文件（带文件锁和损坏恢复）
        
        Args:
            file_path: 文件路径
            
        Returns:
            JSON 数据，失败返回 None
        """
        if not file_path.exists():
            return None
        
        max_retries = 3
        retry_delay = 0.1
        
        for attempt in range(max_retries):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    self._lock_file(f, exclusive=False)
                    try:
                        data = json.load(f)
                        return data
                    finally:
                        self._unlock_file(f)
            except json.JSONDecodeError as e:
                logger.warning(f"[VersionCache] 缓存文件损坏，自动删除: {file_path}")
                logger.debug(f"[VersionCache] 错误详情: {str(e)}")
                try:
                    file_path.unlink()
                    logger.info(f"[VersionCache] 已删除损坏的缓存文件: {file_path}")
                except Exception as delete_error:
                    logger.error(f"[VersionCache] 删除损坏文件失败: {str(delete_error)}")
                return None
            except PermissionError:
                if attempt < max_retries - 1:
                    logger.debug(f"[VersionCache] 文件被占用，等待重试 ({attempt + 1}/{max_retries}): {file_path}")
                    time.sleep(retry_delay)
                    continue
                else:
                    logger.warning(f"[VersionCache] 文件访问权限被拒绝: {file_path}")
                    return None
            except Exception as e:
                logger.error(f"[VersionCache] 读取文件失败: {file_path}, {str(e)}")
                return None
        
        return None
    
    def _write_json_file(self, file_path: Path, data: Dict) -> bool:
        """
        写入 JSON 文件（带文件锁）
        
        Args:
            file_path: 文件路径
            data: JSON 数据
            
        Returns:
            是否成功
        """
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                self._lock_file(f, exclusive=True)
                try:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    return True
                finally:
                    self._unlock_file(f)
        except Exception as e:
            logger.error(f"[VersionCache] 写入文件失败: {file_path}, {str(e)}")
            return False
    
    def _get_max_age(self, version_type: str) -> timedelta:
        """
        获取缓存最大有效期
        
        Args:
            version_type: 版本类型
            
        Returns:
            最大有效期
        """
        if version_type == 'stable':
            return STABLE_CACHE_DURATION
        else:
            return DEV_CACHE_DURATION
    
    def _is_cache_expired(self, cache_data: Dict, version_type: str) -> bool:
        """
        检查缓存是否过期
        
        Args:
            cache_data: 缓存数据
            version_type: 版本类型
            
        Returns:
            是否过期
        """
        if 'updated_at' not in cache_data:
            return True
        
        try:
            updated_at = datetime.fromisoformat(cache_data['updated_at'])
            cache_age = datetime.now() - updated_at
            max_age = self._get_max_age(version_type)
            
            return cache_age >= max_age
        except Exception as e:
            logger.warning(f"[VersionCache] 检查缓存时间失败: {str(e)}")
            return True
    
    def _should_background_update(self, cache_data: Dict, version_type: str) -> bool:
        """
        判断是否需要后台更新
        
        缓存年龄超过 BACKGROUND_UPDATE_THRESHOLD 时触发后台更新
        
        Args:
            cache_data: 缓存数据
            version_type: 版本类型
            
        Returns:
            是否需要后台更新
        """
        if 'updated_at' not in cache_data:
            return True
        
        try:
            updated_at = datetime.fromisoformat(cache_data['updated_at'])
            cache_age = datetime.now() - updated_at
            
            return cache_age >= BACKGROUND_UPDATE_THRESHOLD
        except Exception:
            return True
    
    def get_cache_age(self, repo_path: str, version_type: str) -> int:
        """
        获取缓存年龄（秒）
        
        Args:
            repo_path: 仓库路径
            version_type: 版本类型
            
        Returns:
            缓存年龄（秒），无缓存返回 -1
        """
        cache_path = self._get_cache_path(repo_path, version_type)
        cache_data = self._read_json_file(cache_path)
        
        if not cache_data or 'updated_at' not in cache_data:
            return -1
        
        try:
            updated_at = datetime.fromisoformat(cache_data['updated_at'])
            cache_age = datetime.now() - updated_at
            return max(0, int(cache_age.total_seconds()))
        except Exception:
            return -1
    
    def touch_cache_timestamp(self, repo_path: str, version_type: str) -> bool:
        """
        更新缓存时间戳（不修改数据）
        
        Args:
            repo_path: 仓库路径
            version_type: 版本类型
            
        Returns:
            是否成功
        """
        cache_path = self._get_cache_path(repo_path, version_type)
        cache_data = self._read_json_file(cache_path)
        
        if not cache_data:
            return False
        
        cache_data['updated_at'] = datetime.now().isoformat()
        return self._write_json_file(cache_path, cache_data)
    
    def get_cache(self, repo_path: str, version_type: str, page: int) -> Optional[Tuple[Dict, Dict]]:
        """
        获取缓存数据
        
        Args:
            repo_path: 仓库路径
            version_type: 版本类型
            page: 页码
            
        Returns:
            (页面数据, 缓存元数据) 或 None
            缓存元数据包含: fromCache, cacheAge, isExpired, shouldBackgroundUpdate
        """
        cache_path = self._get_cache_path(repo_path, version_type)
        cache_data = self._read_json_file(cache_path)
        
        if not cache_data:
            return None
        
        pages = cache_data.get('pages', {})
        page_key = str(page)
        
        if page_key not in pages:
            return None
        
        page_data = pages[page_key]
        
        cache_age = 0
        if 'updated_at' in cache_data:
            try:
                updated_at = datetime.fromisoformat(cache_data['updated_at'])
                cache_age = max(0, int((datetime.now() - updated_at).total_seconds()))
            except Exception:
                pass
        
        is_expired = self._is_cache_expired(cache_data, version_type)
        should_update = self._should_background_update(cache_data, version_type)
        
        metadata = {
            'fromCache': True,
            'cacheAge': cache_age,
            'isExpired': is_expired,
            'shouldBackgroundUpdate': should_update,
            'lastFetchTime': cache_data.get('updated_at', ''),
            'branch': cache_data.get('branch', '')
        }
        
        return page_data, metadata
    
    def set_cache(
        self,
        repo_path: str,
        version_type: str,
        page: int,
        data: Dict,
        branch: str = None
    ) -> bool:
        """
        设置缓存数据
        
        Args:
            repo_path: 仓库路径
            version_type: 版本类型
            page: 页码
            data: 页面数据（包含 versions, has_more）
            branch: 当前分支名称
            
        Returns:
            是否成功
        """
        cache_path = self._get_cache_path(repo_path, version_type)
        cache_data = self._read_json_file(cache_path)
        
        if not cache_data:
            cache_data = {
                'version': '1.0',
                'updated_at': datetime.now().isoformat(),
                'repo_path': repo_path,
                'branch': branch or '',
                'pages': {},
                'total_cached_pages': 0
            }
        
        cache_data['updated_at'] = datetime.now().isoformat()
        cache_data['repo_path'] = repo_path
        if branch is not None:
            cache_data['branch'] = branch
        
        cache_data['pages'][str(page)] = data
        cache_data['total_cached_pages'] = len(cache_data['pages'])
        
        success = self._write_json_file(cache_path, cache_data)
        
        if success:
            logger.debug(
                f"[VersionCache] 缓存已更新: {version_type} 第 {page} 页, "
                f"共 {cache_data['total_cached_pages']} 页缓存"
            )
        
        return success
    
    def clear_cache(self, repo_path: str, version_type: str = None) -> bool:
        """
        清除指定环境的缓存
        
        Args:
            repo_path: 仓库路径
            version_type: 版本类型，如果为 None 则清除所有类型
            
        Returns:
            是否成功
        """
        try:
            if version_type:
                cache_path = self._get_cache_path(repo_path, version_type)
                if cache_path.exists():
                    cache_path.unlink()
                    logger.info(f"[VersionCache] 已清除缓存: {cache_path}")
            else:
                for vt in ['stable', 'dev']:
                    cache_path = self._get_cache_path(repo_path, vt)
                    if cache_path.exists():
                        cache_path.unlink()
                        logger.info(f"[VersionCache] 已清除缓存: {cache_path}")
            
            return True
        except Exception as e:
            logger.error(f"[VersionCache] 清除缓存失败: {str(e)}")
            return False
    
    def clear_all_cache(self) -> bool:
        """
        清除所有版本列表缓存
        
        Returns:
            是否成功
        """
        try:
            cache_dir = self.cache_dir
            if not cache_dir.exists():
                return True
            
            for cache_file in cache_dir.glob("*.json"):
                try:
                    cache_file.unlink()
                    logger.debug(f"[VersionCache] 已删除缓存文件: {cache_file}")
                except Exception as e:
                    logger.warning(f"[VersionCache] 删除缓存文件失败: {cache_file}, {str(e)}")
            
            logger.info("[VersionCache] 所有版本列表缓存已清除")
            return True
        except Exception as e:
            logger.error(f"[VersionCache] 清除所有缓存失败: {str(e)}")
            return False
    
    def get_all_cached_tags(self, repo_path: str) -> Dict[str, Dict]:
        """
        获取所有已缓存的标签详情
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            {tag_name: tag_details} 字典
        """
        cache_path = self._get_cache_path(repo_path, "stable")
        logger.debug(f"[VersionCache] 读取缓存文件: {cache_path}, 存在: {cache_path.exists()}")
        
        cache_data = self._read_json_file(cache_path)
        
        if not cache_data:
            logger.debug(f"[VersionCache] 缓存数据为空")
            return {}
        
        tag_details = cache_data.get("tag_details", {})
        logger.debug(f"[VersionCache] 读取到 {len(tag_details)} 个标签详情, 缓存版本: {cache_data.get('version', 'unknown')}")
        
        return tag_details
    
    def get_all_known_tags(self, repo_path: str) -> set:
        """
        获取所有已知标签列表（用于增量判断）
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            已知标签名称集合
        """
        cache_path = self._get_cache_path(repo_path, "stable")
        cache_data = self._read_json_file(cache_path)
        
        if not cache_data:
            return set()
        
        all_known_tags = cache_data.get("all_known_tags", [])
        return set(all_known_tags)
    
    def _create_backup(self, cache_path: Path) -> Optional[Path]:
        """
        创建缓存文件备份
        
        Args:
            cache_path: 缓存文件路径
            
        Returns:
            备份文件路径，失败返回 None
        """
        if not cache_path.exists():
            return None
        
        backup_path = cache_path.with_suffix('.json.bak')
        try:
            import shutil
            shutil.copy2(cache_path, backup_path)
            logger.debug(f"[VersionCache] 已创建备份: {backup_path}")
            return backup_path
        except Exception as e:
            logger.warning(f"[VersionCache] 创建备份失败: {str(e)}")
            return None
    
    def _restore_from_backup(self, backup_path: Path, cache_path: Path) -> bool:
        """
        从备份恢复缓存文件
        
        Args:
            backup_path: 备份文件路径
            cache_path: 目标缓存文件路径
            
        Returns:
            是否成功
        """
        if not backup_path.exists():
            return False
        
        try:
            import shutil
            shutil.copy2(backup_path, cache_path)
            logger.info(f"[VersionCache] 已从备份恢复: {backup_path}")
            return True
        except Exception as e:
            logger.error(f"[VersionCache] 从备份恢复失败: {str(e)}")
            return False
    
    def _cleanup_backup(self, backup_path: Optional[Path]) -> None:
        """
        清理备份文件
        
        Args:
            backup_path: 备份文件路径
        """
        if backup_path and backup_path.exists():
            try:
                backup_path.unlink()
                logger.debug(f"[VersionCache] 已清理备份: {backup_path}")
            except Exception as e:
                logger.warning(f"[VersionCache] 清理备份失败: {str(e)}")
    
    def set_tag_details(self, repo_path: str, tag_details: Dict[str, Dict], all_tags: List[str] = None) -> bool:
        """
        设置标签详情缓存（增量更新）
        
        Args:
            repo_path: 仓库路径
            tag_details: {tag_name: tag_details} 字典
            all_tags: 所有标签列表（可选，用于更新 all_known_tags）
            
        Returns:
            是否成功
        """
        cache_path = self._get_cache_path(repo_path, "stable")
        logger.debug(f"[VersionCache] 写入缓存文件: {cache_path}")
        
        cache_data = self._read_json_file(cache_path)
        backup_path = None
        
        if cache_data:
            backup_path = self._create_backup(cache_path)
        
        if not cache_data:
            cache_data = {
                'version': '2.0',
                'updated_at': datetime.now().isoformat(),
                'repo_path': repo_path,
                'tag_details': {},
                'all_known_tags': [],
                'total_count': 0
            }
        
        if "tag_details" not in cache_data:
            cache_data["tag_details"] = {}
        
        if "all_known_tags" not in cache_data:
            cache_data["all_known_tags"] = []
        
        cache_data["tag_details"].update(tag_details)
        cache_data["updated_at"] = datetime.now().isoformat()
        
        if all_tags:
            existing_known = set(cache_data["all_known_tags"])
            existing_known.update(all_tags)
            cache_data["all_known_tags"] = list(existing_known)
            logger.debug(f"[VersionCache] 更新 all_known_tags，共 {len(cache_data['all_known_tags'])} 个")
        
        total_count = len(cache_data["tag_details"])
        if total_count > MAX_TAG_CACHE_COUNT:
            sorted_tags = sorted(
                cache_data["tag_details"].keys(),
                key=_parse_version,
                reverse=True
            )
            tags_to_keep = set(sorted_tags[:MAX_TAG_CACHE_COUNT])
            cache_data["tag_details"] = {
                k: v for k, v in cache_data["tag_details"].items()
                if k in tags_to_keep
            }
            logger.debug(f"[VersionCache] 标签缓存已裁剪至 {MAX_TAG_CACHE_COUNT} 个")
        
        cache_data["total_count"] = len(cache_data["tag_details"])
        
        success = self._write_json_file(cache_path, cache_data)
        
        if success:
            logger.debug(f"[VersionCache] 写入成功，文件存在: {cache_path.exists()}")
            
            verify_data = self._read_json_file(cache_path)
            if verify_data and "tag_details" in verify_data:
                logger.debug(f"[VersionCache] 验证成功，tag_details 数量: {len(verify_data['tag_details'])}")
                self._cleanup_backup(backup_path)
            else:
                logger.error(f"[VersionCache] 验证失败，缓存文件可能损坏")
                if backup_path:
                    self._restore_from_backup(backup_path, cache_path)
                    self._cleanup_backup(backup_path)
                return False
        else:
            logger.error(f"[VersionCache] 写入失败")
            if backup_path:
                self._restore_from_backup(backup_path, cache_path)
                self._cleanup_backup(backup_path)
        
        return success
    
    def get_cached_commits(self, repo_path: str, branch: str) -> Tuple[List[Dict], Optional[str]]:
        """
        获取已缓存的提交详情
        
        Args:
            repo_path: 仓库路径
            branch: 分支名称
            
        Returns:
            (提交列表, 最新提交hash) 或 ([], None)
        """
        cache_path = self._get_cache_path(repo_path, "dev")
        cache_data = self._read_json_file(cache_path)
        
        if not cache_data:
            return [], None
        
        branch_data = cache_data.get("branches", {}).get(branch, {})
        if not branch_data:
            return [], None
        
        commit_order = branch_data.get("commit_order", [])
        commit_details = branch_data.get("commit_details", {})
        
        commits = []
        for commit_hash in commit_order:
            if commit_hash in commit_details:
                commits.append(commit_details[commit_hash])
        
        latest_commit = branch_data.get("latest_commit")
        
        return commits, latest_commit
    
    def set_commit_details(
        self,
        repo_path: str,
        branch: str,
        commits: List[Dict],
        latest_commit: str
    ) -> bool:
        """
        设置提交详情缓存（增量更新）
        
        Args:
            repo_path: 仓库路径
            branch: 分支名称
            commits: 提交列表（按时间倒序）
            latest_commit: 最新提交 hash
            
        Returns:
            是否成功
        """
        cache_path = self._get_cache_path(repo_path, "dev")
        cache_data = self._read_json_file(cache_path)
        backup_path = None
        
        if cache_data:
            backup_path = self._create_backup(cache_path)
        
        if not cache_data:
            cache_data = {
                'version': '2.0',
                'updated_at': datetime.now().isoformat(),
                'repo_path': repo_path,
                'branches': {}
            }
        
        if "branches" not in cache_data:
            cache_data["branches"] = {}
        
        if branch not in cache_data["branches"]:
            cache_data["branches"][branch] = {
                "commit_order": [],
                "commit_details": {},
                "latest_commit": None
            }
        
        branch_data = cache_data["branches"][branch]
        
        existing_order = set(branch_data.get("commit_order", []))
        
        new_order = []
        new_details = {}
        
        for commit in commits:
            commit_hash = commit.get("fullHash") or commit.get("id")
            if commit_hash and commit_hash not in existing_order:
                new_order.append(commit_hash)
                new_details[commit_hash] = commit
        
        if new_order:
            branch_data["commit_order"] = new_order + branch_data.get("commit_order", [])
            if "commit_details" not in branch_data:
                branch_data["commit_details"] = {}
            branch_data["commit_details"].update(new_details)
        
        branch_data["latest_commit"] = latest_commit
        cache_data["updated_at"] = datetime.now().isoformat()
        
        total_count = len(branch_data["commit_order"])
        if total_count > MAX_COMMIT_CACHE_COUNT:
            order_to_keep = branch_data["commit_order"][:MAX_COMMIT_CACHE_COUNT]
            branch_data["commit_order"] = order_to_keep
            branch_data["commit_details"] = {
                k: v for k, v in branch_data["commit_details"].items()
                if k in set(order_to_keep)
            }
            logger.debug(f"[VersionCache] 提交缓存已裁剪至 {MAX_COMMIT_CACHE_COUNT} 个")
        
        success = self._write_json_file(cache_path, cache_data)
        
        if success:
            verify_data = self._read_json_file(cache_path)
            if verify_data and "branches" in verify_data:
                logger.debug(f"[VersionCache] 已缓存 {len(new_order)} 个新提交，分支 {branch} 共 {len(branch_data['commit_order'])} 个")
                self._cleanup_backup(backup_path)
            else:
                logger.error(f"[VersionCache] 验证失败，缓存文件可能损坏")
                if backup_path:
                    self._restore_from_backup(backup_path, cache_path)
                    self._cleanup_backup(backup_path)
                return False
        else:
            logger.error(f"[VersionCache] 写入失败")
            if backup_path:
                self._restore_from_backup(backup_path, cache_path)
                self._cleanup_backup(backup_path)
        
        return success
    
    def get_stable_cache_metadata(self, repo_path: str) -> Dict:
        """
        获取 stable 缓存的元数据
        
        Args:
            repo_path: 仓库路径
            
        Returns:
            元数据字典
        """
        cache_path = self._get_cache_path(repo_path, "stable")
        cache_data = self._read_json_file(cache_path)
        
        if not cache_data:
            return {
                "exists": False,
                "total_count": 0,
                "updated_at": None
            }
        
        return {
            "exists": True,
            "total_count": cache_data.get("total_count", 0),
            "updated_at": cache_data.get("updated_at"),
            "last_full_refresh": cache_data.get("last_full_refresh")
        }
    
    def get_dev_cache_metadata(self, repo_path: str, branch: str) -> Dict:
        """
        获取 dev 缓存的元数据
        
        Args:
            repo_path: 仓库路径
            branch: 分支名称
            
        Returns:
            元数据字典
        """
        cache_path = self._get_cache_path(repo_path, "dev")
        cache_data = self._read_json_file(cache_path)
        
        if not cache_data:
            return {
                "exists": False,
                "total_count": 0,
                "latest_commit": None
            }
        
        branch_data = cache_data.get("branches", {}).get(branch, {})
        
        return {
            "exists": bool(branch_data),
            "total_count": len(branch_data.get("commit_order", [])),
            "latest_commit": branch_data.get("latest_commit"),
            "updated_at": cache_data.get("updated_at")
        }
    
    def set_last_full_refresh(self, repo_path: str, version_type: str) -> bool:
        """
        设置最后全量刷新时间
        
        Args:
            repo_path: 仓库路径
            version_type: 版本类型
            
        Returns:
            是否成功
        """
        cache_path = self._get_cache_path(repo_path, version_type)
        cache_data = self._read_json_file(cache_path)
        
        if cache_data:
            cache_data["last_full_refresh"] = datetime.now().isoformat()
            return self._write_json_file(cache_path, cache_data)
        
        return False
