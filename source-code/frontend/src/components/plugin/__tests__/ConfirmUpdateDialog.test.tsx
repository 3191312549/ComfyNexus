/**
 * ConfirmUpdateDialog 组件测试
 * 
 * 验证需求: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmUpdateDialog } from '../ConfirmUpdateDialog';
import type { PluginInfo } from '@/types/plugin';

describe('ConfirmUpdateDialog', () => {
  // Mock 插件数据
  const mockPlugins: PluginInfo[] = [
    {
      name: 'plugin-1',
      path: '/path/to/plugin-1',
      is_git_repo: true,
      has_update: true,
      enabled: true,
    },
    {
      name: 'plugin-2',
      path: '/path/to/plugin-2',
      is_git_repo: true,
      has_update: true,
      enabled: true,
    },
    {
      name: 'plugin-3',
      path: '/path/to/plugin-3',
      is_git_repo: true,
      has_update: true,
      enabled: true,
    },
  ] as PluginInfo[];

  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 清理 body overflow 样式
    document.body.style.overflow = 'unset';
  });

  describe('渲染测试', () => {
    it('应该正确渲染组件', () => {
      render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // 验证标题
      expect(screen.getByText('确认批量更新')).toBeInTheDocument();
      
      // 验证插件数量显示
      expect(screen.getByText(/您即将更新/)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // 验证按钮
      expect(screen.getByText('取消')).toBeInTheDocument();
      expect(screen.getByText('确认更新')).toBeInTheDocument();
    });

    it('应该显示插件列表（前5个）', () => {
      render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // 验证插件名称显示
      expect(screen.getByText('plugin-1')).toBeInTheDocument();
      expect(screen.getByText('plugin-2')).toBeInTheDocument();
      expect(screen.getByText('plugin-3')).toBeInTheDocument();
    });

    it('应该显示"等X个插件"当插件数量超过5个时', () => {
      const manyPlugins: PluginInfo[] = Array.from({ length: 10 }, (_, i) => ({
        name: `plugin-${i + 1}`,
        path: `/path/to/plugin-${i + 1}`,
        is_git_repo: true,
        has_update: true,
        enabled: true,
      })) as PluginInfo[];

      render(
        <ConfirmUpdateDialog
          plugins={manyPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // 验证只显示前5个
      expect(screen.getByText('plugin-1')).toBeInTheDocument();
      expect(screen.getByText('plugin-5')).toBeInTheDocument();
      
      // 验证"等X个插件"提示
      expect(screen.getByText(/等 5 个插件.../)).toBeInTheDocument();
    });

    it('应该显示警告消息', () => {
      render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/更新过程可能需要几分钟时间/)).toBeInTheDocument();
    });
  });

  describe('用户交互测试', () => {
    it('应该在点击确认按钮时调用 onConfirm', () => {
      render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByText('确认更新');
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('应该在点击取消按钮时调用 onCancel', () => {
      render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('应该在点击背景遮罩时调用 onCancel', () => {
      const { container } = render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // 点击最外层容器（背景遮罩）
      const backdrop = container.firstChild as HTMLElement;
      fireEvent.click(backdrop);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('应该在按下 ESC 键时调用 onCancel', () => {
      render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // 模拟按下 ESC 键
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('应该阻止对话框内部点击事件冒泡', () => {
      const { container } = render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // 点击对话框内容区域
      const dialog = container.querySelector('[class*="relative z-50"]') as HTMLElement;
      fireEvent.click(dialog);

      // 不应该触发 onCancel
      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe('样式和可访问性测试', () => {
    it('应该设置 body overflow 为 hidden', () => {
      render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('应该在卸载时恢复 body overflow', () => {
      const { unmount } = render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('unset');
    });

    it('应该显示警告图标', () => {
      const { container } = render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // 查找 AlertTriangle 图标（通过 SVG 元素）
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空插件列表', () => {
      render(
        <ConfirmUpdateDialog
          plugins={[]}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('应该处理单个插件', () => {
      const singlePlugin: PluginInfo[] = [mockPlugins[0]];

      render(
        <ConfirmUpdateDialog
          plugins={singlePlugin}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('plugin-1')).toBeInTheDocument();
    });

    it('应该处理正好5个插件（不显示"等X个"）', () => {
      const fivePlugins: PluginInfo[] = Array.from({ length: 5 }, (_, i) => ({
        name: `plugin-${i + 1}`,
        path: `/path/to/plugin-${i + 1}`,
        is_git_repo: true,
        has_update: true,
        enabled: true,
      })) as PluginInfo[];

      render(
        <ConfirmUpdateDialog
          plugins={fivePlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.queryByText(/等.*个插件/)).not.toBeInTheDocument();
    });
  });

  describe('事件清理测试', () => {
    it('应该在卸载时移除 ESC 键监听器', () => {
      const { unmount } = render(
        <ConfirmUpdateDialog
          plugins={mockPlugins}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      unmount();

      // 卸载后按 ESC 键不应该触发回调
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });
});
