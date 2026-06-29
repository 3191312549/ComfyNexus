/**
 * DependencyCard 组件属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证依赖管理相关功能在各种输入下的正确性
 * 
 * 验证需求: 3.3, 3.4, 3.6, 3.7, 4.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { useDependencies } from '@/hooks/useDependencies';
import { pluginAPI } from '@/services/PluginAPIService';
import type { Dependency, DependenciesResponse, DependencyInstallResponse } from '@/types/plugin';

// Mock pluginAPI
vi.mock('@/services/PluginAPIService', () => ({
  pluginAPI: {
    getPluginDependencies: vi.fn(),
    installDependency: vi.fn(),
  },
}));

/**
 * fast-check 生成器：依赖对象
 */
const dependencyArbitrary = fc.record<Dependency>({
  package: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
  version: fc.oneof(
    fc.constant('>=1.0.0'),
    fc.constant('==2.0.0'),
    fc.constant('~=3.0'),
    fc.constant('>=1.0.0,<2.0.0')
  ),
  installed: fc.boolean(),
  installed_version: fc.option(
    fc.stringMatching(/^[0-9]+\.[0-9]+\.[0-9]+$/),
    { nil: null }
  ),
  version_match: fc.boolean(),
  message: fc.string({ minLength: 0, maxLength: 50 }),
});

/**
 * 生成依赖列表的生成器
 */
const dependencyListArbitrary = fc.array(dependencyArbitrary, { 
  minLength: 0, 
  maxLength: 10 
});

