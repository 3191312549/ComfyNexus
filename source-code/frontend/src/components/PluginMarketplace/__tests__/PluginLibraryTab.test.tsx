/* eslint-disable no-restricted-syntax */
/**
 * PluginLibraryTab 组件单元测试
 * 
 * 测试内容：
 * - 插件列表加载
 * - 搜索功能
 * - 分页加载
 * - GitHub 直接安装
 * - 错误处理
 * 
 * 验证需求：1.1, 4.2, 4.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PluginLibraryTab } from '../PluginLibraryTab'
import { pluginMarketplaceService } from '@/services/pluginMarketplaceService'
import type { Plugin } from '@/types/plugin-marketplace'

// Mock pluginMarketplaceService
vi.mock('@/services/pluginMarketplaceService', () => ({
  pluginMarketplaceService: {
    getPlugins: vi.fn(),
  }
}))

// Mock UI 组件
vi.mock('@/components/ui/Input', () => ({
  Input: ({ value, onChange, onKeyPress, placeholder, className, ...props }: any) => (
    <input
      data-testid="input"
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  ),
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, className, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, className }: any) => (
    <div data-testid="alert" data-variant={variant} className={className}>
      {children}
    </div>
  ),
  AlertDescription: ({ children, className }: any) => (
    <div data-testid="alert-description" className={className}>
      {children}
    </div>
  ),
}))

// Mock PluginCard 组件
vi.mock('../PluginCard', () => ({
  PluginCard: ({ plugin, onInstall, isInstalling }: any) => (
    <div data-testid="plugin-card" data-plugin-name={plugin.name}>
      <h3>{plugin.name}</h3>
      <p>{plugin.description}</p>
      <button
        data-testid={`install-${plugin.name}`}
        onClick={() => onInstall(plugin)}
        disabled={isInstalling}
      >
        {isInstalling ? '安装中...' : '安装'}
      </button>
    </div>
  ),
}))

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

global.IntersectionObserver = MockIntersectionObserver as any

describe('PluginLibraryTab', () => {
  // 创建测试用的插件数据
  const createMockPlugin = (index: number): Plugin => ({
    name: `Plugin ${index}`,
    description: `Description for plugin ${index}`,
    repository: `https://github.com/test/plugin-${index}`,
    version_tag: `v1.${index}.0`,
    updated_at: '2024-01-15T10:30:45Z',
    node_count: index,
    is_installed: false,
    author: `Author ${index}`,
    stars: index * 10,
    downloads: index * 100,
    tags: ['test'],
  })

  // 创建多个插件用于测试分页
  const createMockPlugins = (count: number): Plugin[] => {
    return Array.from({ length: count }, (_, i) => createMockPlugin(i + 1))
  }

  const defaultProps = {
    autoInstallDeps: true,
    onInstallStart: vi.fn(),
    installingPluginName: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('插件列表加载 - 需求 1.1', () => {
    it('应该在组件挂载时自动加载插件列表', async () => {
      const mockPlugins = createMockPlugins(10)
      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: mockPlugins,
      })

      render(<PluginLibraryTab {...defaultProps} />)

      // 应该调用 API 获取插件列表
      await waitFor(() => {
        expect(pluginMarketplaceService.getPlugins).toHaveBeenCalledWith(true)
      })

      // 应该显示插件卡片
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(10)
      })
    })

    it('应该在加载时显示加载指示器', async () => {
      // 延迟响应以测试加载状态
      vi.mocked(pluginMarketplaceService.getPlugins).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: true,
              plugins: [],
            })
          }, 100)
        })
      )

      render(<PluginLibraryTab {...defaultProps} />)

      // 应该显示加载指示器
      expect(screen.getByText('加载插件列表中...')).toBeInTheDocument()

      // 等待加载完成
      await waitFor(() => {
        expect(screen.queryByText('加载插件列表中...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('应该在加载失败时显示错误提示', async () => {
      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: false,
        error_message: '网络连接失败',
      })

      render(<PluginLibraryTab {...defaultProps} />)

      // 应该显示错误提示
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText('网络连接失败')).toBeInTheDocument()
      })
    })

    it('应该在插件列表为空时显示提示信息', async () => {
      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: [],
      })

      render(<PluginLibraryTab {...defaultProps} />)

      // 应该显示空列表提示
      await waitFor(() => {
        expect(screen.getByText('暂无插件数据')).toBeInTheDocument()
      })
    })

    it('应该在 API 抛出异常时显示错误提示', async () => {
      vi.mocked(pluginMarketplaceService.getPlugins).mockRejectedValue(
        new Error('Network error')
      )

      render(<PluginLibraryTab {...defaultProps} />)

      // 应该显示错误提示
      await waitFor(() => {
        expect(screen.getByText('加载插件列表失败，请稍后重试')).toBeInTheDocument()
      })
    })
  })

  describe('搜索功能 - 需求 4.2', () => {
    const mockPlugins = [
      createMockPlugin(1),
      { ...createMockPlugin(2), name: 'ComfyUI-Manager', description: 'Plugin manager' },
      { ...createMockPlugin(3), name: 'Impact Pack', description: 'Impact tools for ComfyUI' },
      { ...createMockPlugin(4), name: 'Custom Nodes', description: 'Additional nodes' },
    ]

    beforeEach(() => {
      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: mockPlugins,
      })
    })

    it('应该根据插件名称过滤插件', async () => {
      const user = userEvent.setup()

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(4)
      })

      // 输入搜索关键词
      const searchInputs = screen.getAllByTestId('input')
      const searchInput = searchInputs[0] // 第一个是搜索框
      await user.type(searchInput, 'ComfyUI')

      // 点击查询按钮
      const buttons = screen.getAllByTestId('button')
      const searchButton = buttons.find(btn => btn.textContent?.includes('查询'))
      await user.click(searchButton!)

      // 应该只显示匹配的插件
      await waitFor(() => {
        const cards = screen.getAllByTestId('plugin-card')
        expect(cards).toHaveLength(2) // ComfyUI-Manager 和 Impact Pack
      })
    })

    it('应该根据插件简介过滤插件', async () => {
      const user = userEvent.setup()

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(4)
      })

      // 输入搜索关键词
      const searchInputs = screen.getAllByTestId('input')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'manager')

      // 点击查询按钮
      const buttons = screen.getAllByTestId('button')
      const searchButton = buttons.find(btn => btn.textContent?.includes('查询'))
      await user.click(searchButton!)

      // 应该只显示匹配的插件
      await waitFor(() => {
        const cards = screen.getAllByTestId('plugin-card')
        expect(cards).toHaveLength(1) // ComfyUI-Manager
        expect(cards[0]).toHaveAttribute('data-plugin-name', 'ComfyUI-Manager')
      })
    })

    it('应该支持不区分大小写的搜索', async () => {
      const user = userEvent.setup()

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(4)
      })

      // 输入小写搜索关键词
      const searchInputs = screen.getAllByTestId('input')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'comfyui')

      // 点击查询按钮
      const buttons = screen.getAllByTestId('button')
      const searchButton = buttons.find(btn => btn.textContent?.includes('查询'))
      await user.click(searchButton!)

      // 应该匹配到大写的 ComfyUI
      await waitFor(() => {
        const cards = screen.getAllByTestId('plugin-card')
        expect(cards.length).toBeGreaterThan(0)
      })
    })

    it('应该在搜索结果为空时显示提示 - 需求 4.3', async () => {
      const user = userEvent.setup()

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(4)
      })

      // 输入不存在的关键词
      const searchInputs = screen.getAllByTestId('input')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'nonexistent')

      // 点击查询按钮
      const buttons = screen.getAllByTestId('button')
      const searchButton = buttons.find(btn => btn.textContent?.includes('查询'))
      await user.click(searchButton!)

      // 应该显示"未找到匹配的插件"提示
      await waitFor(() => {
        expect(screen.getByText('未找到匹配的插件')).toBeInTheDocument()
        expect(screen.getByText('请尝试其他搜索关键词')).toBeInTheDocument()
      })
    })

    it('应该在清空搜索关键词后显示所有插件', async () => {
      const user = userEvent.setup()

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(4)
      })

      // 输入搜索关键词
      const searchInputs = screen.getAllByTestId('input')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'ComfyUI')

      // 点击查询按钮
      const buttons = screen.getAllByTestId('button')
      const searchButton = buttons.find(btn => btn.textContent?.includes('查询'))
      await user.click(searchButton!)

      // 等待过滤完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card').length).toBeLessThan(4)
      })

      // 清空搜索框
      await user.clear(searchInput)

      // 再次点击查询按钮
      await user.click(searchButton!)

      // 应该显示所有插件
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(4)
      })
    })

    it('应该支持回车键触发搜索', async () => {
      const user = userEvent.setup()

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(4)
      })

      // 输入搜索关键词并按回车
      const searchInputs = screen.getAllByTestId('input')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'manager{Enter}')

      // 应该触发搜索
      await waitFor(() => {
        const cards = screen.getAllByTestId('plugin-card')
        expect(cards).toHaveLength(1)
      })
    })
  })

  describe('分页加载 - 需求 3.4, 3.5', () => {
    it('应该每页显示 20 个插件', async () => {
      const mockPlugins = createMockPlugins(50)
      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: mockPlugins,
      })

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        const cards = screen.getAllByTestId('plugin-card')
        expect(cards).toHaveLength(20) // 第一页显示 20 个
      })
    })

    it('应该设置 IntersectionObserver 监听滚动', async () => {
      const mockPlugins = createMockPlugins(50)
      const observeSpy = vi.fn()
      
      // 创建带 spy 的 mock
      class SpyIntersectionObserver {
        observe = observeSpy
        disconnect = vi.fn()
        unobserve = vi.fn()
      }
      
      global.IntersectionObserver = SpyIntersectionObserver as any

      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: mockPlugins,
      })

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(30)
      })

      // 应该调用 IntersectionObserver.observe
      await waitFor(() => {
        expect(observeSpy).toHaveBeenCalled()
      })
    })

    it('应该在有更多数据时显示"加载更多"指示器', async () => {
      const mockPlugins = createMockPlugins(50)
      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: mockPlugins,
      })

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getByText('加载更多...')).toBeInTheDocument()
      })
    })

    it('应该在加载全部数据后显示提示', async () => {
      const mockPlugins = createMockPlugins(20) // 少于 30 个
      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: mockPlugins,
      })

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getByText(/已加载全部 20 个插件/)).toBeInTheDocument()
      })
    })

    it('应该在搜索后重置分页', async () => {
      const user = userEvent.setup()
      const mockPlugins = createMockPlugins(50)
      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: mockPlugins,
      })

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(30)
      })

      // 执行搜索
      const searchInputs = screen.getAllByTestId('input')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'Plugin 1')

      const buttons = screen.getAllByTestId('button')
      const searchButton = buttons.find(btn => btn.textContent?.includes('查询'))
      await user.click(searchButton!)

      // 搜索后应该重置到第一页
      await waitFor(() => {
        const cards = screen.getAllByTestId('plugin-card')
        // 匹配 "Plugin 1", "Plugin 10", "Plugin 11", ... "Plugin 19"
        expect(cards.length).toBeGreaterThan(0)
        expect(cards.length).toBeLessThanOrEqual(30)
      })
    })
  })

  describe('GitHub 直接安装 - 需求 4.5', () => {
    beforeEach(() => {
      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: [],
      })
    })

    it('应该验证 GitHub URL 格式', async () => {
      const user = userEvent.setup()

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待加载完成
      await waitFor(() => {
        expect(screen.getByText('暂无插件数据')).toBeInTheDocument()
      })

      // 输入无效的 URL
      const inputs = screen.getAllByTestId('input')
      const githubInput = inputs[1] // 第二个是 GitHub 输入框
      await user.type(githubInput, 'invalid-url')

      // 点击安装按钮
      const buttons = screen.getAllByTestId('button')
      const installButton = buttons.find(btn => 
        btn.textContent === '安装' && btn.getAttribute('data-variant') === 'secondary'
      )
      await user.click(installButton!)

      // 应该显示错误提示
      await waitFor(() => {
        expect(screen.getByText(/无效的 GitHub 地址/)).toBeInTheDocument()
      })
    })

    it('应该在输入为空时禁用安装按钮', async () => {
      render(<PluginLibraryTab {...defaultProps} />)

      // 等待加载完成
      await waitFor(() => {
        expect(screen.getByText('暂无插件数据')).toBeInTheDocument()
      })

      // GitHub 安装按钮应该被禁用（因为输入为空）
      const buttons = screen.getAllByTestId('button')
      const installButton = buttons.find(btn => 
        btn.textContent === '安装' && btn.getAttribute('data-variant') === 'secondary'
      )
      expect(installButton).toBeDisabled()
    })

    it('应该在输入有效 URL 时触发安装', async () => {
      const user = userEvent.setup()
      const onInstallStart = vi.fn()

      render(<PluginLibraryTab {...defaultProps} onInstallStart={onInstallStart} />)

      // 等待加载完成
      await waitFor(() => {
        expect(screen.getByText('暂无插件数据')).toBeInTheDocument()
      })

      // 输入有效的 GitHub URL
      const inputs = screen.getAllByTestId('input')
      const githubInput = inputs[1]
      await user.type(githubInput, 'https://github.com/test/test-plugin')

      // 点击安装按钮
      const buttons = screen.getAllByTestId('button')
      const installButton = buttons.find(btn => 
        btn.textContent === '安装' && btn.getAttribute('data-variant') === 'secondary'
      )
      await user.click(installButton!)

      // 应该调用 onInstallStart
      await waitFor(() => {
        expect(onInstallStart).toHaveBeenCalledTimes(1)
        const plugin = onInstallStart.mock.calls[0][0]
        expect(plugin.repository).toBe('https://github.com/test/test-plugin')
      })
    })

    it('应该在安装后清空输入框', async () => {
      const user = userEvent.setup()

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待加载完成
      await waitFor(() => {
        expect(screen.getByText('暂无插件数据')).toBeInTheDocument()
      })

      // 输入有效的 GitHub URL
      const inputs = screen.getAllByTestId('input')
      const githubInput = inputs[1]
      await user.type(githubInput, 'https://github.com/test/test-plugin')

      // 点击安装按钮
      const buttons = screen.getAllByTestId('button')
      const installButton = buttons.find(btn => 
        btn.textContent === '安装' && btn.getAttribute('data-variant') === 'secondary'
      )
      await user.click(installButton!)

      // 输入框应该被清空
      await waitFor(() => {
        expect(githubInput).toHaveValue('')
      })
    })

    it('应该在有插件正在安装时禁用安装按钮', async () => {
      render(<PluginLibraryTab {...defaultProps} installingPluginName="Some Plugin" />)

      // 等待加载完成
      await waitFor(() => {
        expect(screen.getByText('暂无插件数据')).toBeInTheDocument()
      })

      // GitHub 安装按钮应该被禁用
      const buttons = screen.getAllByTestId('button')
      const installButton = buttons.find(btn => 
        btn.textContent === '安装' && btn.getAttribute('data-variant') === 'secondary'
      )
      expect(installButton).toBeDisabled()
    })
  })

  describe('插件卡片交互', () => {
    it('应该在点击插件卡片的安装按钮时触发安装', async () => {
      const user = userEvent.setup()
      const onInstallStart = vi.fn()
      const mockPlugins = createMockPlugins(5)

      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: mockPlugins,
      })

      render(<PluginLibraryTab {...defaultProps} onInstallStart={onInstallStart} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(5)
      })

      // 点击第一个插件的安装按钮
      const installButton = screen.getByTestId('install-Plugin 1')
      await user.click(installButton)

      // 应该调用 onInstallStart
      expect(onInstallStart).toHaveBeenCalledTimes(1)
      expect(onInstallStart).toHaveBeenCalledWith(mockPlugins[0])
    })

    it('应该在安装中时禁用对应插件的安装按钮', async () => {
      const mockPlugins = createMockPlugins(5)

      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: mockPlugins,
      })

      render(<PluginLibraryTab {...defaultProps} installingPluginName="Plugin 1" />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(5)
      })

      // 第一个插件的安装按钮应该被禁用
      const installButton = screen.getByTestId('install-Plugin 1')
      expect(installButton).toBeDisabled()
      expect(installButton).toHaveTextContent('安装中...')

      // 其他插件的安装按钮应该可用
      const installButton2 = screen.getByTestId('install-Plugin 2')
      expect(installButton2).not.toBeDisabled()
    })
  })

  describe('响应式布局', () => {
    it('应该应用响应式网格类', async () => {
      const mockPlugins = createMockPlugins(10)
      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: true,
        plugins: mockPlugins,
      })

      const { container } = render(<PluginLibraryTab {...defaultProps} />)

      // 等待插件加载完成
      await waitFor(() => {
        expect(screen.getAllByTestId('plugin-card')).toHaveLength(10)
      })

      // 查找网格容器
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()

      // 验证响应式类
      expect(gridContainer?.className).toContain('grid-cols-1')
      expect(gridContainer?.className).toContain('sm:grid-cols-2')
      expect(gridContainer?.className).toContain('md:grid-cols-3')
      expect(gridContainer?.className).toContain('lg:grid-cols-4')
      expect(gridContainer?.className).toContain('xl:grid-cols-5')
    })
  })

  describe('错误处理', () => {
    it('应该在加载时禁用搜索按钮', async () => {
      // 延迟响应以测试加载状态
      vi.mocked(pluginMarketplaceService.getPlugins).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: true,
              plugins: [],
            })
          }, 100)
        })
      )

      render(<PluginLibraryTab {...defaultProps} />)

      // 搜索按钮应该被禁用
      const buttons = screen.getAllByTestId('button')
      const searchButton = buttons.find(btn => btn.textContent?.includes('查询'))
      expect(searchButton).toBeDisabled()

      // 等待加载完成
      await waitFor(() => {
        expect(searchButton).not.toBeDisabled()
      }, { timeout: 200 })
    })

    it('应该在显示错误后允许重新搜索', async () => {
      const user = userEvent.setup()

      vi.mocked(pluginMarketplaceService.getPlugins).mockResolvedValue({
        success: false,
        error_message: '网络错误',
      })

      render(<PluginLibraryTab {...defaultProps} />)

      // 等待错误显示
      await waitFor(() => {
        expect(screen.getByText('网络错误')).toBeInTheDocument()
      })

      // 输入搜索关键词
      const searchInputs = screen.getAllByTestId('input')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'test')

      // 搜索按钮应该可用
      const buttons = screen.getAllByTestId('button')
      const searchButton = buttons.find(btn => btn.textContent?.includes('查询'))
      expect(searchButton).not.toBeDisabled()
    })
  })

  describe('组件显示名称', () => {
    it('应该设置正确的 displayName', () => {
      expect(PluginLibraryTab.displayName).toBe('PluginLibraryTab')
    })
  })
})
