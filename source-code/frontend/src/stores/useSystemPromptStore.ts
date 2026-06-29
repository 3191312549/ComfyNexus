/**
 * 系统提示词状态管理
 * 
 * 负责管理系统提示词预设，包括：
 * - 加载和保存预设
 * - 创建、更新、删除预设
 * - 管理对话级别的激活预设
 * - 初始化默认预设
 * 
 * 验证需求：2.1-2.7, 4.1-4.9, 7.1-7.6, 8.1-8.6
 */

import { create } from 'zustand'

/**
 * 系统提示词预设接口
 */
export interface SystemPromptPreset {
  id: string
  name: string
  content: string
  created_at: string
  updated_at: string
}

/**
 * 后端 API 预设响应接口（snake_case）
 */
interface SystemPromptPresetResponse {
  id: string
  name: string
  content: string
  created_at: string
  updated_at: string
}

/**
 * 预设输入接口（创建/更新时使用）
 */
export interface SystemPromptPresetInput {
  name: string
  content: string
}

/**
 * System Prompt Store 状态接口
 */
interface SystemPromptStore {
  // 状态
  presets: SystemPromptPreset[]                    // 预设列表
  activePresets: Map<string, string | null>        // topicId -> presetId 映射（null表示"无"）
  isLoading: boolean                               // 是否正在加载
  error: string | null                             // 错误信息
  
  // Actions
  loadPresets: () => Promise<void>
  createPreset: (data: SystemPromptPresetInput) => Promise<SystemPromptPreset | null>
  updatePreset: (presetId: string, data: SystemPromptPresetInput) => Promise<boolean>
  deletePreset: (presetId: string) => Promise<boolean>
  setActivePreset: (topicId: string, presetId: string | null) => Promise<boolean>
  getActivePreset: (topicId: string) => string | null
  getActivePresetContent: (topicId: string) => string | null
  initializeDefaultPreset: () => Promise<void>
  
  // 辅助方法
  clearError: () => void
}

/**
 * 检查是否在开发环境
 */
const isDevelopment = (): boolean => {
  return !window.pywebview || !window.pywebview.api
}

/**
 * 生成 Mock 预设数据（开发环境使用）
 */
