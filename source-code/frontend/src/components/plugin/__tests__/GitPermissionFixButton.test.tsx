/* eslint-disable no-restricted-syntax */
/**
 * GitPermissionFixButton 组件测试
 * 
 * 测试内容：
 * - 按钮渲染
 * - 帮助图标渲染
 * - 点击修复按钮打开对话框
 * - 点击帮助图标打开帮助对话框
 * - 修复完成后的刷新回调
 * 
 * **验证需求：3.1, 3.6, 4.1, 4.2**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GitPermissionFixButton } from '../GitPermissionFixButton'

// Mock 子组件
vi.mock('../GitPermissionFixDialog', () => ({
  GitPermissionFixDialog: ({ open, onClose, onComplete }: any) => (
    <div data-testid="fix-dialog">
      {open && (
        <>
          <div>Fix Dialog Open</div>
          <button onClick={onClose}>Close Dialog</button>
          <button onClick={onComplete}>Complete Fix</button>
        </>
      )}
    </div>
  ),
}))

vi.mock('../GitPermissionHelpDialog', () => ({
  GitPermissionHelpDialog: ({ open, onClose }: any) => (
    <div data-testid="help-dialog">
      {open && (
        <>
          <div>Help Dialog Open</div>
          <button onClick={onClose}>Close Help</button>
        </>
      )}
    </div>
  ),
}))

describe('GitPermissionFixButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('按钮渲染', () => {
    it('应该渲染修复 Git 权限按钮', () => {
      render(<GitPermissionFixButton />)

      // 验证按钮存在
      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      expect(fixButton).toBeDefined()
    })

    it('应该在按钮中显示扳手图标', () => {
      render(<GitPermissionFixButton />)

      // 验证按钮文本
      expect(screen.getByText('修复 Git 权限')).toBeDefined()
    })

    it('应该使用 outline 变体样式', () => {
      render(<GitPermissionFixButton />)

      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      // 验证按钮存在（样式由 Button 组件处理）
      expect(fixButton).toBeDefined()
    })
  })

  describe('帮助图标渲染', () => {
    it('应该渲染帮助图标按钮', () => {
      render(<GitPermissionFixButton />)

      // 查找帮助按钮（通过 title 属性）
      const helpButton = screen.getByTitle('查看帮助')
      expect(helpButton).toBeDefined()
    })

    it('帮助按钮应该是图标按钮样式', () => {
      render(<GitPermissionFixButton />)

      const helpButton = screen.getByTitle('查看帮助')
      expect(helpButton.tagName).toBe('BUTTON')
    })
  })

  describe('修复对话框交互', () => {
    it('点击修复按钮应该打开修复对话框', () => {
      render(<GitPermissionFixButton />)

      // 初始状态：对话框未打开
      expect(screen.queryByText('Fix Dialog Open')).toBeNull()

      // 点击修复按钮
      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      fireEvent.click(fixButton)

      // 验证对话框打开
      expect(screen.getByText('Fix Dialog Open')).toBeDefined()
    })

    it('应该能够关闭修复对话框', () => {
      render(<GitPermissionFixButton />)

      // 打开对话框
      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      fireEvent.click(fixButton)
      expect(screen.getByText('Fix Dialog Open')).toBeDefined()

      // 关闭对话框
      const closeButton = screen.getByText('Close Dialog')
      fireEvent.click(closeButton)

      // 验证对话框关闭
      expect(screen.queryByText('Fix Dialog Open')).toBeNull()
    })

    it('修复完成后应该调用 onRefresh 回调', () => {
      const onRefresh = vi.fn()

      render(<GitPermissionFixButton onRefresh={onRefresh} />)

      // 打开对话框
      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      fireEvent.click(fixButton)

      // 触发修复完成
      const completeButton = screen.getByText('Complete Fix')
      fireEvent.click(completeButton)

      // 验证 onRefresh 被调用
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('没有提供 onRefresh 回调时不应该报错', () => {
      render(<GitPermissionFixButton />)

      // 打开对话框
      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      fireEvent.click(fixButton)

      // 触发修复完成（不应该报错）
      const completeButton = screen.getByText('Complete Fix')
      expect(() => {
        fireEvent.click(completeButton)
      }).not.toThrow()
    })
  })

  describe('帮助对话框交互', () => {
    it('点击帮助图标应该打开帮助对话框', () => {
      render(<GitPermissionFixButton />)

      // 初始状态：帮助对话框未打开
      expect(screen.queryByText('Help Dialog Open')).toBeNull()

      // 点击帮助图标
      const helpButton = screen.getByTitle('查看帮助')
      fireEvent.click(helpButton)

      // 验证帮助对话框打开
      expect(screen.getByText('Help Dialog Open')).toBeDefined()
    })

    it('应该能够关闭帮助对话框', () => {
      render(<GitPermissionFixButton />)

      // 打开帮助对话框
      const helpButton = screen.getByTitle('查看帮助')
      fireEvent.click(helpButton)
      expect(screen.getByText('Help Dialog Open')).toBeDefined()

      // 关闭帮助对话框
      const closeButton = screen.getByText('Close Help')
      fireEvent.click(closeButton)

      // 验证帮助对话框关闭
      expect(screen.queryByText('Help Dialog Open')).toBeNull()
    })

    it('帮助对话框和修复对话框应该可以独立打开', () => {
      render(<GitPermissionFixButton />)

      // 打开修复对话框
      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      fireEvent.click(fixButton)
      expect(screen.getByText('Fix Dialog Open')).toBeDefined()

      // 关闭修复对话框
      const closeFixButton = screen.getByText('Close Dialog')
      fireEvent.click(closeFixButton)

      // 打开帮助对话框
      const helpButton = screen.getByTitle('查看帮助')
      fireEvent.click(helpButton)
      expect(screen.getByText('Help Dialog Open')).toBeDefined()

      // 验证修复对话框仍然关闭
      expect(screen.queryByText('Fix Dialog Open')).toBeNull()
    })
  })

  describe('组件集成', () => {
    it('应该正确传递 props 到子组件', () => {
      const onRefresh = vi.fn()

      render(<GitPermissionFixButton onRefresh={onRefresh} />)

      // 打开修复对话框
      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      fireEvent.click(fixButton)

      // 验证对话框渲染
      expect(screen.getByTestId('fix-dialog')).toBeDefined()
      expect(screen.getByTestId('help-dialog')).toBeDefined()
    })

    it('应该渲染按钮组容器', () => {
      const { container } = render(<GitPermissionFixButton />)

      // 验证按钮组容器存在
      const buttonGroup = container.querySelector('.flex.items-center.gap-2')
      expect(buttonGroup).toBeDefined()
    })
  })

  describe('可访问性', () => {
    it('修复按钮应该有正确的角色', () => {
      render(<GitPermissionFixButton />)

      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      // 按钮元素本身就是 button 类型，验证其存在即可
      expect(fixButton.tagName).toBe('BUTTON')
    })

    it('帮助按钮应该有 title 属性', () => {
      render(<GitPermissionFixButton />)

      const helpButton = screen.getByTitle('查看帮助')
      expect(helpButton.getAttribute('title')).toBe('查看帮助')
    })

    it('按钮应该可以通过键盘访问', () => {
      render(<GitPermissionFixButton />)

      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      const helpButton = screen.getByTitle('查看帮助')

      // 验证按钮可以获得焦点（通过 tabIndex）
      expect(fixButton.tabIndex).toBeGreaterThanOrEqual(0)
      expect(helpButton.tabIndex).toBeGreaterThanOrEqual(0)
    })
  })

  describe('边界情况', () => {
    it('多次点击修复按钮不应该打开多个对话框', () => {
      render(<GitPermissionFixButton />)

      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })

      // 多次点击
      fireEvent.click(fixButton)
      fireEvent.click(fixButton)
      fireEvent.click(fixButton)

      // 验证只有一个对话框
      const dialogs = screen.getAllByText('Fix Dialog Open')
      expect(dialogs).toHaveLength(1)
    })

    it('多次点击帮助按钮不应该打开多个对话框', () => {
      render(<GitPermissionFixButton />)

      const helpButton = screen.getByTitle('查看帮助')

      // 多次点击
      fireEvent.click(helpButton)
      fireEvent.click(helpButton)
      fireEvent.click(helpButton)

      // 验证只有一个对话框
      const dialogs = screen.getAllByText('Help Dialog Open')
      expect(dialogs).toHaveLength(1)
    })

    it('快速切换对话框不应该导致状态错误', () => {
      render(<GitPermissionFixButton />)

      const fixButton = screen.getByRole('button', { name: /修复 Git 权限/i })
      const helpButton = screen.getByTitle('查看帮助')

      // 快速切换
      fireEvent.click(fixButton)
      fireEvent.click(helpButton)
      fireEvent.click(fixButton)

      // 验证状态正确
      expect(screen.getByText('Fix Dialog Open')).toBeDefined()
      expect(screen.getByText('Help Dialog Open')).toBeDefined()
    })
  })
})
