/**
 * usePlugins Hook 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证搜索过滤逻辑在各种输入下的正确性
 * 
 * 验证需求: 2.1, 2.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { usePlugins } from '../usePlugins';
import { pluginAPI } from '../../services/PluginAPIService';
import type { PluginInfo, PluginsResponse } from '../../types/plugin';

// Mock pluginAPI
vi.mock('../../services/PluginAPIService', () => ({
  pluginAPI: {
    getPlugins: vi.fn(),
    refreshPlugins: vi.fn(),
  },
}));

/**
 * fast-check 生成器：插件对象
 * 使用合理的字符串生成，避免特殊字符冲突
 */
const pluginArbitrary = fc.record<PluginInfo>({
  name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/), // 只使用字母数字和常见符号
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

/**
 * 生成插件列表的生成器
 */
const pluginListArbitrary = fc.array(pluginArbitrary, { minLength: 0, maxLength: 50 });

/**
 * 生成搜索关键词的生成器
 * 包括空字符串、普通字符串、大小写混合、带空格等
 */
const searchKeywordArbitrary = fc.oneof(
  fc.constant(''), // 空字符串
  fc.string({ minLength: 1, maxLength: 20 }), // 普通字符串
  fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/), // 字母数字
  fc.stringMatching(/^[A-Z]{1,10}$/), // 大写字母
  fc.stringMatching(/^[a-z]{1,10}$/), // 小写字母
  fc.string({ minLength: 1, maxLength: 20 }).map(s => `  ${s}  `), // 带前后空格
);