const getMockPresets = (): SystemPromptPreset[] => {
  return [
    {
      id: 'mock-preset-1',
      name: 'ComfyUI专家',
      content: '# Role: ComfyUI 资深技术架构师 & 生成式 AI 专家\n\n你是一位精通 ComfyUI 操作的专家...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'mock-preset-2',
      name: '代码助手',
      content: '你是一位资深的软件工程师，擅长编写高质量的代码...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}

/**
 * System Prompt Store 实现
 */
export const useSystemPromptStore = create<SystemPromptStore>((set, get) => ({
  // 初始状态
  presets: [],
  activePresets: new Map(),
  isLoading: false,
  error: null,
  
  /**
   * 加载预设列表
   * 验证需求：4.1, 8.1
   * 
   * @returns Promise<void>
   */
  loadPresets: async () => {
    try {
      console.log('[useSystemPromptStore] 加载预设列表')
      set({ isLoading: true, error: null })
      
      // 开发环境使用 Mock 数据
      if (isDevelopment()) {
        console.log('[useSystemPromptStore] 开发环境：使用 Mock 数据')
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const mockPresets = getMockPresets()
        
        set({
          presets: mockPresets,
          isLoading: false
        })
        
        console.log('[useSystemPromptStore] Mock 预设加载成功，共', mockPresets.length, '个预设')
        return
      }
      
      // 生产环境：调用后端 API
      console.log('[useSystemPromptStore] 调用后端 API: ai_get_system_prompts')
      const response = await window.pywebview.api.ai_get_system_prompts()
      
      if (!response.success || !response.presets) {
        console.error('[useSystemPromptStore] 加载预设列表失败:', response.error_message)
        set({
          isLoading: false,
          error: response.error_message || '加载预设列表失败'
        })
        return
      }
      
      // 转换字段名（后端使用下划线，前端使用驼峰）
      const presets: SystemPromptPreset[] = (response.presets as SystemPromptPresetResponse[]).map((backendPreset) => ({
        id: backendPreset.id,
        name: backendPreset.name,
        content: backendPreset.content,
        created_at: backendPreset.created_at,
        updated_at: backendPreset.updated_at
      }))
      
      set({
        presets,
        isLoading: false
      })
      
      console.log('[useSystemPromptStore] 预设列表加载成功，共', presets.length, '个预设')
      
    } catch (error) {
      console.error('[useSystemPromptStore] 加载预设列表异常:', error)
      set({
        isLoading: false,
        error: `加载预设列表异常: ${error}`
      })
    }
  },
  
  /**
   * 创建新预设
   * 验证需求：4.2, 4.3, 10.1, 10.2, 10.3
   * 
   * @param data 预设输入数据
   * @returns Promise<SystemPromptPreset | null> 新创建的预设，失败返回 null
   */
  createPreset: async (data) => {
    try {
      console.log('[useSystemPromptStore] 创建新预设:', data.name)
      
      // 客户端验证
      if (!data.name || data.name.trim() === '') {
        const errorMsg = '预设名称不能为空'
        console.error('[useSystemPromptStore]', errorMsg)
        set({ error: errorMsg })
        return null
      }
      
      if (!data.content || data.content.trim() === '') {
        const errorMsg = '预设内容不能为空'
        console.error('[useSystemPromptStore]', errorMsg)
        set({ error: errorMsg })
        return null
      }
      
      // 检查名称是否重复
      const state = get()
      const nameExists = state.presets.some(p => p.name === data.name.trim())
      if (nameExists) {
        const errorMsg = '预设名称已存在'
        console.error('[useSystemPromptStore]', errorMsg)
        set({ error: errorMsg })
        return null
      }
      
      set({ isLoading: true, error: null })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        console.log('[useSystemPromptStore] 开发环境：使用 Mock 创建')
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 生成新预设
        const newPreset: SystemPromptPreset = {
          id: `mock-preset-${Date.now()}`,
          name: data.name.trim(),
          content: data.content.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        set({
          presets: [...state.presets, newPreset],
          isLoading: false
        })
        
        console.log('[useSystemPromptStore] Mock 预设创建成功:', newPreset.id)
        return newPreset
      }
      
      // 生产环境：调用后端 API
      console.log('[useSystemPromptStore] 调用后端 API: ai_create_system_prompt')
      const response = await window.pywebview.api.ai_create_system_prompt(
        data.name.trim(),
        data.content.trim()
      )
      
      if (!response.success || !response.preset) {
        console.error('[useSystemPromptStore] 创建预设失败:', response.error_message)
        set({
          isLoading: false,
          error: response.error_message || '创建预设失败'
        })
        return null
      }
      
      // 转换字段名
      const backendPreset = response.preset as SystemPromptPresetResponse
      const newPreset: SystemPromptPreset = {
        id: backendPreset.id,
        name: backendPreset.name,
        content: backendPreset.content,
        created_at: backendPreset.created_at,
        updated_at: backendPreset.updated_at
      }
      
      // 更新本地状态
      set({
        presets: [...state.presets, newPreset],
        isLoading: false
      })
      
      console.log('[useSystemPromptStore] 预设创建成功:', newPreset.id)
      return newPreset
      
    } catch (error) {
      console.error('[useSystemPromptStore] 创建预设异常:', error)
      set({
        isLoading: false,
        error: `创建预设异常: ${error}`
      })
      return null
    }
  },
  
  /**
   * 更新预设
   * 验证需求：4.5, 4.6, 10.1, 10.2
   * 
   * @param presetId 预设 ID
   * @param data 预设输入数据
   * @returns Promise<boolean> 是否更新成功
   */
  updatePreset: async (presetId, data) => {
    try {
      console.log('[useSystemPromptStore] 更新预设:', presetId)
      
      // 客户端验证
      if (!data.name || data.name.trim() === '') {
        const errorMsg = '预设名称不能为空'
        console.error('[useSystemPromptStore]', errorMsg)
        set({ error: errorMsg })
        return false
      }
      
      if (!data.content || data.content.trim() === '') {
        const errorMsg = '预设内容不能为空'
        console.error('[useSystemPromptStore]', errorMsg)
        set({ error: errorMsg })
        return false
      }
      
      set({ isLoading: true, error: null })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        console.log('[useSystemPromptStore] 开发环境：使用 Mock 更新')
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const state = get()
        const presetIndex = state.presets.findIndex(p => p.id === presetId)
        
        if (presetIndex === -1) {
          console.error('[useSystemPromptStore] 预设不存在:', presetId)
          set({
            isLoading: false,
            error: '预设不存在'
          })
          return false
        }
        
        // 更新预设
        const updatedPreset: SystemPromptPreset = {
          ...state.presets[presetIndex],
          name: data.name.trim(),
          content: data.content.trim(),
          updated_at: new Date().toISOString()
        }
        
        const newPresets = [...state.presets]
        newPresets[presetIndex] = updatedPreset
        
        set({
          presets: newPresets,
          isLoading: false
        })
        
        console.log('[useSystemPromptStore] Mock 预设更新成功')
        return true
      }
      
      // 生产环境：调用后端 API
      console.log('[useSystemPromptStore] 调用后端 API: ai_update_system_prompt')
      const response = await window.pywebview.api.ai_update_system_prompt(
        presetId,
        data.name.trim(),
        data.content.trim()
      )
      
      if (!response.success) {
        console.error('[useSystemPromptStore] 更新预设失败:', response.error_message)
        set({
          isLoading: false,
          error: response.error_message || '更新预设失败'
        })
        return false
      }
      
      // 重新加载预设列表以获取最新数据
      await get().loadPresets()
      
      console.log('[useSystemPromptStore] 预设更新成功')
      return true
      
    } catch (error) {
      console.error('[useSystemPromptStore] 更新预设异常:', error)
      set({
        isLoading: false,
        error: `更新预设异常: ${error}`
      })
      return false
    }
  },
  
  /**
   * 删除预设
   * 验证需求：4.7, 4.8, 4.9
   * 
   * @param presetId 预设 ID
   * @returns Promise<boolean> 是否删除成功
   */
  deletePreset: async (presetId) => {
    try {
      console.log('[useSystemPromptStore] 删除预设:', presetId)
      set({ isLoading: true, error: null })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        console.log('[useSystemPromptStore] 开发环境：使用 Mock 删除')
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const state = get()
        const presetExists = state.presets.some(p => p.id === presetId)
        
        if (!presetExists) {
          console.error('[useSystemPromptStore] 预设不存在:', presetId)
          set({
            isLoading: false,
            error: '预设不存在'
          })
          return false
        }
        
        // 删除预设
        const newPresets = state.presets.filter(p => p.id !== presetId)
        
        // 清除所有使用该预设的对话的激活预设
        const newActivePresets = new Map(state.activePresets)
        for (const [topicId, activePresetId] of newActivePresets.entries()) {
          if (activePresetId === presetId) {
            newActivePresets.set(topicId, null)  // 设置为"无"
          }
        }
        
        set({
          presets: newPresets,
          activePresets: newActivePresets,
          isLoading: false
        })
        
        console.log('[useSystemPromptStore] Mock 预设删除成功')
        return true
      }
      
      // 生产环境：调用后端 API
      console.log('[useSystemPromptStore] 调用后端 API: ai_delete_system_prompt')
      const response = await window.pywebview.api.ai_delete_system_prompt(presetId)
      
      if (!response.success) {
        console.error('[useSystemPromptStore] 删除预设失败:', response.error_message)
        set({
          isLoading: false,
          error: response.error_message || '删除预设失败'
        })
        return false
      }
      
      // 重新加载预设列表
      await get().loadPresets()
      
      // 清除所有使用该预设的对话的激活预设（本地缓存）
      const state = get()
      const newActivePresets = new Map(state.activePresets)
      for (const [topicId, activePresetId] of newActivePresets.entries()) {
        if (activePresetId === presetId) {
          newActivePresets.set(topicId, null)
        }
      }
      set({ activePresets: newActivePresets })
      
      console.log('[useSystemPromptStore] 预设删除成功')
      return true
      
    } catch (error) {
      console.error('[useSystemPromptStore] 删除预设异常:', error)
      set({
        isLoading: false,
        error: `删除预设异常: ${error}`
      })
      return false
    }
  },
  
  /**
   * 设置对话的激活预设
   * 验证需求：2.3, 2.4, 2.6, 8.4, 8.5
   * 
   * @param topicId 对话 ID
   * @param presetId 预设 ID（null表示"无"）
   * @returns Promise<boolean> 是否设置成功
   */
  setActivePreset: async (topicId, presetId) => {
    try {
      console.log('[useSystemPromptStore] 设置激活预设:', topicId, '->', presetId || '无')
      set({ isLoading: true, error: null })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        console.log('[useSystemPromptStore] 开发环境：使用 Mock 设置')
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const state = get()
        
        // 如果presetId不为null，验证预设是否存在
        if (presetId !== null) {
          const presetExists = state.presets.some(p => p.id === presetId)
          if (!presetExists) {
            console.error('[useSystemPromptStore] 预设不存在:', presetId)
            set({
              isLoading: false,
              error: '预设不存在'
            })
            return false
          }
        }
        
        // 更新激活预设映射
        const newActivePresets = new Map(state.activePresets)
        newActivePresets.set(topicId, presetId)
        
        set({
          activePresets: newActivePresets,
          isLoading: false
        })
        
        console.log('[useSystemPromptStore] Mock 激活预设设置成功')
        return true
      }
      
      // 生产环境：调用后端 API
      console.log('[useSystemPromptStore] 调用后端 API: ai_set_active_system_prompt')
      const response = await window.pywebview.api.ai_set_active_system_prompt(topicId, presetId)
      
      if (!response.success) {
        console.error('[useSystemPromptStore] 设置激活预设失败:', response.error_message)
        set({
          isLoading: false,
          error: response.error_message || '设置激活预设失败'
        })
        return false
      }
      
      // 更新本地缓存
      const state = get()
      const newActivePresets = new Map(state.activePresets)
      newActivePresets.set(topicId, presetId)
      
      set({
        activePresets: newActivePresets,
        isLoading: false
      })
      
      console.log('[useSystemPromptStore] 激活预设设置成功')
      return true
      
    } catch (error) {
      console.error('[useSystemPromptStore] 设置激活预设异常:', error)
      set({
        isLoading: false,
        error: `设置激活预设异常: ${error}`
      })
      return false
    }
  },
  
  /**
   * 获取对话的激活预设ID
   * 验证需求：2.1, 2.2, 8.6
   * 
   * @param topicId 对话 ID
   * @returns string | null 预设ID，null表示"无"
   */
  getActivePreset: (topicId) => {
    const state = get()
    
    // 先从缓存中获取
    if (state.activePresets.has(topicId)) {
      const presetId = state.activePresets.get(topicId)
      console.log('[useSystemPromptStore] 从缓存获取激活预设:', topicId, '->', presetId || '无')
      return presetId || null
    }
    
    // 缓存未命中，异步加载（仅在生产环境且API可用时）
    if (!isDevelopment() && window.pywebview?.api?.ai_get_active_system_prompt) {
      window.pywebview.api.ai_get_active_system_prompt(topicId).then((response: any) => {
        if (response.success) {
          const presetId = response.preset_id || null
          console.log('[useSystemPromptStore] 从后端获取激活预设:', topicId, '->', presetId || '无')
          
          // 更新缓存
          const newActivePresets = new Map(state.activePresets)
          newActivePresets.set(topicId, presetId)
          set({ activePresets: newActivePresets })
        }
      }).catch((error: any) => {
        console.error('[useSystemPromptStore] 获取激活预设失败:', error)
      })
    }
    
    // 返回 null（异步加载中或开发环境）
    console.log('[useSystemPromptStore] 激活预设未缓存，返回null:', topicId)
    return null
  },
  
  /**
   * 获取对话的激活预设内容
   * 验证需求：7.1, 7.2, 7.3
   * 
   * @param topicId 对话 ID
   * @returns string | null 预设内容，null表示"无"或未找到
   */
  getActivePresetContent: (topicId) => {
    const state = get()
    
    // 获取激活预设ID
    const presetId = get().getActivePreset(topicId)
    
    // 如果没有激活预设，返回null
    if (!presetId) {
      console.log('[useSystemPromptStore] 对话无激活预设:', topicId)
      return null
    }
    
    // 从预设列表中查找
    const preset = state.presets.find(p => p.id === presetId)
    
    if (!preset) {
      console.warn('[useSystemPromptStore] 激活预设不存在:', presetId)
      return null
    }
    
    console.log('[useSystemPromptStore] 获取激活预设内容:', topicId, '->', preset.name)
    return preset.content
  },
  
  /**
   * 初始化默认预设
   * 验证需求：11.1, 11.2, 11.3, 11.4, 11.5
   * 
   * 仅在首次启动且没有任何预设时创建"ComfyUI专家"默认预设
   * 
   * @returns Promise<void>
   */
  initializeDefaultPreset: async () => {
    try {
      console.log('[useSystemPromptStore] 检查是否需要初始化默认预设')
      
      // 先加载预设列表
      await get().loadPresets()
      
      const state = get()
      
      // 如果已有预设，不创建默认预设
      if (state.presets.length > 0) {
        console.log('[useSystemPromptStore] 已有预设，跳过默认预设初始化')
        return
      }
      
      console.log('[useSystemPromptStore] 创建默认预设：ComfyUI专家')
      
      const defaultPresetContent = `# Role: ComfyUI 资深技术架构师 & 生成式 AI 专家

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

    *   若是**报错**，首先要求用户提供终端（Console）红字报错信息或 \`comfyui.log\`。

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

我已经准备好协助您解决 ComfyUI 相关的一切问题。请告诉我您遇到了什么错误，或者需要设计什么样的工作流？`
      
      // 创建默认预设
      await get().createPreset({
        name: 'ComfyUI专家',
        content: defaultPresetContent
      })
      
      console.log('[useSystemPromptStore] 默认预设创建成功')
      
    } catch (error) {
      console.error('[useSystemPromptStore] 初始化默认预设异常:', error)
      // 不抛出错误，允许应用继续运行
    }
  },
  
  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null })
    console.log('[useSystemPromptStore] 错误信息已清除')
  }
}))
