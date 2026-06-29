/**
 * useToast Hook 测试
 */

import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useToast } from './useToast'

vi.mock('sonner', () => {
  const mockToast = vi.fn()
  return {
    toast: Object.assign(mockToast, {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      dismiss: vi.fn(),
    }),
  }
})

import { toast as sonnerToast } from 'sonner'

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该初始化为关闭状态（向后兼容）', () => {
    const { result } = renderHook(() => useToast())
    
    expect(result.current.toastState.open).toBe(false)
    expect(result.current.toastState.description).toBe('')
  })

  it('应该能够显示成功提示 - 默认1500ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.success('操作成功')
    })
    
    expect(sonnerToast.success).toHaveBeenCalledWith('操作成功', { duration: 1500 })
  })

  it('应该能够显示带标题的成功提示 - 默认1500ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.success('操作成功', '成功')
    })
    
    expect(sonnerToast.success).toHaveBeenCalledWith('成功', { description: '操作成功', duration: 1500 })
  })

  it('应该能够显示成功提示 - 自定义时长1000ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.success('操作成功', undefined, { duration: 1000 })
    })
    
    expect(sonnerToast.success).toHaveBeenCalledWith('操作成功', { duration: 1000 })
  })

  it('应该能够显示错误提示 - 默认3000ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.error('操作失败')
    })
    
    expect(sonnerToast.error).toHaveBeenCalledWith('操作失败', { duration: 3000 })
  })

  it('应该能够显示带标题的错误提示 - 默认3000ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.error('操作失败', '错误')
    })
    
    expect(sonnerToast.error).toHaveBeenCalledWith('错误', { description: '操作失败', duration: 3000 })
  })

  it('应该能够显示错误提示 - 自定义时长5000ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.error('操作失败', undefined, { duration: 5000 })
    })
    
    expect(sonnerToast.error).toHaveBeenCalledWith('操作失败', { duration: 5000 })
  })

  it('应该能够显示警告提示 - 默认1500ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.warning('请注意')
    })
    
    expect(sonnerToast.warning).toHaveBeenCalledWith('请注意', { duration: 1500 })
  })

  it('应该能够显示带标题的警告提示 - 默认1500ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.warning('请注意', '警告')
    })
    
    expect(sonnerToast.warning).toHaveBeenCalledWith('警告', { description: '请注意', duration: 1500 })
  })

  it('应该能够显示信息提示 - 默认1500ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.info('提示信息')
    })
    
    expect(sonnerToast.info).toHaveBeenCalledWith('提示信息', { duration: 1500 })
  })

  it('应该能够显示带标题的信息提示 - 默认1500ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.info('提示信息', '提示')
    })
    
    expect(sonnerToast.info).toHaveBeenCalledWith('提示', { description: '提示信息', duration: 1500 })
  })

  it('应该能够关闭 Toast', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.closeToast()
    })
    
    expect(sonnerToast.dismiss).toHaveBeenCalled()
  })

  it('应该能够自定义 Toast 配置 - success 使用自定义时长', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast({
        title: '自定义标题',
        description: '自定义描述',
        variant: 'success',
        duration: 10000
      })
    })
    
    expect(sonnerToast.success).toHaveBeenCalledWith('自定义标题', { 
      description: '自定义描述', 
      duration: 10000 
    })
  })

  it('应该能够自定义 Toast 配置 - success 使用默认时长 1500ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast({
        title: '自定义标题',
        description: '自定义描述',
        variant: 'success',
      })
    })
    
    expect(sonnerToast.success).toHaveBeenCalledWith('自定义标题', { 
      description: '自定义描述', 
      duration: 1500 
    })
  })

  it('应该能够自定义 Toast 配置 - error 使用默认时长 3000ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast({
        title: '错误标题',
        description: '错误描述',
        variant: 'error',
      })
    })
    
    expect(sonnerToast.error).toHaveBeenCalledWith('错误标题', { 
      description: '错误描述', 
      duration: 3000 
    })
  })

  it('应该能够自定义 Toast 配置 - warning 使用默认时长 1500ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast({
        title: '警告标题',
        description: '警告描述',
        variant: 'warning',
      })
    })
    
    expect(sonnerToast.warning).toHaveBeenCalledWith('警告标题', { 
      description: '警告描述', 
      duration: 1500 
    })
  })

  it('应该能够自定义 Toast 配置 - info 使用默认时长 1500ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast({
        title: '信息标题',
        description: '信息描述',
        variant: 'info',
      })
    })
    
    expect(sonnerToast.info).toHaveBeenCalledWith('信息标题', { 
      description: '信息描述', 
      duration: 1500 
    })
  })

  it('应该能够自定义 Toast 配置 - default 使用默认时长 1500ms', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast({
        title: '默认标题',
        description: '默认描述',
        variant: 'default',
      })
    })
    
    expect(sonnerToast).toHaveBeenCalledWith('默认标题', { 
      description: '默认描述', 
      duration: 1500 
    })
  })
})
