/**
 * WorkspaceFrame Toast 功能测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { WorkspaceFrame } from '@/components/workspace/WorkspaceFrame'

// Mock useToast hook
const mockSuccess = vi.fn()
const mockError = vi.fn()
const mockCloseToast = vi.fn()

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toastState: {
      open: false,
      description: '',
      variant: 'default',
      duration: 3000
    },
    success: mockSuccess,
    error: mockError,
    closeToast: mockCloseToast
  })
}))

// Mock pywebview API
const mockSaveImageWithDialog = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  
  // 设置 window.pywebview
  ;(window as any).pywebview = {
    api: {
      save_image_with_dialog: mockSaveImageWithDialog
    }
  }
})

describe('WorkspaceFrame Toast 功能', () => {
  it('成功保存时应显示成功提示', async () => {
    mockSaveImageWithDialog.mockResolvedValue({
      success: true,
      saved_path: '/path/to/image.png',
      message: '保存成功'
    })

    render(<WorkspaceFrame url="/comfyui/" />)

    // 模拟 postMessage 事件
    const event = new MessageEvent('message', {
      data: {
        type: 'image_context_menu',
        image_url: 'http://localhost:8188/view?filename=test.png',
        image_alt: 'test image',
        page_x: 100,
        page_y: 100
      }
    })

    window.dispatchEvent(event)

    await waitFor(() => {
      expect(mockSaveImageWithDialog).toHaveBeenCalledWith(
        'http://localhost:8188/view?filename=test.png',
        'test_image.png'
      )
    })

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith('image.png 已保存', '保存成功')
    })
  })

  it('用户取消时不应显示错误提示', async () => {
    mockSaveImageWithDialog.mockResolvedValue({
      success: false,
      error_code: 'USER_CANCELLED',
      message: '用户取消'
    })

    render(<WorkspaceFrame url="/comfyui/" />)

    const event = new MessageEvent('message', {
      data: {
        type: 'image_context_menu',
        image_url: 'http://localhost:8188/view?filename=test.png',
        image_alt: '',
        page_x: 100,
        page_y: 100
      }
    })

    window.dispatchEvent(event)

    await waitFor(() => {
      expect(mockSaveImageWithDialog).toHaveBeenCalled()
    })

    // 等待一段时间确保没有调用 error
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(mockError).not.toHaveBeenCalled()
  })

  it('下载失败时应显示友好的错误提示', async () => {
    mockSaveImageWithDialog.mockResolvedValue({
      success: false,
      error_code: 'DOWNLOAD_FAILED',
      message: '下载失败'
    })

    render(<WorkspaceFrame url="/comfyui/" />)

    const event = new MessageEvent('message', {
      data: {
        type: 'image_context_menu',
        image_url: 'http://localhost:8188/view?filename=test.png',
        image_alt: '',
        page_x: 100,
        page_y: 100
      }
    })

    window.dispatchEvent(event)

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        '图片下载失败，请检查网络连接',
        '保存失败'
      )
    })
  })

  it('权限不足时应显示友好的错误提示', async () => {
    mockSaveImageWithDialog.mockResolvedValue({
      success: false,
      error_code: 'PERMISSION_DENIED',
      message: '权限不足'
    })

    render(<WorkspaceFrame url="/comfyui/" />)

    const event = new MessageEvent('message', {
      data: {
        type: 'image_context_menu',
        image_url: 'http://localhost:8188/view?filename=test.png',
        image_alt: '',
        page_x: 100,
        page_y: 100
      }
    })

    window.dispatchEvent(event)

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        '没有写入权限，请选择其他位置',
        '保存失败'
      )
    })
  })

  it('磁盘空间不足时应显示友好的错误提示', async () => {
    mockSaveImageWithDialog.mockResolvedValue({
      success: false,
      error_code: 'DISK_FULL',
      message: '磁盘空间不足'
    })

    render(<WorkspaceFrame url="/comfyui/" />)

    const event = new MessageEvent('message', {
      data: {
        type: 'image_context_menu',
        image_url: 'http://localhost:8188/view?filename=test.png',
        image_alt: '',
        page_x: 100,
        page_y: 100
      }
    })

    window.dispatchEvent(event)

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        '磁盘空间不足，请清理磁盘后重试',
        '保存失败'
      )
    })
  })

  it('API 调用失败时应显示系统错误提示', async () => {
    mockSaveImageWithDialog.mockRejectedValue(new Error('API 调用失败'))

    render(<WorkspaceFrame url="/comfyui/" />)

    const event = new MessageEvent('message', {
      data: {
        type: 'image_context_menu',
        image_url: 'http://localhost:8188/view?filename=test.png',
        image_alt: '',
        page_x: 100,
        page_y: 100
      }
    })

    window.dispatchEvent(event)

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        '调用后端 API 失败，请重试',
        '系统错误'
      )
    })
  })

  it('无效 URL 时应显示友好的错误提示', async () => {
    mockSaveImageWithDialog.mockResolvedValue({
      success: false,
      error_code: 'INVALID_URL',
      message: 'URL 无效'
    })

    render(<WorkspaceFrame url="/comfyui/" />)

    const event = new MessageEvent('message', {
      data: {
        type: 'image_context_menu',
        image_url: 'invalid-url',
        image_alt: '',
        page_x: 100,
        page_y: 100
      }
    })

    window.dispatchEvent(event)

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        '图片地址无效，无法下载',
        '保存失败'
      )
    })
  })
})
