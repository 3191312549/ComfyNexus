/**
 * 工作台状态管理
 */

import { create } from 'zustand'
import type { WorkspaceStore } from '@/types/workspace'

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  isFullscreen: false,
  
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  
  toggleFullscreen: () => set((state) => ({ 
    isFullscreen: !state.isFullscreen 
  }))
}))
