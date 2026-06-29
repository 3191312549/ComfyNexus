/**
 * AI助手状态管理
 * 
 * 负责管理 AI 对话的状态，包括：
 * - 消息列表管理
 * - 发送消息和接收流式响应
 * - 停止生成
 * - 清空消息
 */

import { create } from 'zustand'

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant'

/**
 * 文件接口（用于消息中的文件）
 */
export interface MessageFile {
  id: string
  name: string
  type: 'image' | 'document'
  mime_type: string
  size: number
  content: string
  content_type: 'base64' | 'text'
  thumbnail?: string
  metadata: {
    original_name: string
    extracted_text_length?: number
    extraction_method?: string
    extraction_success?: boolean
  }
  uploaded_at: string
}

/**
 * 消息接口
 */
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  model?: string  // 仅 assistant 消息有模型信息
  files?: MessageFile[]  // 消息附带的文件
}

/**
 * AI Store 状态接口
 */
interface AIStore {
  // 状态
  messages: Message[]           // 当前话题的消息列表
  isLoading: boolean            // 是否正在加载（发送请求中）
  isGenerating: boolean         // 是否正在生成（AI 正在流式输出）
  currentChunk: string          // 当前正在生成的文本片段
  currentTopicId: string | null // 当前话题 ID
  autoScrollEnabled: boolean    // 是否启用自动滚动
  
  // Actions
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  clearMessages: () => void
  setCurrentTopicId: (topicId: string | null) => void
  setAutoScrollEnabled: (enabled: boolean) => void
  loadMessages: (topicId: string) => Promise<void>
  sendMessage: (content: string, topicId: string, provider: string, model: string, configId?: string, deepThinking?: boolean, webSearchEnabled?: boolean, systemPrompt?: string | null, files?: any[]) => Promise<void>
  stopGeneration: (topicId: string) => Promise<void>
  
  // 内部方法
  _handleMessageChunk: (event: CustomEvent) => void
  _handleMessageError: (event: CustomEvent) => void
  _initEventListener: () => void
}

/**
 * 检查是否在开发环境
 */
const isDevelopment = (): boolean => {
  return !window.pywebview || !window.pywebview.api
}

/**
 * AI Store 实现
 */
