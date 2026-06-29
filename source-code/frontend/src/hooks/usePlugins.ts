/**
 * usePlugins Hook
 * 
 * 管理插件列表的加载、刷新和搜索功能
 * 实现缓存优先策略和增量更新
 * 支持实时流式更新进度
 * 支持环境切换时自动重新加载
 * 
 * 验证需求: 1.1, 11.4, 15.1（缓存加载）, FR-2（环境切换）
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { pluginAPI } from '../services/PluginAPIService';
import type { PluginInfo } from '../types/plugin';

/**
 * usePlugins Hook 返回值接口
 */
export interface UsePluginsReturn {
  /** 原始插件列表 */
  plugins: PluginInfo[];
  /** 过滤后的插件列表 */
  filteredPlugins: PluginInfo[];
  /** 加载状态 */
  loading: boolean;
  /** 刷新状态 */
  refreshing: boolean;
  /** 错误信息 */
  error: string | null;
  /** 刷新进度 */
  refreshProgress: {
    current: number;
    total: number;
    stage?: string;
    stageName?: string;
  };
  /** 加载插件列表 */
  loadPlugins: (useCache?: boolean) => Promise<{ hasData: boolean; needsRefresh: boolean }>;
  /** 刷新插件列表（增量更新） */
  refreshPlugins: () => Promise<void>;
  /** 刷新单个插件的 Git 信息 */
  refreshPluginGitInfo: (pluginName: string) => Promise<void>;
  /** 搜索插件 */
  searchPlugins: (keyword: string) => void;
  /** 当前搜索关键词 */
  searchKeyword: string;
  /** 重新加载（用于错误重试） */
  refetch: () => Promise<{ hasData: boolean; needsRefresh: boolean }>;
  /** 取消后台更新 */
  cancelBackgroundUpdate: () => Promise<void>;
  /** 更新单个插件信息（局部更新） */
  updatePlugin: (plugin: PluginInfo) => void;
  /** 移除单个插件（用于卸载） */
  removePlugin: (pluginName: string) => void;
}

/**
 * usePlugins Hook
 * 
 * @param environmentId - 环境 ID（用于缓存隔离和环境切换同步）
 * @returns Hook 返回值
 */
