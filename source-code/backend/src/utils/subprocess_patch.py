"""
Subprocess Monkey Patch

在应用启动时自动为所有 subprocess 调用添加 CREATE_NO_WINDOW 标志
这是一个全局补丁，无需修改每个文件
"""

import subprocess
import platform

# 保存原始函数
_original_run = subprocess.run
_original_Popen = subprocess.Popen


def _patched_run(*args, **kwargs):
    """
    Patched subprocess.run
    自动添加 Windows 平台的 CREATE_NO_WINDOW 标志
    """
    if platform.system() == "Windows" and 'creationflags' not in kwargs:
        if hasattr(subprocess, 'CREATE_NO_WINDOW'):
            kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
    
    return _original_run(*args, **kwargs)


def _patched_Popen(*args, **kwargs):
    """
    Patched subprocess.Popen
    自动添加 Windows 平台的 CREATE_NO_WINDOW 标志
    """
    if platform.system() == "Windows" and 'creationflags' not in kwargs:
        if hasattr(subprocess, 'CREATE_NO_WINDOW'):
            kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
    
    return _original_Popen(*args, **kwargs)


def apply_patch():
    """应用 subprocess monkey patch"""
    subprocess.run = _patched_run
    subprocess.Popen = _patched_Popen
    print("[SubprocessPatch] Subprocess monkey patch applied")


def remove_patch():
    """移除 subprocess monkey patch"""
    subprocess.run = _original_run
    subprocess.Popen = _original_Popen
    print("[SubprocessPatch] Subprocess monkey patch removed")