export const useAIStore = create<AIStore>((set, get) => {
  // 初始化事件监听器
  const initEventListener = () => {
    console.log('[useAIStore] 初始化事件监听器')
    
    // 监听 AI 消息片段事件
    window.addEventListener('ai_message_chunk', ((event: CustomEvent) => {
      console.log('[useAIStore] ✓ 收到 ai_message_chunk 事件:', event.detail)
      get()._handleMessageChunk(event)
    }) as EventListener)
    
    // 监听 AI 消息错误事件
    window.addEventListener('ai_message_error', ((event: CustomEvent) => {
      console.log('[useAIStore] ✓ 收到 ai_message_error 事件:', event.detail)
      get()._handleMessageError(event)
    }) as EventListener)
    
    console.log('[useAIStore] 事件监听器已注册')
  }
  
  // 在创建 store 时初始化事件监听
  if (typeof window !== 'undefined') {
    initEventListener()
  }
  
  return {
    // 初始状态
    messages: [],
    isLoading: false,
    isGenerating: false,
    currentChunk: '',
    currentTopicId: null,
    autoScrollEnabled: true,
    
    /**
     * 设置消息列表
     */
    setMessages: (messages) => {
      set({ messages })
    },
    
    /**
     * 添加消息到列表
     */
    addMessage: (message) => {
      set((state) => ({
        messages: [...state.messages, message]
      }))
    },
    
    /**
     * 更新最后一条消息的内容
     */
    updateLastMessage: (content) => {
      set((state) => {
        const messages = [...state.messages]
        if (messages.length > 0) {
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            content
          }
        }
        return { messages }
      })
    },
    
    /**
     * 清空当前话题的消息
     */
    clearMessages: () => {
      set({ messages: [], currentChunk: '' })
    },
    
    /**
     * 设置当前话题 ID
     */
    setCurrentTopicId: (topicId) => {
      set({ currentTopicId: topicId })
    },
    
    /**
     * 设置自动滚动状态
     */
    setAutoScrollEnabled: (enabled) => {
      set({ autoScrollEnabled: enabled })
    },
    
    /**
     * 加载话题的历史消息
     * 
     * @param topicId 话题 ID
     */
    loadMessages: async (topicId) => {
      try {
        console.log('[useAIStore] 加载话题消息:', topicId)
        
        // 设置当前话题 ID
        set({ currentTopicId: topicId, isLoading: true })
        
        // 开发环境使用 Mock
        if (isDevelopment()) {
          console.log('[useAIStore] 开发环境：使用 Mock 消息')
          
          // 模拟延迟
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // 生成一些 Mock 消息
          const mockMessages: Message[] = [
            {
              id: `msg_1_${topicId}`,
              role: 'user',
              content: '你好，这是一条测试消息',
              timestamp: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: `msg_2_${topicId}`,
              role: 'assistant',
              content: '你好！我是 AI 助手，很高兴为你服务。这是一条模拟的历史消息。',
              timestamp: new Date(Date.now() - 3500000).toISOString(),
              model: 'gpt-3.5-turbo'
            }
          ]
          
          set({ messages: mockMessages, isLoading: false })
          console.log('[useAIStore] Mock 消息加载成功:', mockMessages.length)
          return
        }
        
        // 生产环境：调用后端 API
        console.log('[useAIStore] 调用后端 API: ai_get_messages')
        const response = await window.pywebview.api.ai_get_messages(topicId)
        
        set({ isLoading: false })
        
        if (!response.success) {
          console.error('[useAIStore] 加载消息失败:', response.error_message)
          set({ messages: [] })
          return
        }
        
        const messages = response.messages || []
        set({ messages })
        
        console.log('[useAIStore] 消息加载成功:', messages.length)
        
      } catch (error) {
        console.error('[useAIStore] 加载消息异常:', error)
        set({ isLoading: false, messages: [] })
      }
    },
    
    /**
     * 发送消息
     * 
     * @param content 消息内容
     * @param topicId 话题 ID
     * @param provider 服务商名称
     * @param model 模型名称
     * @param configId 配置 ID（可选，如果提供则使用指定配置）
     * @param deepThinking 是否启用深度思考（可选，默认 false）
     * @param webSearchEnabled 是否启用联网搜索（可选，默认 false）
     * @param systemPrompt 系统提示词（可选）
     * @param files 文件列表（可选）
     */
    sendMessage: async (content, topicId, _provider: string, model, configId, deepThinking = false, webSearchEnabled = false, systemPrompt = null, files = []) => {
      try {
        // 验证输入
        if (!content || !content.trim()) {
          console.error('[useAIStore] 消息内容不能为空')
          return
        }
        
        if (!topicId) {
          console.error('[useAIStore] 话题 ID 不能为空')
          return
        }
        
        // 设置当前话题 ID（确保事件监听器能正确处理响应）
        set({ currentTopicId: topicId })
        
        // 添加用户消息到 UI
        const userMessage: Message = {
          id: `user_${Date.now()}`,
          role: 'user',
          content: content.trim(),
          timestamp: new Date().toISOString(),
          files: files.length > 0 ? files : undefined  // 添加文件列表
        }
        get().addMessage(userMessage)
        
        // 设置加载状态
        set({ isLoading: true, isGenerating: false, currentChunk: '' })
        
        // 开发环境使用 Mock
        if (isDevelopment()) {
          console.log('[useAIStore] 开发环境：使用 Mock 响应')
          
          // 模拟延迟
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // 添加 AI 消息占位符
          const aiMessage: Message = {
            id: `ai_${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            model
          }
          get().addMessage(aiMessage)
          
          set({ isLoading: false, isGenerating: true })
          
          // 模拟流式响应
          const mockResponse = '这是一个模拟的 AI 响应。在生产环境中，这里会调用真实的 AI 服务并实时显示生成的内容。'
          let currentContent = ''
          
          for (let i = 0; i < mockResponse.length; i++) {
            currentContent += mockResponse[i]
            set({ currentChunk: currentContent })
            get().updateLastMessage(currentContent)
            await new Promise(resolve => setTimeout(resolve, 50))
          }
          
          set({ isGenerating: false, currentChunk: '' })
          return
        }
        
        // 生产环境：调用后端 API
        console.log('[useAIStore] 调用后端 API: ai_send_message_with_config')
        console.log('[useAIStore] 参数:', { topicId, content: content.substring(0, 20), configId, deepThinking, webSearchEnabled, systemPrompt: systemPrompt ? '已设置' : '无', filesCount: files.length })
        
        // 添加 AI 消息占位符（用于显示流式内容）
        const aiMessageId = `ai_${Date.now()}`
        const aiMessage: Message = {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          model
        }
        get().addMessage(aiMessage)
        
        console.log('[useAIStore] 开始调用 API...')
        
        // 调用后端 API，传递配置 ID、深度思考标志、联网搜索标志、系统提示词和文件
        if (!configId) {
          console.error('[useAIStore] 缺少配置 ID，无法发送消息')
          get().updateLastMessage('❌ 发送失败: 缺少 API 配置')
          set({ isLoading: false, isGenerating: false, currentChunk: '' })
          return
        }
        
        const response = await window.pywebview.api.ai_send_message_with_config(
          topicId,
          content.trim(),
          configId,
          deepThinking,
          webSearchEnabled,
          systemPrompt,
          files
        )
        
        console.log('[useAIStore] API 调用完成，响应:', response)
        
        set({ isLoading: false })
        
        if (!response.success) {
          console.error('[useAIStore] 发送消息失败:', response.error_message)
          const messages = get().messages
          const lastMessage = messages[messages.length - 1]
          const existingContent = get().currentChunk || lastMessage?.content || ''
          if (existingContent.trim()) {
            get().updateLastMessage(`${existingContent}\n\n⚠️ 生成中断: ${response.error_message}`)
          } else {
            get().updateLastMessage(`❌ 发送失败: ${response.error_message}`)
          }
          set({ isGenerating: false, currentChunk: '' })
          return
        }
        
        // 消息发送成功，流式响应由事件监听器处理
        
        // 消息发送成功，流式响应由事件监听器处理
        // 注意：不要在这里设置 isGenerating，因为流式响应可能已经完成
        
      } catch (error) {
        console.error('[useAIStore] 发送消息异常:', error)
        const messages = get().messages
        const lastMessage = messages[messages.length - 1]
        const existingContent = get().currentChunk || lastMessage?.content || ''
        if (existingContent.trim()) {
          get().updateLastMessage(`${existingContent}\n\n⚠️ 生成中断: ${error}`)
        } else {
          get().updateLastMessage(`❌ 发送失败: ${error}`)
        }
        set({ 
          isLoading: false, 
          isGenerating: false, 
          currentChunk: '' 
        })
      }
    },
    
    /**
     * 停止 AI 生成
     * 
     * @param topicId 话题 ID
     */
    stopGeneration: async (topicId) => {
      try {
        console.log('[useAIStore] 停止生成:', topicId)
        
        // 开发环境直接停止
        if (isDevelopment()) {
          set({ isGenerating: false, currentChunk: '' })
          return
        }
        
        // 生产环境：调用后端 API
        const response = await window.pywebview.api.ai_stop_generation(topicId)
        
        if (response.success) {
          set({ isGenerating: false, currentChunk: '' })
          console.log('[useAIStore] 停止生成成功')
        } else {
          console.error('[useAIStore] 停止生成失败:', response.error_message)
        }
      } catch (error) {
        console.error('[useAIStore] 停止生成异常:', error)
        // 即使失败也停止前端的生成状态
        set({ isGenerating: false, currentChunk: '' })
      }
    },
    
    /**
     * 处理消息片段事件（内部方法）
     */
    _handleMessageChunk: (event: CustomEvent) => {
      const { topic_id, chunk, done } = event.detail
      
      // 只处理当前话题的消息
      if (topic_id !== get().currentTopicId) {
        return
      }
      
      if (done) {
        // 生成完成
        console.log('[useAIStore] 消息生成完成，最终内容长度:', get().currentChunk.length)
        set({ isGenerating: false, currentChunk: '' })
      } else {
        // 接收到新的文本片段
        // 如果这是第一个 chunk，设置 isGenerating = true
        if (!get().isGenerating) {
          set({ isGenerating: true })
          console.log('[useAIStore] 开始接收消息 chunks')
        }
        
        const currentContent = get().currentChunk + chunk
        console.log('[useAIStore] 接收 chunk，长度:', chunk.length, '累计长度:', currentContent.length)
        set({ currentChunk: currentContent })
        
        // 更新最后一条消息（AI 消息）
        get().updateLastMessage(currentContent)
      }
    },
    
    /**
     * 处理消息错误事件（内部方法）
     */
    _handleMessageError: (event: CustomEvent) => {
      const { topic_id, error } = event.detail
      
      // 只处理当前话题的错误
      if (topic_id !== get().currentTopicId) {
        return
      }
      
      console.log('[useAIStore] 处理错误事件:', error)
      
      const messages = get().messages
      const lastMessage = messages[messages.length - 1]
      const existingContent = get().currentChunk || lastMessage?.content || ''
      if (existingContent.trim()) {
        get().updateLastMessage(`${existingContent}\n\n⚠️ 生成中断: ${error}`)
      } else {
        get().updateLastMessage(`❌ 请求失败: ${error}`)
      }
      set({ isGenerating: false, currentChunk: '', isLoading: false })
    },
    
    /**
     * 初始化事件监听器（内部方法）
     */
    _initEventListener: initEventListener
  }
})
