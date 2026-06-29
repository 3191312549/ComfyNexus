"""
Python/Pip 命令构建器

提供统一的 Python 和 Pip 命令构建接口，确保：
- 路径处理一致性（兼容目录和可执行文件路径）
- 使用 python -m pip 模式（兼容 ComfyUI 便携版）
- 代理配置统一注入
- 进程资源安全管理
"""

import os
import re
import platform
import subprocess
from pathlib import Path
from typing import List, Optional, Dict, Union, Generator
from contextlib import contextmanager

from .logger import app_logger as logger


DEFAULT_PROCESS_TIMEOUT = 600


def sanitize_url_for_logging(url: Optional[str]) -> str:
    """
    脱敏 URL 用于日志记录
    
    隐藏 URL 中的敏感信息（密码、API key 等）
    
    Args:
        url: 要脱敏的 URL
        
    Returns:
        脱敏后的 URL 字符串
    """
    if not url:
        return ""
    
    url_str = str(url)
    
    if '://' in url_str:
        pattern = r'(https?://)([^:]+):([^@]+)@'
        url_str = re.sub(pattern, r'\1\2:****@', url_str)
    
    api_key_patterns = [
        r'(sk-)[a-zA-Z0-9]{20,}',
        r'(api[_-]?key[=_])[a-zA-Z0-9]{10,}',
        r'(token[=_])[a-zA-Z0-9]{10,}',
    ]
    
    for pattern in api_key_patterns:
        url_str = re.sub(pattern, r'\1****', url_str, flags=re.IGNORECASE)
    
    return url_str


