/**
 * pluginService 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pluginService } from '../pluginService';
import type { PluginsResponse, DependenciesResponse } from '@/types/plugin';

// Mock pywebview API
const mockAPI = {
  get_plugins: vi.fn(),
  search_plugins: vi.fn(),
  refresh_plugins: vi.fn(),
  get_plugin_dependencies: vi.fn(),
  install_dependency: vi.fn(),
  update_plugin: vi.fn(),
  update_all_plugins: vi.fn(),
  get_update_info: vi.fn(),
  switch_plugin_branch: vi.fn(),
  get_plugin_branches: vi.fn(),
  uninstall_plugin: vi.fn(),
  open_plugin_folder: vi.fn(),
  detect_plugin_conflicts: vi.fn(),
};

describe('PluginService', () => {
  beforeEach(() => {
    // 设置 pywebview mock
    (global as any).window = {
      pywebview: {
        api: mockAPI,
      },
    };
    
    // 清除所有 mock 调用记录
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 清理
    delete (global as any).window;
  });

  describe('getPlugins', () => {
    it('应该成功获取插件列表', async () => {
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: [
          {
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
          },
        ],
        from_cache: true,
      };

      mockAPI.get_plugins.mockResolvedValue(mockResponse);

      const result = await pluginService.getPlugins();

      expect(mockAPI.get_plugins).toHaveBeenCalledWith(true);
      expect(result).toEqual(mockResponse);
    });

    it('应该处理 API 错误', async () => {
      mockAPI.get_plugins.mockRejectedValue(new Error('API 错误'));

      const result = await pluginService.getPlugins();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('searchPlugins', () => {
    it('应该成功搜索插件', async () => {
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: [],
      };

      mockAPI.search_plugins.mockResolvedValue(mockResponse);

      const result = await pluginService.searchPlugins('test');

      expect(mockAPI.search_plugins).toHaveBeenCalledWith('test');
      expect(result).toEqual(mockResponse);
    });

    it('应该处理搜索错误', async () => {
      mockAPI.search_plugins.mockRejectedValue(new Error('搜索失败'));

      const result = await pluginService.searchPlugins('test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('refreshPlugins', () => {
    it('应该成功刷新插件列表', async () => {
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: [],
      };

      mockAPI.refresh_plugins.mockResolvedValue(mockResponse);

      const result = await pluginService.refreshPlugins();

      expect(mockAPI.refresh_plugins).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPluginDependencies', () => {
    it('应该成功获取插件依赖', async () => {
      const mockResponse: DependenciesResponse = {
        success: true,
        dependencies: [
          {
            package: 'numpy',
            version: '>=1.20.0',
            installed: true,
            installed_version: '1.21.0',
            version_match: true,
            message: '已安装',
          },
        ],
      };

      mockAPI.get_plugin_dependencies.mockResolvedValue(mockResponse);

      const result = await pluginService.getPluginDependencies('test-plugin');

      expect(mockAPI.get_plugin_dependencies).toHaveBeenCalledWith('test-plugin');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('installDependency', () => {
    it('应该成功安装依赖', async () => {
      const mockResponse = {
        success: true,
        message: '安装成功',
      };

      mockAPI.install_dependency.mockResolvedValue(mockResponse);

      const result = await pluginService.installDependency('test-plugin', 'numpy', '>=1.20.0');

      expect(mockAPI.install_dependency).toHaveBeenCalledWith('test-plugin', 'numpy', '>=1.20.0');
      expect(result).toEqual(mockResponse);
    });

    it('应该使用默认版本参数', async () => {
      const mockResponse = {
        success: true,
        message: '安装成功',
      };

      mockAPI.install_dependency.mockResolvedValue(mockResponse);

      await pluginService.installDependency('test-plugin', 'numpy');

      expect(mockAPI.install_dependency).toHaveBeenCalledWith('test-plugin', 'numpy', '');
    });
  });

  describe('updatePlugin', () => {
    it('应该成功更新插件', async () => {
      const mockResponse = {
        success: true,
        message: '更新成功',
      };

      mockAPI.update_plugin.mockResolvedValue(mockResponse);

      const result = await pluginService.updatePlugin('test-plugin');

      expect(mockAPI.update_plugin).toHaveBeenCalledWith('test-plugin');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateAllPlugins', () => {
    it('应该成功批量更新插件', async () => {
      const mockResponse = {
        success: true,
        results: [],
        summary: {
          total: 0,
          success: 0,
          failed: 0,
          dependencies_installed: 0,
        },
      };

      mockAPI.update_all_plugins.mockResolvedValue(mockResponse);

      const result = await pluginService.updateAllPlugins();

      expect(mockAPI.update_all_plugins).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUpdateInfo', () => {
    it('应该成功获取更新信息', async () => {
      const mockResponse = {
        success: true,
        commits: [
          {
            hash: 'abc123',
            message: 'Update feature',
            date: '2024-01-01',
          },
        ],
      };

      mockAPI.get_update_info.mockResolvedValue(mockResponse);

      const result = await pluginService.getUpdateInfo('test-plugin');

      expect(mockAPI.get_update_info).toHaveBeenCalledWith('test-plugin');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('switchPluginBranch', () => {
    it('应该成功切换分支', async () => {
      const mockResponse = {
        success: true,
        message: '切换成功',
      };

      mockAPI.switch_plugin_branch.mockResolvedValue(mockResponse);

      const result = await pluginService.switchPluginBranch('test-plugin', 'develop');

      expect(mockAPI.switch_plugin_branch).toHaveBeenCalledWith('test-plugin', 'develop');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPluginBranches', () => {
    it('应该成功获取分支列表', async () => {
      const mockResponse = {
        success: true,
        branches: [
          {
            name: 'main',
            is_current: true,
            is_default: true,
          },
        ],
      };

      mockAPI.get_plugin_branches.mockResolvedValue(mockResponse);

      const result = await pluginService.getPluginBranches('test-plugin');

      expect(mockAPI.get_plugin_branches).toHaveBeenCalledWith('test-plugin');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('uninstallPlugin', () => {
    it('应该成功卸载插件', async () => {
      const mockResponse = {
        success: true,
        message: '卸载成功',
      };

      mockAPI.uninstall_plugin.mockResolvedValue(mockResponse);

      const result = await pluginService.uninstallPlugin('test-plugin');

      expect(mockAPI.uninstall_plugin).toHaveBeenCalledWith('test-plugin');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('openPluginFolder', () => {
    it('应该成功打开插件文件夹', async () => {
      const mockResponse = {
        success: true,
      };

      mockAPI.open_plugin_folder.mockResolvedValue(mockResponse);

      const result = await pluginService.openPluginFolder('test-plugin');

      expect(mockAPI.open_plugin_folder).toHaveBeenCalledWith('test-plugin');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('detectPluginConflicts', () => {
    it('应该成功检测依赖冲突', async () => {
      const mockResponse = {
        success: true,
        conflicts: [],
      };

      mockAPI.detect_plugin_conflicts.mockResolvedValue(mockResponse);

      const result = await pluginService.detectPluginConflicts();

      expect(mockAPI.detect_plugin_conflicts).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('错误处理', () => {
    it('应该处理 pywebview API 不可用的情况', async () => {
      // 移除 pywebview mock
      delete (global as any).window;

      const result = await pluginService.getPlugins();

      expect(result.success).toBe(false);
      expect(result.error).toContain('pywebview API 不可用');
    });
  });
});
