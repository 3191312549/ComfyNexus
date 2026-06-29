"""
自定义HTTP服务器

用于提供前端静态文件服务，替代pywebview的内置http_server
"""

import os
import socket
import threading
from pathlib import Path
from flask import Flask, send_from_directory, send_file, request, Response
from flask_cors import CORS
from werkzeug.exceptions import NotFound
from werkzeug.serving import make_server

from .logger import app_logger as logger


def find_available_port(start_port: int = 5000, max_attempts: int = 100) -> int:
    """
    查找可用端口
    
    Args:
        start_port: 起始端口
        max_attempts: 最大尝试次数
    
    Returns:
        可用端口号
    
    Raises:
        RuntimeError: 如果找不到可用端口
    """
    for port in range(start_port, start_port + max_attempts):
        try:
            # 尝试绑定端口
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                logger.info(f"找到可用端口: {port}")
                return port
        except OSError:
            # 端口被占用，继续尝试下一个
            continue
    
    raise RuntimeError(f"无法在 {start_port}-{start_port + max_attempts} 范围内找到可用端口")


def create_server(static_dir: Path, port: int = None) -> 'StaticFileServer':
    """
    创建静态文件服务器
    
    Args:
        static_dir: 静态文件目录（前端构建输出目录）
        port: 服务器端口（如果为 None，则自动查找可用端口）
    
    Returns:
        StaticFileServer 实例
    """
    return StaticFileServer(static_dir, port)


