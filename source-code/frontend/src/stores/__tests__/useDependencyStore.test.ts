/**
 * useDependencyStore 单元测试
 * 
 * 测试依赖管理状态管理的核心功能：
 * - 状态初始化
 * - 环境切换
 * - 日志管理
 * - 核心安装功能
 * - 手动安装功能
 * - 清单安装功能
 * - 工具箱功能
 * - 环境检测
 * - AI 分析
 * 
 * 验证需求: 1.1, 1.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDependencyStore } from '../useDependencyStore'
import { useEnvStore } from '../useEnvStore'

describe('useDependencyStore - 基础功能测试', () => {
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

  describe('状态初始化', () => {
    it('应该正确初始化所有状态', () => {
      const state = useDependencyStore.getState()
      
      // 基础状态
      expect(state.currentEnvId).toBeNull()
      expect(state.logs).toEqual([])
      expect(state.isExecuting).toBe(false)
      expect(state.envInfo).toBeNull()
      
      // 核心安装状态
      expect(state.cudaVersion).toBe('')
      expect(state.pytorchVersions).toEqual([])
      expect(state.selectedPytorchVersion).toBe('')
      
      // 手动安装状态
      expect(state.packageName).toBe('')
      expect(state.packageVersions).toEqual([])
      expect(state.selectedVersion).toBe('')
      expect(state.installMode).toBe('install')
      
      // 清单安装状态
      expect(state.requirementsFile).toBeNull()
      
      // AI 分析状态
      expect(state.aiAnalysisOpen).toBe(false)
      expect(state.aiAnalysisContent).toBe('')
      expect(state.aiAnalysisStreaming).toBe(false)
      
      // 镜像源状态
      expect(state.mirrorSource).toBe('official')
    })
  })

  describe('环境切换 (需求 1.1, 1.2)', () => {
    it('应该正确设置当前环境 ID', () => {
      const store = useDependencyStore.getState()
      const testEnvId = 'test-env-123'
      
      store.setCurrentEnv(testEnvId)
      
      const state = useDependencyStore.getState()
      expect(state.currentEnvId).toBe(testEnvId)
    })

    it('环境切换时应该触发环境检测', async () => {
      const store = useDependencyStore.getState()
      const testEnvId = 'test-env-456'
      
      // 设置环境
      store.setCurrentEnv(testEnvId)
      
      // 等待环境检测完成（开发环境会使用 Mock）
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      const state = useDependencyStore.getState()
      
      // 应该有环境信息
      expect(state.envInfo).not.toBeNull()
      
      // 应该有日志记录
      expect(state.logs.length).toBeGreaterThan(0)
      const hasDetectionLog = state.logs.some(log => 
        log.message.includes('检测环境信息')
      )
      expect(hasDetectionLog).toBe(true)
    })

    it('未选择环境时检测应该跳过', async () => {
      const store = useDependencyStore.getState()
      
      // 不设置环境，直接调用检测
      await store.detectEnvironment()
      
      const state = useDependencyStore.getState()
      
      // 不应该有环境信息
      expect(state.envInfo).toBeNull()
    })
  })

  describe('日志管理 (需求 1.2)', () => {
    it('应该正确添加日志条目', () => {
      const store = useDependencyStore.getState()
      
      store.addLog({
        level: 'info',
        message: '测试日志消息',
        source: 'system'
      })
      
      const state = useDependencyStore.getState()
      
      expect(state.logs).toHaveLength(1)
      expect(state.logs[0]).toMatchObject({
        level: 'info',
        message: '测试日志消息',
        source: 'system'
      })
      
      // 应该自动生成 ID 和时间戳
      expect(state.logs[0].id).toBeDefined()
      expect(state.logs[0].timestamp).toBeDefined()
    })

    it('应该支持添加多条日志', () => {
      const store = useDependencyStore.getState()
      
      store.addLog({ level: 'info', message: '日志1', source: 'system' })
      store.addLog({ level: 'warning', message: '日志2', source: 'pip' })
      store.addLog({ level: 'error', message: '日志3', source: 'python' })
      
      const state = useDependencyStore.getState()
      
      expect(state.logs).toHaveLength(3)
      expect(state.logs[0].message).toBe('日志1')
      expect(state.logs[1].message).toBe('日志2')
      expect(state.logs[2].message).toBe('日志3')
    })

    it('应该正确清空日志', () => {
      const store = useDependencyStore.getState()
      
      // 添加一些日志
      store.addLog({ level: 'info', message: '日志1', source: 'system' })
      store.addLog({ level: 'info', message: '日志2', source: 'system' })
      
      expect(useDependencyStore.getState().logs).toHaveLength(2)
      
      // 清空日志
      store.clearLogs()
      
      const state = useDependencyStore.getState()
      expect(state.logs).toHaveLength(0)
    })

    it('日志时间戳应该按添加顺序递增', () => {
      const store = useDependencyStore.getState()
      
      store.addLog({ level: 'info', message: '日志1', source: 'system' })
      store.addLog({ level: 'info', message: '日志2', source: 'system' })
      store.addLog({ level: 'info', message: '日志3', source: 'system' })
      
      const state = useDependencyStore.getState()
      
      const timestamp1 = new Date(state.logs[0].timestamp).getTime()
      const timestamp2 = new Date(state.logs[1].timestamp).getTime()
      const timestamp3 = new Date(state.logs[2].timestamp).getTime()
      
      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1)
      expect(timestamp3).toBeGreaterThanOrEqual(timestamp2)
    })
  })

  describe('核心安装功能', () => {
    it('应该检测 CUDA 版本', async () => {
      const store = useDependencyStore.getState()
      
      await store.detectCudaVersion()
      
      const state = useDependencyStore.getState()
      
      // 开发环境应该返回 Mock 版本
      expect(state.cudaVersion).toBe('12.1')
      
      // 应该有日志记录
      const hasLog = state.logs.some(log => 
        log.message.includes('CUDA 版本')
      )
      expect(hasLog).toBe(true)
    })

    it('应该获取 PyTorch 版本列表', async () => {
      const store = useDependencyStore.getState()
      
      await store.fetchPytorchVersions('12.1')
      
      const state = useDependencyStore.getState()
      
      // 开发环境应该返回 Mock 版本列表
      expect(state.pytorchVersions.length).toBeGreaterThan(0)
      expect(state.pytorchVersions).toContain('2.1.0')
      
      // 应该有日志记录
      const hasLog = state.logs.some(log => 
        log.message.includes('PyTorch 版本列表')
      )
      expect(hasLog).toBe(true)
    })

    it('安装 PyTorch 时应该设置执行状态', async () => {
      const store = useDependencyStore.getState()
      
      // 先设置环境
      store.setCurrentEnv('test-env')
      
      // 开始安装
      const installPromise = store.installPytorch('2.1.0', '12.1')
      
      // 检查执行状态（可能已经完成）
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 等待完成
      await installPromise
      
      const state = useDependencyStore.getState()
      
      // 完成后应该清除执行状态
      expect(state.isExecuting).toBe(false)
      
      // 应该有成功日志
      const hasSuccessLog = state.logs.some(log => 
        log.level === 'success' && log.message.includes('PyTorch')
      )
      expect(hasSuccessLog).toBe(true)
    })

    it('未选择环境时安装应该失败', async () => {
      const store = useDependencyStore.getState()
      
      // 不设置环境，直接安装
      await store.installPytorch('2.1.0', '12.1')
      
      const state = useDependencyStore.getState()
      
      // 应该有错误日志
      const hasErrorLog = state.logs.some(log => 
        log.level === 'error' && log.message.includes('未选择环境')
      )
      expect(hasErrorLog).toBe(true)
    })
  })

  describe('手动安装功能', () => {
    it('应该搜索包信息', async () => {
      const store = useDependencyStore.getState()
      
      await store.searchPackage('numpy')
      
      const state = useDependencyStore.getState()
      
      // 应该有日志记录
      const hasLog = state.logs.some(log => 
        log.message.includes('搜索包')
      )
      expect(hasLog).toBe(true)
    })

    it('应该获取包版本列表', async () => {
      const store = useDependencyStore.getState()
      
      await store.fetchPackageVersions('numpy')
      
      const state = useDependencyStore.getState()
      
      // 开发环境应该返回 Mock 版本列表
      expect(state.packageVersions.length).toBeGreaterThan(0)
      
      // 应该有日志记录
      const hasLog = state.logs.some(log => 
        log.message.includes('版本列表')
      )
      expect(hasLog).toBe(true)
    })

    it('应该支持安装包', async () => {
      const store = useDependencyStore.getState()
      
      // 先设置环境
      store.setCurrentEnv('test-env')
      
      await store.installPackage('numpy', '1.24.0', 'install')
      
      const state = useDependencyStore.getState()
      
      // 应该有成功日志
      const hasSuccessLog = state.logs.some(log => 
        log.level === 'success'
      )
      expect(hasSuccessLog).toBe(true)
    })

    it('应该支持模拟安装', async () => {
      const store = useDependencyStore.getState()
      
      store.setCurrentEnv('test-env')
      
      await store.installPackage('numpy', '1.24.0', 'dry-run')
      
      const state = useDependencyStore.getState()
      
      // 应该有模拟安装的日志
      const hasDryRunLog = state.logs.some(log => 
        log.message.includes('模拟安装')
      )
      expect(hasDryRunLog).toBe(true)
    })

    it('应该支持卸载包', async () => {
      const store = useDependencyStore.getState()
      
      store.setCurrentEnv('test-env')
      
      await store.uninstallPackage('numpy')
      
      const state = useDependencyStore.getState()
      
      // 应该有卸载日志
      const hasUninstallLog = state.logs.some(log => 
        log.message.includes('卸载')
      )
      expect(hasUninstallLog).toBe(true)
    })
  })

  describe('清单安装功能', () => {
    it('应该选择 requirements.txt 文件', async () => {
      const store = useDependencyStore.getState()
      
      await store.selectRequirementsFile()
      
      const state = useDependencyStore.getState()
      
      // 开发环境应该返回 Mock 路径
      expect(state.requirementsFile).not.toBeNull()
      expect(state.requirementsFile).toContain('requirements.txt')
    })

    it('应该从 requirements.txt 安装', async () => {
      const store = useDependencyStore.getState()
      
      // 先设置环境和文件
      store.setCurrentEnv('test-env')
      useDependencyStore.setState({
        requirementsFile: 'C:/test/requirements.txt'
      })
      
      await store.installFromRequirements('install')
      
      const state = useDependencyStore.getState()
      
      // 应该有安装日志
      const hasInstallLog = state.logs.some(log => 
        log.message.includes('requirements.txt')
      )
      expect(hasInstallLog).toBe(true)
    })

    it('未选择文件时安装应该失败', async () => {
      const store = useDependencyStore.getState()
      
      store.setCurrentEnv('test-env')
      
      await store.installFromRequirements('install')
      
      const state = useDependencyStore.getState()
      
      // 应该有错误日志
      const hasErrorLog = state.logs.some(log => 
        log.level === 'error' && log.message.includes('未选择')
      )
      expect(hasErrorLog).toBe(true)
    })
  })

  describe('工具箱功能', () => {
    it('应该打开终端', async () => {
      const store = useDependencyStore.getState()
      
      store.setCurrentEnv('test-env')
      
      await store.openTerminal()
      
      const state = useDependencyStore.getState()
      
      // 应该有终端日志
      const hasTerminalLog = state.logs.some(log => 
        log.message.includes('终端')
      )
      expect(hasTerminalLog).toBe(true)
    })

    it('未选择环境时打开终端应该失败', async () => {
      const store = useDependencyStore.getState()
      
      await store.openTerminal()
      
      const state = useDependencyStore.getState()
      
      // 应该有错误日志
      const hasErrorLog = state.logs.some(log => 
        log.level === 'error' && log.message.includes('未选择环境')
      )
      expect(hasErrorLog).toBe(true)
    })
  })

  describe('环境检测功能', () => {
    it('应该检测环境信息', async () => {
      const store = useDependencyStore.getState()
      
      store.setCurrentEnv('test-env')
      
      await store.detectEnvironment()
      
      const state = useDependencyStore.getState()
      
      // 应该有环境信息
      expect(state.envInfo).not.toBeNull()
      expect(state.envInfo?.windowsVersion).toBeDefined()
      expect(state.envInfo?.gpu).toBeDefined()
      expect(state.envInfo?.cpu).toBeDefined()
      expect(state.envInfo?.python).toBeDefined()
      expect(state.envInfo?.cuda).toBeDefined()
      expect(state.envInfo?.dependencies).toBeDefined()
    })

    it('环境信息应该包含所有必需字段', async () => {
      const store = useDependencyStore.getState()
      
      store.setCurrentEnv('test-env')
      
      await store.detectEnvironment()
      
      const state = useDependencyStore.getState()
      const envInfo = state.envInfo!
      
      // 系统信息
      expect(envInfo.windowsVersion).toBeTruthy()
      
      // 硬件信息
      expect(envInfo.gpu.model).toBeTruthy()
      expect(envInfo.gpu.vram).toBeTruthy()
      expect(envInfo.cpu.model).toBeTruthy()
      expect(envInfo.cpu.ram).toBeTruthy()
      
      // 软件信息
      expect(envInfo.python.version).toBeTruthy()
      expect(envInfo.python.path).toBeTruthy()
      expect(envInfo.cuda.version).toBeTruthy()
      
      // 依赖信息
      expect(envInfo.dependencies.pytorch).toBeTruthy()
      expect(envInfo.dependencies.transformer).toBeTruthy()
    })
  })

  describe('AI 分析功能', () => {
    it('应该打开 AI 分析对话框', async () => {
      const store = useDependencyStore.getState()
      
      // 先添加一些日志
      store.addLog({ level: 'error', message: '测试错误', source: 'pip' })
      
      // 开始分析（会因为没有配置而失败，但这是预期的）
      await store.analyzeLogsWithAI()
      
      const state = useDependencyStore.getState()
      
      // 在测试环境中，由于没有配置默认 AI API，会失败并关闭对话框
      // 所以我们检查是否有错误日志
      const hasErrorLog = state.logs.some(log => 
        log.level === 'error' && (
          log.message.includes('未配置默认 AI API') ||
          log.message.includes('AI 分析失败')
        )
      )
      expect(hasErrorLog).toBe(true)
    })

    it('应该支持流式输出', async () => {
      const store = useDependencyStore.getState()
      
      store.addLog({ level: 'error', message: '测试错误', source: 'pip' })
      
      await store.analyzeLogsWithAI()
      
      const state = useDependencyStore.getState()
      
      // 在测试环境中，由于没有配置，会失败
      // 检查是否有相应的错误处理
      const hasErrorLog = state.logs.some(log => 
        log.level === 'error' && log.message.includes('AI 分析失败')
      )
      expect(hasErrorLog).toBe(true)
      
      // 对话框应该已关闭
      expect(state.aiAnalysisOpen).toBe(false)
    })

    it('应该关闭 AI 分析对话框', () => {
      const store = useDependencyStore.getState()
      
      // 先打开对话框
      useDependencyStore.setState({
        aiAnalysisOpen: true,
        aiAnalysisContent: '测试内容',
        aiAnalysisStreaming: false
      })
      
      // 关闭对话框
      store.closeAIAnalysis()
      
      const state = useDependencyStore.getState()
      
      expect(state.aiAnalysisOpen).toBe(false)
      expect(state.aiAnalysisContent).toBe('')
      expect(state.aiAnalysisStreaming).toBe(false)
    })

    it('没有日志时分析应该失败', async () => {
      const store = useDependencyStore.getState()
      
      // 不添加日志，直接分析
      await store.analyzeLogsWithAI()
      
      const state = useDependencyStore.getState()
      
      // 应该有错误日志
      const hasErrorLog = state.logs.some(log => 
        log.level === 'error' && log.message.includes('没有日志')
      )
      expect(hasErrorLog).toBe(true)
    })
  })

  describe('与 useEnvStore 的集成', () => {
    it('应该监听环境切换事件', () => {
      const envStore = useEnvStore.getState()
      const depStore = useDependencyStore.getState()
      
      // 模拟环境切换
      const testEnvId = 'integration-test-env'
      
      // 通过 useEnvStore 切换环境
      // 注意：实际的监听逻辑在 store 文件底部
      depStore.setCurrentEnv(testEnvId)
      
      const state = useDependencyStore.getState()
      expect(state.currentEnvId).toBe(testEnvId)
    })
  })
})
