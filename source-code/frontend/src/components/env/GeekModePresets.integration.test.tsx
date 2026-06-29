/**
 * 集成测试 - GeekModePresets Toast 提示功能
 * 
 * 测试范围：
 * - Toast 回调函数的正确传递
 * - 预设切换时 Toast 的调用
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GeekModePresets } from './GeekModePresets'
import type { GeekPreset } from '@/types/environment'
import { CUSTOM_PRESET_ID } from '@/utils/geekModeUtils'

// Mock bridgeService
vi.mock('@/services/bridge', () => ({
  bridgeService: {
    getGeekPresets: vi.fn().mockResolvedValue([]),
    createGeekPreset: vi.fn().mockResolvedValue(undefined),
    updateGeekPreset: vi.fn().mockResolvedValue(undefined),
    deleteGeekPreset: vi.fn().mockResolvedValue(undefined),
  }
}))

describe('GeekModePresets - 集成测试：Toast 提示功能', () => {
  const mockOnLoadPreset = vi.fn()
  const mockOnShowToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该完整测试 Toast 调用链：从用户点击到 Toast 显示', async () => {
    const { bridgeService } = await import('@/services/bridge')
    
    // Mock 返回测试预设
    const testPresets: GeekPreset[] = [
      {
        id: CUSTOM_PRESET_ID,
        name: '用户配置',
        description: '当前编辑器中的启动参数',
        args: '--port 8188'
      },
      {
        id: 'preset_high_perf',
        name: '高性能配置',
        description: '适用于高端显卡',
        args: '--highvram --fp16-vae'
      }
    ]
    
    vi.mocked(bridgeService.getGeekPresets).mockResolvedValue(testPresets)

    render(
      <GeekModePresets
        currentArgs="--port 8188"
        currentPresetId={CUSTOM_PRESET_ID}
        onLoadPreset={mockOnLoadPreset}
        onShowToast={mockOnShowToast}
      />
    )

    // 等待预设加载
    await waitFor(() => {
      expect(screen.getByText('用户配置')).toBeInTheDocument()
      expect(screen.getByText('高性能配置')).toBeInTheDocument()
    })

    // 点击高性能配置预设
    const highPerfCard = screen.getByText('高性能配置').closest('.cursor-pointer')
    if (highPerfCard) {
      fireEvent.click(highPerfCard)
    }

    // 验证 Toast 被调用，消息格式正确
    expect(mockOnShowToast).toHaveBeenCalledWith(
      '已切换到 "高性能配置"',
      'success'
    )

    // 验证 onLoadPreset 也被调用
    expect(mockOnLoadPreset).toHaveBeenCalledWith('--highvram --fp16-vae', 'preset_high_perf')
  })

  it('应该在用户点击 Custom 预设后显示正确的 Toast 消息', async () => {
    const { bridgeService } = await import('@/services/bridge')
    
    const customPreset: GeekPreset = {
      id: CUSTOM_PRESET_ID,
      name: '用户配置',
      description: '当前编辑器中的启动参数',
      args: '--port 8188 --listen 0.0.0.0'
    }
    
    vi.mocked(bridgeService.getGeekPresets).mockResolvedValue([customPreset])

    render(
      <GeekModePresets
        currentArgs="--port 8188"
        currentPresetId={CUSTOM_PRESET_ID}
        onLoadPreset={mockOnLoadPreset}
        onShowToast={mockOnShowToast}
      />
    )

    // 等待预设加载
    await waitFor(() => {
      expect(screen.getByText('用户配置')).toBeInTheDocument()
    })

    // 点击 Custom 预设
    const customCard = screen.getByText('用户配置').closest('.cursor-pointer')
    if (customCard) {
      fireEvent.click(customCard)
    }

    // 验证 Toast 显示 "用户配置"
    expect(mockOnShowToast).toHaveBeenCalledWith(
      '已切换到 "用户配置"',
      'success'
    )
  })

  it('应该验证消息格式始终符合 "已切换到 \'{预设名称}\'" 格式', async () => {
    const { bridgeService } = await import('@/services/bridge')
    
    const testPresets: GeekPreset[] = [
      {
        id: 'preset_1',
        name: '预设A',
        description: '描述A',
        args: '--test-a'
      },
      {
        id: 'preset_2',
        name: '预设B',
        description: '描述B',
        args: '--test-b'
      },
      {
        id: 'preset_3',
        name: '预设C',
        description: '描述C',
        args: '--test-c'
      }
    ]
    
    vi.mocked(bridgeService.getGeekPresets).mockResolvedValue(testPresets)

    render(
      <GeekModePresets
        currentArgs="--port 8188"
        currentPresetId={CUSTOM_PRESET_ID}
        onLoadPreset={mockOnLoadPreset}
        onShowToast={mockOnShowToast}
      />
    )

    // 等待预设加载
    await waitFor(() => {
      expect(screen.getByText('预设A')).toBeInTheDocument()
    })

    // 测试每个预设的消息格式
    for (const preset of testPresets) {
      const card = screen.getByText(preset.name).closest('.cursor-pointer')
      if (card) {
        fireEvent.click(card)
        
        // 验证消息格式
        expect(mockOnShowToast).toHaveBeenLastCalledWith(
          `已切换到 "${preset.name}"`,
          'success'
        )
      }
    }
  })

  it('应该验证所有预设切换都使用 success 类型', async () => {
    const { bridgeService } = await import('@/services/bridge')
    
    const testPresets: GeekPreset[] = [
      {
        id: CUSTOM_PRESET_ID,
        name: '用户配置',
        description: '当前配置',
        args: '--port 8188'
      },
      {
        id: 'preset_1',
        name: '预设1',
        description: '描述1',
        args: '--test1'
      }
    ]
    
    vi.mocked(bridgeService.getGeekPresets).mockResolvedValue(testPresets)

    render(
      <GeekModePresets
        currentArgs="--port 8188"
        currentPresetId={CUSTOM_PRESET_ID}
        onLoadPreset={mockOnLoadPreset}
        onShowToast={mockOnShowToast}
      />
    )

    // 等待预设加载
    await waitFor(() => {
      expect(screen.getByText('用户配置')).toBeInTheDocument()
    })

    // 点击每个预设，验证都使用 success 类型
    for (const preset of testPresets) {
      const card = screen.getByText(preset.name).closest('.cursor-pointer')
      if (card) {
        fireEvent.click(card)
        
        // 验证最后一次调用使用 success 类型
        expect(mockOnShowToast).toHaveBeenLastCalledWith(
          expect.stringContaining('已切换到'),
          'success'
        )
      }
    }
  })

  it('应该在多次切换预设时每次都调用 Toast', async () => {
    const { bridgeService } = await import('@/services/bridge')
    
    const testPresets: GeekPreset[] = [
      {
        id: 'preset_1',
        name: '预设1',
        description: '描述1',
        args: '--test1'
      },
      {
        id: 'preset_2',
        name: '预设2',
        description: '描述2',
        args: '--test2'
      }
    ]
    
    vi.mocked(bridgeService.getGeekPresets).mockResolvedValue(testPresets)

    render(
      <GeekModePresets
        currentArgs="--port 8188"
        currentPresetId={CUSTOM_PRESET_ID}
        onLoadPreset={mockOnLoadPreset}
        onShowToast={mockOnShowToast}
      />
    )

    // 等待预设加载
    await waitFor(() => {
      expect(screen.getByText('预设1')).toBeInTheDocument()
    })

    // 点击预设1
    const preset1Card = screen.getByText('预设1').closest('.cursor-pointer')
    if (preset1Card) {
      fireEvent.click(preset1Card)
    }

    expect(mockOnShowToast).toHaveBeenCalledTimes(1)

    // 点击预设2
    const preset2Card = screen.getByText('预设2').closest('.cursor-pointer')
    if (preset2Card) {
      fireEvent.click(preset2Card)
    }

    expect(mockOnShowToast).toHaveBeenCalledTimes(2)

    // 再次点击预设1
    if (preset1Card) {
      fireEvent.click(preset1Card)
    }

    expect(mockOnShowToast).toHaveBeenCalledTimes(3)
  })
})
