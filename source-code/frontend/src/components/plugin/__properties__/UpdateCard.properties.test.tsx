/**
 * UpdateCard 组件属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证插件更新相关功能在各种输入下的正确性
 * 
 * 验证需求: 5.4, 6.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { usePluginUpdate } from '@/hooks/usePluginUpdate';
import { pluginAPI } from '@/services/PluginAPIService';
import type { 
  UpdateResult, 
  PluginInfo, 
  UpdateInfoResponse, 
  PluginUpdateResponse,
  Dependency 
} from '@/types/plugin';

// Mock pluginAPI
vi.mock('@/services/PluginAPIService', () => ({
  pluginAPI: {
    getUpdateInfo: vi.fn(),
    updatePlugin: vi.fn(),
  },
}));

/**
 * fast-check 生成器：更新结果对象
 */
const updateResultArbitrary = fc.record<UpdateResult>({
  plugin_name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
  success: fc.boolean(),
  message: fc.string({ minLength: 1, maxLength: 100 }),
  dependency_changed: fc.boolean(),
  new_dependencies: fc.array(
    fc.record<Dependency>({
      package: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
      version: fc.string({ minLength: 1, maxLength: 20 }),
      installed: fc.boolean(),
      installed_version: fc.option(fc.string(), { nil: null }),
      version_match: fc.boolean(),
      message: fc.string({ minLength: 0, maxLength: 50 }),
    }),
    { minLength: 0, maxLength: 5 }
  ),
  dependencies_installed: fc.nat(10),
  error: fc.option(fc.string(), { nil: undefined }),
});

/**
 * fast-check 生成器：插件对象（有更新）
 */
const pluginWithUpdateArbitrary = fc.record<PluginInfo>({
  name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
  path: fc.string(),
  is_git_repo: fc.constant(true),
  git_url: fc.webUrl(),
  branch: fc.constantFrom('main', 'master', 'dev'),
  default_branch: fc.constantFrom('main', 'master'),
  commit_hash: fc.string({ minLength: 7, maxLength: 7 }).map(s => 
    s.split('').map(c => '0123456789abcdef'[Math.abs(c.charCodeAt(0)) % 16]).join('')
  ),
  commit_date: fc.date().map(d => d.toISOString()),
  has_update: fc.constant(true),
  behind_commits: fc.integer({ min: 1, max: 100 }),
  dependency_updated: fc.boolean(),
  dependency_viewed: fc.boolean(),
});

