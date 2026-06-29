/**
 * useDependencies Hook
 * 
 * 管理插件依赖的查询和安装功能
 * 实现依赖列表加载、依赖安装和状态管理
 * 
 * 验证需求: 3.1, 3.5（依赖查询和安装）
 */

import { useState, useCallback } from 'react';
import { pluginAPI } from '../services/PluginAPIService';
import type { Dependency } from '../types/plugin';

/**
 * useDependencies Hook 返回值接口
 */
export interface UseDependenciesReturn {
  /** 依赖列表 */
  dependencies: Dependency[];
  /** 加载状态 */
  loading: boolean;
  /** 正在安装的包名（null 表示没有正在安装的包） */
  installing: string | null;
  /** 错误信息 */
  error: string | null;
  /** 安装结果（包含日志文件路径） */
  installResult: {
    success: boolean;
    message: string;
    logFile?: string;
  } | null;
  /** 加载依赖列表 */
  loadDependencies: (pluginName: string) => Promise<void>;
  /** 安装依赖 */
  installDependency: (pluginName: string, pkg: string, version: string) => Promise<boolean>;
  /** 清除依赖列表 */
  clearDependencies: () => void;
  /** 打开日志文件 */
  openLogFile: (logFilePath: string) => Promise<void>;
}

/**
 * useDependencies Hook
 * 
 * @returns Hook 返回值
 */
export function useDependencies(): UseDependenciesReturn {
  // 状态管理
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installResult, setInstallResult] = useState<{
    success: boolean;
    message: string;
    logFile?: string;
  } | null>(null);
  
  /**
   * 加载依赖列表
   * 
   * @param pluginName - 插件名称
   */
  const loadDependencies = useCallback(async (pluginName: string) => {
    // 设置加载状态
    setLoading(true);
    setError(null);
    
    try {
      // 调用 API 获取依赖列表
      const response = await pluginAPI.getPluginDependencies(pluginName);
      
      if (response.success && response.dependencies) {
        // 更新依赖列表
        setDependencies(response.dependencies);
        
        // 记录日志
        console.log('[useDependencies] 依赖列表加载成功', {
          pluginName,
          count: response.dependencies.length,
        });
      } else {
        // 处理失败情况
        const errorMsg = response.error || '加载依赖列表失败';
        setError(errorMsg);
        console.error('[useDependencies] 加载失败', errorMsg);
        
        // 清空依赖列表
        setDependencies([]);
      }
    } catch (err: any) {
      // 处理异常
      const errorMsg = err?.message || '加载依赖列表时发生错误';
      setError(errorMsg);
      console.error('[useDependencies] 加载异常', err);
      
      // 清空依赖列表
      setDependencies([]);
    } finally {
      // 清除加载状态
      setLoading(false);
    }
  }, []);
  
  /**
   * 安装依赖
   * 
   * @param pluginName - 插件名称
   * @param pkg - 包名
   * @param version - 版本要求
   * @returns 是否安装成功
   */
  const installDependency = useCallback(async (
    pluginName: string,
    pkg: string,
    version: string
  ): Promise<boolean> => {
    // 设置安装状态
    setInstalling(pkg);
    setError(null);
    setInstallResult(null);
    
    try {
      // 从依赖列表中获取 pip_options
      const dependency = dependencies.find(dep => dep.package === pkg);
      const pipOptions = dependency?.pip_options;
      
      // 调用 API 安装依赖
      const response = await pluginAPI.installDependency(pluginName, pkg, version, pipOptions);
      
      // 保存安装结果（包含日志文件路径）
      setInstallResult({
        success: response.success,
        message: response.message || (response.success ? '安装成功' : '安装失败'),
        logFile: response.log_file,
      });
      
      if (response.success && response.installed) {
        // 更新依赖列表中对应包的状态
        setDependencies(prevDeps => 
          prevDeps.map(dep => 
            dep.package === pkg
              ? {
                  ...dep,
                  installed: true,
                  installed_version: response.installed_version || null,
                  version_match: true,
                  message: '已安装',
                }
              : dep
          )
        );
        
        // 记录日志
        console.log('[useDependencies] 依赖安装成功', {
          pluginName,
          pkg,
          version: response.installed_version,
          logFile: response.log_file,
          pipOptions,
        });
        
        return true;
      } else {
        // 处理失败情况
        const errorMsg = response.error || '安装依赖失败';
        // 不设置 error 状态，避免显示两个错误提示
        // setError(errorMsg);
        console.error('[useDependencies] 安装失败', {
          error: errorMsg,
          logFile: response.log_file,
        });
        
        return false;
      }
    } catch (err: any) {
      // 处理异常
      const errorMsg = err?.message || '安装依赖时发生错误';
      // 不设置 error 状态，避免显示两个错误提示
      // setError(errorMsg);
      setInstallResult({
        success: false,
        message: errorMsg,
      });
      console.error('[useDependencies] 安装异常', err);
      
      return false;
    } finally {
      // 清除安装状态
      setInstalling(null);
    }
  }, [dependencies]);
  
  /**
   * 打开日志文件
   * 
   * @param logFilePath - 日志文件路径
   */
  const openLogFile = useCallback(async (logFilePath: string) => {
    try {
      // 调用 API 打开日志文件
      const response = await pluginAPI.openLogFile(logFilePath);
      
      if (!response.success) {
        console.error('[useDependencies] 打开日志文件失败', response.message);
        setError(response.message || '打开日志文件失败');
      }
    } catch (err: any) {
      const errorMsg = err?.message || '打开日志文件时发生错误';
      console.error('[useDependencies] 打开日志文件异常', err);
      setError(errorMsg);
    }
  }, []);
  
  /**
   * 清除依赖列表
   * 
   * 用于关闭依赖卡片时清理状态
   */
  const clearDependencies = useCallback(() => {
    setDependencies([]);
    setError(null);
    setInstallResult(null);
    
    // 记录日志
    console.log('[useDependencies] 依赖列表已清除');
  }, []);
  
  // 返回 Hook 接口
  return {
    dependencies,
    loading,
    installing,
    error,
    installResult,
    loadDependencies,
    installDependency,
    clearDependencies,
    openLogFile,
  };
}

/**
 * 默认导出
 */
export default useDependencies;
