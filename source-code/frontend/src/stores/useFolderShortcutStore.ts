/**
 * 文件夹快捷方式状态管理Store
 */

import { create } from 'zustand'
import type { FolderShortcut } from '@/types/home'
import type { EnvironmentConfig } from '@/types/environment'

/**
 * 文件夹快捷方式 Store 接口
 */
interface FolderShortcutStore {
  // 状态
  shortcuts: FolderShortcut[]
  loading: boolean
  error: string | null

  // 操作方法
  loadShortcuts: () => Promise<void>
  saveShortcuts: (shortcuts: FolderShortcut[]) => Promise<void>
  addShortcut: (shortcut: Omit<FolderShortcut, 'id' | 'order'>) => Promise<void>
  deleteShortcut: (id: string) => Promise<void>
  updateShortcut: (id: string, updates: Partial<FolderShortcut>) => Promise<void>
  reorderShortcuts: (shortcuts: FolderShortcut[]) => Promise<void>
  syncDefaultPaths: (env: EnvironmentConfig | null) => void
}

/**
 * 检查是否在开发环境
 */
const isDevelopment = (): boolean => {
  return !window.pywebview || !window.pywebview.api
}

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 获取默认文件夹快捷方式配置
 * 使用 i18n key 作为 name，实际显示时通过 t() 翻译
 * 注意：folder 键在 home 命名空间下，所以完整的 key 是 'home.folder.input'
 */
const getDefaultShortcuts = (): FolderShortcut[] => {
  return [
    {
      id: 'input',
      name: 'home.folder.input',
      path: '', // 空路径，等待环境配置同步
      icon: 'FolderInput',
      order: 0,
      isDefault: true
    },
    {
      id: 'output',
      name: 'home.folder.output',
      path: '', // 空路径，等待环境配置同步
      icon: 'FolderOutput',
      order: 1,
      isDefault: true
    },
    {
      id: 'models',
      name: 'home.folder.models',
      path: '', // 空路径，等待环境配置同步
      icon: 'FolderCog',
      order: 2,
      isDefault: true
    }
  ]
}

/**
 * 文件夹快捷方式 Store
 */
