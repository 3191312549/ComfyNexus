/**
 * useSystemPromptStore 单元测试
 * 
 * 测试系统提示词管理状态的各项功能
 * 验证需求：2.1-2.7, 4.1-4.9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSystemPromptStore, SystemPromptPreset } from '../useSystemPromptStore'

// Mock pywebview API
const mockAPI = {
  ai_get_system_prompts: vi.fn(),
  ai_create_system_prompt: vi.fn(),
  ai_update_system_prompt: vi.fn(),
  ai_delete_system_prompt: vi.fn(),
  ai_set_active_system_prompt: vi.fn(),
  ai_get_active_system_prompt: vi.fn()
}

// 设置全局 window.pywebview
beforeEach(() => {
  // 重置所有 mock
  vi.clearAllMocks()
  
  // 重置 store 状态
  const { result } = renderHook(() => useSystemPromptStore())
  act(() => {
    result.current.presets = []
    result.current.activePresets = new Map()
    result.current.isLoading = false
    result.current.error = null
  })
  
  // 设置 pywebview mock（模拟生产环境）
  ;(global as any).window = {
    pywebview: {
      api: mockAPI
    }
  }
})

describe('useSystemPromptStore', () => {
  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      expect(result.current.presets).toEqual([])
      expect(result.current.activePresets).toBeInstanceOf(Map)
      expect(result.current.activePresets.size).toBe(0)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })
  
  describe('loadPresets - 验证需求 4.1, 8.1', () => {
    it('应该能够加载预设列表', async () => {
      const mockPresets: SystemPromptPreset[] = [
        {
          id: 'preset_1',
          name: 'ComfyUI专家',
          content: '你是ComfyUI专家...',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'preset_2',
          name: '代码助手',
          content: '你是代码助手...',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ]
      
      mockAPI.ai_get_system_prompts.mockResolvedValue({
        success: true,
        presets: mockPresets
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      await act(async () => {
        await result.current.loadPresets()
      })
      
      expect(mockAPI.ai_get_system_prompts).toHaveBeenCalled()
      expect(result.current.presets).toEqual(mockPresets)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
    
    it('加载失败时应该设置错误信息', async () => {
      mockAPI.ai_get_system_prompts.mockResolvedValue({
        success: false,
        error_message: '加载失败'
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      await act(async () => {
        await result.current.loadPresets()
      })
      
      expect(result.current.presets).toEqual([])
      expect(result.current.error).toBe('加载失败')
      expect(result.current.isLoading).toBe(false)
    })
    
    it('API 异常时应该设置错误信息', async () => {
      mockAPI.ai_get_system_prompts.mockRejectedValue(new Error('网络错误'))
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      await act(async () => {
        await result.current.loadPresets()
      })
      
      expect(result.current.error).toContain('加载预设列表异常')
      expect(result.current.isLoading).toBe(false)
    })
  })
  
  describe('createPreset - 验证需求 4.2, 4.3, 10.1, 10.2, 10.3', () => {
    it('应该能够创建新预设', async () => {
      const newPreset: SystemPromptPreset = {
        id: 'preset_new',
        name: '测试预设',
        content: '测试内容',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z'
      }
      
      mockAPI.ai_create_system_prompt.mockResolvedValue({
        success: true,
        preset: newPreset
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      let createdPreset: SystemPromptPreset | null = null
      await act(async () => {
        createdPreset = await result.current.createPreset({
          name: '测试预设',
          content: '测试内容'
        })
      })
      
      expect(mockAPI.ai_create_system_prompt).toHaveBeenCalledWith('测试预设', '测试内容')
      expect(createdPreset).toEqual(newPreset)
      expect(result.current.presets).toContainEqual(newPreset)
      expect(result.current.error).toBeNull()
    })
    
    it('应该自动去除名称和内容的首尾空格', async () => {
      const newPreset: SystemPromptPreset = {
        id: 'preset_new',
        name: '测试预设',
        content: '测试内容',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z'
      }
      
      mockAPI.ai_create_system_prompt.mockResolvedValue({
        success: true,
        preset: newPreset
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      await act(async () => {
        await result.current.createPreset({
          name: '  测试预设  ',
          content: '  测试内容  '
        })
      })
      
      expect(mockAPI.ai_create_system_prompt).toHaveBeenCalledWith('测试预设', '测试内容')
    })
    
    it('名称为空时应该返回 null 并设置错误', async () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      let createdPreset: SystemPromptPreset | null = null
      await act(async () => {
        createdPreset = await result.current.createPreset({
          name: '',
          content: '测试内容'
        })
      })
      
      expect(createdPreset).toBeNull()
      expect(result.current.error).toBe('预设名称不能为空')
      expect(mockAPI.ai_create_system_prompt).not.toHaveBeenCalled()
    })
    
    it('名称为纯空格时应该返回 null 并设置错误', async () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      let createdPreset: SystemPromptPreset | null = null
      await act(async () => {
        createdPreset = await result.current.createPreset({
          name: '   ',
          content: '测试内容'
        })
      })
      
      expect(createdPreset).toBeNull()
      expect(result.current.error).toBe('预设名称不能为空')
      expect(mockAPI.ai_create_system_prompt).not.toHaveBeenCalled()
    })
    
    it('内容为空时应该返回 null 并设置错误', async () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      let createdPreset: SystemPromptPreset | null = null
      await act(async () => {
        createdPreset = await result.current.createPreset({
          name: '测试预设',
          content: ''
        })
      })
      
      expect(createdPreset).toBeNull()
      expect(result.current.error).toBe('预设内容不能为空')
      expect(mockAPI.ai_create_system_prompt).not.toHaveBeenCalled()
    })
    
    it('内容为纯空格时应该返回 null 并设置错误', async () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      let createdPreset: SystemPromptPreset | null = null
      await act(async () => {
        createdPreset = await result.current.createPreset({
          name: '测试预设',
          content: '   '
        })
      })
      
      expect(createdPreset).toBeNull()
      expect(result.current.error).toBe('预设内容不能为空')
      expect(mockAPI.ai_create_system_prompt).not.toHaveBeenCalled()
    })
    
    it('名称重复时应该返回 null 并设置错误', async () => {
      const existingPresets: SystemPromptPreset[] = [
        {
          id: 'preset_1',
          name: '已存在的预设',
          content: '内容',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      act(() => {
        result.current.presets = existingPresets
      })
      
      let createdPreset: SystemPromptPreset | null = null
      await act(async () => {
        createdPreset = await result.current.createPreset({
          name: '已存在的预设',
          content: '新内容'
        })
      })
      
      expect(createdPreset).toBeNull()
      expect(result.current.error).toBe('预设名称已存在')
      expect(mockAPI.ai_create_system_prompt).not.toHaveBeenCalled()
    })
    
    it('创建失败时应该返回 null 并设置错误', async () => {
      mockAPI.ai_create_system_prompt.mockResolvedValue({
        success: false,
        error_message: '创建失败'
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      let createdPreset: SystemPromptPreset | null = null
      await act(async () => {
        createdPreset = await result.current.createPreset({
          name: '测试预设',
          content: '测试内容'
        })
      })
      
      expect(createdPreset).toBeNull()
      expect(result.current.error).toBe('创建失败')
    })
  })
  
  describe('updatePreset - 验证需求 4.5, 4.6, 10.1, 10.2', () => {
    it('应该能够更新预设', async () => {
      const existingPresets: SystemPromptPreset[] = [
        {
          id: 'preset_1',
          name: '旧名称',
          content: '旧内容',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      const updatedPresets: SystemPromptPreset[] = [
        {
          id: 'preset_1',
          name: '新名称',
          content: '新内容',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ]
      
      mockAPI.ai_update_system_prompt.mockResolvedValue({
        success: true
      })
      
      mockAPI.ai_get_system_prompts.mockResolvedValue({
        success: true,
        presets: updatedPresets
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      act(() => {
        result.current.presets = existingPresets
      })
      
      let updateResult = false
      await act(async () => {
        updateResult = await result.current.updatePreset('preset_1', {
          name: '新名称',
          content: '新内容'
        })
      })
      
      expect(mockAPI.ai_update_system_prompt).toHaveBeenCalledWith('preset_1', '新名称', '新内容')
      expect(updateResult).toBe(true)
      expect(result.current.error).toBeNull()
    })
    
    it('应该自动去除名称和内容的首尾空格', async () => {
      mockAPI.ai_update_system_prompt.mockResolvedValue({
        success: true
      })
      
      mockAPI.ai_get_system_prompts.mockResolvedValue({
        success: true,
        presets: []
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      await act(async () => {
        await result.current.updatePreset('preset_1', {
          name: '  新名称  ',
          content: '  新内容  '
        })
      })
      
      expect(mockAPI.ai_update_system_prompt).toHaveBeenCalledWith('preset_1', '新名称', '新内容')
    })
    
    it('名称为空时应该返回 false 并设置错误', async () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      let updateResult = true
      await act(async () => {
        updateResult = await result.current.updatePreset('preset_1', {
          name: '',
          content: '新内容'
        })
      })
      
      expect(updateResult).toBe(false)
      expect(result.current.error).toBe('预设名称不能为空')
      expect(mockAPI.ai_update_system_prompt).not.toHaveBeenCalled()
    })
    
    it('内容为空时应该返回 false 并设置错误', async () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      let updateResult = true
      await act(async () => {
        updateResult = await result.current.updatePreset('preset_1', {
          name: '新名称',
          content: ''
        })
      })
      
      expect(updateResult).toBe(false)
      expect(result.current.error).toBe('预设内容不能为空')
      expect(mockAPI.ai_update_system_prompt).not.toHaveBeenCalled()
    })
    
    it('更新失败时应该返回 false 并设置错误', async () => {
      mockAPI.ai_update_system_prompt.mockResolvedValue({
        success: false,
        error_message: '更新失败'
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      let updateResult = true
      await act(async () => {
        updateResult = await result.current.updatePreset('preset_1', {
          name: '新名称',
          content: '新内容'
        })
      })
      
      expect(updateResult).toBe(false)
      expect(result.current.error).toBe('更新失败')
    })
  })
  
  describe('deletePreset - 验证需求 4.7, 4.8, 4.9', () => {
    it('应该能够删除预设', async () => {
      const existingPresets: SystemPromptPreset[] = [
        {
          id: 'preset_1',
          name: '预设1',
          content: '内容1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'preset_2',
          name: '预设2',
          content: '内容2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ]
      
      const remainingPresets: SystemPromptPreset[] = [
        {
          id: 'preset_2',
          name: '预设2',
          content: '内容2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ]
      
      mockAPI.ai_delete_system_prompt.mockResolvedValue({
        success: true
      })
      
      mockAPI.ai_get_system_prompts.mockResolvedValue({
        success: true,
        presets: remainingPresets
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      act(() => {
        result.current.presets = existingPresets
      })
      
      let deleteResult = false
      await act(async () => {
        deleteResult = await result.current.deletePreset('preset_1')
      })
      
      expect(mockAPI.ai_delete_system_prompt).toHaveBeenCalledWith('preset_1')
      expect(deleteResult).toBe(true)
      expect(result.current.error).toBeNull()
    })
    
    it('删除正在使用的预设时应该清除对应的激活预设', async () => {
      const existingPresets: SystemPromptPreset[] = [
        {
          id: 'preset_1',
          name: '预设1',
          content: '内容1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      mockAPI.ai_delete_system_prompt.mockResolvedValue({
        success: true
      })
      
      mockAPI.ai_get_system_prompts.mockResolvedValue({
        success: true,
        presets: []
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      act(() => {
        result.current.presets = existingPresets
        result.current.activePresets = new Map([
          ['topic_1', 'preset_1'],
          ['topic_2', 'preset_1'],
          ['topic_3', 'preset_2']
        ])
      })
      
      await act(async () => {
        await result.current.deletePreset('preset_1')
      })
      
      expect(result.current.activePresets.get('topic_1')).toBeNull()
      expect(result.current.activePresets.get('topic_2')).toBeNull()
      expect(result.current.activePresets.get('topic_3')).toBe('preset_2')
    })
    
    it('删除失败时应该返回 false 并设置错误', async () => {
      mockAPI.ai_delete_system_prompt.mockResolvedValue({
        success: false,
        error_message: '删除失败'
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      let deleteResult = true
      await act(async () => {
        deleteResult = await result.current.deletePreset('preset_1')
      })
      
      expect(deleteResult).toBe(false)
      expect(result.current.error).toBe('删除失败')
    })
  })
  
  describe('setActivePreset - 验证需求 2.3, 2.4, 2.6, 8.4, 8.5', () => {
    it('应该能够设置对话的激活预设', async () => {
      const existingPresets: SystemPromptPreset[] = [
        {
          id: 'preset_1',
          name: '预设1',
          content: '内容1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      mockAPI.ai_set_active_system_prompt.mockResolvedValue({
        success: true
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      act(() => {
        result.current.presets = existingPresets
      })
      
      let setResult = false
      await act(async () => {
        setResult = await result.current.setActivePreset('topic_1', 'preset_1')
      })
      
      expect(mockAPI.ai_set_active_system_prompt).toHaveBeenCalledWith('topic_1', 'preset_1')
      expect(setResult).toBe(true)
      expect(result.current.activePresets.get('topic_1')).toBe('preset_1')
      expect(result.current.error).toBeNull()
    })
    
    it('应该能够设置为"无"（null）', async () => {
      mockAPI.ai_set_active_system_prompt.mockResolvedValue({
        success: true
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      let setResult = false
      await act(async () => {
        setResult = await result.current.setActivePreset('topic_1', null)
      })
      
      expect(mockAPI.ai_set_active_system_prompt).toHaveBeenCalledWith('topic_1', null)
      expect(setResult).toBe(true)
      expect(result.current.activePresets.get('topic_1')).toBeNull()
    })
    
    it('设置失败时应该返回 false 并设置错误', async () => {
      mockAPI.ai_set_active_system_prompt.mockResolvedValue({
        success: false,
        error_message: '设置失败'
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      let setResult = true
      await act(async () => {
        setResult = await result.current.setActivePreset('topic_1', 'preset_1')
      })
      
      expect(setResult).toBe(false)
      expect(result.current.error).toBe('设置失败')
    })
  })
  
  describe('getActivePreset - 验证需求 2.1, 2.2, 8.6', () => {
    it('应该能够从缓存获取激活预设ID', () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      act(() => {
        result.current.activePresets = new Map([
          ['topic_1', 'preset_1'],
          ['topic_2', null]
        ])
      })
      
      const presetId1 = result.current.getActivePreset('topic_1')
      const presetId2 = result.current.getActivePreset('topic_2')
      
      expect(presetId1).toBe('preset_1')
      expect(presetId2).toBeNull()
    })
    
    it('缓存未命中时应该返回 null', () => {
      // Mock ai_get_active_system_prompt
      mockAPI.ai_get_active_system_prompt = vi.fn().mockResolvedValue({
        success: true,
        preset_id: 'preset_1'
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      const presetId = result.current.getActivePreset('topic_unknown')
      
      expect(presetId).toBeNull()
    })
  })
  
  describe('getActivePresetContent - 验证需求 7.1, 7.2, 7.3', () => {
    it('应该能够获取激活预设的内容', () => {
      const existingPresets: SystemPromptPreset[] = [
        {
          id: 'preset_1',
          name: '预设1',
          content: '这是预设1的内容',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'preset_2',
          name: '预设2',
          content: '这是预设2的内容',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ]
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      act(() => {
        result.current.presets = existingPresets
        result.current.activePresets = new Map([
          ['topic_1', 'preset_1'],
          ['topic_2', 'preset_2']
        ])
      })
      
      const content1 = result.current.getActivePresetContent('topic_1')
      const content2 = result.current.getActivePresetContent('topic_2')
      
      expect(content1).toBe('这是预设1的内容')
      expect(content2).toBe('这是预设2的内容')
    })
    
    it('没有激活预设时应该返回 null', () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      act(() => {
        result.current.activePresets = new Map([
          ['topic_1', null]
        ])
      })
      
      const content = result.current.getActivePresetContent('topic_1')
      
      expect(content).toBeNull()
    })
    
    it('激活预设不存在时应该返回 null', () => {
      const existingPresets: SystemPromptPreset[] = [
        {
          id: 'preset_1',
          name: '预设1',
          content: '内容1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      act(() => {
        result.current.presets = existingPresets
        result.current.activePresets = new Map([
          ['topic_1', 'preset_999']
        ])
      })
      
      const content = result.current.getActivePresetContent('topic_1')
      
      expect(content).toBeNull()
    })
    
    it('对话未设置激活预设时应该返回 null', () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      const content = result.current.getActivePresetContent('topic_unknown')
      
      expect(content).toBeNull()
    })
  })
  
  describe('initializeDefaultPreset - 验证需求 11.1, 11.2, 11.3, 11.4, 11.5', () => {
    it('没有预设时应该创建默认预设', async () => {
      const defaultPreset: SystemPromptPreset = {
        id: 'preset_default',
        name: 'ComfyUI专家',
        content: '# Role: ComfyUI 资深技术架构师...',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
      
      mockAPI.ai_get_system_prompts.mockResolvedValue({
        success: true,
        presets: []
      })
      
      mockAPI.ai_create_system_prompt.mockResolvedValue({
        success: true,
        preset: defaultPreset
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      await act(async () => {
        await result.current.initializeDefaultPreset()
      })
      
      expect(mockAPI.ai_create_system_prompt).toHaveBeenCalled()
      const createCall = mockAPI.ai_create_system_prompt.mock.calls[0]
      expect(createCall[0]).toBe('ComfyUI专家')
      expect(createCall[1]).toContain('ComfyUI 资深技术架构师')
    })
    
    it('已有预设时不应该创建默认预设', async () => {
      const existingPresets: SystemPromptPreset[] = [
        {
          id: 'preset_1',
          name: '已存在的预设',
          content: '内容',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      mockAPI.ai_get_system_prompts.mockResolvedValue({
        success: true,
        presets: existingPresets
      })
      
      const { result } = renderHook(() => useSystemPromptStore())
      
      await act(async () => {
        await result.current.initializeDefaultPreset()
      })
      
      expect(mockAPI.ai_create_system_prompt).not.toHaveBeenCalled()
    })
  })
  
  describe('clearError', () => {
    it('应该能够清除错误信息', () => {
      const { result } = renderHook(() => useSystemPromptStore())
      
      act(() => {
        result.current.error = '测试错误'
      })
      
      expect(result.current.error).toBe('测试错误')
      
      act(() => {
        result.current.clearError()
      })
      
      expect(result.current.error).toBeNull()
    })
  })
})
