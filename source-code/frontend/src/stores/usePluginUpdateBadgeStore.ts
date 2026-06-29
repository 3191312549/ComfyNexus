/**
 * 插件更新徽章状态管理
 * 
 * 管理侧边栏"插件管理"菜单项的更新提示徽章状态
 * 支持为每个环境维护独立的徽章状态
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 单个环境的徽章状态
 */
interface BadgeState {
  /** 待更新插件数量 */
  updateCount: number
  /** 是否已查看（点击插件管理后设为 true） */
  hasViewed: boolean
}

/**
 * 插件更新徽章 Store 接口
 */
interface PluginUpdateBadgeStore {
  /** 各环境的徽章状态 Record<environmentId, BadgeState> */
  badgeStates: Record<string, BadgeState>
  
  /** 徽章开关（是否显示侧边栏徽章） */
  badgeEnabled: boolean
  
  /** 设置指定环境的更新数量（同时重置 hasViewed 状态） */
  setUpdateCount: (environmentId: string | null, count: number) => void
  
  /** 标记指定环境为已查看 */
  markAsViewed: (environmentId: string | null) => void
  
  /** 获取指定环境的徽章状态 */
  getBadgeState: (environmentId: string | null) => BadgeState
  
  /** 重置指定环境的状态 */
  reset: (environmentId: string | null) => void
  
  /** 重置所有环境的状态 */
  resetAll: () => void
  
  /** 设置徽章开关 */
  setBadgeEnabled: (enabled: boolean) => void
}

/**
 * 默认徽章状态
 */
const DEFAULT_BADGE_STATE: BadgeState = {
  updateCount: 0,
  hasViewed: false
}

/**
 * 全局环境 ID（用于没有环境时的默认状态）
 */
const GLOBAL_ENV_ID = '__global__'

/**
 * 插件更新徽章状态管理 Hook
 * 使用 persist 中间件持久化 badgeEnabled 状态
 */
export const usePluginUpdateBadgeStore = create<PluginUpdateBadgeStore>()(
  persist(
    (set, get) => ({
      badgeStates: {},
      badgeEnabled: true,
      
      setUpdateCount: (environmentId: string | null, count: number) => {
        const envId = environmentId || GLOBAL_ENV_ID
        console.log('[PluginUpdateBadgeStore] setUpdateCount:', { environmentId, envId, count })
        set(state => ({
          badgeStates: {
            ...state.badgeStates,
            [envId]: {
              updateCount: count,
              hasViewed: false
            }
          }
        }))
      },
      
      markAsViewed: (environmentId: string | null) => {
        const envId = environmentId || GLOBAL_ENV_ID
        set(state => {
          const currentState = state.badgeStates[envId] || DEFAULT_BADGE_STATE
          return {
            badgeStates: {
              ...state.badgeStates,
              [envId]: {
                ...currentState,
                hasViewed: true
              }
            }
          }
        })
      },
      
      getBadgeState: (environmentId: string | null) => {
        const envId = environmentId || GLOBAL_ENV_ID
        const state = get().badgeStates[envId] || DEFAULT_BADGE_STATE
        console.log('[PluginUpdateBadgeStore] getBadgeState:', { environmentId, envId, state })
        return state
      },
      
      reset: (environmentId: string | null) => {
        const envId = environmentId || GLOBAL_ENV_ID
        set(state => {
          const { [envId]: _, ...rest } = state.badgeStates
          return {
            badgeStates: {
              ...rest,
              [envId]: DEFAULT_BADGE_STATE
            }
          }
        })
      },
      
      resetAll: () => set({ badgeStates: {} }),
      
      setBadgeEnabled: (enabled: boolean) => {
        set({ badgeEnabled: enabled })
      }
    }),
    {
      name: 'plugin-update-badge-storage',
      partialize: (state) => ({ badgeEnabled: state.badgeEnabled })
    }
  )
)