describe('usePlugins Hook 属性测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * 属性 1: 搜索过滤正确性
   * 
   * 对于任意搜索关键词和插件列表，过滤后的结果应该只包含名称中包含该关键词的插件（不区分大小写）
   * 
   * **Validates: Requirements 2.1, 2.2**
   */
  describe('属性 1: 搜索过滤正确性', () => {
    it('对于任意关键词，过滤结果应该只包含匹配的插件', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginListArbitrary,
          searchKeywordArbitrary,
          async (plugins, keyword) => {
            // Mock API 响应
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: plugins,
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 执行搜索
              act(() => {
                result.current.searchPlugins(keyword);
              });

              // 获取过滤结果
              const filteredPlugins = result.current.filteredPlugins;

              // 验证：所有过滤结果都应该包含关键词（不区分大小写）
              const trimmedKeyword = keyword.trim().toLowerCase();

              if (trimmedKeyword === '') {
                // 空关键词应该返回完整列表
                expect(filteredPlugins).toEqual(plugins);
              } else {
                // 非空关键词：所有结果都应该包含关键词
                for (const plugin of filteredPlugins) {
                  const pluginNameLower = plugin.name.toLowerCase();
                  expect(pluginNameLower).toContain(trimmedKeyword);
                }

                // 验证：所有包含关键词的插件都应该在结果中
                const expectedPlugins = plugins.filter(p =>
                  p.name.toLowerCase().includes(trimmedKeyword)
                );
                expect(filteredPlugins.length).toBe(expectedPlugins.length);

                // 验证：结果顺序应该与原列表一致
                const expectedNames = expectedPlugins.map(p => p.name);
                const actualNames = filteredPlugins.map(p => p.name);
                expect(actualNames).toEqual(expectedNames);
              }

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100, // 最少 100 次迭代
          verbose: true, // 显示详细信息
        }
      );
    });

    it('搜索应该不区分大小写', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginListArbitrary,
          fc.stringMatching(/^[a-zA-Z]{1,10}$/), // 只使用字母
          async (plugins, keyword) => {
            // Mock API 响应
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: plugins,
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 使用小写关键词搜索
              act(() => {
                result.current.searchPlugins(keyword.toLowerCase());
              });
              const lowerCaseResults = result.current.filteredPlugins;

              // 使用大写关键词搜索
              act(() => {
                result.current.searchPlugins(keyword.toUpperCase());
              });
              const upperCaseResults = result.current.filteredPlugins;

              // 使用混合大小写关键词搜索
              act(() => {
                result.current.searchPlugins(keyword);
              });
              const mixedCaseResults = result.current.filteredPlugins;

              // 验证：三种情况的结果应该完全相同
              expect(lowerCaseResults.map(p => p.name)).toEqual(upperCaseResults.map(p => p.name));
              expect(lowerCaseResults.map(p => p.name)).toEqual(mixedCaseResults.map(p => p.name));

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

    it('搜索应该忽略前后空格', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginListArbitrary,
          fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/), // 不包含空格的关键词
          async (plugins, keyword) => {
            // Mock API 响应
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: plugins,
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 使用不带空格的关键词搜索
              act(() => {
                result.current.searchPlugins(keyword);
              });
              const noSpaceResults = result.current.filteredPlugins;

              // 使用带前后空格的关键词搜索
              act(() => {
                result.current.searchPlugins(`  ${keyword}  `);
              });
              const withSpaceResults = result.current.filteredPlugins;

              // 验证：两种情况的结果应该完全相同
              expect(noSpaceResults.map(p => p.name)).toEqual(withSpaceResults.map(p => p.name));

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

    it('空关键词应该返回完整列表', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginListArbitrary,
          async (plugins) => {
            // Mock API 响应
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: plugins,
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 测试各种空关键词
              const emptyKeywords = ['', '   ', '\t', '\n'];

              for (const emptyKeyword of emptyKeywords) {
                act(() => {
                  result.current.searchPlugins(emptyKeyword);
                });

                // 验证：应该返回完整列表
                expect(result.current.filteredPlugins).toEqual(plugins);
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

    it('不存在的关键词应该返回空数组', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginListArbitrary,
          async (plugins) => {
            // Mock API 响应
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: plugins,
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 使用一个不太可能存在的关键词
              const impossibleKeyword = 'xyzabc123impossible';

              act(() => {
                result.current.searchPlugins(impossibleKeyword);
              });

              // 验证：如果没有插件包含该关键词，应该返回空数组
              const hasMatch = plugins.some(p =>
                p.name.toLowerCase().includes(impossibleKeyword.toLowerCase())
              );

              if (!hasMatch) {
                expect(result.current.filteredPlugins).toEqual([]);
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

    it('搜索结果应该保持原列表的顺序', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginListArbitrary,
          searchKeywordArbitrary,
          async (plugins, keyword) => {
            // Mock API 响应
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: plugins,
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 执行搜索
              act(() => {
                result.current.searchPlugins(keyword);
              });

              const filteredPlugins = result.current.filteredPlugins;
              const trimmedKeyword = keyword.trim().toLowerCase();

              if (trimmedKeyword !== '') {
                // 验证：过滤结果的顺序应该与原列表中匹配插件的顺序一致
                const expectedOrder = plugins
                  .filter(p => p.name.toLowerCase().includes(trimmedKeyword))
                  .map(p => p.name);

                const actualOrder = filteredPlugins.map(p => p.name);

                expect(actualOrder).toEqual(expectedOrder);
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

    it('部分匹配应该正确工作', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record<PluginInfo>({
              name: fc.oneof(
                fc.constant('ComfyUI-Manager'),
                fc.constant('ComfyUI-Custom-Scripts'),
                fc.constant('ComfyUI-Impact-Pack'),
                fc.constant('Manager-Tools'),
                fc.constant('Custom-Manager'),
                fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/)
              ),
              path: fc.string({ minLength: 1, maxLength: 100 }),
              is_git_repo: fc.boolean(),
              git_url: fc.option(fc.webUrl(), { nil: null }),
              branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
              default_branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
              commit_hash: fc.option(
                fc.array(
                  fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
                  { minLength: 7, maxLength: 7 }
                ).map(arr => arr.join('')),
                { nil: null }
              ),
              commit_date: fc.option(
                fc.date().map(d => d.toISOString()),
                { nil: null }
              ),
              has_update: fc.boolean(),
              behind_commits: fc.nat({ max: 100 }),
              dependency_updated: fc.boolean(),
              dependency_viewed: fc.boolean(),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (plugins) => {
            // Mock API 响应
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: plugins,
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 测试部分匹配
              const partialKeywords = ['manager', 'custom', 'comfy', 'ui'];

              for (const keyword of partialKeywords) {
                act(() => {
                  result.current.searchPlugins(keyword);
                });

                const filteredPlugins = result.current.filteredPlugins;

                // 验证：所有结果都应该包含关键词
                for (const plugin of filteredPlugins) {
                  expect(plugin.name.toLowerCase()).toContain(keyword.toLowerCase());
                }

                // 验证：所有包含关键词的插件都应该在结果中
                const expectedCount = plugins.filter(p =>
                  p.name.toLowerCase().includes(keyword.toLowerCase())
                ).length;
                expect(filteredPlugins.length).toBe(expectedCount);
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

    it('多次搜索应该独立工作', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginListArbitrary,
          fc.array(searchKeywordArbitrary, { minLength: 2, maxLength: 5 }),
          async (plugins, keywords) => {
            // Mock API 响应
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: plugins,
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 执行多次搜索
              for (const keyword of keywords) {
                act(() => {
                  result.current.searchPlugins(keyword);
                });

                const filteredPlugins = result.current.filteredPlugins;
                const trimmedKeyword = keyword.trim().toLowerCase();

                // 验证：每次搜索的结果都应该正确
                if (trimmedKeyword === '') {
                  expect(filteredPlugins).toEqual(plugins);
                } else {
                  for (const plugin of filteredPlugins) {
                    expect(plugin.name.toLowerCase()).toContain(trimmedKeyword);
                  }
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

    it('搜索关键词应该正确更新', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginListArbitrary,
          searchKeywordArbitrary,
          async (plugins, keyword) => {
            // Mock API 响应
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: plugins,
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 执行搜索
              act(() => {
                result.current.searchPlugins(keyword);
              });

              // 验证：searchKeyword 应该被正确更新
              expect(result.current.searchKeyword).toBe(keyword);

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

    it('边界情况：空插件列表', async () => {
      await fc.assert(
        fc.asyncProperty(
          searchKeywordArbitrary,
          async (keyword) => {
            // Mock API 响应（空列表）
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: [],
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 执行搜索
              act(() => {
                result.current.searchPlugins(keyword);
              });

              // 验证：空列表搜索应该返回空数组
              expect(result.current.filteredPlugins).toEqual([]);

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

    it('边界情况：单个插件', async () => {
      await fc.assert(
        fc.asyncProperty(
          pluginArbitrary,
          searchKeywordArbitrary,
          async (plugin, keyword) => {
            // Mock API 响应（单个插件）
            const mockResponse: PluginsResponse = {
              success: true,
              plugins: [plugin],
              from_cache: true,
            };
            vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);

            // 渲染 Hook
            const { result, unmount } = renderHook(() => usePlugins('test-env'));

            try {
              // 加载插件列表
              await act(async () => {
                await result.current.loadPlugins();
              });

              // 执行搜索
              act(() => {
                result.current.searchPlugins(keyword);
              });

              const filteredPlugins = result.current.filteredPlugins;
              const trimmedKeyword = keyword.trim().toLowerCase();

              // 验证：如果插件名称包含关键词，应该返回该插件；否则返回空数组
              if (trimmedKeyword === '' || plugin.name.toLowerCase().includes(trimmedKeyword)) {
                expect(filteredPlugins).toEqual([plugin]);
              } else {
                expect(filteredPlugins).toEqual([]);
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
});
