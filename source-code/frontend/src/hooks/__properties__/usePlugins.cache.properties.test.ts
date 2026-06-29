/**
 * usePlugins Hook 属性测试 - 环境缓存隔离
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证不同环境的缓存隔离逻辑
 * 
 * 验证需求: 16.1, 16.2, 16.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  branch: fc.option(fc.constantFrom('main', 'master', 'dev'), { nil: null }),
  default_branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
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

describe('usePlugins 属性测试 - 环境缓存隔离', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 属性 16: 环境缓存隔离
   * 
   * 对于任意两个不同的环境 ID，它们的插件缓存应该是独立的
   * 
   * **Validates: Requirements 16.1, 16.2, 16.3**
   */
  describe('属性 16: 环境缓存隔离', () => {
    it('对于任意两个不同的环境，缓存应该独立', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成两个不同的环境 ID
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          // 生成两个不同的插件列表
          fc.array(pluginArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(pluginArbitrary, { minLength: 1, maxLength: 5 }),
          async (envId1, envId2, plugins1, plugins2) => {
            // 确保环境 ID 不同
            if (envId1 === envId2) {
              return true; // 跳过相同环境的情况
            }

            // Mock API 响应 - 环境 1
            vi.mocked(pluginAPI.getPlugins).mockImplementation(async () => ({
              success: true,
              plugins: plugins1,
              from_cache: true,
            }));

            // 渲染环境 1 的 Hook
            const { result: result1 } = renderHook(() => usePlugins(envId1));

            // 加载环境 1 的插件
            await act(async () => {
              await result1.current.loadPlugins(true);
            });

            await waitFor(() => {
              expect(result1.current.loading).toBe(false);
            });

            // 验证环境 1 的插件列表
            expect(result1.current.plugins).toHaveLength(plugins1.length);

            // Mock API 响应 - 环境 2（返回不同的插件列表）
            vi.mocked(pluginAPI.getPlugins).mockImplementation(async () => ({
              success: true,
              plugins: plugins2,
              from_cache: true,
            }));

            // 渲染环境 2 的 Hook
            const { result: result2 } = renderHook(() => usePlugins(envId2));

            // 加载环境 2 的插件
            await act(async () => {
              await result2.current.loadPlugins(true);
            });

            await waitFor(() => {
              expect(result2.current.loading).toBe(false);
            });

            // 验证环境 2 的插件列表
            expect(result2.current.plugins).toHaveLength(plugins2.length);

            // 核心验证：两个环境的插件列表应该不同（如果插件数量不同）
            if (plugins1.length !== plugins2.length) {
              expect(result1.current.plugins.length).not.toBe(result2.current.plugins.length);
            }

            // 验证：环境 1 的插件列表没有被环境 2 影响
            expect(result1.current.plugins).toHaveLength(plugins1.length);

            return true;
          }
        ),
        {
          numRuns: 50, // 减少迭代次数
          verbose: true,
          timeout: 15000,
        }
      );
    });

    it('切换环境时应该重新加载对应环境的插件列表', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.array(pluginArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(pluginArbitrary, { minLength: 1, maxLength: 5 }),
          async (envId1, envId2, plugins1, plugins2) => {
            if (envId1 === envId2) {
              return true;
            }

            // 设置 Mock 返回不同环境的数据
            let currentEnv = envId1;
            vi.mocked(pluginAPI.getPlugins).mockImplementation(async () => ({
              success: true,
              plugins: currentEnv === envId1 ? plugins1 : plugins2,
              from_cache: true,
            }));

            // 渲染 Hook（初始环境 1）
            const { result, rerender } = renderHook(
              ({ envId }) => usePlugins(envId),
              { initialProps: { envId: envId1 } }
            );

            // 加载环境 1
            await act(async () => {
              await result.current.loadPlugins(true);
            });

            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            expect(result.current.plugins).toHaveLength(plugins1.length);

            // 切换到环境 2
            currentEnv = envId2;
            rerender({ envId: envId2 });

            // 重新加载
            await act(async () => {
              await result.current.loadPlugins(true);
            });

            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // 验证：应该加载环境 2 的插件
            expect(result.current.plugins).toHaveLength(plugins2.length);

            return true;
          }
        ),
        {
          numRuns: 50,
          verbose: true,
          timeout: 15000,
        }
      );
    });

    it('修改一个环境的缓存不应该影响另一个环境', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.array(pluginArbitrary, { minLength: 2, maxLength: 5 }),
          async (envId1, envId2, initialPlugins) => {
            if (envId1 === envId2 || initialPlugins.length < 2) {
              return true;
            }

            // 两个环境初始都有相同的插件列表
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue({
              success: true,
              plugins: initialPlugins,
              from_cache: true,
            });

            // 渲染两个环境的 Hook
            const { result: result1 } = renderHook(() => usePlugins(envId1));
            const { result: result2 } = renderHook(() => usePlugins(envId2));

            // 加载两个环境
            await act(async () => {
              await result1.current.loadPlugins(true);
              await result2.current.loadPlugins(true);
            });

            await waitFor(() => {
              expect(result1.current.loading).toBe(false);
              expect(result2.current.loading).toBe(false);
            });

            // 验证初始状态相同
            expect(result1.current.plugins).toHaveLength(initialPlugins.length);
            expect(result2.current.plugins).toHaveLength(initialPlugins.length);

            // 模拟环境 1 的插件列表变化（删除一个插件）
            const modifiedPlugins = initialPlugins.slice(0, -1);
            vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue({
              success: true,
              plugins: modifiedPlugins,
            });

            // 只刷新环境 1
            await act(async () => {
              await result1.current.refreshPlugins();
            });

            await waitFor(() => {
              expect(result1.current.refreshing).toBe(false);
            });

            // 验证：环境 1 的插件列表已更新
            expect(result1.current.plugins).toHaveLength(modifiedPlugins.length);

            // 验证：环境 2 的插件列表未受影响
            expect(result2.current.plugins).toHaveLength(initialPlugins.length);

            return true;
          }
        ),
        {
          numRuns: 50,
          verbose: true,
          timeout: 15000,
        }
      );
    });
  });
});
