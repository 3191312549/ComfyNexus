/**
 * useTopicStore 单元测试
 * 
 * 测试话题管理状态的各项功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTopicStore, Topic } from '../useTopicStore'

// Mock pywebview API
const mockAPI = {
  ai_create_topic: vi.fn(),
  ai_get_topics: vi.fn(),
  ai_delete_topic: vi.fn(),
  ai_rename_topic: vi.fn()
}

// 设置全局 window.pywebview
beforeEach(() => {
  // 重置所有 mock
  vi.clearAllMocks()
  
  // 重置 store 状态
  const { result } = renderHook(() => useTopicStore())
  act(() => {
    result.current.setTopics([])
    result.current.setCurrentTopicId(null)
  })
  
  // 设置 pywebview mock（模拟生产环境）
  ;(global as any).window = {
    pywebview: {
      api: mockAPI
    }
  }
})

describe('useTopicStore', () => {
  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useTopicStore())
      
      expect(result.current.topics).toEqual([])
      expect(result.current.currentTopicId).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })
  
  describe('setTopics', () => {
    it('应该能够设置话题列表', () => {
      const { result } = renderHook(() => useTopicStore())
      
      const mockTopics: Topic[] = [
        {
          id: 'topic_1',
          name: '话题 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'topic_2',
          name: '话题 2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ]
      
      act(() => {
        result.current.setTopics(mockTopics)
      })
      
      expect(result.current.topics).toEqual(mockTopics)
      expect(result.current.topics.length).toBe(2)
    })
  })
  
  describe('setCurrentTopicId', () => {
    it('应该能够设置当前话题 ID', () => {
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setCurrentTopicId('topic_123')
      })
      
      expect(result.current.currentTopicId).toBe('topic_123')
    })
    
    it('应该能够设置为 null', () => {
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setCurrentTopicId('topic_123')
        result.current.setCurrentTopicId(null)
      })
      
      expect(result.current.currentTopicId).toBeNull()
    })
  })
  
  describe('createTopic - 验证需求 2.1', () => {
    it('应该能够创建新话题（使用默认名称）', async () => {
      const mockTopic: Topic = {
        id: 'topic_new',
        name: '新对话',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z'
      }
      
      mockAPI.ai_create_topic.mockResolvedValue({
        success: true,
        topic: mockTopic
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      let createdTopic: Topic | null = null
      await act(async () => {
        createdTopic = await result.current.createTopic()
      })
      
      expect(mockAPI.ai_create_topic).toHaveBeenCalledWith('新对话')
      expect(createdTopic).toEqual(mockTopic)
      expect(result.current.topics).toContainEqual(mockTopic)
      expect(result.current.currentTopicId).toBe(mockTopic.id)
    })
    
    it('应该能够创建新话题（使用自定义名称）', async () => {
      const mockTopic: Topic = {
        id: 'topic_custom',
        name: '自定义话题',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z'
      }
      
      mockAPI.ai_create_topic.mockResolvedValue({
        success: true,
        topic: mockTopic
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      let createdTopic: Topic | null = null
      await act(async () => {
        createdTopic = await result.current.createTopic('自定义话题')
      })
      
      expect(mockAPI.ai_create_topic).toHaveBeenCalledWith('自定义话题')
      expect(createdTopic).toEqual(mockTopic)
      expect(result.current.topics).toContainEqual(mockTopic)
    })
    
    it('应该将新话题添加到列表最前面', async () => {
      const existingTopics: Topic[] = [
        {
          id: 'topic_1',
          name: '话题 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      const newTopic: Topic = {
        id: 'topic_2',
        name: '话题 2',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }
      
      mockAPI.ai_create_topic.mockResolvedValue({
        success: true,
        topic: newTopic
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setTopics(existingTopics)
      })
      
      await act(async () => {
        await result.current.createTopic('话题 2')
      })
      
      expect(result.current.topics[0]).toEqual(newTopic)
      expect(result.current.topics[1]).toEqual(existingTopics[0])
    })
    
    it('创建失败时应该返回 null', async () => {
      mockAPI.ai_create_topic.mockResolvedValue({
        success: false,
        error_message: '创建失败'
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      let createdTopic: Topic | null = null
      await act(async () => {
        createdTopic = await result.current.createTopic()
      })
      
      expect(createdTopic).toBeNull()
      expect(result.current.topics).toEqual([])
    })
    
    it('API 异常时应该返回 null', async () => {
      mockAPI.ai_create_topic.mockRejectedValue(new Error('网络错误'))
      
      const { result } = renderHook(() => useTopicStore())
      
      let createdTopic: Topic | null = null
      await act(async () => {
        createdTopic = await result.current.createTopic()
      })
      
      expect(createdTopic).toBeNull()
    })
  })
  
  describe('deleteTopic - 验证需求 2.3', () => {
    it('应该能够删除话题', async () => {
      const topics: Topic[] = [
        {
          id: 'topic_1',
          name: '话题 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'topic_2',
          name: '话题 2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ]
      
      mockAPI.ai_delete_topic.mockResolvedValue({
        success: true
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setTopics(topics)
        result.current.setCurrentTopicId('topic_2')
      })
      
      let deleteResult = false
      await act(async () => {
        deleteResult = await result.current.deleteTopic('topic_2')
      })
      
      expect(mockAPI.ai_delete_topic).toHaveBeenCalledWith('topic_2')
      expect(deleteResult).toBe(true)
      expect(result.current.topics).toHaveLength(1)
      expect(result.current.topics[0].id).toBe('topic_1')
    })
    
    it('删除当前话题时应该自动切换到其他话题', async () => {
      const topics: Topic[] = [
        {
          id: 'topic_1',
          name: '话题 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'topic_2',
          name: '话题 2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ]
      
      mockAPI.ai_delete_topic.mockResolvedValue({
        success: true
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setTopics(topics)
        result.current.setCurrentTopicId('topic_1')
      })
      
      await act(async () => {
        await result.current.deleteTopic('topic_1')
      })
      
      expect(result.current.currentTopicId).toBe('topic_2')
    })
    
    it('删除最后一个话题时应该将 currentTopicId 设为 null', async () => {
      const topics: Topic[] = [
        {
          id: 'topic_1',
          name: '话题 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      mockAPI.ai_delete_topic.mockResolvedValue({
        success: true
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setTopics(topics)
        result.current.setCurrentTopicId('topic_1')
      })
      
      await act(async () => {
        await result.current.deleteTopic('topic_1')
      })
      
      expect(result.current.topics).toHaveLength(0)
      expect(result.current.currentTopicId).toBeNull()
    })
    
    it('删除失败时应该返回 false', async () => {
      mockAPI.ai_delete_topic.mockResolvedValue({
        success: false,
        error_message: '删除失败'
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      let deleteResult = false
      await act(async () => {
        deleteResult = await result.current.deleteTopic('topic_1')
      })
      
      expect(deleteResult).toBe(false)
    })
  })
  
  describe('renameTopic - 验证需求 2.4', () => {
    it('应该能够重命名话题', async () => {
      const topics: Topic[] = [
        {
          id: 'topic_1',
          name: '旧名称',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      mockAPI.ai_rename_topic.mockResolvedValue({
        success: true
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setTopics(topics)
      })
      
      let renameResult = false
      await act(async () => {
        renameResult = await result.current.renameTopic('topic_1', '新名称')
      })
      
      expect(mockAPI.ai_rename_topic).toHaveBeenCalledWith('topic_1', '新名称')
      expect(renameResult).toBe(true)
      expect(result.current.topics[0].name).toBe('新名称')
    })
    
    it('应该自动去除名称首尾空格', async () => {
      const topics: Topic[] = [
        {
          id: 'topic_1',
          name: '旧名称',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      mockAPI.ai_rename_topic.mockResolvedValue({
        success: true
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setTopics(topics)
      })
      
      await act(async () => {
        await result.current.renameTopic('topic_1', '  新名称  ')
      })
      
      expect(mockAPI.ai_rename_topic).toHaveBeenCalledWith('topic_1', '新名称')
      expect(result.current.topics[0].name).toBe('新名称')
    })
    
    it('空名称应该返回 false', async () => {
      const { result } = renderHook(() => useTopicStore())
      
      let renameResult = true
      await act(async () => {
        renameResult = await result.current.renameTopic('topic_1', '')
      })
      
      expect(renameResult).toBe(false)
      expect(mockAPI.ai_rename_topic).not.toHaveBeenCalled()
    })
    
    it('纯空格名称应该返回 false', async () => {
      const { result } = renderHook(() => useTopicStore())
      
      let renameResult = true
      await act(async () => {
        renameResult = await result.current.renameTopic('topic_1', '   ')
      })
      
      expect(renameResult).toBe(false)
      expect(mockAPI.ai_rename_topic).not.toHaveBeenCalled()
    })
    
    it('重命名失败时应该返回 false', async () => {
      mockAPI.ai_rename_topic.mockResolvedValue({
        success: false,
        error_message: '重命名失败'
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      let renameResult = false
      await act(async () => {
        renameResult = await result.current.renameTopic('topic_1', '新名称')
      })
      
      expect(renameResult).toBe(false)
    })
  })
  
  describe('loadTopics', () => {
    it('应该能够加载话题列表', async () => {
      const mockTopics: Topic[] = [
        {
          id: 'topic_1',
          name: '话题 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          message_count: 5
        },
        {
          id: 'topic_2',
          name: '话题 2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          message_count: 3
        }
      ]
      
      mockAPI.ai_get_topics.mockResolvedValue({
        success: true,
        topics: mockTopics
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      await act(async () => {
        await result.current.loadTopics()
      })
      
      expect(mockAPI.ai_get_topics).toHaveBeenCalled()
      expect(result.current.topics).toEqual(mockTopics)
      expect(result.current.currentTopicId).toBe('topic_1')
    })
    
    it('加载空列表时应该将 currentTopicId 设为 null', async () => {
      mockAPI.ai_get_topics.mockResolvedValue({
        success: true,
        topics: []
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      await act(async () => {
        await result.current.loadTopics()
      })
      
      expect(result.current.topics).toEqual([])
      expect(result.current.currentTopicId).toBeNull()
    })
    
    it('加载失败时应该保持原状态', async () => {
      mockAPI.ai_get_topics.mockResolvedValue({
        success: false,
        error_message: '加载失败'
      })
      
      const { result } = renderHook(() => useTopicStore())
      
      await act(async () => {
        await result.current.loadTopics()
      })
      
      expect(result.current.topics).toEqual([])
    })
  })
  
  describe('getCurrentTopic', () => {
    it('应该能够获取当前话题对象', () => {
      const topics: Topic[] = [
        {
          id: 'topic_1',
          name: '话题 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'topic_2',
          name: '话题 2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ]
      
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setTopics(topics)
        result.current.setCurrentTopicId('topic_2')
      })
      
      const currentTopic = result.current.getCurrentTopic()
      
      expect(currentTopic).toEqual(topics[1])
    })
    
    it('没有当前话题时应该返回 null', () => {
      const { result } = renderHook(() => useTopicStore())
      
      const currentTopic = result.current.getCurrentTopic()
      
      expect(currentTopic).toBeNull()
    })
    
    it('当前话题 ID 不存在时应该返回 null', () => {
      const topics: Topic[] = [
        {
          id: 'topic_1',
          name: '话题 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setTopics(topics)
        result.current.setCurrentTopicId('topic_999')
      })
      
      const currentTopic = result.current.getCurrentTopic()
      
      expect(currentTopic).toBeNull()
    })
  })
  
  describe('话题切换 - 验证需求 2.2', () => {
    it('应该能够在不同话题之间切换', () => {
      const topics: Topic[] = [
        {
          id: 'topic_1',
          name: '话题 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'topic_2',
          name: '话题 2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        },
        {
          id: 'topic_3',
          name: '话题 3',
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z'
        }
      ]
      
      const { result } = renderHook(() => useTopicStore())
      
      act(() => {
        result.current.setTopics(topics)
      })
      
      // 切换到话题 1
      act(() => {
        result.current.setCurrentTopicId('topic_1')
      })
      expect(result.current.currentTopicId).toBe('topic_1')
      expect(result.current.getCurrentTopic()?.name).toBe('话题 1')
      
      // 切换到话题 2
      act(() => {
        result.current.setCurrentTopicId('topic_2')
      })
      expect(result.current.currentTopicId).toBe('topic_2')
      expect(result.current.getCurrentTopic()?.name).toBe('话题 2')
      
      // 切换到话题 3
      act(() => {
        result.current.setCurrentTopicId('topic_3')
      })
      expect(result.current.currentTopicId).toBe('topic_3')
      expect(result.current.getCurrentTopic()?.name).toBe('话题 3')
    })
  })
})
