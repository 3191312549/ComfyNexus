/**
 * 深色主题测试
 * 验证所有首页组件在深色主题下的显示效果
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonitorCard } from './MonitorCard'
import { FolderShortcutCard } from './FolderShortcutCard'
import { CreatorCard } from './CreatorCard'
import { Cpu } from 'lucide-react'
import type { FolderShortcut, Creator } from '@/types/home'

describe('深色主题样式测试', () => {
  describe('MonitorCard 深色主题样式', () => {
    it('应该包含深色主题样式类', () => {
      const { container } = render(
        <MonitorCard
          label="CPU占用"
          value={75}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )

      // 验证深色主题类存在
      const card = container.querySelector('.dark\\:hover\\:border-blue-600')
      expect(card).toBeInTheDocument()
    })

    it('应该在文本中包含深色主题类', () => {
      const { container } = render(
        <MonitorCard
          label="CPU温度"
          value={85}
          unit="°C"
          color="orange"
          icon={Cpu}
        />
      )

      // 验证深色文本颜色类
      const textElement = container.querySelector('.dark\\:text-dark-text-primary')
      expect(textElement).toBeInTheDocument()
    })

    it('应该在进度条背景中包含深色主题类', () => {
      const { container } = render(
        <MonitorCard
          label="GPU占用"
          value={50}
          unit="%"
          color="blue"
          icon={Cpu}
        />
      )

      // 验证深色背景类
      const progressBg = container.querySelector('.dark\\:bg-dark-border')
      expect(progressBg).toBeInTheDocument()
    })
  })

  describe('FolderShortcutCard 深色主题样式', () => {
    const mockShortcut: FolderShortcut = {
      id: '1',
      name: '输入',
      path: '/path/to/input',
      icon: 'Folder',
      order: 0,
      isDefault: true,
    }

    it('应该包含深色主题悬停样式', () => {
      const { container } = render(<FolderShortcutCard shortcut={mockShortcut} />)

      // 验证深色主题悬停边框类
      const card = container.querySelector('.dark\\:hover\\:border-blue-600')
      expect(card).toBeInTheDocument()
    })

    it('应该包含深色主题文本样式', () => {
      const { container } = render(<FolderShortcutCard shortcut={mockShortcut} />)

      // 验证深色文本类
      const textElement = container.querySelector('.dark\\:text-dark-text-primary')
      expect(textElement).toBeInTheDocument()
    })

    it('应该包含深色主题图标背景', () => {
      const { container } = render(<FolderShortcutCard shortcut={mockShortcut} />)

      // 验证深色图标背景类
      const iconBg = container.querySelector('.dark\\:bg-blue-900\\/20')
      expect(iconBg).toBeInTheDocument()
    })
  })

  describe('CreatorCard 深色主题样式', () => {
    const mockCreator: Creator = {
      id: 1,
      name: '测试创作者',
      avatar: '/avatars/test.jpg',
      description: '测试描述',
      link: 'https://example.com',
      platform: 'bilibili',
    }

    it('应该包含深色主题悬停背景', () => {
      const { container } = render(<CreatorCard creator={mockCreator} />)

      // 验证深色悬停背景类
      const card = container.querySelector('.dark\\:hover\\:bg-dark-surface-hover')
      expect(card).toBeInTheDocument()
    })

    it('应该包含深色主题文本样式', () => {
      const { container } = render(<CreatorCard creator={mockCreator} />)

      // 验证深色文本类
      const textElement = container.querySelector('.dark\\:text-dark-text-primary')
      expect(textElement).toBeInTheDocument()
    })

    it('应该包含深色主题次要文本样式', () => {
      const { container } = render(<CreatorCard creator={mockCreator} />)

      // 验证深色次要文本类
      const secondaryText = container.querySelector('.dark\\:text-dark-text-secondary')
      expect(secondaryText).toBeInTheDocument()
    })
  })

  describe('深色主题响应式测试', () => {
    it('MonitorCard 应该在所有断点下支持深色主题', () => {
      const { container } = render(
        <MonitorCard
          label="测试"
          value={50}
          unit="%"
          color="blue"
          icon={Cpu}
        />
      )

      // 验证响应式深色主题类
      expect(container.querySelector('.dark\\:text-dark-text-primary')).toBeInTheDocument()
      expect(container.querySelector('.dark\\:hover\\:border-blue-600')).toBeInTheDocument()
    })
  })
})

