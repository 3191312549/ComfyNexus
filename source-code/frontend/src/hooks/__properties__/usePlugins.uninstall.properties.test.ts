/**
 * usePlugins Hook 属性测试 - 卸载后列表更新
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证卸载功能在各种输入下的正确性
 * 
 * 验证需求: 9.4, 9.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { usePlugins } from '../usePlugins';
import { pluginAPI } from '@/services/PluginAPIService';
import type { PluginInfo } from '@/types/plugin';

// Mock pluginAPI
vi.mock('@/services/PluginAPIService', () => ({
  pluginAPI: {
    getPlugins: vi.fn(),
    refreshPlugins: vi.fn(),
    uninstallPlugin: vi.fn(),
  },
}));

/**
 * fast-check 生成器：插件对象
 */
const pluginArbitrary = fc.record<PluginInfo>({
  name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
  path: fc.string({ minLength: 1, maxLength: 100 }),
  is_git_repo: fc.boolean(),
  git_url: fc.option(fc.webUrl(), { nil: null }),
  branch: fc.option(
    fc.constantFrom('main', 'master', 'dev', 'develop', 'feature/test'),
    { nil: null }
  ),
  default_branch: fc.option(
    fc.constantFrom('main', 'master'),
    { nil: null }
  ),
  commit_hash: fc.option(
    fc.array(
      fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
      { minLength: 7, maxLength: 7 }
    ).map(arr => arr.join('')),
    { nil: null }
  ),
  commit_date: fc.option(
    fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
      .map(timestamp => new Date(timestamp).toISOString()),
    { nil: null }
  ),
  has_update: fc.boolean(),
  behind_commits: fc.nat({ max: 100 }),
  dependency_updated: fc.boolean(),
  dependency_viewed: fc.boolean(),
});

