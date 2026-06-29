/**
 * FolderShortcutCard 组件单元测试
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import type { FolderShortcutCardProps } from './FolderShortcutCard'
import { FolderShortcutCard } from './FolderShortcutCard'
import type { FolderShortcut } from '@/types/home'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'home.folder.pathNotSet': '路径未设置',
        'home.folder.pathInvalid': '文件夹路径无效',
        'home.folder.cannotOpen': '无法打开文件夹',
      }
      return translations[key] || key
    },
  }),
}))

// Mock openFolder API
vi.mock('@/mocks/home', () => ({
  openFolder: vi.fn(),
}))

import { openFolder } from '@/mocks/home'

describe('FolderShortcutCard 组件', () => {
  const mockShortcut: FolderShortcut = {
    id: '1',
    name: '输入',
    path: '/path/to/input',
    icon: 'FolderInput',
    order: 0,
    isDefault: true,
  }

  // 包装组件以提供 DndContext
  const renderWithDnd = (props: FolderShortcutCardProps) => {
    return render(
      <DndContext>
        <FolderShortcutCard {...props} />
      </DndContext>
    )
  }

  describe('基本渲染', () => {
    it('应该正确渲染文件夹名称', () => {
      renderWithDnd({ shortcut: mockShortcut })
      expect(screen.getByText('输入')).toBeInTheDocument()
    })

    it('应该正确渲染文件夹路径', () => {
      renderWithDnd({ shortcut: mockShortcut })
      expect(screen.getByText('/path/to/input')).toBeInTheDocument()
    })

    it('应该渲染文件夹图标', () => {
      const { container } = renderWithDnd({ shortcut: mockShortcut })
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('当路径为空时应该显示"路径未设置"', () => {
      const emptyPathShortcut = { ...mockShortcut, path: '' }
      renderWithDnd({ shortcut: emptyPathShortcut })
      expect(screen.getByText('路径未设置')).toBeInTheDocument()
    })
  })

  describe('图标映射', () => {
    it('应该正确渲染 FolderInput 图标', () => {
      const { container } = renderWithDnd({ shortcut: mockShortcut })
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('应该正确渲染 FolderOutput 图标', () => {
      const outputShortcut = { ...mockShortcut, icon: 'FolderOutput' }
      const { container } = renderWithDnd({ shortcut: outputShortcut })
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('应该正确渲染 FolderCog 图标', () => {
      const cogShortcut = { ...mockShortcut, icon: 'FolderCog' }
      const { container } = renderWithDnd({ shortcut: cogShortcut })
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('未知图标应该使用默认 Folder 图标', () => {
      const unknownShortcut = { ...mockShortcut, icon: 'UnknownIcon' }
      const { container } = renderWithDnd({ shortcut: unknownShortcut })
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('点击交互', () => {
    it('点击卡片应该调用 openFolder', async () => {
      const mockOpenFolder = vi.mocked(openFolder)
      mockOpenFolder.mockResolvedValue()

      renderWithDnd({ shortcut: mockShortcut })
      
      const card = screen.getByText('输入').closest('div')?.parentElement
      if (card) {
        fireEvent.click(card)
      }

      expect(mockOpenFolder).toHaveBeenCalledWith('/path/to/input')
    })

    it('路径为空时点击应该调用 onError', () => {
      const onError = vi.fn()
      const emptyPathShortcut = { ...mockShortcut, path: '' }
      
      renderWithDnd({ shortcut: emptyPathShortcut, onError })
      
      const card = screen.getByText('输入').closest('div')?.parentElement
      if (card) {
        fireEvent.click(card)
      }

      expect(onError).toHaveBeenCalledWith('路径未设置')
    })

    it('打开文件夹失败时应该调用 onError', async () => {
      const mockOpenFolder = vi.mocked(openFolder)
      mockOpenFolder.mockRejectedValue(new Error('文件夹不存在'))

      const onError = vi.fn()
      renderWithDnd({ shortcut: mockShortcut, onError })
      
      const card = screen.getByText('输入').closest('div')?.parentElement
      if (card) {
        fireEvent.click(card)
      }

      // 等待异步操作完成
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
    })
  })

  describe('禁用状态', () => {
    it('路径为空时应该有禁用样式', () => {
      const emptyPathShortcut = { ...mockShortcut, path: '' }
      const { container } = renderWithDnd({ shortcut: emptyPathShortcut })
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('opacity-50')
      expect(card.className).toContain('cursor-not-allowed')
    })

    it('路径有效时不应该有禁用样式', () => {
      const { container } = renderWithDnd({ shortcut: mockShortcut })
      
      const card = container.firstChild as HTMLElement
      expect(card.className).not.toContain('cursor-not-allowed')
    })
  })

  describe('拖拽功能', () => {
    it('应该显示拖拽手柄', () => {
      const { container } = renderWithDnd({ shortcut: mockShortcut })
      
      // 查找 GripVertical 图标
      const gripIcon = container.querySelector('.group-hover\\:opacity-100')
      expect(gripIcon).toBeInTheDocument()
    })

    it('拖拽覆盖层不应该显示拖拽手柄', () => {
      const { container } = renderWithDnd({ 
        shortcut: mockShortcut, 
        isDragOverlay: true 
      })
      
      const gripIcon = container.querySelector('.group-hover\\:opacity-100')
      expect(gripIcon).not.toBeInTheDocument()
    })

    it('拖拽覆盖层应该有特殊样式', () => {
      const { container } = renderWithDnd({ 
        shortcut: mockShortcut, 
        isDragOverlay: true 
      })
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('shadow-2xl')
      expect(card.className).toContain('ring-2')
    })
  })

  describe('样式类', () => {
    it('卡片应该有悬停效果', () => {
      const { container } = renderWithDnd({ shortcut: mockShortcut })
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('hover:shadow-lg')
      expect(card.className).toContain('hover:border-blue-300')
    })

    it('应该包含深色主题样式', () => {
      const { container } = renderWithDnd({ shortcut: mockShortcut })
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('dark:hover:border-blue-600')
    })

    it('图标容器应该有悬停缩放效果', () => {
      const { container } = renderWithDnd({ shortcut: mockShortcut })
      
      const iconContainer = container.querySelector('.group-hover\\:scale-110')
      expect(iconContainer).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理长路径', () => {
      const longPathShortcut = {
        ...mockShortcut,
        path: 'C:\\Users\\Username\\Documents\\Projects\\ComfyUI\\very\\long\\path\\to\\folder',
      }
      
      renderWithDnd({ shortcut: longPathShortcut })
      expect(screen.getByText(longPathShortcut.path)).toBeInTheDocument()
    })

    it('应该处理特殊字符路径', () => {
      const specialPathShortcut = {
        ...mockShortcut,
        path: 'C:\\Users\\用户名\\文档\\ComfyUI',
      }
      
      renderWithDnd({ shortcut: specialPathShortcut })
      expect(screen.getByText(specialPathShortcut.path)).toBeInTheDocument()
    })

    it('应该处理空名称', () => {
      const emptyNameShortcut = { ...mockShortcut, name: '' }
      renderWithDnd({ shortcut: emptyNameShortcut })
      
      // 组件应该正常渲染，不会崩溃
      expect(screen.getByText('/path/to/input')).toBeInTheDocument()
    })
  })
})
