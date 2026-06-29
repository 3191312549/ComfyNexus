"""
系统代理管理器
用于获取系统代理配置
"""

import platform
from typing import Dict

from backend.src.utils.logger import app_logger as logger


class SystemProxyManager:
    """系统代理管理器"""
    
    def get_system_proxy(self) -> Dict:
        """
        获取 Windows 系统代理配置
        
        使用 winreg 直接读取注册表
        
        Returns:
            dict: {
                "success": bool,
                "message": str (可选),
                "enabled": bool,
                "host": str,
                "port": str
            }
        """
        try:
            if platform.system() != "Windows":
                return {
                    "success": False,
                    "message": "仅支持 Windows 系统",
                    "enabled": False,
                    "host": "",
                    "port": ""
                }
            
            import winreg
            
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Internet Settings"
            )
            
            try:
                proxy_enable = winreg.QueryValueEx(key, "ProxyEnable")[0]
            except FileNotFoundError:
                proxy_enable = 0
            
            try:
                proxy_server = winreg.QueryValueEx(key, "ProxyServer")[0]
            except FileNotFoundError:
                proxy_server = ""
            
            winreg.CloseKey(key)
            
            logger.debug(f"[SystemProxyManager] ProxyEnable: {proxy_enable}")
            logger.debug(f"[SystemProxyManager] ProxyServer: {proxy_server}")
            
            host = ""
            port = ""
            
            if proxy_server:
                if '=' in proxy_server:
                    for part in proxy_server.split(';'):
                        if part.startswith('http='):
                            proxy_server = part.split('=')[1]
                            break
                
                if ':' in proxy_server:
                    parts = proxy_server.split(':')
                    host = parts[0]
                    port = parts[1]
                else:
                    host = proxy_server
                    port = "80"
            
            return {
                "success": True,
                "enabled": bool(proxy_enable),
                "host": host,
                "port": port
            }
            
        except Exception as e:
            logger.error(f"[SystemProxyManager] 获取系统代理失败: {str(e)}")
            return {
                "success": False,
                "message": f"获取系统代理失败: {str(e)}",
                "enabled": False,
                "host": "",
                "port": ""
            }
