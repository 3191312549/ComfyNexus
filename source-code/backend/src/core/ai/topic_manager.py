"""
话题管理服务

负责话题的创建、查询、更新和删除操作。
"""

from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

from .models import Topic
from .database import get_db_connection


logger = logging.getLogger(__name__)


class TopicManager:
    """
    话题管理器
    
    提供话题的 CRUD 操作：
    - create_topic: 创建新话题
    - get_topics: 获取所有话题
    - get_topic: 获取单个话题
    - delete_topic: 删除话题
    - rename_topic: 重命名话题
    """
    
    def create_topic(self, name: str = "新对话") -> Topic:
        """
        创建新话题
        
        Args:
            name: 话题名称，默认为"新对话"
            
        Returns:
            Topic: 新创建的话题对象
            
        Raises:
            ValueError: 话题名称无效时抛出
        """
        # 创建话题对象
        topic = Topic.create(name)
        
        # 验证话题数据
        topic.validate()
        
        # 保存到数据库
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO topics (id, name, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ''',
                (topic.id, topic.name, topic.created_at, topic.updated_at)
            )
            conn.commit()
        
        logger.info(f"创建话题成功: {topic.id} - {topic.name}")
        return topic
    
    def get_topics(self) -> List[Topic]:
        """
        获取所有话题
        
        返回话题列表，按更新时间倒序排列（最新的在前）。
        每个话题包含消息数量和激活配置 ID。
        
        Returns:
            List[Topic]: 话题列表
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 查询话题及其消息数量
            cursor.execute(
                '''
                SELECT 
                    t.id,
                    t.name,
                    t.created_at,
                    t.updated_at,
                    t.active_config_id,
                    COUNT(m.id) as message_count
                FROM topics t
                LEFT JOIN messages m ON t.id = m.topic_id
                GROUP BY t.id
                ORDER BY t.updated_at DESC
                '''
            )
            
            rows = cursor.fetchall()
            
            # 转换为 Topic 对象
            topics = []
            for row in rows:
                topic = Topic(
                    id=row['id'],
                    name=row['name'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at'],
                    message_count=row['message_count'],
                    active_config_id=row['active_config_id']
                )
                topics.append(topic)
        
        logger.info(f"查询到 {len(topics)} 个话题")
        return topics
    
    def get_topic(self, topic_id: str) -> Optional[Topic]:
        """
        获取单个话题
        
        Args:
            topic_id: 话题 ID
            
        Returns:
            Topic: 话题对象，如果不存在则返回 None
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 查询话题及其消息数量
            cursor.execute(
                '''
                SELECT 
                    t.id,
                    t.name,
                    t.created_at,
                    t.updated_at,
                    t.active_config_id,
                    COUNT(m.id) as message_count
                FROM topics t
                LEFT JOIN messages m ON t.id = m.topic_id
                WHERE t.id = ?
                GROUP BY t.id
                ''',
                (topic_id,)
            )
            
            row = cursor.fetchone()
            
            if row is None:
                logger.warning(f"话题不存在: {topic_id}")
                return None
            
            topic = Topic(
                id=row['id'],
                name=row['name'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                message_count=row['message_count'],
                active_config_id=row['active_config_id']
            )
            
            return topic
    
    def delete_topic(self, topic_id: str) -> bool:
        """
        删除话题
        
        删除话题时，会级联删除该话题下的所有消息（通过外键约束）。
        
        Args:
            topic_id: 话题 ID
            
        Returns:
            bool: 删除成功返回 True，话题不存在返回 False
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 检查话题是否存在
            cursor.execute(
                'SELECT id FROM topics WHERE id = ?',
                (topic_id,)
            )
            
            if cursor.fetchone() is None:
                logger.warning(f"话题不存在，无法删除: {topic_id}")
                return False
            
            # 删除话题（消息会被级联删除）
            cursor.execute(
                'DELETE FROM topics WHERE id = ?',
                (topic_id,)
            )
            conn.commit()
        
        logger.info(f"删除话题成功: {topic_id}")
        return True
    
    def rename_topic(self, topic_id: str, name: str) -> bool:
        """
        重命名话题
        
        Args:
            topic_id: 话题 ID
            name: 新名称
            
        Returns:
            bool: 重命名成功返回 True，话题不存在返回 False
            
        Raises:
            ValueError: 新名称无效时抛出
        """
        # 验证新名称
        if not name or not name.strip():
            raise ValueError("话题名称不能为空")
        if len(name) > 100:
            raise ValueError("话题名称不能超过 100 个字符")
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 检查话题是否存在
            cursor.execute(
                'SELECT id FROM topics WHERE id = ?',
                (topic_id,)
            )
            
            if cursor.fetchone() is None:
                logger.warning(f"话题不存在，无法重命名: {topic_id}")
                return False
            
            # 更新话题名称和更新时间
            now = datetime.now().isoformat()
            cursor.execute(
                '''
                UPDATE topics 
                SET name = ?, updated_at = ?
                WHERE id = ?
                ''',
                (name, now, topic_id)
            )
            conn.commit()
        
        logger.info(f"重命名话题成功: {topic_id} -> {name}")
        return True
    
    def update_active_config(self, topic_id: str, config_id: str) -> bool:
        """
        更新话题的激活配置
        
        Args:
            topic_id: 话题 ID
            config_id: API 配置 ID
            
        Returns:
            bool: 更新成功返回 True，话题不存在返回 False
            
        Raises:
            ValueError: 参数无效时抛出
        """
        # 验证参数
        if not topic_id or not topic_id.strip():
            raise ValueError("话题 ID 不能为空")
        if not config_id or not config_id.strip():
            raise ValueError("配置 ID 不能为空")
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 检查话题是否存在
            cursor.execute(
                'SELECT id FROM topics WHERE id = ?',
                (topic_id,)
            )
            
            if cursor.fetchone() is None:
                logger.warning(f"话题不存在，无法更新配置: {topic_id}")
                return False
            
            # 更新激活配置和更新时间
            now = datetime.now().isoformat()
            cursor.execute(
                '''
                UPDATE topics 
                SET active_config_id = ?, updated_at = ?
                WHERE id = ?
                ''',
                (config_id, now, topic_id)
            )
            conn.commit()
        
        logger.info(f"更新话题配置成功: {topic_id} -> {config_id}")
        return True
    
    def get_active_config_id(self, topic_id: str) -> Optional[str]:
        """
        获取话题的激活配置 ID
        
        Args:
            topic_id: 话题 ID
            
        Returns:
            Optional[str]: 激活配置 ID，如果未设置或话题不存在则返回 None
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                'SELECT active_config_id FROM topics WHERE id = ?',
                (topic_id,)
            )
            
            row = cursor.fetchone()
            
            if row is None:
                logger.warning(f"话题不存在: {topic_id}")
                return None
            
            config_id = row['active_config_id']
            
            if config_id:
                logger.debug(f"话题 {topic_id} 的激活配置: {config_id}")
            else:
                logger.debug(f"话题 {topic_id} 未设置激活配置")
            
            return config_id
    
    def clear_active_config(self, topic_id: str) -> bool:
        """
        清除话题的激活配置
        
        将话题的 active_config_id 设置为 NULL。
        
        Args:
            topic_id: 话题 ID
            
        Returns:
            bool: 清除成功返回 True，话题不存在返回 False
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 检查话题是否存在
            cursor.execute(
                'SELECT id FROM topics WHERE id = ?',
                (topic_id,)
            )
            
            if cursor.fetchone() is None:
                logger.warning(f"话题不存在，无法清除配置: {topic_id}")
                return False
            
            # 清除激活配置
            now = datetime.now().isoformat()
            cursor.execute(
                '''
                UPDATE topics 
                SET active_config_id = NULL, updated_at = ?
                WHERE id = ?
                ''',
                (now, topic_id)
            )
            conn.commit()
        
        logger.info(f"清除话题配置成功: {topic_id}")
        return True
