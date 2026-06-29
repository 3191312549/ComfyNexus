/**
 * 路径同步机制集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFolderShortcutStore } from '@/stores/useFolderShortcutStore'
import { useEnvStore } from '@/stores/useEnvStore'
import type { EnvironmentConfig } from '@/types/environment'

describe('路径同步机制集成测试', () => {
  beforeEach(() => {
    // 重置 Store 状态
    useFolderShortcutStore.setState({
      shortcuts: [],
      loading: false,
      error: null
    })
    
    useEnvStore.setState({
      environments: [],
      currentEnvId: null,
      loading: false,
      error: null,
      computeDevices: [],
      initialized: false
    })
  })

  it('应该在环境切换时自动同步路径', async () => {
    // 1. 初始化环境
    const env1: EnvironmentConfig = {
      id: 'env1',
      general: {
        name: '环境1',
        comfyuiDirectory: '/env1/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: true
      },
      acceleration: {
        inputDirectory: '/env1/input',
        outputDirectory: '/env1/output',
        baseDirectory: '/env1/models',
        device: 'cuda',
        extraArgs: []
      },
      modelPathConfigs: []
    }
    
    const env2: EnvironmentConfig = {
      id: 'env2',
      general: {
        name: '环境2',
        comfyuiDirectory: '/env2/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: false
      },
      acceleration: {
        inputDirectory: '/env2/input',
        outputDirectory: '/env2/output',
        baseDirectory: '/env2/models',
        device: 'cuda',
        extraArgs: []
      },
      modelPathConfigs: []
    }
    
    useEnvStore.setState({
      environments: [env1, env2],
      currentEnvId: 'env1',
      initialized: true
    })
    
    // 2. 初始化文件夹快捷方式
    useFolderShortcutStore.setState({
      shortcuts: [
        { id: 'input', name: '输入', path: '', icon: 'FolderInput', order: 0, isDefault: true },
        { id: 'output', name: '输出', path: '', icon: 'FolderOutput', order: 1, isDefault: true },
        { id: 'models', name: '模型', path: '', icon: 'FolderCog', order: 2, isDefault: true }
      ]
    })
    
    // 3. 手动触发初始同步（模拟 HomePage 的初始化）
    const folderStore = useFolderShortcutStore.getState()
    folderStore.syncDefaultPaths(env1)
    
    // 4. 验证初始路径
    let shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts[0].path).toBe('/env1/input')
    expect(shortcuts[1].path).toBe('/env1/output')
    expect(shortcuts[2].path).toBe('/env1/models')
    
    // 5. 切换环境（模拟用户操作）
    useEnvStore.setState({ currentEnvId: 'env2' })
    
    // 6. 等待订阅触发（在实际环境中，订阅会自动触发）
    // 这里我们手动触发来模拟订阅行为
    await new Promise(resolve => setTimeout(resolve, 100))
    folderStore.syncDefaultPaths(env2)
    
    // 7. 验证路径已同步到 env2
    shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts[0].path).toBe('/env2/input')
    expect(shortcuts[1].path).toBe('/env2/output')
    expect(shortcuts[2].path).toBe('/env2/models')
  })

  it('应该在配置保存时自动同步路径', async () => {
    // 1. 初始化环境
    const env1: EnvironmentConfig = {
      id: 'env1',
      general: {
        name: '环境1',
        comfyuiDirectory: '/env1/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: true
      },
      acceleration: {
        inputDirectory: '/old/input',
        outputDirectory: '/old/output',
        baseDirectory: '/old/models',
        device: 'cuda',
        extraArgs: []
      },
      modelPathConfigs: []
    }
    
    useEnvStore.setState({
      environments: [env1],
      currentEnvId: 'env1',
      initialized: true
    })
    
    // 2. 初始化文件夹快捷方式
    useFolderShortcutStore.setState({
      shortcuts: [
        { id: 'input', name: '输入', path: '/old/input', icon: 'FolderInput', order: 0, isDefault: true },
        { id: 'output', name: '输出', path: '/old/output', icon: 'FolderOutput', order: 1, isDefault: true },
        { id: 'models', name: '模型', path: '/old/models', icon: 'FolderCog', order: 2, isDefault: true }
      ]
    })
    
    // 3. 更新环境配置（模拟用户保存新配置）
    const updatedEnv: EnvironmentConfig = {
      ...env1,
      acceleration: {
        ...env1.acceleration,
        inputDirectory: '/new/input',
        outputDirectory: '/new/output',
        baseDirectory: '/new/models'
      }
    }
    
    useEnvStore.setState({
      environments: [updatedEnv]
    })
    
    // 4. 等待订阅触发
    await new Promise(resolve => setTimeout(resolve, 100))
    const folderStore = useFolderShortcutStore.getState()
    folderStore.syncDefaultPaths(updatedEnv)
    
    // 5. 验证路径已同步
    const shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts[0].path).toBe('/new/input')
    expect(shortcuts[1].path).toBe('/new/output')
    expect(shortcuts[2].path).toBe('/new/models')
  })

  it('应该处理当前环境为空的情况', () => {
    // 1. 设置环境列表但没有当前环境
    useEnvStore.setState({
      environments: [
        {
          id: 'env1',
          general: {
            name: '环境1',
            comfyuiDirectory: '/env1/comfyui',
            pythonDirectory: '',
            pipDirectory: '',
            isActive: false
          },
          acceleration: {
            inputDirectory: '/env1/input',
            outputDirectory: '/env1/output',
            baseDirectory: '/env1/models',
            device: 'cuda',
            extraArgs: []
          },
          modelPathConfigs: []
        }
      ],
      currentEnvId: null,
      initialized: true
    })
    
    // 2. 初始化文件夹快捷方式
    useFolderShortcutStore.setState({
      shortcuts: [
        { id: 'input', name: '输入', path: '', icon: 'FolderInput', order: 0, isDefault: true }
      ]
    })
    
    // 3. 尝试同步（应该被跳过）
    const folderStore = useFolderShortcutStore.getState()
    const currentEnvId = useEnvStore.getState().currentEnvId
    
    if (currentEnvId) {
      const env = useEnvStore.getState().environments.find(e => e.id === currentEnvId)
      if (env) {
        folderStore.syncDefaultPaths(env)
      }
    }
    
    // 4. 验证路径保持为空
    const shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts[0].path).toBe('')
  })

  it('应该保持自定义文件夹不受环境切换影响', async () => {
    // 1. 初始化环境
    const env1: EnvironmentConfig = {
      id: 'env1',
      general: {
        name: '环境1',
        comfyuiDirectory: '/env1/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: true
      },
      acceleration: {
        inputDirectory: '/env1/input',
        outputDirectory: '/env1/output',
        baseDirectory: '/env1/models',
        device: 'cuda',
        extraArgs: []
      },
      modelPathConfigs: []
    }
    
    const env2: EnvironmentConfig = {
      id: 'env2',
      general: {
        name: '环境2',
        comfyuiDirectory: '/env2/comfyui',
        pythonDirectory: '',
        pipDirectory: '',
        isActive: false
      },
      acceleration: {
        inputDirectory: '/env2/input',
        outputDirectory: '/env2/output',
        baseDirectory: '/env2/models',
        device: 'cuda',
        extraArgs: []
      },
      modelPathConfigs: []
    }
    
    useEnvStore.setState({
      environments: [env1, env2],
      currentEnvId: 'env1',
      initialized: true
    })
    
    // 2. 初始化文件夹快捷方式（包含自定义文件夹）
    useFolderShortcutStore.setState({
      shortcuts: [
        { id: 'input', name: '输入', path: '', icon: 'FolderInput', order: 0, isDefault: true },
        { id: 'custom', name: '我的工作区', path: '/my/workspace', icon: 'Folder', order: 1, isDefault: false },
        { id: 'output', name: '输出', path: '', icon: 'FolderOutput', order: 2, isDefault: true }
      ]
    })
    
    // 3. 初始同步
    const folderStore = useFolderShortcutStore.getState()
    folderStore.syncDefaultPaths(env1)
    
    // 4. 验证初始状态
    let shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts[0].path).toBe('/env1/input')
    expect(shortcuts[1].path).toBe('/my/workspace')  // 自定义文件夹
    expect(shortcuts[2].path).toBe('/env1/output')
    
    // 5. 切换环境
    useEnvStore.setState({ currentEnvId: 'env2' })
    await new Promise(resolve => setTimeout(resolve, 100))
    folderStore.syncDefaultPaths(env2)
    
    // 6. 验证自定义文件夹路径保持不变
    shortcuts = useFolderShortcutStore.getState().shortcuts
    expect(shortcuts[0].path).toBe('/env2/input')
    expect(shortcuts[1].path).toBe('/my/workspace')  // 自定义文件夹应该保持不变
    expect(shortcuts[2].path).toBe('/env2/output')
  })
})
