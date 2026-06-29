/**
 * TabContainer - AdvancedEnv 选项卡测试
 * 
 * 测试需求：验证高级环境变量选项卡的渲染和交互
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TabContainer } from '../TabContainer'
import type { EnvironmentConfig } from '@/types/environment'

describe('TabContainer - AdvancedEnv Tab', () => {
  const mockConfig: EnvironmentConfig = {
    id: 'test-env',
    name: 'Test Environment',
    alias: 'Test',
    version: '1.0.0',
    isActive: true,
    general: {
      comfyuiPath: '/path/to/comfyui',
      pythonPath: '/path/to/python',
      pipPath: '/path/to/pip',
      gitPath: '/path/to/git',
    },
    dependencies: {
      pythonVersion: '3.12.0',
      pytorchVersion: '2.0.0',
      cudaVersion: '12.1',
      sageAttentionVersion: '1.0.0',
      flashAttnVersion: '2.0.0',
      tritonVersion: '2.0.0',
      xformersVersion: '0.0.20',
    },
    acceleration: {
      computeDevice: 'nvidia:0',
      vramStrategy: 'normal',
      cpuOnly: false,
      gpuOnly: false,
      reserveVram: 0,
      unetPrecision: 'auto',
      vaePrecision: 'fp32',
      textEncPrecision: 'fp16',
      attentionMode: 'flash',
      disableXformers: false,
      disableSmartMemory: false,
      forceChannelsLast: false,
      cacheLru: 0,
      deterministic: false,
      fastMode: false,
      listenNetwork: false,
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
      previewMethod: 'auto',
      previewSize: 512,
      safeMode: false,
      enableManager: true,
      logLevel: 'INFO',
      disableMetadata: false,
    },
    modelPathConfigs: [],
    advancedEnvVars: 'PYTHONIOENCODING=utf-8\nCUDA_VISIBLE_DEVICES=0',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  it('应该渲染 AdvancedEnvTab 组件当 activeTab 为 advancedEnv', () => {
    const mockOnConfigChange = vi.fn()

    render(
      <TabContainer
        activeTab="advancedEnv"
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    // 验证组件渲染
    expect(screen.getByText('配置格式说明：')).toBeInTheDocument()
    expect(screen.getByText('环境变量配置')).toBeInTheDocument()
  })

  it('应该显示配置的环境变量值', () => {
    const mockOnConfigChange = vi.fn()

    const { container } = render(
      <TabContainer
        activeTab="advancedEnv"
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    // 查找 textarea 元素
    const textarea = container.querySelector('textarea')
    expect(textarea).toBeInTheDocument()
    expect(textarea?.value).toBe('PYTHONIOENCODING=utf-8\nCUDA_VISIBLE_DEVICES=0')
  })

  it('应该在环境变量为空时显示空字符串', () => {
    const mockOnConfigChange = vi.fn()
    const emptyConfig = {
      ...mockConfig,
      advancedEnvVars: '',
    }

    const { container } = render(
      <TabContainer
        activeTab="advancedEnv"
        config={emptyConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    const textarea = container.querySelector('textarea')
    expect(textarea?.value).toBe('')
  })

  it('应该在环境变量未定义时显示空字符串', () => {
    const mockOnConfigChange = vi.fn()
    const undefinedConfig = {
      ...mockConfig,
      advancedEnvVars: undefined,
    }

    const { container } = render(
      <TabContainer
        activeTab="advancedEnv"
        config={undefinedConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    const textarea = container.querySelector('textarea')
    expect(textarea?.value).toBe('')
  })
})
