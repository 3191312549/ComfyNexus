/**
 * useFolderShortcutStore 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFolderShortcutStore } from './useFolderShortcutStore'
import type { FolderShortcut } from '@/types/home'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useFolderShortcutStore', () => {
  beforeEach(() => {
    // 重置 Store 状态
    const store = useFolderShortcutStore.getState()
    store.shortcuts = []
    store.loading = false
    store.error = null
    
    // 清空 localStorage
    localStorageMock.clear()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useFolderShortcutStore.getState()
      
      expect(store.shortcuts).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('loadShortcuts', () => {
    it('应该加载默认配置（localStorage 为空时）', async () => {
      const store = useFolderShortcutStore.getState()
      
      await store.loadShortcuts()
      
      const state = useFolderShortcutStore.getState()
      expect(state.shortcuts).toHaveLength(3)
      expect(state.shortcuts[0].id).toBe('input')
      expect(state.shortcuts[1].id).toBe('output')
      expect(state.shortcuts[2].id).toBe('models')
      expect(state.loading).toBe(false)
    })

    it('应该从 localStorage 加载配置', async () => {
      const mockShortcuts: FolderShortcut[] = [
        {
          id: 'test1',
          name: '测试1',
          path: 'C:\\test1',
          icon: 'Folder',
          order: 0,
          isDefault: false
        }
      ]
      
      localStorageMock.setItem('folder_shortcuts', JSON.stringify(mockShortcuts))
      
      const store = useFolderShortcutStore.getState()
      await store.loadShortcuts()
      
      const state = useFolderShortcutStore.getState()
      expect(state.shortcuts).toEqual(mockShortcuts)
    })

    it('应该按 order 排序', async () => {
      const mockShortcuts: FolderShortcut[] = [
        {
          id: 'test2',
          name: '测试2',
          path: 'C:\\test2',
          icon: 'Folder',
          order: 2,
          isDefault: false
        },
        {
          id: 'test1',
          name: '测试1',
          path: 'C:\\test1',
          icon: 'Folder',
          order: 1,
          isDefault: false
        }
      ]
      
      localStorageMock.setItem('folder_shortcuts', JSON.stringify(mockShortcuts))
      
      const store = useFolderShortcutStore.getState()
      await store.loadShortcuts()
      
      const state = useFolderShortcutStore.getState()
      expect(state.shortcuts[0].id).toBe('test1')
      expect(state.shortcuts[1].id).toBe('test2')
    })
  })

  describe('saveShortcuts', () => {
    it('应该保存配置到 localStorage', async () => {
      const mockShortcuts: FolderShortcut[] = [
        {
          id: 'test1',
          name: '测试1',
          path: 'C:\\test1',
          icon: 'Folder',
          order: 0,
          isDefault: false
        }
      ]
      
      const store = useFolderShortcutStore.getState()
      await store.saveShortcuts(mockShortcuts)
      
      const saved = localStorageMock.getItem('folder_shortcuts')
      expect(saved).toBeTruthy()
      expect(JSON.parse(saved!)).toEqual(mockShortcuts)
    })

    it('应该更新 Store 状态', async () => {
      const mockShortcuts: FolderShortcut[] = [
        {
          id: 'test1',
          name: '测试1',
          path: 'C:\\test1',
          icon: 'Folder',
          order: 0,
          isDefault: false
        }
      ]
      
      const store = useFolderShortcutStore.getState()
      await store.saveShortcuts(mockShortcuts)
      
      const state = useFolderShortcutStore.getState()
      expect(state.shortcuts).toEqual(mockShortcuts)
    })
  })

  describe('addShortcut', () => {
    it('应该添加新的快捷方式', async () => {
      const store = useFolderShortcutStore.getState()
      
      await store.addShortcut({
        name: '新文件夹',
        path: 'C:\\new',
        icon: 'Folder'
      })
      
      const state = useFolderShortcutStore.getState()
      expect(state.shortcuts).toHaveLength(1)
      expect(state.shortcuts[0].name).toBe('新文件夹')
      expect(state.shortcuts[0].isDefault).toBe(false)
    })

    it('应该自动生成 ID 和 order', async () => {
      const store = useFolderShortcutStore.getState()
      
      await store.addShortcut({
        name: '新文件夹',
        path: 'C:\\new',
        icon: 'Folder'
      })
      
      const state = useFolderShortcutStore.getState()
      expect(state.shortcuts[0].id).toBeTruthy()
      expect(state.shortcuts[0].order).toBe(0)
    })

    it('应该限制最多6个快捷方式', async () => {
      const store = useFolderShortcutStore.getState()
      
      // 添加6个快捷方式
      for (let i = 0; i < 6; i++) {
        await store.addShortcut({
          name: `文件夹${i}`,
          path: `C:\\folder${i}`,
          icon: 'Folder'
        })
      }
      
      // 尝试添加第7个
      await expect(
        store.addShortcut({
          name: '文件夹7',
          path: 'C:\\folder7',
          icon: 'Folder'
        })
      ).rejects.toThrow('最多只能添加6个文件夹快捷方式')
    })
  })

  describe('deleteShortcut', () => {
    it('应该删除非默认快捷方式', async () => {
      const store = useFolderShortcutStore.getState()
      
      await store.addShortcut({
        name: '测试',
        path: 'C:\\test',
        icon: 'Folder'
      })
      
      const state1 = useFolderShortcutStore.getState()
      const id = state1.shortcuts[0].id
      
      await store.deleteShortcut(id)
      
      const state2 = useFolderShortcutStore.getState()
      expect(state2.shortcuts).toHaveLength(0)
    })

    it('应该阻止删除默认文件夹', async () => {
      const store = useFolderShortcutStore.getState()
      
      // 加载默认配置
      await store.loadShortcuts()
      
      // 尝试删除默认文件夹
      await expect(
        store.deleteShortcut('input')
      ).rejects.toThrow('默认文件夹不能删除')
    })

    it('删除后应该重新排序', async () => {
      const store = useFolderShortcutStore.getState()
      
      // 添加3个快捷方式
      await store.addShortcut({ name: '文件夹1', path: 'C:\\1', icon: 'Folder' })
      await store.addShortcut({ name: '文件夹2', path: 'C:\\2', icon: 'Folder' })
      await store.addShortcut({ name: '文件夹3', path: 'C:\\3', icon: 'Folder' })
      
      const state1 = useFolderShortcutStore.getState()
      const middleId = state1.shortcuts[1].id
      
      // 删除中间的
      await store.deleteShortcut(middleId)
      
      const state2 = useFolderShortcutStore.getState()
      expect(state2.shortcuts).toHaveLength(2)
      expect(state2.shortcuts[0].order).toBe(0)
      expect(state2.shortcuts[1].order).toBe(1)
    })
  })

  describe('updateShortcut', () => {
    it('应该更新快捷方式', async () => {
      const store = useFolderShortcutStore.getState()
      
      await store.addShortcut({
        name: '原名称',
        path: 'C:\\old',
        icon: 'Folder'
      })
      
      const state1 = useFolderShortcutStore.getState()
      const id = state1.shortcuts[0].id
      
      await store.updateShortcut(id, {
        name: '新名称',
        path: 'C:\\new'
      })
      
      const state2 = useFolderShortcutStore.getState()
      expect(state2.shortcuts[0].name).toBe('新名称')
      expect(state2.shortcuts[0].path).toBe('C:\\new')
    })

    it('应该保护 id 和 isDefault 字段', async () => {
      const store = useFolderShortcutStore.getState()
      
      await store.loadShortcuts()
      
      const state1 = useFolderShortcutStore.getState()
      const originalId = state1.shortcuts[0].id
      
      await store.updateShortcut(originalId, {
        id: 'new_id',
        isDefault: false
      } as any)
      
      const state2 = useFolderShortcutStore.getState()
      expect(state2.shortcuts[0].id).toBe(originalId)
      expect(state2.shortcuts[0].isDefault).toBe(true)
    })
  })

  describe('reorderShortcuts', () => {
    it('应该重新排序快捷方式', async () => {
      const store = useFolderShortcutStore.getState()
      
      // 添加3个快捷方式
      await store.addShortcut({ name: '文件夹1', path: 'C:\\1', icon: 'Folder' })
      await store.addShortcut({ name: '文件夹2', path: 'C:\\2', icon: 'Folder' })
      await store.addShortcut({ name: '文件夹3', path: 'C:\\3', icon: 'Folder' })
      
      const state1 = useFolderShortcutStore.getState()
      const reordered = [state1.shortcuts[2], state1.shortcuts[0], state1.shortcuts[1]]
      
      await store.reorderShortcuts(reordered)
      
      const state2 = useFolderShortcutStore.getState()
      expect(state2.shortcuts[0].name).toBe('文件夹3')
      expect(state2.shortcuts[0].order).toBe(0)
      expect(state2.shortcuts[1].name).toBe('文件夹1')
      expect(state2.shortcuts[1].order).toBe(1)
      expect(state2.shortcuts[2].name).toBe('文件夹2')
      expect(state2.shortcuts[2].order).toBe(2)
    })
  })

  describe('syncDefaultPaths', () => {
    it('应该同步默认文件夹路径', async () => {
      const store = useFolderShortcutStore.getState()
      
      // 加载默认配置
      await store.loadShortcuts()
      
      // 模拟环境配置
      const mockEnv = {
        acceleration: {
          inputDirectory: 'C:\\ComfyUI\\input',
          outputDirectory: 'C:\\ComfyUI\\output',
          baseDirectory: 'C:\\ComfyUI\\models'
        }
      } as any
      
      store.syncDefaultPaths(mockEnv)
      
      const state = useFolderShortcutStore.getState()
      expect(state.shortcuts[0].path).toBe('C:\\ComfyUI\\input')
      expect(state.shortcuts[1].path).toBe('C:\\ComfyUI\\output')
      expect(state.shortcuts[2].path).toBe('C:\\ComfyUI\\models')
    })

    it('应该只更新默认文件夹', async () => {
      const store = useFolderShortcutStore.getState()
      
      // 加载默认配置并添加自定义文件夹
      await store.loadShortcuts()
      await store.addShortcut({
        name: '自定义',
        path: 'C:\\custom',
        icon: 'Folder'
      })
      
      const state1 = useFolderShortcutStore.getState()
      const customPath = state1.shortcuts[3].path
      
      // 同步路径
      const mockEnv = {
        acceleration: {
          inputDirectory: 'C:\\New\\input',
          outputDirectory: 'C:\\New\\output',
          baseDirectory: 'C:\\New\\models'
        }
      } as any
      
      store.syncDefaultPaths(mockEnv)
      
      const state2 = useFolderShortcutStore.getState()
      expect(state2.shortcuts[0].path).toBe('C:\\New\\input')
      expect(state2.shortcuts[3].path).toBe(customPath) // 自定义文件夹路径不变
    })
  })
})
