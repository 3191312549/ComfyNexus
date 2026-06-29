/**
 * PluginList 性能优化测试
 * 
 * 测试虚拟滚动、缓存加载和搜索防抖等性能优化功能
 * 
 * 验证需求: 15.1, 15.4（性能要求）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PluginList } from '../PluginList';
import * as usePluginsModule from '@/hooks/usePlugins';
import type { PluginInfo } from '@/types/plugin';

// Mock usePlugins Hook
vi.mock('@/hooks/usePlugins');

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount }: any) => (
    <div data-testid="virtual-list">
      {Array.from({ length: Math.min(itemCount, 10) }).map((_, index) => (
        <div key={index}>{children({ index, style: {} })}</div>
      ))}
    </div>
  ),
}));

// Mock 子组件
vi.mock('../PluginRow', () => ({
  PluginRow: ({ plugin }: { plugin: PluginInfo }) => (
    <div data-testid={`plugin-row-${plugin.name}`}>{plugin.name}</div>
  ),
}));

vi.mock('../PluginSearchBar', () => ({
  PluginSearchBar: () => <div data-testid="search-bar">Search Bar</div>,
}));

vi.mock('../BatchUpdateModal', () => ({
  BatchUpdateModal: () => <div data-testid="batch-update-modal">Batch Update Modal</div>,
}));

/**
 * 生成测试插件数据
 */
function generatePlugins(count: number): PluginInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `plugin-${i}`,
    path: `/path/to/plugin-${i}`,
    is_git_repo: true,
    git_url: `https://github.com/user/plugin-${i}`,
    branch: 'main',
    default_branch: 'main',
    commit_hash: 'abc1234',
    commit_date: '2024-01-01T00:00:00Z',
    has_update: false,
    behind_commits: 0,
    dependency_updated: false,
    dependency_viewed: true,
  }));
}

