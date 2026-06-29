/**
 * EnvManagePage 选项卡顺序测试
 * 
 * Feature: environment-management-optimization
 * Property 1: 选项卡切换一致性
 * 验证需求：1.1, 1.2
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import EnvManagePage from '../EnvManagePage'
import { useEnvStore } from '@/stores/useEnvStore'

// Mock useEnvStore
vi.mock('@/stores/useEnvStore')

// Mock NavigationGuardContext
vi.mock('@/contexts/NavigationGuardContext', () => ({
  useNavigationGuard: () => ({
    registerGuard: vi.fn(),
    unregisterGuard: vi.fn()
  })
}))

// Mock EnvSwitchGuardContext
vi.mock('@/contexts/EnvSwitchGuardContext', () => ({
  useEnvSwitchGuard: () => ({
    registerGuard: vi.fn(),
    unregisterGuard: vi.fn()
  })
}))

// Mock TabContainer
vi.mock('@/components/env/TabContainer', () => ({
  TabContainer: vi.fn(({ activeTab }) => (
    <div data-testid="tab-container">
      <div data-testid="active-tab">{activeTab}</div>
    </div>
  ))
}))

describe('EnvManagePage - 选项卡顺序', () => {
  const mockEnvironment = {
    id: 'test-env-1',
    alias: '测试环境',
    general: {
      pythonPath: '/usr/bin/python',
      comfyuiPath: '/path/to/comfyui',
      version: 'main'
    },
    acceleration: {
      computeDevice: 'auto',
      vramStrategy: 'normal' as const,
      cpuOnly: false,
      gpuOnly: false,
      reserveVram: 0,
      unetPrecision: 'auto' as const,
      vaePrecision: 'fp32' as const,
      textEncPrecision: 'fp16' as const,
      attentionMode: 'flash' as const,
      disableXformers: false,
      disableSmartMemory: false,
      forceChannelsLast: false,
      cacheLru: 0,
      deterministic: false,
      fastMode: false,
      listenNetwork: false,
      listenAddress: '',
      port: 8188,
      enableCors: false,
      tlsKeyfile: '',
      tlsCertfile: '',
      baseDirectory: '',
      inputDirectory: '',
      outputDirectory: '',
      tempDirectory: '',
      userDirectory: '',
      extraModelPathsConfig: '',
      previewMethod: 'auto' as const,
      previewSize: 512,
      safeMode: false,
      enableManager: true,
      logLevel: 'INFO' as const,
      disableMetadata: false
    },
    modelPathConfigs: [],
    advancedEnvVars: '',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.mocked(useEnvStore).mockReturnValue({
      environments: [mockEnvironment],
      currentEnvId: 'test-env-1',
      loading: false,
      error: null,
      fetchEnvironments: vi.fn(),
      switchEnvironment: vi.fn(),
      saveEnvConfig: vi.fn(),
      getDependencies: vi.fn(),
      getEnvConfig: vi.fn()
    } as any)
  })

  it('应该按照正确的顺序显示选项卡：常规、模型路径、加速配置、高级环境变量', () => {
    render(
      <BrowserRouter>
        <EnvManagePage />
      </BrowserRouter>
    )

    // 获取所有选项卡按钮（使用 i18n 键）
    const tabs = screen.getAllByRole('button').filter(button => 
      button.textContent?.includes('env.tabs.general') ||
      button.textContent?.includes('env.tabs.modelPaths') ||
      button.textContent?.includes('env.tabs.acceleration') ||
      button.textContent?.includes('env.tabs.advancedEnv')
    )

    // 验证选项卡数量
    expect(tabs.length).toBe(4)

    // 验证选项卡顺序（使用 i18n 键）
    expect(tabs[0].textContent).toContain('env.tabs.general')
    expect(tabs[1].textContent).toContain('env.tabs.modelPaths')
    expect(tabs[2].textContent).toContain('env.tabs.acceleration')
    expect(tabs[3].textContent).toContain('env.tabs.advancedEnv')
  })

  it('应该在点击选项卡时正确切换 activeTab 状态', () => {
    render(
      <BrowserRouter>
        <EnvManagePage />
      </BrowserRouter>
    )

    // 获取选项卡按钮（使用 i18n 键）
    const generalTab = screen.getByRole('button', { name: 'env.tabs.general' })
    const modelPathsTab = screen.getByRole('button', { name: 'env.tabs.modelPaths' })
    const accelerationTab = screen.getByRole('button', { name: 'env.tabs.acceleration' })
    const advancedEnvTab = screen.getByRole('button', { name: 'env.tabs.advancedEnv' })

    // 默认应该选中常规选项卡
    expect(generalTab).toHaveClass('border-blue-500')

    // 点击模型路径选项卡
    fireEvent.click(modelPathsTab)
    expect(modelPathsTab).toHaveClass('border-blue-500')

    // 点击加速配置选项卡
    fireEvent.click(accelerationTab)
    expect(accelerationTab).toHaveClass('border-blue-500')

    // 点击高级环境变量选项卡
    fireEvent.click(advancedEnvTab)
    expect(advancedEnvTab).toHaveClass('border-blue-500')
  })

  it('应该为高级环境变量选项卡显示正确的图标', () => {
    render(
      <BrowserRouter>
        <EnvManagePage />
      </BrowserRouter>
    )

    // 获取高级环境变量选项卡（使用 i18n 键）
    const advancedEnvTab = screen.getByRole('button', { name: 'env.tabs.advancedEnv' })

    // 验证选项卡包含图标（Code2 图标）
    const icon = advancedEnvTab.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('应该在切换选项卡时更新 TabContainer 的 activeTab 属性', () => {
    render(
      <BrowserRouter>
        <EnvManagePage />
      </BrowserRouter>
    )

    // 获取 TabContainer
    const tabContainer = screen.getByTestId('tab-container')
    const activeTabDisplay = screen.getByTestId('active-tab')

    // 默认应该是 general
    expect(activeTabDisplay.textContent).toBe('general')

    // 点击高级环境变量选项卡（使用 i18n 键）
    const advancedEnvTab = screen.getByRole('button', { name: 'env.tabs.advancedEnv' })
    fireEvent.click(advancedEnvTab)

    // 验证 activeTab 更新为 advancedEnv
    expect(activeTabDisplay.textContent).toBe('advancedEnv')
  })
})
