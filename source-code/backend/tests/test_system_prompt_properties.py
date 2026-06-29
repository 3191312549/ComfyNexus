"""
系统提示词管理 - 属性测试（Python/Hypothesis）

使用 Hypothesis 库进行属性测试，验证系统提示词管理的核心正确性属性
每个属性测试运行 100 次迭代

Feature: system-prompt-management
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from pathlib import Path
import tempfile
import shutil
from datetime import datetime
from contextlib import contextmanager

from backend.src.core.ai.system_prompt_service import SystemPromptService


# 自定义策略：生成有效的预设名称和内容（排除换行符、回车符和 Unicode 代理对）
valid_name = st.text(
    min_size=1, 
    max_size=50,
    alphabet=st.characters(
        blacklist_characters='\r\n\t',
        blacklist_categories=('Cs',)  # 排除 Unicode 代理对
    )
).filter(lambda s: s.strip())

valid_content = st.text(
    min_size=1, 
    max_size=1000,
    alphabet=st.characters(
        blacklist_characters='\r\n\t',
        blacklist_categories=('Cs',)  # 排除 Unicode 代理对
    )
).filter(lambda s: s.strip())

valid_topic_id = st.text(
    min_size=1, 
    max_size=20,
    alphabet=st.characters(
        blacklist_characters='\r\n\t',
        blacklist_categories=('Cs',)  # 排除 Unicode 代理对
    )
).filter(lambda s: s.strip())


@contextmanager
def temp_service_context():
    """创建临时的 SystemPromptService 实例的上下文管理器"""
    temp_dir = Path(tempfile.mkdtemp())
    service = SystemPromptService(temp_dir)
    try:
        yield service
    finally:
        # 清理临时目录
        shutil.rmtree(temp_dir)


class TestSystemPromptProperties:
    """系统提示词管理属性测试"""
    
    @given(name=valid_name, content=valid_content)
    @settings(max_examples=100)
    def test_property_1_preset_creation_and_retrieval(self, name, content):
        """
        属性 1: 预设创建后可检索
        验证需求: 4.2, 4.3, 4.4
        
        对于任意有效的预设名称和内容，创建预设后应该能够从预设列表中检索到该预设
        """
        with temp_service_context() as temp_service:
            # 创建预设
            preset = temp_service.create_preset(name, content)
            
            # 验证创建成功
            assert preset is not None
            assert preset['name'] == name.strip()
            assert preset['content'] == content.strip()
            
            # 验证可以从列表中检索
            all_presets = temp_service.get_all_presets()
            found = next((p for p in all_presets if p['id'] == preset['id']), None)
            
            assert found is not None
            assert found['name'] == name.strip()
            assert found['content'] == content.strip()
    
    @given(
        old_name=valid_name,
        old_content=valid_content,
        new_name=valid_name,
        new_content=valid_content
    )
    @settings(max_examples=100)
    def test_property_2_preset_update_reflects_changes(
        self, old_name, old_content, new_name, new_content
    ):
        """
        属性 2: 预设更新后反映最新数据
        验证需求: 4.5, 4.6
        
        对于任意现有预设，更新其名称或内容后应该返回更新后的数据
        """
        with temp_service_context() as temp_service:
            # 创建初始预设
            preset = temp_service.create_preset(old_name, old_content)
            preset_id = preset['id']
            
            # 更新预设
            success = temp_service.update_preset(preset_id, new_name, new_content)
            assert success is True
            
            # 验证更新后的数据
            all_presets = temp_service.get_all_presets()
            updated = next((p for p in all_presets if p['id'] == preset_id), None)
            
            assert updated is not None
            assert updated['name'] == new_name.strip()
            assert updated['content'] == new_content.strip()
    
    @given(name=valid_name, content=valid_content)
    @settings(max_examples=100)
    def test_property_3_preset_deletion_removes_from_list(
        self, name, content
    ):
        """
        属性 3: 预设删除后不可检索
        验证需求: 4.7, 4.8
        
        对于任意现有预设，删除后该预设不应该出现在预设列表中
        """
        with temp_service_context() as temp_service:
            # 创建预设
            preset = temp_service.create_preset(name, content)
            preset_id = preset['id']
            
            # 删除预设
            success = temp_service.delete_preset(preset_id)
            assert success is True
            
            # 验证预设不在列表中
            all_presets = temp_service.get_all_presets()
            found = next((p for p in all_presets if p['id'] == preset_id), None)
            assert found is None
    
    @given(
        name=valid_name,
        content=valid_content,
        topic_id=valid_topic_id
    )
    @settings(max_examples=100)
    def test_property_4_deleting_active_preset_clears_reference(
        self, name, content, topic_id
    ):
        """
        属性 4: 删除正在使用的预设会重置选择器
        验证需求: 4.9
        
        对于任意正在被某个对话使用的预设，删除该预设后该对话的激活预设应该被清除
        """
        with temp_service_context() as temp_service:
            # 创建预设
            preset = temp_service.create_preset(name, content)
            preset_id = preset['id']
            
            # 设置为激活预设
            temp_service.set_active_preset(topic_id, preset_id)
            
            # 验证设置成功
            active_id = temp_service.get_active_preset(topic_id)
            assert active_id == preset_id
            
            # 删除预设
            temp_service.delete_preset(preset_id)
            
            # 验证激活预设已被清除
            active_id_after = temp_service.get_active_preset(topic_id)
            assert active_id_after is None
    
    @given(
        topic_id=valid_topic_id,
        name=valid_name,
        content=valid_content
    )
    @settings(max_examples=100)
    def test_property_5_preset_selection_takes_effect_immediately(
        self, topic_id, name, content
    ):
        """
        属性 5: 预设选择后立即生效
        验证需求: 2.3, 2.6
        
        对于任意对话和预设，当用户选择该预设后应该立即生效
        """
        with temp_service_context() as temp_service:
            # 创建预设
            preset = temp_service.create_preset(name, content)
            preset_id = preset['id']
            
            # 设置激活预设
            success = temp_service.set_active_preset(topic_id, preset_id)
            assert success is True
            
            # 验证立即生效
            active_id = temp_service.get_active_preset(topic_id)
            assert active_id == preset_id
    
    @given(
        topic_id=valid_topic_id,
        name=valid_name,
        content=valid_content
    )
    @settings(max_examples=100)
    def test_property_7_get_correct_system_prompt_content(
        self, topic_id, name, content
    ):
        """
        属性 7: 发送消息时应用正确的系统提示词
        验证需求: 7.1, 7.2, 7.3
        
        当选择器选中某个预设时，应该返回该预设的完整内容
        """
        with temp_service_context() as temp_service:
            # 创建预设
            preset = temp_service.create_preset(name, content)
            preset_id = preset['id']
            
            # 设置激活预设
            temp_service.set_active_preset(topic_id, preset_id)
            
            # 获取预设内容
            preset_content = temp_service.get_preset_content(preset_id)
            
            # 验证返回正确的内容
            assert preset_content == content.strip()
    
    @given(name=valid_name, content=valid_content)
    @settings(max_examples=100)
    def test_property_8_data_persistence_round_trip(
        self, name, content
    ):
        """
        属性 8: 数据持久化往返一致性
        验证需求: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
        
        对于任意预设，创建并保存后重新加载应该返回相同的数据
        """
        # 创建临时目录
        temp_dir = Path(tempfile.mkdtemp())
        
        try:
            # 第一个服务实例：创建预设
            service1 = SystemPromptService(temp_dir)
            preset = service1.create_preset(name, content)
            preset_id = preset['id']
            
            # 第二个服务实例：重新加载
            service2 = SystemPromptService(temp_dir)
            all_presets = service2.get_all_presets()
            
            # 验证数据一致
            found = next((p for p in all_presets if p['id'] == preset_id), None)
            assert found is not None
            assert found['name'] == name.strip()
            assert found['content'] == content.strip()
        finally:
            # 清理临时目录
            shutil.rmtree(temp_dir)
    
    @given(
        name=valid_name,
        content1=valid_content,
        content2=valid_content
    )
    @settings(max_examples=100)
    def test_property_9_duplicate_name_validation(
        self, name, content1, content2
    ):
        """
        属性 9: 预设名称唯一性验证
        验证需求: 10.3
        
        对于任意新预设，如果其名称与现有预设重复，创建操作应该失败
        """
        with temp_service_context() as temp_service:
            # 创建第一个预设
            preset1 = temp_service.create_preset(name, content1)
            assert preset1 is not None
            
            # 尝试创建重名预设
            with pytest.raises(ValueError, match="预设名称已存在"):
                temp_service.create_preset(name, content2)
    
    @given(content=valid_content)
    @settings(max_examples=100)
    def test_property_10_empty_name_validation(self, content):
        """
        属性 10: 必填字段验证 - 名称
        验证需求: 10.1, 10.2, 6.3
        
        对于任意预设创建操作，如果名称为空，操作应该失败
        """
        with temp_service_context() as temp_service:
            with pytest.raises(ValueError, match="预设名称不能为空"):
                temp_service.create_preset("", content)
            
            with pytest.raises(ValueError, match="预设名称不能为空"):
                temp_service.create_preset("   ", content)
    
    @given(name=valid_name)
    @settings(max_examples=100)
    def test_property_10_empty_content_validation(self, name):
        """
        属性 10: 必填字段验证 - 内容
        验证需求: 10.1, 10.2, 6.3
        
        对于任意预设创建操作，如果内容为空，操作应该失败
        """
        with temp_service_context() as temp_service:
            with pytest.raises(ValueError, match="预设内容不能为空"):
                temp_service.create_preset(name, "")
            
            with pytest.raises(ValueError, match="预设内容不能为空"):
                temp_service.create_preset(name, "   ")
    
    def test_property_11_default_preset_initialization(self):
        """
        属性 11: 首次启动初始化默认预设
        验证需求: 11.1, 11.2, 11.3, 11.4, 11.5
        
        当应用首次启动且没有任何预设时，系统应该自动创建默认预设
        """
        # 创建临时目录
        temp_dir = Path(tempfile.mkdtemp())
        
        try:
            service = SystemPromptService(temp_dir)
            
            # 验证初始没有预设
            assert len(service.get_all_presets()) == 0
            
            # 初始化默认预设
            service.initialize_default_preset()
            
            # 验证创建了默认预设
            all_presets = service.get_all_presets()
            assert len(all_presets) == 1
            assert all_presets[0]['name'] == 'ComfyUI专家'
            assert 'ComfyUI' in all_presets[0]['content']
            
            # 再次调用不应该创建新预设
            service.initialize_default_preset()
            assert len(service.get_all_presets()) == 1
        finally:
            # 清理临时目录
            shutil.rmtree(temp_dir)
    
    @given(
        presets=st.lists(
            st.tuples(valid_name, valid_content),
            min_size=2,
            max_size=10,
            unique_by=lambda x: x[0].strip()  # 确保名称唯一
        )
    )
    @settings(max_examples=100)
    def test_property_12_preset_list_consistency(self, presets):
        """
        属性 12: 预设列表排序一致性
        验证需求: 2.5
        
        对于任意预设列表，显示时应该按照创建时间倒序排列
        """
        with temp_service_context() as temp_service:
            # 创建多个预设
            created_presets = []
            for name, content in presets:
                preset = temp_service.create_preset(name, content)
                created_presets.append(preset)
            
            # 获取所有预设
            all_presets = temp_service.get_all_presets()
            
            # 验证数量一致
            assert len(all_presets) == len(created_presets)
            
            # 验证所有预设都存在
            for created in created_presets:
                found = next((p for p in all_presets if p['id'] == created['id']), None)
                assert found is not None
                assert found['name'] == created['name']
                assert found['content'] == created['content']
