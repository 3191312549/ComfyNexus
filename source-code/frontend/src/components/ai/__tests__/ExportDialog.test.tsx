/**
 * ExportDialog 组件单元测试
 * 
 * 测试内容：
 * - 对话框渲染
 * - 格式选择
 * - 导出功能
 * - 错误处理
 * 
 * 验证需求：6.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExportDialog } from '../ExportDialog'

// Mock window.pywebview
const mockPywebview = {
  api: {
    ai_export_chat: vi.fn()
  }
}

describe('ExportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error - 测试环境需要模拟全局对象
    window.pywebview = mockPywebview
  })
  
  it('应该正确渲染对话框', () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        topicId="topic_1"
        topicName="测试话题"
      />
    )
    
    expect(screen.getByText('导出聊天记录')).toBeInTheDocument()
    expect(screen.getByText('JSON 格式')).toBeInTheDocument()
    expect(screen.getByText('Markdown 格式')).toBeInTheDocument()
  })
  
  it('应该默认选中 JSON 格式', () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        topicId="topic_1"
        topicName="测试话题"
      />
    )
    
    const jsonButton = screen.getByText('JSON 格式').closest('button')
    expect(jsonButton).toHaveClass('border-primary')
  })
  
  it('应该能够切换导出格式', () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        topicId="topic_1"
        topicName="测试话题"
      />
    )
    
    // 点击 Markdown 格式
    const markdownButton = screen.getByText('Markdown 格式').closest('button')
    fireEvent.click(markdownButton!)
    
    // 验证选中状态
    expect(markdownButton).toHaveClass('border-primary')
  })
  
  it('应该能够成功导出 JSON 格式', async () => {
    const mockContent = JSON.stringify({ test: 'data' })
    mockPywebview.api.ai_export_chat.mockResolvedValue({
      success: true,
      content: mockContent,
      format: 'json'
    })
    
    const onOpenChange = vi.fn()
    
    render(
      <ExportDialog
        open={true}
        onOpenChange={onOpenChange}
        topicId="topic_1"
        topicName="测试话题"
      />
    )
    
    // 点击导出按钮
    const exportButton = screen.getByText('导出')
    fireEvent.click(exportButton)
    
    // 等待导出完成
    await waitFor(() => {
      expect(mockPywebview.api.ai_export_chat).toHaveBeenCalledWith('topic_1', 'json')
    })
    
    // 验证对话框关闭
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
  
  it('应该能够成功导出 Markdown 格式', async () => {
    const mockContent = '# 测试话题\n\n测试内容'
    mockPywebview.api.ai_export_chat.mockResolvedValue({
      success: true,
      content: mockContent,
      format: 'markdown'
    })
    
    const onOpenChange = vi.fn()
    
    render(
      <ExportDialog
        open={true}
        onOpenChange={onOpenChange}
        topicId="topic_1"
        topicName="测试话题"
      />
    )
    
    // 选择 Markdown 格式
    const markdownButton = screen.getByText('Markdown 格式').closest('button')
    fireEvent.click(markdownButton!)
    
    // 点击导出按钮
    const exportButton = screen.getByText('导出')
    fireEvent.click(exportButton)
    
    // 等待导出完成
    await waitFor(() => {
      expect(mockPywebview.api.ai_export_chat).toHaveBeenCalledWith('topic_1', 'markdown')
    })
    
    // 验证对话框关闭
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
  
  it('应该正确处理导出失败', async () => {
    mockPywebview.api.ai_export_chat.mockResolvedValue({
      success: false,
      error_message: '导出失败：话题不存在'
    })
    
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        topicId="topic_1"
        topicName="测试话题"
      />
    )
    
    // 点击导出按钮
    const exportButton = screen.getByText('导出')
    fireEvent.click(exportButton)
    
    // 等待错误提示显示
    await waitFor(() => {
      expect(screen.getByText(/导出失败：话题不存在/)).toBeInTheDocument()
    })
  })
  
  it('应该在导出过程中禁用按钮', async () => {
    mockPywebview.api.ai_export_chat.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            content: 'test',
            format: 'json'
          })
        }, 100)
      })
    })
    
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        topicId="topic_1"
        topicName="测试话题"
      />
    )
    
    // 点击导出按钮
    const exportButton = screen.getByText('导出')
    fireEvent.click(exportButton)
    
    // 验证按钮被禁用
    await waitFor(() => {
      expect(screen.getByText('导出中...')).toBeInTheDocument()
    })
  })
  
  it('应该能够取消导出', () => {
    const onOpenChange = vi.fn()
    
    render(
      <ExportDialog
        open={true}
        onOpenChange={onOpenChange}
        topicId="topic_1"
        topicName="测试话题"
      />
    )
    
    // 点击取消按钮
    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)
    
    // 验证对话框关闭
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
  
  it('应该在开发环境使用 Mock 数据', async () => {
    // 移除 pywebview 模拟开发环境
    // @ts-expect-error - 测试环境需要删除全局对象
    delete window.pywebview
    
    const onOpenChange = vi.fn()
    
    render(
      <ExportDialog
        open={true}
        onOpenChange={onOpenChange}
        topicId="topic_1"
        topicName="测试话题"
      />
    )
    
    // 点击导出按钮
    const exportButton = screen.getByText('导出')
    fireEvent.click(exportButton)
    
    // 等待导出完成（使用 Mock 数据）
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    }, { timeout: 2000 })
  })
})
