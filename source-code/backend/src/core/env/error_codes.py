"""
Error codes and error messages for environment management module.

This module provides error codes and corresponding error messages for
environment management operations.
"""

from typing import Dict


class ErrorCode:
    """Error codes for environment management operations."""
    
    SUCCESS = 0
    PATH_NOT_FOUND = 1001
    INVALID_COMFYUI_INSTALLATION = 1002
    PYTHON_NOT_FOUND = 1003
    VALIDATION_FAILED = 1004
    CONFIG_SAVE_FAILED = 1005
    CONFIG_LOAD_FAILED = 1006
    PERMISSION_DENIED = 1007
    TIMEOUT = 1008
    INVALID_PATH = 1009
    DIALOG_CANCELLED = 1010
    UNKNOWN_ERROR = 9999


# Error message mapping (English)
ERROR_MESSAGES_EN: Dict[int, str] = {
    ErrorCode.SUCCESS: "Success",
    ErrorCode.PATH_NOT_FOUND: "Path not found",
    ErrorCode.INVALID_COMFYUI_INSTALLATION: "Invalid ComfyUI installation",
    ErrorCode.PYTHON_NOT_FOUND: "Python not found",
    ErrorCode.VALIDATION_FAILED: "Validation failed",
    ErrorCode.CONFIG_SAVE_FAILED: "Failed to save configuration",
    ErrorCode.CONFIG_LOAD_FAILED: "Failed to load configuration",
    ErrorCode.PERMISSION_DENIED: "Permission denied",
    ErrorCode.TIMEOUT: "Operation timeout",
    ErrorCode.INVALID_PATH: "Invalid path or path traversal detected",
    ErrorCode.DIALOG_CANCELLED: "Dialog cancelled by user",
    ErrorCode.UNKNOWN_ERROR: "Unknown error",
}

# Error message mapping (Chinese)
ERROR_MESSAGES_ZH: Dict[int, str] = {
    ErrorCode.SUCCESS: "成功",
    ErrorCode.PATH_NOT_FOUND: "路径不存在",
    ErrorCode.INVALID_COMFYUI_INSTALLATION: "无效的 ComfyUI 安装",
    ErrorCode.PYTHON_NOT_FOUND: "未找到 Python",
    ErrorCode.VALIDATION_FAILED: "验证失败",
    ErrorCode.CONFIG_SAVE_FAILED: "保存配置失败",
    ErrorCode.CONFIG_LOAD_FAILED: "加载配置失败",
    ErrorCode.PERMISSION_DENIED: "权限被拒绝",
    ErrorCode.TIMEOUT: "操作超时",
    ErrorCode.INVALID_PATH: "无效路径或检测到路径遍历",
    ErrorCode.DIALOG_CANCELLED: "用户取消了对话框",
    ErrorCode.UNKNOWN_ERROR: "未知错误",
}

# Default to English
ERROR_MESSAGES = ERROR_MESSAGES_EN


def get_error_message(error_code: int, lang: str = "en") -> str:
    """
    Get error message for the given error code.
    
    Args:
        error_code: The error code
        lang: Language code ("en" or "zh")
        
    Returns:
        The corresponding error message
    """
    messages = ERROR_MESSAGES_ZH if lang == "zh" else ERROR_MESSAGES_EN
    return messages.get(error_code, messages[ErrorCode.UNKNOWN_ERROR])