export const useFolderShortcutStore = create<FolderShortcutStore>((set, get) => ({
  // 初始状态
  shortcuts: [],
  loading: false,
  error: null,

  /**
   * 加载文件夹快捷方式配置
   */
  loadShortcuts: async () => {
    set({ loading: true, error: null })
    
    try {
      let shortcuts: FolderShortcut[]

      if (isDevelopment()) {
        // 开发环境：从 localStorage 加载或使用默认配置
        const stored = localStorage.getItem('folder_shortcuts')
        if (stored) {
          shortcuts = JSON.parse(stored)
          // 修复：确保默认文件夹的 name 使用 i18n key
          shortcuts = shortcuts.map(shortcut => {
            if (shortcut.isDefault) {
              const defaultShortcut = getDefaultShortcuts().find(s => s.id === shortcut.id)
              if (defaultShortcut) {
                return { ...shortcut, name: defaultShortcut.name }
              }
            }
            return shortcut
          })
        } else {
          shortcuts = getDefaultShortcuts()
        }
        console.log('[useFolderShortcutStore] 开发环境加载配置:', shortcuts)
      } else {
        // 生产环境：调用后端 API
        const response = await window.pywebview.api.get_folder_shortcuts()
        
        if (!response.success) {
          throw new Error(response.error_message || '加载文件夹配置失败')
        }
        
        shortcuts = response.shortcuts || getDefaultShortcuts()
        // 修复：确保默认文件夹的 name 使用 i18n key
        shortcuts = shortcuts.map(shortcut => {
          if (shortcut.isDefault) {
            const defaultShortcut = getDefaultShortcuts().find(s => s.id === shortcut.id)
            if (defaultShortcut) {
              return { ...shortcut, name: defaultShortcut.name }
            }
          }
          return shortcut
        })
      }

      // 按 order 排序
      shortcuts.sort((a, b) => a.order - b.order)

      set({ shortcuts, loading: false })
    } catch (error) {
      console.error('[useFolderShortcutStore] 加载配置失败:', error)
      
      // 失败时使用默认配置
      const defaultShortcuts = getDefaultShortcuts()
      set({
        shortcuts: defaultShortcuts,
        error: error instanceof Error ? error.message : '加载文件夹配置失败',
        loading: false
      })
    }
  },

  /**
   * 保存文件夹快捷方式配置
   */
  saveShortcuts: async (shortcuts: FolderShortcut[]) => {
    const previousShortcuts = get().shortcuts
    
    try {
      // 乐观更新：立即更新本地状态
      set({ shortcuts, error: null })

      if (isDevelopment()) {
        // 开发环境：保存到 localStorage
        localStorage.setItem('folder_shortcuts', JSON.stringify(shortcuts))
        console.log('[useFolderShortcutStore] 开发环境保存配置:', shortcuts)
      } else {
        // 生产环境：调用后端 API
        const response = await window.pywebview.api.save_folder_shortcuts(shortcuts)
        
        if (!response.success) {
          throw new Error(response.error_message || '保存文件夹配置失败')
        }
      }
    } catch (error) {
      console.error('[useFolderShortcutStore] 保存配置失败:', error)
      
      // 失败时回滚到之前的状态
      set({
        shortcuts: previousShortcuts,
        error: error instanceof Error ? error.message : '保存文件夹配置失败'
      })
      
      throw error
    }
  },

  /**
   * 添加文件夹快捷方式
   */
  addShortcut: async (shortcut: Omit<FolderShortcut, 'id' | 'order'>) => {
    const { shortcuts } = get()

    // 检查数量限制
    if (shortcuts.length >= 6) {
      const error = '最多只能添加6个文件夹快捷方式'
      set({ error })
      throw new Error(error)
    }

    // 创建新的快捷方式
    const newShortcut: FolderShortcut = {
      ...shortcut,
      id: generateId(),
      order: shortcuts.length,
      isDefault: false
    }

    // 更新列表并保存
    const updatedShortcuts = [...shortcuts, newShortcut]
    await get().saveShortcuts(updatedShortcuts)
  },

  /**
   * 删除文件夹快捷方式
   */
  deleteShortcut: async (id: string) => {
    const { shortcuts } = get()
    
    // 查找要删除的快捷方式
    const shortcut = shortcuts.find(s => s.id === id)
    
    if (!shortcut) {
      const error = '文件夹快捷方式不存在'
      set({ error })
      throw new Error(error)
    }

    // 检查是否为默认文件夹
    if (shortcut.isDefault) {
      const error = '默认文件夹不能删除'
      set({ error })
      throw new Error(error)
    }

    // 删除并重新排序
    const updatedShortcuts = shortcuts
      .filter(s => s.id !== id)
      .map((s, index) => ({ ...s, order: index }))

    await get().saveShortcuts(updatedShortcuts)
  },

  /**
   * 更新文件夹快捷方式
   */
  updateShortcut: async (id: string, updates: Partial<FolderShortcut>) => {
    const { shortcuts } = get()
    
    // 查找要更新的快捷方式
    const index = shortcuts.findIndex(s => s.id === id)
    
    if (index === -1) {
      const error = '文件夹快捷方式不存在'
      set({ error })
      throw new Error(error)
    }

    // 更新快捷方式
    const updatedShortcuts = [...shortcuts]
    updatedShortcuts[index] = {
      ...updatedShortcuts[index],
      ...updates,
      // 保护字段不被修改
      id: updatedShortcuts[index].id,
      isDefault: updatedShortcuts[index].isDefault
    }

    await get().saveShortcuts(updatedShortcuts)
  },

  /**
   * 重新排序文件夹快捷方式
   */
  reorderShortcuts: async (shortcuts: FolderShortcut[]) => {
    // 更新 order 字段
    const reordered = shortcuts.map((s, index) => ({
      ...s,
      order: index
    }))

    await get().saveShortcuts(reordered)
  },

  /**
   * 同步默认文件夹路径
   * 当环境配置变更时，自动同步默认文件夹的路径
   */
  syncDefaultPaths: (env: EnvironmentConfig | null) => {
    const { shortcuts } = get()
    
    // 边界情况 1: shortcuts 为空
    if (!shortcuts || shortcuts.length === 0) {
      console.warn('[useFolderShortcutStore] shortcuts 为空，跳过同步')
      return
    }
    
    // 边界情况 2: env 为空或无效 - 清空所有默认文件夹路径
    if (!env || !env.general) {
      console.group('[useFolderShortcutStore] 没有环境，清空默认文件夹路径')
      
      // 清空默认文件夹的路径
      const updated = shortcuts.map(shortcut => {
        if (!shortcut.isDefault) {
          return shortcut
        }
        
        // 如果路径不为空，清空它
        if (shortcut.path !== '') {
          console.log(`清空 ${shortcut.name}: ${shortcut.path} -> ''`)
          return {
            ...shortcut,
            path: ''
          }
        }
        
        return shortcut
      })
      
      // 检查是否有实际变化
      const hasChanges = updated.some((s, i) => s.path !== shortcuts[i].path)
      if (hasChanges) {
        set({ shortcuts: updated })
        console.log('清空完成')
      } else {
        console.log('路径已为空，无需更新')
      }
      
      console.groupEnd()
      return
    }
    
    console.group('[useFolderShortcutStore] 同步默认文件夹路径')
    console.log('环境 ID:', env.id)
    console.log('ComfyUI 路径:', env.general?.comfyuiPath)
    console.log('输入目录:', env.acceleration?.inputDirectory)
    console.log('输出目录:', env.acceleration?.outputDirectory)
    console.log('模型目录:', env.acceleration?.baseDirectory)
    
    // 获取 ComfyUI 安装路径
    const comfyuiPath = env.general?.comfyuiPath || ''
    
    // 生成默认路径的辅助函数
    const getDefaultPath = (configPath: string | undefined, defaultSubdir: string): string => {
      // 如果配置中有路径且不为空，使用配置的路径
      if (configPath && configPath.trim() !== '') {
        return configPath
      }
      
      // 否则，使用 ComfyUI 安装路径 + 默认子目录
      if (comfyuiPath) {
        // 处理路径分隔符（Windows 使用 \，Unix 使用 /）
        const separator = comfyuiPath.includes('\\') ? '\\' : '/'
        return `${comfyuiPath}${separator}${defaultSubdir}`
      }
      
      // 如果连 ComfyUI 路径都没有，返回空字符串
      return ''
    }
    
    // 路径映射关系（使用默认路径）
    const PATH_MAPPING: Record<string, string> = {
      input: getDefaultPath(env.acceleration?.inputDirectory, 'input'),
      output: getDefaultPath(env.acceleration?.outputDirectory, 'output'),
      models: getDefaultPath(env.acceleration?.baseDirectory, 'models')
    }
    
    // 更新默认文件夹的路径
    const updated = shortcuts.map(shortcut => {
      if (!shortcut.isDefault) {
        return shortcut
      }

      const newPath = PATH_MAPPING[shortcut.id]
      if (newPath === undefined) {
        return shortcut
      }
      
      // 边界情况 3: 路径未变化，避免不必要的更新
      if (shortcut.path === newPath) {
        return shortcut
      }
      
      console.log(`更新 ${shortcut.name}: ${shortcut.path} -> ${newPath}`)
      
      return {
        ...shortcut,
        path: newPath
      }
    })

    // 边界情况 4: 检查是否有实际变化
    const hasChanges = updated.some((s, i) => s.path !== shortcuts[i].path)
    if (!hasChanges) {
      console.log('路径无变化，跳过更新')
      console.groupEnd()
      return
    }

    // 直接更新状态，不需要保存到后端
    // 因为这些路径已经保存在环境配置中
    set({ shortcuts: updated })
    
    console.log('同步完成')
    console.groupEnd()
  }
}))

