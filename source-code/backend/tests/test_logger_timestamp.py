"""
测试日志文件名时间戳格式
"""

from datetime import datetime
from pathlib import Path
import sys

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from src.utils.logger import get_log_filename, LOG_FILE_BASE_NAME

# 测试生成日志文件名
test_dir = Path("test_logs")
test_dir.mkdir(exist_ok=True)

# 生成文件名
log_file = get_log_filename(test_dir)

print(f"生成的日志文件名: {log_file.name}")
print(f"预期格式: {LOG_FILE_BASE_NAME}_YYYYMMDD_HHMMSS.log")

# 验证格式
import re
pattern = rf'^{LOG_FILE_BASE_NAME}_\d{{8}}_\d{{6}}\.log$'
if re.match(pattern, log_file.name):
    print("✅ 文件名格式正确")
else:
    print("❌ 文件名格式错误")

# 清理测试目录
import shutil
shutil.rmtree(test_dir)
