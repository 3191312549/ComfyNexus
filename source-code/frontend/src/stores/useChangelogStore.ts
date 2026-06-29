/**
 * 更新日志状态管理
 * 
 * 管理更新日志弹窗显示逻辑：
 * - 首次打开应用时弹出
 * - 版本更新后首次打开时弹出
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChangelogStore {
  lastViewedVersion: string | null
  hasShownChangelog: boolean
  
  setLastViewedVersion: (version: string) => void
  shouldShowChangelog: (currentVersion: string) => boolean
  markChangelogShown: () => void
  reset: () => void
}

const STORAGE_KEY = 'comfyNexus_changelog'

export const useChangelogStore = create<ChangelogStore>()(
  persist(
    (set, get) => ({
      lastViewedVersion: null,
      hasShownChangelog: false,
      
      setLastViewedVersion: (version: string) => {
        set({
          lastViewedVersion: version,
          hasShownChangelog: true
        })
      },
      
      shouldShowChangelog: (currentVersion: string) => {
        const { lastViewedVersion, hasShownChangelog } = get()
        
        if (!lastViewedVersion) {
          return true
        }
        
        if (lastViewedVersion !== currentVersion) {
          return true
        }
        
        return !hasShownChangelog
      },
      
      markChangelogShown: () => {
        set({ hasShownChangelog: true })
      },
      
      reset: () => {
        set({
          lastViewedVersion: null,
          hasShownChangelog: false
        })
      }
    }),
    {
      name: STORAGE_KEY,
      version: 1
    }
  )
)

export type { ChangelogStore }