export function usePlugins(environmentId?: string | null): UsePluginsReturn {
  // 状态管理
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [refreshProgress, setRefreshProgress] = useState({ 
    current: 0, 
    total: 0,
    stage: '',
    stageName: ''
  });
  
  // 轮询定时器引用
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 请求取消控制器引用
  const abortControllerRef = useRef<AbortController | null>(null);
  
  /**
   * 清除轮询定时器
   */
  const clearPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);
  
  /**
   * 取消当前请求
   */
  const cancelCurrentRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);
  
  /**
   * 轮询刷新进度
   */
  const pollRefreshProgress = useCallback(async () => {
    try {
      const response = await pluginAPI.getRefreshProgress();
      
      if (response.success) {
        // 调试日志：打印接收到的进度信息
        console.log('[usePlugins] 接收到进度信息:', {
          stage: response.stage,
          stage_name: response.stage_name,
          current: response.current,
          total: response.total,
        });
        
        // 更新进度（包含阶段信息）
        setRefreshProgress({
          current: response.current,
          total: response.total,
          stage: response.stage || '',
          stageName: response.stage_name || '',
        });
        
        // 在更新过程中，重新加载插件列表（实现流式更新）
        if (response.is_updating) {
          try {
            const pluginsResponse = await pluginAPI.getPlugins(true);
            if (pluginsResponse.success && pluginsResponse.plugins) {
              setPlugins([...pluginsResponse.plugins]);
              
              const updateCount = pluginsResponse.plugins.filter(p => p.has_update).length;
              const { usePluginUpdateBadgeStore } = await import('@/stores/usePluginUpdateBadgeStore');
              usePluginUpdateBadgeStore.getState().setUpdateCount(environmentId || null, updateCount);
              
              console.log('[usePlugins] 流式更新插件列表', {
                count: pluginsResponse.plugins.length,
                updateCount,
              });
            }
          } catch (err) {
            console.error('[usePlugins] 流式更新插件列表失败', err);
          }
        }
        
        // 如果更新完成
        if (!response.is_updating) {
          // 停止轮询
          clearPolling();
          
          // 最后一次更新插件列表
          try {
            const pluginsResponse = await pluginAPI.getPlugins(true);
            if (pluginsResponse.success && pluginsResponse.plugins) {
              setPlugins([...pluginsResponse.plugins]);
              
              const updateCount = pluginsResponse.plugins.filter(p => p.has_update).length;
              const { usePluginUpdateBadgeStore } = await import('@/stores/usePluginUpdateBadgeStore');
              usePluginUpdateBadgeStore.getState().setUpdateCount(environmentId || null, updateCount);
              
              console.log('[usePlugins] 后台更新完成，已更新插件列表', {
                count: pluginsResponse.plugins.length,
                updateCount,
              });
            }
          } catch (err) {
            console.error('[usePlugins] 最终更新插件列表失败', err);
          }
          
          // 清除刷新状态
          setRefreshing(false);
          setRefreshProgress({ current: 0, total: 0, stage: '', stageName: '' });
        }
      }
    } catch (err: any) {
      console.error('[usePlugins] 轮询刷新进度失败', err);
      // 不中断轮询，继续尝试
    }
  }, [clearPolling]);
  
  /**
   * 启动轮询
   */
  const startPolling = useCallback(() => {
    // 清除旧的定时器
    clearPolling();
    
    // 立即执行一次
    pollRefreshProgress();
    
    // 每500ms轮询一次
    pollingTimerRef.current = setInterval(pollRefreshProgress, 500);
    
    console.log('[usePlugins] 启动刷新进度轮询');
  }, [clearPolling, pollRefreshProgress]);
  
  /**
   * 组件卸载时清除定时器和取消请求
   */
  useEffect(() => {
    return () => {
      clearPolling();
      cancelCurrentRequest();
    };
  }, [clearPolling, cancelCurrentRequest]);
  
  /**
   * 加载插件列表
   * 
   * @param useCache - 是否使用缓存（默认 true，实现缓存优先策略）
   * @returns 返回 { hasData: boolean, needsRefresh: boolean }
   */
  const loadPlugins = useCallback(async (useCache: boolean = true): Promise<{ hasData: boolean; needsRefresh: boolean }> => {
    // 取消之前的请求
    cancelCurrentRequest();
    
    // 创建新的 AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // 设置加载状态
    setLoading(true);
    setError(null);
    
    try {
      // 调用 API 获取插件列表
      const response = await pluginAPI.getPlugins(useCache);
      
      // 检查请求是否被取消
      if (controller.signal.aborted) {
        console.log('[usePlugins] 请求已取消');
        return { hasData: false, needsRefresh: false };
      }
      
      if (response.success && response.plugins) {
        // 强制创建新数组引用，确保React检测到变化
        setPlugins([...response.plugins]);
        
        // 统计待更新插件数量并更新徽章（传入环境 ID）
        const updateCount = response.plugins.filter(p => p.has_update).length;
        console.log('[usePlugins] loadPlugins - 更新徽章状态:', {
          environmentId: environmentId || null,
          updateCount,
          hasUpdatePlugins: response.plugins.filter(p => p.has_update).map(p => p.name)
        });
        const { usePluginUpdateBadgeStore } = await import('@/stores/usePluginUpdateBadgeStore');
        usePluginUpdateBadgeStore.getState().setUpdateCount(environmentId || null, updateCount);
        
        // 调试日志: 统计插件状态
        const gitRepoCount = response.plugins.filter(p => p.is_git_repo).length;
        const hasCommitHashCount = response.plugins.filter(p => p.commit_hash && p.commit_hash !== '' && p.commit_hash !== '-').length;
        const hasErrorCount = response.plugins.filter(p => p.git_fetch_error && p.git_fetch_error !== '').length;
        // 修改：将 commit_hash 为 "-" 的插件视为"已获取"（表示不在 GitHub 上或获取失败）
        const loadingCount = response.plugins.filter(p => 
          p.is_git_repo && 
          (!p.git_fetch_error || p.git_fetch_error === '') && 
          (!p.commit_hash || p.commit_hash === '')  // 只有空字符串才算"加载中"，"-" 表示已确认无法获取
        ).length;
        
        console.log('[usePlugins] 插件列表加载成功 - 统计信息:', {
          total: response.plugins.length,
          gitRepoCount,
          hasCommitHashCount,
          hasErrorCount,
          loadingCount,
        });
        
        // 打印所有仍在"加载中"的插件
        if (loadingCount > 0) {
          // 修改：将 commit_hash 为 "-" 的插件视为"已获取"
          const loadingPlugins = response.plugins.filter(p => 
            p.is_git_repo && 
            (!p.git_fetch_error || p.git_fetch_error === '') && 
            (!p.commit_hash || p.commit_hash === '')  // 只有空字符串才算"加载中"
          );
          console.log('[usePlugins] 仍在加载中的插件:', loadingPlugins.map(p => p.name));
        }
        
        // 记录日志
        console.log('[usePlugins] 插件列表加载成功', {
          count: response.plugins.length,
          fromCache: response.from_cache,
          environmentId,
          firstPlugin: response.plugins[0]?.name,
          hasGitUrl: !!response.plugins[0]?.git_url,
        });
        
        // 检查是否需要刷新（Git 仓库但缺少元数据）
        const needsRefresh = loadingCount > 0;
        
        // 返回是否有数据和是否需要刷新
        return { 
          hasData: response.plugins.length > 0,
          needsRefresh
        };
      } else {
        // 处理失败情况
        const errorMsg = response.error || '加载插件列表失败';
        setError(errorMsg);
        console.error('[usePlugins] 加载失败', errorMsg);
        return { hasData: false, needsRefresh: false };
      }
    } catch (err: any) {
      // 忽略取消错误
      if (err.name === 'AbortError' || controller.signal.aborted) {
        console.log('[usePlugins] 请求被取消');
        return { hasData: false, needsRefresh: false };
      }
      
      // 处理其他异常
      const errorMsg = err?.message || '加载插件列表时发生错误';
      setError(errorMsg);
      console.error('[usePlugins] 加载异常', err);
      return { hasData: false, needsRefresh: false };
    } finally {
      // 检查请求是否被取消
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [environmentId, cancelCurrentRequest]);
  
  /**
   * 刷新插件列表（增量更新）
   * 
   * 实现增量更新策略：
   * 1. 扫描目录对比缓存
   * 2. 异步获取 Git 信息
   * 3. 异步检测更新
   * 4. 异步检测依赖安装状态
   */
  const refreshPlugins = useCallback(async () => {
    // 设置刷新状态（不影响 loading 状态，避免闪烁）
    setRefreshing(true);
    setError(null);
    
    try {
      // 调用刷新 API（后端实现增量更新逻辑）
      const response = await pluginAPI.refreshPlugins();
      
      if (response.success && response.plugins) {
        // 强制创建新数组引用，确保React检测到变化
        setPlugins([...response.plugins]);
        
        // 统计待更新插件数量并更新徽章（传入环境 ID）
        const updateCount = response.plugins.filter(p => p.has_update).length;
        console.log('[usePlugins] 更新徽章状态:', {
          environmentId: environmentId || null,
          updateCount,
          hasUpdatePlugins: response.plugins.filter(p => p.has_update).map(p => p.name)
        });
        const { usePluginUpdateBadgeStore } = await import('@/stores/usePluginUpdateBadgeStore');
        usePluginUpdateBadgeStore.getState().setUpdateCount(environmentId || null, updateCount);
        
        // 如果后台正在更新，启动轮询
        if (response.background_updating) {
          startPolling();
        } else {
          // 没有后台更新，直接完成
          setRefreshing(false);
        }
        
        // 记录日志
        console.log('[usePlugins] 插件列表刷新成功', {
          count: response.plugins.length,
          updateCount,
          backgroundUpdating: response.background_updating,
          environmentId,
          firstPlugin: response.plugins[0]?.name,
          hasGitUrl: !!response.plugins[0]?.git_url,
        });
      } else {
        // 处理失败情况
        const errorMsg = response.error || '刷新插件列表失败';
        setError(errorMsg);
        setRefreshing(false);
        console.error('[usePlugins] 刷新失败', errorMsg);
      }
    } catch (err: any) {
      // 处理异常
      const errorMsg = err?.message || '刷新插件列表时发生错误';
      setError(errorMsg);
      setRefreshing(false);
      console.error('[usePlugins] 刷新异常', err);
    }
  }, [environmentId, startPolling]);
  
  /**
   * 更新单个插件信息（局部更新）
   * 
   * @param plugin - 更新后的插件信息
   */
  const updatePlugin = useCallback((plugin: PluginInfo) => {
    console.log('[usePlugins] updatePlugin 被调用，插件:', plugin.name, '新的 commit_hash:', plugin.commit_hash);
    
    setPlugins(prevPlugins => {
      console.log('[usePlugins] 当前插件列表长度:', prevPlugins.length);
      
      // 查找插件索引（需要考虑启用/禁用状态切换的情况）
      // 1. 如果是禁用操作：plugin.name 是 "xxx.disabled"，需要找到 "xxx"
      // 2. 如果是启用操作：plugin.name 是 "xxx"，需要找到 "xxx.disabled"
      let index = prevPlugins.findIndex(p => p.name === plugin.name);
      
      // 如果没找到，尝试查找对应的启用/禁用状态的插件
      if (index === -1) {
        if (plugin.name.endsWith('.disabled')) {
          // 当前是禁用状态，查找启用状态的插件
          const enabledName = plugin.name.replace(/\.disabled$/, '');
          index = prevPlugins.findIndex(p => p.name === enabledName);
          console.log('[usePlugins] 禁用操作，查找启用状态的插件:', enabledName, '索引:', index);
        } else {
          // 当前是启用状态，查找禁用状态的插件
          const disabledName = `${plugin.name}.disabled`;
          index = prevPlugins.findIndex(p => p.name === disabledName);
          console.log('[usePlugins] 启用操作，查找禁用状态的插件:', disabledName, '索引:', index);
        }
      }
      
      console.log('[usePlugins] 找到插件索引:', index);
      
      if (index === -1) {
        // 插件不存在，添加到列表
        console.log('[usePlugins] 添加新插件', plugin.name);
        return [...prevPlugins, plugin];
      } else {
        // 插件存在，更新信息（替换旧插件）
        const oldPlugin = prevPlugins[index];
        console.log('[usePlugins] 更新插件信息', plugin.name);
        console.log('[usePlugins] 旧插件名:', oldPlugin.name);
        console.log('[usePlugins] 新插件名:', plugin.name);
        console.log('[usePlugins] 旧的 commit_hash:', oldPlugin.commit_hash);
        console.log('[usePlugins] 新的 commit_hash:', plugin.commit_hash);
        
        const newPlugins = [...prevPlugins];
        newPlugins[index] = plugin;
        
        console.log('[usePlugins] 返回新数组，长度:', newPlugins.length);
        console.log('[usePlugins] 新数组中的插件 commit_hash:', newPlugins[index].commit_hash);
        
        return newPlugins;
      }
    });
  }, []);
  
  /**
   * 刷新单个插件的 Git 信息
   * 
   * 用于用户点击"获取超时"等错误按钮后的重试操作，
   * 只刷新指定插件的 Git 信息，不影响其他插件。
   * 
   * @param pluginName - 插件名称
   */
  const refreshPluginGitInfo = useCallback(async (pluginName: string) => {
    try {
      const response = await pluginAPI.refreshPluginGitInfo(pluginName);
      
      if (response.plugin) {
        // 无论成功还是失败，都更新插件信息（失败时可能包含新的错误状态）
        updatePlugin(response.plugin);
        console.log('[usePlugins] 单插件 Git 信息刷新完成', { pluginName, success: response.success });
      } else {
        console.error('[usePlugins] 单插件 Git 信息刷新失败', response.error);
      }
    } catch (err) {
      console.error('[usePlugins] 单插件 Git 信息刷新异常', err);
    }
  }, [updatePlugin]);
  
  /**
   * 搜索插件（本地过滤）
   * 
   * 实现不区分大小写的模糊匹配
   * 
   * @param keyword - 搜索关键词
   */
  const searchPlugins = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    
    // 记录日志
    console.log('[usePlugins] 搜索插件', { keyword });
  }, []);
  
  /**
   * 过滤后的插件列表（使用 useMemo 优化性能）
   * 
   * 验证需求: 2.1, 2.2（搜索过滤）
   */
  const filteredPlugins = useMemo(() => {
    // 如果没有搜索关键词，返回完整列表
    if (!searchKeyword.trim()) {
      return plugins;
    }
    
    // 转换为小写进行不区分大小写的匹配
    const lowerKeyword = searchKeyword.toLowerCase().trim();
    
    // 过滤插件列表
    return plugins.filter(plugin => 
      plugin.name.toLowerCase().includes(lowerKeyword)
    );
  }, [plugins, searchKeyword]);
  
  /**
   * 监听 environmentId 变化，自动重新加载插件列表
   * 
   * 验证需求: FR-2（响应式数据加载）, FR-3（状态清理）
   * 
   * 策略：
   * - 首次加载：使用缓存快速显示，如果缓存为空或过期则自动刷新
   * - 环境切换：先加载缓存快速显示，如果缓存为空或过期则自动刷新
   */
  useEffect(() => {
    // 清空搜索关键词（FR-3）
    setSearchKeyword('');
    
    // 清空错误状态（FR-3）
    setError(null);
    
    // 如果没有环境 ID，清空数据
    if (!environmentId) {
      setPlugins([]);
      setLoading(false);
      return;
    }
    
    // 先加载缓存（快速显示）
    loadPlugins(true).then(({ hasData, needsRefresh }) => {
      // 检查缓存是否为空（说明缓存过期或不存在）
      // 如果缓存为空，自动触发刷新
      if (!hasData) {
        console.log('[usePlugins] 缓存为空或已过期，自动触发刷新');
        refreshPlugins();
      } else if (needsRefresh) {
        // 如果有数据但需要刷新（Git 仓库缺少元数据）
        console.log('[usePlugins] 检测到插件缺少 GitHub 元数据，触发刷新');
        refreshPlugins();
      } else {
        console.log('[usePlugins] 缓存加载成功，数据完整，跳过自动刷新');
      }
    });
    
    // 清理函数：取消请求
    return () => {
      cancelCurrentRequest();
    };
  }, [environmentId, loadPlugins, refreshPlugins, cancelCurrentRequest]);
  
  /**
   * 重新加载函数（用于错误重试）
   */
  const refetch = useCallback(async (): Promise<{ hasData: boolean; needsRefresh: boolean }> => {
    if (environmentId) {
      return loadPlugins(false);
    }
    return Promise.resolve({ hasData: false, needsRefresh: false });
  }, [environmentId, loadPlugins]);
  
  /**
   * 取消后台更新
   */
  const cancelBackgroundUpdate = useCallback(async () => {
    try {
      const response = await pluginAPI.cancelBackgroundUpdate();
      
      if (response.success) {
        // 停止轮询
        clearPolling();
        
        // 清除刷新状态
        setRefreshing(false);
        setRefreshProgress({ current: 0, total: 0, stage: '', stageName: '' });
        
        console.log('[usePlugins] 后台更新已取消');
      } else {
        console.error('[usePlugins] 取消后台更新失败', response.error);
      }
    } catch (err: any) {
      console.error('[usePlugins] 取消后台更新异常', err);
    }
  }, [clearPolling]);
  
  /**
   * 移除单个插件（用于卸载）
   * 
   * @param pluginName - 插件名称
   */
  const removePlugin = useCallback((pluginName: string) => {
    setPlugins(prevPlugins => {
      console.log('[usePlugins] 移除插件', pluginName);
      return prevPlugins.filter(p => p.name !== pluginName);
    });
  }, []);
  
  // 返回 Hook 接口
  return {
    plugins,
    filteredPlugins,
    loading,
    refreshing,
    error,
    refreshProgress,
    loadPlugins,
    refreshPlugins,
    refreshPluginGitInfo,
    searchPlugins,
    searchKeyword,
    refetch,
    cancelBackgroundUpdate,
    updatePlugin,
    removePlugin,
  };
}

/**
 * 默认导出
 */
export default usePlugins;
