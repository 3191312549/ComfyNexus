"""
后台插件数据获取服务

在应用启动时后台异步获取插件数据，用户无感知。
实现 24 小时缓存机制，避免频繁请求。

功能：
- 应用启动时自动在后台获取插件数据
- 检查缓存有效期（24小时）
- 缓存有效时跳过获取
- 缓存过期时重新获取并更新缓存
- 使用独立线程，不阻塞主线程
- 单独的日志文件记录详细信息
"""

import threading
import time
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

from .logger import marketplace_logger as logger
from .constants import get_cache_dir


def setup_background_logger():
    """
    设置后台获取任务的专用日志记录器
    
    日志文件位置：cache_dir/background_fetch.log
    日志模式：覆盖模式（每次启动时清空旧日志）
    """
    cache_dir = get_cache_dir()
    log_file = cache_dir / "background_fetch.log"
    
    # 创建专用的日志记录器
    bg_logger = logging.getLogger("BackgroundFetcher")
    bg_logger.setLevel(logging.INFO)
    
    # 清除旧的处理器
    if bg_logger.handlers:
        for handler in bg_logger.handlers[:]:
            handler.close()
            bg_logger.removeHandler(handler)
    
    # 文件处理器（使用 'w' 模式覆盖旧日志）
    file_handler = logging.FileHandler(log_file, mode='w', encoding='utf-8')
    file_handler.setLevel(logging.INFO)
    
    # 日志格式
    formatter = logging.Formatter(
        '[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    
    bg_logger.addHandler(file_handler)
    
    return bg_logger, log_file


class BackgroundPluginFetcher:
    """
    后台插件数据获取服务
    
    在独立线程中运行，定期检查缓存并更新插件数据。
    """
    
    def __init__(self, marketplace_controller_bridge):
        """
        初始化后台获取服务
        
        Args:
            marketplace_controller_bridge: 插件市场控制器桥接层实例
        """
        # 从桥接层获取真正的控制器实例
        self.controller = marketplace_controller_bridge.controller
        self.thread: Optional[threading.Thread] = None
        self.is_running = False
        
        # 设置专用日志记录器
        self.bg_logger, self.log_file = setup_background_logger()
        
        logger.info("后台插件数据获取服务已初始化")
        self.bg_logger.info("=" * 80)
        self.bg_logger.info("后台插件数据获取服务已初始化")
        self.bg_logger.info(f"日志文件: {self.log_file}")
        self.bg_logger.info("=" * 80)
    
    def start(self):
        """
        启动后台获取任务
        
        在独立线程中运行，不阻塞主线程。
        """
        if self.is_running:
            logger.warning("后台获取任务已在运行中")
            self.bg_logger.warning("后台获取任务已在运行中")
            return
        
        self.is_running = True
        self.thread = threading.Thread(
            target=self._fetch_task,
            name="PluginDataFetcher",
            daemon=True  # 守护线程，主程序退出时自动结束
        )
        self.thread.start()
        
        logger.info("后台插件数据获取任务已启动")
        self.bg_logger.info("后台插件数据获取任务已启动")
        self.bg_logger.info(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    def _fetch_task(self):
        """
        后台获取任务的主逻辑
        
        流程：
        1. 检查缓存是否有效（24小时）
        2. 如果缓存有效，跳过获取
        3. 如果缓存过期，重新获取并更新缓存
        4. 记录详细日志和耗时统计
        """
        try:
            self.bg_logger.info("=" * 80)
            self.bg_logger.info("后台插件数据获取任务开始")
            self.bg_logger.info("=" * 80)
            
            # 记录总开始时间
            total_start_time = time.time()
            
            # 步骤1：检查缓存是否有效
            self.bg_logger.info("步骤1: 检查缓存有效期")
            cache_check_start = time.time()
            
            cache_valid = self.controller.cache_manager._is_cache_valid(
                self.controller.cache_manager._plugins_cache_file
            )
            
            cache_check_time = time.time() - cache_check_start
            self.bg_logger.info(f"  - 缓存检查耗时: {cache_check_time:.3f}秒")
            self.bg_logger.info(f"  - 缓存状态: {'有效' if cache_valid else '过期或不存在'}")
            
            if cache_valid:
                self.bg_logger.info("插件列表缓存有效（24小时内），跳过后台获取")
                self.bg_logger.info("=" * 80)
                
                total_time = time.time() - total_start_time
                self.bg_logger.info(f"总耗时: {total_time:.3f}秒")
                self.bg_logger.info("=" * 80)
                return
            
            # 步骤2：获取插件列表
            self.bg_logger.info("步骤2: 缓存已过期，开始获取最新数据")
            fetch_start_time = time.time()
            
            result = self.controller.get_plugins(use_cache=False)
            
            fetch_time = time.time() - fetch_start_time
            
            # 步骤3：输出结果统计
            self.bg_logger.info("步骤3: 数据获取完成，统计结果")
            
            if result.get('success'):
                plugin_count = result.get('total', 0)
                self.bg_logger.info("=" * 80)
                self.bg_logger.info("后台插件数据获取成功")
                self.bg_logger.info("=" * 80)
                self.bg_logger.info(f"  - 插件数量: {plugin_count}")
                self.bg_logger.info(f"  - 数据获取耗时: {fetch_time:.3f}秒")
                
                # 计算总耗时
                total_time = time.time() - total_start_time
                self.bg_logger.info(f"  - 总耗时: {total_time:.3f}秒")
                self.bg_logger.info("=" * 80)
                
                # 输出性能分析
                self.bg_logger.info("性能分析:")
                self.bg_logger.info(f"  - 缓存检查: {cache_check_time:.3f}秒 ({cache_check_time/total_time*100:.1f}%)")
                self.bg_logger.info(f"  - 数据获取: {fetch_time:.3f}秒 ({fetch_time/total_time*100:.1f}%)")
                self.bg_logger.info("=" * 80)
            else:
                error_msg = result.get('error', '未知错误')
                self.bg_logger.error("=" * 80)
                self.bg_logger.error("后台插件数据获取失败")
                self.bg_logger.error("=" * 80)
                self.bg_logger.error(f"  - 错误信息: {error_msg}")
                self.bg_logger.error(f"  - 数据获取耗时: {fetch_time:.3f}秒")
                
                # 计算总耗时
                total_time = time.time() - total_start_time
                self.bg_logger.error(f"  - 总耗时: {total_time:.3f}秒")
                self.bg_logger.error("=" * 80)
            
        except Exception as e:
            total_time = time.time() - total_start_time
            
            logger.error(f"后台获取任务发生异常: {e}")
            logger.exception("详细错误信息")
            
            self.bg_logger.error("=" * 80)
            self.bg_logger.error(f"后台获取任务发生异常: {e}")
            self.bg_logger.error("=" * 80)
            self.bg_logger.exception("详细错误信息")
            self.bg_logger.error(f"总耗时: {total_time:.3f}秒")
            self.bg_logger.error("=" * 80)
        
        finally:
            self.is_running = False
            logger.info("后台插件数据获取任务结束")
            self.bg_logger.info("后台插件数据获取任务结束")
            self.bg_logger.info(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            self.bg_logger.info("")
    
    def stop(self):
        """
        停止后台获取任务
        
        注意：由于使用守护线程，通常不需要手动停止。
        """
        if not self.is_running:
            logger.info("后台获取任务未在运行")
            self.bg_logger.info("后台获取任务未在运行")
            return
        
        self.is_running = False
        
        if self.thread and self.thread.is_alive():
            logger.info("等待后台获取任务结束...")
            self.bg_logger.info("等待后台获取任务结束...")
            self.thread.join(timeout=5)
            
            if self.thread.is_alive():
                logger.warning("后台获取任务未能在5秒内结束")
                self.bg_logger.warning("后台获取任务未能在5秒内结束")
            else:
                logger.info("后台获取任务已结束")
                self.bg_logger.info("后台获取任务已结束")