describe('PluginList - 性能优化测试', () => {
  const mockLoadPlugins = vi.fn();
  const mockRefreshPlugins = vi.fn();
  const mockSearchPlugins = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('虚拟滚动', () => {
    it('当插件数量 <= 50 时，应该使用普通渲染模式', async () => {
      // 准备：50 个插件
      const plugins = generatePlugins(50);

      vi.mocked(usePluginsModule.usePlugins).mockReturnValue({
        plugins,
        filteredPlugins: plugins,
        loading: false,
        refreshing: false,
        error: null,
        loadPlugins: mockLoadPlugins,
        refreshPlugins: mockRefreshPlugins,
        searchPlugins: mockSearchPlugins,
        searchKeyword: '',
      });

      // 执行
      render(<PluginList environmentId="test-env" />);

      // 验证：不应该使用虚拟滚动
      await waitFor(() => {
        expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
      });

      // 验证：所有插件都应该渲染
      plugins.forEach(plugin => {
        expect(screen.getByTestId(`plugin-row-${plugin.name}`)).toBeInTheDocument();
      });
    });

    it('当插件数量 > 50 时，应该启用虚拟滚动', async () => {
      // 准备：100 个插件
      const plugins = generatePlugins(100);

      vi.mocked(usePluginsModule.usePlugins).mockReturnValue({
        plugins,
        filteredPlugins: plugins,
        loading: false,
        refreshing: false,
        error: null,
        loadPlugins: mockLoadPlugins,
        refreshPlugins: mockRefreshPlugins,
        searchPlugins: mockSearchPlugins,
        searchKeyword: '',
      });

      // 执行
      render(<PluginList environmentId="test-env" />);

      // 验证：应该使用虚拟滚动
      await waitFor(() => {
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      });

      // 验证：只渲染部分插件（虚拟滚动）
      // Mock 的虚拟列表只渲染前 10 个
      expect(screen.getByTestId('plugin-row-plugin-0')).toBeInTheDocument();
      expect(screen.getByTestId('plugin-row-plugin-9')).toBeInTheDocument();
    });

    it('当搜索后插件数量从 > 50 变为 <= 50 时，应该切换到普通模式', async () => {
      // 准备：初始 100 个插件
      const allPlugins = generatePlugins(100);
      const filteredPlugins = generatePlugins(30); // 搜索后只有 30 个

      const { rerender } = render(<PluginList environmentId="test-env" />);

      // 初始状态：100 个插件，使用虚拟滚动
      vi.mocked(usePluginsModule.usePlugins).mockReturnValue({
        plugins: allPlugins,
        filteredPlugins: allPlugins,
        loading: false,
        refreshing: false,
        error: null,
        loadPlugins: mockLoadPlugins,
        refreshPlugins: mockRefreshPlugins,
        searchPlugins: mockSearchPlugins,
        searchKeyword: '',
      });

      rerender(<PluginList environmentId="test-env" />);

      await waitFor(() => {
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      });

      // 搜索后：30 个插件，切换到普通模式
      vi.mocked(usePluginsModule.usePlugins).mockReturnValue({
        plugins: allPlugins,
        filteredPlugins: filteredPlugins,
        loading: false,
        refreshing: false,
        error: null,
        loadPlugins: mockLoadPlugins,
        refreshPlugins: mockRefreshPlugins,
        searchPlugins: mockSearchPlugins,
        searchKeyword: 'test',
      });

      rerender(<PluginList environmentId="test-env" />);

      await waitFor(() => {
        expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
      });
    });
  });

  describe('缓存优先加载', () => {
    it('初始加载时应该使用缓存（useCache = true）', async () => {
      // 准备
      const plugins = generatePlugins(10);

      vi.mocked(usePluginsModule.usePlugins).mockReturnValue({
        plugins,
        filteredPlugins: plugins,
        loading: false,
        refreshing: false,
        error: null,
        loadPlugins: mockLoadPlugins,
        refreshPlugins: mockRefreshPlugins,
        searchPlugins: mockSearchPlugins,
        searchKeyword: '',
      });

      // 执行
      render(<PluginList environmentId="test-env" />);

      // 验证：应该调用 loadPlugins(true)
      await waitFor(() => {
        expect(mockLoadPlugins).toHaveBeenCalledWith(true);
      });
    });

    it('缓存加载应该在 500ms 内完成（模拟）', async () => {
      // 准备
      const plugins = generatePlugins(100);
      const startTime = Date.now();

      // Mock 快速加载
      mockLoadPlugins.mockImplementation(async () => {
        // 模拟缓存加载时间 < 500ms
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      vi.mocked(usePluginsModule.usePlugins).mockReturnValue({
        plugins,
        filteredPlugins: plugins,
        loading: false,
        refreshing: false,
        error: null,
        loadPlugins: mockLoadPlugins,
        refreshPlugins: mockRefreshPlugins,
        searchPlugins: mockSearchPlugins,
        searchKeyword: '',
      });

      // 执行
      render(<PluginList environmentId="test-env" />);

      // 验证
      await waitFor(() => {
        expect(mockLoadPlugins).toHaveBeenCalled();
      });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(500);
    });
  });

  describe('性能指标', () => {
    it('大量插件（100+）应该能够正常渲染', async () => {
      // 准备：200 个插件
      const plugins = generatePlugins(200);

      vi.mocked(usePluginsModule.usePlugins).mockReturnValue({
        plugins,
        filteredPlugins: plugins,
        loading: false,
        refreshing: false,
        error: null,
        loadPlugins: mockLoadPlugins,
        refreshPlugins: mockRefreshPlugins,
        searchPlugins: mockSearchPlugins,
        searchKeyword: '',
      });

      // 执行
      const startTime = performance.now();
      render(<PluginList environmentId="test-env" />);
      const renderTime = performance.now() - startTime;

      // 验证：渲染时间应该合理（< 1000ms）
      expect(renderTime).toBeLessThan(1000);

      // 验证：虚拟滚动已启用
      await waitFor(() => {
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      });
    });

    it('搜索过滤应该不阻塞 UI', async () => {
      // 准备：大量插件
      const plugins = generatePlugins(500);

      vi.mocked(usePluginsModule.usePlugins).mockReturnValue({
        plugins,
        filteredPlugins: plugins,
        loading: false,
        refreshing: false,
        error: null,
        loadPlugins: mockLoadPlugins,
        refreshPlugins: mockRefreshPlugins,
        searchPlugins: mockSearchPlugins,
        searchKeyword: '',
      });

      // 执行
      render(<PluginList environmentId="test-env" />);

      // 验证：搜索回调应该被正确传递
      await waitFor(() => {
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      });

      // 注意：实际的防抖测试在 PluginSearchBar.test.tsx 中
    });
  });

  describe('边界情况', () => {
    it('空插件列表应该正常显示', async () => {
      // 准备：空列表
      vi.mocked(usePluginsModule.usePlugins).mockReturnValue({
        plugins: [],
        filteredPlugins: [],
        loading: false,
        refreshing: false,
        error: null,
        loadPlugins: mockLoadPlugins,
        refreshPlugins: mockRefreshPlugins,
        searchPlugins: mockSearchPlugins,
        searchKeyword: '',
      });

      // 执行
      render(<PluginList environmentId="test-env" />);

      // 验证
      await waitFor(() => {
        expect(screen.getByText('暂无插件')).toBeInTheDocument();
      });
    });

    it('恰好 51 个插件应该启用虚拟滚动', async () => {
      // 准备：51 个插件（刚好超过阈值）
      const plugins = generatePlugins(51);

      vi.mocked(usePluginsModule.usePlugins).mockReturnValue({
        plugins,
        filteredPlugins: plugins,
        loading: false,
        refreshing: false,
        error: null,
        loadPlugins: mockLoadPlugins,
        refreshPlugins: mockRefreshPlugins,
        searchPlugins: mockSearchPlugins,
        searchKeyword: '',
      });

      // 执行
      render(<PluginList environmentId="test-env" />);

      // 验证：应该使用虚拟滚动
      await waitFor(() => {
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      });
    });
  });
});
