/**
 * 依赖管理 API 客户端
 * 
 * 封装所有与后端依赖管理相关的 API 调用
 * 通过 pywebview JS Bridge 与 Python 后端通信
 */

import type {
  ApiResponse,
  ScanDependenciesData,
  PackageStatusData,
  BatchStatusData,
  InstallPackageData,
  UninstallPackageData,
  InstallationReport,
  EnvironmentInfo,
  PluginInfo,
  ErrorType
} from '../types/dependency';

/**
 * 检查 pywebview API 是否可用
 */
function checkApiAvailable(): void {
  if (!window.pywebview || !window.pywebview.api) {
    throw new Error('pywebview API 不可用，请确保在 pywebview 环境中运行');
  }
}

/**
 * 重试配置
 */
interface RetryConfig {
  /** 最大重试次数 */
  maxAttempts: number;
  /** 重试延迟（毫秒） */
  delay: number;
  /** 可重试的错误类型 */
  retryableErrors: ErrorType[];
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delay: 2000,
  retryableErrors: ['network_error' as ErrorType]
};

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 转换后端响应格式为前端 ApiResponse 格式
 */
function adaptBackendResponse<T>(backendResponse: any): ApiResponse<T> {
  if (backendResponse.success) {
    return {
      success: true,
      data: backendResponse.data || null,
      error: null
    };
  } else {
    return {
      success: false,
      data: null,
      error: {
        type: 'unknown_error' as ErrorType,
        message: backendResponse.error_message || '未知错误',
        recoverable: false
      }
    };
  }
}

/**
 * 带重试的 API 调用包装器
 */
async function withRetry<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<ApiResponse<T>> {
  let lastError: ApiResponse<T> | null = null;
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      const result = await apiCall();
      
      // 如果成功，直接返回
      if (result.success) {
        return result;
      }
      
      // 如果失败，检查是否可重试
      if (result.error && config.retryableErrors.includes(result.error.type)) {
        lastError = result;
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < config.maxAttempts - 1) {
          await delay(config.delay);
          continue;
        }
      }
      
      // 不可重试的错误，直接返回
      return result;
    } catch (error) {
      // 捕获异常，转换为标准错误响应
      lastError = {
        success: false,
        data: null,
        error: {
          type: 'unknown_error' as ErrorType,
          message: error instanceof Error ? error.message : String(error),
          recoverable: false
        }
      };
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < config.maxAttempts - 1) {
        await delay(config.delay);
        continue;
      }
    }
  }
  
  // 所有重试都失败，返回最后一次错误
  return lastError!;
}

/**
 * 依赖管理 API 客户端类
 */
export class DependencyApi {
  /**
   * 扫描 ComfyUI 核心和所有插件的依赖
   * 
   * @returns 扫描结果，包含核心依赖和插件依赖
   */
  static async scanDependencies(): Promise<ApiResponse<ScanDependenciesData>> {
    checkApiAvailable();
    
    return withRetry(async () => {
      const result = await window.pywebview.api.dependency_scan_dependencies();
      return adaptBackendResponse<ScanDependenciesData>(result);
    });
  }

  /**
   * 检查单个包的安装状态
   * 
   * @param packageName - 包名
   * @returns 包的安装状态信息
   */
  static async checkPackageStatus(packageName: string): Promise<ApiResponse<PackageStatusData>> {
    checkApiAvailable();
    
    if (!packageName || packageName.trim() === '') {
      return {
        success: false,
        data: null,
        error: {
          type: 'unknown_error' as ErrorType,
          message: '包名不能为空',
          recoverable: false
        }
      };
    }
    
    return withRetry(async () => {
      const result = await window.pywebview.api.dependency_check_package_status(packageName);
      return adaptBackendResponse<PackageStatusData>(result);
    });
  }

  /**
   * 批量检查包的安装状态
   * 
   * @param packages - 包名列表
   * @returns 所有包的状态信息映射
   */
  static async checkAllStatus(packages: string[]): Promise<ApiResponse<BatchStatusData>> {
    checkApiAvailable();
    
    if (!packages || packages.length === 0) {
      return {
        success: true,
        data: {},
        error: null
      };
    }
    
    return withRetry(async () => {
      const result = await window.pywebview.api.dependency_check_all_status(packages);
      return adaptBackendResponse<BatchStatusData>(result);
    });
  }

  /**
   * 安装单个依赖包
   * 
   * @param packageName - 包名
   * @param versionSpec - 版本约束（可选）
   * @returns 安装结果
   */
  static async installPackage(
    packageName: string,
    versionSpec?: string
  ): Promise<ApiResponse<InstallPackageData>> {
    checkApiAvailable();
    
    if (!packageName || packageName.trim() === '') {
      return {
        success: false,
        data: null,
        error: {
          type: 'unknown_error' as ErrorType,
          message: '包名不能为空',
          recoverable: false
        }
      };
    }
    
    const result = await window.pywebview.api.dependency_install_package(
      packageName, 
      versionSpec || '', 
      'install',
      'official'
    );
    return adaptBackendResponse<InstallPackageData>(result);
  }

  /**
   * 卸载单个依赖包
   * 
   * @param packageName - 包名
   * @returns 卸载结果
   */
  static async uninstallPackage(packageName: string): Promise<ApiResponse<UninstallPackageData>> {
    checkApiAvailable();
    
    if (!packageName || packageName.trim() === '') {
      return {
        success: false,
        data: null,
        error: {
          type: 'unknown_error' as ErrorType,
          message: '包名不能为空',
          recoverable: false
        }
      };
    }
    
    const result = await window.pywebview.api.dependency_uninstall_package(packageName);
    return adaptBackendResponse<UninstallPackageData>(result);
  }

  /**
   * 从 requirements.txt 文件批量安装
   * 
   * @param requirementsFile - requirements.txt 文件路径
   * @returns 安装报告
   */
  static async installFromRequirements(
    requirementsFile: string
  ): Promise<ApiResponse<InstallationReport>> {
    checkApiAvailable();
    
    if (!requirementsFile || requirementsFile.trim() === '') {
      return {
        success: false,
        data: null,
        error: {
          type: 'unknown_error' as ErrorType,
          message: 'requirements.txt 文件路径不能为空',
          recoverable: false
        }
      };
    }
    
    const result = await window.pywebview.api.dependency_install_from_requirements(
      requirementsFile,
      'install',
      'official'
    );
    return adaptBackendResponse<InstallationReport>(result);
  }

  /**
   * 获取当前 Python 环境信息
   * 
   * @returns 环境信息
   */
  static async getEnvironmentInfo(): Promise<ApiResponse<EnvironmentInfo>> {
    checkApiAvailable();
    
    return withRetry(async () => {
      const result = await window.pywebview.api.dependency_detect_environment();
      return adaptBackendResponse<EnvironmentInfo>(result);
    });
  }

  /**
   * 获取所有插件列表
   * 
   * @returns 插件列表
   */
  static async getPlugins(): Promise<ApiResponse<PluginInfo[]>> {
    checkApiAvailable();
    
    return withRetry(async () => {
      const result = await window.pywebview.api.dependency_get_plugins();
      return adaptBackendResponse<PluginInfo[]>(result);
    });
  }
}

export default DependencyApi;
