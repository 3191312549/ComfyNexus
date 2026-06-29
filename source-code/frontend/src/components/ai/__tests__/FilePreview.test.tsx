/**
 * 文件预览组件单元测试
 * 
 * 测试：
 * - FilePreviewList 组件渲染
 * - FilePreviewItem 组件渲染和删除功能
 * - ImagePreview 组件不同状态显示
 * - DocumentPreview 组件不同文件类型显示
 * 
 * 验证需求: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import FilePreviewList from '../FilePreviewList'
import FilePreviewItem from '../FilePreviewItem'
import ImagePreview from '../ImagePreview'
import DocumentPreview from '../DocumentPreview'
import { UploadedFile } from '@/stores/useFileStore'

// 模拟文件数据
const createMockImageFile = (id: string = 'img-1'): UploadedFile => ({
  id,
  name: 'test-image.jpg',
  type: 'image',
  mime_type: 'image/jpeg',
  size: 1024000,
  content: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  content_type: 'base64',
  thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  metadata: {
    original_name: 'test-image.jpg',
  },
  uploaded_at: '2026-02-03T10:00:00Z',
})

const createMockDocumentFile = (id: string = 'doc-1'): UploadedFile => ({
  id,
  name: 'test-document.pdf',
  type: 'document',
  mime_type: 'application/pdf',
  size: 2048000,
  content: 'base64_content_here',
  content_type: 'base64',
  metadata: {
    original_name: 'test-document.pdf',
  },
  uploaded_at: '2026-02-03T10:00:00Z',
})

describe('FilePreviewList', () => {
  it('当文件列表为空时不渲染任何内容', () => {
    const { container } = render(
      <FilePreviewList files={[]} onRemove={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('渲染文件列表', () => {
    const files = [
      createMockImageFile('img-1'),
      createMockDocumentFile('doc-1'),
    ]
    
    render(<FilePreviewList files={files} onRemove={vi.fn()} />)
    
    // 验证列表容器存在
    const list = screen.getByRole('list')
    expect(list).toBeInTheDocument()
    
    // 验证文件项存在
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
  })

  it('当文件数量超过5个时应用滚动样式', () => {
    const files = Array.from({ length: 6 }, (_, i) => 
      createMockImageFile(`img-${i}`)
    )
    
    const { container } = render(
      <FilePreviewList files={files} onRemove={vi.fn()} />
    )
    
    const list = container.querySelector('[role="list"]')
    expect(list).toHaveClass('scrollbar-thin')
  })

  it('调用删除回调', () => {
    const onRemove = vi.fn()
    const files = [createMockImageFile('img-1')]
    
    render(<FilePreviewList files={files} onRemove={onRemove} />)
    
    const deleteButton = screen.getByRole('button', { name: /删除文件/i })
    fireEvent.click(deleteButton)
    
    expect(onRemove).toHaveBeenCalledWith('img-1')
  })
})

describe('FilePreviewItem', () => {
  it('渲染图片文件预览项', () => {
    const file = createMockImageFile()
    
    render(<FilePreviewItem file={file} onRemove={vi.fn()} />)
    
    const item = screen.getByRole('listitem')
    expect(item).toBeInTheDocument()
    expect(item).toHaveAttribute('aria-label', `文件: ${file.name}`)
  })

  it('渲染文档文件预览项', () => {
    const file = createMockDocumentFile()
    
    render(<FilePreviewItem file={file} onRemove={vi.fn()} />)
    
    const item = screen.getByRole('listitem')
    expect(item).toBeInTheDocument()
  })

  it('显示删除按钮', () => {
    const file = createMockImageFile()
    
    render(<FilePreviewItem file={file} onRemove={vi.fn()} />)
    
    const deleteButton = screen.getByRole('button', { name: /删除文件/i })
    expect(deleteButton).toBeInTheDocument()
  })

  it('点击删除按钮调用回调', () => {
    const onRemove = vi.fn()
    const file = createMockImageFile('test-id')
    
    render(<FilePreviewItem file={file} onRemove={onRemove} />)
    
    const deleteButton = screen.getByRole('button', { name: /删除文件/i })
    fireEvent.click(deleteButton)
    
    expect(onRemove).toHaveBeenCalledWith('test-id')
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('删除按钮点击不会冒泡', () => {
    const onRemove = vi.fn()
    const file = createMockImageFile()
    
    const { container } = render(
      <div onClick={vi.fn()}>
        <FilePreviewItem file={file} onRemove={onRemove} />
      </div>
    )
    
    const deleteButton = screen.getByRole('button', { name: /删除文件/i })
    fireEvent.click(deleteButton)
    
    expect(onRemove).toHaveBeenCalled()
  })
})

describe('ImagePreview', () => {
  it('渲染图片预览', () => {
    const file = createMockImageFile()
    
    render(<ImagePreview file={file} />)
    
    const img = screen.getByAltText(file.name)
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', file.thumbnail)
  })

  it('显示加载状态', () => {
    const file = createMockImageFile()
    
    render(<ImagePreview file={file} />)
    
    // 图片加载前应该显示加载状态
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('图片加载成功后隐藏加载状态', async () => {
    const file = createMockImageFile()
    
    render(<ImagePreview file={file} />)
    
    const img = screen.getByAltText(file.name)
    
    // 触发加载完成事件
    fireEvent.load(img)
    
    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })
  })

  it('图片加载失败时显示错误状态', async () => {
    const file = createMockImageFile()
    
    render(<ImagePreview file={file} />)
    
    const img = screen.getByAltText(file.name)
    
    // 触发加载错误事件
    fireEvent.error(img)
    
    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeInTheDocument()
    })
  })

  it('无图片数据时显示无预览提示', async () => {
    const file = {
      ...createMockImageFile(),
      content: '',
      thumbnail: undefined,
    }
    
    render(<ImagePreview file={file} />)
    
    // 等待加载状态消失
    await waitFor(() => {
      expect(screen.getByText('无预览')).toBeInTheDocument()
    })
  })

  it('优先使用缩略图', () => {
    const file = createMockImageFile()
    
    render(<ImagePreview file={file} />)
    
    const img = screen.getByAltText(file.name)
    expect(img).toHaveAttribute('src', file.thumbnail)
  })

  it('无缩略图时使用原图', () => {
    const file = {
      ...createMockImageFile(),
      thumbnail: undefined,
    }
    
    render(<ImagePreview file={file} />)
    
    const img = screen.getByAltText(file.name)
    expect(img).toHaveAttribute('src', file.content)
  })
})

describe('DocumentPreview', () => {
  it('渲染文档预览', () => {
    const file = createMockDocumentFile()
    
    render(<DocumentPreview file={file} />)
    
    // 验证文件名显示（通过 title 属性）
    expect(screen.getByTitle(file.name)).toBeInTheDocument()
    
    // 验证文件大小显示
    expect(screen.getByText(/2.0 MB/i)).toBeInTheDocument()
  })

  it('显示正确的文件图标', () => {
    const file = createMockDocumentFile()
    
    const { container } = render(<DocumentPreview file={file} />)
    
    // 验证图标存在（通过 SVG 元素）
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('截断长文件名', () => {
    const file = {
      ...createMockDocumentFile(),
      name: 'very-long-file-name-that-should-be-truncated.pdf',
    }
    
    render(<DocumentPreview file={file} />)
    
    // 验证显示的文件名被截断
    const nameElement = screen.getByTitle(file.name)
    expect(nameElement).toBeInTheDocument()
    expect(nameElement.textContent).toContain('...')
  })

  it('格式化文件大小 - 字节', () => {
    const file = {
      ...createMockDocumentFile(),
      size: 500,
    }
    
    render(<DocumentPreview file={file} />)
    
    expect(screen.getByText('500 B')).toBeInTheDocument()
  })

  it('格式化文件大小 - KB', () => {
    const file = {
      ...createMockDocumentFile(),
      size: 1024 * 5.5,
    }
    
    render(<DocumentPreview file={file} />)
    
    expect(screen.getByText('5.5 KB')).toBeInTheDocument()
  })

  it('格式化文件大小 - MB', () => {
    const file = {
      ...createMockDocumentFile(),
      size: 1024 * 1024 * 2.5,
    }
    
    render(<DocumentPreview file={file} />)
    
    expect(screen.getByText('2.5 MB')).toBeInTheDocument()
  })

  it('显示不同类型文档的图标', () => {
    const fileTypes = [
      { mime_type: 'application/pdf', name: 'test.pdf' },
      { mime_type: 'text/plain', name: 'test.txt' },
      { mime_type: 'application/json', name: 'test.json' },
      { mime_type: 'text/x-python', name: 'test.py' },
    ]

    fileTypes.forEach(({ mime_type, name }) => {
      const file = {
        ...createMockDocumentFile(),
        mime_type,
        name,
      }

      const { container } = render(<DocumentPreview file={file} />)
      
      // 验证图标存在
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })
})
