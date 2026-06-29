/**
 * 错误处理属性测试
 * 
 * 使用 fast-check 进行属性测试，验证命令执行和网络请求的错误处理
 * 
 * 属性 25: 错误信息显示
 * 验证需求: 14.1, 14.2, 14.3
 */

import { describe, beforeEach, expect, vi } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { useDependencyStore } from '@/stores/useDependencyStore'
import type { LogEntry } from '@/types/dependency'

describe('错误处理 - 属性测试', () => {
  beforeEach(() => {
    // 重置 store 状态
    useDependencyStore.setState({
      currentEnvId: 'test-env',
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
    
    // 清除所有 mock
    vi.clearAllMocks()
  })

  /**
   * 属性 25.1: 命令执行错误信息显示
   * 
   * 对于任意失败的 pip 命令，系统应该在日志区域显示错误信息
   * 
   * **Validates: Requirements 14.1**
   */
  test.prop([
    fc.record({
      packageName: fc.string({ minLength: 2, maxLength: 30 }),
      version: fc.tuple(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 100 })
      ).map(([major, minor, patch]) => `${major}.${minor}.${patch}`),
      errorMessage: fc.oneof(
        fc.constant('ERROR: Could not find a version that satisfies the requirement'),
        fc.constant('ERROR: No matching distribution found'),
        fc.constant('ERROR: Connection timeout'),
        fc.constant('ERROR: Network unreachable'),
        fc.constant('ERROR: Permission denied'),
        fc.string({ minLength: 10, maxLength: 100 })
      )
    })
  ], { numRuns: 100 })(
    '命令执行失败时应该在日志中显示错误信息',
    async ({ packageName, version, errorMessage }) => {
      const store = useDependencyStore.getState()
      
      // Mock window.pywebview.api
      const mockApi = {
        dependency_install_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: errorMessage
        })
      }
      
      // @ts-expect-error - 测试环境需要模拟全局对象
      window.pywebview = { api: mockApi }
      
      // 执行安装操作
      await store.installPackage(packageName, version, 'install')
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有错误日志
      const errorLogs = state.logs.filter((log: LogEntry) => log.level === 'error')
      expect(errorLogs.length).toBeGreaterThan(0)
      
      // 验证：错误日志应该包含错误信息
      const hasErrorMessage = errorLogs.some((log: LogEntry) => 
        log.message.includes('失败') || log.message.toLowerCase().includes('error')
      )
      expect(hasErrorMessage).toBe(true)
      
      // 验证：日志来源应该是 pip 或 system
      errorLogs.forEach((log: LogEntry) => {
        expect(['pip', 'system']).toContain(log.source)
      })
    }
  )

  /**
   * 属性 25.2: 网络错误信息显示
   * 
   * 对于任意网络请求失败，系统应该在日志中显示友好的错误提示
   * 
   * **Validates: Requirements 14.2**
   */
  test.prop([
    fc.record({
      packageName: fc.string({ minLength: 2, maxLength: 30 }),
      errorType: fc.oneof(
        fc.constant('timeout'),
        fc.constant('connection'),
        fc.constant('network')
      ),
      mirrorSource: fc.oneof(
        fc.constant('official' as const),
        fc.constant('tuna' as const),
        fc.constant('aliyun' as const),
        fc.constant('tencent' as const)
      )
    })
  ], { numRuns: 100 })(
    '网络错误时应该显示友好的错误提示',
    async ({ packageName, errorType, mirrorSource }) => {
      const store = useDependencyStore.getState()
      
      // 根据错误类型生成错误消息
      let errorMessage = ''
      if (errorType === 'timeout') {
        errorMessage = '网络连接超时，请检查网络设置或尝试切换镜像源'
      } else if (errorType === 'connection') {
        errorMessage = '网络连接失败，请检查网络设置或尝试切换镜像源'
      } else {
        errorMessage = '网络错误，请检查网络设置'
      }
      
      // Mock window.pywebview.api
      const mockApi = {
        dependency_search_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: errorMessage
        })
      }
      
      // @ts-expect-error - 测试环境需要模拟全局对象
      window.pywebview = { api: mockApi }
      
      // 设置镜像源
      store.setMirrorSource(mirrorSource)
      
      // 执行搜索操作
      await store.searchPackage(packageName)
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有错误日志
      const errorLogs = state.logs.filter((log: LogEntry) => log.level === 'error')
      expect(errorLogs.length).toBeGreaterThan(0)
      
      // 验证：错误日志应该包含网络相关的关键词
      const hasNetworkKeyword = errorLogs.some((log: LogEntry) => {
        const msg = log.message.toLowerCase()
        return msg.includes('网络') || msg.includes('连接') || msg.includes('超时') ||
               msg.includes('network') || msg.includes('connection') || msg.includes('timeout')
      })
      expect(hasNetworkKeyword).toBe(true)
      
      // 验证：错误日志应该包含解决方案提示
      const hasSolutionHint = errorLogs.some((log: LogEntry) => {
        const msg = log.message
        return msg.includes('检查') || msg.includes('设置') || msg.includes('镜像源') || msg.includes('切换')
      })
      expect(hasSolutionHint).toBe(true)
    }
  )

  /**
   * 属性 25.3: 环境配置错误信息显示
   * 
   * 对于任意环境配置错误，系统应该在日志中显示具体的配置错误信息
   * 
   * **Validates: Requirements 14.3**
   */
  test.prop([
    fc.record({
      packageName: fc.string({ minLength: 2, maxLength: 30 }),
      version: fc.string({ minLength: 3, maxLength: 10 }),
      configError: fc.oneof(
        fc.constant('no_env'),
        fc.constant('no_python_path'),
        fc.constant('invalid_env')
      )
    })
  ], { numRuns: 100 })(
    '环境配置错误时应该显示具体的错误信息',
    async ({ packageName, version, configError }) => {
      const store = useDependencyStore.getState()
      
      // 根据配置错误类型设置环境
      if (configError === 'no_env') {
        // 未选中环境
        useDependencyStore.setState({ currentEnvId: null })
      }
      
      // Mock window.pywebview.api
      let errorMessage = ''
      if (configError === 'no_env') {
        errorMessage = '未选择环境'
      } else if (configError === 'no_python_path') {
        errorMessage = 'Python 路径未配置'
      } else {
        errorMessage = '环境配置无效'
      }
      
      const mockApi = {
        dependency_install_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: errorMessage
        })
      }
      
      // @ts-expect-error - 测试环境需要模拟全局对象
      window.pywebview = { api: mockApi }
      
      // 执行安装操作
      await store.installPackage(packageName, version, 'install')
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有错误日志
      const errorLogs = state.logs.filter((log: LogEntry) => log.level === 'error')
      expect(errorLogs.length).toBeGreaterThan(0)
      
      // 验证：错误日志应该包含配置相关的关键词
      const hasConfigKeyword = errorLogs.some((log: LogEntry) => {
        const msg = log.message
        return msg.includes('环境') || msg.includes('配置') || msg.includes('路径') ||
               msg.includes('Python') || msg.includes('选择')
      })
      expect(hasConfigKeyword).toBe(true)
    }
  )

  /**
   * 属性 25.4: 错误日志级别正确性
   * 
   * 对于任意错误，日志级别应该是 'error'
   * 
   * **Validates: Requirements 14.1, 14.2, 14.3**
   */
  test.prop([
    fc.record({
      operation: fc.oneof(
        fc.constant('install'),
        fc.constant('search'),
        fc.constant('uninstall')
      ),
      errorMessage: fc.string({ minLength: 5, maxLength: 100 })
    })
  ], { numRuns: 100 })(
    '错误日志的级别应该是 error',
    async ({ operation, errorMessage }) => {
      const store = useDependencyStore.getState()
      
      // Mock window.pywebview.api
      const mockApi = {
        dependency_install_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: errorMessage
        }),
        dependency_search_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: errorMessage
        }),
        dependency_uninstall_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: errorMessage
        })
      }
      
      // @ts-expect-error - 测试环境需要模拟全局对象
      window.pywebview = { api: mockApi }
      
      // 根据操作类型执行不同的操作
      if (operation === 'install') {
        await store.installPackage('test-package', '1.0.0', 'install')
      } else if (operation === 'search') {
        await store.searchPackage('test-package')
      } else {
        await store.uninstallPackage('test-package')
      }
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有错误日志
      const errorLogs = state.logs.filter((log: LogEntry) => log.level === 'error')
      expect(errorLogs.length).toBeGreaterThan(0)
      
      // 验证：所有错误日志的级别都应该是 'error'
      errorLogs.forEach((log: LogEntry) => {
        expect(log.level).toBe('error')
      })
    }
  )

  /**
   * 属性 25.5: 错误日志时间戳有效性
   * 
   * 对于任意错误日志，时间戳应该是有效的
   * 
   * **Validates: Requirements 14.1**
   */
  test.prop([
    fc.record({
      packageName: fc.string({ minLength: 2, maxLength: 30 }),
      errorMessage: fc.string({ minLength: 5, maxLength: 100 })
    })
  ], { numRuns: 100 })(
    '错误日志应该有有效的时间戳',
    async ({ packageName, errorMessage }) => {
      const store = useDependencyStore.getState()
      
      // Mock window.pywebview.api
      const mockApi = {
        dependency_search_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: errorMessage
        })
      }
      
      // @ts-expect-error - 测试环境需要模拟全局对象
      window.pywebview = { api: mockApi }
      
      // 记录开始时间
      const startTime = Date.now()
      
      // 执行操作
      await store.searchPackage(packageName)
      
      // 记录结束时间
      const endTime = Date.now()
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有错误日志
      const errorLogs = state.logs.filter((log: LogEntry) => log.level === 'error')
      expect(errorLogs.length).toBeGreaterThan(0)
      
      // 验证：所有错误日志的时间戳都应该在操作时间范围内
      errorLogs.forEach((log: LogEntry) => {
        const logTime = new Date(log.timestamp).getTime()
        
        // 时间戳应该是有效的数字
        expect(isNaN(logTime)).toBe(false)
        expect(logTime).toBeGreaterThan(0)
        
        // 时间戳应该在操作时间范围内（允许一些误差）
        expect(logTime).toBeGreaterThanOrEqual(startTime - 1000)
        expect(logTime).toBeLessThanOrEqual(endTime + 1000)
      })
    }
  )

  /**
   * 属性 25.6: 错误日志唯一 ID
   * 
   * 对于任意错误日志，每个日志都应该有唯一的 ID
   * 
   * **Validates: Requirements 14.1**
   */
  test.prop([
    fc.array(
      fc.record({
        packageName: fc.string({ minLength: 2, maxLength: 20 }),
        errorMessage: fc.string({ minLength: 5, maxLength: 50 })
      }),
      { minLength: 2, maxLength: 10 }
    )
  ], { numRuns: 100 })(
    '每个错误日志都应该有唯一的 ID',
    async (operations) => {
      const store = useDependencyStore.getState()
      
      // Mock window.pywebview.api
      const mockApi = {
        dependency_search_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: 'Error'
        })
      }
      
      // @ts-expect-error - 测试环境需要模拟全局对象
      window.pywebview = { api: mockApi }
      
      // 执行多次操作
      for (const op of operations) {
        await store.searchPackage(op.packageName)
      }
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有错误日志
      const errorLogs = state.logs.filter((log: LogEntry) => log.level === 'error')
      expect(errorLogs.length).toBeGreaterThan(0)
      
      // 验证：所有日志 ID 都应该唯一
      const ids = errorLogs.map((log: LogEntry) => log.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(errorLogs.length)
      
      // 验证：所有 ID 都应该非空
      ids.forEach((id: string) => {
        expect(id).toBeTruthy()
        expect(id.length).toBeGreaterThan(0)
      })
    }
  )

  /**
   * 属性 25.7: 错误信息非空
   * 
   * 对于任意错误，错误日志的消息应该非空
   * 
   * **Validates: Requirements 14.1, 14.2, 14.3**
   */
  test.prop([
    fc.record({
      packageName: fc.string({ minLength: 2, maxLength: 30 }),
      errorMessage: fc.string({ minLength: 1, maxLength: 100 })
    })
  ], { numRuns: 100 })(
    '错误日志的消息应该非空',
    async ({ packageName, errorMessage }) => {
      const store = useDependencyStore.getState()
      
      // Mock window.pywebview.api
      const mockApi = {
        dependency_search_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: errorMessage
        })
      }
      
      // @ts-expect-error - 测试环境需要模拟全局对象
      window.pywebview = { api: mockApi }
      
      // 执行操作
      await store.searchPackage(packageName)
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有错误日志
      const errorLogs = state.logs.filter((log: LogEntry) => log.level === 'error')
      expect(errorLogs.length).toBeGreaterThan(0)
      
      // 验证：所有错误日志的消息都应该非空
      errorLogs.forEach((log: LogEntry) => {
        expect(log.message).toBeTruthy()
        expect(log.message.length).toBeGreaterThan(0)
        expect(log.message.trim().length).toBeGreaterThan(0)
      })
    }
  )

  /**
   * 属性 25.8: 连续错误处理
   * 
   * 对于任意连续的错误操作，每个错误都应该被正确记录
   * 
   * **Validates: Requirements 14.1, 14.2, 14.3**
   */
  test.prop([
    fc.array(
      fc.record({
        packageName: fc.string({ minLength: 2, maxLength: 20 }),
        errorMessage: fc.string({ minLength: 5, maxLength: 50 })
      }),
      { minLength: 2, maxLength: 10 }
    )
  ], { numRuns: 100 })(
    '连续的错误操作都应该被正确记录',
    async (operations) => {
      const store = useDependencyStore.getState()
      
      // Mock window.pywebview.api
      const mockApi = {
        dependency_search_package: vi.fn().mockImplementation((packageName: string) => {
          const op = operations.find(o => o.packageName === packageName)
          return Promise.resolve({
            success: false,
            error_message: op?.errorMessage || 'Error'
          })
        })
      }
      
      // @ts-expect-error - 测试环境需要模拟全局对象
      window.pywebview = { api: mockApi }
      
      // 执行多次操作
      for (const op of operations) {
        await store.searchPackage(op.packageName)
      }
      
      const state = useDependencyStore.getState()
      
      // 验证：错误日志数量应该至少等于操作数量
      const errorLogs = state.logs.filter((log: LogEntry) => log.level === 'error')
      expect(errorLogs.length).toBeGreaterThanOrEqual(operations.length)
      
      // 验证：所有错误日志都应该有效
      errorLogs.forEach((log: LogEntry) => {
        expect(log.id).toBeTruthy()
        expect(log.timestamp).toBeTruthy()
        expect(log.message).toBeTruthy()
        expect(log.level).toBe('error')
        expect(['pip', 'system', 'python', 'user']).toContain(log.source)
      })
    }
  )

  /**
   * 属性 25.9: 错误后状态恢复
   * 
   * 对于任意错误操作，执行状态应该被正确恢复（isExecuting 应该为 false）
   * 
   * **Validates: Requirements 14.1**
   */
  test.prop([
    fc.record({
      packageName: fc.string({ minLength: 2, maxLength: 30 }),
      version: fc.string({ minLength: 3, maxLength: 10 }),
      errorMessage: fc.string({ minLength: 5, maxLength: 100 })
    })
  ], { numRuns: 100 })(
    '错误后执行状态应该被正确恢复',
    async ({ packageName, version, errorMessage }) => {
      const store = useDependencyStore.getState()
      
      // Mock window.pywebview.api
      const mockApi = {
        dependency_install_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: errorMessage
        })
      }
      
      // @ts-expect-error - 测试环境需要模拟全局对象
      window.pywebview = { api: mockApi }
      
      // 验证：初始状态应该不在执行中
      let state = useDependencyStore.getState()
      expect(state.isExecuting).toBe(false)
      
      // 执行操作
      await store.installPackage(packageName, version, 'install')
      
      // 验证：操作完成后应该不在执行中
      state = useDependencyStore.getState()
      expect(state.isExecuting).toBe(false)
    }
  )

  /**
   * 属性 25.10: 错误信息包含操作上下文
   * 
   * 对于任意错误，错误日志应该包含足够的上下文信息（如包名、操作类型等）
   * 
   * **Validates: Requirements 14.1, 14.2, 14.3**
   */
  test.prop([
    fc.record({
      packageName: fc.string({ minLength: 2, maxLength: 30 }),
      version: fc.string({ minLength: 3, maxLength: 10 }),
      operation: fc.oneof(
        fc.constant('install'),
        fc.constant('uninstall')
      )
    })
  ], { numRuns: 100 })(
    '错误信息应该包含操作上下文',
    async ({ packageName, version, operation }) => {
      const store = useDependencyStore.getState()
      
      // Mock window.pywebview.api
      const mockApi = {
        dependency_install_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: `Failed to ${operation} ${packageName}`
        }),
        dependency_uninstall_package: vi.fn().mockResolvedValue({
          success: false,
          error_message: `Failed to ${operation} ${packageName}`
        })
      }
      
      // @ts-expect-error - 测试环境需要模拟全局对象
      window.pywebview = { api: mockApi }
      
      // 执行操作
      if (operation === 'install') {
        await store.installPackage(packageName, version, 'install')
      } else {
        await store.uninstallPackage(packageName)
      }
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有错误日志
      const errorLogs = state.logs.filter((log: LogEntry) => log.level === 'error')
      expect(errorLogs.length).toBeGreaterThan(0)
      
      // 验证：错误日志应该包含操作相关的关键词
      const hasOperationContext = errorLogs.some((log: LogEntry) => {
        const msg = log.message.toLowerCase()
        return msg.includes('安装') || msg.includes('卸载') || 
               msg.includes('install') || msg.includes('uninstall') ||
               msg.includes('失败') || msg.includes('failed')
      })
      expect(hasOperationContext).toBe(true)
    }
  )
})
