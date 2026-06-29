"""
环境变量解析器

该模块提供环境变量文本解析功能，支持从多行文本中解析 KEY=VALUE 格式的环境变量。
"""

import re
from typing import Dict

from .logger import app_logger as logger


def parse_env_vars(env_text: str) -> Dict[str, str]:
    """
    解析环境变量文本
    
    Args:
        env_text: 环境变量配置文本，每行一条环境变量
        
    Returns:
        解析后的环境变量字典
        
    规则：
    - 每行一条环境变量，格式为 KEY=VALUE
    - 忽略空行
    - 忽略以 # 开头的注释行
    - 支持值中包含空格（不需要引号）
    - 支持引号包裹的值（会去除引号）
    - 格式错误的行会被跳过并记录警告
    
    示例：
        >>> env_text = '''
        ... PYTHONIOENCODING=utf-8
        ... CUDA_VISIBLE_DEVICES=0,1
        ... # 这是注释
        ... MY_VAR=value with spaces
        ... QUOTED="value in quotes"
        ... '''
        >>> result = parse_env_vars(env_text)
        >>> result['PYTHONIOENCODING']
        'utf-8'
        >>> result['MY_VAR']
        'value with spaces'
    """
    if not env_text:
        return {}
    
    env_vars = {}
    lines = env_text.strip().split('\n')
    
    for line_num, line in enumerate(lines, start=1):
        # 去除首尾空白
        line = line.strip()
        
        # 跳过空行
        if not line:
            continue
        
        # 跳过注释行
        if line.startswith('#'):
            continue
        
        # 检查是否包含等号
        if '=' not in line:
            logger.warning(f'跳过无效的环境变量配置（第 {line_num} 行）: "{line}"')
            continue
        
        # 分割键值对（只在第一个等号处分割）
        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip()
        
        # 验证键名（必须是有效的环境变量名）
        # 环境变量名只能包含字母、数字和下划线，且不能以数字开头
        if not key or not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', key):
            logger.warning(f'跳过无效的环境变量配置（第 {line_num} 行）: 键名 "{key}" 不符合规范')
            continue
        
        # 处理引号包裹的值
        # 支持双引号和单引号
        if (value.startswith('"') and value.endswith('"')) or \
           (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        
        env_vars[key] = value
    
    return env_vars
