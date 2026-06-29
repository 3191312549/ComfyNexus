"""
极客模式管理器

负责极客模式预设的增删查改和参数解析验证。
"""

import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple, Optional

from ...utils.logger import app_logger as logger


class GeekModeManager:
    """极客模式管理器"""
    
    def __init__(self, preset_dir: str = None):
        """
        初始化极客模式管理器
        
        Args:
            preset_dir: 预设文件目录（可选，默认使用配置目录）
        """
        # 使用绝对路径
        if preset_dir is None:
            from ...utils.paths import get_config_dir
            preset_dir = get_config_dir("presets/geek")
        else:
            preset_dir = Path(preset_dir)
        
        # 使用字符串存储路径，避免 pywebview 序列化 Path 对象时出现警告
        self._preset_dir_str = str(preset_dir)
        Path(self._preset_dir_str).mkdir(parents=True, exist_ok=True)
    
    @property
    def preset_dir(self) -> Path:
        """预设目录路径（Path 对象）"""
        return Path(self._preset_dir_str)
    
    def get_all_presets(self) -> List[Dict]:
        """
        获取所有极客模式预设
        
        Returns:
            预设列表
        """
        presets = []
        
        if self.preset_dir.exists():
            for file in self.preset_dir.glob("*.json"):
                try:
                    with open(file, 'r', encoding='utf-8') as f:
                        preset = json.load(f)
                        presets.append(preset)
                except Exception as e:
                    logger.warning(f"加载预设失败 {file}: {str(e)}")
        
        # 按创建时间排序
        presets.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        return presets
    
    def get_preset(self, preset_id: str) -> Optional[Dict]:
        """
        获取指定预设
        
        Args:
            preset_id: 预设ID
            
        Returns:
            预设数据，如果不存在返回 None
        """
        preset_file = self.preset_dir / f"{preset_id}.json"
        
        if not preset_file.exists():
            return None
        
        try:
            with open(preset_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"加载预设失败 {preset_id}: {str(e)}")
            return None
    
    def create_preset(self, name: str, description: str, args: str, preset_id: str = None) -> Dict:
        """
        创建极客模式预设
        
        Args:
            name: 预设名称
            description: 预设描述
            args: 启动参数（多行文本）
            preset_id: 预设ID（可选，如果不提供则自动生成）
            
        Returns:
            创建的预设数据
            
        Raises:
            ValueError: 参数格式错误
        """
        # 验证参数格式
        is_valid, errors = self.validate_args(args)
        if not is_valid:
            raise ValueError(f"参数格式错误:\n" + "\n".join(errors))
        
        # 生成或使用提供的预设ID
        if preset_id is None:
            preset_id = f"geek_{int(time.time() * 1000)}"
        
        # 创建预设数据
        preset = {
            "id": preset_id,
            "name": name,
            "description": description,
            "args": args,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
        }
        
        # 保存预设文件
        preset_file = self.preset_dir / f"{preset_id}.json"
        with open(preset_file, 'w', encoding='utf-8') as f:
            json.dump(preset, f, indent=2, ensure_ascii=False)
        
        return preset
    
    def update_preset(self, preset_id: str, name: str = None, description: str = None, args: str = None) -> Dict:
        """
        更新极客模式预设
        
        Args:
            preset_id: 预设ID
            name: 预设名称（可选）
            description: 预设描述（可选）
            args: 启动参数（可选）
            
        Returns:
            更新后的预设数据
            
        Raises:
            FileNotFoundError: 预设不存在
            ValueError: 参数格式错误
        """
        preset = self.get_preset(preset_id)
        if not preset:
            raise FileNotFoundError(f"预设不存在: {preset_id}")
        
        # 更新字段
        if name is not None:
            preset['name'] = name
        if description is not None:
            preset['description'] = description
        if args is not None:
            # 验证参数格式
            is_valid, errors = self.validate_args(args)
            if not is_valid:
                raise ValueError(f"参数格式错误:\n" + "\n".join(errors))
            preset['args'] = args
        
        preset['updatedAt'] = datetime.now().isoformat()
        
        # 保存预设文件
        preset_file = self.preset_dir / f"{preset_id}.json"
        with open(preset_file, 'w', encoding='utf-8') as f:
            json.dump(preset, f, indent=2, ensure_ascii=False)
        
        return preset
    
    def delete_preset(self, preset_id: str) -> None:
        """
        删除极客模式预设
        
        Args:
            preset_id: 预设ID
            
        Raises:
            FileNotFoundError: 预设不存在
        """
        preset_file = self.preset_dir / f"{preset_id}.json"
        
        if not preset_file.exists():
            raise FileNotFoundError(f"预设不存在: {preset_id}")
        
        preset_file.unlink()
    
    def parse_args(self, custom_args: str) -> List[str]:
        """
        解析极客模式参数
        
        Args:
            custom_args: 多行文本参数
            
        Returns:
            解析后的参数列表
            
        Raises:
            ValueError: 参数格式错误
        """
        # 验证参数格式
        is_valid, errors = self.validate_args(custom_args)
        if not is_valid:
            raise ValueError(f"参数格式错误:\n" + "\n".join(errors))
        
        lines = custom_args.strip().split('\n')
        args = []
        
        for line in lines:
            line = line.strip()
            
            # 忽略空行和注释
            if not line or line.startswith('#'):
                continue
            
            # 分割参数名和值
            parts = line.split(maxsplit=1)
            if len(parts) == 1:
                # 无值参数（如 --gpu-only）
                args.append(parts[0])
            else:
                # 有值参数（如 --port 8188）
                args.extend(parts)
        
        return args
    
    def validate_args(self, custom_args: str) -> Tuple[bool, List[str]]:
        """
        验证极客模式参数
        
        Args:
            custom_args: 多行文本参数
            
        Returns:
            (是否有效, 错误消息列表)
        """
        errors = []
        lines = custom_args.strip().split('\n')
        
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            
            # 忽略空行和注释
            if not line or line.startswith('#'):
                continue
            
            # 检查格式：必须以 -- 开头
            if not line.startswith('--'):
                errors.append(f"第 {line_num} 行: 参数必须以 '--' 开头")
                continue
            
            # 检查参数名称格式
            parts = line.split(maxsplit=1)
            param_name = parts[0][2:]  # 移除 --
            
            if not param_name:
                errors.append(f"第 {line_num} 行: 参数名称不能为空")
                continue
            
            # 参数名称只能包含字母、数字、下划线和连字符
            if not re.match(r'^[a-zA-Z0-9_-]+$', param_name):
                errors.append(f"第 {line_num} 行: 参数名称只能包含字母、数字、下划线和连字符")
        
        return len(errors) == 0, errors
