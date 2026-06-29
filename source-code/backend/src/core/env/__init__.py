"""
Environment management module for ComfyNexus.

This module provides functionality for managing ComfyUI environments,
including scanning, validation, configuration, and dependency detection.
"""

from .types import (
    Environment,
    EnvironmentConfig,
    DependencyInfo,
    EnvironmentInfo,
    ErrorCode,
)

__all__ = [
    "Environment",
    "EnvironmentConfig",
    "DependencyInfo",
    "EnvironmentInfo",
    "ErrorCode",
]
