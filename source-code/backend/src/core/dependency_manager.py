"""
依赖管理器
用于检测和更新依赖
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict

from ..utils.logger import app_logger as logger
from ..utils.python_command import PythonCommandBuilder
from ..utils.paths import get_log_dir


class DependencyManager:
    """依赖管理器"""
    
    def __init__(self, comfyui_path: str = None, python_path: str = None):
        """
        初始化依赖管理器
        
        Args:
            comfyui_path: ComfyUI 路径
            python_path: Python 路径
        """
        self._comfyui_path_str = str(Path(comfyui_path)) if comfyui_path else None
        self._python_path_str = str(Path(python_path)) if python_path else None
        self._builder = None
    
    @property
    def comfyui_path(self) -> Path:
        """ComfyUI 路径（Path 对象）"""
        return Path(self._comfyui_path_str) if self._comfyui_path_str else None
    
    @property
    def python_path(self) -> Path:
        """Python 路径（Path 对象）"""
        return Path(self._python_path_str) if self._python_path_str else None
    
    @property
    def builder(self) -> PythonCommandBuilder:
        """获取 PythonCommandBuilder 实例"""
        if self._builder is None and self._python_path_str:
            self._builder = PythonCommandBuilder(self._python_path_str)
        return self._builder
    
    def _parse_requirements(self) -> Dict[str, str]:
        """
        解析 requirements.txt 文件，提取包名和版本要求
        
        Returns:
            dict: {包名: 版本要求}，例如 {"torch": ">=2.0.0", "numpy": ""}
        """
        try:
            if not self.comfyui_path:
                return {}
            
            requirements_file = self.comfyui_path / "requirements.txt"
            if not requirements_file.exists():
                return {}
            
            requirements = {}
            with open(requirements_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    match = re.match(r'^([a-zA-Z0-9_\-\[\]]+)([>=<~!]+.*)?$', line)
                    if match:
                        package_name = match.group(1).lower().replace('_', '-')
                        version_spec = match.group(2) or ""
                        requirements[package_name] = version_spec
            
            return requirements
        except Exception as e:
            logger.error(f"[DependencyManager] 解析 requirements.txt 失败: {str(e)}")
            return {}
    
    def _get_installed_packages(self) -> Dict[str, str]:
        """
        获取已安装的包列表
        
        Returns:
            dict: {包名: 版本}，例如 {"torch": "2.0.1", "numpy": "1.24.0"}
        """
        try:
            if not self.builder:
                return {}
            
            cmd = self.builder.pip_list()
            result = self.builder.run(cmd, timeout=10, use_proxy=False)
            
            if result.returncode != 0:
                logger.error(f"[DependencyManager] pip list 执行失败: {result.stderr}")
                return {}
            
            packages = json.loads(result.stdout)
            
            installed = {}
            for pkg in packages:
                package_name = pkg['name'].lower().replace('_', '-')
                installed[package_name] = pkg['version']
            
            return installed
        except Exception as e:
            logger.error(f"[DependencyManager] 获取已安装包列表失败: {str(e)}")
            return {}
    
    def _check_version_match(self, installed_version: str, version_spec: str) -> bool:
        """
        检查已安装版本是否满足版本要求
        
        Args:
            installed_version: 已安装的版本，例如 "2.0.1"
            version_spec: 版本要求，例如 ">=2.0.0", "==2.0.1", "~=2.0"
            
        Returns:
            bool: 是否满足要求
        """
        try:
            from packaging import version
            from packaging.specifiers import SpecifierSet
            
            spec = SpecifierSet(version_spec)
            return version.parse(installed_version) in spec
        except Exception as e:
            logger.warning(f"[DependencyManager] 版本匹配检查失败: {str(e)}, 假定需要更新")
            return False
    
    def check_dependency_changes(self) -> bool:
        """
        检查依赖是否有变化（通过对比 requirements.txt 和已安装的包）
        
        Returns:
            bool: 是否需要更新依赖
        """
        try:
            logger.info(f"[DependencyManager] 开始检查依赖变更")
            
            if not self.comfyui_path or not self.python_path:
                logger.warning(f"[DependencyManager] ComfyUI 或 Python 路径未设置")
                return False
            
            requirements_file = self.comfyui_path / "requirements.txt"
            logger.info(f"[DependencyManager] 检查文件: {requirements_file}")
            
            if not requirements_file.exists():
                logger.warning(f"[DependencyManager] requirements.txt 不存在")
                return False
            
            logger.info(f"[DependencyManager] 解析 requirements.txt")
            required_packages = self._parse_requirements()
            logger.info(f"[DependencyManager] 需要的包数量: {len(required_packages)}")
            
            if not required_packages:
                logger.warning(f"[DependencyManager] requirements.txt 为空或解析失败")
                return False
            
            logger.info(f"[DependencyManager] 获取已安装的包列表")
            installed_packages = self._get_installed_packages()
            logger.info(f"[DependencyManager] 已安装的包数量: {len(installed_packages)}")
            
            if not installed_packages:
                logger.warning(f"[DependencyManager] 无法获取已安装包列表")
                return True
            
            missing_packages = []
            version_mismatch_packages = []
            
            for package_name, version_spec in required_packages.items():
                if package_name not in installed_packages:
                    missing_packages.append(package_name)
                elif version_spec:
                    installed_version = installed_packages[package_name]
                    if not self._check_version_match(installed_version, version_spec):
                        version_mismatch_packages.append(f"{package_name} (需要{version_spec}, 已安装{installed_version})")
            
            if missing_packages:
                logger.info(f"[DependencyManager] 发现缺失的包: {', '.join(missing_packages[:5])}" + 
                           (f" 等 {len(missing_packages)} 个包" if len(missing_packages) > 5 else ""))
                return True
            
            if version_mismatch_packages:
                logger.info(f"[DependencyManager] 发现版本不匹配的包: {', '.join(version_mismatch_packages[:5])}" + 
                           (f" 等 {len(version_mismatch_packages)} 个包" if len(version_mismatch_packages) > 5 else ""))
                return True
            
            logger.info(f"[DependencyManager] 所有依赖包均已安装且版本匹配")
            return False
            
        except Exception as e:
            logger.error(f"[DependencyManager] 检查依赖变化失败: {str(e)}", exc_info=True)
            return False
    
    def update_dependencies(self) -> Dict:
        """
        更新依赖（后台执行，保存日志到文件）
        
        Returns:
            dict: 更新结果（包含日志文件路径）
        """
        try:
            if not self.comfyui_path or not self.builder:
                return {
                    "success": False,
                    "message": "未设置 ComfyUI 或 Python 路径"
                }
            
            requirements_file = self.comfyui_path / "requirements.txt"
            if not requirements_file.exists():
                return {
                    "success": False,
                    "message": "requirements.txt 文件不存在"
                }
            
            log_dir = get_log_dir() / "requirements"
            log_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y_%m_%d_%H_%M_%S")
            log_file = log_dir / f"requirements_log_{timestamp}.log"
            
            # 获取 PyPI 镜像配置
            index_url = None
            try:
                from ..utils.pypi_mirror import pypi_mirror_manager
                if pypi_mirror_manager.is_enabled():
                    source = pypi_mirror_manager.get_current_source()
                    if source:
                        index_url = source.get('pip_index')
                        logger.dev(f"[PyPI Mirror] ComfyUI 依赖更新使用镜像: {index_url}")
                else:
                    logger.dev(f"[PyPI Mirror] ComfyUI 依赖更新镜像加速未启用，使用官方源")
            except Exception as e:
                logger.dev(f"[PyPI Mirror] 获取镜像配置失败: {e}，使用官方源")
            
            cmd = self.builder.pip_install_requirements(requirements_file, index_url=index_url)
            
            logger.info(f"[DependencyManager] 开始更新 ComfyUI 依赖")
            logger.info(f"[DependencyManager] 执行命令: {' '.join(cmd)}")
            logger.info(f"[DependencyManager] 日志文件: {log_file}")
            
            with open(log_file, 'w', encoding='utf-8') as log_f:
                log_f.write(f"=== ComfyUI 依赖更新日志 ===\n")
                log_f.write(f"Requirements 文件: {requirements_file}\n")
                log_f.write(f"Python 路径: {self.builder.python_exe}\n")
                log_f.write(f"PyPI 镜像源: {index_url if index_url else '官方源 (pypi.org)'}\n")
                log_f.write(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                log_f.write(f"执行命令: {' '.join(cmd)}\n")
                log_f.write(f"{'=' * 80}\n\n")
                log_f.flush()
                
                process = self.builder.popen(cmd, use_proxy=True, cwd=str(self.comfyui_path))
                
                for line in process.stdout:
                    log_f.write(line)
                    log_f.flush()
                    logger.debug(f"[pip] {line.rstrip()}")
                
                return_code = process.wait()
                
                log_f.write(f"\n{'=' * 80}\n")
                log_f.write(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                log_f.write(f"返回码: {return_code}\n")
                log_f.write(f"状态: {'成功' if return_code == 0 else '失败'}\n")
            
            if return_code == 0:
                logger.info(f"[DependencyManager] ComfyUI 依赖更新成功")
                return {
                    "success": True,
                    "message": "依赖更新成功",
                    "log_file": str(log_file)
                }
            else:
                logger.error(f"[DependencyManager] ComfyUI 依赖更新失败，返回码: {return_code}")
                return {
                    "success": False,
                    "message": f"依赖更新失败，返回码: {return_code}",
                    "log_file": str(log_file)
                }
        
        except Exception as e:
            logger.error(f"[DependencyManager] 更新依赖异常: {str(e)}", exc_info=True)
            return {
                "success": False,
                "message": f"依赖更新失败: {str(e)}"
            }
    
    def get_dependency_info(self) -> Dict:
        """
        获取依赖信息
        
        Returns:
            dict: 依赖信息
        """
        try:
            if not self.builder:
                return {
                    "success": False,
                    "error": "未设置 Python 路径",
                    "dependencies": {}
                }
            
            cmd = self.builder.pip_list()
            result = self.builder.run(cmd, timeout=30, use_proxy=False)
            
            if result.returncode != 0:
                return {
                    "success": False,
                    "error": "获取依赖信息失败",
                    "dependencies": {}
                }
            
            packages = json.loads(result.stdout)
            
            dependencies = {}
            key_packages = ['torch', 'torchvision', 'numpy', 'pillow', 'opencv-python']
            
            for pkg in packages:
                if pkg['name'].lower() in key_packages:
                    dependencies[pkg['name']] = pkg['version']
            
            return {
                "success": True,
                "dependencies": dependencies
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "dependencies": {}
            }
