"""
测试 WebSocket 代理功能
"""

import sys
from pathlib import Path
import asyncio
import websockets

# 添加项目根目录到 Python 路径
base_path = Path(__file__).parent.parent
sys.path.insert(0, str(base_path))

from backend.src.utils.http_server import create_server
from backend.src.utils.logger import setup_logger
import time
import threading

def main():
    """测试 WebSocket 代理"""
    
    # 初始化日志
    logger = setup_logger(
        name="WSProxyTest",
        log_dir=None,
        console=True,
        level="DEBUG"
    )
    
    logger.info("=" * 60)
    logger.info("WebSocket 代理测试")
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
    logger.info(f"🔗 ComfyUI HTTP 代理: {http_server.get_url()}/comfyui/")
    logger.info(f"🔌 ComfyUI WebSocket 代理: ws://127.0.0.1:5000/comfyui/ws")
    logger.info("=" * 60)
    logger.info("")
    logger.info("测试步骤:")
    logger.info("1. 确保 ComfyUI 正在运行 (http://127.0.0.1:8188)")
    logger.info("2. 测试 HTTP 代理:")
    logger.info("   curl http://127.0.0.1:5000/comfyui/")
    logger.info("3. 测试 WebSocket 代理:")
    logger.info("   运行下面的 WebSocket 客户端测试")
    logger.info("")
    logger.info("按 Ctrl+C 停止服务器")
    logger.info("=" * 60)
    
    # 可选：运行 WebSocket 客户端测试
    def test_websocket_client():
        """测试 WebSocket 客户端连接"""
        time.sleep(2)  # 等待服务器完全启动
        
        async def test():
            try:
                logger.info("\n[测试] 尝试连接到 WebSocket 代理...")
                async with websockets.connect('ws://127.0.0.1:5000/comfyui/ws') as ws:
                    logger.info("[测试] ✅ WebSocket 连接成功！")
                    
                    # 发送测试消息
                    test_message = '{"type": "ping"}'
                    await ws.send(test_message)
                    logger.info(f"[测试] 发送消息: {test_message}")
                    
                    # 等待响应（超时 5 秒）
                    try:
                        response = await asyncio.wait_for(ws.recv(), timeout=5.0)
                        logger.info(f"[测试] 收到响应: {response}")
                    except asyncio.TimeoutError:
                        logger.info("[测试] 等待响应超时（这是正常的，如果 ComfyUI 未运行）")
                    
                    logger.info("[测试] WebSocket 测试完成")
            except Exception as e:
                logger.error(f"[测试] WebSocket 连接失败: {e}")
                logger.error("[测试] 请确保 ComfyUI 正在运行")
        
        # 运行异步测试
        asyncio.run(test())
    
    # 在后台线程运行 WebSocket 测试
    test_thread = threading.Thread(target=test_websocket_client, daemon=True)
    test_thread.start()
    
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
