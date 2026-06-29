"""
异步安装补丁

将 install_plugin 方法改为异步执行，立即返回 task_id
"""

import threading
from pathlib import Path
from typing import Dict, Callable, Optional
import uuid
from datetime import datetime

from .models import InstallTask, InstallStage, InstallStatus
from .logger import MarketplaceLogger
from .constants import ERROR_GIT_CLONE_FAILED


def install_plugin_async(
    engine,
    github_url: str,
    target_dir: Path,
    python_path: Path,
    auto_install_deps: bool,
    progress_callback: Optional[Callable[[Dict], None]] = None
) -> Dict:
    """
    异步安装插件（立即返回 task_id）
    
    Args:
        engine: InstallationEngine 实例
        github_url: GitHub 仓库地址
        target_dir: 目标目录
        python_path: Python 解释器路径
        auto_install_deps: 是否自动安装依赖
        progress_callback: 进度回调函数
        
    Returns:
        {
            'success': True,
            'task_id': str,
            'message': str,
            'log_path': str
        }
    """
    # 生成唯一的任务 ID
    task_id = str(uuid.uuid4())
    
    # 从 URL 提取插件名称
    plugin_name = github_url.rstrip('/').split('/')[-1]
    if plugin_name.endswith('.git'):
        plugin_name = plugin_name[:-4]
    
    # 创建日志文件
    log_file = MarketplaceLogger.create_install_log_file(plugin_name)
    
    # 创建安装任务
    task = InstallTask(
        task_id=task_id,
        plugin_name=plugin_name,
        github_url=github_url,
        stage=InstallStage.CLONING,
        progress=0.0,
        log_path=str(log_file),
        started_at=datetime.now()
    )
    
    # 保存任务到活动任务列表
    engine.active_tasks[task_id] = task
    
    engine.logger.info(f"[异步] 开始安装插件: {plugin_name} (任务 ID: {task_id})")
    MarketplaceLogger.write_to_install_log(
        log_file,
        f"开始安装插件: {plugin_name}",
        "INFO"
    )
    MarketplaceLogger.write_to_install_log(
        log_file,
        f"任务 ID: {task_id}",
        "INFO"
    )
    
    # 定义后台执行的安装函数
    def _execute_installation():
        """在后台线程中执行安装"""
        try:
            _execute_install_workflow(
                engine=engine,
                task=task,
                github_url=github_url,
                target_dir=target_dir,
                python_path=python_path,
                auto_install_deps=auto_install_deps,
                log_file=log_file,
                progress_callback=progress_callback
            )
        except Exception as e:
            error_msg = f"安装过程中发生异常: {str(e)}"
            engine.logger.exception(error_msg)
            MarketplaceLogger.write_to_install_log(log_file, error_msg, "ERROR")
            MarketplaceLogger.write_exception(log_file, e)
            
            task.mark_failed(error_msg)
            if progress_callback:
                progress_callback(task.to_dict())
    
    # 在后台线程中启动安装
    install_thread = threading.Thread(
        target=_execute_installation,
        name=f"InstallPlugin-{plugin_name}",
        daemon=True
    )
    install_thread.start()
    
    # 立即返回 task_id
    return {
        'success': True,
        'task_id': task_id,
        'message': f'安装任务已启动: {plugin_name}',
        'log_path': str(log_file)
    }


