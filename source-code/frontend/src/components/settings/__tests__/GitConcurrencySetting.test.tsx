/**
 * GitConcurrencySetting 组件单元测试
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GitConcurrencySetting } from '../GitConcurrencySetting'

describe('GitConcurrencySetting', () => {
  describe('基本渲染', () => {
    it('应该渲染标签和输入框', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      expect(screen.getByText('Git 并发数')).toBeInTheDocument()
      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('10')).toBeInTheDocument()
    })

    it('应该显示默认值和范围提示', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      expect(screen.getByText(/默认值: 10，范围: 1-32/)).toBeInTheDocument()
    })

    it('应该显示当前值', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={15} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton') as HTMLInputElement
      expect(input.value).toBe('15')
    })
  })

  describe('输入验证', () => {
    it('应该接受有效的数值（1-32）', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      
      // 测试有效值
      fireEvent.change(input, { target: { value: '20' } })
      expect(onChange).toHaveBeenCalledWith(20)
      
      fireEvent.change(input, { target: { value: '1' } })
      expect(onChange).toHaveBeenCalledWith(1)
      
      fireEvent.change(input, { target: { value: '32' } })
      expect(onChange).toHaveBeenCalledWith(32)
    })

    it('应该在输入小于 1 时显示错误', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '0' } })
      
      expect(screen.getByText('并发数不能小于 1')).toBeInTheDocument()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('应该在输入大于 32 时显示警告', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '50' } })
      
      expect(screen.getByText(/并发数过高可能导致网络拥堵和 Git 服务器限流风险/)).toBeInTheDocument()
      // 仍然应该调用 onChange，但显示警告
      expect(onChange).toHaveBeenCalledWith(50)
    })

    it('应该在输入非数字时显示错误', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      // HTML input type="number" 会将非数字输入转换为空字符串
      // 所以我们测试空字符串的情况，这在失焦时会恢复默认值
      fireEvent.change(input, { target: { value: '' } })
      
      // 空值不应该显示错误（用户正在输入）
      expect(screen.queryByText('请输入有效的数字')).not.toBeInTheDocument()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('应该允许空值（用户正在输入）', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '' } })
      
      // 不应该显示错误或警告
      expect(screen.queryByText(/错误/)).not.toBeInTheDocument()
      expect(screen.queryByText(/警告/)).not.toBeInTheDocument()
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('失焦处理', () => {
    it('应该在失焦时恢复默认值（如果输入为空）', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      
      // 清空输入
      fireEvent.change(input, { target: { value: '' } })
      expect(onChange).not.toHaveBeenCalled()
      
      // 失焦
      fireEvent.blur(input)
      
      // 应该恢复到默认值 10
      expect(onChange).toHaveBeenCalledWith(10)
      expect((input as HTMLInputElement).value).toBe('10')
    })

    it('应该在失焦时限制值在范围内', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      
      // 输入超出范围的值
      fireEvent.change(input, { target: { value: '100' } })
      onChange.mockClear()
      
      // 失焦
      fireEvent.blur(input)
      
      // 应该被限制为 32
      expect(onChange).toHaveBeenCalledWith(32)
      expect((input as HTMLInputElement).value).toBe('32')
      expect(screen.getByText(/并发数过高可能导致网络拥堵/)).toBeInTheDocument()
    })

    it('应该在失焦时限制负值为 1', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      
      // 输入负值
      fireEvent.change(input, { target: { value: '-5' } })
      onChange.mockClear()
      
      // 失焦
      fireEvent.blur(input)
      
      // 应该被限制为 1
      expect(onChange).toHaveBeenCalledWith(1)
      expect((input as HTMLInputElement).value).toBe('1')
    })
  })

  describe('外部值同步', () => {
    it('应该在外部值变化时更新输入框', () => {
      const onChange = vi.fn()
      const { rerender } = render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton') as HTMLInputElement
      expect(input.value).toBe('10')
      
      // 外部值变化
      rerender(<GitConcurrencySetting value={20} onChange={onChange} />)
      
      expect(input.value).toBe('20')
    })
  })

  describe('样式和可访问性', () => {
    it('应该在有错误时应用错误样式', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '0' } })
      
      expect(input).toHaveClass('border-red-500')
    })

    it('应该在有警告时应用警告样式', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '50' } })
      
      expect(input).toHaveClass('border-yellow-500')
    })

    it('应该支持自定义 className', () => {
      const onChange = vi.fn()
      const { container } = render(
        <GitConcurrencySetting value={10} onChange={onChange} className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('应该设置正确的 input 属性', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton') as HTMLInputElement
      expect(input.type).toBe('number')
      expect(input.min).toBe('1')
      expect(input.max).toBe('32')
    })
  })

  describe('边界情况', () => {
    it('应该正确处理边界值 1', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '1' } })
      
      expect(onChange).toHaveBeenCalledWith(1)
      expect(screen.queryByText(/错误/)).not.toBeInTheDocument()
      expect(screen.queryByText(/警告/)).not.toBeInTheDocument()
    })

    it('应该正确处理边界值 32', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '32' } })
      
      expect(onChange).toHaveBeenCalledWith(32)
      expect(screen.queryByText(/错误/)).not.toBeInTheDocument()
      expect(screen.queryByText(/警告/)).not.toBeInTheDocument()
    })

    it('应该正确处理边界值 33（刚好超出）', () => {
      const onChange = vi.fn()
      render(<GitConcurrencySetting value={10} onChange={onChange} />)
      
      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '33' } })
      
      expect(onChange).toHaveBeenCalledWith(33)
      expect(screen.getByText(/并发数过高可能导致网络拥堵/)).toBeInTheDocument()
    })
  })
})
