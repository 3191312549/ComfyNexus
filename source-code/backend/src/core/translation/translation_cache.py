"""
翻译缓存模块

使用SQLite数据库缓存翻译结果，避免重复翻译相同内容。
"""

import hashlib
import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any

from backend.src.utils.logger import app_logger as logger
from backend.src.utils.paths import get_cache_dir


class TranslationCache:
    """
    翻译缓存管理器
    
    使用SQLite数据库存储翻译结果，支持：
    - 缓存翻译结果
    - 查询缓存
    - 清理过期缓存
    """
    
    DEFAULT_CACHE_DAYS = 30
    
    def __init__(self, cache_dir: Optional[str] = None, cache_days: int = DEFAULT_CACHE_DAYS):
        """
        初始化翻译缓存
        
        Args:
            cache_dir: 缓存目录，默认为 cache 目录
            cache_days: 缓存有效期（天）
        """
        if cache_dir is None:
            cache_dir = get_cache_dir()
        
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.db_path = self.cache_dir / "translation_cache.db"
        self.cache_days = cache_days
        
        self._init_database()
    
    def _init_database(self):
        """初始化数据库表"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS translation_cache (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        text_hash TEXT NOT NULL,
                        provider TEXT NOT NULL,
                        source_lang TEXT,
                        target_lang TEXT NOT NULL,
                        translated_text TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        extra TEXT,
                        UNIQUE(text_hash, provider, target_lang)
                    )
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_text_hash 
                    ON translation_cache(text_hash, provider, target_lang)
                """)
                
                conn.commit()
                logger.debug(f"[TranslationCache] 数据库初始化完成: {self.db_path}")
                
        except Exception as e:
            logger.error(f"[TranslationCache] 初始化数据库失败: {e}")
            raise
    
    def _compute_hash(self, text: str) -> str:
        """
        计算文本的MD5哈希值
        
        Args:
            text: 原始文本
            
        Returns:
            MD5哈希值
        """
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    def get(
        self,
        text: str,
        provider: str,
        target_lang: str,
        cache_key: Optional[str] = None,
    ) -> Optional[str]:
        """
        从缓存获取翻译结果
        
        Args:
            text: 原始文本
            provider: 翻译提供商
            target_lang: 目标语言
            cache_key: 可选的自定义缓存键（如 commit hash），优先使用
            
        Returns:
            翻译结果，如果不存在或已过期则返回 None
        """
        try:
            text_hash = cache_key if cache_key else self._compute_hash(text)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT translated_text, created_at
                    FROM translation_cache
                    WHERE text_hash = ? AND provider = ? AND target_lang = ?
                """, (text_hash, provider, target_lang))
                
                row = cursor.fetchone()
                
                if row is None:
                    logger.debug(f"[TranslationCache] 缓存未命中: {text_hash[:8]}...")
                    return None
                
                translated_text, created_at = row
                
                created_time = datetime.fromisoformat(created_at)
                expiry_time = created_time + timedelta(days=self.cache_days)
                
                if datetime.now() > expiry_time:
                    logger.debug(f"[TranslationCache] 缓存已过期: {text_hash[:8]}...")
                    self._delete_expired_entry(cursor, text_hash, provider, target_lang)
                    conn.commit()
                    return None
                
                logger.debug(f"[TranslationCache] 缓存命中: {text_hash[:8]}...")
                return translated_text
                
        except Exception as e:
            logger.error(f"[TranslationCache] 获取缓存失败: {e}")
            return None
    
    def _delete_expired_entry(self, cursor, text_hash: str, provider: str, target_lang: str):
        """删除过期的缓存条目"""
        cursor.execute("""
            DELETE FROM translation_cache
            WHERE text_hash = ? AND provider = ? AND target_lang = ?
        """, (text_hash, provider, target_lang))
    
    def set(
        self,
        text: str,
        translated_text: str,
        provider: str,
        target_lang: str,
        source_lang: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None,
        cache_key: Optional[str] = None,
    ) -> bool:
        """
        保存翻译结果到缓存
        
        Args:
            text: 原始文本
            translated_text: 翻译结果
            provider: 翻译提供商
            target_lang: 目标语言
            source_lang: 源语言
            extra: 额外信息
            cache_key: 可选的自定义缓存键（如 commit hash），优先使用
            
        Returns:
            是否保存成功
        """
        try:
            text_hash = cache_key if cache_key else self._compute_hash(text)
            extra_json = json.dumps(extra, ensure_ascii=False) if extra else None
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT OR REPLACE INTO translation_cache 
                    (text_hash, provider, source_lang, target_lang, translated_text, extra, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    text_hash,
                    provider,
                    source_lang,
                    target_lang,
                    translated_text,
                    extra_json,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                logger.debug(f"[TranslationCache] 缓存已保存: {text_hash[:8]}...")
                return True
                
        except Exception as e:
            logger.error(f"[TranslationCache] 保存缓存失败: {e}")
            return False
    
    def clear(self) -> int:
        """
        清除所有缓存
        
        Returns:
            删除的记录数
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM translation_cache")
                deleted_count = cursor.rowcount
                conn.commit()
                
                logger.info(f"[TranslationCache] 已清除 {deleted_count} 条缓存")
                return deleted_count
                
        except Exception as e:
            logger.error(f"[TranslationCache] 清除缓存失败: {e}")
            return 0
    
    def clear_expired(self) -> int:
        """
        清除过期缓存
        
        Returns:
            删除的记录数
        """
        try:
            expiry_date = (datetime.now() - timedelta(days=self.cache_days)).isoformat()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    DELETE FROM translation_cache
                    WHERE created_at < ?
                """, (expiry_date,))
                
                deleted_count = cursor.rowcount
                conn.commit()
                
                if deleted_count > 0:
                    logger.info(f"[TranslationCache] 已清除 {deleted_count} 条过期缓存")
                
                return deleted_count
                
        except Exception as e:
            logger.error(f"[TranslationCache] 清除过期缓存失败: {e}")
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取缓存统计信息
        
        Returns:
            统计信息字典
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("SELECT COUNT(*) FROM translation_cache")
                total_count = cursor.fetchone()[0]
                
                cursor.execute("""
                    SELECT provider, COUNT(*) 
                    FROM translation_cache 
                    GROUP BY provider
                """)
                provider_counts = dict(cursor.fetchall())
                
                cursor.execute("""
                    SELECT MIN(created_at), MAX(created_at)
                    FROM translation_cache
                """)
                min_date, max_date = cursor.fetchone()
                
                return {
                    'total_count': total_count,
                    'provider_counts': provider_counts,
                    'oldest_entry': min_date,
                    'newest_entry': max_date,
                    'cache_days': self.cache_days,
                    'db_path': str(self.db_path),
                }
                
        except Exception as e:
            logger.error(f"[TranslationCache] 获取统计信息失败: {e}")
            return {
                'total_count': 0,
                'provider_counts': {},
                'error': str(e),
            }
