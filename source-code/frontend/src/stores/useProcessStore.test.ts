/**
 * useProcessStore 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useProcessStore } from './useProcessStore'

describe('useProcessStore - 扩展功能测试', () => {
  beforeEach(() => {
    // 重置 store 状态
    useProcessStore.setState({
      comfyUIStatus: null,
      status: { isRunning: false },
      loading: false
    })
  })

  describe('loadComfyUIStatus', () => {
    it('应该成功加载 ComfyUI 状态（开发环境）', async () => {
      const store = useProcessStore.getState()
      
      await store.loadComfyUIStatus()
      
      const state = useProcessStore.getState()
      expect(state.comfyUIStatus).not.toBeNull()
      expect(state.loading).toBe(false)
      
      // 验证数据结构
      expect(state.comfyUIStatus).toHaveProperty('isRunning')
    })

    it('应该同步更新 status 状态', async () => {
      const store = useProcessStore.getState()
      
      await store.loadComfyUIStatus()
      
      const state = useProcessStore.getState()
      
      // comfyUIStatus 和 status 应该保持一致
      expect(state.status.isRunning).toBe(state.comfyUIStatus?.isRunning)
      
      if (state.comfyUIStatus?.isRunning) {
        expect(state.status.pid).toBe(state.comfyUIStatus.pid)
        expect(state.status.port).toBe(state.comfyUIStatus.port)
        expect(state.status.uptime).toBe(state.comfyUIStatus.uptime)
        expect(state.status.url).toBe(state.comfyUIStatus.url)
      }
    })
  })

  describe('openComfyUI', () => {
    it('当 ComfyUI 未运行时应该抛出错误', async () => {
      const store = useProcessStore.getState()
      
      // 设置为未运行状态
      useProcessStore.setState({
        comfyUIStatus: { isRunning: false }
      })
      
      await expect(store.openComfyUI()).rejects.toThrow('ComfyUI 未运行')
    })

    it('当 ComfyUI 运行时应该成功打开', async () => {
      const store = useProcessStore.getState()
      
      // 设置为运行状态
      useProcessStore.setState({
        comfyUIStatus: {
          isRunning: true,
          pid: 12345,
          port: 8188,
          url: 'http://127.0.0.1:8188'
        }
      })
      
      // 应该不抛出错误
      await expect(store.openComfyUI()).resolves.not.toThrow()
    })
  })

  describe('startComfyUI', () => {
    it('应该成功启动 ComfyUI（开发环境）', async () => {
      const store = useProcessStore.getState()
      
      await store.startComfyUI()
      
      const state = useProcessStore.getState()
      
      // 开发环境会模拟启动成功
      expect(state.comfyUIStatus).not.toBeNull()
      expect(state.comfyUIStatus?.isRunning).toBe(true)
      expect(state.loading).toBe(false)
      expect(state.isStarting).toBe(false) // 启动完成后应该清除启动中状态
    }, 10000) // 增加超时时间到 10 秒

    it('启动后应该同步更新 status', async () => {
      const store = useProcessStore.getState()
      
      await store.startComfyUI()
      
      const state = useProcessStore.getState()
      
      // status 应该与 comfyUIStatus 一致
      expect(state.status.isRunning).toBe(true)
      expect(state.status.pid).toBeDefined()
      expect(state.status.port).toBeDefined()
    }, 10000) // 增加超时时间到 10 秒
  })

  describe('向后兼容性', () => {
    it('应该保留原有的 status 状态', () => {
      const state = useProcessStore.getState()
      
      expect(state.status).toBeDefined()
      expect(state.status).toHaveProperty('isRunning')
    })

    it('应该保留原有的 logs 状态', () => {
      const state = useProcessStore.getState()
      
      expect(state.logs).toBeDefined()
      expect(Array.isArray(state.logs)).toBe(true)
    })

    it('应该保留原有的 setStatus 方法', () => {
      const store = useProcessStore.getState()
      
      store.setStatus({
        isRunning: true,
        pid: 999,
        port: 8188
      })
      
      const state = useProcessStore.getState()
      expect(state.status.isRunning).toBe(true)
      expect(state.status.pid).toBe(999)
      expect(state.status.port).toBe(8188)
    })

    it('应该保留原有的日志管理方法', () => {
      const store = useProcessStore.getState()
      
      // addLog
      store.addLog('测试日志1')
      store.addLog('测试日志2')
      
      let state = useProcessStore.getState()
      expect(state.logs).toHaveLength(2)
      expect(state.logs[0]).toBe('测试日志1')
      expect(state.logs[1]).toBe('测试日志2')
      
      // setLogs
      store.setLogs(['新日志1', '新日志2'])
      state = useProcessStore.getState()
      expect(state.logs).toHaveLength(2)
      expect(state.logs[0]).toBe('新日志1')
      
      // clearLogs
      store.clearLogs()
      state = useProcessStore.getState()
      expect(state.logs).toHaveLength(0)
    })

    it('应该保留原有的 setLoading 方法', () => {
      const store = useProcessStore.getState()
      
      store.setLoading(true)
      expect(useProcessStore.getState().loading).toBe(true)
      
      store.setLoading(false)
      expect(useProcessStore.getState().loading).toBe(false)
    })
  })
})
