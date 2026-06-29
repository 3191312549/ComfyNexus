/**
 * VersionCard 组件测试
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VersionCard } from './VersionCard'
import { VersionInfo } from '@/types/version'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'version.currentVersion': '当前版本',
        'version.latestVersion': '最新版本',
        'version.dev': '开发版',
        'version.switchVersion': '切换版本',
        'version.switching': '正在切换版本...',
        'version.devWarningMessage': '开发版可能不稳定，仅供测试使用',
      }
      return translations[key] || key
    },
  }),
}))

const mockStableVersion: VersionInfo = {
  id: 'abc1234',
  tag: 'v1.0.0',
  timestamp: '2024-01-20T10:00:00Z',
  message: 'Release v1.0.0\n- New feature A\n- Bug fix B',
  type: 'stable',
  author: 'Test Author',
}

const mockDevVersion: VersionInfo = {
  id: 'def5678',
  timestamp: '2024-01-21T10:00:00Z',
  message: 'Development build',
  type: 'dev',
  author: 'Dev Author',
}

describe('VersionCard', () => {
  it('应该渲染稳定版信息', () => {
    render(<VersionCard version={mockStableVersion} />)

    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('abc1234')).toBeInTheDocument()
    expect(screen.getByText('Test Author')).toBeInTheDocument()
    expect(screen.getByText(/Release v1.0.0/)).toBeInTheDocument()
  })

  it('应该渲染开发版信息', () => {
    render(<VersionCard version={mockDevVersion} />)

    expect(screen.getAllByText('def5678').length).toBeGreaterThan(0)
    expect(screen.getByText('开发版')).toBeInTheDocument()
    expect(screen.getByText('Development build')).toBeInTheDocument()
  })

  it('应该显示当前版本标签', () => {
    render(<VersionCard version={mockStableVersion} isCurrent={true} />)

    expect(screen.getByText('当前版本')).toBeInTheDocument()
  })

  it('应该显示最新版本标签', () => {
    render(<VersionCard version={mockStableVersion} isLatest={true} />)

    expect(screen.getByText('最新版本')).toBeInTheDocument()
  })

  it('当前版本不应该显示最新版本标签', () => {
    render(
      <VersionCard
        version={mockStableVersion}
        isCurrent={true}
        isLatest={true}
      />
    )

    expect(screen.getByText('当前版本')).toBeInTheDocument()
    expect(screen.queryByText('最新版本')).not.toBeInTheDocument()
  })

  it('应该显示开发版警告', () => {
    render(<VersionCard version={mockDevVersion} />)

    expect(screen.getByText(/开发版可能不稳定/)).toBeInTheDocument()
  })

  it('应该显示切换版本按钮', () => {
    const onSwitch = vi.fn()
    render(
      <VersionCard
        version={mockStableVersion}
        onSwitch={onSwitch}
      />
    )

    const switchButton = screen.getByText('切换版本')
    expect(switchButton).toBeInTheDocument()

    fireEvent.click(switchButton)
    expect(onSwitch).toHaveBeenCalledWith(mockStableVersion)
  })

  it('当前版本不应该显示切换按钮', () => {
    const onSwitch = vi.fn()
    render(
      <VersionCard
        version={mockStableVersion}
        isCurrent={true}
        onSwitch={onSwitch}
      />
    )

    expect(screen.queryByText('切换版本')).not.toBeInTheDocument()
  })

  it('切换中应该禁用按钮', () => {
    const onSwitch = vi.fn()
    render(
      <VersionCard
        version={mockStableVersion}
        onSwitch={onSwitch}
        switching={true}
      />
    )

    const switchButton = screen.getByText('正在切换版本...')
    expect(switchButton).toBeDisabled()
  })

  it('开发版卡片应该有黄色边框', () => {
    const { container } = render(<VersionCard version={mockDevVersion} />)

    const card = container.firstChild
    expect(card).toHaveClass('border-yellow-500/50')
  })

  it('当前版本应该有高亮边框', () => {
    const { container } = render(
      <VersionCard version={mockStableVersion} isCurrent={true} />
    )

    const card = container.firstChild
    expect(card).toHaveClass('ring-2', 'ring-primary')
  })
})
