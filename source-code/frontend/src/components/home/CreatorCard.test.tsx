/**
 * CreatorCard 组件单元测试
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CreatorCard } from './CreatorCard'
import { Creator } from '@/types/home'

describe('CreatorCard', () => {
  // Mock 创作者数据
  const mockCreator: Creator = {
    id: 1,
    name: '诶-阿伟哥',
    avatar: '/avatars/weige.jpg',
    description: 'ComfyUI最好用的提示词插件作者',
    link: 'https://space.bilibili.com/520680644',
    platform: 'bilibili'
  }

  let windowOpenSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Mock window.open
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    windowOpenSpy.mockRestore()
  })

  describe('基本渲染', () => {
    it('应该正确渲染创作者名称', () => {
      render(<CreatorCard creator={mockCreator} />)
      expect(screen.getByText('诶-阿伟哥')).toBeInTheDocument()
    })

    it('应该正确渲染创作者描述', () => {
      render(<CreatorCard creator={mockCreator} />)
      expect(screen.getByText('ComfyUI最好用的提示词插件作者')).toBeInTheDocument()
    })

    it('应该正确渲染创作者头像', () => {
      render(<CreatorCard creator={mockCreator} />)
      const avatar = screen.getByAltText('诶-阿伟哥')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('src', '/avatars/weige.jpg')
    })

    it('头像应该使用懒加载', () => {
      render(<CreatorCard creator={mockCreator} />)
      const avatar = screen.getByAltText('诶-阿伟哥')
      expect(avatar).toHaveAttribute('loading', 'lazy')
    })
  })

  describe('平台图标', () => {
    it('应该为 bilibili 平台显示 Video 图标', () => {
      const { container } = render(<CreatorCard creator={mockCreator} />)
      // 验证 SVG 图标存在
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('应该为 youtube 平台显示 Youtube 图标', () => {
      const youtubeCreator = { ...mockCreator, platform: 'youtube' }
      const { container } = render(<CreatorCard creator={youtubeCreator} />)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('应该为 github 平台显示 Github 图标', () => {
      const githubCreator = { ...mockCreator, platform: 'github' }
      const { container } = render(<CreatorCard creator={githubCreator} />)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('应该为 web 平台显示 Globe 图标', () => {
      const webCreator = { ...mockCreator, platform: 'web' }
      const { container } = render(<CreatorCard creator={webCreator} />)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('应该为未知平台显示默认 Globe 图标', () => {
      const unknownCreator = { ...mockCreator, platform: 'unknown' }
      const { container } = render(<CreatorCard creator={unknownCreator} />)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('平台名称应该不区分大小写', () => {
      const upperCaseCreator = { ...mockCreator, platform: 'BILIBILI' }
      const { container } = render(<CreatorCard creator={upperCaseCreator} />)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('点击交互', () => {
    it('点击卡片应该在新窗口打开创作者链接', () => {
      render(<CreatorCard creator={mockCreator} />)
      
      // 点击创作者名称
      fireEvent.click(screen.getByText('诶-阿伟哥'))
      
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://space.bilibili.com/520680644',
        '_blank',
        'noopener,noreferrer'
      )
    })

    it('点击卡片任意位置都应该触发跳转', () => {
      render(<CreatorCard creator={mockCreator} />)
      
      // 点击描述文本
      fireEvent.click(screen.getByText('ComfyUI最好用的提示词插件作者'))
      
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://space.bilibili.com/520680644',
        '_blank',
        'noopener,noreferrer'
      )
    })
  })

  describe('样式类', () => {
    it('容器应该有正确的样式类', () => {
      const { container } = render(<CreatorCard creator={mockCreator} />)
      const cardContainer = container.firstChild as HTMLElement
      
      expect(cardContainer.className).toContain('flex')
      expect(cardContainer.className).toContain('flex-col')
      expect(cardContainer.className).toContain('cursor-pointer')
      expect(cardContainer.className).toContain('group')
    })

    it('头像应该有圆形样式', () => {
      render(<CreatorCard creator={mockCreator} />)
      const avatar = screen.getByAltText('诶-阿伟哥')
      
      expect(avatar.className).toContain('rounded-full')
      expect(avatar.className).toContain('w-16')
      expect(avatar.className).toContain('h-16')
    })

    it('描述文本应该限制为2行', () => {
      render(<CreatorCard creator={mockCreator} />)
      const description = screen.getByText('ComfyUI最好用的提示词插件作者')
      
      expect(description.className).toContain('line-clamp-2')
    })
  })

  describe('长文本处理', () => {
    it('应该正确处理长描述文本', () => {
      const longDescCreator = {
        ...mockCreator,
        description: '这是一个非常非常非常非常非常非常非常非常非常非常长的描述文本，应该被截断为两行显示，超出部分会显示省略号'
      }
      
      render(<CreatorCard creator={longDescCreator} />)
      const description = screen.getByText(longDescCreator.description)
      
      expect(description).toBeInTheDocument()
      expect(description.className).toContain('line-clamp-2')
    })

    it('应该正确处理长名称', () => {
      const longNameCreator = {
        ...mockCreator,
        name: '这是一个非常非常非常长的创作者名称'
      }
      
      render(<CreatorCard creator={longNameCreator} />)
      expect(screen.getByText(longNameCreator.name)).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理空描述', () => {
      const emptyDescCreator = { ...mockCreator, description: '' }
      render(<CreatorCard creator={emptyDescCreator} />)
      
      // 组件应该正常渲染，不会崩溃
      expect(screen.getByText('诶-阿伟哥')).toBeInTheDocument()
    })

    it('应该处理特殊字符', () => {
      const specialCharCreator = {
        ...mockCreator,
        name: '创作者<>&"\'',
        description: '描述<>&"\''
      }
      
      render(<CreatorCard creator={specialCharCreator} />)
      expect(screen.getByText('创作者<>&"\'')).toBeInTheDocument()
      expect(screen.getByText('描述<>&"\'')).toBeInTheDocument()
    })
  })
})