class PythonCommandBuilder:
    """
    Python 命令构建器
    
    统一管理 Python 和 Pip 命令的构建，确保路径处理和代理配置的一致性。
    
    使用示例：
        builder = PythonCommandBuilder("/path/to/python")
        
        # 构建 pip 命令
        cmd = builder.pip_list()
        cmd = builder.pip_install("numpy", version=">=1.20.0")
        cmd = builder.pip_show("torch")
        
        # 执行命令
        result = builder.run(cmd, timeout=30)
    """
    
    def __init__(self, python_path: Union[str, Path]):
        """
        初始化命令构建器
        
        Args:
            python_path: Python 目录路径或可执行文件路径
        """
        self._python_path = Path(python_path)
        self._python_exe: Optional[Path] = None
        self._proxy_config: Optional[Dict] = None
        
    @property
    def python_exe(self) -> Path:
        """
        获取 Python 可执行文件路径
        
        如果传入的是目录，自动拼接 python.exe
        
        Returns:
            Python 可执行文件的 Path 对象
        """
        if self._python_exe is not None:
            return self._python_exe
            
        if self._python_path.is_dir():
            python_exe = self._python_path / "python.exe"
            if not python_exe.exists():
                raise FileNotFoundError(f"Python 可执行文件不存在: {python_exe}")
            self._python_exe = python_exe
        else:
            if not self._python_path.exists():
                raise FileNotFoundError(f"Python 路径不存在: {self._python_path}")
            self._python_exe = self._python_path
            
        return self._python_exe
    
    @staticmethod
    def _validate_proxy_url(proxy_url: str) -> bool:
        """
        验证代理 URL 格式是否        有效的代理格式：
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
        
        pattern = r'^(https?|socks5?)://[^/]+:\d+/?$'
        return bool(re.match(pattern, proxy_url))
    
    @staticmethod
    def _get_clear_proxy_config() -> Dict:
        """
        返回清除所有代理配置的环境变量字典
        
        用于清除系统中可能存在的错误代理配置。
        
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
        }
    
    def _get_proxy_config(self) -> Dict:
        """
        获取代理配置
        
        从设置管理器读取代理配置，用于 pip 命令。
        每次调用都重新读取，确保设置变更后立即生效。
        同时会清除系统中可能存在的错误代理配置。
        
        Returns:
            dict: 代理配置环境变量字典，包含所有代理相关变量
        """
        try:
            from ..core.settings_manager import SettingsManager
            settings_manager = SettingsManager()
            result = settings_manager.get_settings()
            
            if not result.get("success"):
                return self._get_clear_proxy_config()
            
            settings = result.get("settings", {})
            proxy = settings.get("proxy", {})
            
            if not proxy.get("enabled"):
                logger.debug("[PythonCommandBuilder] 代理未启用")
                return self._get_clear_proxy_config()
            
            host = proxy.get("host", "").strip()
            port = proxy.get("port", "").strip()
            
            if not host or not port:
                logger.warning("[PythonCommandBuilder] 代理配置不完整")
                return self._get_clear_proxy_config()
            
            proxy_url = f"http://{host}:{port}"
            
            if not self._validate_proxy_url(proxy_url):
                logger.error(f"[PythonCommandBuilder] 无效的代理 URL 格式: {proxy_url}")
                return self._get_clear_proxy_config()
            
            logger.info(f"[PythonCommandBuilder] 使用代理: {sanitize_url_for_logging(proxy_url)}")
            
            return {
                "http_proxy": proxy_url,
                "https_proxy": proxy_url,
                "HTTP_PROXY": proxy_url,
                "HTTPS_PROXY": proxy_url,
                "ALL_PROXY": "",
                "all_proxy": "",
                "NO_PROXY": "",
                "no_proxy": "",
            }
            
        except Exception as e:
            logger.error(f"[PythonCommandBuilder] 获取代理配置失败: {e}")
            return self._get_clear_proxy_config()
    
    def _get_env_with_proxy(self) -> Dict:
        """
        获取包含代理配置的环境变量
        
        Returns:
            环境变量字典
        """
        env = os.environ.copy()
        proxy_config = self._get_proxy_config()
        env.update(proxy_config)
        
        proxy_url = proxy_config.get('HTTP_PROXY', '')
        if proxy_url:
            logger.info(f"[PythonCommandBuilder] 命令使用代理: {sanitize_url_for_logging(proxy_url)}")
        else:
            logger.debug("[PythonCommandBuilder] 命令已清除系统代理配置")
        
        return env
    
    # ==================== Python 命令构建 ====================
    
    def python_cmd(self, script_path: Union[str, Path], *args) -> List[str]:
        """
        构建 Python 脚本执行命令
        
        Args:
            script_path: Python 脚本路径
            *args: 脚本参数
            
        Returns:
            命令列表
        """
        cmd = [str(self.python_exe), str(script_path)]
        cmd.extend(args)
        return cmd
    
    def python_module(self, module_name: str, *args) -> List[str]:
        """
        构建 Python 模块执行命令
        
        Args:
            module_name: 模块名称
            *args: 模块参数
            
        Returns:
            命令列表
        """
        cmd = [str(self.python_exe), '-m', module_name]
        cmd.extend(args)
        return cmd
    
    # ==================== Pip 命令构建 ====================
    
    def pip_list(self, format: str = "json") -> List[str]:
        """
        构建 pip list 命令
        
        Args:
            format: 输出格式，默认 json
            
        Returns:
            命令列表
        """
        return [str(self.python_exe), '-m', 'pip', 'list', f'--format={format}']
    
    def pip_show(self, package: str) -> List[str]:
        """
        构建 pip show 命令
        
        Args:
            package: 包名
            
        Returns:
            命令列表
        """
        return [str(self.python_exe), '-m', 'pip', 'show', package]
    
    def pip_install(
        self,
        package: str,
        version: Optional[str] = None,
        index_url: Optional[str] = None,
        extra_args: Optional[List[str]] = None
    ) -> List[str]:
        """
        构建 pip install 命令
        
        Args:
            package: 包名
            version: 版本要求（如 ">=1.0.0"）
            index_url: 自定义索引 URL
            extra_args: 额外参数
            
        Returns:
            命令列表
        """
        package_spec = f"{package}{version}" if version else package
        cmd = [str(self.python_exe), '-m', 'pip', 'install', package_spec]
        
        if index_url:
            cmd.extend(['--index-url', index_url])
        
        if extra_args:
            cmd.extend(extra_args)
            
        return cmd
    
    def pip_install_requirements(
        self,
        requirements_path: Union[str, Path],
        index_url: Optional[str] = None,
        extra_args: Optional[List[str]] = None
    ) -> List[str]:
        """
        构建 pip install -r 命令
        
        Args:
            requirements_path: requirements.txt 路径
            index_url: 自定义索引 URL
            extra_args: 额外参数
            
        Returns:
            命令列表
        """
        cmd = [str(self.python_exe), '-m', 'pip', 'install', '-r', str(requirements_path)]
        
        if index_url:
            cmd.extend(['--index-url', index_url])
        
        if extra_args:
            cmd.extend(extra_args)
            
        return cmd
    
    def pip_uninstall(self, package: str, yes: bool = True) -> List[str]:
        """
        构建 pip uninstall 命令
        
        Args:
            package: 包名
            yes: 是否自动确认
            
        Returns:
            命令列表
        """
        cmd = [str(self.python_exe), '-m', 'pip', 'uninstall', package]
        if yes:
            cmd.append('-y')
        return cmd
    
    def pip_index_versions(self, package: str, index_url: Optional[str] = None) -> List[str]:
        """
        构建 pip index versions 命令
        
        Args:
            package: 包名
            index_url: 自定义索引 URL
            
        Returns:
            命令列表
        """
        cmd = [str(self.python_exe), '-m', 'pip', 'index', 'versions', package]
        if index_url:
            cmd.extend(['--index-url', index_url])
        return cmd
    
    # ==================== 命令执行 ====================
    
    def run(
        self,
        cmd: List[str],
        timeout: Optional[int] = None,
        capture_output: bool = True,
        text: bool = True,
        use_proxy: bool = True,
        **kwargs
    ) -> subprocess.CompletedProcess:
        """
        执行命令（subprocess.run 封装）
        
        Args:
            cmd: 命令列表
            timeout: 超时时间（秒）
            capture_output: 是否捕获输出
            text: 是否以文本模式处理输出
            use_proxy: 是否使用代理配置
            **kwargs: 传递给 subprocess.run 的其他参数
            
        Returns:
            subprocess.CompletedProcess 对象
        """
        logger.debug(f"[PythonCommandBuilder] 执行命令: {' '.join(cmd)}")
        
        if use_proxy:
            kwargs['env'] = self._get_env_with_proxy()
        
        if timeout:
            kwargs['timeout'] = timeout
        
        if capture_output:
            kwargs['capture_output'] = True
        
        if text:
            kwargs['text'] = True
            kwargs.setdefault('encoding', 'utf-8')
            kwargs.setdefault('errors', 'replace')
        
        # Windows 平台隐藏控制台窗口
        if 'creationflags' not in kwargs and platform.system() == "Windows":
            kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
        
        return subprocess.run(cmd, **kwargs)
    
    def popen(
        self,
        cmd: List[str],
        use_proxy: bool = True,
        **kwargs
    ) -> subprocess.Popen:
        """
        启动进程（subprocess.Popen 封装）
        
        Args:
            cmd: 命令列表
            use_proxy: 是否使用代理配置
            **kwargs: 传递给 subprocess.Popen 的其他参数
            
        Returns:
            subprocess.Popen 对象
        """
        logger.debug(f"[PythonCommandBuilder] 启动进程: {' '.join(cmd)}")
        
        if use_proxy:
            kwargs['env'] = self._get_env_with_proxy()
        
        kwargs.setdefault('stdout', subprocess.PIPE)
        kwargs.setdefault('stderr', subprocess.STDOUT)
        kwargs.setdefault('text', True)
        kwargs.setdefault('encoding', 'utf-8')
        kwargs.setdefault('errors', 'replace')
        kwargs.setdefault('bufsize', 1)
        kwargs.setdefault('universal_newlines', True)
        
        # Windows 平台隐藏控制台窗口
        if 'creationflags' not in kwargs and platform.system() == "Windows":
            kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
        
        return subprocess.Popen(cmd, **kwargs)
    
    @contextmanager
    def safe_popen(
        self,
        cmd: List[str],
        use_proxy: bool = True,
        timeout: Optional[int] = None,
        **kwargs
    ) -> Generator[subprocess.Popen, None, None]:
        """
        安全启动进程（上下文管理器）
        
        确保进程在任何情况下都会被正确关闭，防止资源泄漏。
        
        Args:
            cmd: 命令列表
            use_proxy: 是否使用代理配置
            timeout: 超时时间（秒），默认 600 秒
            **kwargs: 传递给 subprocess.Popen 的其他参数
            
        Yields:
            subprocess.Popen 对象
            
        Example:
            with builder.safe_popen(cmd) as process:
                for line in process.stdout:
                    print(line)
                return_code = process.wait()
        """
        process = None
        try:
            process = self.popen(cmd, use_proxy=use_proxy, **kwargs)
            yield process
        except Exception as e:
            logger.error(f"[PythonCommandBuilder] 进程执行异常: {e}")
            raise
        finally:
            if process is not None:
                try:
                    if process.poll() is None:
                        logger.warning("[PythonCommandBuilder] 进程仍在运行，尝试终止")
                        process.terminate()
                        try:
                            effective_timeout = timeout or DEFAULT_PROCESS_TIMEOUT
                            process.wait(timeout=5)
                        except subprocess.TimeoutExpired:
                            logger.warning("[PythonCommandBuilder] 进程未响应终止，强制结束")
                            process.kill()
                            process.wait()
                except Exception as e:
                    logger.error(f"[PythonCommandBuilder] 清理进程时出错: {e}")


def create_python_builder(python_path: Union[str, Path]) -> PythonCommandBuilder:
    """
    创建 Python 命令构建器的工厂函数
    
    Args:
        python_path: Python 路径
        
    Returns:
        PythonCommandBuilder 实例
    """
    return PythonCommandBuilder(python_path)
