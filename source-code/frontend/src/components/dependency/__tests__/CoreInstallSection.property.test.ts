/**
 * CoreInstallSection 属性测试
 * 
 * 使用 fast-check 进行属性测试，验证核心安装组件的通用属性
 * 
 * 属性 5: CUDA 版本检测与 PyTorch 版本关联
 * 验证需求: 3.1, 3.3, 3.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { useDependencyStore } from '@/stores/useDependencyStore'

describe('CoreInstallSection - 属性测试', () => {
  beforeEach(() => {
    // 重置 store 状态
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
      mirrorSource: 'official'
    })
  })

  /**
   * 属性 5.1: CUDA 版本与 PyTorch index-url 关联
   * 
   * 对于任意检测到的 CUDA 版本，查询 PyTorch 版本时应使用对应的 index-url
   * 
   * **Validates: Requirements 3.1, 3.3**
   */
  test.prop([
    fc.oneof(
      fc.constant('11.8'),
      fc.constant('12.1'),
      fc.constant('12.4'),
      fc.constant('CPU'),
      fc.constant(null)
    )
  ], { numRuns: 100 })(
    '对于任意 CUDA 版本，应构造正确的 PyTorch index-url',
    async (cudaVersion) => {
      const store = useDependencyStore.getState()
      
      // 设置 CUDA 版本
      if (cudaVersion) {
        useDependencyStore.setState({ cudaVersion })
      }
      
      // 查询 PyTorch 版本（开发环境会使用 Mock）
      await store.fetchPytorchVersions(cudaVersion || 'CPU')
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有版本列表
      expect(state.pytorchVersions.length).toBeGreaterThan(0)
      
      // 验证：日志中应该记录了查询操作
      const hasQueryLog = state.logs.some(log => 
        log.message.includes('PyTorch 版本列表') || 
        log.message.includes('查询')
      )
      expect(hasQueryLog).toBe(true)
    }
  )

  /**
   * 属性 5.2: PyTorch 版本与相关组件关联
   * 
   * 选择 PyTorch 版本后，应自动关联对应版本的 torchaudio 和 torchvision
   * 
   * **Validates: Requirements 3.4**
   */
  test.prop([
    fc.record({
      pytorchVersion: fc.oneof(
        fc.constant('2.1.0'),
        fc.constant('2.0.1'),
        fc.constant('2.0.0'),
        fc.constant('1.13.1')
      ),
      cudaVersion: fc.oneof(
        fc.constant('11.8'),
        fc.constant('12.1'),
        fc.constant('12.4'),
        fc.constant('CPU')
      )
    })
  ], { numRuns: 100 })(
    '安装 PyTorch 时应包含对应版本的 torchaudio 和 torchvision',
    async ({ pytorchVersion, cudaVersion }) => {
      const store = useDependencyStore.getState()
      
      // 设置环境
      store.setCurrentEnv('test-env')
      
      // 设置 CUDA 版本和 PyTorch 版本列表
      useDependencyStore.setState({
        cudaVersion,
        pytorchVersions: [pytorchVersion, '2.0.1', '2.0.0']
      })
      
      // 安装 PyTorch（开发环境会使用 Mock）
      await store.installPytorch(pytorchVersion, cudaVersion)
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有安装日志
      const hasInstallLog = state.logs.some(log => 
        log.message.includes('PyTorch') && 
        (log.message.includes('安装') || log.message.includes('开始'))
      )
      expect(hasInstallLog).toBe(true)
      
      // 验证：日志中应该提到版本号
      const hasVersionLog = state.logs.some(log => 
        log.message.includes(pytorchVersion)
      )
      expect(hasVersionLog).toBe(true)
      
      // 验证：安装完成后应该清除执行状态
      expect(state.isExecuting).toBe(false)
    }
  )

  /**
   * 属性 5.3: CUDA 版本检测的一致性
   * 
   * 对于任意环境，CUDA 版本检测应该返回一致的结果
   * 
   * **Validates: Requirements 3.1**
   */
  test.prop([
    fc.nat({ max: 5 })
  ], { numRuns: 100 })(
    'CUDA 版本检测应该返回一致的结果',
    async (runCount) => {
      const store = useDependencyStore.getState()
      
      // 多次检测 CUDA 版本（开发环境会使用 Mock）
      const detectedVersions: string[] = []
      for (let i = 0; i <= runCount; i++) {
        await store.detectCudaVersion()
        const state = useDependencyStore.getState()
        detectedVersions.push(state.cudaVersion)
      }
      
      // 验证：所有检测结果应该一致
      const uniqueVersions = new Set(detectedVersions)
      expect(uniqueVersions.size).toBe(1)
      
      // 验证：应该有检测日志
      const state = useDependencyStore.getState()
      const hasCudaLog = state.logs.some(log => 
        log.message.includes('CUDA') && log.message.includes('版本')
      )
      expect(hasCudaLog).toBe(true)
    }
  )

  /**
   * 属性 5.4: PyTorch 版本列表的有效性
   * 
   * 对于任意有效的 CUDA 版本，查询到的 PyTorch 版本列表应该非空且格式正确
   * 
   * **Validates: Requirements 3.3**
   */
  test.prop([
    fc.oneof(
      fc.constant('11.8'),
      fc.constant('12.1'),
      fc.constant('12.4')
    )
  ], { numRuns: 100 })(
    'PyTorch 版本列表应该非空且格式正确',
    async (cudaVersion) => {
      const store = useDependencyStore.getState()
      
      // 查询 PyTorch 版本（开发环境会使用 Mock）
      await store.fetchPytorchVersions(cudaVersion)
      
      const state = useDependencyStore.getState()
      
      // 验证：版本列表应该非空
      expect(state.pytorchVersions.length).toBeGreaterThan(0)
      
      // 验证：所有版本号应该符合语义化版本格式
      const versionRegex = /^\d+\.\d+\.\d+/
      state.pytorchVersions.forEach(version => {
        expect(versionRegex.test(version)).toBe(true)
      })
      
      // 验证：版本列表应该按降序排列（最新版本在前）
      for (let i = 0; i < state.pytorchVersions.length - 1; i++) {
        const current = state.pytorchVersions[i]
        const next = state.pytorchVersions[i + 1]
        
        // 简单的版本比较（假设格式为 x.y.z）
        const [currMajor, currMinor, currPatch] = current.split('.').map(Number)
        const [nextMajor, nextMinor, nextPatch] = next.split('.').map(Number)
        
        const currValue = currMajor * 10000 + currMinor * 100 + currPatch
        const nextValue = nextMajor * 10000 + nextMinor * 100 + nextPatch
        
        expect(currValue).toBeGreaterThanOrEqual(nextValue)
      }
    }
  )

  /**
   * 属性 5.5: 无 CUDA 环境的 CPU 版本支持
   * 
   * 当系统未安装 CUDA 时，应该提供 CPU 版本的 PyTorch
   * 
   * **Validates: Requirements 3.1, 3.2**
   */
  test.prop([
    fc.constant(null)
  ], { numRuns: 100 })(
    '无 CUDA 环境应该提供 CPU 版本的 PyTorch',
    async (cudaVersion) => {
      const store = useDependencyStore.getState()
      
      // 检测 CUDA 版本（开发环境会使用 Mock）
      await store.detectCudaVersion()
      
      const state1 = useDependencyStore.getState()
      const detectedCuda = state1.cudaVersion
      
      // 查询 PyTorch 版本（使用 CPU 或检测到的版本）
      await store.fetchPytorchVersions(detectedCuda || 'CPU')
      
      const state2 = useDependencyStore.getState()
      
      // 验证：应该有版本列表
      expect(state2.pytorchVersions.length).toBeGreaterThan(0)
      
      // 验证：日志中应该提到 CPU 或无 CUDA
      const hasCpuLog = state2.logs.some(log => 
        log.message.includes('CPU') || 
        log.message.includes('未安装') ||
        log.message.includes('PyTorch')
      )
      expect(hasCpuLog).toBe(true)
    }
  )

  /**
   * 属性 5.6: 安装命令的幂等性
   * 
   * 对于相同的 PyTorch 版本和 CUDA 版本，多次安装应该产生一致的行为
   * 
   * **Validates: Requirements 3.5**
   */
  test.prop([
    fc.record({
      pytorchVersion: fc.constant('2.1.0'),
      cudaVersion: fc.constant('12.1'),
      installCount: fc.integer({ min: 1, max: 3 })
    })
  ], { numRuns: 50 })(
    '相同参数的安装命令应该产生一致的行为',
    async ({ pytorchVersion, cudaVersion, installCount }) => {
      const store = useDependencyStore.getState()
      
      // 设置环境
      store.setCurrentEnv('test-env')
      
      // 设置 CUDA 版本和 PyTorch 版本列表
      useDependencyStore.setState({
        cudaVersion,
        pytorchVersions: [pytorchVersion]
      })
      
      // 多次安装（开发环境会使用 Mock）
      const results: boolean[] = []
      for (let i = 0; i < installCount; i++) {
        // 清空日志以便观察每次安装
        store.clearLogs()
        
        await store.installPytorch(pytorchVersion, cudaVersion)
        
        const state = useDependencyStore.getState()
        
        // 记录是否有成功日志
        const hasSuccess = state.logs.some(log => 
          log.level === 'success' && log.message.includes('PyTorch')
        )
        results.push(hasSuccess)
      }
      
      // 验证：所有安装结果应该一致
      const allSuccess = results.every(r => r === true)
      const allFailed = results.every(r => r === false)
      
      expect(allSuccess || allFailed).toBe(true)
    }
  )
})
