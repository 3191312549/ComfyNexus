/**
 * 工具箱组件单元测试
 * 
 * 测试打开终端和清空日志功能
 * 验证需求: 6.2, 6.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ToolboxSection from '../ToolboxSection'
import { useDependencyStore } from '@/stores/useDependencyStore'

// Mock useDependencyStore
vi.mock('@/stores/useDependencyStore')

describe('ToolboxSection - 工具箱组件', () => {
  // Mock 函数
  const mockOpenTerminal = vi.fn()
  const mockClearLogs = vi.fn()

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()

    // 设置默认的 store 状态
    vi.mocked(useDependencyStore).mockReturnValue({
      isExecuting: false,
      openTerminal: mockOpenTerminal,
      clearLogs: mockClearLogs,
      // 其他必需的 store 属性
      currentEnvId: 'test-env',
      logs: [],
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
      autoFallbackEnabled: true,
      setCurrentEnv: vi.fn(),
      addLog: vi.fn(),
      setMirrorSource: vi.fn(),
      setAutoFallback: vi.fn(),
      detectCudaVersion: vi.fn(),
      fetchPytorchVersions: vi.fn(),
      installPytorch: vi.fn(),
      searchPackage: vi.fn(),
      fetchPackageVersions: vi.fn(),
      installPackage: vi.fn(),
      uninstallPackage: vi.fn(),
      selectRequirementsFile: vi.fn(),
      installFromRequirements: vi.fn(),
      detectEnvironment: vi.fn(),
      analyzeLogsWithAI: vi.fn(),
      closeAIAnalysis: vi.fn(),
    } as any)
  })

  describe('组件渲染', () => {
    it('应该渲染工具箱标题', () => {
      render(<ToolboxSection />)
      expect(screen.getByText('工具箱')).toBeInTheDocument()
    })

    it('应该渲染打开终端按钮', () => {
      render(<ToolboxSection />)
      expect(screen.getByText('打开终端')).toBeInTheDocument()
    })

    it('应该渲染清空日志按钮', () => {
      render(<ToolboxSection />)
      expect(screen.getByText('清空日志')).toBeInTheDocument()
    })

    it('两个按钮应该默认启用', () => {
      render(<ToolboxSection />)
      
      const openTerminalButton = screen.getByText('打开终端').closest('button')
      const clearLogsButton = screen.getByText('清空日志').closest('button')
      
      expect(openTerminalButton).not.toBeDisabled()
      expect(clearLogsButton).not.toBeDisabled()
    })
  })

  describe('打开终端功能 (需求 6.2)', () => {
    it('点击打开终端按钮应该调用 openTerminal 方法', () => {
      render(<ToolboxSection />)
      
      const openTerminalButton = screen.getByText('打开终端')
      fireEvent.click(openTerminalButton)
      
      expect(mockOpenTerminal).toHaveBeenCalledTimes(1)
    })

    it('执行中时打开终端按钮应该被禁用', () => {
      // 设置 isExecuting 为 true
      vi.mocked(useDependencyStore).mockReturnValue({
        isExecuting: true,
        openTerminal: mockOpenTerminal,
        clearLogs: mockClearLogs,
        currentEnvId: 'test-env',
        logs: [],
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
        autoFallbackEnabled: true,
        setCurrentEnv: vi.fn(),
        addLog: vi.fn(),
        setMirrorSource: vi.fn(),
        setAutoFallback: vi.fn(),
        detectCudaVersion: vi.fn(),
        fetchPytorchVersions: vi.fn(),
        installPytorch: vi.fn(),
        searchPackage: vi.fn(),
        fetchPackageVersions: vi.fn(),
        installPackage: vi.fn(),
        uninstallPackage: vi.fn(),
        selectRequirementsFile: vi.fn(),
        installFromRequirements: vi.fn(),
        detectEnvironment: vi.fn(),
        analyzeLogsWithAI: vi.fn(),
        closeAIAnalysis: vi.fn(),
      } as any)

      render(<ToolboxSection />)
      
      const openTerminalButton = screen.getByText('打开终端').closest('button')
      expect(openTerminalButton).toBeDisabled()
    })

    it('执行中时点击打开终端按钮不应该调用 openTerminal 方法', () => {
      // 设置 isExecuting 为 true
      vi.mocked(useDependencyStore).mockReturnValue({
        isExecuting: true,
        openTerminal: mockOpenTerminal,
        clearLogs: mockClearLogs,
        currentEnvId: 'test-env',
        logs: [],
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
        autoFallbackEnabled: true,
        setCurrentEnv: vi.fn(),
        addLog: vi.fn(),
        setMirrorSource: vi.fn(),
        setAutoFallback: vi.fn(),
        detectCudaVersion: vi.fn(),
        fetchPytorchVersions: vi.fn(),
        installPytorch: vi.fn(),
        searchPackage: vi.fn(),
        fetchPackageVersions: vi.fn(),
        installPackage: vi.fn(),
        uninstallPackage: vi.fn(),
        selectRequirementsFile: vi.fn(),
        installFromRequirements: vi.fn(),
        detectEnvironment: vi.fn(),
        analyzeLogsWithAI: vi.fn(),
        closeAIAnalysis: vi.fn(),
      } as any)

      render(<ToolboxSection />)
      
      const openTerminalButton = screen.getByText('打开终端')
      fireEvent.click(openTerminalButton)
      
      // 按钮被禁用，不应该调用方法
      expect(mockOpenTerminal).not.toHaveBeenCalled()
    })
  })

  describe('清空日志功能 (需求 6.6)', () => {
    it('点击清空日志按钮应该调用 clearLogs 方法', () => {
      render(<ToolboxSection />)
      
      const clearLogsButton = screen.getByText('清空日志')
      fireEvent.click(clearLogsButton)
      
      expect(mockClearLogs).toHaveBeenCalledTimes(1)
    })

    it('执行中时清空日志按钮应该被禁用', () => {
      // 设置 isExecuting 为 true
      vi.mocked(useDependencyStore).mockReturnValue({
        isExecuting: true,
        openTerminal: mockOpenTerminal,
        clearLogs: mockClearLogs,
        currentEnvId: 'test-env',
        logs: [],
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
        autoFallbackEnabled: true,
        setCurrentEnv: vi.fn(),
        addLog: vi.fn(),
        setMirrorSource: vi.fn(),
        setAutoFallback: vi.fn(),
        detectCudaVersion: vi.fn(),
        fetchPytorchVersions: vi.fn(),
        installPytorch: vi.fn(),
        searchPackage: vi.fn(),
        fetchPackageVersions: vi.fn(),
        installPackage: vi.fn(),
        uninstallPackage: vi.fn(),
        selectRequirementsFile: vi.fn(),
        installFromRequirements: vi.fn(),
        detectEnvironment: vi.fn(),
        analyzeLogsWithAI: vi.fn(),
        closeAIAnalysis: vi.fn(),
      } as any)

      render(<ToolboxSection />)
      
      const clearLogsButton = screen.getByText('清空日志').closest('button')
      expect(clearLogsButton).toBeDisabled()
    })

    it('执行中时点击清空日志按钮不应该调用 clearLogs 方法', () => {
      // 设置 isExecuting 为 true
      vi.mocked(useDependencyStore).mockReturnValue({
        isExecuting: true,
        openTerminal: mockOpenTerminal,
        clearLogs: mockClearLogs,
        currentEnvId: 'test-env',
        logs: [],
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
        autoFallbackEnabled: true,
        setCurrentEnv: vi.fn(),
        addLog: vi.fn(),
        setMirrorSource: vi.fn(),
        setAutoFallback: vi.fn(),
        detectCudaVersion: vi.fn(),
        fetchPytorchVersions: vi.fn(),
        installPytorch: vi.fn(),
        searchPackage: vi.fn(),
        fetchPackageVersions: vi.fn(),
        installPackage: vi.fn(),
        uninstallPackage: vi.fn(),
        selectRequirementsFile: vi.fn(),
        installFromRequirements: vi.fn(),
        detectEnvironment: vi.fn(),
        analyzeLogsWithAI: vi.fn(),
        closeAIAnalysis: vi.fn(),
      } as any)

      render(<ToolboxSection />)
      
      const clearLogsButton = screen.getByText('清空日志')
      fireEvent.click(clearLogsButton)
      
      // 按钮被禁用，不应该调用方法
      expect(mockClearLogs).not.toHaveBeenCalled()
    })

    it('多次点击清空日志按钮应该多次调用 clearLogs 方法', () => {
      render(<ToolboxSection />)
      
      const clearLogsButton = screen.getByText('清空日志')
      
      // 点击 3 次
      fireEvent.click(clearLogsButton)
      fireEvent.click(clearLogsButton)
      fireEvent.click(clearLogsButton)
      
      expect(mockClearLogs).toHaveBeenCalledTimes(3)
    })
  })

  describe('按钮交互', () => {
    it('应该能够同时点击两个按钮', () => {
      render(<ToolboxSection />)
      
      const openTerminalButton = screen.getByText('打开终端')
      const clearLogsButton = screen.getByText('清空日志')
      
      fireEvent.click(openTerminalButton)
      fireEvent.click(clearLogsButton)
      
      expect(mockOpenTerminal).toHaveBeenCalledTimes(1)
      expect(mockClearLogs).toHaveBeenCalledTimes(1)
    })

    it('按钮应该有正确的样式类', () => {
      render(<ToolboxSection />)
      
      const openTerminalButton = screen.getByText('打开终端').closest('button')
      const clearLogsButton = screen.getByText('清空日志').closest('button')
      
      // 检查按钮是否有 w-full 和 justify-start 类
      expect(openTerminalButton?.className).toContain('w-full')
      expect(openTerminalButton?.className).toContain('justify-start')
      expect(clearLogsButton?.className).toContain('w-full')
      expect(clearLogsButton?.className).toContain('justify-start')
    })
  })

  describe('边缘情况', () => {
    it('当 store 方法为 undefined 时不应该崩溃', () => {
      // 设置 store 方法为 undefined
      vi.mocked(useDependencyStore).mockReturnValue({
        isExecuting: false,
        openTerminal: undefined as any,
        clearLogs: undefined as any,
        currentEnvId: 'test-env',
        logs: [],
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
        autoFallbackEnabled: true,
        setCurrentEnv: vi.fn(),
        addLog: vi.fn(),
        setMirrorSource: vi.fn(),
        setAutoFallback: vi.fn(),
        detectCudaVersion: vi.fn(),
        fetchPytorchVersions: vi.fn(),
        installPytorch: vi.fn(),
        searchPackage: vi.fn(),
        fetchPackageVersions: vi.fn(),
        installPackage: vi.fn(),
        uninstallPackage: vi.fn(),
        selectRequirementsFile: vi.fn(),
        installFromRequirements: vi.fn(),
        detectEnvironment: vi.fn(),
        analyzeLogsWithAI: vi.fn(),
        closeAIAnalysis: vi.fn(),
      } as any)

      // 应该能够正常渲染，不会崩溃
      expect(() => render(<ToolboxSection />)).not.toThrow()
    })
  })
})
