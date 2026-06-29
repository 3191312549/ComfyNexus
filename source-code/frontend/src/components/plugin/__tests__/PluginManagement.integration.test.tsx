/* eslint-disable no-restricted-syntax */
/**
 * 插件管理集成测试
 * 
 * 测试完整的插件管理流程
 * 验证所有需求的集成
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PluginList } from '../PluginList';
import { pluginAPI } from '@/services/PluginAPIService';
import type { PluginInfo } from '@/types/plugin';

// Mock pluginAPI
vi.mock('@/services/PluginAPIService');

// Mock 子组件
vi.mock('../DependencyCard', () => ({
  DependencyCard: ({ pluginName, onClose }: any) => (
    <div data-testid="dependency-card">
      <span>依赖卡片: {pluginName}</span>
      <button onClick={onClose}>关闭</button>
    </div>
  ),
}));

vi.mock('../UpdateCard', () => ({
  UpdateCard: ({ plugin, onClose, onUpdateComplete }: any) => (
    <div data-testid="update-card">
      <span>更新卡片: {plugin.name}</span>
      <button onClick={onUpdateComplete}>完成更新</button>
    </div>
  ),
}));

vi.mock('../BatchUpdateModal', () => ({
  BatchUpdateModal: ({ plugins, onClose, onComplete }: any) => (
    <div data-testid="batch-update-modal">
      <span>批量更新: {plugins.length} 个插件</span>
      <button onClick={() => { onComplete(); onClose(); }}>完成</button>
    </div>
  ),
}));

describe('插件管理集成测试', () => {
  const mockPlugins: PluginInfo[] = [
    {
      name: 'plugin-1',
      path: '/path/to/plugin-1',
      is_git_repo: true,
      git_url: 'https://github.com/test/plugin-1.git',
      branch: 'main',
      default_branch: 'main',
      commit_hash: 'abc1234',
      commit_date: '2024-01-10T10:00:00Z',
      has_update: false,
      behind_commits: 0,
      dependency_updated: false,
      dependency_viewed: true,
    },
    {
      name: 'plugin-2',
      path: '/path/to/plugin-2',
      is_git_repo: true,
      git_url: 'https://github.com/test/plugin-2.git',
      branch: 'main',
      default_branch: 'main',
      commit_hash: 'def5678',
      commit_date: '2024-01-12T15:00:00Z',
      has_update: true,
      behind_commits: 2,
      dependency_updated: true,
      dependency_viewed: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 默认 Mock
    vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
      success: true,
      plugins: mockPlugins,
      from_cache: true,
    });
  });

  /**
   * 集成测试 1: 搜索 → 查看依赖 → 安装依赖流程
   */
  it('应该完成搜索、查看依赖、安装依赖的完整流程', async () => {
    const user = userEvent.setup();
    
    render(<PluginList environmentId="test-env" />);
    
    // 等待插件列表加载
    await waitFor(() => {
      expect(screen.getByText('plugin-1')).toBeInTheDocument();
      expect(screen.getByText('plugin-2')).toBeInTheDocument();
    });
    
    // 步骤 1: 搜索插件
    const searchInput = screen.getByPlaceholderText('搜索插件...');
    await user.type(searchInput, 'plugin-2');
    
    // 等待搜索结果
    await waitFor(() => {
      expect(screen.getByText('plugin-2')).toBeInTheDocument();
      expect(screen.queryByText('plugin-1')).not.toBeInTheDocument();
    });
    
    // 步骤 2: 点击查看依赖
    const dependencyButton = screen.getByText('查询依赖');
    await user.click(dependencyButton);
    
    // 验证依赖卡片显示
    await waitFor(() => {
      expect(screen.getByTestId('dependency-card')).toBeInTheDocument();
      expect(screen.getByText('依赖卡片: plugin-2')).toBeInTheDocument();
    });
    
    // 步骤 3: 关闭依赖卡片
    const closeButton = screen.getByText('关闭');
    await user.click(closeButton);
    
    // 验证卡片关闭
    await waitFor(() => {
      expect(screen.queryByTestId('dependency-card')).not.toBeInTheDocument();
    });
  });

  /**
   * 集成测试 2: 更新 → 依赖变化提示 → 查看依赖流程
   */
  it('应该完成更新、依赖变化提示、查看依赖的完整流程', async () => {
    const user = userEvent.setup();
    
    render(<PluginList environmentId="test-env" />);
    
    // 等待插件列表加载
    await waitFor(() => {
      expect(screen.getByText('plugin-2')).toBeInTheDocument();
    });
    
    // 步骤 1: 点击更新按钮
    const updateButton = screen.getByText('更新');
    await user.click(updateButton);
    
    // 验证更新卡片显示
    await waitFor(() => {
      expect(screen.getByTestId('update-card')).toBeInTheDocument();
    });
    
    // 步骤 2: 完成更新
    const completeButton = screen.getByText('完成更新');
    await user.click(completeButton);
    
    // 验证更新卡片关闭
    await waitFor(() => {
      expect(screen.queryByTestId('update-card')).not.toBeInTheDocument();
    });
  });

  /**
   * 集成测试 3: 批量更新流程
   */
  it('应该完成批量更新的完整流程', async () => {
    const user = userEvent.setup();
    
    // Mock 有更新的插件
    const pluginsWithUpdate = mockPlugins.map(p => ({ ...p, has_update: true }));
    vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
      success: true,
      plugins: pluginsWithUpdate,
      from_cache: true,
    });
    
    render(<PluginList environmentId="test-env" />);
    
    // 等待插件列表加载
    await waitFor(() => {
      expect(screen.getByText('plugin-1')).toBeInTheDocument();
    });
    
    // 步骤 1: 点击一键更新按钮
    const batchUpdateButton = screen.getByText('一键更新');
    await user.click(batchUpdateButton);
    
    // 验证批量更新模态窗口显示
    await waitFor(() => {
      expect(screen.getByTestId('batch-update-modal')).toBeInTheDocument();
      expect(screen.getByText(/批量更新: 2 个插件/)).toBeInTheDocument();
    });
    
    // 步骤 2: 完成批量更新
    const completeButton = screen.getByText('完成');
    await user.click(completeButton);
    
    // 验证模态窗口关闭
    await waitFor(() => {
      expect(screen.queryByTestId('batch-update-modal')).not.toBeInTheDocument();
    });
  });
});
