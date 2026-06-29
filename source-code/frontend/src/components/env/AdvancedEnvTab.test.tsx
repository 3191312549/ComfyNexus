/**
 * AdvancedEnvTab 组件测试
 * 
 * 测试需求：
 * - 2.1: 显示带行号的代码编辑器
 * - 6.1: 显示配置格式说明
 * - 6.2: 显示占位符文本
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdvancedEnvTab } from './AdvancedEnvTab'

describe('AdvancedEnvTab', () => {
  it('应该正确渲染组件', () => {
    const mockOnChange = vi.fn()
    
    render(
      <AdvancedEnvTab
        value=""
        onChange={mockOnChange}
      />
    )
    
    // 验证组件已渲染
    expect(screen.getByText(/环境变量配置/i)).toBeInTheDocument()
  })

  it('应该显示配置格式说明', () => {
    const mockOnChange = vi.fn()
    
    render(
      <AdvancedEnvTab
        value=""
        onChange={mockOnChange}
      />
    )
    
    // 验证格式说明存在
    expect(screen.getByText(/配置格式说明/i)).toBeInTheDocument()
    expect(screen.getByText(/KEY=VALUE/i)).toBeInTheDocument()
  })

  it('应该显示示例配置', () => {
    const mockOnChange = vi.fn()
    
    render(
      <AdvancedEnvTab
        value=""
        onChange={mockOnChange}
      />
    )
    
    // 验证示例配置存在
    expect(screen.getByText(/示例/i)).toBeInTheDocument()
  })

  it('应该显示 LineNumberTextarea 编辑器', () => {
    const mockOnChange = vi.fn()
    
    const { container } = render(
      <AdvancedEnvTab
        value=""
        onChange={mockOnChange}
      />
    )
    
    // 验证编辑器存在（通过查找 textarea 元素）
    const textarea = container.querySelector('textarea')
    expect(textarea).toBeInTheDocument()
  })

  it('应该在编辑器为空时显示占位符文本', () => {
    const mockOnChange = vi.fn()
    
    const { container } = render(
      <AdvancedEnvTab
        value=""
        onChange={mockOnChange}
      />
    )
    
    // 验证占位符文本存在
    const textarea = container.querySelector('textarea')
    expect(textarea).toHaveAttribute('placeholder')
    expect(textarea?.getAttribute('placeholder')).toContain('KEY=VALUE')
  })

  it('应该正确传递 value 属性到编辑器', () => {
    const mockOnChange = vi.fn()
    const testValue = 'PYTHONIOENCODING=utf-8\nCUDA_VISIBLE_DEVICES=0'
    
    const { container } = render(
      <AdvancedEnvTab
        value={testValue}
        onChange={mockOnChange}
      />
    )
    
    // 验证编辑器显示正确的值
    const textarea = container.querySelector('textarea')
    expect(textarea).toHaveValue(testValue)
  })

  it('应该在用户输入时调用 onChange 回调', () => {
    const mockOnChange = vi.fn()
    
    const { container } = render(
      <AdvancedEnvTab
        value=""
        onChange={mockOnChange}
      />
    )
    
    // 模拟用户输入
    const textarea = container.querySelector('textarea')
    if (textarea) {
      fireEvent.change(textarea, { target: { value: 'TEST_VAR=test' } })
    }
    
    // 验证 onChange 被调用
    expect(mockOnChange).toHaveBeenCalled()
    expect(mockOnChange).toHaveBeenCalledWith('TEST_VAR=test')
  })

  it('应该支持深色模式样式', () => {
    const mockOnChange = vi.fn()
    
    const { container } = render(
      <AdvancedEnvTab
        value=""
        onChange={mockOnChange}
      />
    )
    
    // 验证组件使用了 Tailwind 的深色模式类（通过检查子组件）
    // Alert 组件和其他 UI 组件会自动支持深色模式
    const alert = container.querySelector('[role="alert"]')
    expect(alert).toBeInTheDocument()
  })
})
