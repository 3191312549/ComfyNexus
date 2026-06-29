/**
 * 插件管理服务
 * 
 * 封装所有插件管理 API 调用
 * 在开发环境中，如果 API 不可用，会自动使用 mock 数据
 */

import type {
  PluginsResponse,
  DependenciesResponse,
  UpdateInfoResponse,
  BranchesResponse,
  BatchUpdateResponse,
  ConflictsResponse,
  OperationResponse,
  GitPermissionCheckResponse,
  GitPermissionFixResponse,
} from '@/types/plugin';
import { mockPluginService } from '@/mocks/pluginService';



/**
 * pywebview API 接口
 */
interface PyWebViewAPI {
  get_plugins: (use_cache?: boolean) => Promise<PluginsResponse>;
  search_plugins: (keyword: string) => Promise<PluginsResponse>;
  refresh_plugins: () => Promise<PluginsResponse>;
  get_plugin_dependencies: (plugin_name: string) => Promise<DependenciesResponse>;
  install_dependency: (plugin_name: string, package_name: string, version?: string) => Promise<OperationResponse>;
  update_plugin: (plugin_name: string, force?: boolean) => Promise<OperationResponse>;
  update_all_plugins: () => Promise<BatchUpdateResponse>;
  get_update_info: (plugin_name: string) => Promise<UpdateInfoResponse>;
  switch_plugin_branch: (plugin_name: string, branch: string) => Promise<OperationResponse>;
  get_plugin_branches: (plugin_name: string) => Promise<BranchesResponse>;
  uninstall_plugin: (plugin_name: string) => Promise<OperationResponse>;
  open_plugin_folder: (plugin_name: string) => Promise<OperationResponse>;
  detect_plugin_conflicts: () => Promise<ConflictsResponse>;
  check_git_permissions: () => Promise<GitPermissionCheckResponse>;
  fix_git_permissions: () => Promise<GitPermissionFixResponse>;
}

/**
 * 获取 pywebview API
 */
function getAPI(): PyWebViewAPI | null {
  if (typeof window !== 'undefined' && (window as any).pywebview) {
    return (window as any).pywebview.api;
  }
  return null;
}

/**
 * 插件管理服务类
 */
