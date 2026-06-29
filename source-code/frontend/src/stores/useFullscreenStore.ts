/**
 * 全屏状态管理 Store
 */

import { create } from 'zustand'
import { bridgeService } from '@/services/bridge'

interface FullscreenState {
  isFullscreen: boolean
  isToggling: boolean // 是否正在切换全屏状态
  setFullscreen: (fullscreen: boolean) => void
  toggleFullscreen: () => Promise<void>
  syncFullscreenState: () => Promise<void>
}

export const useFullscreenStore = create<FullscreenState>((set, get) => ({
  isFullscreen: false,
  isToggling: false,
  
  setFullscreen: (fullscreen: boolean) => {
    set({ isFullscreen: fullscreen })
  },
  
  toggleFullscreen: async () => {
    // 如果正在切换中，忽略重复请求
    if (get().isToggling) {
      return
    }

    try {
      // 标记为正在切换
      set({ isToggling: true })
      
      // 先切换本地状态
      const newState = !get().isFullscreen
      set({ isFullscreen: newState })
      
      // 然后调用后端 API
      await bridgeService.toggleFullscreen()
      
      // 等待一小段时间，确保后端状态已更新
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error)
      // 如果失败，恢复状态
      set({ isFullscreen: !get().isFullscreen })
    } finally {
      // 切换完成，恢复状态同步
      set({ isToggling: false })
    }
  },
  
  syncFullscreenState: async () => {
    // 如果正在切换中，跳过同步
    if (get().isToggling) {
      return
    }

    try {
      const fullscreen = await bridgeService.isFullscreen()
      // 只有当状态不一致时才更新
      if (fullscreen !== get().isFullscreen) {
        set({ isFullscreen: fullscreen })
      }
    } catch (error) {
      console.error('Failed to sync fullscreen status:', error)
    }
  },
}))
