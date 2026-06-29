"""
pytest 配置和共享 fixtures

此文件包含所有测试共享的 fixtures 和配置。
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any


@pytest.fixture
def tmp_test_dir(tmp_path: Path) -> Path:
    """
    提供临时测试目录
    
    此 fixture 创建一个临时目录，测试结束后自动清理。
    
    Returns:
        Path: 临时目录路径
        
    Example:
        def test_file_operations(tmp_test_dir):
            test_file = tmp_test_dir / "test.txt"
            test_file.write_text("test content")
            assert test_file.exists()
    """
    return tmp_path


@pytest.fixture
def mock_config() -> Dict[str, Any]:
    """
    提供模拟配置对象
    
    Returns:
        dict: 模拟的配置字典
        
    Example:
        def test_config_loading(mock_config):
            assert "environments" in mock_config
            assert isinstance(mock_config["environments"], list)
    """
    return {
        "environments": [],
        "current_environment": None,
        "settings": {
            "theme": "dark",
            "language": "zh-CN",
        },
        "paths": {
            "config_dir": "/path/to/config",
            "data_dir": "/path/to/data",
        }
    }


@pytest.fixture
def sample_env_data() -> Dict[str, Any]:
    """
    提供示例环境数据
    
    Returns:
        dict: 示例环境配置数据
        
    Example:
        def test_environment_creation(sample_env_data):
            env = Environment(**sample_env_data)
            assert env.name == "test_env"
    """
    return {
        "name": "test_env",
        "alias": "测试环境",
        "path": "/path/to/comfyui",
        "python_path": "/path/to/python",
        "version": "1.0.0",
        "config": {
            "port": 8188,
            "host": "127.0.0.1",
        },
        "dependencies": []
    }


@pytest.fixture(autouse=True)
def cleanup():
    """
    自动清理测试资源
    
    此 fixture 在每个测试后自动运行，用于清理测试产生的资源。
    使用 autouse=True 使其自动应用于所有测试。
    
    Example:
        # 不需要显式使用，自动应用
        def test_something():
            # 测试代码
            pass
        # 测试结束后自动清理
    """
    yield
    # 测试后清理逻辑
    # 例如：关闭数据库连接、删除临时文件等


@pytest.fixture
def mock_environment_manager(tmp_test_dir, mock_config):
    """
    提供模拟的环境管理器
    
    Args:
        tmp_test_dir: 临时目录 fixture
        mock_config: 模拟配置 fixture
        
    Returns:
        EnvironmentManager: 模拟的环境管理器实例
        
    Example:
        def test_add_environment(mock_environment_manager):
            result = mock_environment_manager.add_environment("test", "/path")
            assert result is True
    """
    from unittest.mock import MagicMock
    
    manager = MagicMock()
    manager.config_dir = tmp_test_dir
    manager.config = mock_config
    manager.environments = []
    
    return manager


# 配置 pytest 插件
def pytest_configure(config):
    """pytest 配置钩子"""
    # 注册自定义标记
    config.addinivalue_line(
        "markers", "property: Property-based tests using hypothesis"
    )
    config.addinivalue_line(
        "markers", "unit: Unit tests"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests"
    )
    config.addinivalue_line(
        "markers", "manual: Manual tests requiring human intervention"
    )
    config.addinivalue_line(
        "markers", "diagnostic: Diagnostic tests for troubleshooting"
    )
    config.addinivalue_line(
        "markers", "slow: Slow running tests"
    )


def pytest_collection_modifyitems(config, items):
    """
    修改测试收集
    
    根据测试文件路径自动添加标记
    """
    for item in items:
        # 根据路径添加标记
        if "properties" in str(item.fspath):
            item.add_marker(pytest.mark.property)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "manual" in str(item.fspath):
            item.add_marker(pytest.mark.manual)
        elif "diagnostic" in str(item.fspath):
            item.add_marker(pytest.mark.diagnostic)
        elif "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
