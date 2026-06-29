/**
 * VersionTabs 组件测试
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VersionTabs } from './VersionTabs'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'version.stable': '稳定版',
        'version.dev': '开发版',
      }
      return translations[key] || key
    },
  }),
}))

describe('VersionTabs', () => {
  it('应该渲染稳定版和开发版标签', () => {
    const onTabChange = vi.fn()
    render(
      <VersionTabs
        activeTab="stable"
        onTabChange={onTabChange}
      />
    )

    expect(screen.getByText('稳定版')).toBeInTheDocument()
    expect(screen.getByText('开发版')).toBeInTheDocument()
  })

  it('应该显示版本数量', () => {
    const onTabChange = vi.fn()
    render(
      <VersionTabs
        activeTab="stable"
        onTabChange={onTabChange}
        stableCount={10}
        devCount={5}
      />
    )

    expect(screen.getByText('(10)')).toBeInTheDocument()
    expect(screen.getByText('(5)')).toBeInTheDocument()
  })

  it('应该高亮激活的标签', () => {
    const onTabChange = vi.fn()
    const { container } = render(
      <VersionTabs
        activeTab="stable"
        onTabChange={onTabChange}
      />
    )

    const stableButton = screen.getByText('稳定版').closest('button')
    expect(stableButton).toHaveClass('text-foreground')
  })

  it('应该在点击标签时调用 onTabChange', () => {
    const onTabChange = vi.fn()
    render(
      <VersionTabs
        activeTab="stable"
        onTabChange={onTabChange}
      />
    )

    const devButton = screen.getByText('开发版')
    fireEvent.click(devButton)

    expect(onTabChange).toHaveBeenCalledWith('dev')
  })

  it('应该显示激活指示器', () => {
    const onTabChange = vi.fn()
    const { container } = render(
      <VersionTabs
        activeTab="stable"
        onTabChange={onTabChange}
      />
    )

    const indicators = container.querySelectorAll('.bg-primary')
    expect(indicators.length).toBe(1)
  })

  it('开发版标签应该使用黄色指示器', () => {
    const onTabChange = vi.fn()
    const { container } = render(
      <VersionTabs
        activeTab="dev"
        onTabChange={onTabChange}
      />
    )

    const indicator = container.querySelector('.bg-yellow-500')
    expect(indicator).toBeInTheDocument()
  })
})
