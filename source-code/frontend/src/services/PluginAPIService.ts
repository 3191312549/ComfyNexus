/**
 * 插件管理 API 服务层
 * 
 * 封装所有后端 API 调用，提供类型安全的接口
 * 包含统一的错误处理和重试机制
 * 在开发环境中，如果 API 不可用，会自动使用 mock 数据
 */

import type {
  PluginsResponse,
  DependenciesResponse,
  UpdateInfoResponse,
  BranchesResponse,
  BatchUpdateResponse,
  ConflictsResponse,
  PluginUpdateResponse,
  DependencyInstallResponse,
  PluginOperationResponse,
  ApiResponse,
} from '../types/plugin';
import { mockPluginService } from '../mocks/pluginService';

/**
 * API 错误类型
 */
export enum APIErrorType {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  UNKNOWN = 'unknown',
}

/**
 * API 错误信息
 */
export interface APIError {
  type: APIErrorType;
  message: string;
  originalError?: any;
}

/**
 * 统一的错误处理函数
 * 
 * @param error - 原始错误对象
 * @param operation - 操作名称（用于生成用户友好的错误消息）
 * @returns 格式化的错误信息
 */
export function handleAPIError(error: any, operation: string): APIError {
  // 提取错误信息
  const errorMessage = error?.error || error?.message || error?.toString() || '未知错误';
  
  // 根据错误类型返回用户友好的消息
  if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
    return {
      type: APIErrorType.TIMEOUT,
      message: `${operation}超时，请检查网络连接`,
      originalError: error,
    };
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('权限')) {
    return {
      type: APIErrorType.PERMISSION,
      message: `权限不足，请以管理员身份运行`,
      originalError: error,
    };
  }
  
  if (errorMessage.includes('not found') || errorMessage.includes('不存在')) {
    return {
      type: APIErrorType.NOT_FOUND,
      message: `${operation}失败：资源不存在`,
      originalError: error,
    };
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('网络')) {
    return {
      type: APIErrorType.NETWORK,
      message: `网络连接失败，请检查网络设置`,
      originalError: error,
    };
  }
  
  // 返回原始错误信息
  return {
    type: APIErrorType.UNKNOWN,
    message: `${operation}失败：${errorMessage}`,
    originalError: error,
  };
}

/**
 * 重试操作配置
 */
export interface RetryOptions {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 初始延迟时间（毫秒） */
  initialDelay?: number;
  /** 是否使用指数退避 */
  exponentialBackoff?: boolean;
  /** 应该重试的错误类型 */
  retryableErrors?: APIErrorType[];
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  exponentialBackoff: true,
  retryableErrors: [APIErrorType.NETWORK, APIErrorType.TIMEOUT],
};

/**
 * 自动重试机制（用于网络错误）
 * 
 * @param operation - 要执行的操作
 * @param options - 重试配置
 * @returns 操作结果
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // 检查是否应该重试
      const apiError = handleAPIError(error, '操作');
      const shouldRetry = config.retryableErrors.includes(apiError.type);
      
      // 如果是最后一次尝试或不应该重试，则抛出错误
      if (attempt === config.maxRetries - 1 || !shouldRetry) {
        throw error;
      }
      
      // 计算延迟时间
      const delay = config.exponentialBackoff
        ? config.initialDelay * Math.pow(2, attempt)
        : config.initialDelay;
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // 记录重试日志
      console.warn(`[PluginAPIService] 重试操作 (尝试 ${attempt + 2}/${config.maxRetries})`, {
        error: apiError.message,
        delay,
      });
    }
  }
  
  throw lastError;
}

/**
 * 记录错误日志
 * 
 * @param operation - 操作名称
 * @param error - 错误对象
 * @param context - 上下文信息
 */
export function logError(operation: string, error: any, context?: any): void {
  console.error('[PluginAPIService Error]', {
    timestamp: new Date().toISOString(),
    operation,
    error: error?.message || error,
    context,
  });
}

