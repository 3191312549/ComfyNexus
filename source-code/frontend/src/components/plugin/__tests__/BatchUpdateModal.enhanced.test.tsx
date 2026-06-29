/**
 * BatchUpdateModal 增强测试
 * 
 * 测试确认对话框和关闭控制逻辑
 * 验证需求: 2.1, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5
 * 属性 1: 关闭操作的状态依赖性
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BatchUpdateModal } from '../BatchUpdateModal';
import type { PluginInfo } from '@/types/plugin';

// Mock pluginAPI
vi.mock('@/services/PluginAPIService', () => ({
  pluginAPI: {
    updateAllPlugins: vi.fn(),
  },
}));

// Mock useSettingsStore
vi.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: () => ({
    systemSettings: {
      gitConcurrency: 10,
    },
  }),
}));

describe('BatchUpdateModal - 确认对话框和关闭控制', () => {
  const mockPlugins: PluginInfo[] = [
    {
      name: 'test-plugin-1',
      path: '/path/to/plugin-1',
      is_git_repo: true,
      has_update: true,
      enabled: true,
    },
    {
      name: 'test-plugin-2',
      path: '/path/to/plugin-2',
      is_git_repo: true,
      has_update: true,
      enabled: true,
    },
  ] as PluginInfo[];

  const mockOnClose = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = 'unset';
  });

  describe('确认对话框测试', () => {
    it('应该在初始状态显示确认对话框', () => {
      render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // 验证确认对话框显示
      expect(screen.getByText('确认批量更新')).toBeInTheDocument();
      expect(screen.getByText(/您即将更新/)).toBeInTheDocument();
      
      // 验证确认和取消按钮
      expect(screen.getByText('确认更新')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
    });

    it('应该在点击取消时关闭对话框', () => {
      render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('应该在点击确认后隐藏确认对话框并显示进度对话框', async () => {
      const { pluginAPI } = await import('@/services/PluginAPIService');
      
      // Mock API 返回成功
      (pluginAPI.updateAllPlugins as any).mockResolvedValue({
        success: true,
        results: [],
        summary: {
          total: 2,
          success: 2,
          failed: 0,
          dependencies_installed: 0,
        },
      });

      render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // 点击确认按钮
      const confirmButton = screen.getByText('确认更新');
      fireEvent.click(confirmButton);

      // 等待确认对话框消失
      await waitFor(() => {
        expect(screen.queryByText('确认批量更新')).not.toBeInTheDocument();
      });

      // 验证进度对话框显示
      await waitFor(() => {
        expect(screen.getByText('批量更新插件')).toBeInTheDocument();
      });
    });
  });

  describe('关闭控制逻辑测试 - 属性 1', () => {
    it('应该在更新进行中时禁用关闭按钮', async () => {
      const { pluginAPI } = await import('@/services/PluginAPIService');
      
      // Mock API 返回延迟响应
      (pluginAPI.updateAllPlugins as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          results: [],
          summary: { total: 2, success: 2, failed: 0, dependencies_installed: 0 },
        }), 100))
      );

      render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // 点击确认开始更新
      const confirmButton = screen.getByText('确认更新');
      fireEvent.click(confirmButton);

      // 等待进度对话框显示
      await waitFor(() => {
        expect(screen.getByText('批量更新插件')).toBeInTheDocument();
      });

      // 验证关闭按钮被禁用
      const closeButton = screen.getByText('更新中...');
      expect(closeButton).toBeDisabled();
      
      // 验证提示信息显示
      expect(screen.getByText('正在更新，请勿关闭窗口...')).toBeInTheDocument();
    });

    it('应该在更新完成后启用关闭按钮', async () => {
      const { pluginAPI } = await import('@/services/PluginAPIService');
      
      // Mock API 返回成功
      (pluginAPI.updateAllPlugins as any).mockResolvedValue({
        success: true,
        results: [],
        summary: {
          total: 2,
          success: 2,
          failed: 0,
          dependencies_installed: 0,
        },
      });

      render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // 点击确认开始更新
      const confirmButton = screen.getByText('确认更新');
      fireEvent.click(confirmButton);

      // 等待更新完成
      await waitFor(() => {
        expect(screen.getByText('关闭')).toBeInTheDocument();
      }, { timeout: 2000 });

      // 验证关闭按钮启用
      const closeButton = screen.getByText('关闭');
      expect(closeButton).not.toBeDisabled();
    });

    it('应该在更新进行中时不响应背景点击', async () => {
      const { pluginAPI } = await import('@/services/PluginAPIService');
      
      // Mock API 返回延迟响应
      (pluginAPI.updateAllPlugins as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          results: [],
          summary: { total: 2, success: 2, failed: 0, dependencies_installed: 0 },
        }), 100))
      );

      const { container } = render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // 点击确认开始更新
      const confirmButton = screen.getByText('确认更新');
      fireEvent.click(confirmButton);

      // 等待进度对话框显示
      await waitFor(() => {
        expect(screen.getByText('批量更新插件')).toBeInTheDocument();
      });

      // 点击背景遮罩
      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      // 验证 onClose 未被调用
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('应该在更新进行中时不响应 ESC 键', async () => {
      const { pluginAPI } = await import('@/services/PluginAPIService');
      
      // Mock API 返回延迟响应
      (pluginAPI.updateAllPlugins as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          results: [],
          summary: { total: 2, success: 2, failed: 0, dependencies_installed: 0 },
        }), 100))
      );

      render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // 点击确认开始更新
      const confirmButton = screen.getByText('确认更新');
      fireEvent.click(confirmButton);

      // 等待进度对话框显示
      await waitFor(() => {
        expect(screen.getByText('批量更新插件')).toBeInTheDocument();
      });

      // 按下 ESC 键
      fireEvent.keyDown(window, { key: 'Escape' });

      // 验证 onClose 未被调用
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('应该在更新完成后响应背景点击', async () => {
      const { pluginAPI } = await import('@/services/PluginAPIService');
      
      // Mock API 返回成功
      (pluginAPI.updateAllPlugins as any).mockResolvedValue({
        success: true,
        results: [],
        summary: {
          total: 2,
          success: 2,
          failed: 0,
          dependencies_installed: 0,
        },
      });

      const { container } = render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // 点击确认开始更新
      const confirmButton = screen.getByText('确认更新');
      fireEvent.click(confirmButton);

      // 等待更新完成
      await waitFor(() => {
        expect(screen.getByText('关闭')).toBeInTheDocument();
      }, { timeout: 2000 });

      // 点击背景遮罩
      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      // 验证 onClose 被调用
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('应该在更新完成后响应 ESC 键', async () => {
      const { pluginAPI } = await import('@/services/PluginAPIService');
      
      // Mock API 返回成功
      (pluginAPI.updateAllPlugins as any).mockResolvedValue({
        success: true,
        results: [],
        summary: {
          total: 2,
          success: 2,
          failed: 0,
          dependencies_installed: 0,
        },
      });

      render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // 点击确认开始更新
      const confirmButton = screen.getByText('确认更新');
      fireEvent.click(confirmButton);

      // 等待更新完成
      await waitFor(() => {
        expect(screen.getByText('关闭')).toBeInTheDocument();
      }, { timeout: 2000 });

      // 按下 ESC 键
      fireEvent.keyDown(window, { key: 'Escape' });

      // 验证 onClose 被调用
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('应该在更新失败后允许关闭', async () => {
      const { pluginAPI } = await import('@/services/PluginAPIService');
      
      // Mock API 返回失败
      (pluginAPI.updateAllPlugins as any).mockResolvedValue({
        success: false,
        error: '批量更新失败',
      });

      render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // 点击确认开始更新
      const confirmButton = screen.getByText('确认更新');
      fireEvent.click(confirmButton);

      // 等待错误显示
      await waitFor(() => {
        expect(screen.getAllByText('批量更新失败').length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // 验证关闭按钮启用
      const closeButton = screen.getByText('关闭');
      expect(closeButton).not.toBeDisabled();

      // 点击关闭按钮
      fireEvent.click(closeButton);

      // 验证 onClose 被调用
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('错误处理测试', () => {
    it('应该显示全局错误提示', async () => {
      const { pluginAPI } = await import('@/services/PluginAPIService');
      
      // Mock API 返回失败
      (pluginAPI.updateAllPlugins as any).mockResolvedValue({
        success: false,
        error: '网络连接失败',
      });

      render(
        <BatchUpdateModal
          plugins={mockPlugins}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // 点击确认开始更新
      const confirmButton = screen.getByText('确认更新');
      fireEvent.click(confirmButton);

      // 等待错误显示
      await waitFor(() => {
        expect(screen.getAllByText('批量更新失败').length).toBeGreaterThan(0);
        expect(screen.getAllByText('网络连接失败').length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });
  });
});
