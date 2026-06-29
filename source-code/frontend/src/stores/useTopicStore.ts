/**
 * 话题管理状态管理
 * 
 * 负责管理 AI 对话的话题，包括：
 * - 话题列表管理
 * - 创建、删除、重命名话题
 * - 当前话题切换
 * 
 * 验证需求：2.1, 2.2, 2.3, 2.4
 */

import { create } from 'zustand'

/**
 * 话题接口
 */
export interface Topic {
  id: string
  name: string
  created_at: string
  updated_at: string
  message_count?: number
}

/**
 * Topic Store 状态接口
 */
interface TopicStore {
  // 状态
  topics: Topic[]               // 话题列表
  currentTopicId: string | null // 当前选中的话题 ID
  isLoading: boolean            // 是否正在加载
  
  // Actions
  setTopics: (topics: Topic[]) => void
  setCurrentTopicId: (topicId: string | null) => void
  createTopic: (name?: string) => Promise<Topic | null>
  deleteTopic: (topicId: string) => Promise<boolean>
  renameTopic: (topicId: string, name: string) => Promise<boolean>
  loadTopics: () => Promise<void>
  
  // 辅助方法
  getCurrentTopic: () => Topic | null
}

/**
 * 检查是否在开发环境
 */
const isDevelopment = (): boolean => {
  return !window.pywebview || !window.pywebview.api
}

/**
 * Topic Store 实现
 */
