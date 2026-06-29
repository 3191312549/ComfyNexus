/**
 * FolderSettingsModal 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FolderSettingsModal } from './FolderSettingsModal'
import type { FolderShortcut } from '@/types/home'

// Mock 数据
const mockShortcuts: FolderShortcut[] = [
  {
    id: 'input',
    name: '输入',
    path: '/path/to/input',
    icon: 'FolderInput',
    order: 0,
    isDefault: true
  },
  {
    id: 'output',
    name: '输出',
    path: '/path/to/output',
    icon: 'FolderOutput',
    order: 1,
    isDefault: true
  },
  {
    id: 'custom1',
    name: '自定义文件夹',
    path: '/path/to/custom',
    icon: 'Folder',
    order: 2,
    isDefault: false
  }
]

describe('FolderSettingsModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染', () => {
    it('应该在 open=true 时显示弹窗', () => {
      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('文件夹快捷方式设置')).toBeInTheDocument()
      expect(screen.getByText('管理您的文件夹快捷方式，最多可添加6个')).toBeInTheDocument()
    })

    it('应该在 open=false 时不显示弹窗', () => {
      render(
        <FolderSettingsModal
          open={false}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      expect(screen.queryByText('文件夹快捷方式设置')).not.toBeInTheDocument()
    })

    it('应该显示所有快捷方式', () => {
      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('输入')).toBeInTheDocument()
      expect(screen.getByText('输出')).toBeInTheDocument()
      expect(screen.getByText('自定义文件夹')).toBeInTheDocument()
    })

    it('应该为默认文件夹显示"默认"标签', () => {
      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      const defaultBadges = screen.getAllByText('默认')
      expect(defaultBadges).toHaveLength(2) // 输入和输出是默认文件夹
    })
  })

  describe('添加文件夹', () => {
    it('应该显示添加按钮', () => {
      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('添加文件夹')).toBeInTheDocument()
    })

    it('点击添加按钮应该显示添加表单', async () => {
      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      const addButton = screen.getByText('添加文件夹')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('例如：工作流')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('选择或输入文件夹路径')).toBeInTheDocument()
      })
    })

    it('应该在达到6个快捷方式时隐藏添加按钮', () => {
      const sixShortcuts: FolderShortcut[] = [
        ...mockShortcuts,
        { id: '4', name: '文件夹4', path: '/path/4', icon: 'Folder', order: 3, isDefault: false },
        { id: '5', name: '文件夹5', path: '/path/5', icon: 'Folder', order: 4, isDefault: false },
        { id: '6', name: '文件夹6', path: '/path/6', icon: 'Folder', order: 5, isDefault: false }
      ]

      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={sixShortcuts}
          onSave={mockOnSave}
        />
      )

      expect(screen.queryByText('添加文件夹')).not.toBeInTheDocument()
    })
  })

  describe('删除文件夹', () => {
    it('应该为非默认文件夹显示删除按钮', () => {
      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      // 应该只有1个删除按钮（自定义文件夹）
      const deleteButtons = screen.getAllByLabelText('删除文件夹')
      expect(deleteButtons).toHaveLength(1)
    })

    it('点击删除按钮应该移除文件夹', async () => {
      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      const deleteButton = screen.getByLabelText('删除文件夹')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(screen.queryByText('自定义文件夹')).not.toBeInTheDocument()
      })
    })
  })

  describe('保存和取消', () => {
    it('点击保存按钮应该调用 onSave', async () => {
      mockOnSave.mockResolvedValue(undefined)

      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      const saveButton = screen.getByRole('button', { name: '保存' })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('点击取消按钮应该调用 onClose', () => {
      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      const cancelButtons = screen.getAllByRole('button', { name: '取消' })
      fireEvent.click(cancelButtons[0])

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('保存成功后应该关闭弹窗', async () => {
      mockOnSave.mockResolvedValue(undefined)

      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={mockShortcuts}
          onSave={mockOnSave}
        />
      )

      const saveButton = screen.getByRole('button', { name: '保存' })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      }, { timeout: 1000 })
    })
  })

  describe('空状态', () => {
    it('应该在没有快捷方式时显示空状态', () => {
      render(
        <FolderSettingsModal
          open={true}
          onClose={mockOnClose}
          shortcuts={[]}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('暂无文件夹快捷方式')).toBeInTheDocument()
    })
  })
})
