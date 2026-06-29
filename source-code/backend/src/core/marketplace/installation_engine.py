"""
插件安装引擎

负责执行插件的安装流程，包括：
- Git 仓库克隆
- 依赖安装
- 进度追踪
- 日志记录
"""

import os
import subprocess
import uuid
from pathlib import Path
from typing import Dict, Callable, Optional, List, Tuple
from datetime import datetime

from .models import InstallTask, InstallStage, InstallStatus
from .logger import MarketplaceLogger
from .constants import ERROR_GIT_CLONE_FAILED
from .logger import marketplace_logger as logger
from ...utils.git_config import GIT_EXECUTABLE
from ...utils.python_command import PythonCommandBuilder
from ...utils.file_utils import force_remove_directory


class InstallationEngine:
    """
    插件安装引擎
    
    提供插件安装的核心功能：
    - Git 仓库克隆（完整克隆，保留完整历史记录）
    - Python 依赖安装
    - 实时进度追踪
    - 详细日志记录
    - 安装任务取消和回滚
    """
    
    def __init__(self):
        """初始化安装引擎"""
        self.active_tasks: Dict[str, InstallTask] = {}
        self.active_processes: Dict[str, subprocess.Popen] = {}  # 保存正在运行的进程
        self.logger = MarketplaceLogger()
    
    @staticmethod
    def _validate_proxy_url(proxy_url: str) -> bool:
        """
        验证代理 URL 格式是否有效
        
        有效的代理格式：
        - http://host:port
        - https://host:port
        - socks5://host:port
        
        无效的格式（会触发 Git 错误）：
        - https://mirrors.tuna.tsinghua.edu.cn/git/git/ (包含路径)
        - 任何包含路径的 HTTP/HTTPS 代理
        
        Args:
            proxy_url: 代理 URL 字符串
            
        Returns:
            bool: 是否为有效的代理 URL 格式
        """
        if not proxy_url:
            return True
        
        import re
        pattern = r'^(https?|socks5?)://[^/]+:\d+/?$'
        return bool(re.match(pattern, proxy_url))
    
    @staticmethod
    def _get_clear_proxy_config() -> Dict:
        """
        返回清除所有代理配置的环境变量字典
        
        用于清除系统中可能存在的错误代理配置。
        使用 GIT_CONFIG_* 环境变量覆盖 Git 全局配置（Git 2.32+）。
        
        Returns:
            dict: 清除代理的环境变量字典
        """
        return {
            "http_proxy": "",
            "https_proxy": "",
            "HTTP_PROXY": "",
            "HTTPS_PROXY": "",
            "ALL_PROXY": "",
            "all_proxy": "",
            "NO_PROXY": "",
            "no_proxy": "",
            "GIT_CONFIG_COUNT": "2",
            "GIT_CONFIG_KEY_0": "http.proxy",
            "GIT_CONFIG_VALUE_0": "",
            "GIT_CONFIG_KEY_1": "https.proxy",
            "GIT_CONFIG_VALUE_1": "",
        }
    
    def _get_proxy_config(self) -> Optional[Dict]:
        """
        获取代理配置
        
        从设置管理器读取代理配置，用于 git 和 pip 命令。
        同时会清除系统中可能存在的错误代理配置。
        
        Returns:
            dict: 代理配置环境变量字典，包含所有代理相关变量
            None: 如果代理未启用，返回清除配置
        """
        try:
            from ..settings_manager import SettingsManager
            settings_manager = SettingsManager()
            result = settings_manager.get_settings()
            
            if not result.get("success"):
                return self._get_clear_proxy_config()
            
            settings = result.get("settings", {})
            proxy = settings.get("proxy", {})
            
            if not proxy.get("enabled"):
                return self._get_clear_proxy_config()
            
            host = proxy.get("host", "").strip()
            port = proxy.get("port", "").strip()
            
            if not host or not port:
                logger.warning("[InstallationEngine] 代理配置不完整")
                return self._get_clear_proxy_config()
            
            proxy_url = f"http://{host}:{port}"
            
            if not self._validate_proxy_url(proxy_url):
                logger.error(f"[InstallationEngine] 无效的代理 URL 格式: {proxy_url}")
                return self._get_clear_proxy_config()
            
            logger.info(f"[InstallationEngine] 使用代理: {proxy_url}")
            
            return {
                "http_proxy": proxy_url,
                "https_proxy": proxy_url,
                "HTTP_PROXY": proxy_url,
                "HTTPS_PROXY": proxy_url,
                "ALL_PROXY": "",
                "all_proxy": "",
                "NO_PROXY": "",
                "no_proxy": "",
                "GIT_CONFIG_COUNT": "2",
                "GIT_CONFIG_KEY_0": "http.proxy",
                "GIT_CONFIG_VALUE_0": proxy_url,
                "GIT_CONFIG_KEY_1": "https.proxy",
                "GIT_CONFIG_VALUE_1": proxy_url,
            }
        except Exception as e:
            logger.error(f"[InstallationEngine] 获取代理配置失败: {e}")
            return self._get_clear_proxy_config()
    
    def _clone_repository(
        self,
        github_url: str,
        target_dir: Path,
        log_file: Path,
        task_id: str,
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> bool:
        """
        克隆 Git 仓库（带镜像源 fallback 机制）
        
        使用 subprocess 调用 git clone 命令，支持：
        - 完整克隆（保留完整 Git 历史记录）
        - 实时进度追踪
        - 输出记录到日志文件
        - 镜像源 fallback 机制
        
        Args:
            github_url: GitHub 仓库地址
            target_dir: 目标目录（custom_nodes 路径）
            log_file: 日志文件路径
            task_id: 任务 ID（用于保存进程引用）
            progress_callback: 进度回调函数，接收进度百分比（0-100）
            
        Returns:
            是否成功克隆
        """
        self.logger.info(f"开始克隆仓库: {github_url}")
        MarketplaceLogger.write_to_install_log(
            log_file,
            f"开始克隆仓库: {github_url}",
            "INFO"
        )
        
        plugin_name = github_url.rstrip('/').split('/')[-1]
        if plugin_name.endswith('.git'):
            plugin_name = plugin_name[:-4]
        
        plugin_path = target_dir / plugin_name
        disabled_path = target_dir / f"{plugin_name}.disabled"
        
        if plugin_path.exists() or disabled_path.exists():
            existing_path = plugin_path if plugin_path.exists() else disabled_path
            self.logger.info(f"目标路径已存在，先删除: {existing_path}")
            MarketplaceLogger.write_to_install_log(
                log_file,
                f"目标路径已存在，先删除: {existing_path}",
                "INFO"
            )
            
            success, error_msg = force_remove_directory(existing_path, logger=logger)
            if success:
                self.logger.info(f"已删除目录: {existing_path}")
                MarketplaceLogger.write_to_install_log(
                    log_file,
                    f"已删除目录: {existing_path}",
                    "INFO"
                )
            else:
                full_error_msg = f"删除目录失败: {existing_path}, 错误: {error_msg}"
                self.logger.error(full_error_msg)
                MarketplaceLogger.write_to_install_log(log_file, full_error_msg, "ERROR")
                return False
        
        if github_url.startswith("https://github.com/"):
            mirrors_to_try = self._get_git_mirror_priority_list()
        else:
            self.logger.info(f"[InstallationEngine] 检测到镜像地址，跳过系统镜像: {github_url}")
            MarketplaceLogger.write_to_install_log(
                log_file,
                f"检测到镜像地址，跳过系统镜像: {github_url}",
                "INFO"
            )
            mirrors_to_try = [None]
        last_error = ""
        
        for attempt, mirror in enumerate(mirrors_to_try):
            env = os.environ.copy()
            proxy_config = self._get_proxy_config()
            env.update(proxy_config)
            env["GIT_TERMINAL_PROMPT"] = "0"
            
            if mirror:
                env["GIT_CONFIG_COUNT"] = "1"
                env["GIT_CONFIG_KEY_0"] = f"url.https://{mirror}/.insteadOf"
                env["GIT_CONFIG_VALUE_0"] = "https://github.com/"
                self.logger.info(f"[InstallationEngine] 尝试镜像 ({attempt + 1}/{len(mirrors_to_try)}): {mirror}")
                MarketplaceLogger.write_to_install_log(
                    log_file,
                    f"尝试镜像 ({attempt + 1}/{len(mirrors_to_try)}): {mirror}",
                    "INFO"
                )
            else:
                self.logger.info(f"[InstallationEngine] 尝试直连 GitHub ({attempt + 1}/{len(mirrors_to_try)})")
                MarketplaceLogger.write_to_install_log(
                    log_file,
                    f"尝试直连 GitHub ({attempt + 1}/{len(mirrors_to_try)})",
                    "INFO"
                )
            
            proxy_url = proxy_config.get('HTTP_PROXY', '')
            if proxy_url:
                self.logger.info(f"[InstallationEngine] Git 命令使用代理: {proxy_url}")
                MarketplaceLogger.write_to_install_log(
                    log_file,
                    f"使用代理: {proxy_url}",
                    "INFO"
                )
            else:
                self.logger.info("[InstallationEngine] Git 命令已清除系统代理配置")
            
            cmd = [
                str(GIT_EXECUTABLE),
                '-c', f'http.proxy={proxy_url}',
                '-c', f'https.proxy={proxy_url}',
                'clone',
                '--progress',
                github_url,
                str(plugin_path)
            ]
            
            cmd_str = ' '.join(cmd)
            self.logger.info(f"========== 开始执行 Git 克隆 ==========")
            self.logger.info(f"执行 Git 命令: {cmd_str}")
            self.logger.info(f"目标目录: {plugin_path}")
            MarketplaceLogger.write_to_install_log(
                log_file,
                f"执行 Git 命令: {cmd_str}",
                "INFO"
            )
            
            success, error_msg = self._execute_git_clone(
                cmd, env, plugin_path, log_file, task_id, progress_callback
            )
            
            if success:
                if attempt > 0:
                    self.logger.info(f"[InstallationEngine] 镜像 fallback 成功: {mirror or '直连 GitHub'}")
                    MarketplaceLogger.write_to_install_log(
                        log_file,
                        f"镜像 fallback 成功: {mirror or '直连 GitHub'}",
                        "INFO"
                    )
                return True
            
            last_error = error_msg
            
            if plugin_path.exists():
                self.logger.info(f"清理失败的克隆目录: {plugin_path}")
                force_remove_directory(plugin_path, logger=logger)
            
            if self._is_mirror_failure(error_msg):
                if mirror:
                    self.logger.warning(f"[InstallationEngine] 镜像 {mirror} 失败: {error_msg[:100]}")
                    MarketplaceLogger.write_to_install_log(
                        log_file,
                        f"镜像 {mirror} 失败，尝试下一个镜像",
                        "WARNING"
                    )
                continue
            else:
                break
        
        error_msg = f"所有镜像源均失败，无法克隆仓库: {github_url}"
        self.logger.error(error_msg)
        MarketplaceLogger.write_to_install_log(log_file, error_msg, "ERROR")
        return False
    
    def _execute_git_clone(
        self,
        cmd: List[str],
        env: Dict,
        plugin_path: Path,
        log_file: Path,
        task_id: str,
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> Tuple[bool, str]:
        """
        执行单个 git clone 命令
        
        Args:
            cmd: Git 命令
            env: 环境变量
            plugin_path: 目标路径
            log_file: 日志文件
            task_id: 任务 ID
            progress_callback: 进度回调
            
        Returns:
            (是否成功, 错误信息)
        """
        import sys
        
        try:
            creation_flags = 0
            if sys.platform == 'win32':
                creation_flags = subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP
            
            process = subprocess.Popen(
                cmd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                creationflags=creation_flags
            )
            
            self.active_processes[task_id] = process
            
            output_lines = []
            last_progress = 0.0
            
            if process.stdout:
                buffer = ""
                while True:
                    char = process.stdout.read(1)
                    if not char:
                        break
                    
                    if char == '\r' or char == '\n':
                        if buffer.strip():
                            line = buffer.strip()
                            output_lines.append(line)
                            
                            self.logger.info(f"[Git] {line}")
                            
                            if progress_callback and '%' in line:
                                try:
                                    import re
                                    match = re.search(r'(\d+)%', line)
                                    if match:
                                        percent = float(match.group(1))
                                        if percent > last_progress:
                                            last_progress = percent
                                            progress_callback(percent)
                                            self.logger.debug(f"Git 克隆进度: {percent}%")
                                except (ValueError, IndexError) as e:
                                    self.logger.debug(f"解析进度失败: {line}, 错误: {e}")
                        
                        buffer = ""
                    else:
                        buffer += char
            
            return_code = process.wait()
            
            self.logger.info(f"========== Git 克隆完成 ==========")
            self.logger.info(f"返回码: {return_code}")
            self.logger.info(f"输出行数: {len(output_lines)}")
            
            if task_id in self.active_processes:
                del self.active_processes[task_id]
            
            full_output = '\n'.join(output_lines)
            MarketplaceLogger.write_command_output(
                log_file,
                ' '.join(cmd),
                full_output
            )
            
            if return_code == 0:
                success_msg = f"成功克隆仓库到: {plugin_path}"
                self.logger.info(success_msg)
                MarketplaceLogger.write_to_install_log(log_file, success_msg, "INFO")
                
                if progress_callback:
                    progress_callback(100.0)
                
                return True, ""
            else:
                error_msg = full_output if full_output else f"Git 克隆失败，返回码: {return_code}"
                return False, error_msg
                
        except FileNotFoundError:
            return False, "未找到 git 命令，请确保已安装 Git"
        except Exception as e:
            return False, f"克隆仓库时发生异常: {str(e)}"
    
    def _get_git_mirror_priority_list(self) -> List[Optional[str]]:
        """
        获取 Git 镜像优先级列表
        
        Returns:
            镜像列表，None 表示直连 GitHub
        """
        mirrors = []
        try:
            from backend.src.utils.github_mirror import github_mirror_manager
            
            if not github_mirror_manager.is_enabled():
                return [None]
            
            preset = github_mirror_manager.get_current_preset()
            if not preset:
                return [None]
            
            primary = preset.get("github")
            fallbacks = preset.get("fallback", {}).get("github", [])
            
            if primary:
                mirrors.append(primary)
            mirrors.extend(fallbacks)
            
            if None not in mirrors:
                mirrors.append(None)
            
            return list(dict.fromkeys(mirrors))
            
        except Exception as e:
            self.logger.dev(f"[InstallationEngine] 获取镜像优先级列表失败: {e}")
            return [None]
    
    def _is_mirror_failure(self, error_msg: str) -> bool:
        """检测是否为镜像源失败"""
        if not error_msg:
            return False
        failure_patterns = [
            "not found",
            "404",
            "could not resolve host",
            "connection timed out",
            "repository",
            "unable to access",
            "fatal:",
        ]
        error_lower = error_msg.lower()
        return any(pattern in error_lower for pattern in failure_patterns)
    
    def _install_dependencies(
        self,
        plugin_dir: Path,
        python_path: Path,
        log_file: Path,
        task_id: str,
        progress_callback: Optional[Callable[[str, float], None]] = None
    ) -> bool:
        """
        安装插件依赖
        
        检查并安装 requirements.txt 中的依赖包
        
        Args:
            plugin_dir: 插件目录路径
            python_path: Python 解释器路径（可以是目录或可执行文件）
            log_file: 日志文件路径
            task_id: 任务 ID（用于保存进程引用）
            progress_callback: 进度回调函数，接收 (包名, 进度百分比)
            
        Returns:
            是否成功安装所有依赖
        """
        requirements_file = plugin_dir / "requirements.txt"
        
        if not requirements_file.exists():
            msg = f"未找到 requirements.txt 文件，跳过依赖安装"
            self.logger.info(msg)
            MarketplaceLogger.write_to_install_log(log_file, msg, "INFO")
            return True
        
        self.logger.info(f"开始安装依赖: {requirements_file}")
        MarketplaceLogger.write_to_install_log(
            log_file,
            f"开始安装依赖: {requirements_file}",
            "INFO"
        )
        
        try:
            builder = PythonCommandBuilder(python_path)
            python_exe = builder.python_exe
        except FileNotFoundError as e:
            msg = str(e)
            self.logger.error(msg)
            MarketplaceLogger.write_to_install_log(log_file, msg, "ERROR")
            return False
        
        # 获取 PyPI 镜像配置
        index_url = None
        try:
            from ...utils.pypi_mirror import pypi_mirror_manager
            if pypi_mirror_manager.is_enabled():
                source = pypi_mirror_manager.get_current_source()
                if source:
                    index_url = source.get('pip_index')
                    self.logger.dev(f"[PyPI Mirror] 插件依赖安装使用镜像: {index_url}")
            else:
                self.logger.dev(f"[PyPI Mirror] 插件依赖安装镜像加速未启用，使用官方源")
        except Exception as e:
            self.logger.dev(f"[PyPI Mirror] 获取镜像配置失败: {e}，使用官方源")
        
        cmd = builder.pip_install_requirements(requirements_file, index_url=index_url)
        
        cmd_str = ' '.join(cmd)
        self.logger.info(f"执行 Pip 命令: {cmd_str}")
        MarketplaceLogger.write_to_install_log(
            log_file,
            f"执行 Pip 命令: {cmd_str}",
            "INFO"
        )
        
        try:
            process = builder.popen(cmd, use_proxy=True)
            
            self.active_processes[task_id] = process
            
            output_lines = []
            current_package = ""
            
            if process.stdout:
                for line in process.stdout:
                    line = line.strip()
                    if line:
                        output_lines.append(line)
                        
                        self.logger.info(f"[Pip] {line}")
                        
                        if 'Collecting' in line:
                            try:
                                parts = line.split()
                                if len(parts) >= 2:
                                    pkg = parts[1].split('==')[0].split('>=')[0].split('<=')[0].split('(')[0].strip()
                                    if pkg and pkg != current_package:
                                        current_package = pkg
                                        self.logger.info(f"[Pip] 正在收集包: {pkg}")
                                        
                                        if progress_callback:
                                            progress_callback(current_package, 0.0)
                            except (ValueError, IndexError) as e:
                                self.logger.debug(f"解析 Collecting 行失败: {line}, 错误: {e}")
                        elif 'Installing collected packages:' in line:
                            try:
                                parts = line.split('Installing collected packages:')
                                if len(parts) >= 2:
                                    packages = parts[1].strip().split(',')
                                    if packages:
                                        pkg = packages[0].strip().split('==')[0].split('>=')[0].split('<=')[0].split('(')[0].strip()
                                        if pkg and pkg != current_package:
                                            current_package = pkg
                                            self.logger.info(f"[Pip] 正在安装包: {pkg}")
                                            
                                            if progress_callback:
                                                progress_callback(current_package, 0.0)
                            except (ValueError, IndexError) as e:
                                self.logger.debug(f"解析 Installing 行失败: {line}, 错误: {e}")
            
            return_code = process.wait()
            
            if task_id in self.active_processes:
                del self.active_processes[task_id]
            
            full_output = '\n'.join(output_lines)
            MarketplaceLogger.write_command_output(
                log_file,
                cmd_str,
                full_output
            )
            
            if return_code == 0:
                success_msg = "成功安装所有依赖"
                self.logger.info(success_msg)
                MarketplaceLogger.write_to_install_log(log_file, success_msg, "INFO")
                return True
            else:
                error_msg = f"依赖安装失败，返回码: {return_code}"
                self.logger.error(error_msg)
                MarketplaceLogger.write_to_install_log(log_file, error_msg, "ERROR")
                return False
                
        except FileNotFoundError:
            error_msg = f"未找到 Python 解释器: {python_exe}"
            self.logger.error(error_msg)
            MarketplaceLogger.write_to_install_log(log_file, error_msg, "ERROR")
            return False
            
        except Exception as e:
            error_msg = f"安装依赖时发生异常: {str(e)}"
            self.logger.exception(error_msg)
            MarketplaceLogger.write_to_install_log(log_file, error_msg, "ERROR")
            MarketplaceLogger.write_exception(log_file, e)
            return False
    
    def install_plugin(
        self,
        github_url: str,
        target_dir: Path,
        python_path: Path,
        auto_install_deps: bool,
        progress_callback: Optional[Callable[[Dict], None]] = None
    ) -> Dict:
        """
        安装插件（主方法）- 同步执行（已废弃）
        
        注意：此方法已被 installation_engine_async_patch.py 中的
        install_plugin_async 函数替代。marketplace_controller.py
        直接调用异步补丁函数，不再使用此方法。
        
        保留此方法仅用于向后兼容和测试目的。
        
        Args:
            github_url: GitHub 仓库地址
            target_dir: 目标目录（custom_nodes 路径）
            python_path: Python 解释器路径
            auto_install_deps: 是否自动安装依赖
            progress_callback: 进度回调函数，接收任务状态字典
            
        Returns:
            安装结果字典，包含：
            - success: 是否成功
            - message: 结果消息
            - error: 错误信息（如果失败）
        """
        logger.warning("[InstallationEngine] install_plugin 方法已废弃，请使用 install_plugin_async")
        
        return {
            'success': False,
            'error': '此方法已废弃，请使用 installation_engine_async_patch.install_plugin_async'
        }
    
    def get_progress(self, task_id: str) -> Optional[Dict]:
        """
        获取安装进度
        
        Args:
            task_id: 任务 ID
            
        Returns:
            任务状态字典，如果任务不存在则返回 None
        """
        task = self.active_tasks.get(task_id)
        if task:
            return task.to_dict()
        return None
    
    def clear_completed_tasks(self) -> None:
        """
        清除已完成的任务
        
        从活动任务列表中移除已完成（成功或失败）的任务
        """
        completed_task_ids = [
            task_id for task_id, task in self.active_tasks.items()
            if task.status in (InstallStatus.SUCCESS, InstallStatus.FAILED)
        ]
        
        for task_id in completed_task_ids:
            del self.active_tasks[task_id]
        
        if completed_task_ids:
            self.logger.info(f"清除了 {len(completed_task_ids)} 个已完成的任务")
    
    def has_active_installation(self) -> bool:
        """
        检查是否有正在进行的安装任务
        
        Returns:
            是否有活动的安装任务
        """
        return any(
            task.status == InstallStatus.RUNNING
            for task in self.active_tasks.values()
        )
    
    def get_active_task_id(self) -> Optional[str]:
        """
        获取当前活动的任务 ID
        
        Returns:
            活动任务的 ID，如果没有则返回 None
        """
        for task_id, task in self.active_tasks.items():
            if task.status == InstallStatus.RUNNING:
                return task_id
        return None
    
    def cancel_installation(self, task_id: str) -> Dict:
        """
        取消正在进行的安装任务
        
        执行以下操作：
        1. 终止正在运行的 subprocess 进程
        2. 删除已克隆的插件目录
        3. 更新任务状态为 CANCELLED
        
        Args:
            task_id: 任务 ID
            
        Returns:
            结果字典：
            {
                'success': bool,
                'message': str,
                'error': str (如果失败)
            }
        """
        try:
            logger.info(f"[InstallationEngine] ========== 开始取消安装任务 ==========")
            logger.info(f"[InstallationEngine] 任务 ID: {task_id}")
            
            # 检查任务是否存在
            task = self.active_tasks.get(task_id)
            if not task:
                error_msg = f"任务不存在: {task_id}"
                logger.warning(f"[InstallationEngine] {error_msg}")
                logger.info(f"[InstallationEngine] 当前活动任务: {list(self.active_tasks.keys())}")
                return {
                    'success': False,
                    'error': error_msg
                }
            
            logger.info(f"[InstallationEngine] 任务状态: {task.status.value}")
            logger.info(f"[InstallationEngine] 任务阶段: {task.stage.value}")
            logger.info(f"[InstallationEngine] 插件名称: {task.plugin_name}")
            logger.info(f"[InstallationEngine] GitHub URL: {task.github_url}")
            
            # 检查任务是否正在运行
            if task.status != InstallStatus.RUNNING:
                error_msg = f"任务未在运行中: {task_id}，当前状态: {task.status.value}"
                logger.warning(f"[InstallationEngine] {error_msg}")
                return {
                    'success': False,
                    'error': error_msg
                }
            
            # 1. 终止正在运行的进程
            logger.info(f"[InstallationEngine] 步骤 1: 终止正在运行的进程")
            logger.info(f"[InstallationEngine] 当前活动进程: {list(self.active_processes.keys())}")
            
            process = self.active_processes.get(task_id)
            if process:
                try:
                    logger.info(f"[InstallationEngine] 找到进程: PID={process.pid}")
                    
                    # 检查进程是否还在运行
                    poll_result = process.poll()
                    logger.info(f"[InstallationEngine] 进程状态检查: poll()={poll_result}")
                    
                    if poll_result is None:
                        # 进程还在运行，尝试终止
                        logger.info(f"[InstallationEngine] 进程正在运行，开始终止进程树")
                        
                        # Windows: 终止整个进程树（包括子进程）
                        import sys
                        if sys.platform == 'win32':
                            try:
                                # 使用 taskkill 终止进程树
                                logger.info(f"[InstallationEngine] 使用 taskkill 终止进程树")
                                subprocess.run(
                                    ['taskkill', '/F', '/T', '/PID', str(process.pid)],
                                    capture_output=True,
                                    timeout=10,
                                    creationflags=subprocess.CREATE_NO_WINDOW
                                )
                                logger.info(f"[InstallationEngine] taskkill 命令执行完成")
                            except Exception as e:
                                logger.warning(f"[InstallationEngine] taskkill 失败: {e}")
                                # 降级到 terminate
                                process.terminate()
                        else:
                            # Linux/Mac: 使用 terminate
                            process.terminate()
                        
                        # 等待进程结束（最多等待 10 秒，Git 可能需要更多时间清理）
                        try:
                            logger.info(f"[InstallationEngine] 等待进程结束（最多 10 秒）")
                            process.wait(timeout=10)
                            logger.info(f"[InstallationEngine] 进程已正常终止，返回码: {process.returncode}")
                        except subprocess.TimeoutExpired:
                            # 如果进程没有响应，强制杀死
                            logger.warning(f"[InstallationEngine] 进程未响应，发送 SIGKILL 信号")
                            process.kill()
                            process.wait()
                            logger.info(f"[InstallationEngine] 进程已强制终止，返回码: {process.returncode}")
                        
                        # 额外等待，让文件句柄完全释放
                        import time
                        logger.info(f"[InstallationEngine] 等待 2 秒让文件句柄释放")
                        time.sleep(2)
                    else:
                        logger.info(f"[InstallationEngine] 进程已经结束，返回码: {poll_result}")
                    
                    # 从活动进程列表中移除
                    if task_id in self.active_processes:
                        del self.active_processes[task_id]
                        logger.info(f"[InstallationEngine] 已从活动进程列表中移除任务: {task_id}")
                    
                except Exception as e:
                    logger.error(f"[InstallationEngine] 终止进程失败: {e}")
                    logger.exception("详细错误信息")
                    # 即使终止失败，也要从列表中移除
                    if task_id in self.active_processes:
                        del self.active_processes[task_id]
                        logger.info(f"[InstallationEngine] 已从活动进程列表中移除任务（异常情况）: {task_id}")
                    # 继续执行清理操作
            else:
                logger.warning(f"[InstallationEngine] 未找到活动进程: {task_id}")
                logger.info(f"[InstallationEngine] 可能进程已经结束或未启动")
            
            # 2. 删除已克隆的插件目录
            logger.info(f"[InstallationEngine] 步骤 2: 删除已克隆的插件目录")
            try:
                # 从 GitHub URL 提取插件名称
                plugin_name = task.github_url.rstrip('/').split('/')[-1]
                if plugin_name.endswith('.git'):
                    plugin_name = plugin_name[:-4]
                
                logger.info(f"[InstallationEngine] 插件名称: {plugin_name}")
                
                # 获取当前环境的 custom_nodes 路径
                from backend.src.core.env.environment_manager import EnvironmentManager
                env_manager = EnvironmentManager()
                current_env = env_manager.get_current_environment()
                
                if current_env:
                    comfyui_path = Path(current_env.config.general.comfyui_path)
                    custom_nodes_path = comfyui_path / "custom_nodes"
                    plugin_path = custom_nodes_path / plugin_name
                    
                    logger.info(f"[InstallationEngine] 插件路径: {plugin_path}")
                    logger.info(f"[InstallationEngine] 路径是否存在: {plugin_path.exists()}")
                    
                    if plugin_path.exists():
                        logger.info(f"[InstallationEngine] 开始删除插件目录")
                        force_remove_directory(plugin_path, logger=logger)
                        logger.info(f"[InstallationEngine] 插件目录已删除")
                        
                        # 记录到日志文件
                        if task.log_path:
                            MarketplaceLogger.write_to_install_log(
                                Path(task.log_path),
                                f"安装已取消，已删除插件目录: {plugin_path}",
                                "INFO"
                            )
                    else:
                        logger.info(f"[InstallationEngine] 插件目录不存在，无需删除")
                else:
                    logger.warning(f"[InstallationEngine] 未找到当前环境，无法删除插件目录")
                        
            except Exception as e:
                logger.error(f"[InstallationEngine] 删除插件目录失败: {e}")
                logger.exception("详细错误信息")
                # 继续执行状态更新
            
            # 3. 更新任务状态为 CANCELLED
            logger.info(f"[InstallationEngine] 步骤 3: 更新任务状态")
            task.mark_failed("安装已被用户取消")
            task.stage = InstallStage.FAILED
            logger.info(f"[InstallationEngine] 任务状态已更新: {task.status.value}")
            
            # 记录到日志文件
            if task.log_path:
                MarketplaceLogger.write_to_install_log(
                    Path(task.log_path),
                    "安装已被用户取消",
                    "INFO"
                )
            
            success_msg = f"安装任务已取消: {task_id}"
            logger.info(f"[InstallationEngine] {success_msg}")
            logger.info(f"[InstallationEngine] ========== 取消安装任务完成 ==========")
            
            return {
                'success': True,
                'message': success_msg
            }
            
        except Exception as e:
            error_msg = f"取消安装任务失败: {str(e)}"
            logger.error(f"[InstallationEngine] {error_msg}")
            logger.exception("详细错误信息")
            return {
                'success': False,
                'error': error_msg
            }
