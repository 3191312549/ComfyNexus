/**
 * InstallProgressModal 组件单元测试
 * 
 * 测试内容：
 * - 组件渲染
 * - 打开/关闭逻辑
 * - 依赖冲突检查和警告显示（需求 8.5, 8.6）
 * - 进度显示
 * - 状态图标
 * - 错误处理
 * 
 * 验证需求：9.1, 8.5, 8.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallProgressModal } from '../InstallProgressModal'
import { InstallStage, InstallStatus, ConflictType, ConflictSeverity } from '@/types/plugin-marketplace'
import { pluginMarketplaceService } from '@/services/pluginMarketplaceService'

// Mock pluginMarketplaceService
vi.mock('@/services/pluginMarketplaceService', () => ({
  pluginMarketplaceService: {
    checkDependencies: vi.fn(),
    installPlugin: vi.fn(),
    getInstallProgress: vi.fn()
  }
}))

describe('InstallProgressModal', () => {
  const mockOnClose = vi.fn()
  const mockOnInstallComplete = vi.fn()
  const mockPluginName = 'ComfyUI-Manager'
  const mockGithubUrl = 'https://github.com/ltdrdata/ComfyUI-Manager'
  const mockTaskId = 'task-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染', () => {
    it('当 isOpen 为 false 时不应该渲染', () => {
      render(
        <InstallProgressModal
          isOpen={false}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      expect(screen.queryByText(`安装插件: ${mockPluginName}`)).not.toBeInTheDocument()
    })

    it('当 isOpen 为 true 时应该渲染弹窗并检查依赖', async () => {
      // Mock 无冲突的依赖检查
      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      // Mock 安装 API
      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      // Mock 进度 API
      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.CLONING,
          progress: 10,
          current_package: '',
          status: InstallStatus.RUNNING,
          error_message: '',
          log_path: '',
          started_at: new Date().toISOString(),
          finished_at: null
        }
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 应该显示弹窗标题
      expect(screen.getByText(`安装插件: ${mockPluginName}`)).toBeInTheDocument()
      
      // 应该先显示检查冲突的状态
      expect(screen.getByText('正在检查依赖冲突...')).toBeInTheDocument()

      // 等待依赖检查完成并自动开始安装
      await waitFor(() => {
        expect(pluginMarketplaceService.checkDependencies).toHaveBeenCalledWith(mockGithubUrl)
      })
    })
  })

  describe('依赖冲突检查 - 需求 8.5', () => {
    it('应该在打开时自动检查依赖冲突', async () => {
      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(pluginMarketplaceService.checkDependencies).toHaveBeenCalledWith(mockGithubUrl)
      })
    })

    it('当检测到依赖冲突时应该显示警告', async () => {
      const mockConflicts = [
        {
          package: 'numpy',
          required_version: '>=1.20.0',
          installed_version: '1.19.0',
          conflict_type: ConflictType.VERSION_MISMATCH,
          severity: ConflictSeverity.ERROR
        },
        {
          package: 'torch',
          required_version: '==2.0.0',
          installed_version: '1.13.0',
          conflict_type: ConflictType.VERSION_MISMATCH,
          severity: ConflictSeverity.WARNING
        }
      ]

      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: true,
        conflicts: mockConflicts
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待冲突警告显示
      await waitFor(() => {
        expect(screen.getByText('检测到依赖冲突')).toBeInTheDocument()
        expect(screen.getByText(/检测到 2 个依赖冲突/)).toBeInTheDocument()
      })

      // 应该显示冲突详情
      expect(screen.getByText('numpy')).toBeInTheDocument()
      expect(screen.getByText('torch')).toBeInTheDocument()
    })

    it('当无冲突时应该自动开始安装', async () => {
      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.CLONING,
          progress: 10,
          current_package: '',
          status: InstallStatus.RUNNING,
          error_message: '',
          log_path: '',
          started_at: new Date().toISOString(),
          finished_at: null
        }
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待自动开始安装
      await waitFor(() => {
        expect(pluginMarketplaceService.installPlugin).toHaveBeenCalledWith(mockGithubUrl, true)
      })
    })
  })

  describe('用户确认安装 - 需求 8.6', () => {
    it('当有冲突时应该显示"继续安装"和"取消"按钮', async () => {
      const mockConflicts = [
        {
          package: 'numpy',
          required_version: '>=1.20.0',
          installed_version: '1.19.0',
          conflict_type: ConflictType.VERSION_MISMATCH,
          severity: ConflictSeverity.ERROR
        }
      ]

      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: true,
        conflicts: mockConflicts
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待冲突警告显示
      await waitFor(() => {
        expect(screen.getByText('检测到依赖冲突')).toBeInTheDocument()
      })

      // 应该显示两个按钮
      expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /继续安装/i })).toBeInTheDocument()
    })

    it('点击"取消"按钮应该关闭弹窗', async () => {
      const user = userEvent.setup({ delay: null })

      const mockConflicts = [
        {
          package: 'numpy',
          required_version: '>=1.20.0',
          installed_version: '1.19.0',
          conflict_type: ConflictType.VERSION_MISMATCH,
          severity: ConflictSeverity.ERROR
        }
      ]

      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: true,
        conflicts: mockConflicts
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待冲突警告显示
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument()
      })

      // 点击取消按钮
      const cancelButton = screen.getByRole('button', { name: /取消/i })
      await user.click(cancelButton)

      // onClose 应该被调用
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('点击"继续安装"按钮应该开始安装', async () => {
      const user = userEvent.setup({ delay: null })

      const mockConflicts = [
        {
          package: 'numpy',
          required_version: '>=1.20.0',
          installed_version: '1.19.0',
          conflict_type: ConflictType.VERSION_MISMATCH,
          severity: ConflictSeverity.ERROR
        }
      ]

      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: true,
        conflicts: mockConflicts
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.CLONING,
          progress: 10,
          current_package: '',
          status: InstallStatus.RUNNING,
          error_message: '',
          log_path: '',
          started_at: new Date().toISOString(),
          finished_at: null
        }
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待冲突警告显示
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /继续安装/i })).toBeInTheDocument()
      })

      // 点击继续安装按钮
      const continueButton = screen.getByRole('button', { name: /继续安装/i })
      await user.click(continueButton)

      // 应该调用安装 API
      await waitFor(() => {
        expect(pluginMarketplaceService.installPlugin).toHaveBeenCalledWith(mockGithubUrl, true)
      })
    })
  })

  describe('安装进度显示 - 需求 9.2, 9.3', () => {
    it('应该显示克隆阶段的进度', async () => {
      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.CLONING,
          progress: 30,
          current_package: '',
          status: InstallStatus.RUNNING,
          error_message: '',
          log_path: '',
          started_at: new Date().toISOString(),
          finished_at: null
        }
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待安装开始
      await waitFor(() => {
        expect(screen.getByText('正在克隆插件...')).toBeInTheDocument()
      })

      // 应该显示进度条
      await waitFor(() => {
        const progressText = screen.getByText('30%')
        expect(progressText).toBeInTheDocument()
      })
    })

    it('应该显示检查依赖阶段', async () => {
      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.CHECKING_DEPS,
          progress: 50,
          current_package: '',
          status: InstallStatus.RUNNING,
          error_message: '',
          log_path: '',
          started_at: new Date().toISOString(),
          finished_at: null
        }
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待进入检查依赖阶段
      await waitFor(() => {
        expect(screen.getByText('正在检查依赖...')).toBeInTheDocument()
      })
    })

    it('应该显示安装依赖阶段和当前包名', async () => {
      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.INSTALLING_DEPS,
          progress: 75,
          current_package: 'numpy',
          status: InstallStatus.RUNNING,
          error_message: '',
          log_path: '',
          started_at: new Date().toISOString(),
          finished_at: null
        }
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待进入安装依赖阶段
      await waitFor(() => {
        expect(screen.getByText('正在安装 numpy...')).toBeInTheDocument()
      })
    })
  })

  describe('成功状态显示 - 需求 9.4', () => {
    it('应该显示安装成功状态', async () => {
      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.SUCCESS,
          progress: 100,
          current_package: '',
          status: InstallStatus.SUCCESS,
          error_message: '',
          log_path: '',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString()
        }
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
          onInstallComplete={mockOnInstallComplete}
        />
      )

      // 等待安装成功
      await waitFor(() => {
        expect(screen.getByText('安装成功！')).toBeInTheDocument()
      })

      // 应该显示完成按钮
      expect(screen.getByRole('button', { name: /完成/i })).toBeInTheDocument()

      // 应该调用 onInstallComplete 回调
      expect(mockOnInstallComplete).toHaveBeenCalledWith(true)
    })

    it('点击完成按钮应该关闭弹窗', async () => {
      const user = userEvent.setup({ delay: null })

      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.SUCCESS,
          progress: 100,
          current_package: '',
          status: InstallStatus.SUCCESS,
          error_message: '',
          log_path: '',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString()
        }
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待安装成功
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /完成/i })).toBeInTheDocument()
      })

      // 点击完成按钮
      const completeButton = screen.getByRole('button', { name: /完成/i })
      await user.click(completeButton)

      // onClose 应该被调用
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('失败状态显示 - 需求 9.5', () => {
    it('应该显示安装失败状态和错误信息', async () => {
      const mockErrorMessage = 'Git clone failed: repository not found'

      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.FAILED,
          progress: 30,
          current_package: '',
          status: InstallStatus.FAILED,
          error_message: mockErrorMessage,
          log_path: '/logs/plugin_install_test_20240101.log',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString()
        }
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
          onInstallComplete={mockOnInstallComplete}
        />
      )

      // 等待安装失败
      await waitFor(() => {
        expect(screen.getByText('安装失败')).toBeInTheDocument()
      })

      // 应该显示错误信息
      expect(screen.getByText(mockErrorMessage)).toBeInTheDocument()

      // 应该显示查看日志按钮
      expect(screen.getByRole('button', { name: /查看日志/i })).toBeInTheDocument()

      // 应该显示关闭按钮
      expect(screen.getByRole('button', { name: /关闭/i })).toBeInTheDocument()

      // 应该调用 onInstallComplete 回调
      expect(mockOnInstallComplete).toHaveBeenCalledWith(false)
    })

    it('点击查看日志按钮应该打开日志文件', async () => {
      const user = userEvent.setup({ delay: null })
      const mockLogPath = '/logs/plugin_install_test_20240101.log'

      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.FAILED,
          progress: 30,
          current_package: '',
          status: InstallStatus.FAILED,
          error_message: 'Installation failed',
          log_path: mockLogPath,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString()
        }
      })

      // Mock console.log to verify log opening
      const consoleLogSpy = vi.spyOn(console, 'log')

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待安装失败
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /查看日志/i })).toBeInTheDocument()
      })

      // 点击查看日志按钮
      const logButton = screen.getByRole('button', { name: /查看日志/i })
      await user.click(logButton)

      // 应该尝试打开日志文件
      expect(consoleLogSpy).toHaveBeenCalledWith('打开日志文件:', mockLogPath)

      consoleLogSpy.mockRestore()
    })
  })

  describe('按钮交互', () => {
    it('安装过程中不应该允许关闭弹窗', async () => {
      vi.mocked(pluginMarketplaceService.checkDependencies).mockResolvedValue({
        success: true,
        has_conflicts: false,
        conflicts: []
      })

      vi.mocked(pluginMarketplaceService.installPlugin).mockResolvedValue({
        success: true,
        task_id: mockTaskId
      })

      vi.mocked(pluginMarketplaceService.getInstallProgress).mockResolvedValue({
        success: true,
        task: {
          task_id: mockTaskId,
          plugin_name: mockPluginName,
          github_url: mockGithubUrl,
          stage: InstallStage.CLONING,
          progress: 30,
          current_package: '',
          status: InstallStatus.RUNNING,
          error_message: '',
          log_path: '',
          started_at: new Date().toISOString(),
          finished_at: null
        }
      })

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 等待安装开始
      await waitFor(() => {
        expect(screen.getByText('正在克隆插件...')).toBeInTheDocument()
      })

      // 安装过程中不应该有关闭按钮
      expect(screen.queryByRole('button', { name: /关闭/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /完成/i })).not.toBeInTheDocument()
    })

    it('检查冲突时按钮应该被禁用', async () => {
      // 延迟依赖检查响应以测试加载状态
      vi.mocked(pluginMarketplaceService.checkDependencies).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: true,
              has_conflicts: false,
              conflicts: []
            })
          }, 100)
        })
      )

      render(
        <InstallProgressModal
          isOpen={true}
          pluginName={mockPluginName}
          githubUrl={mockGithubUrl}
          autoInstallDeps={true}
          onClose={mockOnClose}
        />
      )

      // 应该显示检查冲突的状态
      expect(screen.getByText('正在检查依赖冲突...')).toBeInTheDocument()

      // 等待检查完成
      await waitFor(() => {
        expect(pluginMarketplaceService.checkDependencies).toHaveBeenCalled()
      }, { timeout: 200 })
    })
  })
})