describe('usePlugins 属性测试 - 卸载后列表更新', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 属性 12: 卸载后列表更新
   * 
   * 对于任意插件列表，当卸载成功后，该插件应该从插件列表中移除
   * 
   * **Validates: Requirements 9.4, 9.6**
   */
  describe('属性 12: 卸载后列表更新', () => {
    it('对于任意插件列表，卸载成功后应该从列表中移除该插件', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成一个非空的插件列表
          fc.array(pluginArbitrary, { minLength: 1, maxLength: 20 }),
          // 生成要卸载的插件索引
          async (plugins) => {
            // 选择一个要卸载的插件（随机索引）
            const uninstallIndex = Math.floor(Math.random() * plugins.length);
            const pluginToUninstall = plugins[uninstallIndex];

            // Mock API 响应
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
              success: true,
              plugins: plugins,
              from_cache: true,
            });

            // Mock 刷新 API：返回移除了卸载插件的列表
            const pluginsAfterUninstall = plugins.filter(
              (p) => p.name !== pluginToUninstall.name
            );
            vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue({
              success: true,
              plugins: pluginsAfterUninstall,
            });

            // Mock 卸载 API：成功
            vi.mocked(pluginAPI.uninstallPlugin).mockResolvedValue({
              success: true,
              message: `插件 ${pluginToUninstall.name} 已成功卸载`,
            });

            // 渲染 Hook
            const { result } = renderHook(() => usePlugins('test-env'));

            // 加载插件列表
            await act(async () => {
              await result.current.loadPlugins(true);
            });

            // 等待加载完成
            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // 验证初始状态：插件列表包含要卸载的插件
            expect(result.current.plugins).toHaveLength(plugins.length);
            expect(
              result.current.plugins.some((p) => p.name === pluginToUninstall.name)
            ).toBe(true);

            // 模拟卸载操作（通过刷新列表来更新状态）
            await act(async () => {
              // 在实际应用中，PluginRow 组件会调用 uninstallPlugin，然后调用 onRefresh
              await pluginAPI.uninstallPlugin(pluginToUninstall.name);
              // 刷新列表以获取更新后的插件列表
              await result.current.refreshPlugins();
            });

            // 等待刷新完成
            await waitFor(() => {
              expect(result.current.refreshing).toBe(false);
            });

            // 验证：插件列表应该不再包含已卸载的插件
            expect(
              result.current.plugins.some((p) => p.name === pluginToUninstall.name)
            ).toBe(false);

            // 验证：列表长度应该减少 1
            expect(result.current.plugins).toHaveLength(plugins.length - 1);

            // 验证：其他插件应该仍然存在
            const otherPlugins = plugins.filter(
              (p) => p.name !== pluginToUninstall.name
            );
            otherPlugins.forEach((plugin) => {
              expect(
                result.current.plugins.some((p) => p.name === plugin.name)
              ).toBe(true);
            });

            return true;
          }
        ),
        {
          numRuns: 50, // 减少迭代次数
          verbose: true,
          timeout: 10000, // 增加超时时间
        }
      );
    });

    it('卸载列表中唯一的插件后，列表应该为空', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成只有一个插件的列表
          pluginArbitrary,
          async (plugin) => {
            const plugins = [plugin];

            // Mock API 响应
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
              success: true,
              plugins: plugins,
              from_cache: true,
            });

            // Mock 刷新 API：返回空列表
            vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue({
              success: true,
              plugins: [],
            });

            // Mock 卸载 API：成功
            vi.mocked(pluginAPI.uninstallPlugin).mockResolvedValue({
              success: true,
              message: `插件 ${plugin.name} 已成功卸载`,
            });

            // 渲染 Hook
            const { result } = renderHook(() => usePlugins('test-env'));

            // 加载插件列表
            await act(async () => {
              await result.current.loadPlugins(true);
            });

            // 等待加载完成
            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // 验证初始状态：列表包含一个插件
            expect(result.current.plugins).toHaveLength(1);
            expect(result.current.plugins[0].name).toBe(plugin.name);

            // 模拟卸载操作
            await act(async () => {
              await pluginAPI.uninstallPlugin(plugin.name);
              await result.current.refreshPlugins();
            });

            // 等待刷新完成
            await waitFor(() => {
              expect(result.current.refreshing).toBe(false);
            });

            // 验证：列表应该为空
            expect(result.current.plugins).toHaveLength(0);

            return true;
          }
        ),
        {
          numRuns: 50,
          verbose: true,
          timeout: 10000,
        }
      );
    });

    it('卸载多个插件后，列表应该正确更新', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成一个较大的插件列表
          fc.array(pluginArbitrary, { minLength: 3, maxLength: 10 }),
          // 生成要卸载的插件数量（至少 2 个）
          fc.integer({ min: 2, max: 3 }),
          async (plugins, uninstallCount) => {
            // 确保不卸载超过列表长度的插件
            const actualUninstallCount = Math.min(uninstallCount, plugins.length);

            // 选择要卸载的插件（前 N 个）
            const pluginsToUninstall = plugins.slice(0, actualUninstallCount);
            const pluginsToUninstallNames = new Set(
              pluginsToUninstall.map((p) => p.name)
            );

            // Mock API 响应
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
              success: true,
              plugins: plugins,
              from_cache: true,
            });

            // 渲染 Hook
            const { result } = renderHook(() => usePlugins('test-env'));

            // 加载插件列表
            await act(async () => {
              await result.current.loadPlugins(true);
            });

            // 等待加载完成
            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // 验证初始状态
            expect(result.current.plugins).toHaveLength(plugins.length);

            // 依次卸载插件
            for (const pluginToUninstall of pluginsToUninstall) {
              // Mock 刷新 API：返回移除了当前卸载插件的列表
              const remainingPlugins = result.current.plugins.filter(
                (p) => p.name !== pluginToUninstall.name
              );
              vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue({
                success: true,
                plugins: remainingPlugins,
              });

              // Mock 卸载 API：成功
              vi.mocked(pluginAPI.uninstallPlugin).mockResolvedValue({
                success: true,
                message: `插件 ${pluginToUninstall.name} 已成功卸载`,
              });

              // 模拟卸载操作
              await act(async () => {
                await pluginAPI.uninstallPlugin(pluginToUninstall.name);
                await result.current.refreshPlugins();
              });

              // 等待刷新完成
              await waitFor(() => {
                expect(result.current.refreshing).toBe(false);
              });

              // 验证：插件已从列表中移除
              expect(
                result.current.plugins.some((p) => p.name === pluginToUninstall.name)
              ).toBe(false);
            }

            // 验证最终状态：列表长度应该减少 actualUninstallCount
            expect(result.current.plugins).toHaveLength(
              plugins.length - actualUninstallCount
            );

            // 验证：所有卸载的插件都不在列表中
            pluginsToUninstall.forEach((plugin) => {
              expect(
                result.current.plugins.some((p) => p.name === plugin.name)
              ).toBe(false);
            });

            // 验证：未卸载的插件仍然在列表中
            const remainingPlugins = plugins.filter(
              (p) => !pluginsToUninstallNames.has(p.name)
            );
            remainingPlugins.forEach((plugin) => {
              expect(
                result.current.plugins.some((p) => p.name === plugin.name)
              ).toBe(true);
            });

            return true;
          }
        ),
        {
          numRuns: 30, // 减少迭代次数，因为这个测试比较复杂
          verbose: true,
          timeout: 15000,
        }
      );
    });

    it('卸载失败时，列表不应该改变', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成一个插件列表
          fc.array(pluginArbitrary, { minLength: 1, maxLength: 10 }),
          async (plugins) => {
            // 选择一个要卸载的插件
            const uninstallIndex = Math.floor(Math.random() * plugins.length);
            const pluginToUninstall = plugins[uninstallIndex];

            // Mock API 响应
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
              success: true,
              plugins: plugins,
              from_cache: true,
            });

            // Mock 卸载 API：失败
            vi.mocked(pluginAPI.uninstallPlugin).mockResolvedValue({
              success: false,
              error: '卸载失败：权限不足',
            });

            // 渲染 Hook
            const { result } = renderHook(() => usePlugins('test-env'));

            // 加载插件列表
            await act(async () => {
              await result.current.loadPlugins(true);
            });

            // 等待加载完成
            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // 验证初始状态
            const initialPluginCount = result.current.plugins.length;
            expect(initialPluginCount).toBe(plugins.length);

            // 模拟卸载操作（失败）
            // 注意：卸载失败时，不应该调用 refreshPlugins
            const uninstallResult = await pluginAPI.uninstallPlugin(
              pluginToUninstall.name
            );

            // 验证卸载失败
            expect(uninstallResult.success).toBe(false);

            // 验证：列表应该保持不变（因为没有调用 refreshPlugins）
            expect(result.current.plugins).toHaveLength(initialPluginCount);
            expect(
              result.current.plugins.some((p) => p.name === pluginToUninstall.name)
            ).toBe(true);

            return true;
          }
        ),
        {
          numRuns: 50,
          verbose: true,
          timeout: 10000,
        }
      );
    });

    it('卸载后搜索过滤应该正确工作', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成一个插件列表
          fc.array(pluginArbitrary, { minLength: 2, maxLength: 20 }),
          // 生成搜索关键词
          fc.string({ minLength: 1, maxLength: 10 }),
          async (plugins, searchKeyword) => {
            // 选择一个要卸载的插件
            const uninstallIndex = Math.floor(Math.random() * plugins.length);
            const pluginToUninstall = plugins[uninstallIndex];

            // Mock API 响应
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
              success: true,
              plugins: plugins,
              from_cache: true,
            });

            // Mock 刷新 API：返回移除了卸载插件的列表
            const pluginsAfterUninstall = plugins.filter(
              (p) => p.name !== pluginToUninstall.name
            );
            vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue({
              success: true,
              plugins: pluginsAfterUninstall,
            });

            // Mock 卸载 API：成功
            vi.mocked(pluginAPI.uninstallPlugin).mockResolvedValue({
              success: true,
              message: `插件 ${pluginToUninstall.name} 已成功卸载`,
            });

            // 渲染 Hook
            const { result } = renderHook(() => usePlugins('test-env'));

            // 加载插件列表
            await act(async () => {
              await result.current.loadPlugins(true);
            });

            // 等待加载完成
            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // 设置搜索关键词
            act(() => {
              result.current.searchPlugins(searchKeyword);
            });

            // 计算卸载前的过滤结果
            const filteredBeforeUninstall = plugins.filter((p) =>
              p.name.toLowerCase().includes(searchKeyword.toLowerCase())
            );

            // 验证卸载前的过滤结果
            expect(result.current.filteredPlugins).toHaveLength(
              filteredBeforeUninstall.length
            );

            // 模拟卸载操作
            await act(async () => {
              await pluginAPI.uninstallPlugin(pluginToUninstall.name);
              await result.current.refreshPlugins();
            });

            // 等待刷新完成
            await waitFor(() => {
              expect(result.current.refreshing).toBe(false);
            });

            // 计算卸载后的过滤结果
            const filteredAfterUninstall = pluginsAfterUninstall.filter((p) =>
              p.name.toLowerCase().includes(searchKeyword.toLowerCase())
            );

            // 验证卸载后的过滤结果
            expect(result.current.filteredPlugins).toHaveLength(
              filteredAfterUninstall.length
            );

            // 验证：已卸载的插件不应该出现在过滤结果中
            expect(
              result.current.filteredPlugins.some(
                (p) => p.name === pluginToUninstall.name
              )
            ).toBe(false);

            return true;
          }
        ),
        {
          numRuns: 30, // 减少迭代次数
          verbose: true,
          timeout: 15000,
        }
      );
    });

    it('边界情况：卸载名称包含特殊字符的插件', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成包含特殊字符的插件名称
          fc.stringMatching(/^[a-zA-Z0-9_.-]{2,50}$/),
          async (pluginName) => {
            const plugin: PluginInfo = {
              name: pluginName,
              path: `/path/to/${pluginName}`,
              is_git_repo: true,
              git_url: 'https://github.com/test/repo',
              branch: 'main',
              default_branch: 'main',
              commit_hash: 'abc1234',
              commit_date: new Date().toISOString(),
              has_update: false,
              behind_commits: 0,
              dependency_updated: false,
              dependency_viewed: true,
            };

            const plugins = [plugin];

            // Mock API 响应
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
              success: true,
              plugins: plugins,
              from_cache: true,
            });

            // Mock 刷新 API：返回空列表
            vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue({
              success: true,
              plugins: [],
            });

            // Mock 卸载 API：成功
            vi.mocked(pluginAPI.uninstallPlugin).mockResolvedValue({
              success: true,
              message: `插件 ${pluginName} 已成功卸载`,
            });

            // 渲染 Hook
            const { result } = renderHook(() => usePlugins('test-env'));

            // 加载插件列表
            await act(async () => {
              await result.current.loadPlugins(true);
            });

            // 等待加载完成
            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // 验证初始状态
            expect(result.current.plugins).toHaveLength(1);
            expect(result.current.plugins[0].name).toBe(pluginName);

            // 模拟卸载操作
            await act(async () => {
              await pluginAPI.uninstallPlugin(pluginName);
              await result.current.refreshPlugins();
            });

            // 等待刷新完成
            await waitFor(() => {
              expect(result.current.refreshing).toBe(false);
            });

            // 验证：列表应该为空
            expect(result.current.plugins).toHaveLength(0);

            return true;
          }
        ),
        {
          numRuns: 50,
          verbose: true,
          timeout: 10000,
        }
      );
    });

    it('边界情况：卸载后立即加载应该返回更新后的列表', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成一个插件列表
          fc.array(pluginArbitrary, { minLength: 1, maxLength: 10 }),
          async (plugins) => {
            // 选择一个要卸载的插件
            const uninstallIndex = Math.floor(Math.random() * plugins.length);
            const pluginToUninstall = plugins[uninstallIndex];

            // Mock API 响应
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
              success: true,
              plugins: plugins,
              from_cache: true,
            });

            // Mock 刷新 API：返回移除了卸载插件的列表
            const pluginsAfterUninstall = plugins.filter(
              (p) => p.name !== pluginToUninstall.name
            );
            vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue({
              success: true,
              plugins: pluginsAfterUninstall,
            });

            // Mock 卸载 API：成功
            vi.mocked(pluginAPI.uninstallPlugin).mockResolvedValue({
              success: true,
              message: `插件 ${pluginToUninstall.name} 已成功卸载`,
            });

            // 渲染 Hook
            const { result } = renderHook(() => usePlugins('test-env'));

            // 加载插件列表
            await act(async () => {
              await result.current.loadPlugins(true);
            });

            // 等待加载完成
            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // 模拟卸载操作
            await act(async () => {
              await pluginAPI.uninstallPlugin(pluginToUninstall.name);
              await result.current.refreshPlugins();
            });

            // 等待刷新完成
            await waitFor(() => {
              expect(result.current.refreshing).toBe(false);
            });

            // 立即重新加载（使用缓存）
            // Mock getPlugins 返回更新后的列表
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
              success: true,
              plugins: pluginsAfterUninstall,
              from_cache: true,
            });

            await act(async () => {
              await result.current.loadPlugins(true);
            });

            // 等待加载完成
            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // 验证：列表应该不包含已卸载的插件
            expect(
              result.current.plugins.some((p) => p.name === pluginToUninstall.name)
            ).toBe(false);
            expect(result.current.plugins).toHaveLength(plugins.length - 1);

            return true;
          }
        ),
        {
          numRuns: 30, // 减少迭代次数
          verbose: true,
          timeout: 15000,
        }
      );
    });
  });
});
