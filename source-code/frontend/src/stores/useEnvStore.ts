/**
 * 环境设置状态管理Store
 */

import { create } from 'zustand'
import type { EnvStore, EnvironmentConfig } from '@/types/environment'
import { bridgeService } from '@/services/bridge'

let fetchEnvironmentsPromise: Promise<void> | null = null

export const useEnvStore = create<EnvStore>((set, get) => ({
  environments: [],
  currentEnvId: null,
  loading: false,
  error: null,
  computeDevices: [],
  pytorchBackend: null,
  initialized: false,
  onEnvironmentChange: undefined,

  setOnEnvironmentChange: (callback) => {
    set({ onEnvironmentChange: callback })
  },

  fetchEnvironments: async (force: boolean = false) => {
    const state = get()
    
    if (state.initialized && !force && state.environments.length > 0) {
      console.log('[useEnvStore] 环境列表已加载，跳过重复请求')
      return
    }
    
    if (fetchEnvironmentsPromise && !force) {
      console.log('[useEnvStore] 已有请求进行中，等待完成')
      await fetchEnvironmentsPromise
      return
    }
    
    set({ loading: true, error: null })
    
    fetchEnvironmentsPromise = (async () => {
      try {
        const response = await bridgeService.getEnvironments()
        
        if (!response.success) {
          throw new Error(response.error_message || 'Failed to fetch environments')
        }
        
        set({
          environments: response.environments || [],
          currentEnvId: response.current_environment_id || null,
          loading: false,
          initialized: true
        })
        
        // 有当前环境时，后台初始化 node type map
        if (response.current_environment_id) {
          bridgeService.initializeNodeTypeMapAsync().catch(err => {
            console.warn('[useEnvStore] 后台初始化 node type map 失败:', err)
          })
        }
        
        const state = get()
        if (!force && !state.initialized) {
          console.log('[useEnvStore] 启动异步依赖信息更新')
          try {
            await bridgeService.startAsyncDependenciesUpdate()
          } catch (error) {
            console.warn('[useEnvStore] 启动异步依赖信息更新失败:', error)
          }
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch environments',
          loading: false
        })
      } finally {
        fetchEnvironmentsPromise = null
      }
    })()
    
    await fetchEnvironmentsPromise
  },

  // 操作：切换环境（优化版）
  switchEnvironment: async (envId: string) => {
    // 保存原始状态用于回滚
    const originalEnvId = get().currentEnvId
    
    set({ loading: true, error: null })
    
    try {
      // 1. 立即更新本地 currentEnvId（乐观更新）
      set({ currentEnvId: envId })
      
      // 2. 调用后端 API 保存
      const response = await bridgeService.set_current_environment(envId)
      
      if (!response.success) {
        throw new Error(response.error_message || 'Failed to switch environment')
      }
      
      // 3. 更新环境列表中的 isActive 状态（不刷新整个列表）
      const updatedEnvironments = get().environments.map(env => ({
        ...env,
        isActive: env.id === envId
      }))
      
      set({
        environments: updatedEnvironments,
        loading: false
      })
      
      const { onEnvironmentChange } = get()
      if (onEnvironmentChange) {
        onEnvironmentChange()
      }
      
      // 后台初始化 node type map
      bridgeService.initializeNodeTypeMapAsync().catch(err => {
        console.warn('[useEnvStore] 后台初始化 node type map 失败:', err)
      })
      
      console.log('[useEnvStore] 环境切换成功，使用乐观更新策略')
    } catch (error) {
      // 失败时回滚到原始状态
      console.error('[useEnvStore] 环境切换失败，回滚状态:', error)
      set({
        currentEnvId: originalEnvId,
        error: error instanceof Error ? error.message : 'Failed to switch environment',
        loading: false
      })
      throw error
    }
  },

  // 操作：获取环境配置
  getEnvConfig: async (envId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await bridgeService.getEnvironments()
      
      if (!response.success) {
        throw new Error(response.error_message || 'Failed to get environment config')
      }
      
      const env = response.environments?.find(e => e.id === envId)
      
      if (!env) {
        throw new Error('Environment not found')
      }
      
      set({ loading: false })
      return env
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get environment config',
        loading: false
      })
      throw error
    }
  },

  // 操作：保存环境配置（乐观更新策略）
  saveEnvConfig: async (envId: string, config: EnvironmentConfig) => {
    // 1. 创建状态快照（用于失败时回滚）
    const snapshot = {
      environments: get().environments,
      currentEnvId: get().currentEnvId,
      loading: get().loading,
      error: get().error
    }
    
    set({ loading: true, error: null })
    
    try {
      // 2. 乐观更新：立即更新本地状态
      const optimisticEnvironments = get().environments.map(env => {
        if (env.id === envId) {
          // 合并配置，保持其他字段不变
          return {
            ...env,
            general: config.general ? { ...env.general, ...config.general } : env.general,
            acceleration: config.acceleration ? { ...env.acceleration, ...config.acceleration } : env.acceleration,
            modelPathConfigs: config.modelPathConfigs !== undefined ? config.modelPathConfigs : env.modelPathConfigs,
            advancedEnvVars: config.advancedEnvVars !== undefined ? config.advancedEnvVars : env.advancedEnvVars  // 新增
          }
        }
        return env
      })
      
      set({
        environments: optimisticEnvironments,
        loading: true  // 保持 loading 状态，表示正在保存
      })
      
      // 3. 调用后端 API 保存
      const response = await bridgeService.updateEnvironment(envId, config)
      
      if (!response.success) {
        throw new Error(response.error_message || 'Failed to save environment config')
      }
      
      // 4. 保存成功：确认本地状态，使用后端返回的完整环境对象
      if (response.environment) {
        const updatedEnvironments = get().environments.map(env =>
          env.id === envId ? response.environment! : env
        )
        set({
          environments: updatedEnvironments,
          loading: false,
          error: null
        })
      } else {
        // 如果后端没有返回完整对象，保持乐观更新的状态
        set({
          loading: false,
          error: null
        })
      }
      
      console.log('[useEnvStore] 配置保存成功，使用乐观更新策略')
    } catch (error) {
      // 5. 保存失败：回滚到快照状态
      console.error('[useEnvStore] 配置保存失败，回滚状态:', error)
      set({
        environments: snapshot.environments,
        currentEnvId: snapshot.currentEnvId,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to save environment config'
      })
      throw error
    }
  },

  // 操作：搜寻Python目录
  searchPython: async (comfyuiPath: string) => {
    set({ loading: true, error: null })
    try {
      const response = await bridgeService.scanEnvironment(comfyuiPath)
      
      if (!response.success || !response.scan_result) {
        throw new Error(response.error_message || 'Failed to scan environment')
      }
      
      set({ loading: false })
      return {
        pythonPath: response.scan_result.python_directory || null,
        pipPath: response.scan_result.pip_directory || null
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to search Python directory',
        loading: false
      })
      throw error
    }
  },

  // 操作：获取依赖信息
  getDependencies: async (envId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await bridgeService.getDependencies(envId)
      
      if (!response.success || !response.dependencies) {
        throw new Error(response.error_message || 'Failed to get dependencies')
      }
      
      set({ loading: false })
      return response.dependencies
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get dependencies',
        loading: false
      })
      throw error
    }
  },

  // 操作：应用预设方案
  applyPreset: async (envId: string, presetId: string) => {
    set({ loading: true, error: null })
    try {
      // 检查是否在开发环境
      const isDev = !window.pywebview || !window.pywebview.api
      
      if (isDev) {
        // 使用 Mock 数据
        const { applyPreset: mockApplyPreset } = await import('@/mocks/env')
        await mockApplyPreset(envId, presetId)
        
        // 重新获取环境列表（强制刷新）
        const response = await bridgeService.getEnvironments()
        
        if (!response.success) {
          throw new Error(response.error_message || 'Failed to fetch environments')
        }
        
        set({
          environments: response.environments || [],
          loading: false
        })
      } else {
        // TODO: 后端需要实现预设方案API
        throw new Error('预设方案功能尚未实现')
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to apply preset',
        loading: false
      })
      throw error
    }
  },

  // 操作：删除环境
  deleteEnvironment: async (envId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await bridgeService.deleteEnvironment(envId)
      
      if (!response.success) {
        throw new Error(response.error_message || 'Failed to delete environment')
      }
      
      // 重新获取环境列表（强制刷新）
      const envResponse = await bridgeService.getEnvironments()
      
      if (!envResponse.success) {
        throw new Error(envResponse.error_message || 'Failed to fetch environments')
      }
      
      set({
        environments: envResponse.environments || [],
        currentEnvId: envResponse.current_environment_id || null,
        loading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete environment',
        loading: false
      })
      throw error
    }
  },

  // 操作：创建环境
  createEnvironment: async (comfyuiPath: string) => {
    set({ loading: true, error: null })
    try {
      // 先扫描环境验证路径
      const scanResponse = await bridgeService.scanEnvironment(comfyuiPath)
      
      if (!scanResponse.success || !scanResponse.scan_result?.is_valid) {
        throw new Error(scanResponse.scan_result?.error_message || '所选文件夹不是有效的ComfyUI目录')
      }
      
      // 添加环境
      const response = await bridgeService.addEnvironment(comfyuiPath)
      
      if (!response.success || !response.environment) {
        throw new Error(response.error_message || 'Failed to create environment')
      }
      
      // 使用乐观更新：直接将新环境添加到现有列表中
      const newEnvironment = response.environment
      const currentEnvironments = get().environments
      
      set({
        environments: [...currentEnvironments, newEnvironment],
        currentEnvId: newEnvironment.id,
        loading: false
      })
      
      // 异步触发依赖信息更新（不阻塞，不等待结果）
      bridgeService.startAsyncDependenciesUpdate().catch(err => {
        console.warn('[useEnvStore] 异步依赖信息更新失败:', err)
      })
      
      // 后台初始化 node type map
      bridgeService.initializeNodeTypeMapAsync().catch(err => {
        console.warn('[useEnvStore] 后台初始化 node type map 失败:', err)
      })
      
      console.log('[useEnvStore] 环境创建成功，使用乐观更新策略')
      
      return newEnvironment
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create environment',
        loading: false
      })
      throw error
    }
  },

  // 操作：验证ComfyUI路径
  validateComfyUIPath: async (path: string) => {
    try {
      const response = await bridgeService.scanEnvironment(path)
      return response.success && response.scan_result?.is_valid === true
    } catch {
      return false
    }
  },

  // 操作：获取计算设备列表
  fetchComputeDevices: async () => {
    try {
      const devices = await bridgeService.getComputeDevices()
      set({ computeDevices: devices })
    } catch (error) {
      console.error('Failed to fetch compute devices:', error)
      set({ computeDevices: [] })
    }
  },

  // 操作：获取过滤后的计算设备列表（根据 PyTorch 后端兼容性）
  fetchFilteredComputeDevices: async (envId: string) => {
    try {
      const response = await bridgeService.getFilteredComputeDevices(envId)
      if (response.success && response.devices) {
        set({
          computeDevices: response.devices,
          pytorchBackend: response.pytorchBackend || null,
        })
      } else {
        const devices = await bridgeService.getComputeDevices()
        set({ computeDevices: devices, pytorchBackend: null })
      }
    } catch (error) {
      console.error('Failed to fetch filtered compute devices:', error)
      try {
        const devices = await bridgeService.getComputeDevices()
        set({ computeDevices: devices, pytorchBackend: null })
      } catch {
        set({ computeDevices: [], pytorchBackend: null })
      }
    }
  },

  // 操作：重排序环境列表
  reorderEnvironments: async (envIds: string[]) => {
    const previousEnvironments = get().environments
    
    try {
      // 乐观更新：立即更新本地状态
      const envMap = new Map(previousEnvironments.map(env => [env.id, env]))
      const reorderedEnvironments = envIds
        .map(id => envMap.get(id))
        .filter((env): env is EnvironmentConfig => env !== undefined)
      
      set({ environments: reorderedEnvironments })
      
      // 调用后端 API 保存
      const response = await bridgeService.reorderEnvironments(envIds)
      
      if (!response.success) {
        throw new Error(response.error_message || 'Failed to reorder environments')
      }
      
      console.log('[useEnvStore] 环境排序已保存')
    } catch (error) {
      // 失败时回滚到之前的状态
      console.error('[useEnvStore] 环境排序失败，回滚状态:', error)
      set({
        environments: previousEnvironments,
        error: error instanceof Error ? error.message : 'Failed to reorder environments'
      })
      throw error
    }
  }
}))
