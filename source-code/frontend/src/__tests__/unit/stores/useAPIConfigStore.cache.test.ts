/**
 * useAPIConfigStore 缓存功能测试
 * 
 * 验证需求：10.2, 10.3, 10.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAPIConfigStore } from '../../../stores/useAPIConfigStore'

describe('useAPIConfigStore - 缓存功能', () => {
  beforeEach(() => {
    // 重置 store 状态
    const store = useAPIConfigStore.getState()
    store.configs = []
    store.cacheTimestamp = null
    store.isLoading = false
    store.error = null
    
    // 清除所有 mock
    vi.clearAllMocks()
  })

  it('应该在首次加载时设置缓存时间戳', async () => {
    // Mock pywebview API
    window.pywebview = {
      api: {
        ai_list_configs: vi.fn().mockResolvedValue({
          success: true,
          configs: [
            {
              id: 'config-1',
              alias: '测试配置',
              provider: 'openai',
              api_key: 'sk-test',
              model: 'gpt-4',
              models: ['gpt-4'],
              extra: {},
              is_default: false,
              status: 'available',
              usage_count: 0,
              created_at: '2024-01-01T00:00:00.000Z',
              updated_at: '2024-01-01T00:00:00.000Z'
            }
          ]
        })
      }
    } as any

    const store = useAPIConfigStore.getState()
    
    // 首次加载
    await store.loadConfigs()
    
    // 重新获取状态以获取最新值
    const updatedStore = useAPIConfigStore.getState()
    
    // 验证缓存时间戳已设置
    expect(updatedStore.cacheTimestamp).not.toBeNull()
    expect(typeof updatedStore.cacheTimestamp).toBe('number')
    expect(updatedStore.cacheTimestamp).toBeGreaterThan(0)
  })

  it('应该在缓存有效期内使用缓存（不重复请求）', async () => {
    const mockListConfigs = vi.fn().mockResolvedValue({
      success: true,
      configs: [
        {
          id: 'config-1',
          alias: '测试配置',
          provider: 'openai',
          api_key: 'sk-test',
          model: 'gpt-4',
          models: ['gpt-4'],
          extra: {},
          is_default: false,
          status: 'available',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ]
    })

    window.pywebview = {
      api: {
        ai_list_configs: mockListConfigs
      }
    } as any

    const store = useAPIConfigStore.getState()
    
    // 首次加载
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(1)
    
    // 第二次加载（缓存有效）
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(1) // 仍然是 1 次，没有重复请求
    
    // 第三次加载（缓存有效）
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(1) // 仍然是 1 次
  })

  it('应该在强制刷新时忽略缓存', async () => {
    const mockListConfigs = vi.fn().mockResolvedValue({
      success: true,
      configs: []
    })

    window.pywebview = {
      api: {
        ai_list_configs: mockListConfigs
      }
    } as any

    const store = useAPIConfigStore.getState()
    
    // 首次加载
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(1)
    
    // 强制刷新
    await store.loadConfigs(true)
    expect(mockListConfigs).toHaveBeenCalledTimes(2) // 应该重新请求
  })

  it('应该在创建配置后使缓存失效', async () => {
    const mockListConfigs = vi.fn().mockResolvedValue({
      success: true,
      configs: []
    })

    const mockCreateConfig = vi.fn().mockResolvedValue({
      success: true,
      config_id: 'new-config-id'
    })

    window.pywebview = {
      api: {
        ai_list_configs: mockListConfigs,
        ai_create_config: mockCreateConfig
      }
    } as any

    const store = useAPIConfigStore.getState()
    
    // 首次加载
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(1)
    
    // 创建配置
    await store.createConfig({
      alias: '新配置',
      provider: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4'
    })
    
    // 验证缓存已失效并重新加载
    expect(mockListConfigs).toHaveBeenCalledTimes(2) // 创建后自动刷新
  })

  it('应该在更新配置后使缓存失效', async () => {
    const mockListConfigs = vi.fn().mockResolvedValue({
      success: true,
      configs: []
    })

    const mockUpdateConfig = vi.fn().mockResolvedValue({
      success: true
    })

    window.pywebview = {
      api: {
        ai_list_configs: mockListConfigs,
        ai_update_config: mockUpdateConfig
      }
    } as any

    const store = useAPIConfigStore.getState()
    
    // 首次加载
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(1)
    
    // 更新配置
    await store.updateConfig('config-1', {
      alias: '更新后的配置',
      provider: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4'
    })
    
    // 验证缓存已失效并重新加载
    expect(mockListConfigs).toHaveBeenCalledTimes(2)
  })

  it('应该在删除配置后使缓存失效', async () => {
    const mockListConfigs = vi.fn().mockResolvedValue({
      success: true,
      configs: []
    })

    const mockDeleteConfig = vi.fn().mockResolvedValue({
      success: true
    })

    window.pywebview = {
      api: {
        ai_list_configs: mockListConfigs,
        ai_delete_config: mockDeleteConfig
      }
    } as any

    const store = useAPIConfigStore.getState()
    
    // 首次加载
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(1)
    
    // 删除配置
    await store.deleteConfig('config-1')
    
    // 验证缓存已失效并重新加载
    expect(mockListConfigs).toHaveBeenCalledTimes(2)
  })

  it('应该在设置默认配置后使缓存失效', async () => {
    const mockListConfigs = vi.fn().mockResolvedValue({
      success: true,
      configs: []
    })

    const mockSetDefaultConfig = vi.fn().mockResolvedValue({
      success: true
    })

    window.pywebview = {
      api: {
        ai_list_configs: mockListConfigs,
        ai_set_default_config: mockSetDefaultConfig
      }
    } as any

    const store = useAPIConfigStore.getState()
    
    // 首次加载
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(1)
    
    // 设置默认配置
    await store.setDefaultConfig('config-1')
    
    // 验证缓存已失效并重新加载
    expect(mockListConfigs).toHaveBeenCalledTimes(2)
  })

  it('应该在测试配置后使缓存失效', async () => {
    const mockListConfigs = vi.fn().mockResolvedValue({
      success: true,
      configs: []
    })

    const mockTestConfig = vi.fn().mockResolvedValue({
      success: true,
      available: true,
      latency: 123.45,
      message: '连接成功'
    })

    window.pywebview = {
      api: {
        ai_list_configs: mockListConfigs,
        ai_test_config: mockTestConfig
      }
    } as any

    const store = useAPIConfigStore.getState()
    
    // 首次加载
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(1)
    
    // 测试配置
    await store.testConfig('config-1')
    
    // 验证缓存已失效并重新加载
    expect(mockListConfigs).toHaveBeenCalledTimes(2)
  })

  it('invalidateCache 方法应该清除缓存时间戳', () => {
    // 手动设置缓存时间戳
    useAPIConfigStore.setState({ cacheTimestamp: Date.now() })
    
    // 验证缓存时间戳已设置
    let currentStore = useAPIConfigStore.getState()
    expect(currentStore.cacheTimestamp).not.toBeNull()
    
    // 使缓存失效
    currentStore.invalidateCache()
    
    // 验证缓存时间戳已清除
    const updatedStore = useAPIConfigStore.getState()
    expect(updatedStore.cacheTimestamp).toBeNull()
  })

  it('应该在缓存过期后重新请求（5分钟后）', async () => {
    const mockListConfigs = vi.fn().mockResolvedValue({
      success: true,
      configs: []
    })

    window.pywebview = {
      api: {
        ai_list_configs: mockListConfigs
      }
    } as any

    const store = useAPIConfigStore.getState()
    
    // 首次加载
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(1)
    
    // 模拟缓存过期（设置为 6 分钟前）
    const sixMinutesAgo = Date.now() - (6 * 60 * 1000)
    useAPIConfigStore.setState({ cacheTimestamp: sixMinutesAgo })
    
    // 再次加载（缓存已过期）
    await store.loadConfigs()
    expect(mockListConfigs).toHaveBeenCalledTimes(2) // 应该重新请求
  })
})
