"""
AI 配置管理模块

负责 AI 配置的保存、读取和 API Key 加密。
支持多配置模式。
"""

import json
from typing import Optional, List
from datetime import datetime
from cryptography.fernet import Fernet
from backend.src.core.ai.database import get_db_connection
from backend.src.core.ai.models import APIConfigEntity


class ConfigManager:
    """
    配置管理器
    
    负责 AI 配置的持久化和 API Key 加密。
    """
    
    _ENCRYPTION_KEY = b'ZmDfcTF7_60GrrY167zsiPd67pEvs0aGOv2oasOM1Pg='
    
    def __init__(self):
        self._cipher = Fernet(self._ENCRYPTION_KEY)
    
    # ========== 多配置管理方法 ==========
    
    def list_configs(self) -> List[APIConfigEntity]:
        """
        获取所有 API 配置列表
        
        Returns:
            List[APIConfigEntity]: 配置实体列表
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM api_configs
                    ORDER BY updated_at DESC
                """)
                rows = cursor.fetchall()
            
            configs = []
            for row in rows:
                # 转换为字典
                config_dict = dict(row)
                
                # 解析 JSON 字段
                config_dict["models"] = json.loads(config_dict["models"])
                if config_dict["extra"]:
                    config_dict["extra"] = json.loads(config_dict["extra"])
                else:
                    config_dict["extra"] = {}
                
                # 转换布尔值
                config_dict["is_default"] = bool(config_dict["is_default"])
                config_dict["use_system_proxy"] = bool(config_dict.get("use_system_proxy", 0))
                
                # 解密 API Key
                if config_dict["api_key"]:
                    config_dict["api_key"] = self._decrypt_single_api_key(
                        config_dict["api_key"]
                    )
                
                # 创建配置实体
                config = APIConfigEntity.from_dict(config_dict)
                configs.append(config)
            
            return configs
        except Exception as e:
            print(f"获取配置列表失败: {e}")
            return []
    
    def get_config_by_id(self, config_id: str) -> Optional[APIConfigEntity]:
        """
        根据 ID 获取配置
        
        Args:
            config_id: 配置 ID
            
        Returns:
            Optional[APIConfigEntity]: 配置实体，不存在则返回 None
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM api_configs WHERE id = ?
                """, (config_id,))
                row = cursor.fetchone()
            
            if row is None:
                return None
            
            # 转换为字典
            config_dict = dict(row)
            
            # 解析 JSON 字段
            config_dict["models"] = json.loads(config_dict["models"])
            if config_dict["extra"]:
                config_dict["extra"] = json.loads(config_dict["extra"])
            else:
                config_dict["extra"] = {}
            
            # 转换布尔值
            config_dict["is_default"] = bool(config_dict["is_default"])
            config_dict["use_system_proxy"] = bool(config_dict.get("use_system_proxy", 0))
            
            # 解密 API Key
            if config_dict["api_key"]:
                config_dict["api_key"] = self._decrypt_single_api_key(
                    config_dict["api_key"]
                )
            
            # 创建配置实体
            return APIConfigEntity.from_dict(config_dict)
        except Exception as e:
            print(f"获取配置失败: {e}")
            return None
    
    def create_config(self, config: APIConfigEntity) -> str:
        """
        创建新配置
        
        Args:
            config: 配置实体
            
        Returns:
            str: 新创建的配置 ID
            
        Raises:
            ValueError: 配置验证失败时抛出
        """
        # 验证配置
        config.validate()
        
        try:
            # 加密 API Key
            encrypted_api_key = self._encrypt_single_api_key(config.api_key)
            
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO api_configs (
                        id, alias, provider, api_key, base_url, model, models,
                        extra, is_default, status, last_tested_at, last_test_latency,
                        usage_count, use_system_proxy, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    config.id,
                    config.alias,
                    config.provider,
                    encrypted_api_key,
                    config.base_url,
                    config.model,
                    json.dumps(config.models, ensure_ascii=False),
                    json.dumps(config.extra, ensure_ascii=False) if config.extra else None,
                    1 if config.is_default else 0,
                    config.status,
                    config.last_tested_at,
                    config.last_test_latency,
                    config.usage_count,
                    1 if config.use_system_proxy else 0,
                    config.created_at,
                    config.updated_at
                ))
                conn.commit()
            
            return config.id
        except Exception as e:
            print(f"创建配置失败: {e}")
            raise
    
    def update_config(self, config_id: str, config: APIConfigEntity) -> bool:
        """
        更新配置
        
        Args:
            config_id: 配置 ID
            config: 配置实体
            
        Returns:
            bool: 更新是否成功
            
        Raises:
            ValueError: 配置验证失败时抛出
        """
        # 验证配置
        config.validate()
        
        try:
            # 加密 API Key
            encrypted_api_key = self._encrypt_single_api_key(config.api_key)
            
            # 更新时间戳
            config.updated_at = datetime.now().isoformat()
            
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE api_configs SET
                        alias = ?,
                        provider = ?,
                        api_key = ?,
                        base_url = ?,
                        model = ?,
                        models = ?,
                        extra = ?,
                        is_default = ?,
                        status = ?,
                        last_tested_at = ?,
                        last_test_latency = ?,
                        usage_count = ?,
                        use_system_proxy = ?,
                        updated_at = ?
                    WHERE id = ?
                """, (
                    config.alias,
                    config.provider,
                    encrypted_api_key,
                    config.base_url,
                    config.model,
                    json.dumps(config.models, ensure_ascii=False),
                    json.dumps(config.extra, ensure_ascii=False) if config.extra else None,
                    1 if config.is_default else 0,
                    config.status,
                    config.last_tested_at,
                    config.last_test_latency,
                    config.usage_count,
                    1 if config.use_system_proxy else 0,
                    config.updated_at,
                    config_id
                ))
                conn.commit()
            
            return cursor.rowcount > 0
        except Exception as e:
            print(f"更新配置失败: {e}")
            return False
    
    def delete_config(self, config_id: str) -> bool:
        """
        删除配置
        
        Args:
            config_id: 配置 ID
            
        Returns:
            bool: 删除是否成功
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    DELETE FROM api_configs WHERE id = ?
                """, (config_id,))
                conn.commit()
            
            return cursor.rowcount > 0
        except Exception as e:
            print(f"删除配置失败: {e}")
            return False
    
    def _encrypt_single_api_key(self, api_key: str) -> str:
        """
        加密单个 API Key
        
        Args:
            api_key: 明文 API Key
            
        Returns:
            str: 加密后的 API Key（带 encrypted: 前缀）
        """
        if not api_key:
            return ""
        
        # 加密 API Key
        encrypted = self._cipher.encrypt(api_key.encode())
        # 添加前缀标识这是加密的值
        return f"encrypted:{encrypted.decode()}"
    
    def _decrypt_single_api_key(self, encrypted_api_key: str) -> str:
        """
        解密单个 API Key
        
        Args:
            encrypted_api_key: 加密的 API Key（带 encrypted: 前缀）
            
        Returns:
            str: 明文 API Key
        """
        if not encrypted_api_key:
            return ""
        
        # 检查是否是加密的值
        if encrypted_api_key.startswith("encrypted:"):
            # 解密 API Key
            encrypted_data = encrypted_api_key[len("encrypted:"):].encode()
            decrypted = self._cipher.decrypt(encrypted_data)
            return decrypted.decode()
        
        # 如果不是加密的值，直接返回（向后兼容）
        return encrypted_api_key
    
    def set_default_config(self, config_id: str) -> bool:
        """
        设置默认配置
        
        Args:
            config_id: 配置 ID
            
        Returns:
            bool: 设置是否成功
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                
                # 首先清除所有默认配置标记
                cursor.execute("""
                    UPDATE api_configs SET is_default = 0
                """)
                
                # 设置指定配置为默认
                cursor.execute("""
                    UPDATE api_configs SET is_default = 1
                    WHERE id = ?
                """, (config_id,))
                
                conn.commit()
            
            return cursor.rowcount > 0
        except Exception as e:
            print(f"设置默认配置失败: {e}")
            return False
    
    def get_default_config(self) -> Optional[APIConfigEntity]:
        """
        获取默认配置
        
        Returns:
            Optional[APIConfigEntity]: 默认配置实体，不存在则返回 None
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM api_configs WHERE is_default = 1
                """)
                row = cursor.fetchone()
            
            if row is None:
                return None
            
            # 转换为字典
            config_dict = dict(row)
            
            # 解析 JSON 字段
            config_dict["models"] = json.loads(config_dict["models"])
            if config_dict["extra"]:
                config_dict["extra"] = json.loads(config_dict["extra"])
            else:
                config_dict["extra"] = {}
            
            # 转换布尔值
            config_dict["is_default"] = bool(config_dict["is_default"])
            config_dict["use_system_proxy"] = bool(config_dict.get("use_system_proxy", 0))
            
            # 解密 API Key
            if config_dict["api_key"]:
                config_dict["api_key"] = self._decrypt_single_api_key(
                    config_dict["api_key"]
                )
            
            # 创建配置实体
            return APIConfigEntity.from_dict(config_dict)
        except Exception as e:
            print(f"获取默认配置失败: {e}")
            return None
    
    def increment_usage_count(self, config_id: str) -> bool:
        """
        增加配置使用计数
        
        Args:
            config_id: 配置 ID
            
        Returns:
            bool: 更新是否成功
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE api_configs 
                    SET usage_count = usage_count + 1,
                        updated_at = ?
                    WHERE id = ?
                """, (datetime.now().isoformat(), config_id))
                conn.commit()
            
            return cursor.rowcount > 0
        except Exception as e:
            print(f"增加使用计数失败: {e}")
            return False
    
    def update_test_status(
        self, 
        config_id: str, 
        status: str, 
        latency: Optional[float] = None
    ) -> bool:
        """
        更新配置测试状态
        
        Args:
            config_id: 配置 ID
            status: 状态（"available" | "unavailable"）
            latency: 响应延迟（毫秒）
            
        Returns:
            bool: 更新是否成功
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE api_configs 
                    SET status = ?,
                        last_tested_at = ?,
                        last_test_latency = ?,
                        updated_at = ?
                    WHERE id = ?
                """, (
                    status,
                    datetime.now().isoformat(),
                    latency,
                    datetime.now().isoformat(),
                    config_id
                ))
                conn.commit()
            
            return cursor.rowcount > 0
        except Exception as e:
            print(f"更新测试状态失败: {e}")
            return False
    
    def export_configs(self, config_ids: Optional[List[str]] = None) -> str:
        """
        导出配置为 JSON 格式
        
        Args:
            config_ids: 要导出的配置 ID 列表，None 表示导出所有配置
            
        Returns:
            str: JSON 格式的配置数据
            
        验证需求：10.1, 10.2
        """
        try:
            # 获取要导出的配置
            if config_ids is None:
                configs = self.list_configs()
            else:
                configs = [
                    self.get_config_by_id(config_id) 
                    for config_id in config_ids
                ]
                # 过滤掉不存在的配置
                configs = [c for c in configs if c is not None]
            
            # 转换为字典列表
            export_data = []
            for config in configs:
                config_dict = config.to_dict()
                
                # 加密 API Key（确保导出时 API Key 是加密的）
                if config_dict["api_key"]:
                    config_dict["api_key"] = self._encrypt_single_api_key(
                        config_dict["api_key"]
                    )
                
                export_data.append(config_dict)
            
            # 构建导出结构
            export_structure = {
                "version": "1.0",
                "exported_at": datetime.now().isoformat(),
                "configs": export_data
            }
            
            # 转换为 JSON
            return json.dumps(export_structure, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"导出配置失败: {e}")
            raise
    
    def import_configs(
        self, 
        import_json: str, 
        conflict_strategy: str = "skip"
    ) -> dict:
        """
        从 JSON 导入配置
        
        Args:
            import_json: JSON 格式的配置数据
            conflict_strategy: 冲突处理策略（"skip" 跳过, "overwrite" 覆盖）
            
        Returns:
            dict: 导入结果 {
                "success": bool,
                "imported": int,  # 成功导入的数量
                "skipped": int,   # 跳过的数量
                "errors": List[str]  # 错误信息列表
            }
            
        验证需求：10.3, 10.4
        """
        result = {
            "success": False,
            "imported": 0,
            "skipped": 0,
            "errors": []
        }
        
        try:
            # 解析 JSON
            try:
                import_data = json.loads(import_json)
            except json.JSONDecodeError as e:
                result["errors"].append(f"JSON 格式无效: {str(e)}")
                return result
            
            # 验证导入数据格式
            if not isinstance(import_data, dict):
                result["errors"].append("导入数据格式错误：应为对象")
                return result
            
            if "configs" not in import_data:
                result["errors"].append("导入数据缺少 configs 字段")
                return result
            
            if not isinstance(import_data["configs"], list):
                result["errors"].append("configs 字段应为数组")
                return result
            
            # 获取现有配置 ID 列表
            existing_configs = self.list_configs()
            existing_ids = {config.id for config in existing_configs}
            
            # 导入每个配置
            for config_dict in import_data["configs"]:
                try:
                    # 检查必填字段
                    required_fields = ["id", "alias", "provider", "model"]
                    for field in required_fields:
                        if field not in config_dict:
                            result["errors"].append(
                                f"配置缺少必填字段: {field}"
                            )
                            result["skipped"] += 1
                            continue
                    
                    config_id = config_dict["id"]
                    
                    # 处理冲突
                    if config_id in existing_ids:
                        if conflict_strategy == "skip":
                            result["skipped"] += 1
                            continue
                        elif conflict_strategy == "overwrite":
                            # 删除现有配置
                            self.delete_config(config_id)
                    
                    # 创建配置实体
                    config = APIConfigEntity.from_dict(config_dict)
                    
                    # 验证配置
                    config.validate()
                    
                    # 创建配置
                    self.create_config(config)
                    result["imported"] += 1
                    
                except ValueError as e:
                    result["errors"].append(f"配置验证失败 ({config_dict.get('alias', 'unknown')}): {str(e)}")
                    result["skipped"] += 1
                except Exception as e:
                    result["errors"].append(f"导入配置失败 ({config_dict.get('alias', 'unknown')}): {str(e)}")
                    result["skipped"] += 1
            
            result["success"] = result["imported"] > 0
            return result
            
        except Exception as e:
            result["errors"].append(f"导入过程异常: {str(e)}")
            return result

