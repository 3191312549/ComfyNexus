/**
 * CreatorRecommendationGrid 组件测试
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreatorRecommendationGrid } from './CreatorRecommendationGrid'

describe('CreatorRecommendationGrid', () => {
  // 基本渲染测试
  describe('基本渲染', () => {
    it('应该正确渲染组件', () => {
      render(<CreatorRecommendationGrid />)
      expect(screen.getByText('推荐关注')).toBeInTheDocument()
    })

    it('应该显示标题"推荐关注"', () => {
      render(<CreatorRecommendationGrid />)
      const title = screen.getByText('推荐关注')
      expect(title).toBeInTheDocument()
    })

    it('应该显示 ExternalLink 图标', () => {
      const { container } = render(<CreatorRecommendationGrid />)
      // ExternalLink 图标应该在标题旁边
      const titleElement = screen.getByText('推荐关注').closest('h3')
      expect(titleElement).toBeInTheDocument()
      // 检查是否有 svg 元素（图标）
      const svg = titleElement?.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  // 数据展示测试
  describe('数据展示', () => {
    it('应该展示6位创作者', () => {
      render(<CreatorRecommendationGrid />)
      
      // 验证所有创作者名称都显示
      expect(screen.getByText('诶-阿伟哥')).toBeInTheDocument()
      expect(screen.getByText('Olivio Sarikas')).toBeInTheDocument()
      expect(screen.getByText('comfyanonymous')).toBeInTheDocument()
      expect(screen.getByText('秋葉aaaki')).toBeInTheDocument()
      expect(screen.getByText('Scott Detweiler')).toBeInTheDocument()
      expect(screen.getByText('ComfyUI 官网')).toBeInTheDocument()
    })

    it('应该正确渲染每个创作者的信息', () => {
      render(<CreatorRecommendationGrid />)
      
      // 验证第一个创作者的完整信息
      expect(screen.getByText('诶-阿伟哥')).toBeInTheDocument()
      expect(screen.getByText('ComfyUI最好用的提示词插件作者')).toBeInTheDocument()
      
      // 验证头像
      const avatar = screen.getByAltText('诶-阿伟哥')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('src', '/avatars/weige.jpg')
    })
  })

  // 布局测试
  describe('布局测试', () => {
    it('应该使用网格布局', () => {
      const { container } = render(<CreatorRecommendationGrid />)
      
      // 查找网格容器
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
    })

    it('应该有正确的响应式类名', () => {
      const { container } = render(<CreatorRecommendationGrid />)
      
      // 查找网格容器并验证响应式类名
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1')
      expect(gridContainer).toHaveClass('sm:grid-cols-2')
      expect(gridContainer).toHaveClass('lg:grid-cols-3')
    })

    it('应该有正确的间距', () => {
      const { container } = render(<CreatorRecommendationGrid />)
      
      // 验证网格间距
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('gap-4')
    })
  })

  // 样式测试
  describe('样式测试', () => {
    it('应该支持自定义 className', () => {
      const { container } = render(<CreatorRecommendationGrid className="custom-class" />)
      
      // Card 组件应该有自定义类名
      const card = container.firstChild
      expect(card).toHaveClass('custom-class')
    })

    it('应该处理空 className', () => {
      const { container } = render(<CreatorRecommendationGrid className="" />)
      
      // 应该正常渲染
      expect(screen.getByText('推荐关注')).toBeInTheDocument()
    })

    it('应该处理未定义的 className', () => {
      const { container } = render(<CreatorRecommendationGrid />)
      
      // 应该正常渲染
      expect(screen.getByText('推荐关注')).toBeInTheDocument()
    })
  })

  // 组件集成测试
  describe('组件集成', () => {
    it('应该正确集成 CreatorCard 组件', () => {
      render(<CreatorRecommendationGrid />)
      
      // 验证 CreatorCard 的关键元素存在
      // 每个创作者应该有头像、名称、描述
      const avatars = screen.getAllByRole('img')
      expect(avatars).toHaveLength(6)
    })

    it('每个创作者卡片应该可点击', () => {
      const { container } = render(<CreatorRecommendationGrid />)
      
      // 查找所有可点击的创作者卡片
      const clickableCards = container.querySelectorAll('[role="button"], .cursor-pointer')
      expect(clickableCards.length).toBeGreaterThanOrEqual(6)
    })
  })

  // 深色主题测试
  describe('深色主题', () => {
    it('应该有深色主题相关的类名', () => {
      const { container } = render(<CreatorRecommendationGrid />)
      
      // Card 组件应该有深色主题类名
      const card = container.querySelector('.dark\\:bg-dark-secondary, .dark\\:border-dark-border')
      expect(card).toBeInTheDocument()
    })
  })
})
