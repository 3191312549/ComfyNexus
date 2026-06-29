/**
 * MessageList 组件单元测试
 * 
 * 测试内容：
 * - 消息列表渲染
 * - 空状态显示
 * - 加载状态显示
 * - 导出按钮显示和功能
 * 
 * 验证需求：1.1, 6.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageList } from '../MessageList'
import { useAIStore } from '@/stores/useAIStore'
import { useTopicStore } from '@/stores/useTopicStore'

// Mock stores
vi.mock('@/stores/useAIStore')
vi.mock('@/stores/useTopicStore')

// Mock ScrollArea
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock MessageItem
vi.mock('../MessageItem', () => ({
  MessageItem: ({ message }: any) => <div data-testid="message-item">{message.content}</div>
}))

// Mock ExportDialog
vi.mock('../ExportDialog', () => ({
  ExportDialog: ({ open, topicId, topicName }: any) => (
    open ? <div data-testid="export-dialog">Export: {topicName}</div> : null
  )
}))

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
  })
  
  it('应该显示空状态', () => {
    // @ts-expect-error - 测试环境需要模拟 store
    useAIStore.mockReturnValue({
      messages: [],
      isLoading: false,
      isGenerating: false
    })
    
    // @ts-expect-error - 测试环境需要模拟 store
    useTopicStore.mockReturnValue({
      getCurrentTopic: () => null
    })
    
    render(<MessageList />)
    
    expect(screen.getByText('开始对话')).toBeInTheDocument()
    expect(screen.getByText(/在下方输入框中输入您的问题/)).toBeInTheDocument()
  })
  
  it('应该显示消息列表', () => {
    const mockMessages = [
      {
        id: 'msg_1',
        role: 'user',
        content: '你好',
        timestamp: '2024-01-01T00:00:00Z'
      },
      {
        id: 'msg_2',
        role: 'assistant',
        content: '你好！有什么可以帮助你的吗？',
        timestamp: '2024-01-01T00:00:01Z',
        model: 'gpt-3.5-turbo'
      }
    ]
    
    // @ts-expect-error - 测试环境需要模拟 store
    useAIStore.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      isGenerating: false
    })
    
    // @ts-expect-error - 测试环境需要模拟 store
    useTopicStore.mockReturnValue({
      getCurrentTopic: () => ({
        id: 'topic_1',
        name: '测试话题',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      })
    })
    
    render(<MessageList />)
    
    const messageItems = screen.getAllByTestId('message-item')
    expect(messageItems).toHaveLength(2)
    expect(screen.getByText('你好')).toBeInTheDocument()
    expect(screen.getByText('你好！有什么可以帮助你的吗？')).toBeInTheDocument()
  })
  
  it('应该显示加载指示器', () => {
    // @ts-expect-error - 测试环境需要模拟 store
    useAIStore.mockReturnValue({
      messages: [],
      isLoading: true,
      isGenerating: false
    })
    
    // @ts-expect-error - 测试环境需要模拟 store
    useTopicStore.mockReturnValue({
      getCurrentTopic: () => null
    })
    
    render(<MessageList />)
    
    expect(screen.getByText('正在发送消息...')).toBeInTheDocument()
  })
  
  it('应该显示生成中指示器', () => {
    // @ts-expect-error - 测试环境需要模拟 store
    useAIStore.mockReturnValue({
      messages: [],
      isLoading: false,
      isGenerating: true
    })
    
    // @ts-expect-error - 测试环境需要模拟 store
    useTopicStore.mockReturnValue({
      getCurrentTopic: () => null
    })
    
    render(<MessageList />)
    
    expect(screen.getByText('AI 正在思考...')).toBeInTheDocument()
  })
  
  it('应该在有消息时显示导出按钮', () => {
    const mockMessages = [
      {
        id: 'msg_1',
        role: 'user',
        content: '测试消息',
        timestamp: '2024-01-01T00:00:00Z'
      }
    ]
    
    // @ts-expect-error - 测试环境需要模拟 store
    useAIStore.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      isGenerating: false
    })
    
    // @ts-expect-error - 测试环境需要模拟 store
    useTopicStore.mockReturnValue({
      getCurrentTopic: () => ({
        id: 'topic_1',
        name: '测试话题',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      })
    })
    
    render(<MessageList />)
    
    expect(screen.getByText('导出')).toBeInTheDocument()
    expect(screen.getByText('共 1 条消息')).toBeInTheDocument()
  })
  
  it('应该在没有消息时不显示导出按钮', () => {
    // @ts-expect-error - 测试环境需要模拟 store
    useAIStore.mockReturnValue({
      messages: [],
      isLoading: false,
      isGenerating: false
    })
    
    // @ts-expect-error - 测试环境需要模拟 store
    useTopicStore.mockReturnValue({
      getCurrentTopic: () => ({
        id: 'topic_1',
        name: '测试话题',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      })
    })
    
    render(<MessageList />)
    
    expect(screen.queryByText('导出')).not.toBeInTheDocument()
  })
  
  it('应该能够打开导出对话框', () => {
    const mockMessages = [
      {
        id: 'msg_1',
        role: 'user',
        content: '测试消息',
        timestamp: '2024-01-01T00:00:00Z'
      }
    ]
    
    // @ts-expect-error - 测试环境需要模拟 store
    useAIStore.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      isGenerating: false
    })
    
    // @ts-expect-error - 测试环境需要模拟 store
    useTopicStore.mockReturnValue({
      getCurrentTopic: () => ({
        id: 'topic_1',
        name: '测试话题',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      })
    })
    
    render(<MessageList />)
    
    // 点击导出按钮
    const exportButton = screen.getByText('导出')
    fireEvent.click(exportButton)
    
    // 验证导出对话框打开
    expect(screen.getByTestId('export-dialog')).toBeInTheDocument()
    expect(screen.getByText('Export: 测试话题')).toBeInTheDocument()
  })
  
  it('应该在加载或生成时禁用导出按钮', () => {
    const mockMessages = [
      {
        id: 'msg_1',
        role: 'user',
        content: '测试消息',
        timestamp: '2024-01-01T00:00:00Z'
      }
    ]
    
    // @ts-expect-error - 测试环境需要模拟 store
    useAIStore.mockReturnValue({
      messages: mockMessages,
      isLoading: true,
      isGenerating: false
    })
    
    // @ts-expect-error - 测试环境需要模拟 store
    useTopicStore.mockReturnValue({
      getCurrentTopic: () => ({
        id: 'topic_1',
        name: '测试话题',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      })
    })
    
    render(<MessageList />)
    
    const exportButton = screen.getByText('导出')
    expect(exportButton).toBeDisabled()
  })
})