class PluginService {
  /**
   * 获取插件列表
   * 
   * @param useCache 是否使用缓存
   * @returns 插件列表响应
   */
  async getPlugins(useCache: boolean = true): Promise<PluginsResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.getPlugins(useCache);
      }
      return await api.get_plugins(useCache);
    } catch (error) {
      console.error('[PluginService] 获取插件列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取插件列表失败',
      };
    }
  }

  /**
   * 搜索插件
   * 
   * @param keyword 搜索关键词
   * @returns 搜索结果
   */
  async searchPlugins(keyword: string): Promise<PluginsResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.searchPlugins(keyword);
      }
      return await api.search_plugins(keyword);
    } catch (error) {
      console.error('[PluginService] 搜索插件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '搜索插件失败',
      };
    }
  }

  /**
   * 刷新插件列表
   * 
   * @returns 刷新结果
   */
  async refreshPlugins(): Promise<PluginsResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.refreshPlugins();
      }
      return await api.refresh_plugins();
    } catch (error) {
      console.error('[PluginService] 刷新插件列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '刷新插件列表失败',
      };
    }
  }

  /**
   * 获取插件依赖
   * 
   * @param pluginName 插件名称
   * @returns 依赖列表
   */
  async getPluginDependencies(pluginName: string): Promise<DependenciesResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.getPluginDependencies(pluginName);
      }
      return await api.get_plugin_dependencies(pluginName);
    } catch (error) {
      console.error('[PluginService] 获取插件依赖失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取插件依赖失败',
      };
    }
  }

  /**
   * 安装依赖
   * 
   * @param pluginName 插件名称
   * @param packageName 包名
   * @param version 版本要求
   * @returns 安装结果
   */
  async installDependency(
    pluginName: string,
    packageName: string,
    version: string = ''
  ): Promise<OperationResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.installDependency(pluginName, packageName, version);
      }
      return await api.install_dependency(pluginName, packageName, version);
    } catch (error) {
      console.error('[PluginService] 安装依赖失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '安装依赖失败',
      };
    }
  }

  /**
   * 更新插件
   * 
   * @param pluginName 插件名称
   * @returns 更新结果
   */
  async updatePlugin(pluginName: string, force: boolean = false): Promise<OperationResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.updatePlugin(pluginName, force);
      }
      return await api.update_plugin(pluginName, force);
    } catch (error) {
      console.error('[PluginService] 更新插件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新插件失败',
      };
    }
  }

  /**
   * 一键更新所有插件
   * 
   * @returns 批量更新结果
   */
  async updateAllPlugins(): Promise<BatchUpdateResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.updateAllPlugins();
      }
      return await api.update_all_plugins();
    } catch (error) {
      console.error('[PluginService] 批量更新插件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量更新插件失败',
      };
    }
  }

  /**
   * 获取更新信息
   * 
   * @param pluginName 插件名称
   * @returns 更新信息
   */
  async getUpdateInfo(pluginName: string): Promise<UpdateInfoResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.getUpdateInfo(pluginName);
      }
      return await api.get_update_info(pluginName);
    } catch (error) {
      console.error('[PluginService] 获取更新信息失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取更新信息失败',
      };
    }
  }

  /**
   * 切换插件分支
   * 
   * @param pluginName 插件名称
   * @param branch 分支名
   * @returns 切换结果
   */
  async switchPluginBranch(pluginName: string, branch: string): Promise<OperationResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.switchPluginBranch(pluginName, branch);
      }
      return await api.switch_plugin_branch(pluginName, branch);
    } catch (error) {
      console.error('[PluginService] 切换分支失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '切换分支失败',
      };
    }
  }

  /**
   * 获取插件分支列表
   * 
   * @param pluginName 插件名称
   * @returns 分支列表
   */
  async getPluginBranches(pluginName: string): Promise<BranchesResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.getPluginBranches(pluginName);
      }
      return await api.get_plugin_branches(pluginName);
    } catch (error) {
      console.error('[PluginService] 获取分支列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取分支列表失败',
      };
    }
  }

  /**
   * 卸载插件
   * 
   * @param pluginName 插件名称
   * @returns 卸载结果
   */
  async uninstallPlugin(pluginName: string): Promise<OperationResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.uninstallPlugin(pluginName);
      }
      return await api.uninstall_plugin(pluginName);
    } catch (error) {
      console.error('[PluginService] 卸载插件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '卸载插件失败',
      };
    }
  }

  /**
   * 打开插件文件夹
   * 
   * @param pluginName 插件名称
   * @returns 操作结果
   */
  async openPluginFolder(pluginName: string): Promise<OperationResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.openPluginFolder(pluginName);
      }
      return await api.open_plugin_folder(pluginName);
    } catch (error) {
      console.error('[PluginService] 打开插件文件夹失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '打开插件文件夹失败',
      };
    }
  }

  /**
   * 检测插件依赖冲突
   * 
   * @returns 冲突检测结果
   */
  async detectPluginConflicts(): Promise<ConflictsResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.detectPluginConflicts();
      }
      return await api.detect_plugin_conflicts();
    } catch (error) {
      console.error('[PluginService] 检测依赖冲突失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '检测依赖冲突失败',
      };
    }
  }

  /**
   * 检查 Git 权限
   * 
   * 检查所有插件仓库的权限状态，识别存在所有权问题的仓库
   * 
   * @returns Git 权限检查结果
   */
  async checkGitPermissions(): Promise<GitPermissionCheckResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.checkGitPermissions();
      }
      return await api.check_git_permissions();
    } catch (error) {
      console.error('[PluginService] 检查 Git 权限失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '检查 Git 权限失败',
      };
    }
  }

  /**
   * 修复 Git 权限
   * 
   * 批量修复所有插件仓库的权限问题，将仓库添加到 Git 全局安全目录列表
   * 
   * @returns Git 权限修复结果
   */
  async fixGitPermissions(): Promise<GitPermissionFixResponse> {
    try {
      const api = getAPI();
      if (!api) {
        console.log('[PluginService] 开发环境：使用 mock 数据');
        return mockPluginService.fixGitPermissions();
      }
      return await api.fix_git_permissions();
    } catch (error) {
      console.error('[PluginService] 修复 Git 权限失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '修复 Git 权限失败',
      };
    }
  }
}

// 导出单例
export const pluginService = new PluginService();
export default pluginService;

// 导出类型
export type {
  PluginInfo as Plugin,
  Dependency,
  CommitInfo,
  BranchInfo,
  UpdateResult,
  ProblemRepository,
  GitPermissionCheckResponse,
  GitPermissionFixResponse,
} from '@/types/plugin';
