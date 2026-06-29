/**
 * VersionConfirmDialog 组件测试
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VersionConfirmDialog } from './ConfirmDialog'
import { VersionInfo } from '@/types/version'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'version.confirmSwitch': '确认版本切换',
        'version.confirmSwitchMessage': '确认进行版本更新/降级？',
        'version.from': '从',
        'version.to': '到',
        'version.switchSteps': '此操作将：',
        'version.step1': '1. 切换 Git 版本',
        'version.step2': '2. 检查并更新依赖（如需要）',
        'version.step3': '3. 自动重启 ComfyUI 进程',
        'common.cancel': '取消',
        'common.confirm': '确认',
      }
      return translations[key] || key
    },
  })),
}))

const mockCurrentVersion: VersionInfo = {
  id: 'abc1234',
  tag: 'v1.0.0',
  timestamp: '2024-01-20T10:00:00Z',
  message: 'Release v1.0.0',
  type: 'stable',
}

const mockTargetVersion: VersionInfo = {
  id: 'def5678',
  tag: 'v1.1.0',
  timestamp: '2024-01-21T10:00:00Z',
  message: 'Release v1.1.0',
  type: 'stable',
}

describe('VersionConfirmDialog', () => {
  it('应该在打开时渲染对话框', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <VersionConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        currentVersion={mockCurrentVersion}
        targetVersion={mockTargetVersion}
        onConfirm={onConfirm}
      />
    )

    expect(screen.getByText('确认版本切换')).toBeInTheDocument()
    expect(screen.getByText('确认进行版本更新/降级？')).toBeInTheDocument()
  })

  it('应该显示当前版本和目标版本', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <VersionConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        currentVersion={mockCurrentVersion}
        targetVersion={mockTargetVersion}
        onConfirm={onConfirm}
      />
    )

    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('v1.1.0')).toBeInTheDocument()
  })

  it('应该显示操作步骤', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <VersionConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        currentVersion={mockCurrentVersion}
        targetVersion={mockTargetVersion}
        onConfirm={onConfirm}
      />
    )

    expect(screen.getByText('此操作将：')).toBeInTheDocument()
    expect(screen.getByText('1. 切换 Git 版本')).toBeInTheDocument()
    expect(screen.getByText('2. 检查并更新依赖（如需要）')).toBeInTheDocument()
    expect(screen.getByText('3. 自动重启 ComfyUI 进程')).toBeInTheDocument()
  })

  it('应该在点击确认时调用 onConfirm', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <VersionConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        currentVersion={mockCurrentVersion}
        targetVersion={mockTargetVersion}
        onConfirm={onConfirm}
      />
    )

    const confirmButton = screen.getByText('确认')
    fireEvent.click(confirmButton)

    expect(onConfirm).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('应该在点击取消时关闭对话框', () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()

    render(
      <VersionConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        currentVersion={mockCurrentVersion}
        targetVersion={mockTargetVersion}
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
      <VersionConfirmDialog
        open={false}
        onOpenChange={onOpenChange}
        currentVersion={mockCurrentVersion}
        targetVersion={mockTargetVersion}
        onConfirm={onConfirm}
      />
    )

    expect(screen.queryByText('确认版本切换')).not.toBeInTheDocument()
  })
})
