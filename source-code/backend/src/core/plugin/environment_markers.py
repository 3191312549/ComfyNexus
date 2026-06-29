"""
环境标记评估器

根据 PEP 508 标准评估环境标记（Environment Markers）
判断依赖是否适用于当前系统环境
"""

import platform
import sys
import os
from typing import Dict, Optional
from ...utils.logger import app_logger as logger


class EnvironmentMarkerEvaluator:
    """环境标记评估器"""
    
    def __init__(self):
        """初始化评估器，获取当前系统环境信息"""
        self.env_info = self._get_environment_info()
    
    def _get_environment_info(self) -> Dict[str, str]:
        """
        获取当前系统环境信息
        
        Returns:
            环境信息字典
        """
        try:
            return {
                # 平台信息
                'platform_machine': platform.machine().lower(),  # 'x86_64', 'aarch64', 'arm64'
                'platform_system': platform.system(),  # 'Linux', 'Windows', 'Darwin'
                'sys_platform': sys.platform,  # 'linux', 'win32', 'darwin'
                'os_name': os.name,  # 'posix', 'nt'
                
                # Python 版本信息
                'python_version': f"{sys.version_info.major}.{sys.version_info.minor}",
                'python_full_version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
                'implementation_name': sys.implementation.name,  # 'cpython', 'pypy'
                
                # 平台版本
                'platform_version': platform.version(),
                'platform_release': platform.release(),
            }
        except Exception as e:
            logger.error(f"[EnvironmentMarkerEvaluator] 获取环境信息失败: {e}")
            return {}
    
    def evaluate(self, marker: str) -> bool:
        """
        评估环境标记是否匹配当前系统
        
        Args:
            marker: 环境标记字符串，例如 "platform_machine == 'aarch64'"
            
        Returns:
            True 表示匹配（需要安装），False 表示不匹配（无需安装）
        """
        if not marker or not marker.strip():
            # 没有环境标记，默认匹配
            return True
        
        try:
            # 使用 Python 的 packaging 库评估环境标记
            # 这是最准确的方法，因为它遵循 PEP 508 标准
            try:
                from packaging.markers import Marker
                
                # 创建 Marker 对象并评估
                marker_obj = Marker(marker)
                result = marker_obj.evaluate()
                
                logger.debug(f"[EnvironmentMarkerEvaluator] 评估环境标记: {marker} -> {result}")
                return result
            
            except ImportError:
                # 如果 packaging 库不可用，使用简单的字符串匹配
                logger.warning("[EnvironmentMarkerEvaluator] packaging 库不可用，使用简单评估")
                return self._simple_evaluate(marker)
        
        except Exception as e:
            logger.error(f"[EnvironmentMarkerEvaluator] 评估环境标记失败: {marker}, {e}")
            # 评估失败时，默认返回 True（保守策略，避免漏掉需要的依赖）
            return True
    
    def _simple_evaluate(self, marker: str) -> bool:
        """
        简单的环境标记评估（备用方案）
        
        只支持基本的相等比较，不支持复杂的逻辑表达式
        
        Args:
            marker: 环境标记字符串
            
        Returns:
            评估结果
        """
        try:
            # 移除空格
            marker = marker.strip()
            
            # 支持的操作符
            if '==' in marker:
                parts = marker.split('==')
                if len(parts) == 2:
                    key = parts[0].strip()
                    value = parts[1].strip().strip("'\"")
                    
                    # 获取当前环境的值
                    current_value = self.env_info.get(key, '')
                    
                    # 比较（不区分大小写）
                    return current_value.lower() == value.lower()
            
            elif '!=' in marker:
                parts = marker.split('!=')
                if len(parts) == 2:
                    key = parts[0].strip()
                    value = parts[1].strip().strip("'\"")
                    
                    current_value = self.env_info.get(key, '')
                    return current_value.lower() != value.lower()
            
            # 不支持的格式，默认返回 True
            logger.warning(f"[EnvironmentMarkerEvaluator] 不支持的环境标记格式: {marker}")
            return True
        
        except Exception as e:
            logger.error(f"[EnvironmentMarkerEvaluator] 简单评估失败: {marker}, {e}")
            return True
    
    def get_environment_summary(self) -> str:
        """
        获取当前环境摘要（用于日志和调试）
        
        Returns:
            环境摘要字符串
        """
        return (
            f"Platform: {self.env_info.get('platform_system')} "
            f"({self.env_info.get('platform_machine')}), "
            f"Python: {self.env_info.get('python_version')}"
        )


# 全局单例
_evaluator = None


def get_evaluator() -> EnvironmentMarkerEvaluator:
    """
    获取环境标记评估器单例
    
    Returns:
        评估器实例
    """
    global _evaluator
    if _evaluator is None:
        _evaluator = EnvironmentMarkerEvaluator()
        logger.info(f"[EnvironmentMarkerEvaluator] 初始化完成: {_evaluator.get_environment_summary()}")
    return _evaluator
