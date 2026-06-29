/**
 * 进程管理状态
 */

import { create } from 'zustand'
import { toast } from '@/utils/toast'
import i18n from '@/i18n'
import { router } from '@/router'
import type { ComfyUIStatus } from '@/types/home'
import type { ConflictProcess } from '@/types/process'

export interface ProcessStatus {
  isRunning: boolean
  pid?: number
  port?: number
  uptime?: number
  url?: string
}

interface ProcessStore {
  // 原有状态
  status: ProcessStatus
  logs: string[]
  loading: boolean
  isStarting: boolean // 新增：是否正在启动
  isStopping: boolean // 新增：是否正在停止（用户主动停止）
  isRestarting: boolean // 新增：是否正在重启
  
  // 新增状态 - ComfyUI 详细状态
  comfyUIStatus: ComfyUIStatus | null
  
  // 新增状态 - 启动后操作标记
  hasHandledStartupAction: boolean  // 是否已经处理过启动后操作
  
  // 新增状态 - 是否显示 iframe
  showWorkspaceIframe: boolean  // 是否显示工作台 iframe
  startedFromWorkspace: boolean  // 是否从工作台页面启动的
  
  // 新增状态 - 进程冲突检测 (任务 5.1)
  conflictProcesses: ConflictProcess[]   // 冲突进程列表
  showConflictDialog: boolean            // 是否显示冲突对话框
  hasPortConflict: boolean               // 是否存在端口冲突
  targetPort: number                     // 目标端口
  
  // 新增状态 - 轮询清理
  pollTimeoutId: ReturnType<typeof setTimeout> | null  // 轮询 timeout ID
  
  // 原有方法
  setStatus: (status: ProcessStatus) => void
  setLogs: (logs: string[]) => void
  addLog: (log: string) => void
  clearLogs: () => void
  setLoading: (loading: boolean) => void
  setStarting: (isStarting: boolean) => void // 新增：设置启动状态
  setRestarting: (isRestarting: boolean) => void // 新增：设置重启状态
  
  // 新增方法 - 工作台 iframe 显示控制
  setShowWorkspaceIframe: (value: boolean) => void
  setStartedFromWorkspace: (value: boolean) => void
  
  // 新增方法 - ComfyUI 操作
  loadComfyUIStatus: () => Promise<void>
  openComfyUI: () => Promise<void>
  startComfyUI: () => Promise<void>
  startComfyUIAndOpenBrowser: () => Promise<void>  // 启动 ComfyUI 并在浏览器中打开
  stopComfyUI: () => Promise<void>  // 停止 ComfyUI
  performStartComfyUI: () => Promise<void>  // 内部方法：执行实际的启动操作
  handleStartupAction: (url: string) => Promise<void>  // 处理启动后操作
  
  // 新增方法 - 进程冲突检测 (任务 5.2, 5.3, 5.5)
  checkProcessConflict: () => Promise<boolean>  // 检查进程冲突
  killConflictProcesses: () => Promise<void>    // 结束冲突进程
  handleKillProcesses: () => Promise<void>      // 处理结束进程操作
  handleContinue: () => Promise<void>           // 处理继续启动操作
  handleCancel: () => void                      // 处理取消操作
  setShowConflictDialog: (show: boolean) => void
}

/**
 * 检查是否在开发环境
 */
const isDevelopment = (): boolean => {
  return !window.pywebview || !window.pywebview.api
}

