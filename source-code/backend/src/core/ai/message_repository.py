"""
消息数据访问层

负责消息的数据库操作：保存、查询、删除等。
"""

from typing import List, Optional
import logging
import json

from .models import Message
from .database import get_db_connection


logger = logging.getLogger(__name__)


class MessageRepository:
    """
    消息仓库
    
    提供消息的数据访问操作：
    - save_message: 保存消息到数据库
    - get_messages: 获取话题的消息列表
    - clear_messages: 清空话题的所有消息
    - get_message: 获取单条消息（可选）
    """
    
    def save_message(self, message: Message) -> bool:
        """
        保存消息到数据库
        
        如果消息 ID 已存在，则更新该消息；否则插入新消息。
        
        Args:
            message: 消息对象
            
        Returns:
            bool: 保存成功返回 True
            
        Raises:
            ValueError: 消息数据无效时抛出
        """
        # 验证消息数据
        message.validate()
        
        # 序列化 files 字段为 JSON
        files_json = json.dumps(message.files) if message.files else None
        
        # 保存到数据库（使用 INSERT OR REPLACE 支持更新）
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT OR REPLACE INTO messages (id, topic_id, role, content, timestamp, model, files)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    message.id,
                    message.topic_id,
                    message.role,
                    message.content,
                    message.timestamp,
                    message.model,
                    files_json
                )
            )
            conn.commit()
        
        logger.info(f"保存消息成功: {message.id} ({message.role})")
        return True
    
    def get_messages(
        self, 
        topic_id: str, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[Message]:
        """
        获取话题的消息列表
        
        返回消息列表，按时间戳升序排列（最早的在前）。
        支持分页查询。
        
        Args:
            topic_id: 话题 ID
            limit: 返回的最大消息数量，默认 100
            offset: 偏移量，用于分页，默认 0
            
        Returns:
            List[Message]: 消息列表
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 查询消息
            cursor.execute(
                '''
                SELECT id, topic_id, role, content, timestamp, model, files
                FROM messages
                WHERE topic_id = ?
                ORDER BY timestamp ASC
                LIMIT ? OFFSET ?
                ''',
                (topic_id, limit, offset)
            )
            
            rows = cursor.fetchall()
            
            # 转换为 Message 对象
            messages = []
            for row in rows:
                # 反序列化 files 字段
                files = None
                if row['files']:
                    try:
                        files = json.loads(row['files'])
                    except json.JSONDecodeError:
                        logger.warning(f"消息 {row['id']} 的 files 字段解析失败")
                
                message = Message(
                    id=row['id'],
                    topic_id=row['topic_id'],
                    role=row['role'],
                    content=row['content'],
                    timestamp=row['timestamp'],
                    model=row['model'],
                    files=files
                )
                messages.append(message)
        
        logger.info(f"查询到 {len(messages)} 条消息 (话题: {topic_id})")
        return messages
    
    def clear_messages(self, topic_id: str) -> int:
        """
        清空话题的所有消息
        
        Args:
            topic_id: 话题 ID
            
        Returns:
            int: 删除的消息数量
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 先查询消息数量
            cursor.execute(
                'SELECT COUNT(*) as count FROM messages WHERE topic_id = ?',
                (topic_id,)
            )
            count = cursor.fetchone()['count']
            
            # 删除所有消息
            cursor.execute(
                'DELETE FROM messages WHERE topic_id = ?',
                (topic_id,)
            )
            conn.commit()
        
        logger.info(f"清空话题消息成功: {topic_id} (删除 {count} 条)")
        return count
    
    def get_message(self, message_id: str) -> Optional[Message]:
        """
        获取单条消息
        
        Args:
            message_id: 消息 ID
            
        Returns:
            Message: 消息对象，如果不存在则返回 None
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                '''
                SELECT id, topic_id, role, content, timestamp, model, files
                FROM messages
                WHERE id = ?
                ''',
                (message_id,)
            )
            
            row = cursor.fetchone()
            
            if row is None:
                logger.warning(f"消息不存在: {message_id}")
                return None
            
            # 反序列化 files 字段
            files = None
            if row['files']:
                try:
                    files = json.loads(row['files'])
                except json.JSONDecodeError:
                    logger.warning(f"消息 {row['id']} 的 files 字段解析失败")
            
            message = Message(
                id=row['id'],
                topic_id=row['topic_id'],
                role=row['role'],
                content=row['content'],
                timestamp=row['timestamp'],
                model=row['model'],
                files=files
            )
            
            return message
    
    def get_message_count(self, topic_id: str) -> int:
        """
        获取话题的消息数量
        
        Args:
            topic_id: 话题 ID
            
        Returns:
            int: 消息数量
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                'SELECT COUNT(*) as count FROM messages WHERE topic_id = ?',
                (topic_id,)
            )
            
            count = cursor.fetchone()['count']
            
            return count
