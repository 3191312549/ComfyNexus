/**
 * PluginSearchBar 组件单元测试
 * 
 * 测试搜索输入和回调
 * 测试结果数量显示
 * 测试空结果提示
 * 
 * 验证需求: 2.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PluginSearchBar } from '../PluginSearchBar';

describe('PluginSearchBar 组件', () => {
  // Mock 回调函数
  const mockOnSearch = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockOnUpdateAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // 使用真实定时器以便测试防抖
    vi.useRealTimers();
  });

  describe('基本渲染', () => {
    it('应该渲染搜索输入框', () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');
      expect(input).toBeInTheDocument();
    });

    it('应该渲染刷新按钮', () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const refreshButton = screen.getByText('刷新');
      expect(refreshButton).toBeInTheDocument();
    });

    it('应该渲染一键更新按钮', () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const updateAllButton = screen.getByText('一键更新');
      expect(updateAllButton).toBeInTheDocument();
    });
  });

  describe('搜索输入和回调', () => {
    it('应该在输入时更新输入框的值', () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'manager' } });

      expect(input.value).toBe('manager');
    });

    it('应该在输入后触发搜索回调（防抖 300ms）', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      // 等待初始渲染时的空字符串搜索
      await waitFor(() => expect(mockOnSearch).toHaveBeenCalledWith(''), {
        timeout: 500,
      });

      // 清除之前的调用记录
      mockOnSearch.mockClear();

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: 'manager' } });

      // 立即检查，不应该调用
      expect(mockOnSearch).not.toHaveBeenCalled();

      // 等待防抖时间（300ms）
      await waitFor(
        () => {
          expect(mockOnSearch).toHaveBeenCalledWith('manager');
        },
        { timeout: 500 }
      );
    });

    it('应该在快速输入时只触发一次搜索回调', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      // 等待初始渲染时的空字符串搜索
      await waitFor(() => expect(mockOnSearch).toHaveBeenCalledWith(''), {
        timeout: 500,
      });

      // 清除之前的调用记录
      mockOnSearch.mockClear();

      const input = screen.getByPlaceholderText('搜索插件...');

      // 快速输入多次
      fireEvent.change(input, { target: { value: 'm' } });
      fireEvent.change(input, { target: { value: 'ma' } });
      fireEvent.change(input, { target: { value: 'man' } });
      fireEvent.change(input, { target: { value: 'manager' } });

      // 等待防抖时间
      await waitFor(
        () => {
          expect(mockOnSearch).toHaveBeenCalledTimes(1);
          expect(mockOnSearch).toHaveBeenCalledWith('manager');
        },
        { timeout: 500 }
      );
    });

    it('应该在清空输入时触发空字符串搜索', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');

      // 先输入
      fireEvent.change(input, { target: { value: 'manager' } });
      await waitFor(() => expect(mockOnSearch).toHaveBeenCalledWith('manager'), {
        timeout: 500,
      });

      // 清空输入
      mockOnSearch.mockClear();
      fireEvent.change(input, { target: { value: '' } });

      await waitFor(() => expect(mockOnSearch).toHaveBeenCalledWith(''), {
        timeout: 500,
      });
    });

    it('应该支持中文输入', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: '管理器' } });

      await waitFor(() => expect(mockOnSearch).toHaveBeenCalledWith('管理器'), {
        timeout: 500,
      });
    });
  });

  describe('结果数量显示', () => {
    it('应该在有搜索关键词时显示结果数量', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          resultCount={5}
          totalCount={10}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: 'manager' } });

      // 等待防抖后，结果数量应该显示
      await waitFor(
        () => {
          expect(screen.getByText(/找到 5 个插件（共 10 个）/)).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('应该在没有搜索关键词时不显示结果数量', () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          resultCount={10}
          totalCount={10}
        />
      );

      // 没有输入关键词，不应该显示结果数量
      expect(screen.queryByText(/找到/)).not.toBeInTheDocument();
    });

    it('应该在没有提供 resultCount 时不显示结果数量', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: 'manager' } });

      // 等待防抖
      await waitFor(() => expect(mockOnSearch).toHaveBeenCalled(), { timeout: 500 });

      // 不应该显示结果数量
      expect(screen.queryByText(/找到/)).not.toBeInTheDocument();
    });

    it('应该正确显示不同的结果数量', async () => {
      const { rerender } = render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          resultCount={3}
          totalCount={10}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(
        () => {
          expect(screen.getByText(/找到 3 个插件（共 10 个）/)).toBeInTheDocument();
        },
        { timeout: 500 }
      );

      // 更新结果数量
      rerender(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          resultCount={1}
          totalCount={10}
        />
      );

      expect(screen.getByText(/找到 1 个插件（共 10 个）/)).toBeInTheDocument();
    });
  });

  describe('空结果提示', () => {
    it('应该在搜索结果为空时显示提示', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          resultCount={0}
          totalCount={10}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: 'nonexistent' } });

      // 等待防抖后，应该显示空结果提示
      await waitFor(
        () => {
          expect(screen.getByText('未找到匹配的插件')).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('应该在空结果提示中使用特殊颜色', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          resultCount={0}
          totalCount={10}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(
        () => {
          const emptyMessage = screen.getByText('未找到匹配的插件');
          expect(emptyMessage).toHaveClass('text-orange-600');
        },
        { timeout: 500 }
      );
    });

    it('应该在有结果时不显示空结果提示', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          resultCount={5}
          totalCount={10}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: 'manager' } });

      await waitFor(() => expect(mockOnSearch).toHaveBeenCalled(), { timeout: 500 });

      // 不应该显示空结果提示
      expect(screen.queryByText('未找到匹配的插件')).not.toBeInTheDocument();
    });
  });

  describe('按钮交互', () => {
    it('应该在点击刷新按钮时调用回调', () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const refreshButton = screen.getByText('刷新');
      fireEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('应该在点击一键更新按钮时调用回调', () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const updateAllButton = screen.getByText('一键更新');
      fireEvent.click(updateAllButton);

      expect(mockOnUpdateAll).toHaveBeenCalledTimes(1);
    });

    it('应该在加载状态时禁用刷新按钮', () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          loading={true}
        />
      );

      const refreshButton = screen.getByText('刷新');
      expect(refreshButton).toBeDisabled();
    });

    it('应该在加载状态时禁用一键更新按钮', () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          loading={true}
        />
      );

      const updateAllButton = screen.getByText('一键更新');
      expect(updateAllButton).toBeDisabled();
    });

    it('应该在加载状态时显示刷新图标动画', () => {
      const { container } = render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          loading={true}
        />
      );

      // 查找带有 animate-spin 类的元素
      const spinningIcon = container.querySelector('.animate-spin');
      expect(spinningIcon).toBeInTheDocument();
    });

    it('应该在非加载状态时不显示刷新图标动画', () => {
      const { container } = render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          loading={false}
        />
      );

      // 不应该有 animate-spin 类
      const spinningIcon = container.querySelector('.animate-spin');
      expect(spinningIcon).not.toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理非常长的搜索关键词', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const longKeyword = 'a'.repeat(1000);
      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: longKeyword } });

      await waitFor(() => expect(mockOnSearch).toHaveBeenCalledWith(longKeyword), {
        timeout: 500,
      });
    });

    it('应该处理特殊字符', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: specialChars } });

      await waitFor(() => expect(mockOnSearch).toHaveBeenCalledWith(specialChars), {
        timeout: 500,
      });
    });

    it('应该处理 resultCount 为 0 但 totalCount 也为 0 的情况', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          resultCount={0}
          totalCount={0}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(
        () => {
          expect(screen.getByText('未找到匹配的插件')).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('应该处理 resultCount 等于 totalCount 的情况', async () => {
      render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
          resultCount={10}
          totalCount={10}
        />
      );

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(
        () => {
          expect(screen.getByText(/找到 10 个插件（共 10 个）/)).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe('组件卸载', () => {
    it('应该在组件卸载时清理防抖定时器', async () => {
      const { unmount } = render(
        <PluginSearchBar
          onSearch={mockOnSearch}
          onRefresh={mockOnRefresh}
          onUpdateAll={mockOnUpdateAll}
        />
      );

      // 等待初始渲染时的空字符串搜索
      await waitFor(() => expect(mockOnSearch).toHaveBeenCalledWith(''), {
        timeout: 500,
      });

      // 清除之前的调用记录
      mockOnSearch.mockClear();

      const input = screen.getByPlaceholderText('搜索插件...');
      fireEvent.change(input, { target: { value: 'manager' } });

      // 立即卸载组件
      unmount();

      // 等待防抖时间
      await new Promise((resolve) => setTimeout(resolve, 400));

      // 不应该调用搜索回调
      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });
});
