"""
浏览器检测模块

通过 Windows 注册表检测系统已安装的浏览器
"""

import sys
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# 浏览器显示名称映射
DISPLAY_NAMES = {
    "Chrome.HTML": "Google Chrome",
    "MSEdgeHTM": "Microsoft Edge",
    "FirefoxHTML": "Mozilla Firefox",
    "BraveHTML": "Brave Browser",
    "VivaldiHTM": "Vivaldi",
    "OperaHTML": "Opera",
}


def detect_browsers() -> Dict[str, str]:
    """
    通过注册表检测系统已安装的浏览器
    
    Returns:
        Dict[浏览器注册表键名, 浏览器exe路径]
    """
    if sys.platform != "win32":
        logger.debug("[BrowserDetector] 非 Windows 系统，跳过注册表检测")
        return {}
    
    browsers = {}
    
    try:
        import winreg
        
        key_path = r"SOFTWARE\Clients\StartMenuInternet"
        
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
            subkey_count = winreg.QueryInfoKey(key)[0]
            
            for i in range(subkey_count):
                try:
                    browser_name = winreg.EnumKey(key, i)
                    cmd_key_path = f"{browser_name}\\shell\\open\\command"
                    
                    with winreg.OpenKey(key, cmd_key_path) as cmd_key:
                        cmd, _ = winreg.QueryValueEx(cmd_key, "")
                        
                        # 解析命令行获取浏览器路径
                        # 格式通常是: "C:\path\to\chrome.exe" -- "%1"
                        # 或: "C:\path\to\chrome.exe" "%1"
                        if '"' in cmd:
                            browser_path = cmd.split('"')[1]
                        else:
                            parts = cmd.split()
                            browser_path = parts[0] if parts else ""
                        
                        if browser_path:
                            browsers[browser_name] = browser_path
                            logger.debug(f"[BrowserDetector] 检测到浏览器: {browser_name} -> {browser_path}")
                            
                except (OSError, IndexError) as e:
                    logger.debug(f"[BrowserDetector] 读取子键失败: {e}")
                    continue
                    
    except OSError as e:
        logger.warning(f"[BrowserDetector] 无法打开注册表: {e}")
    
    return browsers


def get_browser_display_name(registry_name: str) -> str:
    """
    获取浏览器的显示名称
    
    Args:
        registry_name: 注册表键名（如 Chrome.HTML）
        
    Returns:
        显示名称（如 Google Chrome）
    """
    return DISPLAY_NAMES.get(registry_name, registry_name)


def get_installed_browsers() -> List[Dict[str, str]]:
    """
    获取已安装浏览器列表（带显示名称和路径）
    
    Returns:
        List[{"name": 注册表键名, "displayName": 显示名称, "path": exe路径}]
    """
    browsers = detect_browsers()
    
    result = []
    for name, path in browsers.items():
        result.append({
            "name": name,
            "displayName": get_browser_display_name(name),
            "path": path,
        })
    
    # 按显示名称排序
    result.sort(key=lambda x: x["displayName"])
    
    return result


def open_url_with_browser(url: str, browser_path: Optional[str] = None) -> bool:
    """
    使用指定浏览器打开 URL
    
    Args:
        url: 要打开的 URL
        browser_path: 浏览器 exe 路径，None 则使用系统默认浏览器
        
    Returns:
        是否成功
    """
    import subprocess
    
    if browser_path:
        try:
            subprocess.Popen([browser_path, url])
            return True
        except Exception as e:
            logger.error(f"[BrowserDetector] 使用指定浏览器打开失败: {e}")
            return False
    else:
        import webbrowser
        webbrowser.open(url)
        return True
