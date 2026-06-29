/**
 * 系统提示词管理组件测试
 * 
 * 验证需求：4.1-4.9, 5.1-5.5, 6.1-6.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PromptList } from '../PromptList'
import { PromptForm } from '../PromptForm'
import { PromptManagementDialog } from '../PromptManagementDialog'
import { useSystemPromptStore } from '../../../stores/useSystemPromptStore'
import type { SystemPromptPreset } from '../../../stores/useSystemPromptStore'

// Mock useSystemPromptStore
vi.mock('../../../stores/useSystemPromptStore')

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

const mockPresets: SystemPromptPreset[] = [
  {
    id: 'preset-1',
    name: 'ComfyUI专家',
    content: '# Role: ComfyUI 资深技术架构师...',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z'
  },
  {
    id: 'preset-2',
    name: '代码助手',
    content: '你是一位资深的软件工程师...',
    created_at: '2024-01-21T10:00:00Z',
    updated_at: '2024-01-21T10:00:00Z'
  }
]

describe('PromptList', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('应该渲染预设列表', () => {
    render(
      <PromptList
        presets={mockPresets}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    
    expect(screen.getByText('ComfyUI专家')).toBeInTheDocument()
    expect(screen.getByText('代码助手')).toBeInTheDocument()
  })
  
  it('应该显示预设内容预览', () => {
    render(
      <PromptList
        presets={mockPresets}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    
    expect(screen.getByText(/# Role: ComfyUI 资深技术架构师/)).toBeInTheDocument()
    expect(screen.getByText(/你是一位资深的软件工程师/)).toBeInTheDocument()
  })
  
  it('空列表应该显示空状态', () => {
    render(
      <PromptList
        presets={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    
    expect(screen.getByText('暂无系统提示词预设')).toBeInTheDocument()
  })
  
  it('点击编辑按钮应该调用 onEdit', () => {
    render(
      <PromptList
        presets={mockPresets}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    
    const editButtons = screen.getAllByTitle('编辑预设')
    fireEvent.click(editButtons[0])
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockPresets[0])
  })
  
  it('点击删除按钮应该显示确认对话框', async () => {
    render(
      <PromptList
        presets={mockPresets}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    
    const deleteButtons = screen.getAllByTitle('删除预设')
    fireEvent.click(deleteButtons[0])
    
    // 验证确认对话框标题出现
    await waitFor(() => {
      expect(screen.getByText('确认删除')).toBeInTheDocument()
    })
  })
  
  it('确认删除应该调用 onDelete', async () => {
    render(
      <PromptList
        presets={mockPresets}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    
    // 点击删除按钮
    const deleteButtons = screen.getAllByTitle('删除预设')
    fireEvent.click(deleteButtons[0])
    
    // 确认删除
    await waitFor(() => {
      const confirmButton = screen.getByText('删除')
      fireEvent.click(confirmButton)
    })
    
    expect(mockOnDelete).toHaveBeenCalledWith('preset-1')
  })
})

describe('PromptForm', () => {
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSave.mockResolvedValue(undefined)
  })
  
  it('应该渲染表单字段', () => {
    render(
      <PromptForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    expect(screen.getByLabelText(/预设名称/)).toBeInTheDocument()
    expect(screen.getByLabelText(/预设内容/)).toBeInTheDocument()
  })
  
  it('创建模式应该显示"创建"按钮', () => {
    render(
      <PromptForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    expect(screen.getByText('创建')).toBeInTheDocument()
  })
  
  it('编辑模式应该显示"保存"按钮和预设数据', () => {
    render(
      <PromptForm
        preset={mockPresets[0]}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    expect(screen.getByText('保存')).toBeInTheDocument()
    expect(screen.getByDisplayValue('ComfyUI专家')).toBeInTheDocument()
  })
  
  it('名称为空应该显示错误', async () => {
    render(
      <PromptForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const submitButton = screen.getByText('创建')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('预设名称不能为空')).toBeInTheDocument()
    })
    
    expect(mockOnSave).not.toHaveBeenCalled()
  })
  
  it('内容为空应该显示错误', async () => {
    render(
      <PromptForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const nameInput = screen.getByLabelText(/预设名称/)
    fireEvent.change(nameInput, { target: { value: '测试预设' } })
    
    const submitButton = screen.getByText('创建')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('预设内容不能为空')).toBeInTheDocument()
    })
    
    expect(mockOnSave).not.toHaveBeenCalled()
  })
  
  it('名称重复应该显示错误', async () => {
    render(
      <PromptForm
        existingNames={['ComfyUI专家', '代码助手']}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const nameInput = screen.getByLabelText(/预设名称/)
    fireEvent.change(nameInput, { target: { value: 'ComfyUI专家' } })
    
    const contentInput = screen.getByLabelText(/预设内容/)
    fireEvent.change(contentInput, { target: { value: '测试内容' } })
    
    const submitButton = screen.getByText('创建')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('预设名称已存在')).toBeInTheDocument()
    })
    
    expect(mockOnSave).not.toHaveBeenCalled()
  })
  
  it('有效数据应该调用 onSave', async () => {
    render(
      <PromptForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const nameInput = screen.getByLabelText(/预设名称/)
    fireEvent.change(nameInput, { target: { value: '新预设' } })
    
    const contentInput = screen.getByLabelText(/预设内容/)
    fireEvent.change(contentInput, { target: { value: '新内容' } })
    
    const submitButton = screen.getByText('创建')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        name: '新预设',
        content: '新内容'
      })
    })
  })
  
  it('点击取消应该调用 onCancel', () => {
    render(
      <PromptForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })
  
  it('应该显示字符计数', () => {
    render(
      <PromptForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )
    
    const contentInput = screen.getByLabelText(/预设内容/)
    fireEvent.change(contentInput, { target: { value: '测试内容' } })
    
    expect(screen.getByText('字符数：4')).toBeInTheDocument()
  })
})

describe('PromptManagementDialog', () => {
  let mockLoadPresets: ReturnType<typeof vi.fn>
  let mockCreatePreset: ReturnType<typeof vi.fn>
  let mockUpdatePreset: ReturnType<typeof vi.fn>
  let mockDeletePreset: ReturnType<typeof vi.fn>
  
  beforeEach(() => {
    mockLoadPresets = vi.fn()
    mockCreatePreset = vi.fn().mockResolvedValue({ id: 'new-preset', name: '新预设', content: '新内容' })
    mockUpdatePreset = vi.fn().mockResolvedValue(true)
    mockDeletePreset = vi.fn().mockResolvedValue(true)
    
    vi.mocked(useSystemPromptStore).mockReturnValue({
      presets: mockPresets,
      activePresets: new Map(),
      isLoading: false,
      error: null,
      loadPresets: mockLoadPresets,
      createPreset: mockCreatePreset,
      updatePreset: mockUpdatePreset,
      deletePreset: mockDeletePreset,
      setActivePreset: vi.fn(),
      getActivePreset: vi.fn(),
      getActivePresetContent: vi.fn(),
      initializeDefaultPreset: vi.fn(),
      clearError: vi.fn()
    })
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })
  
  it('打开时应该加载预设列表', () => {
    render(
      <PromptManagementDialog
        open={true}
        onOpenChange={vi.fn()}
      />
    )
    
    expect(mockLoadPresets).toHaveBeenCalled()
  })
  
  it('应该显示预设列表', () => {
    render(
      <PromptManagementDialog
        open={true}
        onOpenChange={vi.fn()}
      />
    )
    
    expect(screen.getByText('系统提示词管理')).toBeInTheDocument()
    expect(screen.getByText('ComfyUI专家')).toBeInTheDocument()
    expect(screen.getByText('代码助手')).toBeInTheDocument()
  })
  
  it('点击新增按钮应该显示表单', async () => {
    render(
      <PromptManagementDialog
        open={true}
        onOpenChange={vi.fn()}
      />
    )
    
    const addButton = screen.getByText('新增预设')
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/预设名称/)).toBeInTheDocument()
      expect(screen.getByText('创建')).toBeInTheDocument()
    })
  })
  
  it('应该显示预设数量', () => {
    render(
      <PromptManagementDialog
        open={true}
        onOpenChange={vi.fn()}
      />
    )
    
    expect(screen.getByText('共 2 个预设')).toBeInTheDocument()
  })
})
