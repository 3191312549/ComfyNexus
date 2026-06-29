/**
 * GitPermissionFixDialog 组件测试
 * 
 * 测试内容：
 * - 对话框渲染
 * - 确认界面显示
 * - 进度显示更新
 * - 结果展示
 * - 失败详情展示
 * - API 调用
 * 
 * **验证需求：3.2, 3.3, 3.4, 3.5**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GitPermissionFixDialog } from '../GitPermissionFixDialog'
import { pluginService } from '@/services/pluginService'
import type { GitPermissionFixResponse } from '@/types/plugin'

// Mock pluginService
vi.mock('@/services/pluginService', () => ({
  pluginService: {
    fixGitPermissions: vi.fn(),
  },
}))

describe('GitPermissionFixDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('确认阶段', () => {
    it('应该在打开时显示确认界面', () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      // 验证标题
      expect(screen.getByText('修复 Git 权限')).toBeInTheDocument()
      expect(screen.getByText('批量修复所有插件仓库的权限问题')).toBeInTheDocument()

      // 验证操作说明
      expect(screen.getByText('📋 操作说明')).toBeInTheDocument()
      expect(screen.getByText(/扫描所有已安装的插件仓库/)).toBeInTheDocument()
      expect(screen.getByText(/检测存在权限问题的仓库/)).toBeInTheDocument()

      // 验证修复原理
      expect(screen.getByText('🔧 修复原理')).toBeInTheDocument()
      expect(screen.getByText(/git config --global --add safe.directory/)).toBeInTheDocument()

      // 验证注意事项
      expect(screen.getByText('⚠️ 注意事项')).toBeInTheDocument()
      expect(screen.getByText(/修复过程中请勿关闭窗口/)).toBeInTheDocument()

      // 验证按钮
      expect(screen.getByText('取消')).toBeInTheDocument()
      expect(screen.getByText('开始修复')).toBeInTheDocument()
    })

    it('关闭时不应该渲染对话框内容', () => {
      const onClose = vi.fn()

      render(
        <GitPermissionFixDialog
          open={false}
          onClose={onClose}
        />
      )

      // 对话框关闭时，内容不应该显示
      expect(screen.queryByText('修复 Git 权限')).not.toBeInTheDocument()
    })

    it('应该在点击取消按钮时调用 onClose', () => {
      const onClose = vi.fn()

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
        />
      )

      const cancelButton = screen.getByText('取消')
      fireEvent.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('应该在点击开始修复按钮时开始修复流程', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      // Mock 成功的 API 响应
      const mockResponse: GitPermissionFixResponse = {
        success: true,
        total: 10,
        fixed: 10,
        failed: 0,
        failed_repos: [],
        duration: 5.5,
      }

      vi.mocked(pluginService.fixGitPermissions).mockResolvedValue(mockResponse)

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      // 等待进入修复阶段
      await waitFor(() => {
        expect(screen.getByText('正在修复权限')).toBeInTheDocument()
      })
    })
  })

  describe('修复阶段', () => {
    it('应该显示进度条和当前处理信息', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      // Mock 成功的 API 响应（延迟返回以便观察进度）
      const mockResponse: GitPermissionFixResponse = {
        success: true,
        total: 10,
        fixed: 10,
        failed: 0,
        failed_repos: [],
        duration: 5.5,
      }

      vi.mocked(pluginService.fixGitPermissions).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      )

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      // 点击开始修复
      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      // 等待进入修复阶段
      await waitFor(() => {
        expect(screen.getByText('正在修复权限')).toBeInTheDocument()
      })

      // 验证进度显示
      expect(screen.getByText('修复进度')).toBeInTheDocument()
      expect(screen.getByText('当前处理')).toBeInTheDocument()
      expect(screen.getByText(/正在扫描插件仓库/)).toBeInTheDocument()

      // 验证提示信息
      expect(screen.getByText('修复过程中请勿关闭窗口')).toBeInTheDocument()
    })

    it('修复过程中不应该允许关闭对话框', async () => {
      const onClose = vi.fn()

      // Mock 延迟的 API 响应
      const mockResponse: GitPermissionFixResponse = {
        success: true,
        total: 10,
        fixed: 10,
        failed: 0,
        failed_repos: [],
        duration: 5.5,
      }

      vi.mocked(pluginService.fixGitPermissions).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 200))
      )

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
        />
      )

      // 点击开始修复
      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      // 等待进入修复阶段
      await waitFor(() => {
        expect(screen.getByText('正在修复权限')).toBeInTheDocument()
      })

      // 尝试关闭对话框（通过调用 onOpenChange）
      // 注意：在修复阶段，handleClose 会检查 stage 并阻止关闭
      // 这里我们无法直接测试，因为 Dialog 的 onOpenChange 是内部处理的
      // 但我们可以验证没有关闭按钮
      expect(screen.queryByText('关闭')).not.toBeInTheDocument()
    })
  })

  describe('完成阶段 - 成功场景', () => {
    it('应该显示成功的修复结果摘要', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      // Mock 成功的 API 响应
      const mockResponse: GitPermissionFixResponse = {
        success: true,
        total: 10,
        fixed: 10,
        failed: 0,
        failed_repos: [],
        duration: 5.5,
      }

      vi.mocked(pluginService.fixGitPermissions).mockResolvedValue(mockResponse)

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      // 点击开始修复
      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      // 等待修复完成
      await waitFor(() => {
        expect(screen.getByText('修复完成')).toBeInTheDocument()
      })

      // 验证结果摘要
      expect(screen.getByText('修复摘要')).toBeInTheDocument()
      expect(screen.getAllByText('10')).toHaveLength(2) // 总数和成功数都是 10
      expect(screen.getByText('0')).toBeInTheDocument() // 失败数
      expect(screen.getByText(/5\.5 秒/)).toBeInTheDocument() // 耗时

      // 验证成功提示
      expect(screen.getByText('全部修复成功')).toBeInTheDocument()
      expect(screen.getByText(/所有插件仓库的权限问题已成功修复/)).toBeInTheDocument()

      // 验证 onComplete 被调用
      expect(onComplete).toHaveBeenCalled()

      // 验证关闭按钮可用
      expect(screen.getByText('关闭')).toBeInTheDocument()
    })

    it('应该正确格式化耗时显示', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      // Mock 不同耗时的响应
      const mockResponse: GitPermissionFixResponse = {
        success: true,
        total: 100,
        fixed: 100,
        failed: 0,
        failed_repos: [],
        duration: 125.7, // 2分5秒
      }

      vi.mocked(pluginService.fixGitPermissions).mockResolvedValue(mockResponse)

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('修复完成')).toBeInTheDocument()
      })

      // 验证耗时格式化为分钟和秒
      expect(screen.getByText(/2 分 5 秒/)).toBeInTheDocument()
    })
  })

  describe('完成阶段 - 部分失败场景', () => {
    it('应该显示部分失败的修复结果', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      // Mock 部分失败的 API 响应
      const mockResponse: GitPermissionFixResponse = {
        success: true,
        total: 10,
        fixed: 7,
        failed: 3,
        failed_repos: [
          {
            name: 'plugin-1',
            path: '/path/to/plugin-1',
            error: '仓库路径不存在',
          },
          {
            name: 'plugin-2',
            path: '/path/to/plugin-2',
            error: 'Git 命令执行失败',
          },
          {
            name: 'plugin-3',
            path: '/path/to/plugin-3',
            error: '权限不足',
          },
        ],
        duration: 8.2,
      }

      vi.mocked(pluginService.fixGitPermissions).mockResolvedValue(mockResponse)

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('修复完成')).toBeInTheDocument()
      })

      // 验证结果摘要
      expect(screen.getByText('10')).toBeInTheDocument() // 总数
      expect(screen.getByText('7')).toBeInTheDocument() // 成功数
      expect(screen.getByText('3')).toBeInTheDocument() // 失败数

      // 验证部分成功提示
      expect(screen.getByText('部分修复成功')).toBeInTheDocument()
      expect(screen.getByText(/部分仓库修复失败/)).toBeInTheDocument()

      // 验证失败详情标题
      expect(screen.getByText(/失败详情 \(3\)/)).toBeInTheDocument()
    })

    it('应该能够展开和折叠失败详情', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      const mockResponse: GitPermissionFixResponse = {
        success: true,
        total: 10,
        fixed: 8,
        failed: 2,
        failed_repos: [
          {
            name: 'failed-plugin-1',
            path: '/path/to/failed-plugin-1',
            error: '错误原因 1',
          },
          {
            name: 'failed-plugin-2',
            path: '/path/to/failed-plugin-2',
            error: '错误原因 2',
          },
        ],
        duration: 6.0,
      }

      vi.mocked(pluginService.fixGitPermissions).mockResolvedValue(mockResponse)

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('修复完成')).toBeInTheDocument()
      })

      // 初始状态：失败详情应该是折叠的
      expect(screen.queryByText('failed-plugin-1')).not.toBeInTheDocument()

      // 点击展开失败详情
      const toggleButton = screen.getByText(/失败详情 \(2\)/)
      fireEvent.click(toggleButton)

      // 验证失败详情显示
      await waitFor(() => {
        expect(screen.getByText('failed-plugin-1')).toBeInTheDocument()
        expect(screen.getByText('failed-plugin-2')).toBeInTheDocument()
        expect(screen.getByText('/path/to/failed-plugin-1')).toBeInTheDocument()
        expect(screen.getByText('错误原因 1')).toBeInTheDocument()
      })

      // 再次点击折叠
      fireEvent.click(toggleButton)

      // 验证失败详情隐藏
      await waitFor(() => {
        expect(screen.queryByText('/path/to/failed-plugin-1')).not.toBeInTheDocument()
      })
    })
  })

  describe('完成阶段 - 错误场景', () => {
    it('应该显示 API 错误信息', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      // Mock 失败的 API 响应
      const mockResponse: GitPermissionFixResponse = {
        success: false,
        error: 'Git 未安装或不在 PATH 中',
      }

      vi.mocked(pluginService.fixGitPermissions).mockResolvedValue(mockResponse)

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('修复失败')).toBeInTheDocument()
      })

      // 验证错误信息显示
      expect(screen.getByText('错误信息')).toBeInTheDocument()
      expect(screen.getByText('Git 未安装或不在 PATH 中')).toBeInTheDocument()

      // 验证不显示结果摘要
      expect(screen.queryByText('修复摘要')).not.toBeInTheDocument()
    })

    it('应该处理 API 调用异常', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      // Mock API 抛出异常
      vi.mocked(pluginService.fixGitPermissions).mockRejectedValue(
        new Error('网络连接失败')
      )

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('修复失败')).toBeInTheDocument()
      })

      // 验证异常信息显示
      expect(screen.getByText('网络连接失败')).toBeInTheDocument()
    })
  })

  describe('对话框生命周期', () => {
    it('应该在对话框关闭后重置状态', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      const mockResponse: GitPermissionFixResponse = {
        success: true,
        total: 5,
        fixed: 5,
        failed: 0,
        failed_repos: [],
        duration: 3.0,
      }

      vi.mocked(pluginService.fixGitPermissions).mockResolvedValue(mockResponse)

      const { rerender } = render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      // 执行修复
      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('修复完成')).toBeInTheDocument()
      })

      // 关闭对话框
      rerender(
        <GitPermissionFixDialog
          open={false}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      // 等待状态重置（延迟 300ms）
      await new Promise(resolve => setTimeout(resolve, 400))

      // 重新打开对话框
      rerender(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      // 验证回到确认阶段
      await waitFor(() => {
        expect(screen.getByText('开始修复')).toBeInTheDocument()
      })
      expect(screen.queryByText('修复完成')).not.toBeInTheDocument()
    })
  })

  describe('API 调用', () => {
    it('应该调用 pluginService.fixGitPermissions', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      const mockResponse: GitPermissionFixResponse = {
        success: true,
        total: 5,
        fixed: 5,
        failed: 0,
        failed_repos: [],
        duration: 2.5,
      }

      vi.mocked(pluginService.fixGitPermissions).mockResolvedValue(mockResponse)

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(pluginService.fixGitPermissions).toHaveBeenCalled()
      })
    })

    it('修复成功后应该调用 onComplete 回调', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      const mockResponse: GitPermissionFixResponse = {
        success: true,
        total: 5,
        fixed: 5,
        failed: 0,
        failed_repos: [],
        duration: 2.5,
      }

      vi.mocked(pluginService.fixGitPermissions).mockResolvedValue(mockResponse)

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled()
      })
    })

    it('修复失败时不应该调用 onComplete 回调', async () => {
      const onClose = vi.fn()
      const onComplete = vi.fn()

      const mockResponse: GitPermissionFixResponse = {
        success: false,
        error: '修复失败',
      }

      vi.mocked(pluginService.fixGitPermissions).mockResolvedValue(mockResponse)

      render(
        <GitPermissionFixDialog
          open={true}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

      const startButton = screen.getByText('开始修复')
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getAllByText('修复失败')).toHaveLength(2) // 标题和错误消息
      })

      // 验证 onComplete 没有被调用
      expect(onComplete).not.toHaveBeenCalled()
    })
  })
})
