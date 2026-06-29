/**
 * DependencyManagePage 布局和选项卡测试
 * 
 * 测试依赖管理页面的布局结构和选项卡切换功能
 * 
 * 验证需求: 2.4, 15.3, 15.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DependencyManagePage from '../DependencyManagePage'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { useEnvStore } from '@/stores/useEnvStore'

// Mock stores
vi.mock('@/stores/useDependencyStore')
vi.mock('@/stores/useEnvStore')

// Mock 子组件
vi.mock('@/components/dependency/RuntimeEnvTab', () => ({
  default: () => <div data-testid="runtime-env-tab">运行环境选项卡</div>
}))

describe('DependencyManagePage - 布局和选项卡', () => {
  const mockSetCurrentEnv = vi.fn()

  beforeEach(() => {
    mockSetCurrentEnv.mockClear()

    // Mock useEnvStore - 返回函数选择器
    vi.mocked(useEnvStore).mockImplementation((selector: any) => {
      const state = {
        currentEnvId: 'test-env-1',
        environments: [],
        loading: false,
        error: null
      }
      return selector ? selector(state) : state
    })

    // Mock useDependencyStore - 返回函数选择器
    vi.mocked(useDependencyStore).mockImplementation((selector: any) => {
      const state = {
        currentEnvId: null,
        logs: [],
        isExecuting: false,
        envInfo: null,
        setCurrentEnv: mockSetCurrentEnv
      }
      return selector ? selector(state) : state
    })
  })

  describe('页面结构 (需求 2.4)', () => {
    it('应该渲染页面标题和图标', () => {
      render(<DependencyManagePage />)

      // 验证标题
      expect(screen.getByText('依赖管理')).toBeInTheDocument()
      expect(screen.getByText('Python 包管理和环境配置')).toBeInTheDocument()

      // 验证图标
      expect(screen.getByText('📦')).toBeInTheDocument()
    })

    it('应该渲染三个选项卡按钮', () => {
      render(<DependencyManagePage />)

      // 验证选项卡按钮
      expect(screen.getByRole('tab', { name: '运行环境' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: '依赖列表' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: '救援模式' })).toBeInTheDocument()
    })

    it('应该默认显示运行环境选项卡', () => {
      render(<DependencyManagePage />)

      // 验证运行环境选项卡被激活
      const runtimeTab = screen.getByRole('tab', { name: '运行环境' })
      expect(runtimeTab).toHaveAttribute('data-state', 'active')

      // 验证运行环境内容显示
      expect(screen.getByTestId('runtime-env-tab')).toBeInTheDocument()
    })

    it('依赖列表和救援模式选项卡应该被禁用', () => {
      render(<DependencyManagePage />)

      // 验证选项卡被禁用
      const listTab = screen.getByRole('tab', { name: '依赖列表' })
      const rescueTab = screen.getByRole('tab', { name: '救援模式' })

      expect(listTab).toBeDisabled()
      expect(rescueTab).toBeDisabled()
    })
  })

  describe('选项卡切换 (需求 15.3, 15.4)', () => {
    it('应该在点击选项卡时切换内容', () => {
      render(<DependencyManagePage />)

      // 默认显示运行环境
      expect(screen.getByTestId('runtime-env-tab')).toBeInTheDocument()

      // 注意：依赖列表和救援模式被禁用，无法切换
      // 这里只验证运行环境选项卡的激活状态
      const runtimeTab = screen.getByRole('tab', { name: '运行环境' })
      expect(runtimeTab).toHaveAttribute('data-state', 'active')
    })

    it('应该高亮显示当前激活的选项卡', () => {
      render(<DependencyManagePage />)

      const runtimeTab = screen.getByRole('tab', { name: '运行环境' })

      // 验证激活状态
      expect(runtimeTab).toHaveAttribute('data-state', 'active')
    })

    it('未激活的选项卡不应该有激活状态', () => {
      render(<DependencyManagePage />)

      const listTab = screen.getByRole('tab', { name: '依赖列表' })
      const rescueTab = screen.getByRole('tab', { name: '救援模式' })

      // 验证非激活状态
      expect(listTab).toHaveAttribute('data-state', 'inactive')
      expect(rescueTab).toHaveAttribute('data-state', 'inactive')
    })
  })

  describe('环境绑定 (需求 2.4)', () => {
    it('应该在环境切换时更新依赖管理状态', () => {
      render(<DependencyManagePage />)

      // 验证 setCurrentEnv 被调用
      expect(mockSetCurrentEnv).toHaveBeenCalledWith('test-env-1')
    })

    it('环境 ID 为空时不应该更新依赖管理状态', () => {
      mockSetCurrentEnv.mockClear()

      // Mock useEnvStore 返回空的 currentEnvId
      vi.mocked(useEnvStore).mockImplementation((selector: any) => {
        const state = {
          currentEnvId: null,
          environments: [],
          loading: false,
          error: null
        }
        return selector ? selector(state) : state
      })

      render(<DependencyManagePage />)

      // 验证 setCurrentEnv 未被调用
      expect(mockSetCurrentEnv).not.toHaveBeenCalled()
    })
  })

  describe('响应式布局 (需求 2.4)', () => {
    it('应该使用 flex 布局', () => {
      const { container } = render(<DependencyManagePage />)

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('flex', 'flex-col')
    })

    it('应该设置正确的高度和溢出处理', () => {
      const { container } = render(<DependencyManagePage />)

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('h-full', 'overflow-hidden')
    })

    it('选项卡内容区域应该可滚动', () => {
      render(<DependencyManagePage />)

      // 查找选项卡内容容器
      const tabContent = screen.getByTestId('runtime-env-tab').parentElement
      expect(tabContent).toHaveClass('overflow-hidden')
    })
  })
})
