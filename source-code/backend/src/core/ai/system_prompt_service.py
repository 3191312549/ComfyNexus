"""
系统提示词管理服务

负责系统提示词预设的增删改查操作和数据持久化。
"""

import json
import uuid
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime


class SystemPromptService:
    """
    系统提示词管理服务
    
    负责系统提示词预设的持久化和管理。
    """
    
    # 默认预设内容
    DEFAULT_PRESET_NAME = "ComfyUI专家"
    DEFAULT_PRESET_CONTENT = """# Role: ComfyUI 资深技术架构师 & 生成式 AI 专家

## Profile

你不仅是一位精通 ComfyUI 操作的艺术家，更是一位深谙 Stable Diffusion 底层原理、PyTorch 框架及 Python 编程的资深开发工程师。你熟悉 ComfyUI 的核心架构、执行队列机制以及各类自定义节点（Custom Nodes）的源码实现。

## Core Competencies

1.  **底层排错**：精通 Python 报错堆栈分析，擅长解决环境配置（CUDA, PyTorch, xformers）、依赖冲突、显存溢出（OOM）及模型加载失败等问题。

2.  **工作流构建**：能够设计从 Text-to-Image 到复杂的 AnimateDiff、ControlNet 堆叠及 upscale 工作流，并能解释数据流（LATENT, IMAGE, CONDITIONING）的传递逻辑。

3.  **节点与模型**：深入理解 Checkpoint, LoRA, VAE, CLIP 的数学原理，并能指导用户调整 KSampler（采样器）、Scheduler（调度器）及 CFG Scale 等关键参数。

4.  **信息检索**：具备强大的在线搜索能力，能实时获取 Github 上最新的自定义节点更新信息及 HuggingFace 上的模型动态。

## Operational Rules

当用户向你提问时，请遵循以下处理流程：

1.  **问题定位**：

    *   若是**报错**，首先要求用户提供终端（Console）红字报错信息或 `comfyui.log`。

    *   若是**配置**，确认用户显卡型号、显存大小及操作系统。

2.  **信息增强 (Search & Retrieval)**：

    *   对于未知的报错代码或生僻的自定义节点，**必须**调用搜索工具查询 Github Issues 或 Civitai/Reddit 讨论。

    *   整合搜索结果，剔除过时信息，提供针对当前版本的解决方案。

3.  **解决方案输出**：

    *   **代码级修复**：提供具体的 pip install 命令、git pull 指令或 config 修改方案。

    *   **工作流指导**：用清晰的逻辑描述节点连接顺序（例如：Load Checkpoint -> CLIP Text Encode -> KSampler -> VAE Decode）。

    *   **原理教学**：在解决问题后，简要解释"为什么会这样"，帮助用户建立认知。

## Tone

专业、理性、耐心、技术导向，但能用通俗易懂的语言解释复杂的图形学术语。

## Initialization

我已经准备好协助您解决 ComfyUI 相关的一切问题。请告诉我您遇到了什么错误，或者需要设计什么样的工作流？
"""
    
    def __init__(self, data_dir: Path):
        """
        初始化服务
        
        Args:
            data_dir: 数据存储目录
        """
        self.data_dir = Path(data_dir)
        self.presets_file = self.data_dir / "system_prompts.json"
        self.active_presets_file = self.data_dir / "active_system_prompts.json"
        self._ensure_files_exist()
    
    def _ensure_files_exist(self) -> None:
        """确保数据文件存在，不存在则创建"""
        # 确保数据目录存在
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 确保预设文件存在
        if not self.presets_file.exists():
            self._save_presets([])
        
        # 确保激活预设文件存在
        if not self.active_presets_file.exists():
            self._save_active_presets({})
    
    def _load_presets(self) -> List[Dict]:
        """
        从JSON文件加载预设列表
        
        Returns:
            List[Dict]: 预设列表
        """
        try:
            with open(self.presets_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('presets', [])
        except json.JSONDecodeError as e:
            print(f'JSON解析错误: {e}')
            return []
        except IOError as e:
            print(f'文件读取错误: {e}')
            return []
    
    def _save_presets(self, presets: List[Dict]) -> None:
        """
        保存预设列表到JSON文件
        
        Args:
            presets: 预设列表
        """
        try:
            data = {'presets': presets}
            with open(self.presets_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except IOError as e:
            print(f'文件写入错误: {e}')
            raise
    
    def _load_active_presets(self) -> Dict[str, Optional[str]]:
        """
        加载激活预设映射
        
        Returns:
            Dict[str, Optional[str]]: 对话ID到预设ID的映射
        """
        try:
            with open(self.active_presets_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            print(f'JSON解析错误: {e}')
            return {}
        except IOError as e:
            print(f'文件读取错误: {e}')
            return {}
    
    def _save_active_presets(self, active_presets: Dict[str, Optional[str]]) -> None:
        """
        保存激活预设映射
        
        Args:
            active_presets: 对话ID到预设ID的映射
        """
        try:
            with open(self.active_presets_file, 'w', encoding='utf-8') as f:
                json.dump(active_presets, f, ensure_ascii=False, indent=2)
        except IOError as e:
            print(f'文件写入错误: {e}')
            raise
    
    def get_all_presets(self) -> List[Dict]:
        """
        获取所有预设
        
        Returns:
            List[Dict]: 预设列表
        """
        return self._load_presets()
    
    def create_preset(self, name: str, content: str) -> Dict:
        """
        创建新预设
        
        Args:
            name: 预设名称
            content: 提示词内容
            
        Returns:
            Dict: 新创建的预设
            
        Raises:
            ValueError: 名称为空、内容为空或名称重复时抛出
        """
        # 去除首尾空白字符
        name = name.strip()
        content = content.strip()
        
        # 验证输入
        if not name:
            raise ValueError("预设名称不能为空")
        
        if not content:
            raise ValueError("预设内容不能为空")
        
        # 加载现有预设
        presets = self._load_presets()
        
        # 检查名称是否重复
        for preset in presets:
            if preset['name'] == name:
                raise ValueError("预设名称已存在")
        
        # 创建新预设
        now = datetime.now().isoformat()
        new_preset = {
            'id': str(uuid.uuid4()),
            'name': name,
            'content': content,
            'created_at': now,
            'updated_at': now
        }
        
        # 添加到列表
        presets.append(new_preset)
        
        # 保存
        self._save_presets(presets)
        
        return new_preset
    
    def update_preset(
        self, 
        preset_id: str, 
        name: Optional[str] = None, 
        content: Optional[str] = None
    ) -> bool:
        """
        更新预设
        
        Args:
            preset_id: 预设ID
            name: 新名称（可选）
            content: 新内容（可选）
            
        Returns:
            bool: 更新是否成功
            
        Raises:
            ValueError: 验证失败时抛出
        """
        # 验证至少有一个字段要更新
        if name is None and content is None:
            raise ValueError("至少需要提供一个更新字段")
        
        # 去除首尾空白字符并验证输入
        if name is not None:
            name = name.strip()
            if not name:
                raise ValueError("预设名称不能为空")
        
        if content is not None:
            content = content.strip()
            if not content:
                raise ValueError("预设内容不能为空")
        
        # 加载现有预设
        presets = self._load_presets()
        
        # 查找要更新的预设
        preset_found = False
        for preset in presets:
            if preset['id'] == preset_id:
                preset_found = True
                
                # 如果更新名称，检查是否重复
                if name is not None and name != preset['name']:
                    for other_preset in presets:
                        if other_preset['id'] != preset_id and other_preset['name'] == name:
                            raise ValueError("预设名称已存在")
                    preset['name'] = name
                
                # 更新内容
                if content is not None:
                    preset['content'] = content
                
                # 更新时间戳
                preset['updated_at'] = datetime.now().isoformat()
                break
        
        if not preset_found:
            return False
        
        # 保存
        self._save_presets(presets)
        
        return True
    
    def delete_preset(self, preset_id: str) -> bool:
        """
        删除预设
        
        Args:
            preset_id: 预设ID
            
        Returns:
            bool: 删除是否成功
        """
        # 加载现有预设
        presets = self._load_presets()
        
        # 查找并删除预设
        original_length = len(presets)
        presets = [p for p in presets if p['id'] != preset_id]
        
        if len(presets) == original_length:
            return False
        
        # 保存
        self._save_presets(presets)
        
        # 清除使用该预设的激活记录
        active_presets = self._load_active_presets()
        topics_to_clear = [
            topic_id for topic_id, active_id in active_presets.items()
            if active_id == preset_id
        ]
        
        for topic_id in topics_to_clear:
            active_presets[topic_id] = None
        
        if topics_to_clear:
            self._save_active_presets(active_presets)
        
        return True
    
    def set_active_preset(self, topic_id: str, preset_id: Optional[str]) -> bool:
        """
        设置对话的激活预设
        
        Args:
            topic_id: 对话ID
            preset_id: 预设ID（None表示"无"）
            
        Returns:
            bool: 设置是否成功
        """
        try:
            # 如果preset_id不为None，验证预设是否存在
            if preset_id is not None:
                presets = self._load_presets()
                preset_exists = any(p['id'] == preset_id for p in presets)
                if not preset_exists:
                    return False
            
            # 加载激活预设映射
            active_presets = self._load_active_presets()
            
            # 设置激活预设
            active_presets[topic_id] = preset_id
            
            # 保存
            self._save_active_presets(active_presets)
            
            return True
        except Exception as e:
            print(f'设置激活预设失败: {e}')
            return False
    
    def get_active_preset(self, topic_id: str) -> Optional[str]:
        """
        获取对话的激活预设ID
        
        Args:
            topic_id: 对话ID
            
        Returns:
            Optional[str]: 预设ID，None表示"无"
        """
        active_presets = self._load_active_presets()
        return active_presets.get(topic_id)
    
    def get_preset_content(self, preset_id: str) -> Optional[str]:
        """
        获取预设内容
        
        Args:
            preset_id: 预设ID
            
        Returns:
            Optional[str]: 预设内容，不存在则返回None
        """
        presets = self._load_presets()
        for preset in presets:
            if preset['id'] == preset_id:
                return preset['content']
        return None
    
    def initialize_default_preset(self) -> None:
        """
        初始化默认预设（仅在首次启动时）
        
        如果没有任何预设，创建"ComfyUI专家"默认预设。
        """
        presets = self._load_presets()
        
        # 如果已有预设，不创建默认预设
        if presets:
            return
        
        # 创建默认预设
        try:
            self.create_preset(self.DEFAULT_PRESET_NAME, self.DEFAULT_PRESET_CONTENT)
            print(f'已创建默认预设: {self.DEFAULT_PRESET_NAME}')
        except Exception as e:
            print(f'创建默认预设失败: {e}')
