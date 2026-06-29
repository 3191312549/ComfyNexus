"""
Subprocess 工具函数

提供跨平台的 subprocess 调用，自动处理 Windows 平台的控制台窗口隐藏
"""

import os
import shutil
import subprocess
import platform
from typing import List, Optional, Dict, Any


_WINDOWS_POWERSHELL_PATHS = [
    r'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe',
    r'C:\Windows\SysNative\WindowsPowerShell\v1.0\powershell.exe',
]

_WINDOWS_PWSH_PATHS = [
    r'C:\Program Files\PowerShell\7\pwsh.exe',
    r'C:\Program Files (x86)\PowerShell\7\pwsh.exe',
]


def find_powershell() -> Optional[str]:
    """
    查找可用的 PowerShell 可执行文件
    
    查找策略（按优先级）：
    1. 通过 PATH 查找 pwsh.exe (PowerShell 7+)
    2. 通过 PATH 查找 powershell.exe (Windows PowerShell 5.1)
    3. 尝试已知的完整路径（pwsh 优先）
    4. 尝试已知的完整路径（powershell）
    
    Returns:
        PowerShell 可执行文件的完整路径，如果未找到则返回 None
        
    Example:
        >>> ps_path = find_powershell()
        >>> if ps_path:
        ...     subprocess.run([ps_path, '-Command', '...'])
    """
    if platform.system() != "Windows":
        return None
    
    # 1. 优先通过 PATH 查找 PowerShell 7+ (pwsh.exe)
    pwsh_in_path = shutil.which('pwsh')
    if pwsh_in_path:
        return pwsh_in_path
    
    # 2. 通过 PATH 查找 Windows PowerShell 5.1 (powershell.exe)
    powershell_in_path = shutil.which('powershell')
    if powershell_in_path:
        return powershell_in_path
    
    # 3. 尝试已知的 pwsh 完整路径
    for path in _WINDOWS_PWSH_PATHS:
        if os.path.exists(path):
            return path
    
    # 4. 尝试已知的 powershell 完整路径
    for path in _WINDOWS_POWERSHELL_PATHS:
        if os.path.exists(path):
            return path
    
    return None


def get_creation_flags() -> int:
    """
    获取适用于当前平台的 creation flags
    
    Returns:
        Windows 平台返回 CREATE_NO_WINDOW，其他平台返回 0
    """
    if platform.system() == "Windows" and hasattr(subprocess, 'CREATE_NO_WINDOW'):
        return subprocess.CREATE_NO_WINDOW
    return 0


def run_command(
    cmd: List[str],
    **kwargs
) -> subprocess.CompletedProcess:
    """
    运行命令（subprocess.run 的封装）
    
    自动添加 Windows 平台的 CREATE_NO_WINDOW 标志
    
    Args:
        cmd: 命令列表
        **kwargs: 传递给 subprocess.run 的其他参数
        
    Returns:
        subprocess.CompletedProcess 对象
    """
    # 如果用户没有指定 creationflags，自动添加
    if 'creationflags' not in kwargs:
        kwargs['creationflags'] = get_creation_flags()
    
    return subprocess.run(cmd, **kwargs)


def popen_command(
    cmd: List[str],
    **kwargs
) -> subprocess.Popen:
    """
    启动进程（subprocess.Popen 的封装）
    
    自动添加 Windows 平台的 CREATE_NO_WINDOW 标志
    
    Args:
        cmd: 命令列表
        **kwargs: 传递给 subprocess.Popen 的其他参数
        
    Returns:
        subprocess.Popen 对象
    """
    # 如果用户没有指定 creationflags，自动添加
    if 'creationflags' not in kwargs:
        kwargs['creationflags'] = get_creation_flags()
    
    return subprocess.Popen(cmd, **kwargs)


def run_powershell_command(
    command: str,
    **kwargs
) -> Optional[subprocess.CompletedProcess]:
    """
    执行 PowerShell 命令
    
    自动查找可用的 PowerShell 可执行文件并执行命令
    
    Args:
        command: 要执行的 PowerShell 命令
        **kwargs: 传递给 subprocess.run 的其他参数
        
    Returns:
        subprocess.CompletedProcess 对象，如果找不到 PowerShell 则返回 None
        
    Raises:
        RuntimeError: 当找不到可用的 PowerShell 时抛出
        
    Example:
        >>> result = run_powershell_command('(Get-CimInstance -ClassName Win32_Processor).Name')
        >>> print(result.stdout)
    """
    ps_path = find_powershell()
    if not ps_path:
        raise RuntimeError("找不到可用的 PowerShell 可执行文件")
    
    cmd = [ps_path, '-Command', command]
    
    # 设置默认参数
    kwargs.setdefault('capture_output', True)
    kwargs.setdefault('text', True)
    
    # 添加 Windows 平台隐藏控制台标志
    if 'creationflags' not in kwargs:
        kwargs['creationflags'] = get_creation_flags()
    
    return subprocess.run(cmd, **kwargs)


def popen_powershell(
    command: str,
    new_console: bool = False,
    **kwargs
) -> subprocess.Popen:
    """
    启动 PowerShell 进程
    
    自动查找可用的 PowerShell 可执行文件并启动进程
    
    Args:
        command: 要执行的 PowerShell 命令
        new_console: 是否在新控制台窗口中启动
        **kwargs: 传递给 subprocess.Popen 的其他参数
        
    Returns:
        subprocess.Popen 对象
        
    Raises:
        RuntimeError: 当找不到可用的 PowerShell 时抛出
        
    Example:
        # 打开交互式 PowerShell 窗口
        >>> popen_powershell('Write-Host "Hello"', new_console=True)
    """
    ps_path = find_powershell()
    if not ps_path:
        raise RuntimeError("找不到可用的 PowerShell 可执行文件")
    
    if new_console:
        cmd = [ps_path, '-NoExit', '-Command', command]
        if platform.system() == "Windows" and hasattr(subprocess, 'CREATE_NEW_CONSOLE'):
            kwargs['creationflags'] = subprocess.CREATE_NEW_CONSOLE
    else:
        # 设置默认参数
        kwargs.setdefault('stdout', subprocess.PIPE)
        kwargs.setdefault('stderr', subprocess.STDOUT)
        kwargs.setdefault('text', True)
        if 'creationflags' not in kwargs:
            kwargs['creationflags'] = get_creation_flags()
    
    return subprocess.Popen(cmd, **kwargs)
