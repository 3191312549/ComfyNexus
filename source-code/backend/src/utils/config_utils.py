"""
配置工具模块
提供深度合并、字段验证等功能
"""

from typing import Any, Dict, List, Optional


def deep_merge(base: Dict, updates: Dict, preserve_user_values: bool = True) -> Dict:
    """
    深度合并两个字典
    
    Args:
        base: 基础字典（默认配置）
        updates: 更新字典（用户配置）
        preserve_user_values: 是否保留用户值
    
    Returns:
        合并后的字典
    
    规则：
        1. 如果 key 只在 base 中存在，添加到结果
        2. 如果 key 只在 updates 中存在，添加到结果
        3. 如果 key 在两者中都存在：
           - 如果都是字典，递归合并
           - 否则，使用 updates 的值（preserve_user_values=True）
    """
    result = {}
    
    # 获取所有键
    all_keys = set(base.keys()) | set(updates.keys())
    
    for key in all_keys:
        # 情况 1: 只在 base 中
        if key in base and key not in updates:
            result[key] = _deep_copy(base[key])
        
        # 情况 2: 只在 updates 中
        elif key not in base and key in updates:
            result[key] = _deep_copy(updates[key])
        
        # 情况 3: 在两者中都存在
        else:
            base_value = base[key]
            update_value = updates[key]
            
            # 如果都是字典，递归合并
            if isinstance(base_value, dict) and isinstance(update_value, dict):
                result[key] = deep_merge(base_value, update_value, preserve_user_values)
            
            # 否则，使用 updates 的值
            else:
                if preserve_user_values:
                    result[key] = _deep_copy(update_value)
                else:
                    result[key] = _deep_copy(base_value)
    
    return result


def merge_list_items(base_list: List[Dict], 
                     update_list: List[Dict], 
                     key_field: str = "id") -> List[Dict]:
    """
    合并两个字典列表
    
    Args:
        base_list: 基础列表（默认配置）
        update_list: 更新列表（用户配置）
        key_field: 用于匹配的键字段
    
    Returns:
        合并后的列表
    
    规则：
        1. 根据 key_field 匹配元素
        2. 匹配的元素进行深度合并
        3. 未匹配的元素保留
    """
    # 创建结果列表
    result = []
    
    # 创建 update_list 的索引
    update_dict = {}
    for item in update_list:
        if key_field in item:
            update_dict[item[key_field]] = item
    
    # 处理 base_list 中的项
    processed_keys = set()
    for base_item in base_list:
        if key_field in base_item:
            key = base_item[key_field]
            processed_keys.add(key)
            
            # 如果在 update_list 中找到匹配项，合并
            if key in update_dict:
                merged_item = deep_merge(base_item, update_dict[key])
                result.append(merged_item)
            else:
                result.append(_deep_copy(base_item))
        else:
            # 没有键字段，直接保留
            result.append(_deep_copy(base_item))
    
    # 添加 update_list 中未匹配的项
    for update_item in update_list:
        if key_field in update_item:
            key = update_item[key_field]
            if key not in processed_keys:
                result.append(_deep_copy(update_item))
        else:
            # 没有键字段，直接添加
            result.append(_deep_copy(update_item))
    
    return result


def fill_missing_fields(config: Dict, default_config: Dict) -> Dict:
    """
    填充缺失字段
    
    Args:
        config: 用户配置
        default_config: 默认配置
    
    Returns:
        补充后的配置
    """
    return deep_merge(default_config, config, preserve_user_values=True)


def _deep_copy(obj: Any) -> Any:
    """
    深度复制对象
    
    Args:
        obj: 要复制的对象
    
    Returns:
        复制后的对象
    """
    if isinstance(obj, dict):
        return {k: _deep_copy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_deep_copy(item) for item in obj]
    else:
        # 基本类型直接返回
        return obj