def _execute_install_workflow(
    engine,
    task: InstallTask,
    github_url: str,
    target_dir: Path,
    python_path: Path,
    auto_install_deps: bool,
    log_file: Path,
    progress_callback: Optional[Callable[[Dict], None]] = None
) -> None:
    """
    执行安装工作流（在后台线程中运行）
    """
    task_id = task.task_id
    plugin_name = task.plugin_name
    
    # 初始化进度范围
    if auto_install_deps:
        progress_ranges = {
            InstallStage.CLONING: (0.0, 40.0),
            InstallStage.CHECKING_DEPS: (40.0, 50.0),
            InstallStage.INSTALLING_DEPS: (50.0, 100.0)
        }
    else:
        progress_ranges = {
            InstallStage.CLONING: (0.0, 100.0)
        }
    
    # 阶段 1：克隆仓库
    # 明确清空 current_package，避免显示上一阶段的残留信息
    task.current_package = ""
    task.update_progress(InstallStage.CLONING, 0.0, "")
    if progress_callback:
        progress_callback(task.to_dict())
    
    def clone_progress(percent: float):
        start, end = progress_ranges[InstallStage.CLONING]
        mapped_progress = start + (percent / 100.0) * (end - start)
        # 在克隆阶段，明确保持 current_package 为空
        task.current_package = ""
        task.update_progress(InstallStage.CLONING, mapped_progress, "")
        if progress_callback:
            progress_callback(task.to_dict())
    
    clone_success = engine._clone_repository(
        github_url,
        target_dir,
        log_file,
        task_id,
        clone_progress
    )
    
    if not clone_success:
        task.mark_failed(ERROR_GIT_CLONE_FAILED)
        if progress_callback:
            progress_callback(task.to_dict())
        return
    
    # 克隆成功，明确通知前端克隆阶段完成（进度 100%）
    start, end = progress_ranges[InstallStage.CLONING]
    task.current_package = ""
    task.update_progress(InstallStage.CLONING, end, "")
    if progress_callback:
        progress_callback(task.to_dict())
    
    engine.logger.info(f"[异步] 克隆阶段完成，进度: {end}%")
    
    # 如果不自动安装依赖，直接成功
    if not auto_install_deps:
        task.mark_success()
        if progress_callback:
            progress_callback(task.to_dict())
        engine.logger.info(f"插件 {plugin_name} 安装成功（已跳过依赖安装）")
        return
    
    # 短暂延迟，确保前端有时间处理克隆完成的状态
    import time
    time.sleep(0.1)
    
    # 阶段 2：检查依赖
    engine.logger.info(f"[异步] 开始检查依赖")
    task.update_progress(InstallStage.CHECKING_DEPS, 40.0)
    if progress_callback:
        progress_callback(task.to_dict())
    
    plugin_dir = target_dir / plugin_name
    requirements_file = plugin_dir / "requirements.txt"
    has_requirements = requirements_file.exists()
    
    if not has_requirements:
        task.update_progress(InstallStage.CHECKING_DEPS, 100.0)
        task.mark_success()
        if progress_callback:
            progress_callback(task.to_dict())
        engine.logger.info(f"插件 {plugin_name} 安装成功（无依赖文件）")
        return
    
    # 短暂延迟，确保前端有时间处理检查依赖完成的状态
    time.sleep(0.1)
    
    # 阶段 3：安装依赖
    engine.logger.info(f"[异步] 开始安装依赖")
    # 明确清空 current_package，避免显示上一阶段的残留信息
    task.current_package = ""
    task.update_progress(InstallStage.INSTALLING_DEPS, 50.0, "")
    if progress_callback:
        progress_callback(task.to_dict())
    
    def deps_progress(package: str, percent: float):
        start, end = progress_ranges[InstallStage.INSTALLING_DEPS]
        mapped_progress = start + (percent / 100.0) * (end - start)
        task.update_progress(InstallStage.INSTALLING_DEPS, mapped_progress, package)
        if progress_callback:
            progress_callback(task.to_dict())
    
    deps_success = engine._install_dependencies(
        plugin_dir,
        python_path,
        log_file,
        task_id,
        deps_progress
    )
    
    if not deps_success:
        task.mark_failed("依赖安装失败，但插件已克隆")
        if progress_callback:
            progress_callback(task.to_dict())
        return
    
    # 安装成功
    task.mark_success()
    if progress_callback:
        progress_callback(task.to_dict())
    engine.logger.info(f"插件 {plugin_name} 安装成功")
