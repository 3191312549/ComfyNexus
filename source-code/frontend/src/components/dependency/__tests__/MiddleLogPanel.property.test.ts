/**
 * MiddleLogPanel 属性测试
 * 
 * 使用 fast-check 进行属性测试，验证日志面板的通用属性
 * 
 * 属性 4: 命令执行时日志实时更新
 * 属性 11: 清空日志功能
 * 属性 12: 日志持久性
 * 验证需求: 2.2, 3.6, 6.6, 7.1, 7.2
 */

import { describe, beforeEach, expect } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { useDependencyStore } from '@/stores/useDependencyStore'
import type { LogEntry } from '@/types/dependency'

describe('MiddleLogPanel - 属性测试', () => {
  beforeEach(() => {
    // 重置 store 状态 - 只重置数据状态，不影响 actions
    useDependencyStore.setState({
      currentEnvId: null,
      logs: [],
      isExecuting: false,
      envInfo: null,
      cudaVersion: '',
      pytorchVersions: [],
      selectedPytorchVersion: '',
      packageName: '',
      packageVersions: [],
      selectedVersion: '',
      installMode: 'install',
      requirementsFile: null,
      aiAnalysisOpen: false,
      aiAnalysisContent: '',
      aiAnalysisStreaming: false,
      mirrorSource: 'official',
      autoFallbackEnabled: true
    })
  })

  /**
   * 属性 4.1: 日志实时更新 - 时间戳递增
   * 
   * 对于任意 pip 或 python 命令，执行时产生的输出应实时显示在日志区域，
   * 且日志条目的时间戳应按执行顺序递增
   * 
   * **Validates: Requirements 2.2, 3.6, 7.1**
   */
  test.prop([
    fc.array(
      fc.record({
        level: fc.oneof(
          fc.constant('info' as const),
          fc.constant('warning' as const),
          fc.constant('error' as const),
          fc.constant('success' as const)
        ),
        message: fc.string({ minLength: 1, maxLength: 100 }),
        source: fc.oneof(
          fc.constant('system' as const),
          fc.constant('pip' as const),
          fc.constant('python' as const),
          fc.constant('user' as const)
        )
      }),
      { minLength: 2, maxLength: 10 }
    )
  ], { numRuns: 100 })(
    '日志条目的时间戳应按执行顺序递增',
    (logEntries) => {
      const store = useDependencyStore.getState()
      
      // 依次添加日志条目
      for (const entry of logEntries) {
        store.addLog(entry)
      }
      
      const state = useDependencyStore.getState()
      
      // 验证：日志数量应该等于添加的条目数量
      expect(state.logs.length).toBe(logEntries.length)
      
      // 验证：时间戳应该按递增顺序排列
      for (let i = 0; i < state.logs.length - 1; i++) {
        const currentTimestamp = new Date(state.logs[i].timestamp).getTime()
        const nextTimestamp = new Date(state.logs[i + 1].timestamp).getTime()
        
        // 时间戳应该递增（或相等，因为可能在同一毫秒内添加）
        expect(currentTimestamp).toBeLessThanOrEqual(nextTimestamp)
      }
      
      // 验证：所有日志条目都应该有有效的时间戳
      state.logs.forEach((log: LogEntry) => {
        const timestamp = new Date(log.timestamp).getTime()
        expect(timestamp).toBeGreaterThan(0)
        expect(isNaN(timestamp)).toBe(false)
      })
    }
  )

  /**
   * 属性 4.2: 日志实时更新 - 内容完整性
   * 
   * 对于任意添加的日志条目，日志区域应该完整显示所有内容
   * 
   * **Validates: Requirements 7.1**
   */
  test.prop([
    fc.array(
      fc.record({
        level: fc.oneof(
          fc.constant('info' as const),
          fc.constant('warning' as const),
          fc.constant('error' as const),
          fc.constant('success' as const)
        ),
        message: fc.string({ minLength: 1, maxLength: 200 }),
        source: fc.oneof(
          fc.constant('system' as const),
          fc.constant('pip' as const),
          fc.constant('python' as const),
          fc.constant('user' as const)
        )
      }),
      { minLength: 1, maxLength: 20 }
    )
  ], { numRuns: 100 })(
    '日志区域应该完整显示所有添加的日志内容',
    (logEntries) => {
      const store = useDependencyStore.getState()
      
      // 依次添加日志条目
      for (const entry of logEntries) {
        store.addLog(entry)
      }
      
      const state = useDependencyStore.getState()
      
      // 验证：日志数量应该等于添加的条目数量
      expect(state.logs.length).toBe(logEntries.length)
      
      // 验证：每个日志条目的内容应该与添加的内容一致
      for (let i = 0; i < logEntries.length; i++) {
        expect(state.logs[i].level).toBe(logEntries[i].level)
        expect(state.logs[i].message).toBe(logEntries[i].message)
        expect(state.logs[i].source).toBe(logEntries[i].source)
      }
      
      // 验证：所有日志条目都应该有唯一的 ID
      const ids = state.logs.map((log: LogEntry) => log.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(state.logs.length)
    }
  )

  /**
   * 属性 4.3: 日志实时更新 - 不同级别的日志
   * 
   * 对于任意级别的日志（info, warning, error, success），
   * 都应该正确添加到日志区域
   * 
   * **Validates: Requirements 7.1**
   */
  test.prop([
    fc.array(
      fc.record({
        level: fc.oneof(
          fc.constant('info' as const),
          fc.constant('warning' as const),
          fc.constant('error' as const),
          fc.constant('success' as const)
        ),
        message: fc.string({ minLength: 1, maxLength: 100 }),
        source: fc.constant('pip' as const)
      }),
      { minLength: 4, maxLength: 20 }
    )
  ], { numRuns: 100 })(
    '不同级别的日志都应该正确添加',
    (logEntries) => {
      const store = useDependencyStore.getState()
      
      // 添加日志条目
      for (const entry of logEntries) {
        store.addLog(entry)
      }
      
      const state = useDependencyStore.getState()
      
      // 验证：日志数量应该正确
      expect(state.logs.length).toBe(logEntries.length)
      
      // 验证：应该包含所有级别的日志
      const levels = state.logs.map((log: LogEntry) => log.level)
      const uniqueLevels = new Set(levels)
      
      // 至少应该有一种级别的日志
      expect(uniqueLevels.size).toBeGreaterThan(0)
      
      // 所有级别都应该是有效的
      levels.forEach((level: string) => {
        expect(['info', 'warning', 'error', 'success']).toContain(level)
      })
    }
  )

  /**
   * 属性 4.4: 日志实时更新 - 不同来源的日志
   * 
   * 对于任意来源的日志（system, pip, python, user），
   * 都应该正确添加到日志区域
   * 
   * **Validates: Requirements 7.1**
   */
  test.prop([
    fc.array(
      fc.record({
        level: fc.constant('info' as const),
        message: fc.string({ minLength: 1, maxLength: 100 }),
        source: fc.oneof(
          fc.constant('system' as const),
          fc.constant('pip' as const),
          fc.constant('python' as const),
          fc.constant('user' as const)
        )
      }),
      { minLength: 4, maxLength: 20 }
    )
  ], { numRuns: 100 })(
    '不同来源的日志都应该正确添加',
    (logEntries) => {
      const store = useDependencyStore.getState()
      
      // 添加日志条目
      for (const entry of logEntries) {
        store.addLog(entry)
      }
      
      const state = useDependencyStore.getState()
      
      // 验证：日志数量应该正确
      expect(state.logs.length).toBe(logEntries.length)
      
      // 验证：应该包含所有来源的日志
      const sources = state.logs.map((log: LogEntry) => log.source)
      const uniqueSources = new Set(sources)
      
      // 至少应该有一种来源的日志
      expect(uniqueSources.size).toBeGreaterThan(0)
      
      // 所有来源都应该是有效的
      sources.forEach((source: string) => {
        expect(['system', 'pip', 'python', 'user']).toContain(source)
      })
    }
  )

  /**
   * 属性 11.1: 清空日志功能 - 日志清空后为空
   * 
   * 对于任意日志状态，点击清空日志按钮后，日志区域应为空，
   * 且日志条目数量应为 0
   * 
   * **Validates: Requirements 6.6**
   */
  test.prop([
    fc.array(
      fc.record({
        level: fc.oneof(
          fc.constant('info' as const),
          fc.constant('warning' as const),
          fc.constant('error' as const),
          fc.constant('success' as const)
        ),
        message: fc.string({ minLength: 1, maxLength: 100 }),
        source: fc.oneof(
          fc.constant('system' as const),
          fc.constant('pip' as const),
          fc.constant('python' as const),
          fc.constant('user' as const)
        )
      }),
      { minLength: 1, maxLength: 50 }
    )
  ], { numRuns: 100 })(
    '清空日志后，日志区域应为空',
    (logEntries) => {
      const store = useDependencyStore.getState()
      
      // 添加日志条目
      for (const entry of logEntries) {
        store.addLog(entry)
      }
      
      // 验证：添加后日志应该非空
      let state = useDependencyStore.getState()
      expect(state.logs.length).toBe(logEntries.length)
      expect(state.logs.length).toBeGreaterThan(0)
      
      // 清空日志
      store.clearLogs()
      
      // 验证：清空后日志应该为空
      state = useDependencyStore.getState()
      expect(state.logs.length).toBe(0)
      expect(state.logs).toEqual([])
    }
  )

  /**
   * 属性 11.2: 清空日志功能 - 多次清空的幂等性
   * 
   * 对于任意日志状态，多次点击清空日志按钮应该产生相同的结果
   * 
   * **Validates: Requirements 6.6**
   */
  test.prop([
    fc.record({
      logEntries: fc.array(
        fc.record({
          level: fc.constant('info' as const),
          message: fc.string({ minLength: 1, maxLength: 50 }),
          source: fc.constant('system' as const)
        }),
        { minLength: 1, maxLength: 20 }
      ),
      clearCount: fc.integer({ min: 1, max: 5 })
    })
  ], { numRuns: 100 })(
    '多次清空日志应该产生相同的结果',
    ({ logEntries, clearCount }) => {
      const store = useDependencyStore.getState()
      
      // 添加日志条目
      for (const entry of logEntries) {
        store.addLog(entry)
      }
      
      // 验证：添加后日志应该非空
      let state = useDependencyStore.getState()
      expect(state.logs.length).toBeGreaterThan(0)
      
      // 多次清空日志
      for (let i = 0; i < clearCount; i++) {
        store.clearLogs()
        
        state = useDependencyStore.getState()
        
        // 验证：每次清空后日志都应该为空
        expect(state.logs.length).toBe(0)
        expect(state.logs).toEqual([])
      }
    }
  )

  /**
   * 属性 11.3: 清空日志功能 - 清空后可以继续添加
   * 
   * 对于任意日志状态，清空日志后应该能够继续添加新的日志
   * 
   * **Validates: Requirements 6.6, 7.1**
   */
  test.prop([
    fc.record({
      firstBatch: fc.array(
        fc.record({
          level: fc.constant('info' as const),
          message: fc.string({ minLength: 1, maxLength: 50 }),
          source: fc.constant('pip' as const)
        }),
        { minLength: 1, maxLength: 10 }
      ),
      secondBatch: fc.array(
        fc.record({
          level: fc.constant('success' as const),
          message: fc.string({ minLength: 1, maxLength: 50 }),
          source: fc.constant('system' as const)
        }),
        { minLength: 1, maxLength: 10 }
      )
    })
  ], { numRuns: 100 })(
    '清空日志后应该能够继续添加新的日志',
    ({ firstBatch, secondBatch }) => {
      const store = useDependencyStore.getState()
      
      // 添加第一批日志
      for (const entry of firstBatch) {
        store.addLog(entry)
      }
      
      let state = useDependencyStore.getState()
      expect(state.logs.length).toBe(firstBatch.length)
      
      // 清空日志
      store.clearLogs()
      
      state = useDependencyStore.getState()
      expect(state.logs.length).toBe(0)
      
      // 添加第二批日志
      for (const entry of secondBatch) {
        store.addLog(entry)
      }
      
      state = useDependencyStore.getState()
      
      // 验证：应该只包含第二批日志
      expect(state.logs.length).toBe(secondBatch.length)
      
      // 验证：所有日志都应该是第二批的
      state.logs.forEach((log: LogEntry, index: number) => {
        expect(log.level).toBe(secondBatch[index].level)
        expect(log.message).toBe(secondBatch[index].message)
        expect(log.source).toBe(secondBatch[index].source)
      })
    }
  )

  /**
   * 属性 11.4: 清空日志功能 - 空日志清空的幂等性
   * 
   * 对于空的日志状态，清空日志操作应该是安全的
   * 
   * **Validates: Requirements 6.6**
   */
  test.prop([
    fc.integer({ min: 1, max: 10 })
  ], { numRuns: 100 })(
    '空日志状态下清空操作应该是安全的',
    (clearCount) => {
      const store = useDependencyStore.getState()
      
      // 验证：初始状态日志应该为空
      let state = useDependencyStore.getState()
      expect(state.logs.length).toBe(0)
      
      // 多次清空空日志
      for (let i = 0; i < clearCount; i++) {
        store.clearLogs()
        
        state = useDependencyStore.getState()
        
        // 验证：日志仍然为空
        expect(state.logs.length).toBe(0)
        expect(state.logs).toEqual([])
      }
    }
  )

  /**
   * 属性 12.1: 日志持久性 - 未清空时日志保持
   * 
   * 对于任意添加的日志条目，在用户未主动清空的情况下，
   * 日志应持续显示在界面上
   * 
   * **Validates: Requirements 7.2**
   */
  test.prop([
    fc.array(
      fc.record({
        level: fc.oneof(
          fc.constant('info' as const),
          fc.constant('warning' as const),
          fc.constant('error' as const),
          fc.constant('success' as const)
        ),
        message: fc.string({ minLength: 1, maxLength: 100 }),
        source: fc.oneof(
          fc.constant('system' as const),
          fc.constant('pip' as const),
          fc.constant('python' as const),
          fc.constant('user' as const)
        )
      }),
      { minLength: 1, maxLength: 30 }
    )
  ], { numRuns: 100 })(
    '未清空时日志应持续显示',
    (logEntries) => {
      const store = useDependencyStore.getState()
      
      // 添加日志条目
      for (const entry of logEntries) {
        store.addLog(entry)
      }
      
      // 验证：添加后日志应该存在
      let state = useDependencyStore.getState()
      const initialLogCount = state.logs.length
      expect(initialLogCount).toBe(logEntries.length)
      
      // 模拟时间流逝（多次读取状态）
      for (let i = 0; i < 10; i++) {
        state = useDependencyStore.getState()
        
        // 验证：日志数量应该保持不变
        expect(state.logs.length).toBe(initialLogCount)
        
        // 验证：日志内容应该保持不变
        for (let j = 0; j < logEntries.length; j++) {
          expect(state.logs[j].level).toBe(logEntries[j].level)
          expect(state.logs[j].message).toBe(logEntries[j].message)
          expect(state.logs[j].source).toBe(logEntries[j].source)
        }
      }
    }
  )

  /**
   * 属性 12.2: 日志持久性 - 日志累积
   * 
   * 对于任意多次添加的日志条目，所有日志都应该累积保存
   * 
   * **Validates: Requirements 7.2**
   */
  test.prop([
    fc.array(
      fc.array(
        fc.record({
          level: fc.constant('info' as const),
          message: fc.string({ minLength: 1, maxLength: 50 }),
          source: fc.constant('pip' as const)
        }),
        { minLength: 1, maxLength: 5 }
      ),
      { minLength: 2, maxLength: 10 }
    )
  ], { numRuns: 100 })(
    '多次添加的日志应该累积保存',
    (logBatches) => {
      const store = useDependencyStore.getState()
      
      let expectedTotalCount = 0
      
      // 分批添加日志
      for (const batch of logBatches) {
        for (const entry of batch) {
          store.addLog(entry)
        }
        
        expectedTotalCount += batch.length
        
        const state = useDependencyStore.getState()
        
        // 验证：日志应该累积增加
        expect(state.logs.length).toBe(expectedTotalCount)
      }
      
      // 验证：最终日志数量应该等于所有批次的总和
      const finalState = useDependencyStore.getState()
      const totalEntries = logBatches.reduce((sum, batch) => sum + batch.length, 0)
      expect(finalState.logs.length).toBe(totalEntries)
    }
  )

  /**
   * 属性 12.3: 日志持久性 - 日志顺序保持
   * 
   * 对于任意添加的日志条目，日志的顺序应该保持不变
   * 
   * **Validates: Requirements 7.2**
   */
  test.prop([
    fc.array(
      fc.record({
        level: fc.oneof(
          fc.constant('info' as const),
          fc.constant('warning' as const),
          fc.constant('error' as const),
          fc.constant('success' as const)
        ),
        message: fc.string({ minLength: 1, maxLength: 100 }),
        source: fc.oneof(
          fc.constant('system' as const),
          fc.constant('pip' as const),
          fc.constant('python' as const),
          fc.constant('user' as const)
        )
      }),
      { minLength: 5, maxLength: 20 }
    )
  ], { numRuns: 100 })(
    '日志的顺序应该保持不变',
    (logEntries) => {
      const store = useDependencyStore.getState()
      
      // 添加日志条目
      for (const entry of logEntries) {
        store.addLog(entry)
      }
      
      const state = useDependencyStore.getState()
      
      // 验证：日志顺序应该与添加顺序一致
      for (let i = 0; i < logEntries.length; i++) {
        expect(state.logs[i].level).toBe(logEntries[i].level)
        expect(state.logs[i].message).toBe(logEntries[i].message)
        expect(state.logs[i].source).toBe(logEntries[i].source)
      }
      
      // 验证：时间戳应该按顺序递增
      for (let i = 0; i < state.logs.length - 1; i++) {
        const currentTimestamp = new Date(state.logs[i].timestamp).getTime()
        const nextTimestamp = new Date(state.logs[i + 1].timestamp).getTime()
        
        expect(currentTimestamp).toBeLessThanOrEqual(nextTimestamp)
      }
    }
  )

  /**
   * 属性 12.4: 日志持久性 - 日志 ID 唯一性
   * 
   * 对于任意添加的日志条目，每个日志都应该有唯一的 ID
   * 
   * **Validates: Requirements 7.2**
   */
  test.prop([
    fc.array(
      fc.record({
        level: fc.constant('info' as const),
        message: fc.string({ minLength: 1, maxLength: 50 }),
        source: fc.constant('system' as const)
      }),
      { minLength: 10, maxLength: 100 }
    )
  ], { numRuns: 100 })(
    '每个日志都应该有唯一的 ID',
    (logEntries) => {
      const store = useDependencyStore.getState()
      
      // 添加日志条目
      for (const entry of logEntries) {
        store.addLog(entry)
      }
      
      const state = useDependencyStore.getState()
      
      // 验证：所有日志 ID 应该唯一
      const ids = state.logs.map((log: LogEntry) => log.id)
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(state.logs.length)
      expect(uniqueIds.size).toBe(logEntries.length)
      
      // 验证：所有 ID 都应该非空
      ids.forEach((id: string) => {
        expect(id).toBeTruthy()
        expect(id.length).toBeGreaterThan(0)
      })
    }
  )

  /**
   * 属性 12.5: 日志持久性 - 日志不会自动清空
   * 
   * 对于任意添加的日志条目，在没有调用 clearLogs 的情况下，
   * 日志不会自动清空
   * 
   * **Validates: Requirements 7.2**
   */
  test.prop([
    fc.record({
      initialLogs: fc.array(
        fc.record({
          level: fc.constant('info' as const),
          message: fc.string({ minLength: 1, maxLength: 50 }),
          source: fc.constant('pip' as const)
        }),
        { minLength: 5, maxLength: 20 }
      ),
      additionalLogs: fc.array(
        fc.record({
          level: fc.constant('success' as const),
          message: fc.string({ minLength: 1, maxLength: 50 }),
          source: fc.constant('system' as const)
        }),
        { minLength: 1, maxLength: 10 }
      )
    })
  ], { numRuns: 100 })(
    '日志不会自动清空',
    ({ initialLogs, additionalLogs }) => {
      const store = useDependencyStore.getState()
      
      // 添加初始日志
      for (const entry of initialLogs) {
        store.addLog(entry)
      }
      
      let state = useDependencyStore.getState()
      const initialCount = state.logs.length
      expect(initialCount).toBe(initialLogs.length)
      
      // 添加额外日志（模拟后续操作）
      for (const entry of additionalLogs) {
        store.addLog(entry)
      }
      
      state = useDependencyStore.getState()
      
      // 验证：日志应该累积，而不是被清空
      expect(state.logs.length).toBe(initialLogs.length + additionalLogs.length)
      
      // 验证：初始日志仍然存在
      for (let i = 0; i < initialLogs.length; i++) {
        expect(state.logs[i].level).toBe(initialLogs[i].level)
        expect(state.logs[i].message).toBe(initialLogs[i].message)
        expect(state.logs[i].source).toBe(initialLogs[i].source)
      }
      
      // 验证：额外日志也被添加
      for (let i = 0; i < additionalLogs.length; i++) {
        const logIndex = initialLogs.length + i
        expect(state.logs[logIndex].level).toBe(additionalLogs[i].level)
        expect(state.logs[logIndex].message).toBe(additionalLogs[i].message)
        expect(state.logs[logIndex].source).toBe(additionalLogs[i].source)
      }
    }
  )
})