// ============================================================================
// 环境变更订阅机制
// ============================================================================

/**
 * 设置环境变更订阅
 * 当环境切换或配置保存时，自动同步默认文件夹路径
 */
if (typeof window !== 'undefined') {
  // 动态导入 useEnvStore 以避免循环依赖
  import('./useEnvStore').then(({ useEnvStore }) => {
    // 订阅：监听环境变化
    useEnvStore.subscribe(
      (state) => {
        const currentEnvId = state.currentEnvId
        
        // 如果没有当前环境（所有环境都删除了），清空路径
        if (!currentEnvId || state.environments.length === 0) {
          console.log('[useFolderShortcutStore] 没有环境，触发路径清空')
          useFolderShortcutStore.getState().syncDefaultPaths(null)
          return
        }
        
        // 找到当前环境并同步路径
        const env = state.environments.find((e: any) => e.id === currentEnvId)
        if (env) {
          console.log('[useFolderShortcutStore] 检测到环境变化，触发路径同步:', env.id)
          useFolderShortcutStore.getState().syncDefaultPaths(env)
        }
      }
    )
    
    console.log('[useFolderShortcutStore] 环境变更订阅已设置')
  }).catch(error => {
    console.error('[useFolderShortcutStore] 设置环境变更订阅失败:', error)
  })
}
