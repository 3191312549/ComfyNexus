/**
 * 警告提示状态管理 Store
 * 用于管理各种警告提示的显示状态
 * 
 * 注意：警告状态保存到后端配置文件，而不是 localStorage
 */

import { create } from 'zustand'

interface WarningStore {
  // 警告状态
  warnings: {
    devVersionWarning: boolean // 开发版警告
    systemProxyDetected: boolean // 系统代理检测提示
    // 可以添加更多警告类型
  }
  
  // 加载状态
  loading: boolean
  
  // 操作
  loadWarnings: () => Promise<void>
  setWarningDismissed: (warningKey: keyof WarningStore['warnings'], dismissed: boolean) => Promise<void>
  resetAllWarnings: () => Promise<void>
}

const defaultWarnings = {
  devVersionWarning: true, // 默认显示警告
  systemProxyDetected: true, // 默认显示系统代理检测提示
}

export const useWarningStore = create<WarningStore>()((set, get) => ({
  warnings: defaultWarnings,
  loading: false,
  
  // 从后端加载警告设置
  loadWarnings: async () => {
    try {
      set({ loading: true })
      
      const result = await window.pywebview.api.get_settings()
      
      if (result.success && result.settings) {
        const warnings = {
          ...defaultWarnings,
          ...(result.settings.warnings || {})
        }
        set({ warnings, loading: false })
      } else {
        set({ loading: false })
      }
    } catch (error) {
      console.error('[useWarningStore] 加载警告设置失败:', error)
      set({ loading: false })
    }
  },
  
  // 设置警告是否已关闭
  setWarningDismissed: async (warningKey, dismissed) => {
    try {
      const currentWarnings = get().warnings
      const newWarnings = {
        ...currentWarnings,
        [warningKey]: !dismissed, // true 表示显示，false 表示不显示
      }
      
      // 先更新本地状态
      set({ warnings: newWarnings })
      
      // 保存到后端
      const result = await window.pywebview.api.update_settings({
        warnings: newWarnings
      })
      
      if (!result.success) {
        console.error('[useWarningStore] 保存警告设置失败:', result.message)
        // 失败时回滚
        set({ warnings: currentWarnings })
      }
    } catch (error) {
      console.error('[useWarningStore] 保存警告设置异常:', error)
      // 异常时回滚
      const currentWarnings = get().warnings
      set({ warnings: currentWarnings })
    }
  },
  
  // 重置所有警告
  resetAllWarnings: async () => {
    try {
      set({ warnings: defaultWarnings })
      
      // 保存到后端
      const result = await window.pywebview.api.update_settings({
        warnings: defaultWarnings
      })
      
      if (!result.success) {
        console.error('[useWarningStore] 重置警告设置失败:', result.message)
      }
    } catch (error) {
      console.error('[useWarningStore] 重置警告设置异常:', error)
    }
  },
}))