/**
 * 检测是否在 pywebview 环境中
 */
function isPyWebView(): boolean {
  return typeof window !== 'undefined' && !!window.pywebview?.api;
}

/**
 * 插件管理 API 服务类
 */
export class PluginAPIService {
  /**
   * 获取插件列表
   * 
   * @param useCache - 是否使用缓存（默认 true）
   * @returns 插件列表响应
   */
  async getPlugins(useCache: boolean = true): Promise<PluginsResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.getPlugins(useCache);
    }
    
    try {
      const result = await retryOperation(
        () => window.pywebview.api.get_plugins(useCache),
        { maxRetries: 2 }
      );
      
      if (!result.success) {
        logError('获取插件列表', result.error);
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '获取插件列表');
      logError('获取插件列表', apiError);
      throw apiError;
    }
  }
  
  /**
   * 搜索插件
   * 
   * @param keyword - 搜索关键词
   * @returns 插件列表响应
   */
  async searchPlugins(keyword: string): Promise<PluginsResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.searchPlugins(keyword);
    }
    
    try {
      const result = await window.pywebview.api.search_plugins(keyword);
      
      if (!result.success) {
        logError('搜索插件', result.error, { keyword });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '搜索插件');
      logError('搜索插件', apiError, { keyword });
      throw apiError;
    }
  }
  
  /**
   * 刷新插件列表（增量更新）
   * 
   * @returns 插件列表响应
   */
  async refreshPlugins(): Promise<PluginsResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.refreshPlugins();
    }
    
    try {
      const result = await retryOperation(
        () => window.pywebview.api.refresh_plugins(),
        { maxRetries: 2 }
      );
      
      if (!result.success) {
        logError('刷新插件列表', result.error);
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '刷新插件列表');
      logError('刷新插件列表', apiError);
      throw apiError;
    }
  }

  /**
   * 刷新单个插件的 Git 信息
   * 
   * @param pluginName - 插件名称
   * @returns 刷新结果，包含更新后的插件信息
   */
  async refreshPluginGitInfo(pluginName: string): Promise<PluginOperationResponse> {
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：refreshPluginGitInfo 不支持 mock');
      return { success: false, error: '开发环境不支持单插件刷新' };
    }

    try {
      const result = await retryOperation<{ success: boolean; error?: string; plugin?: any }>(
        () => window.pywebview.api.refresh_plugin_git_info(pluginName),
        { maxRetries: 1 }
      );

      if (!result.success) {
        logError('刷新插件Git信息', result.error, { pluginName });
      }

      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '刷新插件Git信息');
      logError('刷新插件Git信息', apiError, { pluginName });
      throw apiError;
    }
  }
  
  /**
   * 获取刷新进度
   * 
   * @returns 刷新进度响应
   */
  async getRefreshProgress(): Promise<{
    success: boolean;
    is_updating: boolean;
    current: number;
    total: number;
    stage?: string;
    stage_name?: string;
    plugins?: any[];
    error?: string;
  }> {
    // 开发环境：返回模拟进度
    if (!isPyWebView()) {
      return {
        success: true,
        is_updating: false,
        current: 0,
        total: 0,
      };
    }
    
    try {
      const result = await window.pywebview.api.get_refresh_progress();
      
      if (!result.success) {
        logError('获取刷新进度', result.error);
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '获取刷新进度');
      logError('获取刷新进度', apiError);
      throw apiError;
    }
  }
  
  /**
   * 取消后台更新
   * 
   * @returns 操作结果
   */
  async cancelBackgroundUpdate(): Promise<ApiResponse> {
    // 开发环境：返回成功
    if (!isPyWebView()) {
      return { success: true };
    }
    
    try {
      const result = await window.pywebview.api.cancel_background_update();
      
      if (!result.success) {
        logError('取消后台更新', result.error);
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '取消后台更新');
      logError('取消后台更新', apiError);
      throw apiError;
    }
  }
  
  /**
   * 获取插件依赖
   * 
   * @param pluginName - 插件名称
   * @returns 依赖列表响应
   */
  async getPluginDependencies(pluginName: string): Promise<DependenciesResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.getPluginDependencies(pluginName);
    }
    
    try {
      const result = await window.pywebview.api.get_plugin_dependencies(pluginName);
      
      if (!result.success) {
        logError('获取插件依赖', result.error, { pluginName });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '获取插件依赖');
      logError('获取插件依赖', apiError, { pluginName });
      throw apiError;
    }
  }
  
  /**
   * 安装依赖
   * 
   * @param pluginName - 插件名称
   * @param packageName - 包名
   * @param version - 版本要求
   * @param _pipOptions - pip 安装选项
   * @returns 安装结果
   */
  async installDependency(
    pluginName: string,
    packageName: string,
    version?: string,
    _pipOptions?: string[] | { indexUrl?: string; trustedHosts?: string[] }
  ): Promise<DependencyInstallResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.installDependency(pluginName, packageName, version);
    }
    
    try {
      const result = await window.pywebview.api.install_dependency(
        pluginName,
        packageName,
        version || ''
      );
      
      if (!result.success) {
        logError('安装依赖', result.error, { pluginName, packageName, version });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '安装依赖');
      logError('安装依赖', apiError, { pluginName, packageName, version });
      throw apiError;
    }
  }
  
  /**
   * 更新插件
   * 
   * @param pluginName - 插件名称
   * @param force - 是否强制更新
   * @returns 更新结果
   */
  async updatePlugin(pluginName: string, force: boolean = false): Promise<PluginUpdateResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.updatePlugin(pluginName, force);
    }
    
    try {
      const result = await window.pywebview.api.update_plugin(pluginName, force);
      
      if (!result.success) {
        logError('更新插件', result.error, { pluginName, force });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '更新插件');
      logError('更新插件', apiError, { pluginName, force });
      throw apiError;
    }
  }
  
  /**
   * 获取更新信息
   * 
   * @param pluginName - 插件名称
   * @returns 更新信息
   */
  async getUpdateInfo(pluginName: string): Promise<UpdateInfoResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.getUpdateInfo(pluginName);
    }
    
    try {
      const result = await window.pywebview.api.get_update_info(pluginName);
      
      if (!result.success) {
        logError('获取更新信息', result.error, { pluginName });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '获取更新信息');
      logError('获取更新信息', apiError, { pluginName });
      throw apiError;
    }
  }
  
  /**
   * 切换插件分支
   * 
   * @param pluginName - 插件名称
   * @param branch - 分支名
   * @returns 切换结果
   */
  async switchPluginBranch(pluginName: string, branch: string): Promise<PluginOperationResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.switchPluginBranch(pluginName, branch);
    }
    
    try {
      const result = await window.pywebview.api.switch_plugin_branch(pluginName, branch);
      
      if (!result.success) {
        logError('切换分支', result.error, { pluginName, branch });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '切换分支');
      logError('切换分支', apiError, { pluginName, branch });
      throw apiError;
    }
  }
  
  /**
   * 获取插件分支列表
   * 
   * @param pluginName - 插件名称
   * @returns 分支列表
   */
  async getPluginBranches(pluginName: string): Promise<BranchesResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.getPluginBranches(pluginName);
    }
    
    try {
      const result = await window.pywebview.api.get_plugin_branches(pluginName);
      
      if (!result.success) {
        logError('获取分支列表', result.error, { pluginName });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '获取分支列表');
      logError('获取分支列表', apiError, { pluginName });
      throw apiError;
    }
  }
  
  /**
   * 卸载插件
   * 
   * @param pluginName - 插件名称
   * @returns 卸载结果
   */
  async uninstallPlugin(pluginName: string): Promise<PluginOperationResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.uninstallPlugin(pluginName);
    }
    
    try {
      const result = await window.pywebview.api.uninstall_plugin(pluginName);
      
      if (!result.success) {
        logError('卸载插件', result.error, { pluginName });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '卸载插件');
      logError('卸载插件', apiError, { pluginName });
      throw apiError;
    }
  }
  
  /**
   * 打开插件文件夹
   * 
   * @param pluginName - 插件名称
   * @returns 操作结果
   */
  async openPluginFolder(pluginName: string): Promise<PluginOperationResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.openPluginFolder(pluginName);
    }
    
    try {
      const result = await window.pywebview.api.open_plugin_folder(pluginName);
      
      if (!result.success) {
        logError('打开插件文件夹', result.error, { pluginName });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '打开插件文件夹');
      logError('打开插件文件夹', apiError, { pluginName });
      throw apiError;
    }
  }
  
  /**
   * 检测插件冲突
   * 
   * @returns 冲突检测结果
   */
  async detectPluginConflicts(): Promise<ConflictsResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.detectPluginConflicts();
    }
    
    try {
      const result = await window.pywebview.api.detect_plugin_conflicts();
      
      if (!result.success) {
        logError('检测插件冲突', result.error);
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '检测插件冲突');
      logError('检测插件冲突', apiError);
      throw apiError;
    }
  }
  
  /**
   * 切换插件启用状态
   * 
   * @param pluginName - 插件名称
   * @returns 操作结果
   */
  async togglePlugin(pluginName: string): Promise<PluginOperationResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return { success: true, message: '切换成功' };
    }
    
    try {
      // @ts-expect-error - API 可能不存在
      const result = await window.pywebview.api.toggle_plugin(pluginName);
      
      if (!result.success) {
        logError('切换插件状态', result.error, { pluginName });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '切换插件状态');
      logError('切换插件状态', apiError, { pluginName });
      throw apiError;
    }
  }
  
  /**
   * 修复 Git 权限
   * 
   * @returns 修复结果
   */
  async fixGitPermissions(): Promise<PluginOperationResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.fixGitPermissions();
    }
    
    try {
      // @ts-expect-error - API 可能不存在
      const result = await window.pywebview.api.fix_git_permissions();
      
      if (!result.success) {
        logError('修复 Git 权限', result.error);
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '修复 Git 权限');
      logError('修复 Git 权限', apiError);
      throw apiError;
    }
  }
  
  /**
   * 获取插件分支列表（别名）
   * 
   * @param pluginName - 插件名称
   * @returns 分支列表
   */
  async getBranches(pluginName: string): Promise<BranchesResponse> {
    return this.getPluginBranches(pluginName);
  }

  /**
   * 切换插件分支（别名）
   * 
   * @param pluginName - 插件名称
   * @param branch - 分支名
   * @param _commitHash - 提交哈希（可选，用于显示）
   * @param _commitDate - 提交日期（可选，用于显示）
   * @returns 切换结果
   */
  async switchBranch(
    pluginName: string, 
    branch: string, 
    _commitHash?: string, 
    _commitDate?: string
  ): Promise<PluginOperationResponse & { plugin?: any }> {
    return this.switchPluginBranch(pluginName, branch);
  }

  /**
   * 切换插件启用状态
   * 
   * @param pluginName - 插件名称
   * @param enabled - 是否启用
   * @returns 操作结果
   */
  async togglePluginEnabled(pluginName: string, enabled: boolean): Promise<PluginOperationResponse & { plugin?: any }> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return { success: true, message: enabled ? '插件已启用' : '插件已禁用' };
    }
    
    try {
      const result = await window.pywebview.api.toggle_plugin_enabled(pluginName, enabled);
      
      if (!result.success) {
        logError('切换插件启用状态', result.error, { pluginName, enabled });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '切换插件启用状态');
      logError('切换插件启用状态', apiError, { pluginName, enabled });
      throw apiError;
    }
  }

  /**
   * 打开日志文件
   * 
   * @param pluginName - 插件名称
   * @returns 操作结果
   */
  async openLogFile(pluginName: string): Promise<PluginOperationResponse> {
    // 开发环境：使用 mock 数据
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return { success: false, error: '开发环境不支持打开日志文件' };
    }
    
    try {
      const result = await window.pywebview.api.open_log_file(pluginName);
      
      if (!result.success) {
        logError('打开日志文件', result.error, { pluginName });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '打开日志文件');
      logError('打开日志文件', apiError, { pluginName });
      throw apiError;
    }
  }

  /**
   * 一键更新所有插件（带并发控制）
   * 
   * @param pythonPathOrOptions - Python 路径或更新选项
   * @param maxWorkers - 并发数（可选）
   * @returns 批量更新结果
   */
  async updateAllPlugins(
    pythonPathOrOptions?: string | { concurrency?: number },
    maxWorkers?: number
  ): Promise<BatchUpdateResponse> {
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境：使用 mock 数据');
      return mockPluginService.updateAllPlugins();
    }
    
    try {
      let pythonPath: string | undefined;
      let finalMaxWorkers: number | undefined;
      
      if (typeof pythonPathOrOptions === 'string') {
        pythonPath = pythonPathOrOptions;
        finalMaxWorkers = maxWorkers;
      } else if (typeof pythonPathOrOptions === 'object') {
        finalMaxWorkers = pythonPathOrOptions.concurrency;
      } else if (typeof pythonPathOrOptions === 'number') {
        finalMaxWorkers = pythonPathOrOptions;
      } else {
        finalMaxWorkers = maxWorkers;
      }
      
      const result = await window.pywebview.api.update_all_plugins(pythonPath, finalMaxWorkers);
      
      if (!result.success) {
        logError('批量更新插件', result.error);
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '批量更新插件');
      logError('批量更新插件', apiError);
      throw apiError;
    }
  }

  /**
   * 设置插件的远端地址
   * 
   * @param pluginName - 插件名称
   * @param remoteUrl - 远端仓库地址
   * @returns 操作结果
   */
  async setPluginRemoteUrl(pluginName: string, remoteUrl: string): Promise<ApiResponse> {
    if (!isPyWebView()) {
      console.log('[PluginAPIService] 开发环境:使用 mock 数据');
      return { success: true, message: '设置成功' };
    }
    
    try {
      const result = await window.pywebview.api.set_plugin_remote_url(pluginName, remoteUrl);
      
      if (!result.success) {
        logError('设置远端地址', result.error, { pluginName, remoteUrl });
      }
      
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '设置远端地址');
      logError('设置远端地址', apiError, { pluginName, remoteUrl });
      throw apiError;
    }
  }

  async getPluginNote(pluginName: string): Promise<ApiResponse & { note?: string | null }> {
    if (!isPyWebView()) {
      return { success: true, note: null };
    }

    try {
      const result = await window.pywebview.api.get_plugin_note(pluginName);
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '获取插件备注');
      logError('获取插件备注', apiError, { pluginName });
      throw apiError;
    }
  }

  async savePluginNote(pluginName: string, note: string): Promise<ApiResponse> {
    if (!isPyWebView()) {
      return { success: true, message: '备注保存成功' };
    }

    try {
      const result = await window.pywebview.api.save_plugin_note(pluginName, note);
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '保存插件备注');
      logError('保存插件备注', apiError, { pluginName });
      throw apiError;
    }
  }

  async getAllPluginNotes(): Promise<ApiResponse & { notes?: Record<string, string> }> {
    if (!isPyWebView()) {
      return { success: true, notes: {} };
    }

    try {
      const result = await window.pywebview.api.get_all_plugin_notes();
      return result;
    } catch (error) {
      const apiError = handleAPIError(error, '获取所有插件备注');
      logError('获取所有插件备注', apiError);
      throw apiError;
    }
  }
}

// 导出单例实例
export const pluginAPI = new PluginAPIService();

// 默认导出
export default pluginAPI;
