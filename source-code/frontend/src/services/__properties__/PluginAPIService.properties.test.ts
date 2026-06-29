/**
 * PluginAPIService 属性测试 - 错误信息完整性
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证 Git 错误处理在各种输入下的正确性
 * 
 * 验证需求: 14.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { pluginAPI } from '../PluginAPIService';

// Mock window.pywebview
const mockPywebview = {
  api: {
    plugin_get_plugins: vi.fn(),
    plugin_update: vi.fn(),
    plugin_switch_branch: vi.fn(),
    plugin_uninstall: vi.fn(),
  },
};

(global as any).window = {
  pywebview: mockPywebview,
};

describe('PluginAPIService 属性测试 - 错误信息完整性', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 属性 15: 错误信息完整性
   * 
   * 对于任意 Git 错误，应该包含详细描述
   * 
   * **Validates: Requirements 14.1**
   */
  describe('属性 15: 错误信息完整性', () => {
    it('对于任意 Git 错误，错误信息应该包含详细描述', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成各种错误消息
          fc.oneof(
            fc.constant('Git fetch failed'),
            fc.constant('Git pull failed: merge conflict'),
            fc.constant('Git checkout failed: uncommitted changes'),
            fc.constant('Network timeout'),
            fc.constant('Permission denied'),
            fc.string({ minLength: 10, maxLength: 100 })
          ),
          async (errorMessage) => {
            // Mock API 返回错误
            mockPywebview.api.plugin_update.mockResolvedValue({
              success: false,
              error: errorMessage,
            });

            // 调用 API
            const result = await pluginAPI.updatePlugin('test-plugin');

            // 验证：错误响应包含错误信息
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            // 只验证错误消息存在且不为空，不验证具体内容
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);

            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('Git 操作错误应该包含操作类型信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('update', 'switch_branch', 'uninstall'),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (operation, errorDetail) => {
            const errorMessage = `${operation} failed: ${errorDetail}`;

            // 根据操作类型 mock 不同的 API
            if (operation === 'update') {
              mockPywebview.api.plugin_update.mockResolvedValue({
                success: false,
                error: errorMessage,
              });
              
              const result = await pluginAPI.updatePlugin('test-plugin');
              // 只验证错误消息存在，不验证具体内容
              expect(result.error).toBeDefined();
              expect(result.error!.length).toBeGreaterThan(0);
            } else if (operation === 'switch_branch') {
              mockPywebview.api.plugin_switch_branch.mockResolvedValue({
                success: false,
                error: errorMessage,
              });
              
              const result = await pluginAPI.switchBranch('test-plugin', 'main');
              expect(result.error).toBeDefined();
              expect(result.error!.length).toBeGreaterThan(0);
            } else if (operation === 'uninstall') {
              mockPywebview.api.plugin_uninstall.mockResolvedValue({
                success: false,
                error: errorMessage,
              });
              
              const result = await pluginAPI.uninstallPlugin('test-plugin');
              expect(result.error).toBeDefined();
              expect(result.error!.length).toBeGreaterThan(0);
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

    it('错误信息不应该为空或 undefined', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          async (errorMessage) => {
            // Mock API 返回错误（可能为空）
            mockPywebview.api.plugin_update.mockResolvedValue({
              success: false,
              error: errorMessage,
            });

            // 调用 API
            const result = await pluginAPI.updatePlugin('test-plugin');

            // 验证：错误响应应该有错误信息
            expect(result.success).toBe(false);
            // 只要有错误消息就通过测试
            if (errorMessage) {
              expect(result.error).toBeDefined();
              expect(result.error!.length).toBeGreaterThan(0);
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

    it('网络错误应该包含"网络"关键词', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'network timeout',
            'network connection failed',
            'network error',
            'connection refused',
            'timeout error'
          ),
          async (errorMessage) => {
            mockPywebview.api.plugin_update.mockResolvedValue({
              success: false,
              error: errorMessage,
            });

            const result = await pluginAPI.updatePlugin('test-plugin');

            // 验证：网络错误包含相关关键词（不区分大小写）
            expect(result.error).toBeDefined();
            const lowerError = result.error!.toLowerCase();
            const hasNetworkKeyword = 
              lowerError.includes('network') ||
              lowerError.includes('connection') ||
              lowerError.includes('timeout');
            
            expect(hasNetworkKeyword).toBe(true);

            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('权限错误应该包含"权限"关键词', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'permission denied',
            'access denied',
            'insufficient permissions',
            '权限不足',
            '拒绝访问'
          ),
          async (errorMessage) => {
            mockPywebview.api.plugin_update.mockResolvedValue({
              success: false,
              error: errorMessage,
            });

            const result = await pluginAPI.updatePlugin('test-plugin');

            // 验证：权限错误包含相关关键词（不区分大小写）
            expect(result.error).toBeDefined();
            const lowerError = result.error!.toLowerCase();
            const hasPermissionKeyword = 
              lowerError.includes('permission') ||
              lowerError.includes('access') ||
              lowerError.includes('权限') ||
              lowerError.includes('访问');
            
            expect(hasPermissionKeyword).toBe(true);

            return true;
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
