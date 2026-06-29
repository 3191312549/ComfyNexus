/**
 * RemoteAddressBar 组件单元测试
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import RemoteAddressBar from './RemoteAddressBar'
import { useVersionStore } from '@/stores/useVersionStore'

// Mock useVersionStore
vi.mock('@/stores/useVersionStore')

describe('RemoteAddressBar', () => {
  const mockUpdateRemoteUrl = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // 默认 mock 数据
    vi.mocked(useVersionStore).mockReturnValue({
      remoteInfo: {
        branch: 'master',
        url: 'https://github.com/comfyanonymous/ComfyUI.git',
        history: [
          'https://github.com/comfyanonymous/ComfyUI.git',
          'https://github.com/user/fork.git',
        ],
      },
      updateRemoteUrl: mockUpdateRemoteUrl,
      loading: false,
      versions: { stable: [], dev: [] },
      currentVersion: null,
      error: null,
      pagination: {
        stable: { page: 1, hasMore: true, loading: false },
        dev: { page: 1, hasMore: true, loading: false },
      },
      cache: { timestamp: 0, duration: 300000 },
      fetchVersions: vi.fn(),
      fetchCurrentVersion: vi.fn(),
      fetchRemoteInfo: vi.fn(),
      switchVersion: vi.fn(),
      refreshVersions: vi.fn(),
      loadMore: vi.fn(),
      reset: vi.fn(),
    })
  })

  const renderComponent = () => {
    return render(
      <I18nextProvider i18n={i18n}>
        <RemoteAddressBar />
      </I18nextProvider>
    )
  }

  // 渲染测试
  test('应该正确渲染显示模式', () => {
    renderComponent()
    
    expect(screen.getByText('Remote')).toBeInTheDocument()
    expect(screen.getByText('Branch:')).toBeInTheDocument()
    expect(screen.getByText('master')).toBeInTheDocument()
    expect(screen.getByText('URL:')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/comfyanonymous/ComfyUI.git')).toBeInTheDocument()
  })

  test('当没有远端信息时不应该渲染', () => {
    vi.mocked(useVersionStore).mockReturnValue({
      remoteInfo: null,
      updateRemoteUrl: mockUpdateRemoteUrl,
      loading: false,
      versions: { stable: [], dev: [] },
      currentVersion: null,
      error: null,
      pagination: {
        stable: { page: 1, hasMore: true, loading: false },
        dev: { page: 1, hasMore: true, loading: false },
      },
      cache: { timestamp: 0, duration: 300000 },
      fetchVersions: vi.fn(),
      fetchCurrentVersion: vi.fn(),
      fetchRemoteInfo: vi.fn(),
      switchVersion: vi.fn(),
      refreshVersions: vi.fn(),
      loadMore: vi.fn(),
      reset: vi.fn(),
    })
    
    const { container } = renderComponent()
    expect(container.firstChild).toBeNull()
  })

  // 交互测试
  test('点击编辑按钮应该进入编辑模式', () => {
    renderComponent()
    
    const editButton = screen.getByLabelText('Edit')
    fireEvent.click(editButton)
    
    expect(screen.getByPlaceholderText('Enter remote repository URL')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  test('点击取消按钮应该退出编辑模式', () => {
    renderComponent()
    
    // 进入编辑模式
    const editButton = screen.getByLabelText('Edit')
    fireEvent.click(editButton)
    
    // 点击取消
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    // 应该回到显示模式
    expect(screen.getByText('Branch:')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Enter remote repository URL')).not.toBeInTheDocument()
  })

  test('点击保存按钮应该调用 updateRemoteUrl', async () => {
    mockUpdateRemoteUrl.mockResolvedValue(undefined)
    renderComponent()
    
    // 进入编辑模式
    const editButton = screen.getByLabelText('Edit')
    fireEvent.click(editButton)
    
    // 修改 URL
    const input = screen.getByPlaceholderText('Enter remote repository URL')
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo.git' } })
    
    // 点击保存
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockUpdateRemoteUrl).toHaveBeenCalledWith('https://github.com/test/repo.git')
    })
  })

  // 验证测试
  test('空 URL 应该显示错误', () => {
    renderComponent()
    
    // 进入编辑模式
    const editButton = screen.getByLabelText('Edit')
    fireEvent.click(editButton)
    
    // 清空输入框
    const input = screen.getByPlaceholderText('Enter remote repository URL')
    fireEvent.change(input, { target: { value: '' } })
    
    // 点击保存
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    // 应该显示错误
    expect(screen.getByText('Enter remote repository URL')).toBeInTheDocument()
  })

  test('无效 URL 应该显示错误', () => {
    renderComponent()
    
    // 进入编辑模式
    const editButton = screen.getByLabelText('Edit')
    fireEvent.click(editButton)
    
    // 输入无效 URL
    const input = screen.getByPlaceholderText('Enter remote repository URL')
    fireEvent.change(input, { target: { value: 'invalid-url' } })
    
    // 点击保存
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    // 应该显示错误
    expect(screen.getByText('Invalid remote URL format')).toBeInTheDocument()
  })

  test('有效 URL 应该通过验证', async () => {
    mockUpdateRemoteUrl.mockResolvedValue(undefined)
    
    const validUrls = [
      'https://github.com/user/repo.git',
      'https://github.com/user/repo',
      'https://gitlab.com/user/repo',
      'git@github.com:user/repo.git',
    ]
    
    for (const url of validUrls) {
      const { unmount } = renderComponent()
      
      // 进入编辑模式
      const editButton = screen.getByLabelText('Edit')
      fireEvent.click(editButton)
      
      // 输入有效 URL
      const input = screen.getByPlaceholderText('Enter remote repository URL')
      fireEvent.change(input, { target: { value: url } })
      
      // 点击保存
      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockUpdateRemoteUrl).toHaveBeenCalledWith(url)
      })
      
      // 清理
      unmount()
    }
  })

  // 历史记录测试
  test('应该显示历史记录下拉列表', () => {
    renderComponent()
    
    // 进入编辑模式
    const editButton = screen.getByLabelText('Edit')
    fireEvent.click(editButton)
    
    // 应该显示历史记录选择器（检查 select 元素存在）
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  test('选择历史记录应该填充输入框', () => {
    renderComponent()
    
    // 进入编辑模式
    const editButton = screen.getByLabelText('Edit')
    fireEvent.click(editButton)
    
    // 选择历史记录
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'https://github.com/user/fork.git' } })
    
    // 输入框应该被填充
    const input = screen.getByPlaceholderText('Enter remote repository URL') as HTMLInputElement
    expect(input.value).toBe('https://github.com/user/fork.git')
  })

  // 键盘事件测试
  test('按 Enter 键应该保存', async () => {
    mockUpdateRemoteUrl.mockResolvedValue(undefined)
    renderComponent()
    
    // 进入编辑模式
    const editButton = screen.getByLabelText('Edit')
    fireEvent.click(editButton)
    
    // 修改 URL
    const input = screen.getByPlaceholderText('Enter remote repository URL')
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo.git' } })
    
    // 按 Enter
    fireEvent.keyDown(input, { key: 'Enter' })
    
    await waitFor(() => {
      expect(mockUpdateRemoteUrl).toHaveBeenCalledWith('https://github.com/test/repo.git')
    })
  })

  test('按 Escape 键应该取消', () => {
    renderComponent()
    
    // 进入编辑模式
    const editButton = screen.getByLabelText('Edit')
    fireEvent.click(editButton)
    
    // 修改 URL
    const input = screen.getByPlaceholderText('Enter remote repository URL')
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo.git' } })
    
    // 按 Escape
    fireEvent.keyDown(input, { key: 'Escape' })
    
    // 应该回到显示模式
    expect(screen.getByText('Branch:')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Enter remote repository URL')).not.toBeInTheDocument()
  })

  // 加载状态测试
  test('保存时应该显示加载状态', async () => {
    mockUpdateRemoteUrl.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    renderComponent()
    
    // 进入编辑模式
    const editButton = screen.getByLabelText('Edit')
    fireEvent.click(editButton)
    
    // 修改 URL
    const input = screen.getByPlaceholderText('Enter remote repository URL')
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo.git' } })
    
    // 点击保存
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    // 应该显示保存中状态
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(mockUpdateRemoteUrl).toHaveBeenCalled()
    })
  })
})
