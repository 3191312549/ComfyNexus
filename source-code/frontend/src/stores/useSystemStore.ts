/**
 * 系统状态（用于首页）
 */

import { create } from 'zustand'
import type { SystemMonitorData } from '@/types/home'

export interface SystemStatus {
  cpu: number
  memory: number
  disk: number
  gpu?: number
}

interface SystemStore {
  // 原有状态
  status: SystemStatus
  loading: boolean
  
  // 新增状态 - 详细监控数据
  monitorData: SystemMonitorData | null
  monitorLoading: boolean
  monitorError: string | null
  
  // 原有方法
  setStatus: (status: SystemStatus) => void
  setLoading: (loading: boolean) => void
  
  // 新增方法 - 监控数据管理
  loadMonitorData: () => Promise<void>
  startMonitorPolling: () => void
  stopMonitorPolling: () => void
}

/**
 * 检查是否在开发环境
 */
const isDevelopment = (): boolean => {
  return !window.pywebview || !window.pywebview.api
}

/**
 * 轮询定时器（模块级变量，避免状态污染）
 */
let pollingInterval: NodeJS.Timeout | null = null

export const useSystemStore = create<SystemStore>((set, get) => ({
  // 原有状态
  status: {
    cpu: 0,
    memory: 0,
    disk: 0,
  },
  loading: false,
  
  // 新增状态
  monitorData: null,
  monitorLoading: false,
  monitorError: null,
  
  // 原有方法
  setStatus: (status) => set({ status }),
  setLoading: (loading) => set({ loading }),
  
  /**
   * 加载系统监控数据
   */
  loadMonitorData: async () => {
    set({ monitorLoading: true, monitorError: null })
    
    try {
      let monitorData: SystemMonitorData

      if (isDevelopment()) {
        // 开发环境：使用 Mock API
        const { getSystemMonitorData } = await import('@/mocks/home')
        monitorData = await getSystemMonitorData()
        console.log('[useSystemStore] 开发环境加载监控数据:', monitorData)
      } else {
        // 生产环境：调用后端 API
        const response = await window.pywebview.api.get_system_monitor_data()
        
        if (!response.success || !response.data) {
          throw new Error(response.error_message || '获取监控数据失败')
        }
        
        monitorData = response.data
      }

      set({ monitorData, monitorLoading: false })
    } catch (error) {
      console.error('[useSystemStore] 加载监控数据失败:', error)
      
      // 错误时不抛出异常，避免中断轮询
      // 设置错误信息，但保留之前的数据
      set({
        monitorError: error instanceof Error ? error.message : '获取监控数据失败',
        monitorLoading: false
      })
    }
  },
  
  /**
   * 启动监控数据轮询（每3秒更新一次）
   */
  startMonitorPolling: () => {
    // 防止重复启动
    if (pollingInterval) {
      console.warn('[useSystemStore] 轮询已在运行中')
      return
    }
    
    console.log('[useSystemStore] 启动监控数据轮询（间隔3秒）')
    
    // 立即加载一次
    get().loadMonitorData()
    
    // 启动轮询
    pollingInterval = setInterval(() => {
      get().loadMonitorData()
    }, 3000)
  },
  
  /**
   * 停止监控数据轮询
   */
  stopMonitorPolling: () => {
    if (pollingInterval) {
      console.log('[useSystemStore] 停止监控数据轮询')
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }
}))
