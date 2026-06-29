"""
引导窗口 API 模块

提供引导窗口的前端 API 接口。
"""

import os
import webview
from typing import Optional, Callable

from backend.src.utils.git_manager import GitManager, GitMode
from backend.src.utils.mingit_downloader import MinGitDownloader, DownloadStatus
from backend.src.utils.paths import get_mingit_dir
from backend.src.utils.logger import get_logger


class BootstrapAPI:
    """引导窗口 API"""
    
    def __init__(self, git_manager: GitManager, on_complete: Optional[Callable] = None):
        """
        初始化 API
        
        Args:
            git_manager: Git 管理器实例
            on_complete: 完成回调函数
        """
        self.git_manager = git_manager
        self.on_complete = on_complete
        self._downloader: Optional[MinGitDownloader] = None
        self._window = None
    
    def set_window(self, window):
        """设置窗口引用"""
        self._window = window
    
    def check_git_status(self) -> dict:
        """
        检查 Git 状态
        
        Returns:
            dict: Git 状态信息
        """
        status = self.git_manager.check_availability()
        system_status = self.git_manager._check_system_git()
        
        return {
            "available": status.available,
            "message": status.message,
            "has_system_git": system_status.available,
            "system_git_version": system_status.version if system_status.available else ""
        }
    
    def start_download(self) -> dict:
        """
        开始下载 MinGit
        
        Returns:
            dict: 操作结果
        """
        target_dir = get_mingit_dir()
        self._downloader = MinGitDownloader()
        
        def progress_callback(progress):
            if self._window:
                self._window.evaluate_js(f'updateProgress({{'
                    f'status: "{progress.status.value}", '
                    f'current: {progress.current}, '
                    f'total: {progress.total}, '
                    f'message: "{progress.message}", '
                    f'resumed: {str(progress.resumed).lower()}, '
                    f'from_cache: {str(progress.from_cache).lower()}'
                    f'}})')
                
                if progress.status == DownloadStatus.COMPLETED:
                    success, message = self.git_manager.use_mingit()
                    if success:
                        self._window.evaluate_js('complete()')
                    else:
                        self._window.evaluate_js(f'showError("{message}")')
                        self._window.evaluate_js('resetUI()')
                elif progress.status == DownloadStatus.FAILED:
                    self._window.evaluate_js(f'showError("{progress.error}")')
                    self._window.evaluate_js('resetUI()')
        
        def download_thread():
            success, message = self._downloader.download(
                target_dir,
                progress_callback=progress_callback
            )
            if not success:
                if self._window:
                    self._window.evaluate_js(f'showError("{message}")')
                    self._window.evaluate_js('resetUI()')
        
        import threading
        thread = threading.Thread(target=download_thread, daemon=True)
        thread.start()
        
        return {"success": True, "message": "下载已开始"}
    
    def select_git_exe(self) -> dict:
        """
        选择 Git 可执行文件
        
        Returns:
            dict: 操作结果
        """
        if not self._window:
            return {"success": False, "message": "窗口未初始化"}
        
        result = self._window.create_file_dialog(
            webview.OPEN_DIALOG,
            file_types=('Executable files (*.exe)',),
            directory=os.environ.get('ProgramFiles', 'C:\\')
        )
        
        if result and len(result) > 0:
            git_path = result[0]
            success, message = self.git_manager.set_custom_git_path(git_path)
            return {"success": success, "message": message}
        
        return {"success": False, "message": "未选择文件"}
    
    def use_system_git(self) -> dict:
        """
        使用系统 Git
        
        Returns:
            dict: 操作结果
        """
        success, message = self.git_manager.use_system_git()
        return {"success": success, "message": message}
    
    def cancel_download(self) -> dict:
        """
        取消下载
        
        Returns:
            dict: 操作结果
        """
        if self._downloader:
            self._downloader.cancel()
        return {"success": True}
    
    def continue_startup(self) -> dict:
        """
        继续启动
        
        Returns:
            dict: 操作结果
        """
        try:
            import traceback
            logger = get_logger()
            logger.info("[BootstrapAPI] continue_startup 被调用")
            
            if self.on_complete:
                logger.info("[BootstrapAPI] 调用 on_complete 回调")
                self.on_complete(True)
            
            if self._window:
                logger.info("[BootstrapAPI] 销毁窗口")
                self._window.destroy()
            
            logger.info("[BootstrapAPI] continue_startup 执行成功")
            return {"success": True}
        except Exception as e:
            logger = get_logger()
            logger.error(f"[BootstrapAPI] continue_startup 执行失败：{e}")
            logger.debug(traceback.format_exc())
            return {"success": False, "error": str(e)}
    
    def close_window(self) -> dict:
        """
        关闭窗口
        
        Returns:
            dict: 操作结果
        """
        if self.on_complete:
            self.on_complete(False)
        
        if self._window:
            self._window.destroy()
        
        return {"success": True}
    
    def get_window(self) -> dict:
        """
        获取窗口信息
        
        Returns:
            dict: 窗口位置信息
        """
        if self._window:
            return {
                "x": self._window.x,
                "y": self._window.y,
                "width": self._window.width,
                "height": self._window.height
            }
        return {"x": 0, "y": 0, "width": 500, "height": 720}
    
    def set_window_bounds(self, x: int, y: int, width: int, height: int) -> dict:
        """
        同时设置窗口的位置和大小，避免撕裂
        
        Args:
            x: X 坐标
            y: Y 坐标
            width: 宽度
            height: 高度
            
        Returns:
            dict: 操作结果
        """
        if x is None or y is None or width is None or height is None:
            logger = get_logger()
            logger.warning(f"set_window_bounds 收到 None 值：x={x}, y={y}, width={width}, height={height}")
            return {"success": False, "error": "参数不能为 None"}
        
        if self._window:
            width = max(400, int(width))
            height = max(500, int(height))
            
            self._window.move(int(x), int(y))
            self._window.resize(int(width), int(height))
            
        return {"success": True}
