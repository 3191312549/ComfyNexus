/**
 * usePluginUpdate Hook
 * 
 * 管理插件更新功能
 * 实现更新信息加载、插件更新和状态管理
 * 
 * 验证需求: 6.1, 6.3（更新功能）
 */

import { useState, useCallback } from 'react';
import { pluginAPI } from '../services/PluginAPIService';
import type { CommitInfo, UpdateResult } from '../types/plugin';

/**
 * usePluginUpdate Hook 返回值接口
 */
export interface UsePluginUpdateReturn {
  /** 提交日志列表 */
  commits: CommitInfo[];
  /** 加载状态 */
  loading: boolean;
  /** 更新中状态 */
  updating: boolean;
  /** 错误信息 */
  error: string | null;
  /** 加载更新信息（提交日志） */
  loadUpdateInfo: (pluginName: string) => Promise<void>;
  /** 更新插件 */
  updatePlugin: (pluginName: string, force?: boolean) => Promise<UpdateResult | null>;
  /** 清除更新信息 */
  clearUpdateInfo: () => void;
}

/**
 * usePluginUpdate Hook
 * 
 * @returns Hook 返回值
 */
export function usePluginUpdate(): UsePluginUpdateReturn {
  // 状态管理
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * 加载更新信息（提交日志）
   * 
   * @param pluginName - 插件名称
   */
  const loadUpdateInfo = useCallback(async (pluginName: string) => {
    // 设置加载状态
    setLoading(true);
    setError(null);
    
    try {
      // 调用 API 获取更新信息
      const response = await pluginAPI.getUpdateInfo(pluginName);
      
      if (response.success && response.commits) {
        // 更新提交日志列表
        setCommits(response.commits);
        
        // 记录日志
        console.log('[usePluginUpdate] 更新信息加载成功', {
          pluginName,
          commitCount: response.commits.length,
        });
      } else {
        // 处理失败情况
        const errorMsg = response.error || '加载更新信息失败';
        setError(errorMsg);
        console.error('[usePluginUpdate] 加载失败', errorMsg);
        
        // 清空提交日志列表
        setCommits([]);
      }
    } catch (err: any) {
      // 处理异常
      const errorMsg = err?.message || '加载更新信息时发生错误';
      setError(errorMsg);
      console.error('[usePluginUpdate] 加载异常', err);
      
      // 清空提交日志列表
      setCommits([]);
    } finally {
      // 清除加载状态
      setLoading(false);
    }
  }, []);
  
  /**
   * 更新插件
   * 
   * @param pluginName - 插件名称
   * @param force - 是否强制更新（覆盖本地修改）
   * @returns 更新结果（成功时返回结果对象，失败时返回 null）
   */
  const updatePlugin = useCallback(async (pluginName: string, force: boolean = false): Promise<UpdateResult | null> => {
    // 设置更新状态
    setUpdating(true);
    setError(null);
    
    try {
      // 调用 API 更新插件
      const response = await pluginAPI.updatePlugin(pluginName, force);
      
      if (response.success) {
        // 构建更新结果对象
        const result: UpdateResult = {
          plugin_name: pluginName,
          success: true,
          message: response.message || '更新成功',
          dependency_changed: response.dependency_changed || false,
          new_dependencies: response.new_dependencies || [],
          dependencies_installed: 0, // 单个插件更新不自动安装依赖
          plugin: response.plugin, // 传递更新后的插件信息用于局部更新
        };
        
        // 记录日志
        console.log('[usePluginUpdate] 插件更新成功', {
          pluginName,
          dependencyChanged: result.dependency_changed,
          newDependenciesCount: (result.new_dependencies || []).length,
          hasPluginInfo: !!result.plugin,
        });
        
        return result;
      } else {
        // 处理失败情况 - 不设置 error 状态，因为 error 是用于加载更新信息失败的
        const errorMsg = response.error || '更新插件失败';
        console.error('[usePluginUpdate] 更新失败', errorMsg);
        
        // 返回失败结果
        return {
          plugin_name: pluginName,
          success: false,
          message: errorMsg,
          dependency_changed: false,
          new_dependencies: [],
          dependencies_installed: 0,
          error: errorMsg,
        };
      }
    } catch (err: any) {
      // 处理异常 - 不设置 error 状态，因为 error 是用于加载更新信息失败的
      const errorMsg = err?.message || '更新插件时发生错误';
      console.error('[usePluginUpdate] 更新异常', err);
      
      // 返回失败结果
      return {
        plugin_name: pluginName,
        success: false,
        message: errorMsg,
        dependency_changed: false,
        new_dependencies: [],
        dependencies_installed: 0,
        error: errorMsg,
      };
    } finally {
      // 清除更新状态
      setUpdating(false);
    }
  }, []);
  
  /**
   * 清除更新信息
   * 
   * 用于关闭更新卡片时清理状态
   */
  const clearUpdateInfo = useCallback(() => {
    setCommits([]);
    setError(null);
    
    // 记录日志
    console.log('[usePluginUpdate] 更新信息已清除');
  }, []);
  
  // 返回 Hook 接口
  return {
    commits,
    loading,
    updating,
    error,
    loadUpdateInfo,
    updatePlugin,
    clearUpdateInfo,
  };
}

/**
 * 默认导出
 */
export default usePluginUpdate;
