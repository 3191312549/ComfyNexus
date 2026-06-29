/**
 * useAIStore 单元测试
 * 
 * 测试 AI 助手状态管理的核心功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAIStore } from '../useAIStore'

// Mock window.pywebview
const mockPywebviewAPI = {
  ai_send_message_with_config: vi.fn(),
  ai_stop_generation: vi.fn(),
  ai_get_messages: vi.fn(),
  ai_clear_messages: vi.fn(),
}

describe('useAIStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    const { result } = renderHook(() => useAIStore())
    act(() => {
      result.current.clearMessages()
      result.current.setCurrentTopicId(null)
    })
    
    // 清除所有 mock
    vi.clearAllMocks()
    
    // 设置 window.pywebview
    ;(global as any).window = {
      pywebview: {
        api: mockPywebviewAPI
      },
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
  
  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useAIStore())
      
      expect(result.current.messages).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isGenerating).toBe(false)
      expect(result.current.currentChunk).toBe('')
      expect(result.current.currentTopicId).toBe(null)
    })
  })
  
  describe('setMessages', () => {
    it('应该能够设置消息列表', () => {
      const { result } = renderHook(() => useAIStore())
      
      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date().toISOString()
        }
      ]
      
      act(() => {
        result.current.setMessages(messages)
      })
      
      expect(result.current.messages).toEqual(messages)
    })
  })
  
  describe('addMessage', () => {
    it('应该能够添加消息到列表', () => {
      const { result } = renderHook(() => useAIStore())
      
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date().toISOString()
      }
      
      act(() => {
        result.current.addMessage(message)
      })
      
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0]).toEqual(message)
    })
    
    it('应该能够添加多条消息', () => {
      const { result } = renderHook(() => useAIStore())
      
      const message1 = {
        id: '1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date().toISOString()
      }
      
      const message2 = {
        id: '2',
        role: 'assistant' as const,
        content: 'Hi there!',
        timestamp: new Date().toISOString()
      }
      
      act(() => {
        result.current.addMessage(message1)
        result.current.addMessage(message2)
      })
      
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0]).toEqual(message1)
      expect(result.current.messages[1]).toEqual(message2)
    })
  })
  
  describe('updateLastMessage', () => {
    it('应该能够更新最后一条消息的内容', () => {
      const { result } = renderHook(() => useAIStore())
      
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Initial content',
        timestamp: new Date().toISOString()
      }
      
      act(() => {
        result.current.addMessage(message)
        result.current.updateLastMessage('Updated content')
      })
      
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].content).toBe('Updated content')
      expect(result.current.messages[0].id).toBe('1')
    })
    
    it('当没有消息时不应该报错', () => {
      const { result } = renderHook(() => useAIStore())
      
      expect(() => {
        act(() => {
          result.current.updateLastMessage('Some content')
        })
      }).not.toThrow()
      
      expect(result.current.messages).toHaveLength(0)
    })
  })
  
  describe('clearMessages', () => {
    it('应该能够清空消息列表', () => {
      const { result } = renderHook(() => useAIStore())
      
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date().toISOString()
      }
      
      act(() => {
        result.current.addMessage(message)
        result.current.clearMessages()
      })
      
      expect(result.current.messages).toEqual([])
      expect(result.current.currentChunk).toBe('')
    })
  })
  
  describe('setCurrentTopicId', () => {
    it('应该能够设置当前话题 ID', () => {
      const { result } = renderHook(() => useAIStore())
      
      act(() => {
        result.current.setCurrentTopicId('topic-123')
      })
      
      expect(result.current.currentTopicId).toBe('topic-123')
    })
  })
  
  describe('sendMessage - 开发环境', () => {
    beforeEach(() => {
      // 模拟开发环境（没有 pywebview）
      delete (global as any).window.pywebview
    })
    
    it('应该能够发送消息并添加用户消息', async () => {
      const { result } = renderHook(() => useAIStore())
      
      await act(async () => {
        await result.current.sendMessage('Hello', 'topic-1', 'openai', 'gpt-4')
      })
      
      // 应该至少有用户消息
      expect(result.current.messages.length).toBeGreaterThanOrEqual(1)
      expect(result.current.messages[0].role).toBe('user')
      expect(result.current.messages[0].content).toBe('Hello')
    })
    
    it('应该拒绝空消息', async () => {
      const { result } = renderHook(() => useAIStore())
      
      await act(async () => {
        await result.current.sendMessage('', 'topic-1', 'openai', 'gpt-4')
      })
      
      expect(result.current.messages).toHaveLength(0)
    })
    
    it('应该拒绝纯空白字符消息', async () => {
      const { result } = renderHook(() => useAIStore())
      
      await act(async () => {
        await result.current.sendMessage('   ', 'topic-1', 'openai', 'gpt-4')
      })
      
      expect(result.current.messages).toHaveLength(0)
    })
    
    it('应该拒绝没有话题 ID 的消息', async () => {
      const { result } = renderHook(() => useAIStore())
      
      await act(async () => {
        await result.current.sendMessage('Hello', '', 'openai', 'gpt-4')
      })
      
      expect(result.current.messages).toHaveLength(0)
    })
  })
  
  describe('sendMessage - 生产环境', () => {
    beforeEach(() => {
      // 确保 pywebview 存在
      ;(global as any).window.pywebview = {
        api: mockPywebviewAPI
      }
    })
    
    it('应该调用后端 API 发送消息', async () => {
      mockPywebviewAPI.ai_send_message_with_config.mockResolvedValue({
        success: true,
        message_id: 'msg-1',
        ai_message_id: 'ai-msg-1'
      })
      
      const { result } = renderHook(() => useAIStore())
      
      await act(async () => {
        await result.current.sendMessage('Hello', 'topic-1', 'openai', 'gpt-4', 'config-1')
      })
      
      expect(mockPywebviewAPI.ai_send_message_with_config).toHaveBeenCalledWith(
        'topic-1',
        'Hello',
        'config-1',
        false,
        false,
        null,
        []
      )
      
      // 应该有用户消息和 AI 消息占位符
      expect(result.current.messages.length).toBeGreaterThanOrEqual(2)
      expect(result.current.messages[0].role).toBe('user')
      expect(result.current.messages[1].role).toBe('assistant')
    })
    
    it('应该处理 API 错误', async () => {
      mockPywebviewAPI.ai_send_message_with_config.mockResolvedValue({
        success: false,
        error_message: 'API Key 无效'
      })
      
      const { result } = renderHook(() => useAIStore())
      
      await act(async () => {
        await result.current.sendMessage('Hello', 'topic-1', 'openai', 'gpt-4', 'config-1')
      })
      
      // 应该有用户消息和错误消息
      expect(result.current.messages.length).toBeGreaterThanOrEqual(2)
      expect(result.current.messages[1].content).toContain('API Key 无效')
    })
    
    it('API 调用异常时应该保留已流式生成内容', async () => {
      mockPywebviewAPI.ai_send_message_with_config.mockImplementation(async () => {
        useAIStore.getState()._handleMessageChunk(new CustomEvent('ai_message_chunk', {
          detail: {
            topic_id: 'topic-1',
            chunk: '部分内容',
            done: false
          }
        }))
        throw new Error('pywebview 调用失败')
      })
      
      const { result } = renderHook(() => useAIStore())
      
      await act(async () => {
        await result.current.sendMessage('Hello', 'topic-1', 'openai', 'gpt-4', 'config-1')
      })
      
      expect(result.current.messages[1].content).toContain('部分内容')
      expect(result.current.messages[1].content).toContain('pywebview 调用失败')
      expect(result.current.messages[1].content).not.toMatch(/^❌ 发送失败/)
    })
  })
  
  describe('stopGeneration', () => {
    it('应该能够停止生成（开发环境）', async () => {
      delete (global as any).window.pywebview
      
      const { result } = renderHook(() => useAIStore())
      
      // 设置生成状态
      act(() => {
        result.current.setMessages([
          {
            id: '1',
            role: 'assistant',
            content: 'Generating...',
            timestamp: new Date().toISOString()
          }
        ])
      })
      
      await act(async () => {
        await result.current.stopGeneration('topic-1')
      })
      
      expect(result.current.isGenerating).toBe(false)
      expect(result.current.currentChunk).toBe('')
    })
    
    it('应该调用后端 API 停止生成（生产环境）', async () => {
      mockPywebviewAPI.ai_stop_generation.mockResolvedValue({
        success: true
      })
      
      const { result } = renderHook(() => useAIStore())
      
      await act(async () => {
        await result.current.stopGeneration('topic-1')
      })
      
      expect(mockPywebviewAPI.ai_stop_generation).toHaveBeenCalledWith('topic-1')
      expect(result.current.isGenerating).toBe(false)
    })
  })
  
  describe('_handleMessageChunk', () => {
    it('应该处理消息片段事件', () => {
      const { result } = renderHook(() => useAIStore())
      
      // 设置当前话题
      act(() => {
        result.current.setCurrentTopicId('topic-1')
        result.current.addMessage({
          id: 'ai-1',
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString()
        })
      })
      
      // 模拟接收消息片段
      const event = new CustomEvent('ai_message_chunk', {
        detail: {
          topic_id: 'topic-1',
          chunk: 'Hello',
          done: false
        }
      })
      
      act(() => {
        result.current._handleMessageChunk(event)
      })
      
      expect(result.current.currentChunk).toBe('Hello')
      expect(result.current.messages[0].content).toBe('Hello')
    })
    
    it('应该处理生成完成事件', () => {
      const { result } = renderHook(() => useAIStore())
      
      // 设置当前话题和生成状态
      act(() => {
        result.current.setCurrentTopicId('topic-1')
      })
      
      // 模拟生成完成
      const event = new CustomEvent('ai_message_chunk', {
        detail: {
          topic_id: 'topic-1',
          chunk: '',
          done: true
        }
      })
      
      act(() => {
        result.current._handleMessageChunk(event)
      })
      
      expect(result.current.isGenerating).toBe(false)
      expect(result.current.currentChunk).toBe('')
    })
    
    it('应该忽略其他话题的消息片段', () => {
      const { result } = renderHook(() => useAIStore())
      
      // 设置当前话题
      act(() => {
        result.current.setCurrentTopicId('topic-1')
      })
      
      // 模拟接收其他话题的消息片段
      const event = new CustomEvent('ai_message_chunk', {
        detail: {
          topic_id: 'topic-2',
          chunk: 'Hello',
          done: false
        }
      })
      
      act(() => {
        result.current._handleMessageChunk(event)
      })
      
      // 不应该更新当前话题的状态
      expect(result.current.currentChunk).toBe('')
    })
  })
  
  describe('_handleMessageError', () => {
    it('已有流式内容时应该追加错误提示而不是覆盖正文', () => {
      const { result } = renderHook(() => useAIStore())
      
      act(() => {
        result.current.setCurrentTopicId('topic-1')
        result.current.addMessage({
          id: 'ai-1',
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString()
        })
        result.current._handleMessageChunk(new CustomEvent('ai_message_chunk', {
          detail: {
            topic_id: 'topic-1',
            chunk: '已经生成的内容',
            done: false
          }
        }))
      })
      
      act(() => {
        result.current._handleMessageError(new CustomEvent('ai_message_error', {
          detail: {
            topic_id: 'topic-1',
            error: 'Ollama 生成空闲超时'
          }
        }))
      })
      
      expect(result.current.messages[0].content).toContain('已经生成的内容')
      expect(result.current.messages[0].content).toContain('Ollama 生成空闲超时')
      expect(result.current.messages[0].content).not.toMatch(/^❌ 请求失败/)
      expect(result.current.currentChunk).toBe('')
      expect(result.current.isGenerating).toBe(false)
    })
  })
})
