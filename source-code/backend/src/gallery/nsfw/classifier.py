"""
NSFW 图片分级推理引擎

基于 ONNX 模型进行图片 NSFW 内容检测
"""

import logging
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class NSFWClassifier:
    """
    NSFW 图片分级推理引擎
    
    使用 ViT Tiny ONNX 模型进行图片内容分级
    """
    
    INPUT_SIZE = (384, 384)
    MEAN = np.array([0.5, 0.5, 0.5], dtype=np.float32)
    STD = np.array([0.5, 0.5, 0.5], dtype=np.float32)
    
    def __init__(self, model_path: Path):
        """
        初始化推理引擎
        
        Args:
            model_path: ONNX 模型文件路径
        """
        import onnxruntime as ort
        
        providers = [
            (
                'CUDAExecutionProvider',
                {
                    'device_id': 0,
                    'arena_extend_strategy': 'kSameAsRequested',
                    'gpu_mem_limit': 512 * 1024 * 1024,
                    'cudnn_conv_algo_search': 'EXHAUSTIVE',
                }
            ),
            'CPUExecutionProvider'
        ]
        
        self.session = ort.InferenceSession(str(model_path), providers=providers)
        self.input_name = self.session.get_inputs()[0].name
        
        actual_providers = self.session.get_providers()
        logger.info(f"NSFW 推理引擎初始化完成，使用 Provider: {actual_providers}")
    
    def classify(self, image_path: str) -> Optional[float]:
        """
        对单张图片进行 NSFW 分级
        
        Args:
            image_path: 图片文件路径
            
        Returns:
            NSFW 分数 (0.0-1.0)，失败返回 None
        """
        try:
            img_data = self._preprocess(image_path)
            outputs = self.session.run(None, {self.input_name: img_data})
            logits = outputs[0][0]
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)
            return float(probs[0])
        except Exception as e:
            logger.debug(f"图片分级失败 {image_path}: {e}")
            return None
    
    def _preprocess(self, img_path: str) -> np.ndarray:
        """
        图片预处理
        
        Args:
            img_path: 图片文件路径
            
        Returns:
            预处理后的图片数据 (1, 3, 384, 384)
        """
        with Image.open(img_path) as img:
            img = img.convert("RGB").resize(self.INPUT_SIZE, Image.Resampling.BICUBIC)
            img_data = np.array(img).astype(np.float32) / 255.0
            img_data = (img_data - self.MEAN) / self.STD
            img_data = np.transpose(img_data, (2, 0, 1))[np.newaxis, :]
            return img_data.astype(np.float32)
