/**
 * 单元测试 - GeekModePresets Toast 提示功能
 * 
 * 测试范围：
 * - Custom 预设显示 "用户配置"
 * - 自定义预设显示实际名称
 * - 预设名称缺失时的回退逻辑
 * - onShowToast 未提供时不报错
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GeekModePresets } from './GeekModePresets'
import { CUSTOM_PRESET_ID } from '@/utils/geekModeUtils'
import type { GeekPreset } from '@/types/environment'

// Mock bridgeService
vi.mock('@/services/bridge', () => ({
  bridgeService: {
    getGeekPresets: vi.fn().mockResolvedValue([]),
    createGeekPreset: vi.fn().mockResolvedValue(undefined),
    updateGeekPreset: vi.fn().mockResolvedValue(undefined),
    deleteGeekPreset: vi.fn().mockResolvedValue(undefined),
  }
}))

describe('GeekModePresets - Toast 提示功能', () => {
  const mockOnLoadPreset = vi.fn()
  const mockOnShowToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该在切换 Custom 预设时显示 "用户配置"', async () => {
    const { bridgeService } = await import('@/services/bridge')
    
    // Mock 返回包含 custom 预设的列表
    const customPreset: GeekPreset = {
      id: CUSTOM_PRESET_ID,
      name: '用户配置',
      description: '当前编辑器中的启动参数',
      args: '--port 8188'
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

    // 点击 Custom 预设卡片
    const customCard = screen.getByText('用户配置').closest('.cursor-pointer')
    if (customCard) {
      fireEvent.click(customCard)
    }

    // 验证 Toast 被调用，显示 "用户配置"
    expect(mockOnShowToast).toHaveBeenCalledWith(
      '已切换到 "用户配置"',
      'success'
    )
  })

  it('应该在切换自定义预设时显示实际名称', async () => {
    const { bridgeService } = await import('@/services/bridge')
    
    // Mock 返回自定义预设
    const customUserPreset: GeekPreset = {
      id: 'preset_123',
      name: '高性能配置',
      description: '适用于高端显卡',
      args: '--highvram --fp16-vae'
    }
    
    vi.mocked(bridgeService.getGeekPresets).mockResolvedValue([customUserPreset])

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
      expect(screen.getByText('高性能配置')).toBeInTheDocument()
    })

    // 点击自定义预设卡片
    const presetCard = screen.getByText('高性能配置').closest('.cursor-pointer')
    if (presetCard) {
      fireEvent.click(presetCard)
    }

    // 验证 Toast 被调用，显示实际名称
    expect(mockOnShowToast).toHaveBeenCalledWith(
      '已切换到 "高性能配置"',
      'success'
    )
  })

  it('应该在预设名称缺失时回退到使用 ID', async () => {
    const { bridgeService } = await import('@/services/bridge')
    
    // Mock 返回名称为空的预设
    const presetWithoutName: GeekPreset = {
      id: 'preset_456',
      name: '',  // 空名称
      description: '测试预设',
      args: '--test'
    }
    
    vi.mocked(bridgeService.getGeekPresets).mockResolvedValue([presetWithoutName])

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
      // 由于名称为空，卡片可能显示 ID 或空字符串
      const cards = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('cursor-pointer')
      )
      expect(cards.length).toBeGreaterThan(0)
    })

    // 获取所有预设卡片（排除 Custom）
    const allCards = screen.getAllByRole('generic').filter(el => 
      el.classList.contains('cursor-pointer')
    )
    
    // 点击第一个非 Custom 预设
    if (allCards.length > 1) {
      fireEvent.click(allCards[1])
      
      // 验证 Toast 被调用，使用 ID 作为回退
      expect(mockOnShowToast).toHaveBeenCalledWith(
        '已切换到 "preset_456"',
        'success'
      )
    }
  })

  it('应该在 onShowToast 未提供时不报错', async () => {
    const { bridgeService } = await import('@/services/bridge')
    
    const testPreset: GeekPreset = {
      id: 'preset_789',
      name: '测试预设',
      description: '测试描述',
      args: '--test'
    }
    
    vi.mocked(bridgeService.getGeekPresets).mockResolvedValue([testPreset])

    // 不传递 onShowToast prop
    render(
      <GeekModePresets
        currentArgs="--port 8188"
        currentPresetId={CUSTOM_PRESET_ID}
        onLoadPreset={mockOnLoadPreset}
      />
    )

    // 等待预设加载
    await waitFor(() => {
      expect(screen.getByText('测试预设')).toBeInTheDocument()
    })

    // 点击预设卡片，不应该报错
    const presetCard = screen.getByText('测试预设').closest('.cursor-pointer')
    expect(() => {
      if (presetCard) {
        fireEvent.click(presetCard)
      }
    }).not.toThrow()

    // 验证 onLoadPreset 仍然被调用
    expect(mockOnLoadPreset).toHaveBeenCalledWith('--test', 'preset_789')
  })

  it('应该在所有预设切换时使用 success 类型', async () => {
    const { bridgeService } = await import('@/services/bridge')
    
    const presets: GeekPreset[] = [
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
      },
      {
        id: 'preset_2',
        name: '预设2',
        description: '描述2',
        args: '--test2'
      }
    ]
    
    vi.mocked(bridgeService.getGeekPresets).mockResolvedValue(presets)

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
    for (const preset of presets) {
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
})
