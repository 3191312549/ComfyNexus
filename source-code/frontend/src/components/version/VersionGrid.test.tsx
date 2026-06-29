/**
 * VersionGrid 组件测试
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VersionGrid } from './VersionGrid'
import { VersionInfo } from '@/types/version'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'version.noVersions': '暂无版本',
        'version.loading': '加载中...',
        'version.loadMore': '加载更多',
      }
      return translations[key] || key
    },
  }),
}))

const mockVersions: VersionInfo[] = [
  {
    id: 'abc1234',
    tag: 'v1.0.0',
    timestamp: '2024-01-20T10:00:00Z',
    message: 'Release v1.0.0',
    type: 'stable',
    author: 'Test Author',
  },
  {
    id: 'def5678',
    tag: 'v1.1.0',
    timestamp: '2024-01-21T10:00:00Z',
    message: 'Release v1.1.0',
    type: 'stable',
    author: 'Test Author',
  },
]

describe('VersionGrid', () => {
  it('应该渲染版本列表', () => {
    const renderCard = vi.fn((version) => (
      <div data-testid={`version-${version.id}`}>{version.tag}</div>
    ))

    render(
      <VersionGrid
        versions={mockVersions}
        renderCard={renderCard}
      />
    )

    expect(screen.getByTestId('version-abc1234')).toBeInTheDocument()
    expect(screen.getByTestId('version-def5678')).toBeInTheDocument()
    expect(renderCard).toHaveBeenCalledTimes(2)
  })

  it('应该显示空状态', () => {
    const renderCard = vi.fn()

    render(
      <VersionGrid
        versions={[]}
        renderCard={renderCard}
      />
    )

    expect(screen.getByText('暂无版本')).toBeInTheDocument()
  })

  it('应该显示自定义空状态消息', () => {
    const renderCard = vi.fn()

    render(
      <VersionGrid
        versions={[]}
        renderCard={renderCard}
        emptyMessage="没有找到版本"
      />
    )

    expect(screen.getByText('没有找到版本')).toBeInTheDocument()
  })

  it('应该显示加载更多按钮', () => {
    const renderCard = vi.fn((version) => <div>{version.tag}</div>)
    const onLoadMore = vi.fn()

    render(
      <VersionGrid
        versions={mockVersions}
        hasMore={true}
        onLoadMore={onLoadMore}
        renderCard={renderCard}
      />
    )

    const loadMoreButton = screen.getByText('加载更多')
    expect(loadMoreButton).toBeInTheDocument()

    fireEvent.click(loadMoreButton)
    expect(onLoadMore).toHaveBeenCalled()
  })

  it('加载时应该禁用加载更多按钮', () => {
    const renderCard = vi.fn((version) => <div>{version.tag}</div>)
    const onLoadMore = vi.fn()

    render(
      <VersionGrid
        versions={mockVersions}
        loading={true}
        hasMore={true}
        onLoadMore={onLoadMore}
        renderCard={renderCard}
      />
    )

    const loadMoreButton = screen.getByText('加载中...')
    expect(loadMoreButton).toBeDisabled()
  })

  it('应该显示初始加载状态', () => {
    const renderCard = vi.fn()

    const { container } = render(
      <VersionGrid
        versions={[]}
        loading={true}
        renderCard={renderCard}
      />
    )

    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('应该使用响应式网格布局', () => {
    const renderCard = vi.fn((version) => <div>{version.tag}</div>)

    const { container } = render(
      <VersionGrid
        versions={mockVersions}
        renderCard={renderCard}
      />
    )

    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('sm:grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
  })
})
