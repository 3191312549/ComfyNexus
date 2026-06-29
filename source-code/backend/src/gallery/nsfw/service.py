"""
NSFW 分级服务

提供统一的 NSFW 分级功能管理
"""

import logging
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

from backend.src.utils.paths import get_nsfw_model_path
from .classifier import NSFWClassifier

logger = logging.getLogger(__name__)


@dataclass
class ClassifyResult:
    """分级结果"""
    nsfw_score: float
    nsfw_label: str
    tags: list[str]


class NSFWClassifyService:
    """
    NSFW 分级服务
    
    单例模式，管理分类器实例和批量扫描任务
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._classifier: Optional[NSFWClassifier] = None
        self._scan_thread: Optional[threading.Thread] = None
        self._scan_paused = False
        self._scan_cancelled = False
        self._initialized = True
    
    def is_available(self) -> bool:
        """
        检查模型是否可用
        
        Returns:
            模型文件是否存在
        """
        return get_nsfw_model_path().exists()
    
    def get_classifier(self) -> Optional[NSFWClassifier]:
        """
        获取分类器实例（懒加载）
        
        Returns:
            NSFWClassifier 实例，模型不可用时返回 None
        """
        if self._classifier is None and self.is_available():
            try:
                self._classifier = NSFWClassifier(get_nsfw_model_path())
                logger.info("NSFW 分类器加载成功")
            except Exception as e:
                logger.error(f"NSFW 分类器加载失败: {e}")
                return None
        return self._classifier
    
    def classify_image(
        self,
        image_path: str,
        threshold: float = 0.6
    ) -> Optional[ClassifyResult]:
        """
        对单张图片进行分级
        
        Args:
            image_path: 图片文件路径
            threshold: NSFW 阈值，默认 0.6
            
        Returns:
            ClassifyResult 分级结果，失败返回 None
        """
        classifier = self.get_classifier()
        if classifier is None:
            return None
        
        score = classifier.classify(image_path)
        if score is None:
            return None
        
        label = "NSFW" if score >= threshold else "SFW"
        
        return ClassifyResult(
            nsfw_score=score,
            nsfw_label=label,
            tags=[label]
        )
    
    def classify_batch(
        self,
        image_paths: list[str],
        threshold: float = 0.6,
        progress_callback: Optional[Callable[[int, int], None]] = None,
        result_callback: Optional[Callable[[str, ClassifyResult], None]] = None
    ) -> dict[str, ClassifyResult]:
        """
        批量分级图片
        
        Args:
            image_paths: 图片路径列表
            threshold: NSFW 阈值
            progress_callback: 进度回调 (current, total)
            result_callback: 单张结果回调 (path, result)
            
        Returns:
            路径到结果的映射字典
        """
        results = {}
        total = len(image_paths)
        
        for i, path in enumerate(image_paths):
            if self._scan_cancelled:
                logger.info("批量分级已取消")
                break
            
            while self._scan_paused:
                if self._scan_cancelled:
                    break
                threading.Event().wait(0.1)
            
            result = self.classify_image(path, threshold)
            if result:
                results[path] = result
                if result_callback:
                    result_callback(path, result)
            
            if progress_callback:
                progress_callback(i + 1, total)
        
        return results
    
    def start_batch_scan(
        self,
        image_paths: list[str],
        threshold: float,
        progress_callback: Optional[Callable[[int, int], None]] = None,
        result_callback: Optional[Callable[[str, ClassifyResult], None]] = None,
        complete_callback: Optional[Callable[[dict], None]] = None
    ) -> bool:
        """
        启动后台批量扫描
        
        Args:
            image_paths: 图片路径列表
            threshold: NSFW 阈值
            progress_callback: 进度回调
            result_callback: 单张结果回调
            complete_callback: 完成回调
            
        Returns:
            是否成功启动
        """
        if self._scan_thread and self._scan_thread.is_alive():
            logger.warning("已有扫描任务在运行")
            return False
        
        self._scan_paused = False
        self._scan_cancelled = False
        
        def scan_task():
            try:
                results = self.classify_batch(
                    image_paths,
                    threshold,
                    progress_callback,
                    result_callback
                )
                if complete_callback:
                    complete_callback(results)
            except Exception as e:
                logger.error(f"批量扫描异常: {e}")
                if complete_callback:
                    complete_callback({})
        
        self._scan_thread = threading.Thread(target=scan_task, daemon=True)
        self._scan_thread.start()
        return True
    
    def pause_scan(self):
        """暂停扫描"""
        self._scan_paused = True
        logger.info("NSFW 扫描已暂停")
    
    def resume_scan(self):
        """恢复扫描"""
        self._scan_paused = False
        logger.info("NSFW 扫描已恢复")
    
    def cancel_scan(self):
        """取消扫描"""
        self._scan_cancelled = True
        self._scan_paused = False
        logger.info("NSFW 扫描已取消")
    
    def is_scanning(self) -> bool:
        """是否正在扫描"""
        return self._scan_thread is not None and self._scan_thread.is_alive()
    
    def is_paused(self) -> bool:
        """是否已暂停"""
        return self._scan_paused
