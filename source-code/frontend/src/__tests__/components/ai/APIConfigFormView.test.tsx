/**
 * APIConfigFormView 组件测试
 * 
 * 测试内容：
 * - 表单渲染
 * - 表单验证
 * - 服务商切换时字段动态更新
 * - 保存和取消操作
 * - 测试连接功能
 * 
 * 验证需求：2.2, 3.2, 3.6, 4.1, 13.1, 13.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { APIConfigFormView } from '@/components/ai/APIConfigFormView'
import { useAPIConfigStore } from '@/stores/useAPIConfigStore'

// Mock useAPIConfigStore
vi.mock('@/stores/useAPIConfigStore', () => ({
  useAPIConfigStore: vi.fn()
}))

describe('APIConfigFormView', () => {
  // Mock 函数
  const mockGetConfig = vi.fn()
  const mockCreateConfig = vi.fn()
  const mockUpdateConfig = vi.fn()
  const mockTestConfig = vi.fn()
  const mockClearError = vi.fn()
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()
  
  // 默认 Store 状态
  const defaultStoreState = {
    currentConfig: null,
    isLoading: false,
    error: null,
    getConfig: mockGetConfig,
    createConfig: mockCreateConfig,
    updateConfig: mockUpdateConfig,
    testConfig: mockTestConfig,
    clearError: mockClearError
  }
  
  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()
    
    // 设置默认 Store 状态
    vi.mocked(useAPIConfigStore).mockReturnValue(defaultStoreState)
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
  
  /**
   * 测试：表单渲染
   * 验证需求：1.2, 2.1
   */
  describe('表单渲染', () => {
    it('应该渲染创建模式的表单', () => {
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 验证标题
      expect(screen.getByText('添加配置')).toBeInTheDocument()
      
      // 验证表单字段
      expect(screen.getByLabelText(/配置别名/)).toBeInTheDocument()
      expect(screen.getByLabelText(/服务商/)).toBeInTheDocument()
      expect(screen.getByLabelText(/模型/)).toBeInTheDocument()
      
      // 验证按钮
      expect(screen.getByRole('button', { name: /保存配置/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /取消/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /测试连接/ })).toBeInTheDocument()
    })
    
    it('应该渲染编辑模式的表单', async () => {
      const mockConfig = {
        id: 'config-1',
        alias: '工作账号',
        provider: 'openai',
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        extra: {},
        isDefault: false,
        status: 'untested' as const,
        usageCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      
      mockGetConfig.mockResolvedValue(mockConfig)
      
      render(
        <APIConfigFormView 
          configId="config-1" 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )
      
      // 等待配置加载
      await waitFor(() => {
        expect(mockGetConfig).toHaveBeenCalledWith('config-1')
      })
      
      // 验证标题
      expect(screen.getByText('编辑配置')).toBeInTheDocument()
      
      // 验证表单字段已填充
      await waitFor(() => {
        const aliasInput = screen.getByLabelText(/配置别名/) as HTMLInputElement
        expect(aliasInput.value).toBe('工作账号')
      })
    })
  })
  
  /**
   * 测试：表单验证
   * 验证需求：2.2, 2.3, 13.1, 13.2
   */
  describe('表单验证', () => {
    it('应该验证别名不能为空', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 点击保存按钮（不填写任何字段）
      const saveButton = screen.getByRole('button', { name: /保存配置/ })
      await user.click(saveButton)
      
      // 验证错误提示
      await waitFor(() => {
        expect(screen.getByText('配置别名不能为空')).toBeInTheDocument()
      })
      
      // 验证未调用创建方法
      expect(mockCreateConfig).not.toHaveBeenCalled()
    })
    
    it('应该验证别名不能超过 50 个字符', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 输入超长别名
      const aliasInput = screen.getByLabelText(/配置别名/)
      await user.type(aliasInput, 'a'.repeat(51))
      
      // 点击保存
      const saveButton = screen.getByRole('button', { name: /保存配置/ })
      await user.click(saveButton)
      
      // 验证错误提示
      await waitFor(() => {
        expect(screen.getByText('配置别名不能超过 50 个字符')).toBeInTheDocument()
      })
    })
    
    it('应该验证服务商必须选择', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 只填写别名
      const aliasInput = screen.getByLabelText(/配置别名/)
      await user.type(aliasInput, '测试配置')
      
      // 点击保存
      const saveButton = screen.getByRole('button', { name: /保存配置/ })
      await user.click(saveButton)
      
      // 验证错误提示
      await waitFor(() => {
        expect(screen.getByText('请选择服务商')).toBeInTheDocument()
      })
    })
    
    it('应该验证 API Key 不能为空（非 Ollama）', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 填写别名
      const aliasInput = screen.getByLabelText(/配置别名/)
      await user.type(aliasInput, '测试配置')
      
      // 选择服务商（OpenAI）
      const providerSelect = screen.getByRole('combobox', { name: /服务商/ })
      await user.click(providerSelect)
      
      const openaiOption = await screen.findByRole('option', { name: 'OpenAI' })
      await user.click(openaiOption)
      
      // 填写模型
      const modelInput = screen.getByPlaceholderText(/或输入自定义模型/)
      await user.type(modelInput, 'gpt-4')
      
      // 点击保存（不填写 API Key）
      const saveButton = screen.getByRole('button', { name: /保存配置/ })
      await user.click(saveButton)
      
      // 验证错误提示
      await waitFor(() => {
        expect(screen.getByText('API Key 不能为空')).toBeInTheDocument()
      })
    })
    
    it('应该验证模型必须选择', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 填写别名
      const aliasInput = screen.getByLabelText(/配置别名/)
      await user.type(aliasInput, '测试配置')
      
      // 选择服务商
      const providerSelect = screen.getByRole('combobox', { name: /服务商/ })
      await user.click(providerSelect)
      
      const openaiOption = await screen.findByRole('option', { name: 'OpenAI' })
      await user.click(openaiOption)
      
      // 填写 API Key
      const apiKeyInput = screen.getByLabelText(/API Key/)
      await user.type(apiKeyInput, 'sk-test-key')
      
      // 点击保存（不填写模型）
      const saveButton = screen.getByRole('button', { name: /保存配置/ })
      await user.click(saveButton)
      
      // 验证错误提示
      await waitFor(() => {
        expect(screen.getByText('请选择或输入模型')).toBeInTheDocument()
      })
    })
    
    it('应该验证 Base URL 格式', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 填写别名
      const aliasInput = screen.getByLabelText(/配置别名/)
      await user.type(aliasInput, '测试配置')
      
      // 选择服务商
      const providerSelect = screen.getByRole('combobox', { name: /服务商/ })
      await user.click(providerSelect)
      
      const openaiOption = await screen.findByRole('option', { name: 'OpenAI' })
      await user.click(openaiOption)
      
      // 填写 API Key
      const apiKeyInput = screen.getByLabelText(/API Key/)
      await user.type(apiKeyInput, 'sk-test-key')
      
      // 填写模型
      const modelInput = screen.getByPlaceholderText(/或输入自定义模型/)
      await user.type(modelInput, 'gpt-4')
      
      // 填写无效的 Base URL
      const baseUrlInput = screen.getByLabelText(/Base URL/)
      await user.type(baseUrlInput, 'invalid-url')
      
      // 点击保存
      const saveButton = screen.getByRole('button', { name: /保存配置/ })
      await user.click(saveButton)
      
      // 验证错误提示
      await waitFor(() => {
        expect(screen.getByText(/Base URL 格式无效/)).toBeInTheDocument()
      })
    })
  })
  
  /**
   * 测试：服务商切换时字段动态更新
   * 验证需求：12.1, 12.2, 12.4
   */
  describe('服务商切换', () => {
    it('应该在选择 Ollama 时隐藏 API Key 字段', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 选择 Ollama
      const providerSelect = screen.getByRole('combobox', { name: /服务商/ })
      await user.click(providerSelect)
      
      const ollamaOption = await screen.findByRole('option', { name: /Ollama/ })
      await user.click(ollamaOption)
      
      // 验证 API Key 字段不存在
      await waitFor(() => {
        expect(screen.queryByLabelText(/API Key/)).not.toBeInTheDocument()
      })
    })
    
    it('应该在选择讯飞星火时显示 App ID 和 API Secret 字段', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 选择讯飞星火
      const providerSelect = screen.getByRole('combobox', { name: /服务商/ })
      await user.click(providerSelect)
      
      const sparkOption = await screen.findByRole('option', { name: /讯飞星火/ })
      await user.click(sparkOption)
      
      // 验证特定字段存在
      await waitFor(() => {
        expect(screen.getByLabelText(/App ID/)).toBeInTheDocument()
        expect(screen.getByLabelText(/API Secret/)).toBeInTheDocument()
      })
    })
    
    it('应该在切换服务商时清空模型选择', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 选择 OpenAI
      const providerSelect = screen.getByRole('combobox', { name: /服务商/ })
      await user.click(providerSelect)
      
      const openaiOption = await screen.findByRole('option', { name: 'OpenAI' })
      await user.click(openaiOption)
      
      // 填写模型
      const modelInput = screen.getByPlaceholderText(/或输入自定义模型/)
      await user.type(modelInput, 'gpt-4')
      
      // 切换到另一个服务商
      await user.click(providerSelect)
      const xflowOption = await screen.findByRole('option', { name: /XFlow/ })
      await user.click(xflowOption)
      
      // 验证模型已清空
      await waitFor(() => {
        const modelInputAfter = screen.getByPlaceholderText(/或输入自定义模型/) as HTMLInputElement
        expect(modelInputAfter.value).toBe('')
      })
    })
  })
  
  /**
   * 测试：保存和取消操作
   * 验证需求：3.2, 3.6
   */
  describe('保存和取消操作', () => {
    it('应该在表单有效时调用创建配置方法', async () => {
      const user = userEvent.setup()
      mockCreateConfig.mockResolvedValue('new-config-id')
      
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 填写完整表单
      const aliasInput = screen.getByLabelText(/配置别名/)
      await user.type(aliasInput, '测试配置')
      
      const providerSelect = screen.getByRole('combobox', { name: /服务商/ })
      await user.click(providerSelect)
      const openaiOption = await screen.findByRole('option', { name: 'OpenAI' })
      await user.click(openaiOption)
      
      const apiKeyInput = screen.getByLabelText(/API Key/)
      await user.type(apiKeyInput, 'sk-test-key')
      
      const modelInput = screen.getByPlaceholderText(/或输入自定义模型/)
      await user.type(modelInput, 'gpt-4')
      
      // 点击保存
      const saveButton = screen.getByRole('button', { name: /保存配置/ })
      await user.click(saveButton)
      
      // 验证调用创建方法
      await waitFor(() => {
        expect(mockCreateConfig).toHaveBeenCalledWith({
          alias: '测试配置',
          provider: 'openai',
          apiKey: 'sk-test-key',
          baseUrl: undefined,
          model: 'gpt-4',
          models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
          extra: undefined
        })
      })
      
      // 验证调用 onSave 回调
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })
    
    it('应该在编辑模式下调用更新配置方法', async () => {
      const user = userEvent.setup()
      
      const mockConfig = {
        id: 'config-1',
        alias: '工作账号',
        provider: 'openai',
        apiKey: 'sk-test-key',
        baseUrl: '',
        model: 'gpt-4',
        models: ['gpt-4'],
        extra: {},
        isDefault: false,
        status: 'untested' as const,
        usageCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      
      mockGetConfig.mockResolvedValue(mockConfig)
      mockUpdateConfig.mockResolvedValue(true)
      
      render(
        <APIConfigFormView 
          configId="config-1" 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )
      
      // 等待配置加载
      await waitFor(() => {
        expect(mockGetConfig).toHaveBeenCalled()
      })
      
      // 修改别名
      const aliasInput = screen.getByLabelText(/配置别名/)
      await user.clear(aliasInput)
      await user.type(aliasInput, '个人账号')
      
      // 点击保存
      const saveButton = screen.getByRole('button', { name: /保存配置/ })
      await user.click(saveButton)
      
      // 验证调用更新方法
      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith('config-1', expect.objectContaining({
          alias: '个人账号'
        }))
      })
      
      // 验证调用 onSave 回调
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })
    
    it('应该在点击取消时调用 onCancel 回调', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 点击取消按钮
      const cancelButton = screen.getByRole('button', { name: /取消/ })
      await user.click(cancelButton)
      
      // 验证调用 onCancel 回调
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })
  
  /**
   * 测试：测试连接功能
   * 验证需求：4.1, 4.2, 4.3
   */
  describe('测试连接功能', () => {
    it('应该在编辑模式下测试现有配置', async () => {
      const user = userEvent.setup()
      
      const mockConfig = {
        id: 'config-1',
        alias: '工作账号',
        provider: 'openai',
        apiKey: 'sk-test-key',
        baseUrl: '',
        model: 'gpt-4',
        models: ['gpt-4'],
        extra: {},
        isDefault: false,
        status: 'untested' as const,
        usageCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      
      mockGetConfig.mockResolvedValue(mockConfig)
      mockTestConfig.mockResolvedValue({
        success: true,
        available: true,
        latency: 150.5,
        message: '连接成功'
      })
      
      render(
        <APIConfigFormView 
          configId="config-1" 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )
      
      // 等待配置加载
      await waitFor(() => {
        expect(mockGetConfig).toHaveBeenCalled()
      })
      
      // 点击测试连接按钮
      const testButton = screen.getByRole('button', { name: /测试连接/ })
      await user.click(testButton)
      
      // 验证调用测试方法
      await waitFor(() => {
        expect(mockTestConfig).toHaveBeenCalledWith('config-1')
      })
      
      // 验证显示测试结果
      await waitFor(() => {
        expect(screen.getByText('连接成功')).toBeInTheDocument()
        expect(screen.getByText(/响应延迟: 150.50 ms/)).toBeInTheDocument()
      })
    })
    
    it('应该显示测试失败的结果', async () => {
      const user = userEvent.setup()
      
      const mockConfig = {
        id: 'config-1',
        alias: '工作账号',
        provider: 'openai',
        apiKey: 'sk-invalid-key',
        baseUrl: '',
        model: 'gpt-4',
        models: ['gpt-4'],
        extra: {},
        isDefault: false,
        status: 'untested' as const,
        usageCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      
      mockGetConfig.mockResolvedValue(mockConfig)
      mockTestConfig.mockResolvedValue({
        success: false,
        available: false,
        message: '连接失败',
        errorMessage: 'API Key 无效'
      })
      
      render(
        <APIConfigFormView 
          configId="config-1" 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )
      
      // 等待配置加载
      await waitFor(() => {
        expect(mockGetConfig).toHaveBeenCalled()
      })
      
      // 点击测试连接按钮
      const testButton = screen.getByRole('button', { name: /测试连接/ })
      await user.click(testButton)
      
      // 验证显示测试失败结果
      await waitFor(() => {
        expect(screen.getByText('连接失败')).toBeInTheDocument()
        expect(screen.getByText('API Key 无效')).toBeInTheDocument()
      })
    })
    
    it('应该在创建模式下提示先保存配置', async () => {
      const user = userEvent.setup()
      render(<APIConfigFormView onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // 填写完整表单
      const aliasInput = screen.getByLabelText(/配置别名/)
      await user.type(aliasInput, '测试配置')
      
      const providerSelect = screen.getByRole('combobox', { name: /服务商/ })
      await user.click(providerSelect)
      const openaiOption = await screen.findByRole('option', { name: 'OpenAI' })
      await user.click(openaiOption)
      
      const apiKeyInput = screen.getByLabelText(/API Key/)
      await user.type(apiKeyInput, 'sk-test-key')
      
      const modelInput = screen.getByPlaceholderText(/或输入自定义模型/)
      await user.type(modelInput, 'gpt-4')
      
      // 点击测试连接按钮
      const testButton = screen.getByRole('button', { name: /测试连接/ })
      await user.click(testButton)
      
      // 验证显示提示信息
      await waitFor(() => {
        expect(screen.getByText(/请先保存配置后再测试连接/)).toBeInTheDocument()
      })
      
      // 验证未调用测试方法
      expect(mockTestConfig).not.toHaveBeenCalled()
    })
  })
})
