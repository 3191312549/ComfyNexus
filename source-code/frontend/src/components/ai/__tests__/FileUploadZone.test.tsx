/**
 * FileUploadZone 组件单元测试
 * 
 * 测试内容：
 * - 组件渲染
 * - 拖拽事件处理
 * - 粘贴事件处理
 * - 文件选择按钮
 * - 文件验证集成
 * - 拖拽高亮效果
 * 
 * 验证需求: 1.1, 1.2, 2.1, 2.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FileUploadZone from '../FileUploadZone'
import { useFileStore } from '@/stores/useFileStore'

// Mock useFileStore
vi.mock('@/stores/useFileStore')

describe('FileUploadZone', () => {
  const mockOnFilesSelected = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useFileStore 返回值
    vi.mocked(useFileStore).mockReturnValue({
      files: [],
      uploading: false,
      progress: {},
      errors: {},
      totalSize: 0,
      addFile: vi.fn(),
      removeFile: vi.fn(),
      clearFiles: vi.fn(),
      setUploading: vi.fn(),
      setProgress: vi.fn(),
      setError: vi.fn(),
      clearError: vi.fn(),
      clearAllErrors: vi.fn(),
      getFileCount: vi.fn(() => 0),
      getTotalSize: vi.fn(() => 0),
      hasErrors: vi.fn(() => false),
    })
  })

  describe('渲染测试', () => {
    it('应该正确渲染上传区域', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      // 检查主要元素
      expect(screen.getByRole('button', { name: '文件上传区域' })).toBeInTheDocument()
      expect(screen.getByText('拖拽文件到这里')).toBeInTheDocument()
      expect(screen.getByText('选择文件')).toBeInTheDocument()
    })

    it('应该显示文件类型提示', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      expect(screen.getByText('图片')).toBeInTheDocument()
      expect(screen.getByText('文档')).toBeInTheDocument()
    })

    it('应该显示文件限制提示', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      expect(screen.getByText(/单个文件最大 20MB/)).toBeInTheDocument()
    })

    it('禁用状态下应该显示禁用样式', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} disabled />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      expect(uploadZone).toHaveClass('opacity-50', 'cursor-not-allowed')
    })
  })

  describe('拖拽事件测试', () => {
    it('拖拽进入时应该显示高亮效果', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      
      // 触发拖拽进入
      fireEvent.dragEnter(uploadZone)
      
      // 检查高亮样式
      expect(uploadZone).toHaveClass('border-purple-500')
      expect(screen.getByText('释放文件以上传')).toBeInTheDocument()
    })

    it('拖拽悬停时应该设置正确的拖拽效果', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      
      // 创建拖拽事件
      const dragOverEvent = new Event('dragover', { bubbles: true }) as any
      dragOverEvent.dataTransfer = {
        dropEffect: 'none',
      }
      
      // 触发拖拽悬停
      fireEvent(uploadZone, dragOverEvent)
      
      // 检查拖拽效果
      expect(dragOverEvent.dataTransfer.dropEffect).toBe('copy')
    })

    it('拖拽离开时应该取消高亮效果', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      
      // 先触发拖拽进入
      fireEvent.dragEnter(uploadZone)
      expect(uploadZone).toHaveClass('border-purple-500')
      
      // 创建拖拽离开事件（模拟真正离开容器）
      const rect = uploadZone.getBoundingClientRect()
      const dragLeaveEvent = new MouseEvent('dragleave', {
        bubbles: true,
        clientX: rect.left - 10, // 在容器外部
        clientY: rect.top - 10,
      }) as any
      
      // 触发拖拽离开
      fireEvent(uploadZone, dragLeaveEvent)
      
      // 检查高亮取消
      expect(uploadZone).not.toHaveClass('border-purple-500')
    })

    it('释放文件时应该处理文件', async () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      
      // 创建测试文件
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      
      // 创建拖拽释放事件
      const dropEvent = new Event('drop', { bubbles: true }) as any
      dropEvent.dataTransfer = {
        files: [file],
      }
      
      // 触发释放
      fireEvent(uploadZone, dropEvent)
      
      // 验证回调被调用
      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
      })
    })

    it('禁用状态下不应该响应拖拽事件', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} disabled />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      
      // 触发拖拽进入
      fireEvent.dragEnter(uploadZone)
      
      // 不应该显示高亮
      expect(uploadZone).not.toHaveClass('border-purple-500')
    })
  })

  describe('粘贴事件测试', () => {
    it('粘贴图片时应该处理文件', async () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      
      // 创建测试文件
      const file = new File(['test'], 'paste.png', { type: 'image/png' })
      
      // 创建粘贴事件
      const pasteEvent = new Event('paste', { bubbles: true }) as any
      pasteEvent.clipboardData = {
        items: [
          {
            kind: 'file',
            getAsFile: () => file,
          },
        ],
        length: 1,
      }
      
      // 触发粘贴
      fireEvent(uploadZone, pasteEvent)
      
      // 验证回调被调用（使用文件数组）
      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalled()
        const callArgs = mockOnFilesSelected.mock.calls[0][0]
        // 验证传入的是类似 FileList 的对象或数组
        expect(callArgs).toBeDefined()
        expect(callArgs.length).toBeGreaterThan(0)
      })
    })

    it('粘贴文本时不应该处理', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      
      // 创建粘贴事件（只有文本）
      const pasteEvent = new Event('paste', { bubbles: true }) as any
      pasteEvent.clipboardData = {
        items: [
          {
            kind: 'string',
            getAsFile: () => null,
          },
        ],
        length: 1,
      }
      
      // 触发粘贴
      fireEvent(uploadZone, pasteEvent)
      
      // 不应该调用回调
      expect(mockOnFilesSelected).not.toHaveBeenCalled()
    })

    it('禁用状态下不应该响应粘贴事件', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} disabled />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      
      // 创建粘贴事件
      const file = new File(['test'], 'paste.png', { type: 'image/png' })
      const pasteEvent = new Event('paste', { bubbles: true }) as any
      pasteEvent.clipboardData = {
        items: [
          {
            kind: 'file',
            getAsFile: () => file,
          },
        ],
        length: 1,
      }
      
      // 触发粘贴
      fireEvent(uploadZone, pasteEvent)
      
      // 不应该调用回调
      expect(mockOnFilesSelected).not.toHaveBeenCalled()
    })
  })

  describe('文件选择按钮测试', () => {
    it('点击按钮应该打开文件选择对话框', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      const selectButton = screen.getByRole('button', { name: /选择文件/ })
      
      // Mock input.click
      const mockClick = vi.fn()
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      if (input) {
        input.click = mockClick
      }
      
      // 点击按钮
      fireEvent.click(selectButton)
      
      // 验证 input.click 被调用
      expect(mockClick).toHaveBeenCalled()
    })

    it('选择文件后应该处理文件', async () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      
      // 创建测试文件
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      
      // 模拟文件选择（直接设置 files 属性）
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })
      
      // 触发 change 事件
      fireEvent.change(input)
      
      // 验证回调被调用
      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalled()
      })
    })

    it('禁用状态下按钮应该被禁用', () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} disabled />)
      
      const selectButton = screen.getByRole('button', { name: /选择文件/ })
      
      expect(selectButton).toBeDisabled()
    })
  })

  describe('文件验证测试', () => {
    it('文件过大时应该显示错误', async () => {
      // Mock alert
      const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})
      
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      
      // 创建超大文件（25MB）
      const largeFile = new File(
        [new ArrayBuffer(25 * 1024 * 1024)],
        'large.png',
        { type: 'image/png' }
      )
      
      // 创建拖拽释放事件
      const dropEvent = new Event('drop', { bubbles: true }) as any
      dropEvent.dataTransfer = {
        files: [largeFile],
      }
      
      // 触发释放
      fireEvent(uploadZone, dropEvent)
      
      // 验证显示错误
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalled()
      })
      
      // 不应该调用回调
      expect(mockOnFilesSelected).not.toHaveBeenCalled()
      
      mockAlert.mockRestore()
    })

    it('有效文件应该通过验证', async () => {
      render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)
      
      const uploadZone = screen.getByRole('button', { name: '文件上传区域' })
      
      // 创建有效文件
      const validFile = new File(['test'], 'test.png', { type: 'image/png' })
      
      // 创建拖拽释放事件
      const dropEvent = new Event('drop', { bubbles: true }) as any
      dropEvent.dataTransfer = {
        files: [validFile],
      }
      
      // 触发释放
      fireEvent(uploadZone, dropEvent)
      
      // 验证回调被调用
      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalledWith([validFile])
      })
    })
  })
})
