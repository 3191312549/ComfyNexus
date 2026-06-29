/**
 * GitPermissionHelpDialog 组件测试
 * 
 * 测试内容：
 * - 对话框渲染
 * - 帮助内容是否包含所需信息
 * - 关闭按钮功能
 * 
 * **验证需求：4.1, 4.3, 4.5**
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GitPermissionHelpDialog } from '../GitPermissionHelpDialog'

describe('GitPermissionHelpDialog', () => {
  it('应该在打开时渲染对话框', () => {
    const onClose = vi.fn()

    render(
      <GitPermissionHelpDialog
        open={true}
        onClose={onClose}
      />
    )

    // 验证标题显示
    expect(screen.getByText('关于 Git 仓库权限问题')).toBeInTheDocument()
    expect(screen.getByText('了解权限问题的原因和解决方法')).toBeInTheDocument()
  })

  it('关闭时不应该渲染对话框内容', () => {
    const onClose = vi.fn()

    render(
      <GitPermissionHelpDialog
        open={false}
        onClose={onClose}
      />
    )

    // 对话框关闭时，内容不应该显示
    expect(screen.queryByText('关于 Git 仓库权限问题')).not.toBeInTheDocument()
  })

  it('应该显示权限问题的原因说明', () => {
    const onClose = vi.fn()

    render(
      <GitPermissionHelpDialog
        open={true}
        onClose={onClose}
      />
    )

    // 验证问题原因部分
    expect(screen.getByText('🔍 为什么会出现权限问题？')).toBeInTheDocument()
    expect(screen.getByText(/重装操作系统后/)).toBeInTheDocument()
    expect(screen.getByText(/切换到不同的 Windows 用户账户/)).toBeInTheDocument()
  })


  it('应该显示权限问题的表现说明', () => {
    const onClose = vi.fn()

    render(
      <GitPermissionHelpDialog
        open={true}
        onClose={onClose}
      />
    )

    // 验证问题表现部分
    expect(screen.getByText('⚠️ 权限问题有什么表现？')).toBeInTheDocument()
    expect(screen.getByText(/无法获取插件的 GitHub 信息/)).toBeInTheDocument()
    expect(screen.getByText(/无法检查插件更新/)).toBeInTheDocument()
    expect(screen.getByText(/Git 操作失败/)).toBeInTheDocument()
  })

  it('应该显示修复功能的工作原理', () => {
    const onClose = vi.fn()

    render(
      <GitPermissionHelpDialog
        open={true}
        onClose={onClose}
      />
    )

    // 验证修复原理部分
    expect(screen.getByText('🔧 修复功能如何工作？')).toBeInTheDocument()
    expect(screen.getByText(/Git 2.35.2 版本引入了安全机制/)).toBeInTheDocument()
    expect(screen.getByText(/修复功能通过将插件仓库路径添加到/)).toBeInTheDocument()
    // 验证命令示例
    expect(screen.getByText(/git config --global --add safe.directory/)).toBeInTheDocument()
  })

  it('应该显示安全性说明', () => {
    const onClose = vi.fn()

    render(
      <GitPermissionHelpDialog
        open={true}
        onClose={onClose}
      />
    )

    // 验证安全性说明部分
    expect(screen.getByText('🛡️ 这样做安全吗？')).toBeInTheDocument()
    expect(screen.getByText(/是的，这是安全的/)).toBeInTheDocument()
    expect(screen.getByText(/修改 Git 的全局配置文件/)).toBeInTheDocument()
    expect(screen.getByText(/不会修改任何插件文件或系统设置/)).toBeInTheDocument()
    expect(screen.getByText(/这是 Git 官方推荐的解决方案/)).toBeInTheDocument()
  })

  it('应该显示提示信息', () => {
    const onClose = vi.fn()

    render(
      <GitPermissionHelpDialog
        open={true}
        onClose={onClose}
      />
    )

    // 验证提示部分
    expect(screen.getByText('💡 提示')).toBeInTheDocument()
    expect(screen.getByText(/修复操作是一次性的/)).toBeInTheDocument()
    expect(screen.getByText(/配置后会永久生效/)).toBeInTheDocument()
  })

  it('应该在点击关闭按钮时调用 onClose', () => {
    const onClose = vi.fn()

    render(
      <GitPermissionHelpDialog
        open={true}
        onClose={onClose}
      />
    )

    // 查找并点击关闭按钮
    const closeButton = screen.getByText('我知道了')
    fireEvent.click(closeButton)

    // 验证 onClose 被调用
    expect(onClose).toHaveBeenCalled()
  })

  it('应该包含所有必需的帮助内容部分', () => {
    const onClose = vi.fn()

    render(
      <GitPermissionHelpDialog
        open={true}
        onClose={onClose}
      />
    )

    // 验证所有四个主要部分都存在
    expect(screen.getByText('🔍 为什么会出现权限问题？')).toBeInTheDocument()
    expect(screen.getByText('⚠️ 权限问题有什么表现？')).toBeInTheDocument()
    expect(screen.getByText('🔧 修复功能如何工作？')).toBeInTheDocument()
    expect(screen.getByText('🛡️ 这样做安全吗？')).toBeInTheDocument()
    expect(screen.getByText('💡 提示')).toBeInTheDocument()
  })
})