export const useProcessStore = create<ProcessStore>((set, get) => ({
  // 原有状态
  status: { isRunning: false },
  logs: [],
  loading: false,
  isStarting: false, // 新增
  isStopping: false, // 新增
  isRestarting: false, // 新增
  
  // 新增状态
  comfyUIStatus: null,
  
  // 新增状态 - 启动后操作标记
  hasHandledStartupAction: false,
  
  // 新增状态 - 是否显示 iframe
  showWorkspaceIframe: false,
  startedFromWorkspace: false,
  
  // 新增状态 - 进程冲突检测 (任务 5.1)
  conflictProcesses: [],
  showConflictDialog: false,
  hasPortConflict: false,
  targetPort: 8188, // 默认端口
  
  // 轮询清理
  pollTimeoutId: null,
  
  // 原有方法
  setStatus: (status) => set({ status }),
  setLogs: (logs) => set({ logs }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  clearLogs: () => set({ logs: [] }),
  setLoading: (loading) => set({ loading }),
  setStarting: (isStarting) => set({ isStarting }), // 新增
  setRestarting: (isRestarting) => set({ isRestarting }), // 新增
  setShowConflictDialog: (show) => set({ showConflictDialog: show }),
  setShowWorkspaceIframe: (value) => set({ showWorkspaceIframe: value }), // 新增
  setStartedFromWorkspace: (value) => set({ startedFromWorkspace: value }), // 新增
  
  /**
   * 检查进程冲突 (任务 5.2)
   * 
   * @returns 是否存在冲突
   */
  checkProcessConflict: async () => {
    try {
      const isDev = isDevelopment()
      console.log(`[useProcessStore] 当前环境: ${isDev ? '开发环境 (使用 Mock)' : '生产环境 (调用后端 API)'}`)
      console.log(`[useProcessStore] window.pywebview 存在: ${!!window.pywebview}`)
      console.log(`[useProcessStore] window.pywebview.api 存在: ${!!window.pywebview?.api}`)
      
      if (isDev) {
        // 开发环境：使用 Mock API
        const { checkComfyUIProcesses } = await import('@/mocks/process')
        const response = await checkComfyUIProcesses()
        
        console.log('[useProcessStore] 开发环境检查进程冲突:', response)
        
        if (!response.success) {
          console.error('[useProcessStore] 进程检测失败:', response.error)
          return false
        }
        
        const { processes, has_conflict, target_port } = response.data
        
        if (processes.length === 0) {
          console.log('[useProcessStore] 未检测到冲突进程')
          return false
        }
        
        console.log(`[useProcessStore] 检测到 ${processes.length} 个冲突进程，端口冲突: ${has_conflict}`)
        
        // 保存冲突信息
        set({
          conflictProcesses: processes,
          hasPortConflict: has_conflict,
          targetPort: target_port
        })
        
        return true
      } else {
        // 生产环境：调用后端 API
        console.log('[useProcessStore] 调用后端 API: check_comfyui_processes')
        const response = await window.pywebview.api.check_comfyui_processes()
        console.log('[useProcessStore] 后端 API 响应:', response)
        
        if (!response.success) {
          // 检测失败，记录日志但不阻止启动
          console.error('[useProcessStore] 进程检测失败:', response.error)
          return false
        }
        
        const { processes, has_conflict, target_port } = response.data
        
        if (processes.length === 0) {
          console.log('[useProcessStore] 未检测到冲突进程')
          return false
        }
        
        console.log(`[useProcessStore] 检测到 ${processes.length} 个冲突进程，端口冲突: ${has_conflict}`)
        
        // 保存冲突信息
        set({
          conflictProcesses: processes,
          hasPortConflict: has_conflict,
          targetPort: target_port
        })
        
        return true
      }
    } catch (error) {
      console.error('[useProcessStore] 进程检测异常:', error)
      // 记录堆栈信息
      if (error instanceof Error && error.stack) {
        console.error('[useProcessStore] 异常堆栈:', error.stack)
      }
      return false
    }
  },
  
  /**
   * 结束冲突进程 (任务 5.3)
   */
  killConflictProcesses: async () => {
    const { conflictProcesses } = get()
    
    try {
      console.log(`[useProcessStore] 开始终止 ${conflictProcesses.length} 个冲突进程`)
      
      if (isDevelopment()) {
        // 开发环境：使用 Mock API
        const { killProcess } = await import('@/mocks/process')
        
        for (const proc of conflictProcesses) {
          console.log(`[useProcessStore] Killing process: PID=${proc.pid}`)
          const response = await killProcess(proc.pid)
          
          if (!response.success) {
            const errorMsg = i18n.t('process.killFailed', { pid: proc.pid, error: response.error })
            console.error(`[useProcessStore] ${errorMsg}`)
            toast.error(errorMsg)
            throw new Error(errorMsg)
          }
        }
        
        console.log('[useProcessStore] Dev environment: successfully terminated all conflict processes')
      } else {
        // 生产环境：调用后端 API
        for (const proc of conflictProcesses) {
          console.log(`[useProcessStore] Killing process: PID=${proc.pid}`)
          const response = await window.pywebview.api.kill_process(proc.pid)
          
          if (!response.success) {
            const errorMsg = i18n.t('process.killFailed', { pid: proc.pid, error: response.error })
            console.error(`[useProcessStore] ${errorMsg}`)
            toast.error(errorMsg)
            throw new Error(errorMsg)
          }
        }
        
        console.log('[useProcessStore] Successfully terminated all conflict processes')
      }
      
      // 关闭对话框，清空冲突进程列表
      set({ 
        showConflictDialog: false, 
        conflictProcesses: [],
        hasPortConflict: false
      })
      
      // 显示成功提示
      toast.success(i18n.t('process.killSuccess'))
      
      // 继续启动 ComfyUI
      await get().performStartComfyUI()
      
    } catch (error) {
      console.error('[useProcessStore] Failed to terminate process:', error)
      // 记录堆栈信息
      if (error instanceof Error && error.stack) {
        console.error('[useProcessStore] 异常堆栈:', error.stack)
      }
      throw error
    }
  },
  
  /**
   * 处理结束进程操作 (任务 5.5)
   */
  handleKillProcesses: async () => {
    try {
      set({ loading: true })
      await get().killConflictProcesses()
    } catch (error) {
      console.error('[useProcessStore] 处理结束进程失败:', error)
      // Toast 已在 killConflictProcesses 中显示
      throw error
    } finally {
      set({ loading: false })
    }
  },
  
  /**
   * 处理继续启动操作 (任务 5.5)
   */
  handleContinue: async () => {
    try {
      // 关闭对话框
      set({ showConflictDialog: false })
      
      // 强制启动（忽略冲突）
      await get().performStartComfyUI()
    } catch (error) {
      console.error('[useProcessStore] 处理继续启动失败:', error)
      throw error
    }
  },
  
  /**
   * 处理取消操作 (任务 5.5)
   */
  handleCancel: () => {
    // 关闭对话框，清空状态，终止启动
    set({ 
      showConflictDialog: false,
      conflictProcesses: [],
      hasPortConflict: false,
      loading: false,
      isStarting: false
    })
  },
  
  /**
   * 加载 ComfyUI 运行状态
   */
  loadComfyUIStatus: async () => {
    set({ loading: true })
    
    try {
      let comfyUIStatus: ComfyUIStatus

      if (isDevelopment()) {
        // 开发环境：使用 Mock API
        const { getComfyUIStatus } = await import('@/mocks/home')
        comfyUIStatus = await getComfyUIStatus()
        console.log('[useProcessStore] 开发环境加载 ComfyUI 状态:', comfyUIStatus)
      } else {
        // 生产环境：调用后端 API
        const response = await window.pywebview.api.get_comfyui_status()
        
        console.log('[useProcessStore] 后端 API 响应:', response)
        
        if (!response.success || !response.data) {
          throw new Error(response.error_message || '获取 ComfyUI 状态失败')
        }
        
        comfyUIStatus = response.data
        console.log('[useProcessStore] comfyUIStatus:', comfyUIStatus)
        console.log('[useProcessStore] portAvailable:', comfyUIStatus.portAvailable)
      }

      // 检查是否是首次检测到启动成功（从启动中状态变为运行状态）
      const wasStarting = get().isStarting
      const isNowRunning = comfyUIStatus.isRunning
      
      console.log('[useProcessStore] loadComfyUIStatus - wasStarting:', wasStarting, 'isNowRunning:', isNowRunning)
      
      // 更新 comfyUIStatus
      set({ comfyUIStatus, loading: false })
      
      // 同步更新 status（保持向后兼容）
      set({
        status: {
          isRunning: comfyUIStatus.isRunning,
          pid: comfyUIStatus.pid,
          port: comfyUIStatus.port,
          uptime: comfyUIStatus.uptime,
          url: comfyUIStatus.url
        }
      })
      
      // 根据实际运行状态更新启动中标记
      // 只有在进程已经运行时，才清除启动中状态（启动成功）
      // 如果进程未运行，保持启动中状态，让用户可以停止启动过程
      if (comfyUIStatus.isRunning) {
        console.log('[useProcessStore] ComfyUI 正在运行，wasStarting:', wasStarting)
        set({ isStarting: false })
        
        // 如果是首次检测到启动成功，执行启动后操作
        if (wasStarting && isNowRunning && comfyUIStatus.url) {
          console.log('[useProcessStore] 检测到 ComfyUI 启动成功，执行启动后操作')
          await get().handleStartupAction(comfyUIStatus.url)
        } else {
          console.log('[useProcessStore] 不执行启动后操作 - wasStarting:', wasStarting, 'isNowRunning:', isNowRunning, 'url:', comfyUIStatus.url)
        }
      }
    } catch (error) {
      console.error('[useProcessStore] 加载 ComfyUI 状态失败:', error)
      
      // 设置默认状态
      const defaultStatus: ComfyUIStatus = { isRunning: false }
      set({
        comfyUIStatus: defaultStatus,
        status: { isRunning: false },
        loading: false
      })
    }
  },
  
  /**
   * 在浏览器中打开 ComfyUI
   */
  openComfyUI: async () => {
    const { comfyUIStatus } = get()
    
    // 检查运行状态
    if (!comfyUIStatus || !comfyUIStatus.isRunning) {
      throw new Error(i18n.t('process.notRunning'))
    }
    
    try {
      if (isDevelopment()) {
        // 开发环境：使用 Mock API
        const { openComfyUI } = await import('@/mocks/home')
        await openComfyUI()
        console.log('[useProcessStore] 开发环境打开 ComfyUI')
      } else {
        // 生产环境：调用后端 API
        const response = await window.pywebview.api.open_comfyui()
        
        if (!response.success) {
          throw new Error(response.error_message || i18n.t('process.openFailed'))
        }
      }
    } catch (error) {
      console.error('[useProcessStore] 打开 ComfyUI 失败:', error)
      throw error
    }
  },
  
  /**
   * 启动 ComfyUI 进程 (任务 5.4 - 修改为包含冲突检测)
   */
  startComfyUI: async () => {
    // 重置启动后操作标记，允许新的启动操作执行启动后动作
    set({ hasHandledStartupAction: false, loading: true, isStarting: true })
    
    try {
      // 1. 检查进程冲突
      const hasConflict = await get().checkProcessConflict()
      
      if (hasConflict) {
        // 显示冲突对话框，等待用户操作
        set({ showConflictDialog: true, loading: false })
        return
      }
      
      // 2. 无冲突，继续启动
      await get().performStartComfyUI()
      
    } catch (error) {
      console.error('[useProcessStore] 启动失败:', error)
      set({ loading: false, isStarting: false })
      throw error
    }
  },
  
  /**
   * 执行实际的启动操作（内部方法）
   */
  performStartComfyUI: async () => {
    try {
      // 启动前清空日志（通过自定义事件通知 TerminalPage）
      console.log('[useProcessStore] 启动 ComfyUI，触发清屏事件')
      window.dispatchEvent(new CustomEvent('comfyui:clear-logs'))
      
      if (isDevelopment()) {
        // 开发环境：使用 Mock API
        const { startComfyUI } = await import('@/mocks/home')
        await startComfyUI()
        console.log('[useProcessStore] 开发环境启动 ComfyUI')
        
        // 模拟启动过程（延迟 3 秒）
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 模拟启动后的状态
        const mockStatus: ComfyUIStatus = {
          isRunning: true,
          pid: 12345,
          port: 8188,
          portAvailable: true,
          uptime: 0,
          url: 'http://127.0.0.1:8188'
        }
        
        // 只有从工作台页面启动时才自动显示 iframe
        const shouldShowIframe = get().startedFromWorkspace
        const wasRestarting = get().isRestarting
        
        set({
          comfyUIStatus: mockStatus,
          status: {
            isRunning: true,
            pid: 12345,
            port: 8188,
            uptime: 0,
            url: 'http://127.0.0.1:8188'
          },
          loading: false,
          isStarting: false,
          isRestarting: false,
          showWorkspaceIframe: shouldShowIframe,
          startedFromWorkspace: false  // 重置标记
        })
        
        // 如果是重启操作，显示重启成功提示
        if (wasRestarting) {
          toast.success(i18n.t('titleBar.comfyui.restarted'))
        }
        
        // 开发环境也处理启动后操作
        if (mockStatus.url) {
          await get().handleStartupAction(mockStatus.url)
        }
      } else {
        // 生产环境：调用后端 API
        // 获取当前环境 ID
        const { useEnvStore } = await import('@/stores/useEnvStore')
        const currentEnvId = useEnvStore.getState().currentEnvId
        
        if (!currentEnvId) {
          set({ isStarting: false, loading: false })
          throw new Error(i18n.t('process.noEnvSelected'))
        }
        
        const response = await window.pywebview.api.start_comfyui(currentEnvId)
        
        if (!response.success) {
          set({ isStarting: false, loading: false })
          throw new Error(response.error_message || i18n.t('process.startFailed'))
        }
        
        // 启动命令已发送，保持 isStarting 状态
        // 轮询会自动检测服务状态，并在服务运行后清除 isStarting
        set({ loading: false })
        
        // 启动后立即开始轮询检测状态，直到服务启动成功
        console.log('[useProcessStore] 开始轮询检测 ComfyUI 状态')
        const maxAttempts = 60 // 最多尝试 60 次（2 分钟）
        let attempts = 0
        
        const pollStatus = async () => {
          attempts++
          console.log(`[useProcessStore] 轮询检测状态 (${attempts}/${maxAttempts})`)
          
          try {
            const statusResponse = await window.pywebview.api.get_comfyui_status()
            
            if (statusResponse.success && statusResponse.data) {
              const { isRunning, wasStarted, processAlive, exitCode: _exitCode } = statusResponse.data
              
              if (isRunning) {
                console.log('[useProcessStore] 检测到 ComfyUI 已启动成功')
                
                // 只有从工作台页面启动时才自动显示 iframe
                const shouldShowIframe = get().startedFromWorkspace
                const wasRestarting = get().isRestarting
                
                // 更新状态
                set({
                  comfyUIStatus: statusResponse.data,
                  status: {
                    isRunning: statusResponse.data.isRunning,
                    pid: statusResponse.data.pid,
                    port: statusResponse.data.port,
                    uptime: statusResponse.data.uptime,
                    url: statusResponse.data.url
                  },
                  isStarting: false,
                  isRestarting: false,
                  showWorkspaceIframe: shouldShowIframe,
                  startedFromWorkspace: false,  // 重置标记
                  pollTimeoutId: null  // 清理轮询 timeout
                })
                
                // 如果是重启操作，显示重启成功提示
                if (wasRestarting) {
                  toast.success(i18n.t('titleBar.comfyui.restarted'))
                }
                
                // 执行启动后操作
                if (statusResponse.data.url) {
                  console.log('[useProcessStore] 执行启动后操作')
                  await get().handleStartupAction(statusResponse.data.url)
                }
                
                return true // 启动成功
              }
              
              // 检测进程是否已启动但崩溃
              if (wasStarted && !processAlive) {
                console.error('[useProcessStore] ComfyUI 进程已退出')
                console.error('[useProcessStore] 退出码:', _exitCode)
                
                // 检查是否是用户主动停止
                const wasStopping = get().isStopping
                
                set({ 
                  isStarting: false, 
                  isStopping: false,
                  loading: false,
                  comfyUIStatus: statusResponse.data,
                  pollTimeoutId: null  // 清理轮询 timeout
                })
                
                // 如果是用户主动停止，不显示错误提示
                if (wasStopping) {
                  console.log('[useProcessStore] 用户主动停止，不显示错误提示')
                  return true // 停止轮询
                }
                
                // 触发重新加载日志事件，确保终端页面显示完整日志（包括后端写入的启动失败提示）
                window.dispatchEvent(new CustomEvent('comfyui:reload-logs'))
                
                // 显示错误提示
                toast.error(i18n.t('process.startupFailed'))
                
                return true // 停止轮询，启动失败
              }
            }
            
            // 检查是否超时
            if (attempts >= maxAttempts) {
              console.error('[useProcessStore] 轮询超时，ComfyUI 可能启动失败')
              set({ isStarting: false, loading: false, pollTimeoutId: null })
              return true // 停止轮询
            }
            
            // 继续轮询
            const timeoutId = setTimeout(pollStatus, 2000)
            set({ pollTimeoutId: timeoutId })
            return false
          } catch (error) {
            console.error('[useProcessStore] 轮询状态失败:', error)
            if (attempts >= maxAttempts) {
              set({ isStarting: false, loading: false, pollTimeoutId: null })
              return true
            } else {
              const timeoutId = setTimeout(pollStatus, 2000)
              set({ pollTimeoutId: timeoutId })
              return false
            }
          }
        }
        
        // 延迟 2 秒后开始第一次轮询（给 ComfyUI 一些启动时间）
        const initialTimeoutId = setTimeout(pollStatus, 2000)
        set({ pollTimeoutId: initialTimeoutId })
      }
    } catch (error) {
      console.error('[useProcessStore] 执行启动失败:', error)
      set({ loading: false, isStarting: false })
      throw error
    }
  },
  
  /**
   * 处理启动后操作（根据系统设置）
   */
  handleStartupAction: async (url: string) => {
    try {
      const { hasHandledStartupAction } = get()
      
      // 防止重复调用：如果已经处理过启动后操作，直接返回
      if (hasHandledStartupAction) {
        console.log('[useProcessStore] 启动后操作已处理，跳过重复调用')
        return
      }
      
      // 标记已处理启动后操作
      set({ hasHandledStartupAction: true })
      
      // 获取系统设置
      const { useSettingsStore } = await import('@/stores/useSettingsStore')
      const settingsState = useSettingsStore.getState()
      const startupAction = settingsState.systemSettings.comfyuiStartupAction || 'workspace'
      
      console.log('[useProcessStore] ===== 启动后操作开始 =====')
      console.log('[useProcessStore] URL:', url)
      console.log('[useProcessStore] 系统设置:', settingsState.systemSettings)
      console.log('[useProcessStore] 启动后操作配置:', startupAction)
      console.log('[useProcessStore] 是否开发环境:', isDevelopment())
      
      if (startupAction === 'browser') {
        // 在默认浏览器打开
        console.log('[useProcessStore] 执行操作：在浏览器中打开')
        
        if (isDevelopment()) {
          // 开发环境：直接使用 window.open
          console.log('[useProcessStore] 开发环境：使用 window.open')
          window.open(url, '_blank')
        } else {
          // 生产环境：调用后端 API 在系统默认浏览器中打开
          console.log('[useProcessStore] 生产环境：调用后端 API open_url')
          try {
            const response = await window.pywebview.api.open_url(url)
            console.log('[useProcessStore] 后端 API 响应:', response)
            if (!response.success) {
              console.error('[useProcessStore] 打开浏览器失败:', response.error)
              toast.error(i18n.t('process.openBrowserFailed') + ': ' + (response.error || i18n.t('process.unknownError')))
            } else {
              console.log('[useProcessStore] 成功在浏览器中打开')
            }
          } catch (error) {
            console.error('[useProcessStore] 调用 open_url API 失败:', error)
            if (error instanceof Error) {
              console.error('[useProcessStore] 错误详情:', error.message, error.stack)
            }
            toast.error(i18n.t('process.apiCallFailed'))
          }
        }
      } else if (startupAction === 'workspace') {
        // 在工作台打开：延迟后导航到工作台页面并显示 iframe
        console.log('[useProcessStore] 执行操作：在工作台打开（延迟 2 秒）')
        setTimeout(() => {
          set({ showWorkspaceIframe: true })
          router.navigate('/workspace')
        }, 2000)
      } else if (startupAction === 'none') {
        // 什么也不做
        console.log('[useProcessStore] 执行操作：什么也不做')
      }
      
      console.log('[useProcessStore] ===== 启动后操作结束 =====')
    } catch (error) {
      console.error('[useProcessStore] 处理启动后操作失败:', error)
      if (error instanceof Error && error.stack) {
        console.error('[useProcessStore] 错误堆栈:', error.stack)
      }
    }
  },
  
  /**
   * 启动 ComfyUI 并在浏览器中打开
   * 此方法会强制在浏览器中打开，覆盖系统设置
   */
  startComfyUIAndOpenBrowser: async () => {
    try {
      // 重置标记，允许新的启动操作执行启动后动作
      set({ 
        hasHandledStartupAction: false, 
        loading: true, 
        isStarting: true,
        startedFromWorkspace: false  // 不在工作台显示 iframe
      })
      
      // 1. 检查进程冲突
      const hasConflict = await get().checkProcessConflict()
      
      if (hasConflict) {
        // 显示冲突对话框，等待用户操作
        set({ showConflictDialog: true, loading: false })
        return
      }
      
      // 2. 无冲突，继续启动
      // 启动前清空日志
      console.log('[useProcessStore] 启动 ComfyUI（浏览器模式），触发清屏事件')
      window.dispatchEvent(new CustomEvent('comfyui:clear-logs'))
      
      if (isDevelopment()) {
        // 开发环境：使用 Mock API
        const { startComfyUI } = await import('@/mocks/home')
        await startComfyUI()
        console.log('[useProcessStore] 开发环境启动 ComfyUI（浏览器模式）')
        
        // 模拟启动过程（延迟 3 秒）
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 模拟启动后的状态
        const mockStatus: ComfyUIStatus = {
          isRunning: true,
          pid: 12345,
          port: 8188,
          portAvailable: true,
          uptime: 0,
          url: 'http://127.0.0.1:8188'
        }
        
        set({
          comfyUIStatus: mockStatus,
          status: {
            isRunning: true,
            pid: 12345,
            port: 8188,
            uptime: 0,
            url: 'http://127.0.0.1:8188'
          },
          loading: false,
          isStarting: false,
          isRestarting: false,
          showWorkspaceIframe: false,
          startedFromWorkspace: false
        })
        
        // 在浏览器中打开
        console.log('[useProcessStore] 开发环境：使用 window.open')
        window.open(mockStatus.url!, '_blank')
      } else {
        // 生产环境：调用后端 API
        const { useEnvStore } = await import('@/stores/useEnvStore')
        const currentEnvId = useEnvStore.getState().currentEnvId
        
        if (!currentEnvId) {
          set({ isStarting: false, loading: false })
          throw new Error(i18n.t('process.noEnvSelected'))
        }
        
        const response = await window.pywebview.api.start_comfyui(currentEnvId)
        
        if (!response.success) {
          set({ isStarting: false, loading: false })
          throw new Error(response.error_message || i18n.t('process.startFailed'))
        }
        
        set({ loading: false })
        
        // 启动后立即开始轮询检测状态
        console.log('[useProcessStore] 开始轮询检测 ComfyUI 状态（浏览器模式）')
        const maxAttempts = 60
        let attempts = 0
        
        const pollStatus = async () => {
          attempts++
          console.log(`[useProcessStore] 轮询检测状态 (${attempts}/${maxAttempts})`)
          
          try {
            const statusResponse = await window.pywebview.api.get_comfyui_status()
            
            if (statusResponse.success && statusResponse.data) {
              const { isRunning, wasStarted, processAlive, exitCode: _exitCode } = statusResponse.data
              
              if (isRunning) {
                console.log('[useProcessStore] 检测到 ComfyUI 已启动成功（浏览器模式）')
                
                set({
                  comfyUIStatus: statusResponse.data,
                  status: {
                    isRunning: statusResponse.data.isRunning,
                    pid: statusResponse.data.pid,
                    port: statusResponse.data.port,
                    uptime: statusResponse.data.uptime,
                    url: statusResponse.data.url
                  },
                  isStarting: false,
                  isRestarting: false,
                  showWorkspaceIframe: false,
                  startedFromWorkspace: false,
                  pollTimeoutId: null
                })
                
                // 在浏览器中打开
                if (statusResponse.data.url) {
                  console.log('[useProcessStore] 在浏览器中打开:', statusResponse.data.url)
                  try {
                    const openResponse = await window.pywebview.api.open_url(statusResponse.data.url)
                    if (!openResponse.success) {
                      console.error('[useProcessStore] 打开浏览器失败:', openResponse.error)
                      toast.error(i18n.t('process.openBrowserFailed') + ': ' + (openResponse.error || i18n.t('process.unknownError')))
                    }
                  } catch (error) {
                    console.error('[useProcessStore] 调用 open_url API 失败:', error)
                    toast.error(i18n.t('process.apiCallFailed'))
                  }
                }
                
                return true
              }
              
              if (wasStarted && !processAlive) {
                console.error('[useProcessStore] ComfyUI 进程已退出')
                set({ 
                  isStarting: false, 
                  isStopping: false,
                  loading: false,
                  comfyUIStatus: statusResponse.data,
                  pollTimeoutId: null
                })
                
                window.dispatchEvent(new CustomEvent('comfyui:reload-logs'))
                toast.error(i18n.t('process.startupFailed'))
                return true
              }
            }
            
            if (attempts >= maxAttempts) {
              console.error('[useProcessStore] 轮询超时')
              set({ isStarting: false, loading: false, pollTimeoutId: null })
              return true
            }
            
            const timeoutId = setTimeout(pollStatus, 2000)
            set({ pollTimeoutId: timeoutId })
            return false
          } catch (error) {
            console.error('[useProcessStore] 轮询状态失败:', error)
            if (attempts >= maxAttempts) {
              set({ isStarting: false, loading: false, pollTimeoutId: null })
              return true
            } else {
              const timeoutId = setTimeout(pollStatus, 2000)
              set({ pollTimeoutId: timeoutId })
              return false
            }
          }
        }
        
        const initialTimeoutId = setTimeout(pollStatus, 2000)
        set({ pollTimeoutId: initialTimeoutId })
      }
    } catch (error) {
      console.error('[useProcessStore] 启动并在浏览器打开失败:', error)
      set({ loading: false, isStarting: false })
      throw error
    }
  },
  
  /**
   * 停止 ComfyUI 进程
   */
  stopComfyUI: async () => {
    try {
      // 清理轮询 timeout
      const { pollTimeoutId } = get()
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId)
        set({ pollTimeoutId: null })
      }
      
      set({ loading: true, isStopping: true }) // 设置停止标记
      console.log('[useProcessStore] 停止 ComfyUI')
      
      if (isDevelopment()) {
        // 开发环境：使用 Mock API
        const { stopComfyUI } = await import('@/mocks/home')
        await stopComfyUI()
        console.log('[useProcessStore] 开发环境停止 ComfyUI')
        
        // 更新状态（保持 isStopping，让轮询或下次操作来重置）
        set({
          comfyUIStatus: { isRunning: false },
          status: { isRunning: false },
          loading: false,
          isStarting: false
        })
      } else {
        // 生产环境：调用后端 API
        const response = await window.pywebview.api.stop_comfyui()
        
        if (!response.success) {
          set({ isStopping: false, loading: false }) // 重置停止标记
          throw new Error(response.error_message || '停止 ComfyUI 失败')
        }
        
        console.log('[useProcessStore] ComfyUI 已停止')
        
        // 更新状态（保持 isStopping，让轮询来重置）
        set({
          comfyUIStatus: { isRunning: false },
          status: { isRunning: false },
          loading: false,
          isStarting: false
        })
      }
    } catch (error) {
      console.error('[useProcessStore] 停止 ComfyUI 失败:', error)
      set({ loading: false, isStopping: false })
      throw error
    }
  }
}))