class StaticFileServer:
    """静态文件服务器"""
    
    def __init__(self, static_dir: Path, port: int = None):
        """
        初始化静态文件服务器
        
        Args:
            static_dir: 静态文件目录（前端构建输出目录）
            port: 服务器端口（如果为 None，则自动查找可用端口）
        """
        self.static_dir = Path(static_dir)
        
        # 如果未指定端口，自动查找可用端口
        if port is None:
            self.port = find_available_port()
        else:
            self.port = port
            
        self.app = Flask(__name__)
        self.server = None
        self.server_thread = None
        self.is_running = False
        
        # 启用CORS（允许跨域请求）
        CORS(self.app)
        
        # 配置Flask
        self.app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # 禁用缓存（开发模式)
        
        # 设置路由
        self._setup_routes()
        
        logger.info(f"[HTTP Server] 初始化完成")
        logger.info(f"[HTTP Server] 静态文件目录: {static_dir}")
    
    def _setup_routes(self):
        """设置路由"""
        
        # ========== 鷻加静态文件路由 ==========
        
        @self.app.route('/lora/preview/<model_id>/<filename>')
        def lora_preview(model_id, filename):
            """LoRA 预览图路由"""
            try:
                from pathlib import Path
                from backend.src.utils.paths import get_project_root
                
                preview_dir = Path(get_project_root()) / "lora_data" / "preview" / model_id
                file_path = preview_dir / filename
                
                if not file_path.exists():
                    logger.warning(f"[Lora Preview] 预览图不存在: {file_path}")
                    return f"Preview not found: {model_id}/{filename}", 404
                
                ext = file_path.suffix.lower()
                mime_types = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp',
                    '.mp4': 'video/mp4',
                    '.webm': 'video/webm',
                    '.mov': 'video/quicktime'
                }
                mimetype = mime_types.get(ext, 'application/octet-stream')
                
                return send_file(str(file_path), mimetype=mimetype)
            except Exception as e:
                logger.error(f"[Lora Preview] 提供预览图失败: {e}")
                return f"Error: {str(e)}", 500
        
        @self.app.route('/prompt/images/<filename>')
        def prompt_image(filename):
            """提示词库预览图路由"""
            try:
                from backend.src.utils.paths import get_prompt_images_dir
                
                images_dir = get_prompt_images_dir()
                file_path = images_dir / filename
                
                if not file_path.exists():
                    logger.warning(f"[Prompt Image] 预览图不存在： {file_path}")
                    return f"Image not found: {filename}", 404
                
                ext = file_path.suffix.lower()
                mime_types = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp'
                }
                mimetype = mime_types.get(ext, 'application/octet-stream')
                
                return send_file(str(file_path), mimetype=mimetype)
            except Exception as e:
                logger.error(f"[Prompt Image] 提供预览图失败: {e}")
                return f"Error: {str(e)}", 500
        
        @self.app.route('/gallery/thumbnail/<asset_id>')
        def gallery_thumbnail(asset_id):
            """资产库缩略图路由"""
            try:
                from backend.src.gallery.controller import gallery_controller
                response = gallery_controller.gallery_get_thumbnail(asset_id)
                if response:
                    return response
                else:
                    logger.warning(f"[Gallery Thumbnail] 无法获取缩略图: {asset_id}")
                    return f"Thumbnail not found: {asset_id}", 404
            except Exception as e:
                logger.error(f"[Gallery Thumbnail] 提供缩略图失败: {e}")
                return f"Error: {str(e)}", 500
        
        @self.app.route('/gallery/asset/<asset_id>')
        def gallery_asset(asset_id):
            """资产库原图路由"""
            try:
                from backend.src.gallery.controller import gallery_controller
                response = gallery_controller.gallery_get_asset_file(asset_id)
                if response:
                    return response
                else:
                    logger.warning(f"[Gallery Asset] 无法获取原图: {asset_id}")
                    return f"Asset not found: {asset_id}", 404
            except Exception as e:
                logger.error(f"[Gallery Asset] 提供原图失败: {e}")
                return f"Error: {str(e)}", 500
        
        @self.app.route('/images/<filename>')
        def workflow_preview_image(filename):
            """工作流预览图路由"""
            try:
                from backend.src.utils.paths import get_data_dir
                
                images_dir = get_data_dir() / "workflows" / "images"
                file_path = images_dir / filename
                
                if not file_path.exists():
                    logger.warning(f"[Workflow Preview] 预览图不存在: {file_path}")
                    return f"Image not found: {filename}", 404
                
                ext = file_path.suffix.lower()
                mime_types = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp'
                }
                mimetype = mime_types.get(ext, 'application/octet-stream')
                
                return send_file(str(file_path), mimetype=mimetype)
            except Exception as e:
                logger.error(f"[Workflow Preview] 提供预览图失败: {e}")
                return f"Error: {str(e)}", 500
        
        @self.app.route('/')
        def index():
            """首页路由"""
            try:
                index_path = self.static_dir / 'index.html'
                if not index_path.exists():
                    logger.error(f"index.html not found at {index_path}")
                    return f"Error: index.html not found at {index_path}", 404
                
                return send_file(str(index_path))
            except Exception as e:
                logger.error(f"Error serving index.html: {e}")
                return f"Error: {str(e)}", 500
        
        @self.app.route('/<path:path>')
        def static_files(path):
            """静态文件路由"""
            try:
                # 尝试直接返回文件
                file_path = self.static_dir / path
                
                if file_path.exists() and file_path.is_file():
                    return send_file(str(file_path))
                
                # 如果文件不存在,检查是否是 JS/TS 文件请求
                # 这些文件不应该返回 index.html,而应该返回 404
                # 避免 MIME 类型错误
                if path.endswith(('.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs')):
                    logger.warning(f"[Static] JS/TS 文件不存在,返回 404: {path}")
                    return f"File not found: {path}", 404
                
                # 如果文件不存在,返回index.html(支持前端路由)
                # 这对于React Router等前端路由框架很重要
                index_path = self.static_dir / 'index.html'
                if index_path.exists():
                    return send_file(str(index_path))
                
                return f"File not found: {path}", 404
                
            except Exception as e:
                logger.error(f"Error serving {path}: {e}")
                return f"Error: {str(e)}", 500
        
        @self.app.errorhandler(404)
        def not_found(e):
            """404错误处理 - 返回index.html支持前端路由"""
            try:
                index_path = self.static_dir / 'index.html'
                if index_path.exists():
                    return send_file(str(index_path))
                return "404 Not Found", 404
            except Exception as ex:
                logger.error(f"Error in 404 handler: {ex}")
                return "404 Not Found", 404
        
        @self.app.errorhandler(500)
        def internal_error(e):
            """500错误处理"""
            logger.error(f"Internal server error: {e}")
            return f"Internal Server Error: {str(e)}", 500
    
    def start(self):
        """启动服务器"""
        if self.is_running:
            logger.warning("[HTTP Server] 服务器已在运行")
            return
        
        self.is_running = True
        self._start_error = None
        self.server_thread = threading.Thread(target=self._run_server, daemon=True)
        self.server_thread.start()
        logger.info(f"[HTTP Server] 服务器线程已启动，端口: {self.port}")
    
    def _run_server(self):
        """运行 Flask 服务器"""
        try:
            import logging
            werkzeug_logger = logging.getLogger('werkzeug')
            werkzeug_logger.setLevel(logging.WARNING)
            
            self.server = make_server('127.0.0.1', self.port, self.app, threaded=True)
            logger.info(f"[HTTP Server] make_server 绑定成功，开始监听端口: {self.port}")
            self.server.serve_forever()
        except Exception as e:
            self._start_error = str(e)
            logger.error(f"[HTTP Server] 服务器错误: {e}")
            self.is_running = False
    
    def stop(self):
        """停止服务器"""
        if not self.is_running:
            return
        
        self.is_running = False
        if self.server:
            self.server.shutdown()
            self.server = None
        
        if self.server_thread:
            self.server_thread.join(timeout=2)
            self.server_thread = None
        
        logger.info("[HTTP Server] 服务器已停止")
    
    def get_url(self) -> str:
        """获取服务器 URL"""
        return f"http://127.0.0.1:{self.port}"
