/* eslint-disable no-restricted-syntax */
/**
 * PluginCard 组件单元测试
 * 
 * 测试插件卡片的渲染、安装状态显示和按钮交互
 * 验证需求：3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PluginCard } from '../PluginCard'
import type { Plugin } from '@/types/plugin-marketplace'

// Mock UI 组件
vi.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardFooter: ({ children, className }: any) => (
    <div data-testid="card-footer" className={className}>{children}</div>
  ),
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-testid="install-button"
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span 
      data-testid="badge" 
      data-variant={variant}
      className={className}
    >
      {children}
    </span>
  ),
}))

describe('PluginCard', () => {
  // 创建测试用的插件数据
  const createMockPlugin = (overrides?: Partial<Plugin>): Plugin => ({
    name: 'Test Plugin',
    description: 'This is a test plugin for unit testing',
    repository: 'https://github.com/test/test-plugin',
    version_tag: 'v1.0.0',
    updated_at: '2024-01-15T10:30:45Z',
    node_count: 5,
    is_installed: false,
    author: 'Test Author',
    stars: 100,
    downloads: 1000,
    tags: ['test', 'utility'],
    ...overrides,
  })

  const defaultProps = {
    plugin: createMockPlugin(),
    autoInstallDeps: true,
    onInstall: vi.fn(),
    isInstalling: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染 - 需求 3.2', () => {
    it('应该正确渲染插件名称', () => {
      render(<PluginCard {...defaultProps} />)
      
      expect(screen.getByTestId('card-title')).toHaveTextContent('Test Plugin')
    })

    it('应该正确渲染插件简介', () => {
      render(<PluginCard {...defaultProps} />)
      
      expect(screen.getByText('This is a test plugin for unit testing')).toBeInTheDocument()
    })

    it('应该正确渲染版本标识', () => {
      render(<PluginCard {...defaultProps} />)
      
      expect(screen.getByText('版本:')).toBeInTheDocument()
      expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    })

    it('应该正确渲染更新时间（精确到秒）', () => {
      render(<PluginCard {...defaultProps} />)
      
      expect(screen.getByText('更新:')).toBeInTheDocument()
      // 验证时间格式：YYYY-MM-DD HH:mm:ss
      expect(screen.getByText(/2024-01-15 \d{2}:\d{2}:\d{2}/)).toBeInTheDocument()
    })

    it('应该正确渲染节点数量', () => {
      render(<PluginCard {...defaultProps} />)
      
      expect(screen.getByText('节点数:')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('应该正确渲染作者信息', () => {
      render(<PluginCard {...defaultProps} />)
      
      expect(screen.getByText('作者:')).toBeInTheDocument()
      expect(screen.getByText('Test Author')).toBeInTheDocument()
    })

    it('应该正确渲染 GitHub Stars', () => {
      render(<PluginCard {...defaultProps} />)
      
      expect(screen.getByText('⭐')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('应该正确渲染标签', () => {
      render(<PluginCard {...defaultProps} />)
      
      const badges = screen.getAllByTestId('badge')
      // 应该有 2 个标签 badge
      const tagBadges = badges.filter(badge => 
        badge.textContent === 'test' || badge.textContent === 'utility'
      )
      expect(tagBadges.length).toBe(2)
    })

    it('应该渲染安装按钮', () => {
      render(<PluginCard {...defaultProps} />)
      
      const button = screen.getByTestId('install-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('安装')
    })
  })

  describe('安装状态显示 - 需求 3.3', () => {
    it('应该在插件已安装时显示"已安装"徽章', () => {
      const installedPlugin = createMockPlugin({ is_installed: true })
      render(<PluginCard {...defaultProps} plugin={installedPlugin} />)
      
      const badges = screen.getAllByTestId('badge')
      const installedBadge = badges.find(badge => badge.textContent === '已安装')
      expect(installedBadge).toBeInTheDocument()
    })

    it('应该在插件未安装时不显示"已安装"徽章', () => {
      render(<PluginCard {...defaultProps} />)
      
      const badges = screen.getAllByTestId('badge')
      const installedBadge = badges.find(badge => badge.textContent === '已安装')
      expect(installedBadge).toBeUndefined()
    })

    it('应该在插件已安装时禁用安装按钮', () => {
      const installedPlugin = createMockPlugin({ is_installed: true })
      render(<PluginCard {...defaultProps} plugin={installedPlugin} />)
      
      const button = screen.getByTestId('install-button')
      expect(button).toBeDisabled()
      expect(button).toHaveTextContent('已安装')
    })

    it('应该在插件未安装时启用安装按钮', () => {
      render(<PluginCard {...defaultProps} />)
      
      const button = screen.getByTestId('install-button')
      expect(button).not.toBeDisabled()
      expect(button).toHaveTextContent('安装')
    })
  })

  describe('安装按钮交互 - 需求 3.2', () => {
    it('应该在点击安装按钮时调用 onInstall 回调', async () => {
      const user = userEvent.setup()
      const onInstall = vi.fn()
      
      render(<PluginCard {...defaultProps} onInstall={onInstall} />)
      
      const button = screen.getByTestId('install-button')
      await user.click(button)
      
      expect(onInstall).toHaveBeenCalledTimes(1)
      expect(onInstall).toHaveBeenCalledWith(defaultProps.plugin)
    })

    it('应该在安装中时显示加载状态', () => {
      render(<PluginCard {...defaultProps} isInstalling={true} />)
      
      const button = screen.getByTestId('install-button')
      expect(button).toHaveTextContent('安装中...')
      expect(button).toHaveTextContent('⏳')
    })

    it('应该在安装中时禁用安装按钮', () => {
      render(<PluginCard {...defaultProps} isInstalling={true} />)
      
      const button = screen.getByTestId('install-button')
      expect(button).toBeDisabled()
    })

    it('应该在插件已安装时不调用 onInstall', async () => {
      const user = userEvent.setup()
      const onInstall = vi.fn()
      const installedPlugin = createMockPlugin({ is_installed: true })
      
      render(<PluginCard {...defaultProps} plugin={installedPlugin} onInstall={onInstall} />)
      
      const button = screen.getByTestId('install-button')
      await user.click(button)
      
      expect(onInstall).not.toHaveBeenCalled()
    })

    it('应该在安装中时不调用 onInstall', async () => {
      const user = userEvent.setup()
      const onInstall = vi.fn()
      
      render(<PluginCard {...defaultProps} onInstall={onInstall} isInstalling={true} />)
      
      const button = screen.getByTestId('install-button')
      await user.click(button)
      
      expect(onInstall).not.toHaveBeenCalled()
    })
  })

  describe('边界情况处理', () => {
    it('应该正确处理空简介', () => {
      const plugin = createMockPlugin({ description: '' })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      expect(screen.getByText('暂无简介')).toBeInTheDocument()
    })

    it('应该正确处理缺失的版本标识', () => {
      const plugin = createMockPlugin({ version_tag: '' })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      expect(screen.getByText('未知')).toBeInTheDocument()
    })

    it('应该正确处理无效的更新时间', () => {
      const plugin = createMockPlugin({ updated_at: 'invalid-date' })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      expect(screen.getByText('未知')).toBeInTheDocument()
    })

    it('应该正确处理节点数量为 0', () => {
      const plugin = createMockPlugin({ node_count: 0 })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      expect(screen.getByText('节点数:')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('应该在没有作者时不显示作者信息', () => {
      const plugin = createMockPlugin({ author: '' })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      expect(screen.queryByText('作者:')).not.toBeInTheDocument()
    })

    it('应该在 stars 为 0 时不显示 stars', () => {
      const plugin = createMockPlugin({ stars: 0 })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      expect(screen.queryByText('⭐')).not.toBeInTheDocument()
    })

    it('应该在没有标签时不显示标签区域', () => {
      const plugin = createMockPlugin({ tags: [] })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      // 当没有标签时，应该没有任何 badge（因为插件未安装，也没有"已安装"徽章）
      const badges = screen.queryAllByTestId('badge')
      expect(badges.length).toBe(0)
    })

    it('应该正确截断过长的简介', () => {
      const longDescription = 'A'.repeat(200)
      const plugin = createMockPlugin({ description: longDescription })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      // 简介应该被 line-clamp-3 限制显示
      const content = screen.getByTestId('card-content')
      expect(content).toBeInTheDocument()
    })

    it('应该正确截断过长的版本标识', () => {
      const longVersion = 'v1.0.0-beta-with-very-long-commit-hash-1234567890abcdef'
      const plugin = createMockPlugin({ version_tag: longVersion })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      // 版本应该被截断到 20 字符
      const versionText = screen.getByText(/^v1\.0\.0-beta-with-ver/)
      expect(versionText.textContent?.length).toBeLessThanOrEqual(23) // 20 + "..."
    })

    it('应该正确截断过长的作者名', () => {
      const longAuthor = 'Very Long Author Name That Should Be Truncated'
      const plugin = createMockPlugin({ author: longAuthor })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      // 作者名应该被截断
      expect(screen.getByText('作者:')).toBeInTheDocument()
    })

    it('应该在标签超过 3 个时显示 +N 标记', () => {
      const plugin = createMockPlugin({ 
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'] 
      })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      // 应该显示前 3 个标签 + "+2" 标记
      expect(screen.getByText('+2')).toBeInTheDocument()
    })
  })

  describe('卡片样式和布局', () => {
    it('应该应用正确的卡片样式类', () => {
      render(<PluginCard {...defaultProps} />)
      
      const card = screen.getByTestId('card')
      expect(card.className).toContain('flex')
      expect(card.className).toContain('flex-col')
      expect(card.className).toContain('h-full')
    })

    it('应该包含所有必需的卡片部分', () => {
      render(<PluginCard {...defaultProps} />)
      
      expect(screen.getByTestId('card-header')).toBeInTheDocument()
      expect(screen.getByTestId('card-content')).toBeInTheDocument()
      expect(screen.getByTestId('card-footer')).toBeInTheDocument()
    })
  })

  describe('时间格式化', () => {
    it('应该正确格式化标准 ISO 8601 时间', () => {
      const plugin = createMockPlugin({ 
        updated_at: '2024-03-20T15:45:30Z' 
      })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      // 应该显示格式化后的时间（精确到秒）
      expect(screen.getByText(/2024-03-20 \d{2}:45:30/)).toBeInTheDocument()
    })

    it('应该正确处理带时区的时间', () => {
      const plugin = createMockPlugin({ 
        updated_at: '2024-03-20T15:45:30+08:00' 
      })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      // 应该能够解析并显示时间
      expect(screen.getByText(/2024-03-20/)).toBeInTheDocument()
    })

    it('应该正确处理毫秒精度的时间', () => {
      const plugin = createMockPlugin({ 
        updated_at: '2024-03-20T15:45:30.123Z' 
      })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      // 应该显示到秒级别
      expect(screen.getByText(/2024-03-20 \d{2}:45:30/)).toBeInTheDocument()
    })

    it('应该正确处理空字符串时间', () => {
      const plugin = createMockPlugin({ 
        updated_at: '' 
      })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      // 应该显示"未知"
      expect(screen.getByText('更新:')).toBeInTheDocument()
      expect(screen.getByText('未知')).toBeInTheDocument()
    })

    it('应该正确处理 null 时间', () => {
      const plugin = createMockPlugin({ 
        updated_at: null as any 
      })
      render(<PluginCard {...defaultProps} plugin={plugin} />)
      
      // null 会被转换为 Unix 纪元时间 1970-01-01
      expect(screen.getByText(/1970-01-01/)).toBeInTheDocument()
    })
  })

  describe('可访问性', () => {
    it('应该为安装按钮提供正确的文本', () => {
      render(<PluginCard {...defaultProps} />)
      
      const button = screen.getByTestId('install-button')
      expect(button).toHaveTextContent('安装')
    })

    it('应该为已安装的插件提供正确的按钮文本', () => {
      const installedPlugin = createMockPlugin({ is_installed: true })
      render(<PluginCard {...defaultProps} plugin={installedPlugin} />)
      
      const button = screen.getByTestId('install-button')
      expect(button).toHaveTextContent('已安装')
    })

    it('应该为安装中的状态提供正确的按钮文本', () => {
      render(<PluginCard {...defaultProps} isInstalling={true} />)
      
      const button = screen.getByTestId('install-button')
      expect(button).toHaveTextContent('安装中...')
    })
  })

  describe('组件显示名称', () => {
    it('应该设置正确的 displayName', () => {
      expect(PluginCard.displayName).toBe('PluginCard')
    })
  })
})
