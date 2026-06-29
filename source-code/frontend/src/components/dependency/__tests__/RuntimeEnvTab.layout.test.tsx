/**
 * RuntimeEnvTab 布局测试
 * 
 * 测试运行环境选项卡的三栏式布局结构
 * 
 * 验证需求: 2.1, 2.2, 2.3, 2.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import RuntimeEnvTab from '../RuntimeEnvTab'
import { useDependencyStore } from '@/stores/useDependencyStore'

// Mock stores
vi.mock('@/stores/useDependencyStore')

// Mock 子组件
vi.mock('../LeftControlPanel', () => ({
  default: () => <div data-testid="left-control-panel">左侧功能控制面板</div>
}))

vi.mock('../MiddleLogPanel', () => ({
  default: () => <div data-testid="middle-log-panel">中间日志显示面板</div>
}))

vi.mock('../RightStatusPanel', () => ({
  default: () => <div data-testid="right-status-panel">右侧环境状态面板</div>
}))

describe('RuntimeEnvTab - 三栏式布局', () => {
  beforeEach(() => {
    // Mock useDependencyStore - 返回函数选择器
    vi.mocked(useDependencyStore).mockImplementation((selector: any) => {
      const state = {
        currentEnvId: 'test-env-1',
        logs: [],
        isExecuting: false,
        envInfo: null
      }
      return selector ? selector(state) : state
    })
  })

  describe('布局结构 (需求 2.1, 2.2, 2.3)', () => {
    it('应该渲染三个面板', () => {
      render(<RuntimeEnvTab />)

      // 验证三个面板都存在
      expect(screen.getByTestId('left-control-panel')).toBeInTheDocument()
      expect(screen.getByTestId('middle-log-panel')).toBeInTheDocument()
      expect(screen.getByTestId('right-status-panel')).toBeInTheDocument()
    })

    it('应该使用 flex 布局', () => {
      const { container } = render(<RuntimeEnvTab />)

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('flex')
    })

    it('应该设置正确的间距', () => {
      const { container } = render(<RuntimeEnvTab />)

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('gap-4')
    })

    it('应该设置正确的内边距', () => {
      const { container } = render(<RuntimeEnvTab />)

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('p-6')
    })

    it('应该设置正确的高度', () => {
      const { container } = render(<RuntimeEnvTab />)

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('h-full')
    })
  })

  describe('面板顺序 (需求 2.1, 2.2, 2.3)', () => {
    it('应该按照左中右的顺序渲染面板', () => {
      const { container } = render(<RuntimeEnvTab />)

      const mainContainer = container.firstChild as HTMLElement
      const panels = Array.from(mainContainer.children)

      // 验证面板数量
      expect(panels).toHaveLength(3)

      // 验证面板顺序
      expect(panels[0]).toHaveAttribute('data-testid', 'left-control-panel')
      expect(panels[1]).toHaveAttribute('data-testid', 'middle-log-panel')
      expect(panels[2]).toHaveAttribute('data-testid', 'right-status-panel')
    })
  })

  describe('响应式布局 (需求 2.4)', () => {
    it('应该支持响应式布局', () => {
      const { container } = render(<RuntimeEnvTab />)

      const mainContainer = container.firstChild as HTMLElement

      // 验证使用 flex 布局，支持响应式
      expect(mainContainer).toHaveClass('flex')
      expect(mainContainer).toHaveClass('h-full')
    })

    it('面板应该自动调整大小', () => {
      render(<RuntimeEnvTab />)

      // 验证所有面板都存在并可以渲染
      expect(screen.getByTestId('left-control-panel')).toBeInTheDocument()
      expect(screen.getByTestId('middle-log-panel')).toBeInTheDocument()
      expect(screen.getByTestId('right-status-panel')).toBeInTheDocument()
    })
  })

  describe('背景和主题 (需求 2.4)', () => {
    it('应该设置正确的背景色', () => {
      const { container } = render(<RuntimeEnvTab />)

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('bg-gray-50', 'dark:bg-dark-primary')
    })
  })
})
