"""
依赖冲突检测器

用于插件市场功能，检测插件依赖与当前环境已安装包之间的版本冲突
"""

import os
import subprocess
import re
import json
from pathlib import Path
from typing import List, Dict, Optional
from packaging.specifiers import SpecifierSet, InvalidSpecifier
from packaging.version import Version, InvalidVersion

from .models import Dependency, DependencyConflict, ConflictType, ConflictSeverity
from .logger import marketplace_logger as logger
from ...utils.python_command import PythonCommandBuilder


class DependencyChecker:
    """
    依赖冲突检测器
    
    功能：
    1. 解析 requirements.txt 文件
    2. 获取已安装的 Python 包列表
    3. 检测版本冲突
    """
    
    def __init__(self):
        """初始化依赖检测器"""
        pass
    
    def check_conflicts(
        self,
        requirements_file: Path,
        python_path: Path
    ) -> Dict:
        """
        检查依赖冲突
        
        重要定义：
        - 冲突（conflict）：已安装的包版本不符合要求
        - 缺失（missing）：包未安装
        
        Args:
            requirements_file: requirements.txt 文件路径
            python_path: Python 解释器路径
            
        Returns:
            检查报告字典：
            {
                'success': bool,                           # 是否成功检查
                'has_conflicts': bool,                     # 是否存在版本冲突
                'conflicts': [DependencyConflict, ...],    # 版本冲突列表（只包含 VERSION_MISMATCH）
                'missing': [DependencyConflict, ...],      # 缺失依赖列表（只包含 MISSING）
                'error': str                               # 错误信息（如果失败）
            }
        """
        try:
            # 1. 解析 requirements.txt
            logger.info(f"解析 requirements.txt: {requirements_file}")
            required_deps = self._parse_requirements(requirements_file)
            
            if not required_deps:
                logger.info("未找到依赖要求")
                return {
                    'success': True,
                    'has_conflicts': False,
                    'conflicts': [],
                    'missing': [],
                    'error': ''
                }
            
            # 2. 获取已安装的包列表
            logger.info(f"获取已安装包列表: {python_path}")
            installed_packages = self._get_installed_packages(python_path)
            
            # 3. 检测版本冲突和缺失依赖
            logger.info("检测版本冲突和缺失依赖")
            all_issues = self._detect_version_conflicts(required_deps, installed_packages)
            
            # 4. 分离冲突和缺失
            conflicts = [issue for issue in all_issues if issue.conflict_type == ConflictType.VERSION_MISMATCH]
            missing = [issue for issue in all_issues if issue.conflict_type == ConflictType.MISSING]
            
            logger.info(f"检测完成，发现 {len(conflicts)} 个版本冲突，{len(missing)} 个缺失依赖")
            
            return {
                'success': True,
                'has_conflicts': len(conflicts) > 0,
                'conflicts': [conflict.to_dict() for conflict in conflicts],
                'missing': [miss.to_dict() for miss in missing],
                'error': ''
            }
            
        except Exception as e:
            logger.error(f"依赖冲突检测失败: {e}")
            logger.exception(f"详细错误信息")
            return {
                'success': False,
                'has_conflicts': False,
                'conflicts': [],
                'missing': [],
                'error': str(e)
            }
    
    def _parse_requirements(self, requirements_file: Path) -> List[Dependency]:
        """
        解析 requirements.txt 文件
        
        支持的格式：
        - package==1.0.0
        - package>=1.0.0
        - package<=2.0.0
        - package~=1.5
        - package!=1.2.3
        - package>=1.0.0,<2.0.0
        - package  (无版本要求)
        
        忽略：
        - 注释行（以 # 开头）
        - 空行
        - -e 开头的可编辑安装
        - -r 开头的递归引用
        
        Args:
            requirements_file: requirements.txt 文件路径
            
        Returns:
            依赖列表
        """
        dependencies = []
        
        if not requirements_file.exists():
            logger.warning(f"requirements.txt 文件不存在: {requirements_file}")
            return dependencies
        
        try:
            with open(requirements_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, 1):
                # 去除首尾空白
                line = line.strip()
                
                # 跳过空行
                if not line:
                    continue
                
                # 跳过注释行
                if line.startswith('#'):
                    continue
                
                # 跳过可编辑安装和递归引用
                if line.startswith('-e') or line.startswith('-r'):
                    logger.debug(f"跳过特殊行 {line_num}: {line}")
                    continue
                
                # 移除行内注释
                if '#' in line:
                    line = line.split('#')[0].strip()
                
                # 解析依赖
                try:
                    dep = self._parse_requirement_line(line)
                    if dep:
                        dependencies.append(dep)
                        logger.debug(f"解析依赖: {dep}")
                except Exception as e:
                    logger.warning(f"解析第 {line_num} 行失败: {line}, 错误: {e}")
                    continue
            
            logger.info(f"成功解析 {len(dependencies)} 个依赖")
            return dependencies
            
        except Exception as e:
            logger.error(f"读取 requirements.txt 失败: {e}")
            return dependencies
    
    def _parse_requirement_line(self, line: str) -> Optional[Dependency]:
        """
        解析单行依赖要求

        支持的格式：
        - package==1.0.0
        - package>=1.0.0
        - package[extra]==1.0.0
        - package[extra1,extra2]>=1.0.0

        Args:
            line: 依赖行（已去除注释和空白）

        Returns:
            Dependency 对象，如果解析失败返回 None
        """
        # 先去除首尾空白
        line = line.strip()

        if not line:
            return None

        # 正则表达式匹配包名、extras 和版本要求
        # 格式: package[extra1,extra2]>=1.0.0
        # 包名可以包含字母、数字、下划线、连字符、点
        # extras 在方括号中，可选
        # 版本要求可以包含 ==, >=, <=, ~=, !=, <, > 等操作符
        pattern = r'^([a-zA-Z0-9_\-\.]+)(?:\[([^\]]+)\])?\s*(.*)'
        match = re.match(pattern, line)

        if not match:
            logger.warning(f"无法解析依赖行: {line}")
            return None

        package = match.group(1).strip()
        extras = match.group(2)  # extras 部分（可能为 None）
        version_spec = match.group(3).strip()

        # 验证包名不为空
        if not package:
            return None

        # 如果有 extras，记录日志但不影响包名
        if extras:
            logger.debug(f"包 {package} 包含 extras: [{extras}]")

        # 如果没有版本要求，使用空字符串
        if not version_spec:
            version_spec = ""

        return Dependency(package=package, version_spec=version_spec)

    
    def _get_installed_packages(self, python_path: Path) -> Dict[str, str]:
        """
        获取已安装的 Python 包列表及版本
        
        使用 PythonCommandBuilder 调用 pip list 命令
        
        Args:
            python_path: Python 解释器路径或包含 Python 的目录
            
        Returns:
            字典 {包名: 版本, ...}，包名统一转换为小写
        """
        packages = {}
        
        try:
            builder = PythonCommandBuilder(python_path)
            cmd = builder.pip_list()
            
            logger.info(f"执行 Pip 命令: {' '.join(cmd)}")
            
            result = builder.run(cmd, timeout=30, use_proxy=True)
            
            if result.returncode != 0:
                logger.error(f"pip list 命令执行失败: {result.stderr}")
                return packages
            
            package_list = json.loads(result.stdout)
            
            for item in package_list:
                package_name = item.get('name', '').lower()
                package_name = package_name.replace('-', '_')
                version = item.get('version', '')
                if package_name and version:
                    packages[package_name] = version
            
            logger.info(f"成功获取 {len(packages)} 个已安装包")
            if len(packages) > 0:
                sample_packages = list(packages.items())[:5]
                logger.info(f"示例包: {sample_packages}")
            else:
                logger.warning("未获取到任何已安装包！")
            return packages
            
        except json.JSONDecodeError as e:
            logger.error(f"解析 pip list 输出失败: {e}")
            return packages
        except Exception as e:
            logger.error(f"获取已安装包列表失败: {e}")
            return packages
    
    def _detect_version_conflicts(
        self,
        required: List[Dependency],
        installed: Dict[str, str]
    ) -> List[DependencyConflict]:
        """
        检测依赖问题（包括版本冲突和缺失依赖）
        
        使用 packaging.specifiers 库检查版本兼容性
        
        重要定义：
        - 版本冲突（VERSION_MISMATCH）：包已安装，但版本不符合要求
        - 缺失依赖（MISSING）：包未安装
        
        Args:
            required: 要求的依赖列表
            installed: 已安装的包字典 {包名: 版本}
            
        Returns:
            问题列表（包含 VERSION_MISMATCH 和 MISSING 两种类型）
        """
        conflicts = []
        
        logger.info(f"开始检测依赖问题，要求 {len(required)} 个依赖，已安装 {len(installed)} 个包")
        
        for dep in required:
            # 统一使用下划线（PEP 503: 包名中的 - 和 _ 是等价的）
            package_lower = dep.package.lower().replace('-', '_')
            
            logger.info(f"检查依赖: {dep.package} (标准化: {package_lower}), 版本要求: {dep.version_spec or '任意版本'}")
            
            # 检查包是否已安装（包括变体）
            installed_version = None
            matched_package = None
            
            # 1. 直接匹配
            if package_lower in installed:
                installed_version = installed[package_lower]
                matched_package = package_lower
                logger.debug(f"直接匹配: {package_lower} -> {installed_version}")
            else:
                # 2. 检查包名变体（处理特殊情况）
                variant_found = self._check_package_variants(package_lower, installed)
                if variant_found:
                    matched_package, installed_version = variant_found
                    logger.info(f"找到包变体: {dep.package} -> {matched_package} (版本: {installed_version})")
            
            # 如果没有找到任何匹配，标记为 missing（缺失依赖，不是冲突）
            if installed_version is None:
                logger.info(f"包 {dep.package} 未在已安装列表中找到（包括变体）")
                conflict = DependencyConflict(
                    package=dep.package,
                    required_version=dep.version_spec or "任意版本",
                    installed_version="未安装",
                    conflict_type=ConflictType.MISSING,
                    severity=ConflictSeverity.WARNING
                )
                conflicts.append(conflict)
                logger.debug(f"缺失依赖: {conflict}")
                continue
            
            # 如果没有版本要求，跳过检查
            if not dep.version_spec:
                logger.debug(f"包 {dep.package} 无版本要求，跳过检查")
                continue
            
            # 检查版本兼容性（使用找到的版本）
            
            try:
                # 使用 packaging 库解析版本要求
                spec = SpecifierSet(dep.version_spec)
                version = Version(installed_version)
                
                # 检查已安装版本是否满足要求
                if version not in spec:
                    # 版本不兼容（这才是真正的冲突）
                    conflict = DependencyConflict(
                        package=dep.package,
                        required_version=dep.version_spec,
                        installed_version=installed_version,
                        conflict_type=ConflictType.VERSION_MISMATCH,
                        severity=ConflictSeverity.ERROR
                    )
                    conflicts.append(conflict)
                    logger.debug(f"版本冲突: {conflict}")
                else:
                    logger.debug(f"包 {dep.package} 版本兼容: {installed_version} 满足 {dep.version_spec}")
                    
            except InvalidSpecifier as e:
                logger.warning(f"无效的版本要求 {dep.version_spec}: {e}")
                # 无法解析版本要求，标记为警告
                conflict = DependencyConflict(
                    package=dep.package,
                    required_version=dep.version_spec,
                    installed_version=installed_version,
                    conflict_type=ConflictType.VERSION_MISMATCH,
                    severity=ConflictSeverity.WARNING
                )
                conflicts.append(conflict)
            except InvalidVersion as e:
                logger.warning(f"无效的已安装版本 {installed_version}: {e}")
                # 无法解析已安装版本，标记为警告
                conflict = DependencyConflict(
                    package=dep.package,
                    required_version=dep.version_spec,
                    installed_version=installed_version,
                    conflict_type=ConflictType.VERSION_MISMATCH,
                    severity=ConflictSeverity.WARNING
                )
                conflicts.append(conflict)
            except Exception as e:
                logger.error(f"检查版本兼容性失败 {dep.package}: {e}")
                continue
        
        return conflicts

    def _check_package_variants(
        self,
        package_name: str,
        installed: Dict[str, str]
    ) -> Optional[tuple]:
        """
        检查包名变体
        
        处理特殊情况：
        1. opencv-python 和 opencv-python-headless 互斥
        2. 其他可能的包名变体
        
        Args:
            package_name: 标准化后的包名（小写，下划线）
            installed: 已安装的包字典 {包名: 版本}
            
        Returns:
            (匹配的包名, 版本) 或 None
        """
        # OpenCV 变体：opencv-python 和 opencv-python-headless 互斥
        if package_name == 'opencv_python_headless':
            # 如果要求 headless 版本，检查是否安装了标准版
            if 'opencv_python' in installed:
                logger.debug(f"找到 opencv-python 替代 opencv-python-headless")
                return ('opencv_python', installed['opencv_python'])
        elif package_name == 'opencv_python':
            # 如果要求标准版本，检查是否安装了 headless 版
            if 'opencv_python_headless' in installed:
                logger.debug(f"找到 opencv-python-headless 替代 opencv-python")
                return ('opencv_python_headless', installed['opencv_python_headless'])
        
        # 可以在这里添加更多变体规则
        
        return None
