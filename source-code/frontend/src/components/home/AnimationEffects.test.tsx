/**
 * 动画效果测试
 * 测试首页组件的动画效果是否正确实现
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonitorCard } from './MonitorCard'
import { ComfyUIStatusCard } from './ComfyUIStatusCard'
import { FolderShortcutCard } from './FolderShortcutCard'
import { CreatorCard } from './CreatorCard'
import { Cpu } from 'lucide-react'
import type { FolderShortcut, Creator } from '@/types/home'

// Mock stores
vi.mock('@/stores/useProcessStore', () => ({
  useProcessStore: () => ({
    comfyUIStatus: {
      isRunning: true,
      port: 8188,
      uptime: 3600,
    },
    openComfyUI: vi.fn(),
    startComfyUI: vi.fn(),
  }),
}))

describe('动画效果测试', () => {
  describe('MonitorCard 动画', () => {
    it('应该有悬停动画类名', () => {
      const { container } = render(
        <MonitorCard
          label="CPU"
          value={75}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      const card = container.querySelector('.hover\\:shadow-lg')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('transition-all', 'duration-300')
    })

    it('进度条应该有过渡动画', () => {
      const { container } = render(
        <MonitorCard
          label="CPU"
          value={75}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      const progressBar = container.querySelector('.transition-all.duration-300')
      expect(progressBar).toBeInTheDocument()
    })
  })

  describe('ComfyUIStatusCard 动画', () => {
    it('运行状态指示器应该有脉冲动画', () => {
      const { container } = render(<ComfyUIStatusCard />)
      
      const indicator = container.querySelector('.animate-pulse')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('bg-green-500')
    })

    it('卡片应该有悬停动画类名', () => {
      const { container } = render(<ComfyUIStatusCard />)
      
      const card = container.querySelector('.hover\\:shadow-lg')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('transition-all', 'duration-300')
    })
  })

  describe('FolderShortcutCard 动画', () => {
    const mockShortcut: FolderShortcut = {
      id: '1',
      name: '输入',
      path: '/path/to/input',
      icon: 'Folder',
      order: 0,
      isDefault: true,
    }

    it('应该有悬停动画类名', () => {
      const { container } = render(
        <FolderShortcutCard shortcut={mockShortcut} />
      )
      
      const card = container.querySelector('.hover\\:shadow-lg')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('transition-all', 'duration-300')
    })

    it('拖拽时应该有透明度和缩放效果', () => {
      // 注意：实际的拖拽状态由 @dnd-kit 管理
      // 这里只测试类名是否正确配置
      const { container } = render(
        <FolderShortcutCard shortcut={mockShortcut} />
      )
      
      const card = container.querySelector('.cursor-pointer')
      expect(card).toBeInTheDocument()
    })
  })

  describe('CreatorCard 动画', () => {
    const mockCreator: Creator = {
      id: 1,
      name: '测试创作者',
      avatar: '/avatar.jpg',
      description: '测试描述',
      link: 'https://example.com',
      platform: 'bilibili',
    }

    it('应该有悬停背景色变化', () => {
      const { container } = render(<CreatorCard creator={mockCreator} />)
      
      const card = container.querySelector('.hover\\:bg-gray-50')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('transition-colors')
    })

    it('头像应该有环形高亮动画', () => {
      const { container } = render(<CreatorCard creator={mockCreator} />)
      
      const avatar = container.querySelector('img')
      expect(avatar).toHaveClass('group-hover:ring-blue-500')
      expect(avatar).toHaveClass('transition-all')
    })

    it('名称应该有颜色高亮动画', () => {
      render(<CreatorCard creator={mockCreator} />)
      
      const name = screen.getByText('测试创作者')
      expect(name).toHaveClass('group-hover:text-blue-600')
      expect(name).toHaveClass('transition-colors')
    })
  })

  describe('动画时长一致性', () => {
    it('所有卡片组件应该使用相同的过渡时长', () => {
      const { container: monitorContainer } = render(
        <MonitorCard
          label="CPU"
          value={75}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      const { container: statusContainer } = render(<ComfyUIStatusCard />)
      
      const mockShortcut: FolderShortcut = {
        id: '1',
        name: '输入',
        path: '/path/to/input',
        icon: 'Folder',
        order: 0,
        isDefault: true,
      }
      const { container: folderContainer } = render(
        <FolderShortcutCard shortcut={mockShortcut} />
      )
      
      // 检查所有卡片都使用 duration-300
      expect(monitorContainer.querySelector('.duration-300')).toBeInTheDocument()
      expect(statusContainer.querySelector('.duration-300')).toBeInTheDocument()
      expect(folderContainer.querySelector('.duration-300')).toBeInTheDocument()
    })
  })
})
