/**
 * BranchSelector 组件单元测试
 * 
 * 测试分支列表渲染、默认分支标注、当前分支高亮、切换流程
 * 验证需求: 8.2, 8.3, 8.5, 8.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BranchSelector } from '../BranchSelector';
import { pluginAPI } from '@/services/PluginAPIService';
import type { BranchInfo, BranchesResponse, ApiResponse } from '@/types/plugin';

// Mock pluginAPI
vi.mock('@/services/PluginAPIService', () => ({
  pluginAPI: {
    getBranches: vi.fn(),
    switchBranch: vi.fn(),
  },
}));

describe('BranchSelector 组件', () => {
  // 测试数据
  const mockPluginName = 'test-plugin';
  const mockCurrentBranch = 'main';
  const mockOnClose = vi.fn();
  const mockOnBranchChanged = vi.fn();

  const mockBranches: BranchInfo[] = [
    {
      name: 'main',
      is_current: true,
      is_default: true,
    },
    {
      name: 'dev',
      is_current: false,
      is_default: false,
    },
    {
      name: 'feature/test',
      is_current: false,
      is_default: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * 测试：分支列表渲染
   * 验证需求: 8.1（显示所有分支）
   */
  it('应该正确渲染分支列表', async () => {
    // Mock API 响应
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: true,
      branches: mockBranches,
    } as BranchesResponse);

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 验证所有分支都被渲染
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('dev')).toBeInTheDocument();
    expect(screen.getByText('feature/test')).toBeInTheDocument();
  });

  /**
   * 测试：默认分支标注
   * 验证需求: 8.2（标注默认分支，显示"(默认)"）
   */
  it('应该标注默认分支', async () => {
    // Mock API 响应
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: true,
      branches: mockBranches,
    } as BranchesResponse);

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 验证默认分支标注
    const defaultBadges = screen.getAllByText('默认');
    expect(defaultBadges.length).toBeGreaterThan(0);
  });

  /**
   * 测试：当前分支高亮
   * 验证需求: 8.3（高亮显示当前分支）
   */
  it('应该高亮显示当前分支', async () => {
    // Mock API 响应
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: true,
      branches: mockBranches,
    } as BranchesResponse);

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 验证当前分支标记
    const currentBadges = screen.getAllByText('当前分支');
    expect(currentBadges.length).toBeGreaterThan(0);
  });

  /**
   * 测试：切换分支成功
   * 验证需求: 8.5（切换成功，更新插件信息并显示成功提示）
   */
  it('应该成功切换分支并显示成功提示', async () => {
    // Mock API 响应
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: true,
      branches: mockBranches,
    } as BranchesResponse);

    vi.mocked(pluginAPI.switchBranch).mockResolvedValue({
      success: true,
      message: '成功切换到分支 dev',
    } as ApiResponse);

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 点击 dev 分支
    const devBranch = screen.getByText('dev');
    fireEvent.click(devBranch.closest('button')!);

    // 等待切换完成
    await waitFor(() => {
      expect(screen.getByText('切换成功')).toBeInTheDocument();
    });

    // 验证成功提示
    expect(screen.getByText('成功切换到分支 dev')).toBeInTheDocument();

    // 验证 API 调用
    expect(pluginAPI.switchBranch).toHaveBeenCalledWith(mockPluginName, 'dev');
  });

  /**
   * 测试：切换分支失败
   * 验证需求: 8.6（切换失败，显示详细错误信息）
   */
  it('应该在切换失败时显示错误信息', async () => {
    // Mock API 响应
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: true,
      branches: mockBranches,
    } as BranchesResponse);

    const errorMessage = 'Git checkout 失败：本地有未提交的更改';
    vi.mocked(pluginAPI.switchBranch).mockResolvedValue({
      success: false,
      error: errorMessage,
    } as ApiResponse);

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 点击 dev 分支
    const devBranch = screen.getByText('dev');
    fireEvent.click(devBranch.closest('button')!);

    // 等待切换完成
    await waitFor(() => {
      expect(screen.getByText('切换失败')).toBeInTheDocument();
    });

    // 验证错误信息
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  /**
   * 测试：加载分支列表失败
   */
  it('应该在加载失败时显示错误信息', async () => {
    const errorMessage = '网络连接失败';
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: false,
      error: errorMessage,
    } as BranchesResponse);

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 验证错误信息
    expect(screen.getByText('加载失败')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  /**
   * 测试：空分支列表
   */
  it('应该在没有分支时显示提示', async () => {
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: true,
      branches: [],
    } as BranchesResponse);

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 验证空状态提示
    expect(screen.getByText('没有可用的分支')).toBeInTheDocument();
  });

  /**
   * 测试：点击当前分支不执行切换
   */
  it('应该禁用当前分支的切换按钮', async () => {
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: true,
      branches: mockBranches,
    } as BranchesResponse);

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 获取当前分支按钮
    const mainBranch = screen.getByText('main');
    const mainButton = mainBranch.closest('button')!;

    // 验证按钮被禁用
    expect(mainButton).toBeDisabled();

    // 点击当前分支
    fireEvent.click(mainButton);

    // 验证没有调用 API
    expect(pluginAPI.switchBranch).not.toHaveBeenCalled();
  });

  /**
   * 测试：切换过程中禁用所有按钮
   */
  it('应该在切换过程中禁用所有分支按钮', async () => {
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: true,
      branches: mockBranches,
    } as BranchesResponse);

    // Mock 一个延迟的切换操作
    vi.mocked(pluginAPI.switchBranch).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              message: '成功切换',
            } as ApiResponse);
          }, 100);
        })
    );

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 点击 dev 分支
    const devBranch = screen.getByText('dev');
    fireEvent.click(devBranch.closest('button')!);

    // 验证切换中状态
    await waitFor(() => {
      expect(screen.getByText('正在切换分支...')).toBeInTheDocument();
    });

    // 验证所有按钮都被禁用
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      if (button.textContent?.includes('main') || button.textContent?.includes('dev')) {
        expect(button).toBeDisabled();
      }
    });
  });

  /**
   * 测试：关闭回调
   */
  it('应该在点击关闭按钮时调用 onClose', async () => {
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: true,
      branches: mockBranches,
    } as BranchesResponse);

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 点击关闭按钮
    const closeButton = screen.getByText('关闭');
    fireEvent.click(closeButton);

    // 验证回调被调用
    expect(mockOnClose).toHaveBeenCalled();
  });

  /**
   * 测试：切换成功后调用 onBranchChanged
   */
  it('应该在切换成功后调用 onBranchChanged', async () => {
    vi.mocked(pluginAPI.getBranches).mockResolvedValue({
      success: true,
      branches: mockBranches,
    } as BranchesResponse);

    vi.mocked(pluginAPI.switchBranch).mockResolvedValue({
      success: true,
      message: '成功切换',
    } as ApiResponse);

    render(
      <BranchSelector
        pluginName={mockPluginName}
        currentBranch={mockCurrentBranch}
        onClose={mockOnClose}
        onBranchChanged={mockOnBranchChanged}
      />
    );

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载分支列表中...')).not.toBeInTheDocument();
    });

    // 点击 dev 分支
    const devBranch = screen.getByText('dev');
    fireEvent.click(devBranch.closest('button')!);

    // 等待切换完成和回调调用（有 1.5 秒延迟）
    await waitFor(
      () => {
        expect(mockOnBranchChanged).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });
});
