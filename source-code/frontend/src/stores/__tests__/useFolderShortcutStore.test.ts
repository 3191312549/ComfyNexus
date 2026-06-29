/**
 * useFolderShortcutStore 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFolderShortcutStore } from '../useFolderShortcutStore'
import type { EnvironmentConfig } from '@/types/environment'
import type { FolderShortcut } from '@/types/home'

describe('useFolderShortcutStore.syncDefaultPaths', () => {
  beforeEach(() => {
    // 重置 Store 状态
    const store = useFolderShortcutStore.getState()
    store.shortcuts = []
    store.loading = false
    store.error = null
  })

  it('应该正确同步默认文件夹路径', () => {
    const store = useFolderShortcutStore.getState()
    
    // 设置初始状态
    const initialShortcuts: FolderShortcut[] = [
      { id: 'input', name: '输入', path: '', icon: 'FolderInput', order: 0, isDefault: true },
      { id: 'output', name: '输出', path: '', icon: 'FolderOutput', order: 1, isDefault: true },
      { id: 'models', name: '模型', path: '', icon: 'FolderCog', order: 2, isDefault: true },
      { id: 'custom', name: '自定义', path: '/custom', icon: 'Folder', order: 3, isDefault: false }
    ]
    useFolderShortcutStore.setState({ shortcuts: initialShortcuts })
    
    // 执行同步
    const env: EnvironmentConfig = {
      id: 'env1',
      general: {
        name: '测试环境',
        comfyuiDirectory: '/path/to/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: true
      },
      acceleration: {
        inputDirectory: '/path/to/input',
        outputDirectory: '/path/to/output',
        baseDirectory: '/path/to/models',
        device: 'cuda',
        extraArgs: []
      },
      modelPathConfigs: []
    }
    store.syncDefaultPaths(env)
    
    // 验证结果
    const shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts[0].path).toBe('/path/to/input')
    expect(shortcuts[1].path).toBe('/path/to/output')
    expect(shortcuts[2].path).toBe('/path/to/models')
    expect(shortcuts[3].path).toBe('/custom')  // 自定义文件夹不变
  })

  it('应该处理空配置的情况', () => {
    const store = useFolderShortcutStore.getState()
    
    const initialShortcuts: FolderShortcut[] = [
      { id: 'input', name: '输入', path: '/old/path', icon: 'FolderInput', order: 0, isDefault: true }
    ]
    useFolderShortcutStore.setState({ shortcuts: initialShortcuts })
    
    const env: EnvironmentConfig = {
      id: 'env1',
      general: {
        name: '测试环境',
        comfyuiDirectory: '/path/to/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: true
      },
      acceleration: {
        inputDirectory: '',
        outputDirectory: '',
        baseDirectory: '',
        device: 'cuda',
        extraArgs: []
      },
      modelPathConfigs: []
    }
    store.syncDefaultPaths(env)
    
    const shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts[0].path).toBe('')
  })

  it('应该处理无效环境的情况', () => {
    const store = useFolderShortcutStore.getState()
    
    const initialShortcuts: FolderShortcut[] = [
      { id: 'input', name: '输入', path: '/old/path', icon: 'FolderInput', order: 0, isDefault: true }
    ]
    useFolderShortcutStore.setState({ shortcuts: initialShortcuts })
    
    // 测试 null 环境
    store.syncDefaultPaths(null as any)
    
    // 路径应保持不变
    let shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts[0].path).toBe('/old/path')
    
    // 测试没有 acceleration 的环境
    const invalidEnv = {
      id: 'env1',
      general: {
        name: '测试环境',
        comfyuiDirectory: '/path/to/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: true
      }
    } as any
    store.syncDefaultPaths(invalidEnv)
    
    shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts[0].path).toBe('/old/path')
  })

  it('应该处理 shortcuts 为空的情况', () => {
    const store = useFolderShortcutStore.getState()
    
    // shortcuts 为空数组
    useFolderShortcutStore.setState({ shortcuts: [] })
    
    const env: EnvironmentConfig = {
      id: 'env1',
      general: {
        name: '测试环境',
        comfyuiDirectory: '/path/to/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: true
      },
      acceleration: {
        inputDirectory: '/path/to/input',
        outputDirectory: '/path/to/output',
        baseDirectory: '/path/to/models',
        device: 'cuda',
        extraArgs: []
      },
      modelPathConfigs: []
    }
    
    // 不应该抛出错误
    expect(() => store.syncDefaultPaths(env)).not.toThrow()
    
    // shortcuts 应该保持为空
    const shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts).toEqual([])
  })

  it('应该跳过路径未变化的更新', () => {
    const store = useFolderShortcutStore.getState()
    
    const initialShortcuts: FolderShortcut[] = [
      { id: 'input', name: '输入', path: '/path/to/input', icon: 'FolderInput', order: 0, isDefault: true }
    ]
    useFolderShortcutStore.setState({ shortcuts: initialShortcuts })
    
    const env: EnvironmentConfig = {
      id: 'env1',
      general: {
        name: '测试环境',
        comfyuiDirectory: '/path/to/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: true
      },
      acceleration: {
        inputDirectory: '/path/to/input',  // 相同的路径
        outputDirectory: '/path/to/output',
        baseDirectory: '/path/to/models',
        device: 'cuda',
        extraArgs: []
      },
      modelPathConfigs: []
    }
    
    // 记录初始引用
    const initialReference = useFolderShortcutStore.getState().shortcuts
    
    store.syncDefaultPaths(env)
    
    // 由于路径未变化，shortcuts 引用应该保持不变
    const shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts).toBe(initialReference)
  })

  it('应该只更新默认文件夹，不影响自定义文件夹', () => {
    const store = useFolderShortcutStore.getState()
    
    const initialShortcuts: FolderShortcut[] = [
      { id: 'input', name: '输入', path: '/old/input', icon: 'FolderInput', order: 0, isDefault: true },
      { id: 'custom1', name: '自定义1', path: '/custom1', icon: 'Folder', order: 1, isDefault: false },
      { id: 'output', name: '输出', path: '/old/output', icon: 'FolderOutput', order: 2, isDefault: true },
      { id: 'custom2', name: '自定义2', path: '/custom2', icon: 'Folder', order: 3, isDefault: false }
    ]
    useFolderShortcutStore.setState({ shortcuts: initialShortcuts })
    
    const env: EnvironmentConfig = {
      id: 'env1',
      general: {
        name: '测试环境',
        comfyuiDirectory: '/path/to/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: true
      },
      acceleration: {
        inputDirectory: '/new/input',
        outputDirectory: '/new/output',
        baseDirectory: '/new/models',
        device: 'cuda',
        extraArgs: []
      },
      modelPathConfigs: []
    }
    store.syncDefaultPaths(env)
    
    const shortcuts = useFolderShortcutStore.getState().shortcuts
    
    // 默认文件夹应该更新
    expect(shortcuts[0].path).toBe('/new/input')
    expect(shortcuts[2].path).toBe('/new/output')
    
    // 自定义文件夹应该保持不变
    expect(shortcuts[1].path).toBe('/custom1')
    expect(shortcuts[3].path).toBe('/custom2')
  })
})
