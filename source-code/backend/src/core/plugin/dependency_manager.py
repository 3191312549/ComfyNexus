"""
依赖管理器

管理插件依赖的检测、安装和冲突检测。
"""

import json
import os
import re
import subprocess
import threading
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple

from packaging.version import Version, InvalidVersion

from .models import Dependency, DependencyStatus, InstallResult, Conflict
from ...utils.logger import app_logger as logger
from ...utils.paths import get_project_root
from ...utils.python_command import PythonCommandBuilder


def sanitize_filename(name: str) -> str:
    """
    清理文件名中的非法字符
    
    Windows 文件系统不允许的字符: < > : " / \\ | ? *
    同时处理 URL 和特殊字符
    """
    illegal_chars = r'[<>:"/\\|?*]'
    name = re.sub(illegal_chars, '_', name)
    name = re.sub(r'_+', '_', name)
    name = name.strip('_ ')
    if len(name) > 100:
        name = name[:100]
    return name


_install_lock = threading.Lock()


class DependencyManager:
    """依赖管理器"""
    
    def __init__(self, python_path: Optional[Path] = None):
        """
        初始化依赖管理器
        
        Args:
            python_path: Python 可执行文件路径
        """
        self._python_path = python_path or Path("python")
        self.python_path_str = str(self._python_path)
        self._builder: Optional[PythonCommandBuilder] = None
    
    @property
    def builder(self) -> PythonCommandBuilder:
        """获取 PythonCommandBuilder 实例"""
        if self._builder is None:
            self._builder = PythonCommandBuilder(self._python_path)
        return self._builder
    
    def _extract_error_message(self, output_lines: list, package_name: str) -> str:
        """
        从 pip 输出中提取错误信息
        
        Args:
            output_lines: pip 命令的输出行列表
            package_name: 包名
            
        Returns:
            友好的错误信息（已清理内部路径）
        """
        error_patterns = [
            ('Could not find a version', f'找不到包 {package_name} 的指定版本'),
            ('No matching distribution found', f'找不到包 {package_name}'),
            ('ERROR: Could not find', f'找不到包 {package_name}'),
            ('Connection error', '网络连接失败'),
            ('Read timed out', '网络超时'),
            ('SSLError', 'SSL 证书验证失败'),
            ('Permission denied', '权限不足'),
            ('Requirement already satisfied', '包已安装'),
            ('incompatible', '版本不兼容'),
            ('conflict', '依赖冲突'),
        ]
        
        for line in reversed(output_lines):
            line_lower = line.lower()
            
            for pattern, friendly_msg in error_patterns:
                if pattern.lower() in line_lower:
                    return friendly_msg
            
            if 'error:' in line_lower:
                error_text = line.split('ERROR:', 1)[-1].strip()
                if error_text:
                    cleaned_text = self._sanitize_error_message(error_text)
                    return cleaned_text[:100]
        
        return '安装失败，请查看日志了解详情'
    
    def _sanitize_error_message(self, message: str) -> str:
        """
        清理错误消息中的敏感信息和内部路径
        
        Args:
            message: 原始错误消息
            
        Returns:
            清理后的安全错误消息
        """
        sanitized = message
        
        path_pattern = r'[A-Za-z]:\\[^\s:]+|/home/[^\s/]+|/Users/[^\s/]+|/root/[^\s/]+'
        sanitized = re.sub(path_pattern, '[路径]', sanitized)
        
        user_pattern = r'\\Users\\[^\\]+'
        sanitized = re.sub(user_pattern, '[用户目录]', sanitized)
        
        temp_pattern = r'\\AppData\\Local\\Temp[^\s]*'
        sanitized = re.sub(temp_pattern, '[临时目录]', sanitized, flags=re.IGNORECASE)
        
        if len(sanitized) > 150:
            sanitized = sanitized[:150] + '...'
        
        return sanitized
    
    def get_all_installed_packages(self) -> Dict[str, str]:
        """一次性获取所有已安装的包"""
        try:
            cmd = self.builder.pip_list()
            result = self.builder.run(cmd, timeout=60, use_proxy=True)
            
            if result.returncode != 0:
                logger.error(f"[DependencyManager] pip list 执行失败: {result.stderr}")
                return {}
            
            packages_list = json.loads(result.stdout)
            packages_dict = {
                pkg['name'].lower(): pkg['version']
                for pkg in packages_list
            }
            
            logger.debug(f"[DependencyManager] 成功获取 {len(packages_dict)} 个已安装包")
            return packages_dict
        
        except subprocess.TimeoutExpired:
            logger.warning("[DependencyManager] pip list 执行超时（60秒）")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"[DependencyManager] 解析 pip list JSON 结果失败: {str(e)}")
            return {}
        except Exception as e:
            logger.error(f"[DependencyManager] 获取已安装包失败: {str(e)}")
            return {}
    
    def _normalize_package_name(self, package_name: str) -> str:
        """规范化包名"""
        base_name = package_name.split('[')[0].strip() if '[' in package_name else package_name
        return base_name.lower().replace('_', '-')
    
    def batch_check_dependencies(
        self,
        plugins_deps: Dict[str, List[Dependency]],
        installed_packages: Dict[str, str]
    ) -> Dict[str, List[Dict]]:
        """批量检查多个插件的依赖安装状态"""
        result = {}
        
        for plugin_name, dependencies in plugins_deps.items():
            plugin_deps_status = []
            
            for dep in dependencies:
                package_normalized = self._normalize_package_name(dep.package)
                installed_version = ""
                
                for pkg_name, pkg_version in installed_packages.items():
                    if self._normalize_package_name(pkg_name) == package_normalized:
                        installed_version = pkg_version
                        break
                
                installed = bool(installed_version)
                version_match = False
                
                if installed:
                    if not dep.version:
                        version_match = True
                    else:
                        version_match = self._check_version_match(installed_version, dep.version)
                
                dep_status = {
                    "package": dep.package,
                    "version": dep.version,
                    "installed": installed,
                    "installed_version": installed_version,
                    "version_match": version_match
                }
                
                plugin_deps_status.append(dep_status)
            
            result[plugin_name] = plugin_deps_status
        
        logger.info(f"[DependencyManager] 批量检测完成，共 {len(plugins_deps)} 个插件")
        return result
    
    def check_dependency_installed(
        self,
        package: str,
        version: str = ""
    ) -> Tuple[bool, str]:
        """检测依赖是否已安装"""
        try:
            base_package = package.split('[')[0].strip() if '[' in package else package
            
            cmd = self.builder.pip_show(base_package)
            result = self.builder.run(cmd, timeout=10, use_proxy=True)
            
            if result.returncode != 0:
                return False, ""
            
            for line in result.stdout.split('\n'):
                if line.startswith('Version:'):
                    installed_version = line.split(':', 1)[1].strip()
                    
                    if not version:
                        return True, installed_version
                    
                    if self._check_version_match(installed_version, version):
                        return True, installed_version
                    else:
                        return False, installed_version
            
            return False, ""
        
        except Exception as e:
            logger.error(f"[DependencyManager] 检测依赖失败: {package}, {str(e)}")
            return False, ""
    
    def _normalize_version(self, version: str) -> str:
        """
        提取基础版本号，去掉本地版本标识符
        
        PEP 440 定义的版本格式: N[.N]+[{a|b|rc}N][.postN][.devN][+local]
        例如: 2.8.3+cu128torch2.9 -> 2.8.3
        
        Args:
            version: 原始版本号
            
        Returns:
            基础版本号
        """
        if '+' in version:
            return version.split('+')[0]
        return version
    
    def _check_version_match(self, installed: str, required: str) -> bool:
        """检查版本是否匹配"""
        try:
            installed_base = self._normalize_version(installed)
            
            if required.startswith('=='):
                return installed_base == self._normalize_version(required[2:].strip())
            elif required.startswith('>='):
                return self._compare_version(installed_base, required[2:].strip()) >= 0
            elif required.startswith('<='):
                return self._compare_version(installed_base, required[2:].strip()) <= 0
            elif required.startswith('>'):
                return self._compare_version(installed_base, required[1:].strip()) > 0
            elif required.startswith('<'):
                return self._compare_version(installed_base, required[1:].strip()) < 0
            elif required.startswith('~='):
                target = required[2:].strip()
                return self._check_compatible_version(installed_base, target)
            elif required.startswith('!='):
                return installed_base != self._normalize_version(required[2:].strip())
            else:
                return installed_base == self._normalize_version(required.strip())
        
        except Exception as e:
            logger.debug(f"[DependencyManager] 版本匹配检查失败: {installed} vs {required}, {str(e)}")
            return False
    
    def _compare_version(self, v1: str, v2: str) -> int:
        """
        比较版本号
        
        使用 packaging.version.Version 支持所有标准版本号格式，
        包括预发布版本（如 2.0.0a1, 1.0.0rc1）。
        
        Args:
            v1: 版本号 1
            v2: 版本号 2
            
        Returns:
            -1: v1 < v2
             0: v1 == v2
             1: v1 > v2
        """
        try:
            v1 = self._normalize_version(v1)
            v2 = self._normalize_version(v2)
            
            try:
                version1 = Version(v1)
                version2 = Version(v2)
                
                if version1 < version2:
                    return -1
                elif version1 > version2:
                    return 1
                else:
                    return 0
            except InvalidVersion:
                parts1 = [int(x) for x in v1.split('.') if x.isdigit()]
                parts2 = [int(x) for x in v2.split('.') if x.isdigit()]
                
                if not parts1 and not parts2:
                    return 0
                if not parts1:
                    return -1
                if not parts2:
                    return 1
                
                max_len = max(len(parts1), len(parts2))
                parts1.extend([0] * (max_len - len(parts1)))
                parts2.extend([0] * (max_len - len(parts2)))
                
                for p1, p2 in zip(parts1, parts2):
                    if p1 < p2:
                        return -1
                    elif p1 > p2:
                        return 1
                
                return 0
        
        except Exception:
            return 0
    
    def _check_compatible_version(self, installed: str, target: str) -> bool:
        """检查兼容版本 (~=)"""
        try:
            parts = target.split('.')
            if len(parts) < 2:
                return False
            
            upper_parts = parts[:-1].copy()
            upper_parts[-1] = str(int(upper_parts[-1]) + 1)
            upper = '.'.join(upper_parts)
            
            return (self._compare_version(installed, target) >= 0 and
                    self._compare_version(installed, upper) < 0)
        
        except Exception:
            return False
    
    def get_dependencies_status(
        self,
        dependencies: List[Dependency]
    ) -> List[DependencyStatus]:
        """批量检测依赖安装状态"""
        installed_packages = self._get_all_installed_packages()
        
        statuses = []
        
        for dep in dependencies:
            package_normalized = self._normalize_package_name(dep.package)
            installed_version = None
            
            for pkg_name, pkg_version in installed_packages.items():
                if self._normalize_package_name(pkg_name) == package_normalized:
                    installed_version = pkg_version
                    break
            
            installed = installed_version is not None
            
            dep.installed = installed
            dep.installed_version = installed_version or ""
            
            version_match = True
            message = ""
            
            if not installed:
                message = "未安装"
                version_match = False
            elif dep.version and not self._check_version_match(installed_version, dep.version):
                message = f"版本不匹配 (已安装: {installed_version}, 要求: {dep.version})"
                version_match = False
            else:
                message = f"已安装 (版本: {installed_version})"
            
            status = DependencyStatus(
                dependency=dep,
                installed=installed,
                version_match=version_match,
                message=message
            )
            statuses.append(status)
        
        return statuses
    
    def _get_all_installed_packages(self) -> Dict[str, str]:
        """一次性获取所有已安装包的列表"""
        try:
            logger.info(f"[DependencyManager] 使用 Python 路径: {self.builder.python_exe}")
            
            cmd = self.builder.pip_list()
            result = self.builder.run(cmd, timeout=30, use_proxy=True)
            
            if result.returncode != 0:
                logger.warning(f"[DependencyManager] pip list 执行失败: {result.stderr}")
                return {}
            
            packages = json.loads(result.stdout)
            packages_dict = {pkg['name']: pkg['version'] for pkg in packages}
            
            logger.info(f"[DependencyManager] 成功获取 {len(packages_dict)} 个已安装包")
            if 'numpy' in packages_dict:
                logger.info(f"[DependencyManager] numpy 版本: {packages_dict['numpy']}")
            else:
                logger.warning("[DependencyManager] numpy 未在已安装包列表中")
            
            return packages_dict
        
        except Exception as e:
            logger.error(f"[DependencyManager] 获取已安装包列表失败: {str(e)}")
            return {}
    
    def install_dependency(
        self,
        package: str,
        version: str = "",
        pip_options: Optional[List[str]] = None
    ) -> InstallResult:
        """
        安装依赖（后台执行，保存日志到文件）
        
        使用锁机制确保同一时间只有一个安装任务执行，避免并发安装导致的竞态条件。
        """
        with _install_lock:
            try:
                package_spec = f"{package}{version}" if version else package
                
                # 获取 PyPI 镜像配置
                mirror_index_url = None
                try:
                    from ...utils.pypi_mirror import pypi_mirror_manager
                    if pypi_mirror_manager.is_enabled():
                        source = pypi_mirror_manager.get_current_source()
                        if source:
                            mirror_index_url = source.get('pip_index')
                            logger.dev(f"[PyPI Mirror] 插件依赖安装使用镜像: {mirror_index_url}")
                    else:
                        logger.dev(f"[PyPI Mirror] 插件依赖安装镜像加速未启用，使用官方源")
                except Exception as e:
                    logger.dev(f"[PyPI Mirror] 获取镜像配置失败: {e}，使用官方源")
                
                if mirror_index_url:
                    if pip_options is None:
                        pip_options = []
                    pip_options.extend(['-i', mirror_index_url])
                
                project_root = get_project_root()
                
                log_dir = project_root / "logs" / "dependencies"
                log_dir.mkdir(parents=True, exist_ok=True)
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                safe_package_name = sanitize_filename(package)
                log_file = log_dir / f"dependency_install_{safe_package_name}_{timestamp}.log"
                
                cmd = self.builder.pip_install(package, version=version, extra_args=pip_options)
                
                logger.info(f"[DependencyManager] 开始安装 {package_spec}")
                logger.info(f"[DependencyManager] 执行命令: {' '.join(cmd)}")
                logger.info(f"[DependencyManager] 日志文件: {log_file}")
                
                with open(log_file, 'w', encoding='utf-8') as log_f:
                    log_f.write(f"=== 依赖安装日志 ===\n")
                    log_f.write(f"包名: {package}\n")
                    log_f.write(f"版本要求: {version or '最新版本'}\n")
                    log_f.write(f"完整规格: {package_spec}\n")
                    if pip_options:
                        log_f.write(f"Pip 选项: {' '.join(pip_options)}\n")
                    log_f.write(f"Python 路径: {self.builder.python_exe}\n")
                    log_f.write(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    log_f.write(f"执行命令: {' '.join(cmd)}\n")
                    log_f.write(f"{'=' * 50}\n\n")
                    log_f.flush()
                    
                    with self.builder.safe_popen(cmd, use_proxy=True) as process:
                        output_lines = []
                        for line in process.stdout:
                            log_f.write(line)
                            log_f.flush()
                            output_lines.append(line.strip())
                            logger.debug(f"[pip] {line.rstrip()}")
                        
                        return_code = process.wait()
                    
                    log_f.write(f"\n{'=' * 50}\n")
                    log_f.write(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    log_f.write(f"返回码: {return_code}\n")
                    log_f.write(f"状态: {'成功' if return_code == 0 else '失败'}\n")
                
                if return_code == 0:
                    logger.info(f"[DependencyManager] 成功安装 {package_spec}")
                    return InstallResult(
                        package=package,
                        success=True,
                        message=f"成功安装 {package_spec}",
                        log_file=str(log_file)
                    )
                else:
                    error_message = self._extract_error_message(output_lines, package)
                    
                    logger.error(f"[DependencyManager] 安装失败 {package_spec}，错误: {error_message}")
                    return InstallResult(
                        package=package,
                        success=False,
                        message=f"安装失败: {error_message}",
                        log_file=str(log_file)
                    )
            
            except Exception as e:
                logger.error(f"[DependencyManager] 安装 {package_spec} 时出错: {str(e)}")
                return InstallResult(
                    package=package,
                    success=False,
                    message=f"安装时出错: {str(e)}",
                    log_file=str(log_file) if 'log_file' in locals() else None
                )
            finally:
                logger.info(f"[DependencyManager] 安装操作完成")
    
    def detect_version_conflicts(
        self,
        all_dependencies: Dict[str, List[Dependency]]
    ) -> List[Conflict]:
        """检测依赖版本冲突"""
        conflicts = []
        
        package_requirements: Dict[str, List[Tuple[str, str]]] = {}
        
        for plugin_name, deps in all_dependencies.items():
            for dep in deps:
                if dep.package not in package_requirements:
                    package_requirements[dep.package] = []
                
                if dep.version:
                    package_requirements[dep.package].append((plugin_name, dep.version))
        
        for package, requirements in package_requirements.items():
            if len(requirements) <= 1:
                continue
            
            versions = [req[1] for req in requirements]
            plugins = [req[0] for req in requirements]
            
            unique_versions = set(versions)
            if len(unique_versions) > 1:
                conflict = Conflict(
                    package=package,
                    required_versions=list(unique_versions),
                    plugins=plugins,
                    severity="warning",
                    message=f"包 {package} 有多个版本要求: {', '.join(unique_versions)}"
                )
                conflicts.append(conflict)
        
        return conflicts