export const useTopicStore = create<TopicStore>((set, get) => ({
  // 初始状态
  topics: [],
  currentTopicId: null,
  isLoading: false,
  
  /**
   * 设置话题列表
   */
  setTopics: (topics) => {
    set({ topics })
  },
  
  /**
   * 设置当前话题 ID
   * 验证需求：2.2（用户可以切换话题）
   */
  setCurrentTopicId: (topicId) => {
    console.log('[useTopicStore] 切换话题:', topicId)
    set({ currentTopicId: topicId })
  },
  
  /**
   * 创建新话题
   * 验证需求：2.1（用户可以创建新话题）
   * 
   * @param name 话题名称，默认为"新对话"
   * @returns 创建的话题对象，失败返回 null
   */
  createTopic: async (name = '新对话') => {
    try {
      console.log('[useTopicStore] 创建话题:', name)
      set({ isLoading: true })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        console.log('[useTopicStore] 开发环境：使用 Mock 创建')
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 生成 Mock 话题
        const mockTopic: Topic = {
          id: `topic_${Date.now()}`,
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message_count: 0
        }
        
        // 添加到话题列表（放在最前面）
        set((state) => ({
          topics: [mockTopic, ...state.topics],
          currentTopicId: mockTopic.id,
          isLoading: false
        }))
        
        console.log('[useTopicStore] Mock 话题创建成功:', mockTopic.id)
        return mockTopic
      }
      
      // 生产环境：调用后端 API
      console.log('[useTopicStore] 调用后端 API: ai_create_topic')
      const response = await window.pywebview.api.ai_create_topic(name)
      
      set({ isLoading: false })
      
      if (!response.success || !response.topic) {
        console.error('[useTopicStore] 创建话题失败:', response.error_message)
        return null
      }
      
      const newTopic = response.topic
      
      // 添加到话题列表（放在最前面）
      set((state) => ({
        topics: [newTopic, ...state.topics],
        currentTopicId: newTopic.id
      }))
      
      console.log('[useTopicStore] 话题创建成功:', newTopic.id)
      return newTopic
      
    } catch (error) {
      console.error('[useTopicStore] 创建话题异常:', error)
      set({ isLoading: false })
      return null
    }
  },
  
  /**
   * 删除话题
   * 验证需求：2.3（用户可以删除话题）
   * 如果删除后没有话题，自动创建一个空白话题
   * 
   * @param topicId 话题 ID
   * @returns 是否删除成功
   */
  deleteTopic: async (topicId) => {
    try {
      console.log('[useTopicStore] 删除话题:', topicId)
      set({ isLoading: true })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        console.log('[useTopicStore] 开发环境：使用 Mock 删除')
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const state = get()
        const topicIndex = state.topics.findIndex(t => t.id === topicId)
        
        if (topicIndex === -1) {
          console.error('[useTopicStore] 话题不存在:', topicId)
          set({ isLoading: false })
          return false
        }
        
        // 从列表中移除
        const newTopics = state.topics.filter(t => t.id !== topicId)
        
        set({
          topics: newTopics,
          isLoading: false
        })
        
        // 如果删除后没有话题，自动创建一个空白话题
        if (newTopics.length === 0) {
          console.log('[useTopicStore] 删除后没有话题，自动创建空白话题')
          const createTopicFn = get().createTopic
          await createTopicFn()
        } else if (state.currentTopicId === topicId) {
          // 如果删除的是当前话题，切换到第一个话题
          set({ currentTopicId: newTopics[0].id })
        }
        
        console.log('[useTopicStore] Mock 话题删除成功')
        return true
      }
      
      // 生产环境：调用后端 API
      console.log('[useTopicStore] 调用后端 API: ai_delete_topic')
      const response = await window.pywebview.api.ai_delete_topic(topicId)
      
      set({ isLoading: false })
      
      if (!response.success) {
        console.error('[useTopicStore] 删除话题失败:', response.error_message)
        return false
      }
      
      const state = get()
      
      // 从列表中移除
      const newTopics = state.topics.filter(t => t.id !== topicId)
      
      set({ topics: newTopics })
      
      // 如果删除后没有话题，自动创建一个空白话题
      if (newTopics.length === 0) {
        console.log('[useTopicStore] 删除后没有话题，自动创建空白话题')
        const createTopicFn = get().createTopic
        await createTopicFn()
      } else if (state.currentTopicId === topicId) {
        // 如果删除的是当前话题，切换到第一个话题
        set({ currentTopicId: newTopics[0].id })
      }
      
      console.log('[useTopicStore] 话题删除成功')
      return true
      
    } catch (error) {
      console.error('[useTopicStore] 删除话题异常:', error)
      set({ isLoading: false })
      return false
    }
  },
  
  /**
   * 重命名话题
   * 验证需求：2.4（用户可以重命名话题）
   * 
   * @param topicId 话题 ID
   * @param name 新名称
   * @returns 是否重命名成功
   */
  renameTopic: async (topicId, name) => {
    try {
      console.log('[useTopicStore] 重命名话题:', topicId, '→', name)
      
      // 验证输入
      if (!name || !name.trim()) {
        console.error('[useTopicStore] 话题名称不能为空')
        return false
      }
      
      set({ isLoading: true })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        console.log('[useTopicStore] 开发环境：使用 Mock 重命名')
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const state = get()
        const topicIndex = state.topics.findIndex(t => t.id === topicId)
        
        if (topicIndex === -1) {
          console.error('[useTopicStore] 话题不存在:', topicId)
          set({ isLoading: false })
          return false
        }
        
        // 更新话题名称
        const newTopics = [...state.topics]
        newTopics[topicIndex] = {
          ...newTopics[topicIndex],
          name: name.trim(),
          updated_at: new Date().toISOString()
        }
        
        set({
          topics: newTopics,
          isLoading: false
        })
        
        console.log('[useTopicStore] Mock 话题重命名成功')
        return true
      }
      
      // 生产环境：调用后端 API
      console.log('[useTopicStore] 调用后端 API: ai_rename_topic')
      const response = await window.pywebview.api.ai_rename_topic(topicId, name.trim())
      
      set({ isLoading: false })
      
      if (!response.success) {
        console.error('[useTopicStore] 重命名话题失败:', response.error_message)
        return false
      }
      
      const state = get()
      const topicIndex = state.topics.findIndex(t => t.id === topicId)
      
      if (topicIndex !== -1) {
        // 更新话题名称
        const newTopics = [...state.topics]
        newTopics[topicIndex] = {
          ...newTopics[topicIndex],
          name: name.trim(),
          updated_at: new Date().toISOString()
        }
        
        set({ topics: newTopics })
      }
      
      console.log('[useTopicStore] 话题重命名成功')
      return true
      
    } catch (error) {
      console.error('[useTopicStore] 重命名话题异常:', error)
      set({ isLoading: false })
      return false
    }
  },
  
  /**
   * 加载话题列表
   * 如果没有话题，自动创建一个空白话题
   * 
   * @returns Promise<void>
   */
  loadTopics: async () => {
    try {
      console.log('[useTopicStore] 加载话题列表')
      set({ isLoading: true })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        console.log('[useTopicStore] 开发环境：使用 Mock 数据')
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 生成一些 Mock 话题（模拟空话题列表场景）
        const mockTopics: Topic[] = []
        
        set({
          topics: mockTopics,
          isLoading: false
        })
        
        // 如果没有话题，自动创建一个空白话题
        if (mockTopics.length === 0) {
          console.log('[useTopicStore] 没有话题，自动创建空白话题')
          const createTopicFn = get().createTopic
          await createTopicFn()
        } else {
          set({ currentTopicId: mockTopics[0].id })
        }
        
        console.log('[useTopicStore] Mock 话题列表加载成功:', mockTopics.length)
        return
      }
      
      // 生产环境：调用后端 API
      console.log('[useTopicStore] 调用后端 API: ai_get_topics')
      const response = await window.pywebview.api.ai_get_topics()
      
      set({ isLoading: false })
      
      if (!response.success || !response.topics) {
        console.error('[useTopicStore] 加载话题列表失败:', response.error_message)
        return
      }
      
      const topics = response.topics
      
      set({ topics })
      
      // 如果没有话题，自动创建一个空白话题
      if (topics.length === 0) {
        console.log('[useTopicStore] 没有话题，自动创建空白话题')
        const createTopicFn = get().createTopic
        await createTopicFn()
      } else {
        set({ currentTopicId: topics[0].id })
      }
      
      console.log('[useTopicStore] 话题列表加载成功:', topics.length)
      
    } catch (error) {
      console.error('[useTopicStore] 加载话题列表异常:', error)
      set({ isLoading: false })
    }
  },
  
  /**
   * 获取当前话题对象
   * 
   * @returns 当前话题对象，如果没有则返回 null
   */
  getCurrentTopic: () => {
    const state = get()
    if (!state.currentTopicId) {
      return null
    }
    return state.topics.find(t => t.id === state.currentTopicId) || null
  }
}))
