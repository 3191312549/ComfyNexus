/**
 * DevWarningDialog 组件测试
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DevWarningDialog } from './DevWarningDialog'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'version.devWarningTitle': '开发版风险提示',
        'version.devWarningMessage': '开发版包含最新的代码更改，可能存在以下风险：',
        'version.devWarningRisk1': '• 功能不稳定，可能导致崩溃',
        'version.devWarningRisk2': '• 插件兼容性问题',
        'version.devWarningRisk3': '• 数据丢失风险',
        'version.devWarningNote': '建议仅在测试环境中使用开发版。',
        'version.dontShowAgain': '不再提示',
        'version.iKnow': '我知道了',
        'common.cancel': '取消',
      }
      return translations[key] || key
    },
  }),
}))

describe('DevWarningDialog', () => {
  it('应该在打开时渲染对话框', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <DevWarningDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    )

    expect(screen.getByText('开发版风险提示')).toBeInTheDocument()
    expect(screen.getByText(/开发版包含最新的代码更改/)).toBeInTheDocument()
  })

  it('应该显示风险列表', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <DevWarningDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    )

    expect(screen.getByText('• 功能不稳定，可能导致崩溃')).toBeInTheDocument()
    expect(screen.getByText('• 插件兼容性问题')).toBeInTheDocument()
    expect(screen.getByText('• 数据丢失风险')).toBeInTheDocument()
  })

  it('应该显示警告提示', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <DevWarningDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    )

    expect(screen.getByText('建议仅在测试环境中使用开发版。')).toBeInTheDocument()
  })

  it('应该显示不再提示复选框', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <DevWarningDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    )

    expect(screen.getByText('不再提示')).toBeInTheDocument()
  })

  it('应该在点击确认时调用 onConfirm', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <DevWarningDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    )

    const confirmButton = screen.getByText('我知道了')
    fireEvent.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledWith(false)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('应该在勾选不再提示后传递 true', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <DevWarningDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    const confirmButton = screen.getByText('我知道了')
    fireEvent.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledWith(true)
  })

  it('应该在点击取消时关闭对话框', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <DevWarningDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    )

    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('关闭时不应该渲染对话框', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <DevWarningDialog
        open={false}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    )

    expect(screen.queryByText('开发版风险提示')).not.toBeInTheDocument()
  })
})
