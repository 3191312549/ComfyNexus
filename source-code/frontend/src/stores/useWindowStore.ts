/**
 * 窗口设置状态管理
 */

import { create } from 'zustand'

interface WindowSettings {
  size: string
  setSize: (size: string) => void
  loadSize: () => Promise<void>
}

export const useWindowStore = create<WindowSettings>((set) => ({
  size: '1680x1080',
  setSize: (size: string) => {
    set({ size })
  },
  loadSize: async () => {
    try {
      if (window.pywebview?.api) {
        const result = await window.pywebview.api.get_settings()
        if (result.success && result.settings) {
          const windowSize = result.settings.appearance?.windowSize || '1680x1080'
          set({ size: windowSize })
        }
      }
    } catch (error) {
      console.error('[useWindowStore] 加载窗口大小失败:', error)
    }
  }
}))
