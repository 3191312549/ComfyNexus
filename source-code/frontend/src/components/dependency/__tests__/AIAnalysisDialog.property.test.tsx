/**
 * AIAnalysisDialog 属性测试
 * 
 * 使用 fast-check 进行属性测试，验证 AI 分析对话框的通用属性
 * 
 * 属性 16: AI 响应流式显示
 * 属性 17: AI 分析卡片非阻塞
 * 属性 18: AI 分析结果复制
 * 验证需求: 8.4, 8.5, 8.6, 8.9
 */

import { describe, beforeEach, expect, vi } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AIAnalysisDialog from '../AIAnalysisDialog'
import { useDependencyStore } from '@/stores/useDependencyStore'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
})

describe('AIAnalysisDialog - 属性测试', () => {
  beforeEach(() => {
    // 重置 store 状态
    useDependencyStore.setState({
      currentEnvId: null,
      logs: [],
      isExecuting: false,
      envInfo: null,
      cudaVersion: '',
      pytorchVersions: [],
      selectedPytorchVersion: '',
      packageName: '',
      packageVersions: [],
      selectedVersion: '',
      installMode: 'install',
      requirementsFile: null,
      aiAnalysisOpen: false,
      aiAnalysisContent: '',
      aiAnalysisStreaming: false,
      mirrorSource: 'official',
      autoFallbackEnabled: true
    })

    // 清除 mock 调用记录
    vi.clearAllMocks()
  })

  /**
   * 属性 16.1: AI 响应流式显示 - 内容拼接
   * 
   * 对于任意 AI 流式响应，每个响应片段到达时应立即更新悬浮卡片的内容，
   * 且内容应按接收顺序拼接
   * 
   * **Validates: Requirements 8.4, 8.5**
   */
  test.prop([
    fc.array(
      fc.string({ minLength: 1, maxLength: 50 }),
      { minLength: 2, maxLength: 10 }
    )
  ], { numRuns: 100 })(
    'AI 响应片段应按顺序拼接显示',
    async (contentChunks) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()

      // 初始渲染（空内容）
      const { rerender } = render(
        <AIAnalysisDialog
          isOpen={true}
          content=""
          isStreaming={true}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 验证：初始状态应该显示等待提示
      expect(screen.getByText('等待 AI 响应...')).toBeInTheDocument()

      // 模拟流式响应：逐步添加内容片段
      let accumulatedContent = ''
      for (const chunk of contentChunks) {
        accumulatedContent += chunk

        rerender(
          <AIAnalysisDialog
            isOpen={true}
            content={accumulatedContent}
            isStreaming={true}
            onClose={onClose}
            onCopy={onCopy}
          />
        )

        // 验证：内容应该包含所有已接收的片段
        await waitFor(() => {
          expect(screen.getByText(accumulatedContent)).toBeInTheDocument()
        })
      }

      // 验证：最终内容应该是所有片段的拼接
      const finalContent = contentChunks.join('')
      expect(screen.getByText(finalContent)).toBeInTheDocument()
    }
  )

  /**
   * 属性 16.2: AI 响应流式显示 - 实时更新
   * 
   * 对于任意 AI 流式响应，内容更新应该是实时的，不应该有延迟
   * 
   * **Validates: Requirements 8.4, 8.5**
   */
  test.prop([
    fc.array(
      fc.string({ minLength: 5, maxLength: 20 }),
      { minLength: 3, maxLength: 8 }
    )
  ], { numRuns: 100 })(
    'AI 响应内容应该实时更新',
    async (contentChunks) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()

      const { rerender } = render(
        <AIAnalysisDialog
          isOpen={true}
          content=""
          isStreaming={true}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 模拟流式响应
      let currentContent = ''
      for (let i = 0; i < contentChunks.length; i++) {
        const previousContent = currentContent
        currentContent += contentChunks[i]

        rerender(
          <AIAnalysisDialog
            isOpen={true}
            content={currentContent}
            isStreaming={true}
            onClose={onClose}
            onCopy={onCopy}
          />
        )

        // 验证：新内容应该立即显示
        await waitFor(() => {
          const displayedText = screen.getByText(currentContent)
          expect(displayedText).toBeInTheDocument()
        })

        // 验证：内容应该包含之前的所有内容
        if (previousContent) {
          expect(currentContent).toContain(previousContent)
        }
      }
    }
  )

  /**
   * 属性 16.3: AI 响应流式显示 - 流式状态指示
   * 
   * 对于任意 AI 流式响应，在流式传输期间应该显示"分析中..."提示
   * 
   * **Validates: Requirements 8.4, 8.5**
   */
  test.prop([
    fc.string({ minLength: 10, maxLength: 100 })
  ], { numRuns: 100 })(
    '流式传输期间应该显示分析中提示',
    (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()

      // 渲染流式状态
      const { rerender } = render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={true}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 验证：应该显示"分析中..."提示
      expect(screen.getByText('分析中...')).toBeInTheDocument()

      // 切换到非流式状态
      rerender(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 验证：不应该再显示"分析中..."提示
      expect(screen.queryByText('分析中...')).not.toBeInTheDocument()
    }
  )

  /**
   * 属性 16.4: AI 响应流式显示 - 空内容处理
   * 
   * 对于空的 AI 响应，应该显示等待提示
   * 
   * **Validates: Requirements 8.4**
   */
  test.prop([
    fc.constant('')
  ], { numRuns: 100 })(
    '空内容应该显示等待提示',
    (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()

      render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={true}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 验证：应该显示等待提示
      expect(screen.getByText('等待 AI 响应...')).toBeInTheDocument()
    }
  )

  /**
   * 属性 17.1: AI 分析卡片非阻塞 - 点击外部不关闭
   * 
   * 对于任意显示的 AI 分析卡片，点击卡片外的空白区域不应关闭卡片
   * 
   * **Validates: Requirements 8.6**
   */
  test.prop([
    fc.string({ minLength: 10, maxLength: 100 })
  ], { numRuns: 100 })(
    '点击外部空白区域不应关闭对话框',
    async (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()
      const user = userEvent.setup()

      render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 验证：对话框应该显示
      expect(screen.getByText('AI 分析结果')).toBeInTheDocument()

      // 查找背景层（半透明背景）
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/20')
      expect(backdrop).toBeInTheDocument()

      // 验证：背景层应该有 pointer-events-none 类（不响应点击）
      expect(backdrop).toHaveClass('pointer-events-none')

      // 点击背景层（应该不会触发关闭）
      if (backdrop) {
        await user.click(backdrop as HTMLElement)
      }

      // 验证：onClose 不应该被调用
      expect(onClose).not.toHaveBeenCalled()

      // 验证：对话框仍然显示
      expect(screen.getByText('AI 分析结果')).toBeInTheDocument()
    }
  )

  /**
   * 属性 17.2: AI 分析卡片非阻塞 - 只能通过关闭按钮关闭
   * 
   * 对于任意显示的 AI 分析卡片，只有点击关闭按钮才能关闭
   * 
   * **Validates: Requirements 8.6**
   */
  test.prop([
    fc.string({ minLength: 10, maxLength: 100 })
  ], { numRuns: 100 })(
    '只能通过关闭按钮关闭对话框',
    async (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()
      const user = userEvent.setup()

      render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 验证：对话框应该显示
      expect(screen.getByText('AI 分析结果')).toBeInTheDocument()

      // 查找关闭按钮（X 图标）
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-x')
      )

      expect(closeButton).toBeInTheDocument()

      // 点击关闭按钮
      if (closeButton) {
        await user.click(closeButton)
      }

      // 验证：onClose 应该被调用
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  )

  /**
   * 属性 17.3: AI 分析卡片非阻塞 - 对话框可见性
   * 
   * 对于任意 isOpen 状态，对话框的显示应该与 isOpen 属性一致
   * 
   * **Validates: Requirements 8.6**
   */
  test.prop([
    fc.record({
      content: fc.string({ minLength: 10, maxLength: 100 }),
      isOpen: fc.boolean()
    })
  ], { numRuns: 100 })(
    '对话框的显示应该与 isOpen 属性一致',
    ({ content, isOpen }) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()

      const { container } = render(
        <AIAnalysisDialog
          isOpen={isOpen}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      if (isOpen) {
        // 验证：对话框应该显示
        expect(screen.getByText('AI 分析结果')).toBeInTheDocument()
        expect(container.querySelector('.fixed.z-50')).toBeInTheDocument()
      } else {
        // 验证：对话框不应该显示
        expect(screen.queryByText('AI 分析结果')).not.toBeInTheDocument()
        expect(container.querySelector('.fixed.z-50')).not.toBeInTheDocument()
      }
    }
  )

  /**
   * 属性 18.1: AI 分析结果复制 - 复制功能
   * 
   * 对于任意 AI 分析结果，点击复制按钮后，剪贴板内容应与分析结果内容完全一致
   * 
   * **Validates: Requirements 8.9**
   */
  test.prop([
    fc.string({ minLength: 10, maxLength: 200 })
  ], { numRuns: 100 })(
    '点击复制按钮应该将内容复制到剪贴板',
    async (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()
      const user = userEvent.setup()

      render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 查找复制按钮（Copy 图标）
      const buttons = screen.getAllByRole('button')
      const copyButton = buttons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-copy')
      )

      expect(copyButton).toBeInTheDocument()

      // 点击复制按钮
      if (copyButton) {
        await user.click(copyButton)
      }

      // 验证：clipboard.writeText 应该被调用，且参数为内容
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(content)
      })

      // 验证：onCopy 回调应该被调用
      expect(onCopy).toHaveBeenCalledTimes(1)
    }
  )

  /**
   * 属性 18.2: AI 分析结果复制 - 流式状态下禁用复制
   * 
   * 对于任意 AI 流式响应，在流式传输期间复制按钮应该被禁用
   * 
   * **Validates: Requirements 8.9**
   */
  test.prop([
    fc.string({ minLength: 10, maxLength: 100 })
  ], { numRuns: 100 })(
    '流式传输期间复制按钮应该被禁用',
    (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()

      render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={true}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 查找复制按钮
      const buttons = screen.getAllByRole('button')
      const copyButton = buttons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-copy')
      )

      expect(copyButton).toBeInTheDocument()

      // 验证：复制按钮应该被禁用
      if (copyButton) {
        expect(copyButton).toBeDisabled()
      }
    }
  )

  /**
   * 属性 18.3: AI 分析结果复制 - 空内容禁用复制
   * 
   * 对于空的 AI 分析结果，复制按钮应该被禁用
   * 
   * **Validates: Requirements 8.9**
   */
  test.prop([
    fc.constant('')
  ], { numRuns: 100 })(
    '空内容时复制按钮应该被禁用',
    (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()

      render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 查找复制按钮
      const buttons = screen.getAllByRole('button')
      const copyButton = buttons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-copy')
      )

      expect(copyButton).toBeInTheDocument()

      // 验证：复制按钮应该被禁用
      if (copyButton) {
        expect(copyButton).toBeDisabled()
      }
    }
  )

  /**
   * 属性 18.4: AI 分析结果复制 - 复制完成后内容不变
   * 
   * 对于任意 AI 分析结果，复制操作不应该改变显示的内容
   * 
   * **Validates: Requirements 8.9**
   */
  test.prop([
    fc.string({ minLength: 10, maxLength: 200 })
  ], { numRuns: 100 })(
    '复制操作不应该改变显示的内容',
    async (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()
      const user = userEvent.setup()

      render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 验证：初始内容应该显示
      expect(screen.getByText(content)).toBeInTheDocument()

      // 查找复制按钮
      const buttons = screen.getAllByRole('button')
      const copyButton = buttons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-copy')
      )

      // 点击复制按钮
      if (copyButton) {
        await user.click(copyButton)
      }

      // 验证：内容应该保持不变
      await waitFor(() => {
        expect(screen.getByText(content)).toBeInTheDocument()
      })
    }
  )

  /**
   * 属性 18.5: AI 分析结果复制 - 多次复制
   * 
   * 对于任意 AI 分析结果，应该支持多次复制操作
   * 
   * **Validates: Requirements 8.9**
   */
  test.prop([
    fc.record({
      content: fc.string({ minLength: 10, maxLength: 100 }),
      copyCount: fc.integer({ min: 2, max: 5 })
    })
  ], { numRuns: 100 })(
    '应该支持多次复制操作',
    async ({ content, copyCount }) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()
      const user = userEvent.setup()

      render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 查找复制按钮
      const buttons = screen.getAllByRole('button')
      const copyButton = buttons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-copy')
      )

      expect(copyButton).toBeInTheDocument()

      // 多次点击复制按钮
      for (let i = 0; i < copyCount; i++) {
        if (copyButton) {
          await user.click(copyButton)
        }
      }

      // 验证：clipboard.writeText 应该被调用多次
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(copyCount)
      })

      // 验证：onCopy 回调应该被调用多次
      expect(onCopy).toHaveBeenCalledTimes(copyCount)

      // 验证：每次调用的参数都应该是相同的内容
      const calls = (navigator.clipboard.writeText as any).mock.calls
      calls.forEach((call: any[]) => {
        expect(call[0]).toBe(content)
      })
    }
  )

  /**
   * 属性 16.5: AI 响应流式显示 - 内容长度不影响显示
   * 
   * 对于任意长度的 AI 响应内容，都应该正确显示
   * 
   * **Validates: Requirements 8.4, 8.5**
   */
  test.prop([
    fc.oneof(
      fc.string({ minLength: 1, maxLength: 10 }),      // 短内容
      fc.string({ minLength: 50, maxLength: 200 }),    // 中等内容
      fc.string({ minLength: 500, maxLength: 1000 })   // 长内容
    )
  ], { numRuns: 100 })(
    '任意长度的内容都应该正确显示',
    (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()

      render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 验证：内容应该显示
      expect(screen.getByText(content)).toBeInTheDocument()

      // 验证：内容区域应该存在
      const contentArea = document.querySelector('.whitespace-pre-wrap')
      expect(contentArea).toBeInTheDocument()
      expect(contentArea?.textContent).toBe(content)
    }
  )

  /**
   * 属性 17.4: AI 分析卡片非阻塞 - 对话框层级
   * 
   * 对于任意显示的 AI 分析卡片，对话框应该在最上层显示（z-index）
   * 
   * **Validates: Requirements 8.6**
   */
  test.prop([
    fc.string({ minLength: 10, maxLength: 100 })
  ], { numRuns: 100 })(
    '对话框应该在最上层显示',
    (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()

      const { container } = render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 查找背景层和对话框
      const backdrop = container.querySelector('.fixed.inset-0.z-40')
      const dialog = container.querySelector('.fixed.z-50')

      // 验证：背景层应该存在且 z-index 为 40
      expect(backdrop).toBeInTheDocument()
      expect(backdrop).toHaveClass('z-40')

      // 验证：对话框应该存在且 z-index 为 50（高于背景层）
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveClass('z-50')
    }
  )

  /**
   * 属性 18.6: AI 分析结果复制 - 复制内容完整性
   * 
   * 对于任意包含特殊字符的 AI 分析结果，复制的内容应该完整保留所有字符
   * 
   * **Validates: Requirements 8.9**
   */
  test.prop([
    fc.oneof(
      fc.constant('包含换行符\n的内容'),
      fc.constant('包含制表符\t的内容'),
      fc.constant('包含特殊字符 !@#$%^&*() 的内容'),
      fc.constant('包含中文、English、123 的混合内容')
    )
  ], { numRuns: 100 })(
    '复制的内容应该完整保留所有字符',
    async (content) => {
      const onClose = vi.fn()
      const onCopy = vi.fn()
      const user = userEvent.setup()

      render(
        <AIAnalysisDialog
          isOpen={true}
          content={content}
          isStreaming={false}
          onClose={onClose}
          onCopy={onCopy}
        />
      )

      // 查找复制按钮
      const buttons = screen.getAllByRole('button')
      const copyButton = buttons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-copy')
      )

      // 点击复制按钮
      if (copyButton) {
        await user.click(copyButton)
      }

      // 验证：复制的内容应该与原内容完全一致
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(content)
      })

      // 验证：内容长度应该一致
      const calls = (navigator.clipboard.writeText as any).mock.calls
      if (calls.length > 0) {
        expect(calls[0][0].length).toBe(content.length)
      }
    }
  )
})
