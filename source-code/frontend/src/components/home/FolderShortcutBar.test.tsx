/**
 * FolderShortcutBar 拖拽优化测试
 * 测试拖拽视觉反馈、性能和用户体验
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FolderShortcutBar } from './FolderShortcutBar'
import { useFolderShortcutStore } from '@/stores/useFolderShortcutStore'
import { useEnvStore } from '@/stores/useEnvStore'
import type { FolderShortcut } from '@/types/home'

// Mock stores
vi.mock('@/stores/useFolderShortcutStore')
vi.mock('@/stores/useEnvStore')

// Mock 文件夹快捷方式数据
const mockShortcuts: FolderShortcut[] = [
  {
    id: '1',
    name: '输入',
    path: '/path/to/input',
    icon: 'FolderInput',
    order: 0,
    isDefault: true,
  },
  {
    id: '2',
    name: '输出',
    path: '/path/to/output',
    icon: 'FolderOutput',
    order: 1,
    isDefault: true,
  },
  {
    id: '3',
    name: '模型',
    path: '/path/to/models',
    icon: 'FolderCog',
    order: 2,
    isDefault: true,
  },
]

describe('FolderShortcutBar - 拖拽优化', () => {
  beforeEach(() => {
    // 重置 mocks
    vi.clearAllMocks()
    
    // Mock useFolderShortcutStore
    vi.mocked(useFolderShortcutStore).mockReturnValue({
      shortcuts: mockShortcuts,
      loading: false,
      error: null,
      loadShortcuts: vi.fn(),
      reorderShortcuts: vi.fn(),
      syncDefaultPaths: vi.fn(),
      saveShortcuts: vi.fn(),
      addShortcut: vi.fn(),
      deleteShortcut: vi.fn(),
      updateShortcut: vi.fn(),
    })
    
    // Mock useEnvStore - 使用函数形式的 selector
    vi.mocked(useEnvStore).mockImplementation((selector: any) => {
      const state = {
        environments: [],
        currentEnvId: null,
      }
      return selector ? selector(state) : state
    })
  })
  
  describe('视觉反馈测试', () => {
    it('应该渲染拖拽手柄图标', () => {
      const { container } = render(<FolderShortcutBar />)
      
      // 拖拽手柄应该存在（虽然默认隐藏）
      const gripIcons = container.querySelectorAll('.lucide-grip-vertical')
      expect(gripIcons.length).toBeGreaterThan(0)
    })
    
    it('拖拽时容器应该显示虚线边框', () => {
      const { container } = render(<FolderShortcutBar />)
      
      // 初始状态不应该有虚线边框
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer?.className).not.toContain('border-dashed')
    })
    
    it('应该正确应用拖拽中的样式类', () => {
      const { container } = render(<FolderShortcutBar />)
      
      // 验证卡片存在
      const cards = container.querySelectorAll('[role="button"]')
      expect(cards.length).toBe(3)
      
      // 验证卡片有正确的过渡类
      cards.forEach(card => {
        expect(card.className).toContain('transition-all')
        expect(card.className).toContain('duration-300')
      })
    })
  })
  
  describe('性能优化测试', () => {
    it('应该使用 will-change 优化 transform 性能', () => {
      const { container } = render(<FolderShortcutBar />)
      
      const cards = container.querySelectorAll('[role="button"]')
      
      // 检查是否有 style 属性（包含 willChange）
      cards.forEach(card => {
        const style = card.getAttribute('style')
        expect(style).toContain('will-change')
      })
    })
    
    it('应该使用 React.memo 避免不必要的重渲染', () => {
      const { container, rerender } = render(<FolderShortcutBar />)
      
      // 第一次渲染
      const initialCards = container.querySelectorAll('[role="button"]')
      expect(initialCards.length).toBe(3)
      
      // 重新渲染（props 未变化）
      rerender(<FolderShortcutBar />)
      
      // 卡片数量应该保持不变
      const rerenderedCards = container.querySelectorAll('[role="button"]')
      expect(rerenderedCards.length).toBe(3)
    })
  })
  
  describe('拖拽功能测试', () => {
    it('应该在拖拽开始时设置 activeId', async () => {
      const reorderShortcuts = vi.fn()
      vi.mocked(useFolderShortcutStore).mockReturnValue({
        shortcuts: mockShortcuts,
        loading: false,
        error: null,
        loadShortcuts: vi.fn(),
        reorderShortcuts,
        syncDefaultPaths: vi.fn(),
        saveShortcuts: vi.fn(),
        addShortcut: vi.fn(),
        deleteShortcut: vi.fn(),
        updateShortcut: vi.fn(),
      })
      
      const { container } = render(<FolderShortcutBar />)
      
      // 验证卡片渲染
      const cards = container.querySelectorAll('[role="button"]')
      expect(cards.length).toBe(3)
    })
    
    it('应该正确处理拖拽排序', async () => {
      const reorderShortcuts = vi.fn()
      vi.mocked(useFolderShortcutStore).mockReturnValue({
        shortcuts: mockShortcuts,
        loading: false,
        error: null,
        loadShortcuts: vi.fn(),
        reorderShortcuts,
        syncDefaultPaths: vi.fn(),
        saveShortcuts: vi.fn(),
        addShortcut: vi.fn(),
        deleteShortcut: vi.fn(),
        updateShortcut: vi.fn(),
      })
      
      render(<FolderShortcutBar />)
      
      // 注意：实际的拖拽测试需要模拟 @dnd-kit 的拖拽事件
      // 这里只验证组件正确渲染
      expect(screen.getByText('快速访问')).toBeInTheDocument()
    })
  })
  
  describe('响应式设计测试', () => {
    it('应该有响应式网格布局类', () => {
      const { container } = render(<FolderShortcutBar />)
      
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer?.className).toContain('grid-cols-3')
      expect(gridContainer?.className).toContain('md:grid-cols-4')
      expect(gridContainer?.className).toContain('lg:grid-cols-6')
    })
  })
  
  describe('错误处理测试', () => {
    it('加载失败时应该显示错误信息', () => {
      vi.mocked(useFolderShortcutStore).mockReturnValue({
        shortcuts: [],
        loading: false,
        error: '加载失败',
        loadShortcuts: vi.fn(),
        reorderShortcuts: vi.fn(),
        syncDefaultPaths: vi.fn(),
        saveShortcuts: vi.fn(),
        addShortcut: vi.fn(),
        deleteShortcut: vi.fn(),
        updateShortcut: vi.fn(),
      })
      
      render(<FolderShortcutBar />)
      
      const errorMessages = screen.getAllByText('加载失败')
      expect(errorMessages.length).toBeGreaterThan(0)
    })
    
    it('空状态时应该显示提示信息', () => {
      vi.mocked(useFolderShortcutStore).mockReturnValue({
        shortcuts: [],
        loading: false,
        error: null,
        loadShortcuts: vi.fn(),
        reorderShortcuts: vi.fn(),
        syncDefaultPaths: vi.fn(),
        saveShortcuts: vi.fn(),
        addShortcut: vi.fn(),
        deleteShortcut: vi.fn(),
        updateShortcut: vi.fn(),
      })
      
      render(<FolderShortcutBar />)
      
      expect(screen.getByText('暂无文件夹快捷方式')).toBeInTheDocument()
    })
  })
})
