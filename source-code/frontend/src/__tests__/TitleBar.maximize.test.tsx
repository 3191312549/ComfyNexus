/**
 * 测试标题栏最大化功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TitleBar } from '@/components/layout/TitleBar'
import { bridgeService } from '@/services/bridge'

// Mock bridge service
vi.mock('@/services/bridge', () => ({
  bridgeService: {
    minimizeApp: vi.fn(),
    maximizeApp: vi.fn(),
    isMaximized: vi.fn(),
    toggleFullscreen: vi.fn(),
    isFullscreen: vi.fn(),
    closeApp: vi.fn(),
    stopComfyUI: vi.fn(),
  }
}))

// Mock other dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  })
}))

vi.mock('@/stores/useProcessStore', () => ({
  useProcessStore: () => ({
    status: { isRunning: false },
    isStarting: false,
    loadComfyUIStatus: vi.fn(),
    setStarting: vi.fn(),
    startComfyUI: vi.fn(),
  })
}))

vi.mock('@/stores/useEnvStore', () => ({
  useEnvStore: () => ({
    environments: [],
    currentEnvId: null,
    fetchEnvironments: vi.fn(),
    switchEnvironment: vi.fn(),
    deleteEnvironment: vi.fn(),
    createEnvironment: vi.fn(),
  })
}))

vi.mock('@/contexts/EnvSwitchGuardContext', () => ({
  useEnvSwitchGuard: () => ({
    checkBeforeSwitch: vi.fn(),
  })
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  })
}))

describe('TitleBar - 最大化功能', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该渲染最大化按钮', () => {
    render(<TitleBar />)
    
    const maximizeButton = screen.getByLabelText('最大化')
    expect(maximizeButton).toBeDefined()
  })

  it('点击最大化按钮应该调用 maximizeApp', async () => {
    const mockMaximizeApp = vi.fn().mockResolvedValue(undefined)
    vi.mocked(bridgeService.maximizeApp).mockImplementation(mockMaximizeApp)
    
    render(<TitleBar />)
    
    const maximizeButton = screen.getByLabelText('最大化')
    fireEvent.click(maximizeButton)
    
    await waitFor(() => {
      expect(mockMaximizeApp).toHaveBeenCalledTimes(1)
    })
  })

  it('最大化后按钮应该显示还原图标', async () => {
    const mockMaximizeApp = vi.fn().mockResolvedValue(undefined)
    vi.mocked(bridgeService.maximizeApp).mockImplementation(mockMaximizeApp)
    
    render(<TitleBar />)
    
    // 第一次点击 - 最大化
    const maximizeButton = screen.getByLabelText('最大化')
    fireEvent.click(maximizeButton)
    
    await waitFor(() => {
      const restoreButton = screen.getByLabelText('还原')
      expect(restoreButton).toBeDefined()
    })
  })

  it('最大化功能应该独立于全屏功能', async () => {
    const mockMaximizeApp = vi.fn().mockResolvedValue(undefined)
    const mockToggleFullscreen = vi.fn().mockResolvedValue(undefined)
    
    vi.mocked(bridgeService.maximizeApp).mockImplementation(mockMaximizeApp)
    vi.mocked(bridgeService.toggleFullscreen).mockImplementation(mockToggleFullscreen)
    
    render(<TitleBar />)
    
    // 点击最大化按钮
    const maximizeButton = screen.getByLabelText('最大化')
    fireEvent.click(maximizeButton)
    
    await waitFor(() => {
      expect(mockMaximizeApp).toHaveBeenCalledTimes(1)
      expect(mockToggleFullscreen).not.toHaveBeenCalled()
    })
  })
})
