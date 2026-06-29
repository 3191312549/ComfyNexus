"""
测试日志系统
"""

from src.utils.logger import app_logger as logger

logger.info("测试日志系统 - INFO")
logger.debug("测试日志系统 - DEBUG")
logger.warning("测试日志系统 - WARNING")
logger.error("测试日志系统 - ERROR")

logger.info("日志系统测试完成")
