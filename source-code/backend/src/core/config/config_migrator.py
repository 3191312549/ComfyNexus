"""
配置迁移基类
提供统一的配置迁移接口和流程
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Optional
import json
from datetime import datetime
import threading

from backend.src.utils.version_utils import Version, compare_versions, is_version_upgrade
from backend.src.utils.config_utils import deep_merge, fill_missing_fields
from backend.src.utils.logger import app_logger as logger


class ConfigMigrator(ABC):
    """配置迁移基类"""
    
    # 当前配置版本（子类必须定义）
    CURRENT_VERSION = "1.0.0"
    
    # 配置文件名（子类必须定义）
    CONFIG_FILENAME = "config.json"
    
    # 类级别的锁，防止并发写入
    _save_lock = threading.Lock()
    
    def __init__(self, config_dir: Path):
        """
        初始化迁移器
        
        Args:
            config_dir: 配置文件目录
        """
        # 使用字符串存储路径，避免 pywebview 序列化 Path 对象时出现警告
        self._config_dir_str = str(Path(config_dir))
        self._config_file_str = str(Path(config_dir) / self.CONFIG_FILENAME)
        self._backup_dir_str = str(Path(config_dir) / "backups")
        
        # 确保备份目录存在
        Path(self._backup_dir_str).mkdir(exist_ok=True, parents=True)
    
    @property
    def config_dir(self) -> Path:
        """
        配置目录路径（Path 对象）
        
        注意：此属性不会被 pywebview 序列化（通过 __dir__ 方法隐藏）
        """
        return Path(self._config_dir_str)
    
    @property
    def config_file(self) -> Path:
        """
        配置文件路径（Path 对象）
        
        注意：此属性不会被 pywebview 序列化（通过 __dir__ 方法隐藏）
        """
        return Path(self._config_file_str)
    
    @property
    def backup_dir(self) -> Path:
        """
        备份目录路径（Path 对象）
        
        注意：此属性不会被 pywebview 序列化（通过 __dir__ 方法隐藏）
        """
        return Path(self._backup_dir_str)
    
    # 公开的字符串属性供 pywebview 序列化使用
    @property
    def config_dir_str(self) -> str:
        """配置目录路径（字符串格式，供前端使用）"""
        return self._config_dir_str
    
    @property
    def config_file_str(self) -> str:
        """配置文件路径（字符串格式，供前端使用）"""
        return self._config_file_str
    
    @property
    def backup_dir_str(self) -> str:
        """备份目录路径（字符串格式，供前端使用）"""
        return self._backup_dir_str
    
    def __dir__(self):
        """
        自定义 dir() 输出，隐藏返回 Path 对象的属性
        
        这样 pywebview 在序列化时就不会访问这些属性，
        避免了 WindowsPath 对象的序列化错误。
        
        Returns:
            不包含 Path 属性的属性列表
        """
        # 获取所有属性
        attrs = list(super().__dir__())
        
        # 移除返回 Path 对象的属性
        path_attrs = ['config_dir', 'config_file', 'backup_dir']
        return [attr for attr in attrs if attr not in path_attrs]
    
    @abstractmethod
    def get_default_config(self) -> Dict:
        """
        获取默认配置
        
        Returns:
            默认配置字典
        """
        pass
    
    def load_config(self) -> Dict:
        """
        加载配置文件（带迁移）
        
        Returns:
            配置字典
        """
        # 1. 检查文件是否存在
        if not self.config_file.exists():
            logger.debug(f"[{self.__class__.__name__}] 配置文件不存在，创建默认配置")
            default_config = self.get_default_config()
            self.save_config(default_config)
            return default_config
        
        # 2. 加载配置
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"[{self.__class__.__name__}] 配置文件格式错误: {e}")
            # 尝试从备份恢复
            if self._restore_from_backup():
                return self.load_config()
            else:
                logger.warning(f"[{self.__class__.__name__}] 无可用备份，使用默认配置")
                return self.get_default_config()
        
        # 3. 检测版本
        old_version = config.get("version", "1.0.0")
        current_version = self.CURRENT_VERSION
        
        # 4. 判断是否需要迁移
        if is_version_upgrade(old_version, current_version):
            logger.info(f"[{self.__class__.__name__}] 检测到版本升级: {old_version} -> {current_version}")
            
            # 5. 创建备份
            if self._create_backup(old_version):
                logger.info(f"[{self.__class__.__name__}] 备份创建成功")
            else:
                logger.warning(f"[{self.__class__.__name__}] 备份创建失败，继续迁移")
            
            # 6. 执行迁移
            try:
                migrated_config = self._migrate_config(config, old_version, current_version)
                
                # 7. 保存迁移后的配置
                self.save_config(migrated_config)
                
                logger.debug(f"[{self.__class__.__name__}] 配置迁移成功")
                return migrated_config
            except Exception as e:
                logger.error(f"[{self.__class__.__name__}] 配置迁移失败: {e}")
                
                # 8. 回滚到备份
                if self._restore_from_backup():
                    logger.debug(f"[{self.__class__.__name__}] 已回滚到备份配置")
                    return self.load_config()
                else:
                    logger.warning(f"[{self.__class__.__name__}] 回滚失败，使用默认配置")
                    return self.get_default_config()
        else:
            # 无需迁移，检查是否有缺失字段
            default_config = self.get_default_config()
            
            # 检查是否真的有缺失字段（而不是值不同）
            has_missing_fields = self._has_missing_fields(config, default_config)
            
            if has_missing_fields:
                # 只有真正缺失字段时才补充并保存
                filled_config = fill_missing_fields(config, default_config)
                logger.debug(f"[{self.__class__.__name__}] 检测到缺失字段，补充并保存配置")
                logger.debug(f"[{self.__class__.__name__}] 补充前: {json.dumps(config, sort_keys=True, ensure_ascii=False)}")
                logger.debug(f"[{self.__class__.__name__}] 补充后: {json.dumps(filled_config, sort_keys=True, ensure_ascii=False)}")
                self.save_config(filled_config)
                return filled_config
            else:
                return config
    
    def save_config(self, config: Dict) -> bool:
        """
        保存配置文件
        
        Args:
            config: 配置字典
        
        Returns:
            是否成功
        """
        with self._save_lock:
            try:
                logger.info(f"[{self.__class__.__name__}] 开始保存配置到: {self.config_file}")
                
                # 确保版本号正确
                config["version"] = self.CURRENT_VERSION
                
                # 原子性写入
                temp_file = self.config_file.with_suffix('.tmp')
                logger.info(f"[{self.__class__.__name__}] 写入临时文件: {temp_file}")
                
                with open(temp_file, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=2, ensure_ascii=False)
                
                logger.info(f"[{self.__class__.__name__}] 验证 JSON 格式")
                
                # 验证 JSON 格式
                with open(temp_file, 'r', encoding='utf-8') as f:
                    json.load(f)
                
                logger.info(f"[{self.__class__.__name__}] 重命名临时文件: {temp_file} -> {self.config_file}")
                
                # 重命名
                temp_file.replace(self.config_file)
                
                logger.info(f"[{self.__class__.__name__}] 配置保存成功")
                
                return True
            except Exception as e:
                logger.error(f"[{self.__class__.__name__}] 保存配置失败: {e}")
                import traceback
                logger.error(traceback.format_exc())
                return False
    
    def _migrate_config(self, config: Dict, old_version: str, new_version: str) -> Dict:
        """
        执行配置迁移
        
        Args:
            config: 原始配置
            old_version: 旧版本号
            new_version: 新版本号
        
        Returns:
            迁移后的配置
        """
        # 1. 获取默认配置
        default_config = self.get_default_config()
        
        # 2. 深度合并（补充缺失字段）
        migrated_config = fill_missing_fields(config, default_config)
        
        # 3. 执行版本特定的迁移逻辑
        migrated_config = self._apply_version_migrations(migrated_config, old_version, new_version)
        
        # 4. 更新版本号
        migrated_config["version"] = new_version
        
        return migrated_config
    
    def _apply_version_migrations(self, config: Dict, old_version: str, new_version: str) -> Dict:
        """
        应用版本特定的迁移逻辑
        
        子类可以重写此方法以实现自定义迁移逻辑
        
        Args:
            config: 配置字典
            old_version: 旧版本号
            new_version: 新版本号
        
        Returns:
            迁移后的配置
        """
        # 默认实现：无特殊迁移逻辑
        return config
    
    def _create_backup(self, version: str) -> bool:
        """
        创建配置备份
        
        Args:
            version: 版本号
        
        Returns:
            是否成功
        """
        try:
            if not self.config_file.exists():
                return True
            
            # 生成备份文件名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"{self.config_file.stem}_v{version}_backup_{timestamp}.json"
            backup_file = self.backup_dir / backup_filename
            
            # 复制文件
            import shutil
            shutil.copy2(self.config_file, backup_file)
            
            # 清理旧备份（保留最近 10 个）
            self._cleanup_old_backups()
            
            return True
        except Exception as e:
            logger.error(f"[{self.__class__.__name__}] 创建备份失败: {e}")
            return False
    
    def _restore_from_backup(self) -> bool:
        """
        从最近的备份恢复
        
        Returns:
            是否成功
        """
        try:
            # 查找最近的备份
            backups = sorted(
                self.backup_dir.glob(f"{self.config_file.stem}_v*_backup_*.json"),
                reverse=True
            )
            
            if not backups:
                return False
            
            # 恢复最近的备份
            import shutil
            shutil.copy2(backups[0], self.config_file)
            
            logger.info(f"[{self.__class__.__name__}] 已从备份恢复: {backups[0].name}")
            return True
        except Exception as e:
            logger.error(f"[{self.__class__.__name__}] 恢复备份失败: {e}")
            return False
    
    def _cleanup_old_backups(self) -> None:
        """清理旧备份（保留最近 10 个）"""
        try:
            backups = sorted(
                self.backup_dir.glob(f"{self.config_file.stem}_v*_backup_*.json"),
                reverse=True
            )
            
            # 删除超过 10 个的备份
            for backup in backups[10:]:
                backup.unlink()
        except Exception:
            pass
    
    def _has_missing_fields(self, config: Dict, default_config: Dict) -> bool:
        """
        检查配置中是否有缺失字段
        
        Args:
            config: 用户配置
            default_config: 默认配置
        
        Returns:
            是否有缺失字段
        """
        # 递归检查所有键
        for key in default_config:
            # 如果键不存在，说明缺失
            if key not in config:
                logger.debug(f"[{self.__class__.__name__}] 缺失字段: {key}")
                return True
            
            # 如果都是字典，递归检查
            if isinstance(default_config[key], dict) and isinstance(config[key], dict):
                if self._has_missing_fields(config[key], default_config[key]):
                    return True
        
        return False
    
    def __getstate__(self) -> Dict:
        """
        自定义序列化方法，用于 pickle 和 pywebview 序列化
        
        将所有 Path 对象转换为字符串，避免 pywebview 序列化时
        尝试访问 Path 对象的私有属性（_drv, _hash 等），从而
        消除序列化过程中产生的错误日志。
        
        序列化行为：
        1. 复制对象的 __dict__ 状态字典
        2. 排除缓存相关属性（_config_cache、_cache_mtime）以减少数据量
        3. 使用 PathSerializer.serialize_paths() 递归转换所有 Path 对象为字符串
        4. 如果序列化失败，返回最小安全状态（仅包含基本路径字符串）
        
        注意：
        - 此方法不影响对象的正常使用，仅在序列化时调用
        - 属性访问（config_dir、config_file、backup_dir）仍返回 Path 对象
        - 子类会自动继承此序列化行为
        
        Returns:
            可序列化的状态字典，所有 Path 对象已转换为字符串
            
        Example:
            >>> migrator = ConfigMigrator(Path("backend/config"))
            >>> state = migrator.__getstate__()
            >>> # state 中的所有路径都是字符串类型
            >>> isinstance(state["_config_dir_str"], str)
            True
        """
        try:
            # 1. 复制对象状态字典
            state = self.__dict__.copy()
            
            # 2. 排除不需要序列化的缓存属性
            # 这些属性在反序列化时会重新初始化，无需保存
            state.pop('_config_cache', None)
            state.pop('_cache_mtime', None)
            
            # 3. 使用 PathSerializer 递归转换所有 Path 对象为字符串
            from backend.src.utils.path_serializer import serialize_paths
            serialized_state = serialize_paths(state)
            
            return serialized_state
            
        except Exception as e:
            # 序列化失败时返回最小安全状态
            # 确保应用不会因序列化错误而崩溃
            logger.error(f"[{self.__class__.__name__}] 序列化失败: {e}")
            return {
                "_config_dir_str": self._config_dir_str,
                "_config_file_str": self._config_file_str,
                "_backup_dir_str": self._backup_dir_str
            }
    
    def __setstate__(self, state: Dict) -> None:
        """
        自定义反序列化方法，用于 pickle 反序列化
        
        从序列化状态恢复对象。此方法与 __getstate__ 配对使用，
        支持对象的完整序列化-反序列化循环（如使用 pickle 模块）。
        
        反序列化行为：
        1. 将状态字典中的所有属性恢复到对象的 __dict__
        2. 重新初始化缓存相关属性（_config_cache、_cache_mtime）
        3. 确保所有路径字符串属性正确恢复
        
        注意：
        - 此方法主要用于 pickle 反序列化，pywebview 不需要此方法
        - 缓存属性会被重新初始化为 None，在首次访问时会重新加载
        - 子类会自动继承此反序列化行为
        
        Args:
            state: 序列化状态字典（由 __getstate__ 生成）
            
        Example:
            >>> import pickle
            >>> migrator = ConfigMigrator(Path("backend/config"))
            >>> # 序列化
            >>> serialized = pickle.dumps(migrator)
            >>> # 反序列化
            >>> restored = pickle.loads(serialized)
            >>> # 验证路径属性正确恢复
            >>> assert restored.config_dir == migrator.config_dir
        """
        # 1. 恢复对象状态
        self.__dict__.update(state)
        
        # 2. 重新初始化缓存属性
        # 这些属性在序列化时被排除，需要在反序列化时重新初始化
        # 设置为 None，在首次访问时会重新加载
        if '_config_cache' not in self.__dict__:
            self._config_cache = None
        if '_cache_mtime' not in self.__dict__:
            self._cache_mtime = None