describe('DependencyCard 属性测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * 属性 5: 依赖按钮状态一致性
   * 
   * 对于任意依赖对象，按钮状态应该与安装状态一致：
   * - 已安装且版本匹配的依赖：installed = true, version_match = true
   * - 未安装或版本不匹配的依赖：installed = false 或 version_match = false
   * 
   * **Validates: Requirements 3.3, 3.4**
   */
  describe('属性 5: 依赖按钮状态一致性', () => {
    it('对于任意依赖，按钮状态应该与安装状态一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          dependencyListArbitrary,
          async (pluginName, dependencies) => {
            const mockResponse: DependenciesResponse = {
              success: true,
              dependencies: dependencies,
            };
            vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => useDependencies());

            try {
              await act(async () => {
                await result.current.loadDependencies(pluginName);
              });

              // 验证每个依赖的状态
              for (let i = 0; i < dependencies.length; i++) {
                const dep = dependencies[i];
                const loadedDep = result.current.dependencies[i];

                // 验证：依赖数据应该正确加载
                expect(loadedDep.package).toBe(dep.package);
                expect(loadedDep.installed).toBe(dep.installed);
                expect(loadedDep.version_match).toBe(dep.version_match);

                // 验证：按钮状态逻辑
                // 已安装且版本匹配 -> 应该显示为已安装
                // 其他情况 -> 应该显示为可安装
                const shouldBeInstalled = dep.installed && dep.version_match;
                expect(loadedDep.installed && loadedDep.version_match).toBe(shouldBeInstalled);
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

    it('已安装且版本匹配的依赖状态应该正确', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          fc.array(
            fc.record<Dependency>({
              package: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
              version: fc.string({ minLength: 1, maxLength: 20 }),
              installed: fc.constant(true),
              installed_version: fc.stringMatching(/^[0-9]+\.[0-9]+\.[0-9]+$/),
              version_match: fc.constant(true),
              message: fc.constant('已安装'),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (pluginName, dependencies) => {
            const mockResponse: DependenciesResponse = {
              success: true,
              dependencies: dependencies,
            };
            vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => useDependencies());

            try {
              await act(async () => {
                await result.current.loadDependencies(pluginName);
              });

              // 验证：所有依赖都应该标记为已安装且版本匹配
              for (const dep of result.current.dependencies) {
                expect(dep.installed).toBe(true);
                expect(dep.version_match).toBe(true);
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

    it('未安装的依赖状态应该正确', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          fc.array(
            fc.record<Dependency>({
              package: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
              version: fc.string({ minLength: 1, maxLength: 20 }),
              installed: fc.constant(false),
              installed_version: fc.constant(null),
              version_match: fc.constant(false),
              message: fc.constant('未安装'),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (pluginName, dependencies) => {
            const mockResponse: DependenciesResponse = {
              success: true,
              dependencies: dependencies,
            };
            vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => useDependencies());

            try {
              await act(async () => {
                await result.current.loadDependencies(pluginName);
              });

              // 验证：所有依赖都应该标记为未安装
              for (const dep of result.current.dependencies) {
                expect(dep.installed).toBe(false);
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
   * 属性 6: 依赖查看状态更新
   * 
   * 对于任意插件，当用户查看依赖后（通过 clearDependencies），
   * 依赖列表应该被清空，这模拟了关闭依赖卡片的行为
   * 
   * **Validates: Requirements 3.7, 4.3**
   */
  describe('属性 6: 依赖查看状态更新', () => {
    it('清除依赖列表后，dependencies 应该为空数组', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          dependencyListArbitrary,
          async (pluginName, dependencies) => {
            const mockResponse: DependenciesResponse = {
              success: true,
              dependencies: dependencies,
            };
            vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => useDependencies());

            try {
              // 加载依赖
              await act(async () => {
                await result.current.loadDependencies(pluginName);
              });

              // 验证：依赖已加载
              expect(result.current.dependencies.length).toBe(dependencies.length);

              // 清除依赖（模拟关闭依赖卡片）
              act(() => {
                result.current.clearDependencies();
              });

              // 验证：依赖列表应该被清空
              expect(result.current.dependencies).toEqual([]);

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

    it('即使依赖列表为空，清除操作也应该正常工作', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          async (pluginName) => {
            const mockResponse: DependenciesResponse = {
              success: true,
              dependencies: [],
            };
            vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => useDependencies());

            try {
              await act(async () => {
                await result.current.loadDependencies(pluginName);
              });

              expect(result.current.dependencies).toEqual([]);

              act(() => {
                result.current.clearDependencies();
              });

              expect(result.current.dependencies).toEqual([]);

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

    it('多次清除操作应该是幂等的', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          dependencyListArbitrary,
          async (pluginName, dependencies) => {
            const mockResponse: DependenciesResponse = {
              success: true,
              dependencies: dependencies,
            };
            vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => useDependencies());

            try {
              await act(async () => {
                await result.current.loadDependencies(pluginName);
              });

              // 多次清除
              act(() => {
                result.current.clearDependencies();
                result.current.clearDependencies();
                result.current.clearDependencies();
              });

              // 验证：依赖列表应该为空
              expect(result.current.dependencies).toEqual([]);

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
   * 属性 7: 依赖安装状态更新
   * 
   * 对于任意依赖，当安装成功后，installed 标志应该立即更新为 true，
   * version_match 也应该更新为 true
   * 
   * **Validates: Requirements 3.6**
   */
  describe('属性 7: 依赖安装状态更新', () => {
    it('安装成功后，依赖状态应该立即更新', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          fc.array(
            fc.record<Dependency>({
              package: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
              version: fc.string({ minLength: 1, maxLength: 20 }),
              installed: fc.constant(false),
              installed_version: fc.constant(null),
              version_match: fc.constant(false),
              message: fc.constant('未安装'),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (pluginName, dependencies) => {
            const mockResponse: DependenciesResponse = {
              success: true,
              dependencies: dependencies,
            };
            vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);

            const installedVersion = '1.0.0';
            const mockInstallResponse: DependencyInstallResponse = {
              success: true,
              installed: true,
              installed_version: installedVersion,
            };
            vi.mocked(pluginAPI.installDependency).mockResolvedValue(mockInstallResponse);

            const { result, unmount } = renderHook(() => useDependencies());

            try {
              await act(async () => {
                await result.current.loadDependencies(pluginName);
              });

              const firstDep = dependencies[0];

              // 安装第一个依赖
              let installSuccess = false;
              await act(async () => {
                installSuccess = await result.current.installDependency(
                  pluginName,
                  firstDep.package,
                  firstDep.version
                );
              });

              // 验证：安装应该成功
              expect(installSuccess).toBe(true);

              // 验证：API 被正确调用
              expect(pluginAPI.installDependency).toHaveBeenCalledWith(
                pluginName,
                firstDep.package,
                firstDep.version
              );

              // 验证：依赖状态应该更新
              const updatedDep = result.current.dependencies.find(
                d => d.package === firstDep.package
              );
              expect(updatedDep).toBeDefined();
              expect(updatedDep!.installed).toBe(true);
              expect(updatedDep!.version_match).toBe(true);
              expect(updatedDep!.installed_version).toBe(installedVersion);

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

    it('安装失败时，依赖状态不应该改变', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          fc.record<Dependency>({
            package: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
            version: fc.string({ minLength: 1, maxLength: 20 }),
            installed: fc.constant(false),
            installed_version: fc.constant(null),
            version_match: fc.constant(false),
            message: fc.constant('未安装'),
          }),
          async (pluginName, dependency) => {
            const mockResponse: DependenciesResponse = {
              success: true,
              dependencies: [dependency],
            };
            vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);

            const mockInstallResponse: DependencyInstallResponse = {
              success: false,
              error: '安装失败',
            };
            vi.mocked(pluginAPI.installDependency).mockResolvedValue(mockInstallResponse);

            const { result, unmount } = renderHook(() => useDependencies());

            try {
              await act(async () => {
                await result.current.loadDependencies(pluginName);
              });

              const originalDep = result.current.dependencies[0];

              // 尝试安装
              let installSuccess = false;
              await act(async () => {
                installSuccess = await result.current.installDependency(
                  pluginName,
                  dependency.package,
                  dependency.version
                );
              });

              // 验证：安装应该失败
              expect(installSuccess).toBe(false);

              // 验证：依赖状态不应该改变
              const unchangedDep = result.current.dependencies[0];
              expect(unchangedDep.installed).toBe(originalDep.installed);
              expect(unchangedDep.version_match).toBe(originalDep.version_match);
              expect(unchangedDep.installed_version).toBe(originalDep.installed_version);

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

    it('多个依赖可以独立安装，状态互不影响', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
          fc.array(
            fc.record<Dependency>({
              package: fc.stringMatching(/^[a-zA-Z0-9_-]{2,30}$/),
              version: fc.string({ minLength: 1, maxLength: 20 }),
              installed: fc.constant(false),
              installed_version: fc.constant(null),
              version_match: fc.constant(false),
              message: fc.constant('未安装'),
            }),
            { minLength: 2, maxLength: 3 }
          ),
          async (pluginName, dependencies) => {
            const mockResponse: DependenciesResponse = {
              success: true,
              dependencies: dependencies,
            };
            vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);

            const mockInstallResponse: DependencyInstallResponse = {
              success: true,
              installed: true,
              installed_version: '1.0.0',
            };
            vi.mocked(pluginAPI.installDependency).mockResolvedValue(mockInstallResponse);

            const { result, unmount } = renderHook(() => useDependencies());

            try {
              await act(async () => {
                await result.current.loadDependencies(pluginName);
              });

              // 只安装第一个依赖
              const firstDep = dependencies[0];
              await act(async () => {
                await result.current.installDependency(
                  pluginName,
                  firstDep.package,
                  firstDep.version
                );
              });

              // 验证：第一个依赖已安装
              const updatedFirstDep = result.current.dependencies.find(
                d => d.package === firstDep.package
              );
              expect(updatedFirstDep!.installed).toBe(true);

              // 验证：其他依赖仍然未安装
              const otherDeps = result.current.dependencies.filter(
                d => d.package !== firstDep.package
              );
              for (const dep of otherDeps) {
                expect(dep.installed).toBe(false);
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