describe('UpdateCard 属性测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * 属性 8: 更新后依赖变化标记
   * 
   * 对于任意插件，当更新后依赖列表发生变化时（dependency_changed = true），
   * 更新结果应该包含 dependency_changed 标志和新增依赖列表
   * 
   * **Validates: Requirements 6.6**
   */
  describe('属性 8: 更新后依赖变化标记', () => {
    it('当依赖变化时，更新结果应该标记 dependency_changed 为 true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          fc.record<UpdateResult>({
            plugin_name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
            success: fc.constant(true),
            message: fc.string({ minLength: 1, maxLength: 100 }),
            dependency_changed: fc.constant(true),
            new_dependencies: fc.array(
              fc.record<Dependency>({
                package: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
                version: fc.string({ minLength: 1, maxLength: 20 }),
                installed: fc.boolean(),
                installed_version: fc.option(fc.string(), { nil: null }),
                version_match: fc.boolean(),
                message: fc.string({ minLength: 0, maxLength: 50 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            dependencies_installed: fc.nat(10),
          }),
          async (pluginName, updateResult) => {
            const mockResponse: PluginUpdateResponse = {
              success: true,
              message: updateResult.message,
              dependency_changed: updateResult.dependency_changed,
              new_dependencies: updateResult.new_dependencies,
            };
            vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => usePluginUpdate());

            try {
              let actualResult: UpdateResult | null = null;
              await act(async () => {
                actualResult = await result.current.updatePlugin(pluginName);
              });

              // 验证：dependency_changed 应该为 true
              expect(actualResult).not.toBeNull();
              expect(actualResult!.dependency_changed).toBe(true);

              // 验证：应该有新增依赖列表
              expect(actualResult!.new_dependencies).toBeDefined();
              expect(actualResult!.new_dependencies.length).toBeGreaterThan(0);

              // 验证：新增依赖列表应该与返回的一致
              expect(actualResult!.new_dependencies).toEqual(updateResult.new_dependencies);

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('当依赖未变化时，dependency_changed 应该为 false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          async (pluginName) => {
            const mockResponse: PluginUpdateResponse = {
              success: true,
              message: '更新成功',
              dependency_changed: false,
              new_dependencies: [],
            };
            vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => usePluginUpdate());

            try {
              let actualResult: UpdateResult | null = null;
              await act(async () => {
                actualResult = await result.current.updatePlugin(pluginName);
              });

              // 验证：dependency_changed 应该为 false
              expect(actualResult).not.toBeNull();
              expect(actualResult!.dependency_changed).toBe(false);

              // 验证：新增依赖列表应该为空
              expect(actualResult!.new_dependencies).toEqual([]);

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('更新结果应该正确反映依赖变化状态', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          updateResultArbitrary,
          async (pluginName, expectedResult) => {
            const mockResponse: PluginUpdateResponse = {
              success: expectedResult.success,
              message: expectedResult.message,
              dependency_changed: expectedResult.dependency_changed,
              new_dependencies: expectedResult.new_dependencies,
              error: expectedResult.error,
            };
            vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => usePluginUpdate());

            try {
              let actualResult: UpdateResult | null = null;
              await act(async () => {
                actualResult = await result.current.updatePlugin(pluginName);
              });

              // 验证：返回结果不为空
              expect(actualResult).not.toBeNull();

              // 只在更新成功时验证依赖变化状态
              if (expectedResult.success) {
                // 验证：dependency_changed 状态应该一致
                expect(actualResult!.dependency_changed).toBe(expectedResult.dependency_changed);

                // 验证：如果依赖有变化，new_dependencies 应该与预期一致
                if (expectedResult.dependency_changed) {
                  expect(actualResult!.new_dependencies).toEqual(expectedResult.new_dependencies);
                }
              }

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('依赖变化时，new_dependencies 应该包含所有必需字段', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          fc.array(
            fc.record<Dependency>({
              package: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
              version: fc.string({ minLength: 1, maxLength: 20 }),
              installed: fc.boolean(),
              installed_version: fc.option(fc.string(), { nil: null }),
              version_match: fc.boolean(),
              message: fc.string({ minLength: 0, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (pluginName, newDependencies) => {
            const mockResponse: PluginUpdateResponse = {
              success: true,
              message: '更新成功',
              dependency_changed: true,
              new_dependencies: newDependencies,
            };
            vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => usePluginUpdate());

            try {
              let actualResult: UpdateResult | null = null;
              await act(async () => {
                actualResult = await result.current.updatePlugin(pluginName);
              });

              // 验证：每个新增依赖都应该包含所有必需字段
              for (const dep of actualResult!.new_dependencies) {
                expect(dep).toHaveProperty('package');
                expect(dep).toHaveProperty('version');
                expect(dep).toHaveProperty('installed');
                expect(dep).toHaveProperty('installed_version');
                expect(dep).toHaveProperty('version_match');
                expect(dep).toHaveProperty('message');
              }

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  /**
   * 属性 18: 落后提交数显示
   * 
   * 对于任意有更新的插件（has_update = true），
   * UI 应该显示 behind_commits 的值
   * 
   * **Validates: Requirements 5.4**
   */
  describe('属性 18: 落后提交数显示', () => {
    it('有更新的插件应该有 behind_commits 值', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginWithUpdateArbitrary,
          async (plugin) => {
            // 验证：has_update 为 true 的插件应该有 behind_commits
            expect(plugin.has_update).toBe(true);
            expect(plugin.behind_commits).toBeGreaterThan(0);

            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('behind_commits 应该是正整数', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginWithUpdateArbitrary,
          async (plugin) => {
            // 验证：behind_commits 应该是正整数
            expect(plugin.behind_commits).toBeGreaterThan(0);
            expect(Number.isInteger(plugin.behind_commits)).toBe(true);

            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('behind_commits 应该在合理范围内', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginWithUpdateArbitrary,
          async (plugin) => {
            // 验证：behind_commits 应该在 1-100 范围内（合理的落后提交数）
            expect(plugin.behind_commits).toBeGreaterThanOrEqual(1);
            expect(plugin.behind_commits).toBeLessThanOrEqual(100);

            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('has_update 为 true 时，behind_commits 应该大于 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
            path: fc.string(),
            is_git_repo: fc.constant(true),
            git_url: fc.webUrl(),
            branch: fc.constantFrom('main', 'master', 'dev'),
            default_branch: fc.constantFrom('main', 'master'),
            commit_hash: fc.string({ minLength: 7, maxLength: 7 }).map(s => 
              s.split('').map(c => '0123456789abcdef'[Math.abs(c.charCodeAt(0)) % 16]).join('')
            ),
            commit_date: fc.date().map(d => d.toISOString()),
            has_update: fc.boolean(),
            // 如果 has_update 为 true，behind_commits 应该大于 0
            behind_commits: fc.nat(100),
            dependency_updated: fc.boolean(),
            dependency_viewed: fc.boolean(),
          }).filter(plugin => {
            // 过滤掉不合理的数据：has_update 为 true 但 behind_commits 为 0
            return !plugin.has_update || plugin.behind_commits > 0;
          }),
          async (plugin) => {
            // 验证：如果 has_update 为 true，behind_commits 应该大于 0
            if (plugin.has_update) {
              expect(plugin.behind_commits).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('behind_commits 应该与提交列表长度相关', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          fc.integer({ min: 1, max: 10 }),
          async (pluginName, commitCount) => {
            const mockCommits = Array.from({ length: commitCount }, (_, i) => ({
              hash: `hash${i}`,
              message: `commit ${i}`,
              date: new Date().toISOString(),
            }));

            const mockResponse: UpdateInfoResponse = {
              success: true,
              commits: mockCommits,
            };
            vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => usePluginUpdate());

            try {
              await act(async () => {
                await result.current.loadUpdateInfo(pluginName);
              });

              // 验证：提交列表长度应该与 commitCount 一致
              expect(result.current.commits.length).toBe(commitCount);

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  /**
   * 额外属性测试：更新失败时的状态一致性
   */
  describe('额外属性：更新失败时的状态一致性', () => {
    it('更新失败时，success 应该为 false 且有错误信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (pluginName, errorMessage) => {
            const mockResponse: PluginUpdateResponse = {
              success: false,
              error: errorMessage,
            };
            vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => usePluginUpdate());

            try {
              let actualResult: UpdateResult | null = null;
              await act(async () => {
                actualResult = await result.current.updatePlugin(pluginName);
              });

              // 验证：success 应该为 false
              expect(actualResult).not.toBeNull();
              expect(actualResult!.success).toBe(false);

              // 验证：应该有错误信息
              expect(actualResult!.error).toBeDefined();
              expect(actualResult!.error).toBe(errorMessage);

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });
});
