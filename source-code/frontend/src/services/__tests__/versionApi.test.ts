/**
 * versionApi 单元测试
 * 测试插件版本切换相关的 API 服务
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { switchPluginVersion } from '../versionApi';
import type { PluginInfo } from '@/types/plugin';

// Mock pywebview API
const mockAPI = {
  switch_plugin_version: vi.fn(),
};

describe('versionApi - switchPluginVersion', () => {
  beforeEach(() => {
    // 设置 pywebview mock
    (global as any).window = {
      pywebview: {
        api: mockAPI,
      },
    };
    
    // 清除所有 mock 调用记录
    vi.clearAllMocks();
    
    // 清除 console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // 清理
    delete (global as any).window;
    vi.restoreAllMocks();
  });

  describe('成功调用场景', () => {
    it('应该成功切换插件版本并返回正确的结果', async () => {
      const mockPlugin: PluginInfo = {
        name: 'test-plugin',
        path: '/path/to/plugin',
        is_git_repo: true,
        git_url: 'https://github.com/test/plugin',
        branch: 'main',
        default_branch: 'main',
        commit_hash: 'def456',
        commit_date: '2024-01-02',
        has_update: false,
        behind_commits: 0,
        dependency_updated: false,
        dependency_viewed: false,
      };

      const mockResponse = {
        success: true,
        message: '版本切换成功',
        plugin: mockPlugin,
      };

      mockAPI.switch_plugin_version.mockResolvedValue(mockResponse);

      const result = await switchPluginVersion('test-plugin', 'abc123');

      // 验证 API 调用参数
      expect(mockAPI.switch_plugin_version).toHaveBeenCalledWith('test-plugin', 'abc123');
      expect(mockAPI.switch_plugin_version).toHaveBeenCalledTimes(1);

      // 验证返回结果
      expect(result.success).toBe(true);
      expect(result.message).toBe('版本切换成功');
      expect(result.plugin).toEqual(mockPlugin);
    });

    it('应该正确解析返回的插件信息', async () => {
      const mockPlugin: PluginInfo = {
        name: 'another-plugin',
        path: '/path/to/another',
        is_git_repo: true,
        git_url: 'https://github.com/test/another',
        branch: 'develop',
        default_branch: 'main',
        commit_hash: 'xyz789',
        commit_date: '2024-01-03',
        has_update: true,
        behind_commits: 5,
        dependency_updated: true,
        dependency_viewed: true,
      };

      mockAPI.switch_plugin_version.mockResolvedValue({
        success: true,
        message: '切换成功',
        plugin: mockPlugin,
      });

      const result = await switchPluginVersion('another-plugin', 'xyz789');

      // 验证插件信息的所有字段都正确解析
      expect(result.plugin).toBeDefined();
      expect(result.plugin?.name).toBe('another-plugin');
      expect(result.plugin?.commit_hash).toBe('xyz789');
      expect(result.plugin?.branch).toBe('develop');
      expect(result.plugin?.has_update).toBe(true);
      expect(result.plugin?.behind_commits).toBe(5);
    });

    it('应该处理没有插件信息的成功响应', async () => {
      mockAPI.switch_plugin_version.mockResolvedValue({
        success: true,
        message: '版本切换成功',
        // 没有 plugin 字段
      });

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('版本切换成功');
      expect(result.plugin).toBeUndefined();
    });
  });

  describe('失败场景', () => {
    it('应该处理后端返回的失败响应', async () => {
      mockAPI.switch_plugin_version.mockResolvedValue({
        success: false,
        message: '插件不存在: test-plugin',
      });

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('插件不存在: test-plugin');
      expect(result.plugin).toBeUndefined();
    });

    it('应该处理 Git 操作失败的错误', async () => {
      mockAPI.switch_plugin_version.mockResolvedValue({
        success: false,
        message: 'Git 错误：本地有未提交的修改',
      });

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Git 错误');
    });

    it('应该处理版本不存在的错误', async () => {
      mockAPI.switch_plugin_version.mockResolvedValue({
        success: false,
        message: '版本错误：提交 invalid123 不存在',
      });

      const result = await switchPluginVersion('test-plugin', 'invalid123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('版本错误');
    });
  });

  describe('网络错误场景', () => {
    it('应该处理网络连接失败', async () => {
      mockAPI.switch_plugin_version.mockRejectedValue(new Error('Network error'));

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('切换版本失败');
      expect(result.message).toContain('Network error');
      expect(console.error).toHaveBeenCalledWith(
        '切换插件版本失败:',
        expect.any(Error)
      );
    });

    it('应该处理 API 超时错误', async () => {
      mockAPI.switch_plugin_version.mockRejectedValue(new Error('Request timeout'));

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Request timeout');
    });

    it('应该处理未知错误', async () => {
      mockAPI.switch_plugin_version.mockRejectedValue(new Error('Unknown error'));

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('切换版本失败: Error: Unknown error');
    });

    it('应该处理非 Error 对象的异常', async () => {
      mockAPI.switch_plugin_version.mockRejectedValue('String error');

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('切换版本失败');
    });
  });

  describe('响应数据解析', () => {
    it('应该正确解析完整的响应数据', async () => {
      const completeResponse = {
        success: true,
        message: '版本切换成功',
        plugin: {
          name: 'test-plugin',
          path: '/path/to/plugin',
          is_git_repo: true,
          git_url: 'https://github.com/test/plugin',
          branch: 'main',
          default_branch: 'main',
          commit_hash: 'abc123',
          commit_date: '2024-01-01',
          has_update: false,
          behind_commits: 0,
          dependency_updated: false,
          dependency_viewed: false,
          enabled: true,
          git_fetch_error: null,
          git_fetch_error_detail: null,
          git_fetch_error_type: null,
        },
      };

      mockAPI.switch_plugin_version.mockResolvedValue(completeResponse);

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result).toEqual({
        success: true,
        message: '版本切换成功',
        plugin: completeResponse.plugin,
      });
    });

    it('应该处理部分字段缺失的响应', async () => {
      const partialResponse = {
        success: true,
        message: '切换成功',
        plugin: {
          name: 'test-plugin',
          path: '/path',
          is_git_repo: true,
          git_url: null,
          branch: null,
          default_branch: null,
          commit_hash: 'abc123',
          commit_date: null,
          has_update: false,
          behind_commits: 0,
          dependency_updated: false,
          dependency_viewed: false,
        },
      };

      mockAPI.switch_plugin_version.mockResolvedValue(partialResponse);

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.success).toBe(true);
      expect(result.plugin?.git_url).toBeNull();
      expect(result.plugin?.branch).toBeNull();
    });
  });

  describe('边界情况', () => {
    it('应该处理空插件名称', async () => {
      mockAPI.switch_plugin_version.mockResolvedValue({
        success: false,
        message: '插件名称不能为空',
      });

      const result = await switchPluginVersion('', 'abc123');

      expect(mockAPI.switch_plugin_version).toHaveBeenCalledWith('', 'abc123');
      expect(result.success).toBe(false);
    });

    it('应该处理空提交哈希', async () => {
      mockAPI.switch_plugin_version.mockResolvedValue({
        success: false,
        message: '提交哈希不能为空',
      });

      const result = await switchPluginVersion('test-plugin', '');

      expect(mockAPI.switch_plugin_version).toHaveBeenCalledWith('test-plugin', '');
      expect(result.success).toBe(false);
    });

    it('应该处理特殊字符的插件名称', async () => {
      const specialName = 'plugin-with-special_chars.123';
      
      mockAPI.switch_plugin_version.mockResolvedValue({
        success: true,
        message: '切换成功',
      });

      const result = await switchPluginVersion(specialName, 'abc123');

      expect(mockAPI.switch_plugin_version).toHaveBeenCalledWith(specialName, 'abc123');
      expect(result.success).toBe(true);
    });

    it('应该处理长提交哈希（完整 SHA）', async () => {
      const fullHash = 'abc123def456abc123def456abc123def456abc1';
      
      mockAPI.switch_plugin_version.mockResolvedValue({
        success: true,
        message: '切换成功',
      });

      const result = await switchPluginVersion('test-plugin', fullHash);

      expect(mockAPI.switch_plugin_version).toHaveBeenCalledWith('test-plugin', fullHash);
      expect(result.success).toBe(true);
    });
  });

  describe('pywebview API 不可用', () => {
    it('应该处理 window.pywebview 未定义的情况', async () => {
      delete (global as any).window;

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('切换版本失败');
      expect(console.error).toHaveBeenCalled();
    });

    it('应该处理 window.pywebview.api 未定义的情况', async () => {
      (global as any).window = {
        pywebview: {},
      };

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('切换版本失败');
    });
  });

  describe('异常捕获和错误消息', () => {
    it('应该记录详细的错误日志', async () => {
      const error = new Error('Detailed error message');
      mockAPI.switch_plugin_version.mockRejectedValue(error);

      await switchPluginVersion('test-plugin', 'abc123');

      expect(console.error).toHaveBeenCalledWith('切换插件版本失败:', error);
    });

    it('应该在错误消息中包含错误详情', async () => {
      const errorMessage = 'Connection refused';
      mockAPI.switch_plugin_version.mockRejectedValue(new Error(errorMessage));

      const result = await switchPluginVersion('test-plugin', 'abc123');

      expect(result.message).toContain(errorMessage);
    });

    it('应该返回标准化的错误格式', async () => {
      mockAPI.switch_plugin_version.mockRejectedValue(new Error('Test error'));

      const result = await switchPluginVersion('test-plugin', 'abc123');

      // 验证返回对象包含所有必需字段
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe('string');
    });
  });
});
