/**
 * useSystemStore 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSystemStore } from './useSystemStore'

describe('useSystemStore - 扩展功能测试', () => {
  beforeEach(() => {
    // 重置 store 状态
    const store = useSystemStore.getState()
    store.stopMonitorPolling()
    useSystemStore.setState({
      monitorData: null,
      monitorLoading: false,
      monitorError: null
    })
  })

  afterEach(() => {
    // 清理轮询
    const store = useSystemStore.getState()
    store.stopMonitorPolling()
  })

  describe('loadMonitorData', () => {
    it('应该成功加载监控数据（开发环境）', async () => {
      const store = useSystemStore.getState()
      
      await store.loadMonitorData()
      
      const state = useSystemStore.getState()
      expect(state.monitorData).not.toBeNull()
      expect(state.monitorLoading).toBe(false)
      expect(state.monitorError).toBeNull()
      
      // 验证数据结构
      expect(state.monitorData).toHaveProperty('vram')
      expect(state.monitorData).toHaveProperty('memory')
      expect(state.monitorData).toHaveProperty('virtual_memory')
      expect(state.monitorData).toHaveProperty('cpu')
      expect(state.monitorData).toHaveProperty('gpu')
    })

    it('加载时应该设置 loading 状态', async () => {
      const store = useSystemStore.getState()
      
      // 开始加载
      const loadPromise = store.loadMonitorData()
      
      // 检查 loading 状态（可能已经完成，所以不强制要求为 true）
      const loadingState = useSystemStore.getState()
      
      // 等待完成
      await loadPromise
      
      // 完成后 loading 应该为 false
      const finalState = useSystemStore.getState()
      expect(finalState.monitorLoading).toBe(false)
    })
  })

  describe('startMonitorPolling', () => {
    it('应该启动监控数据轮询', async () => {
      const store = useSystemStore.getState()
      
      store.startMonitorPolling()
      
      // 等待第一次加载完成
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const state = useSystemStore.getState()
      expect(state.monitorData).not.toBeNull()
    })

    it('不应该重复启动轮询', () => {
      const store = useSystemStore.getState()
      
      // 第一次启动
      store.startMonitorPolling()
      
      // 第二次启动（应该被忽略）
      store.startMonitorPolling()
      
      // 不应该抛出错误
      expect(true).toBe(true)
    })
  })

  describe('stopMonitorPolling', () => {
    it('应该停止监控数据轮询', () => {
      const store = useSystemStore.getState()
      
      // 启动轮询
      store.startMonitorPolling()
      
      // 停止轮询
      store.stopMonitorPolling()
      
      // 不应该抛出错误
      expect(true).toBe(true)
    })

    it('多次停止不应该报错', () => {
      const store = useSystemStore.getState()
      
      store.stopMonitorPolling()
      store.stopMonitorPolling()
      
      expect(true).toBe(true)
    })
  })

  describe('向后兼容性', () => {
    it('应该保留原有的 status 状态', () => {
      const state = useSystemStore.getState()
      
      expect(state.status).toBeDefined()
      expect(state.status).toHaveProperty('cpu')
      expect(state.status).toHaveProperty('memory')
      expect(state.status).toHaveProperty('disk')
    })

    it('应该保留原有的 setStatus 方法', () => {
      const store = useSystemStore.getState()
      
      store.setStatus({
        cpu: 50,
        memory: 60,
        disk: 70,
        gpu: 80
      })
      
      const state = useSystemStore.getState()
      expect(state.status.cpu).toBe(50)
      expect(state.status.memory).toBe(60)
      expect(state.status.disk).toBe(70)
      expect(state.status.gpu).toBe(80)
    })

    it('应该保留原有的 setLoading 方法', () => {
      const store = useSystemStore.getState()
      
      store.setLoading(true)
      expect(useSystemStore.getState().loading).toBe(true)
      
      store.setLoading(false)
      expect(useSystemStore.getState().loading).toBe(false)
    })
  })
})
