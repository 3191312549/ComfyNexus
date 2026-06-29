/* eslint-disable no-restricted-syntax */
/**
 * EnvManagePage 未保存状态标记属性测试
 * 
 * Feature: environment-management-optimization
 * Property 6: 未保存状态标记
 * 验证需求：3.1
 * 
 * 属性：对于任意配置修改操作，系统应该将 hasUnsavedChanges 状态设置为 true
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import * as fc from 'fast-check'
import EnvManagePage from '../EnvManagePage'
import { useEnvStore } from '@/stores/useEnvStore'
import type { EnvironmentConfig } from '@/types/environment'

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

// Mock TabContainer 以捕获 onConfigChange 回调
let capturedOnConfigChange: ((changes: Partial<EnvironmentConfig>) => void) | null = null

vi.mock('@/components/env/TabContainer', () => ({
  TabContainer: vi.fn((props) => {
    capturedOnConfigChange = props.onConfigChange
    return (
      <div data-testid="tab-container">
        <button 
          data-testid="trigger-config-change"
          onClick={() => {
            if (capturedOnConfigChange) {
              capturedOnConfigChange(props.testChanges || {})
            }
          }}
        >
          触发配置变更
        </button>
      </div>
    )
  })
}))

describe('EnvManagePage - 未保存状态标记（属性测试）', () => {
  const mockEnvironment: EnvironmentConfig = {
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

  let mockSaveEnvConfig: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSaveEnvConfig = vi.fn().mockResolvedValue(undefined)
    capturedOnConfigChange = null
    
    vi.mocked(useEnvStore).mockReturnValue({
      environments: [mockEnvironment],
      currentEnvId: 'test-env-1',
      loading: false,
      error: null,
      fetchEnvironments: vi.fn(),
      switchEnvironment: vi.fn(),
      saveEnvConfig: mockSaveEnvConfig,
      getDependencies: vi.fn(),
      getEnvConfig: vi.fn()
    } as any)
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * 属性测试：对于任意 advancedEnvVars 变更，系统应该标记为未保存
   * 
   * 这个测试验证了属性 6：未保存状态标记
   * 使用 fast-check 生成随机的环境变量字符串，验证任何变更都会触发未保存状态
   */
  it('属性：对于任意 advancedEnvVars 变更，应该标记为未保存', async () => {
    // 渲染组件一次
    render(
      <BrowserRouter>
        <EnvManagePage />
      </BrowserRouter>
    )

    // 等待组件加载完成
    await waitFor(() => {
      expect(screen.getByTestId('tab-container')).toBeInTheDocument()
    })

    // 使用 fast-check 生成随机字符串并测试
    await fc.assert(
      fc.asyncProperty(
        // 生成随机的环境变量字符串
        fc.string({ minLength: 0, maxLength: 500 }),
        async (advancedEnvVars) => {
          // 重置 mock
          mockSaveEnvConfig.mockClear()

          // 触发 advancedEnvVars 配置变更
          if (capturedOnConfigChange) {
            capturedOnConfigChange({ advancedEnvVars })
          }

          // 等待状态更新
          await waitFor(() => {
            const saveButton = screen.getByRole('button', { name: /保存配置|env\.saveButton/i })
            // 配置变更后，保存按钮应该被启用
            expect(saveButton.hasAttribute('disabled')).toBe(false)
          }, { timeout: 1000 })

          // 验证 saveEnvConfig 没有被自动调用（只有极客模式切换才会自动保存）
          expect(mockSaveEnvConfig).not.toHaveBeenCalled()
        }
      ),
      { 
        numRuns: 100, // 运行 100 次迭代
        verbose: false
      }
    )
  })

  /**
   * 属性测试：对于任意配置字段变更，系统应该标记为未保存
   * 
   * 这个测试验证了属性 6 的通用性：不仅是 advancedEnvVars，任何配置变更都应该标记为未保存
   */
  it('属性：对于任意配置字段变更，应该标记为未保存', async () => {
    // 渲染组件一次
    render(
      <BrowserRouter>
        <EnvManagePage />
      </BrowserRouter>
    )

    // 等待组件加载完成
    await waitFor(() => {
      expect(screen.getByTestId('tab-container')).toBeInTheDocument()
    })

    // 使用 fast-check 生成随机配置并测试
    await fc.assert(
      fc.asyncProperty(
        // 生成随机的配置变更
        fc.record({
          alias: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          advancedEnvVars: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
          modelPathConfigs: fc.option(fc.array(fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            path: fc.string({ minLength: 1, maxLength: 100 })
          }), { maxLength: 5 }), { nil: undefined })
        }),
        async (changes) => {
          // 过滤掉空的变更对象
          const hasChanges = Object.keys(changes).some(key => changes[key as keyof typeof changes] !== undefined)
          if (!hasChanges) {
            return true // 跳过空变更
          }

          // 重置 mock
          mockSaveEnvConfig.mockClear()

          // 触发配置变更
          if (capturedOnConfigChange) {
            capturedOnConfigChange(changes)
          }

          // 等待状态更新
          await waitFor(() => {
            const saveButton = screen.getByRole('button', { name: /保存配置|env\.saveButton/i })
            // 保存按钮应该被启用
            expect(saveButton.hasAttribute('disabled')).toBe(false)
          }, { timeout: 1000 })

          // 验证 saveEnvConfig 没有被自动调用
          expect(mockSaveEnvConfig).not.toHaveBeenCalled()
        }
      ),
      { 
        numRuns: 100, // 运行 100 次迭代
        verbose: false
      }
    )
  })

  /**
   * 单元测试：极客模式切换应该立即保存而不是标记为未保存
   * 
   * 这个测试验证了极客模式切换的特殊行为：它应该立即保存而不是标记为未保存
   * 注意：由于属性测试中状态会累积，这里改为单元测试
   */
  it('单元测试：极客模式从禁用切换到启用应该立即保存', async () => {
    // 渲染组件
    render(
      <BrowserRouter>
        <EnvManagePage />
      </BrowserRouter>
    )

    // 等待组件加载完成
    await waitFor(() => {
      expect(screen.getByTestId('tab-container')).toBeInTheDocument()
    })

    // 重置 mock
    mockSaveEnvConfig.mockClear()

    // 触发极客模式启用
    if (capturedOnConfigChange) {
      capturedOnConfigChange({
        acceleration: {
          ...mockEnvironment.acceleration,
          geekMode: {
            enabled: true,
            customArgs: '',
            currentPresetId: 'custom'
          }
        }
      })
    }

    // 等待保存操作完成
    await waitFor(() => {
      // 极客模式切换应该触发自动保存
      expect(mockSaveEnvConfig).toHaveBeenCalled()
    }, { timeout: 2000 })

    // 验证保存按钮仍然是禁用的（因为已经自动保存了）
    const saveButton = screen.getByRole('button', { name: /保存配置|env\.saveButton/i })
    expect(saveButton.hasAttribute('disabled')).toBe(true)
  })
})
