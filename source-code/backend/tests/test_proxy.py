"""
测试反向代理功能
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
base_path = Path(__file__).parent.parent
sys.path.insert(0, str(base_path))

from backend.src.utils.http_server import create_server
from backend.src.utils.logger import setup_logger
import time

def main():
    """测试反向代理"""
    
    # 初始化日志
    logger = setup_logger(
        name="ProxyTest",
        log_dir=None,
        console=True,
        level="DEBUG"
    )
    
    logger.info("=" * 60)
    logger.info("反向代理测试")
    logger.info("=" * 60)
    
    # 获取前端构建目录
    dist_dir = base_path / "dist"
    
    if not dist_dir.exists():
        logger.error(f"前端构建目录不存在: {dist_dir}")
        logger.error("请先运行: cd frontend && npm run build")
        return
    
    # 创建并启动服务器
    logger.info("创建 HTTP 服务器...")
    http_server = create_server(dist_dir, port=5000, comfyui_port=8188)
    
    logger.info("启动服务器...")
    http_server.start()
    
    # 等待服务器启动
    time.sleep(1)
    
    logger.info("=" * 60)
    logger.info("✅ 服务器启动成功")
    logger.info(f"🌐 主窗口: {http_server.get_url()}")
    logger.info(f"🔗 ComfyUI 代理: {http_server.get_url()}/comfyui/")
    logger.info("=" * 60)
    logger.info("")
    logger.info("测试步骤:")
    logger.info("1. 确保 ComfyUI 正在运行 (http://127.0.0.1:8188)")
    logger.info("2. 在浏览器中打开: http://127.0.0.1:5000")
    logger.info("3. 导航到工作台页面")
    logger.info("4. 检查 iframe 是否正常加载 ComfyUI")
    logger.info("5. 右键点击图片，测试下载功能")
    logger.info("")
    logger.info("按 Ctrl+C 停止服务器")
    logger.info("=" * 60)
    
    try:
        # 保持服务器运行
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("\n正在停止服务器...")
        http_server.stop()
        logger.info("✅ 服务器已停止")

if __name__ == "__main__":
    main()
