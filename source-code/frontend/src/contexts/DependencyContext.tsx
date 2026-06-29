/**
 * 依赖管理状态管理 Context
 * 
 * 使用 React Context + useReducer 实现全局状态管理
 * 管理依赖列表、插件列表、搜索过滤、当前操作等状态
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type {
  Dependency,
  Plugin,
  Operation,
  EnvironmentInfo,
  DependencyStatus,
  OperationType,
  OperationStatus
} from '../types/dependency';
import { DependencyApi } from '../api/dependencyApi';

// ==================== 状态接口定义 ====================

/**
 * 依赖管理状态接口
 */
export interface DependencyState {
  /** 依赖列表 */
  dependencies: Dependency[];
  /** 插件列表 */
  plugins: Plugin[];
  /** 当前选中的插件（null 表示"全部"，"core" 表示核心） */
  selectedPlugin: string | null;
  /** 搜索关键词 */
  searchQuery: string;
  /** 搜索类型 */
  searchType: 'plugin' | 'package';
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 当前操作 */
  currentOperation: Operation | null;
  /** 环境信息 */
  environment: EnvironmentInfo | null;
}

/**
 * 状态 Action 类型
 */
export type DependencyAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DEPENDENCIES'; payload: Dependency[] }
  | { type: 'SET_PLUGINS'; payload: Plugin[] }
  | { type: 'SET_ENVIRONMENT'; payload: EnvironmentInfo }
  | { type: 'SELECT_PLUGIN'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_TYPE'; payload: 'plugin' | 'package' }
  | { type: 'UPDATE_DEPENDENCY_STATUS'; payload: { id: string; status: Partial<Dependency> } }
  | { type: 'SET_CURRENT_OPERATION'; payload: Operation | null }
  | { type: 'UPDATE_OPERATION_PROGRESS'; payload: { id: string; progress: number; message: string } };

/**
 * Context 值接口
 */
export interface DependencyContextValue {
  /** 状态 */
  state: DependencyState;
  
  /** 操作方法 */
  actions: {
    /** 初始化 */
    initialize: () => Promise<void>;
    
    /** 扫描依赖 */
    scanDependencies: () => Promise<void>;
    
    /** 刷新状态 */
    refreshStatus: () => Promise<void>;
    
    /** 设置搜索关键词 */
    setSearchQuery: (query: string) => void;
    
    /** 设置搜索类型 */
    setSearchType: (type: 'plugin' | 'package') => void;
    
    /** 选择插件 */
    selectPlugin: (pluginName: string | null) => void;
    
    /** 安装单个包 */
    installPackage: (dependency: Dependency) => Promise<void>;
    
    /** 卸载单个包 */
    uninstallPackage: (dependency: Dependency) => Promise<void>;
    
    /** 批量安装核心依赖 */
    batchInstallCore: () => Promise<void>;
    
    /** 批量安装插件依赖 */
    batchInstallPlugin: (pluginName: string) => Promise<void>;
    
    /** 批量安装全部依赖 */
    batchInstallAll: () => Promise<void>;
    
    /** 取消操作 */
    cancelOperation: () => void;
  };
}

// ==================== Reducer 实现 ====================

/**
 * 初始状态
 */
const initialState: DependencyState = {
  dependencies: [],
  plugins: [],
  selectedPlugin: null,
  searchQuery: '',
  searchType: 'package',
  loading: false,
  error: null,
  currentOperation: null,
  environment: null
};

/**
 * 状态 Reducer
 */
function dependencyReducer(state: DependencyState, action: DependencyAction): DependencyState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_DEPENDENCIES':
      return { ...state, dependencies: action.payload, loading: false };
    
    case 'SET_PLUGINS':
      return { ...state, plugins: action.payload };
    
    case 'SET_ENVIRONMENT':
      return { ...state, environment: action.payload };
    
    case 'SELECT_PLUGIN':
      return { ...state, selectedPlugin: action.payload };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_SEARCH_TYPE':
      return { ...state, searchType: action.payload };
    
    case 'UPDATE_DEPENDENCY_STATUS':
      return {
        ...state,
        dependencies: state.dependencies.map(dep =>
          dep.id === action.payload.id
            ? { ...dep, ...action.payload.status }
            : dep
        )
      };
    
    case 'SET_CURRENT_OPERATION':
      return { ...state, currentOperation: action.payload };
    
    case 'UPDATE_OPERATION_PROGRESS':
      if (!state.currentOperation || state.currentOperation.id !== action.payload.id) {
        return state;
      }
      return {
        ...state,
        currentOperation: {
          ...state.currentOperation,
          progress: action.payload.progress,
          message: action.payload.message
        }
      };
    
    default:
      return state;
  }
}

// ==================== Context 创建 ====================

/**
 * 依赖管理 Context
 */
const DependencyContext = createContext<DependencyContextValue | undefined>(undefined);

/**
 * 依赖管理 Provider 组件属性
 */
interface DependencyProviderProps {
  children: React.ReactNode;
}

/**
 * 依赖管理 Provider 组件
 * 
 * 提供依赖管理的全局状态和操作方法
 */
export function DependencyProvider({ children }: DependencyProviderProps) {
  const [state, dispatch] = useReducer(dependencyReducer, initialState);

  // ==================== 操作方法实现 ====================

  /**
   * 初始化
   * 加载环境信息和依赖列表
   */
  const initialize = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // 获取环境信息
      const envResult = await DependencyApi.getEnvironmentInfo();
      if (envResult.success && envResult.data) {
        dispatch({ type: 'SET_ENVIRONMENT', payload: envResult.data });
      } else {
        throw new Error(envResult.error?.message || '获取环境信息失败');
      }

      // 扫描依赖
      await scanDependencies();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '初始化失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('初始化失败:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  /**
   * 扫描依赖
   */
  const scanDependencies = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // 扫描依赖
      const scanResult = await DependencyApi.scanDependencies();
      if (!scanResult.success || !scanResult.data) {
        throw new Error(scanResult.error?.message || '扫描依赖失败');
      }

      // 转换数据格式
      const allDependencies: Dependency[] = [];
      const plugins: Plugin[] = [];

      // 处理核心依赖
      if (scanResult.data.core) {
        allDependencies.push(...scanResult.data.core);
      }

      // 处理插件依赖
      if (scanResult.data.plugins) {
        Object.entries(scanResult.data.plugins).forEach(([pluginName, deps]) => {
          allDependencies.push(...deps);
          
          plugins.push({
            name: pluginName,
            path: '', // 路径信息从后端获取
            hasRequirements: deps.length > 0,
            dependencyCount: deps.length,
            dependencies: deps
          });
        });
      }

      // 按字母顺序排序插件列表
      plugins.sort((a, b) => a.name.localeCompare(b.name));

      dispatch({ type: 'SET_DEPENDENCIES', payload: allDependencies });
      dispatch({ type: 'SET_PLUGINS', payload: plugins });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '扫描依赖失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('扫描依赖失败:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  /**
   * 刷新状态
   */
  const refreshStatus = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // 获取所有包名
      const packageNames = state.dependencies.map(dep => dep.packageName);
      
      if (packageNames.length === 0) {
        return;
      }

      // 批量检查状态
      const statusResult = await DependencyApi.checkAllStatus(packageNames);
      if (!statusResult.success || !statusResult.data) {
        throw new Error(statusResult.error?.message || '刷新状态失败');
      }

      // 更新每个依赖的状态
      Object.entries(statusResult.data).forEach(([packageName, status]) => {
        const dependency = state.dependencies.find(dep => dep.packageName === packageName);
        if (dependency) {
          dispatch({
            type: 'UPDATE_DEPENDENCY_STATUS',
            payload: {
              id: dependency.id,
              status: {
                installed: status.installed,
                installedVersion: status.version,
                versionMatch: status.installed && status.version === dependency.versionSpec.replace(/[>=<~!=]/g, ''),
                status: status.installed ? 'installed' as DependencyStatus : 'not_installed' as DependencyStatus
              }
            }
          });
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '刷新状态失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('刷新状态失败:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.dependencies]);

  /**
   * 设置搜索关键词
   */
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  /**
   * 设置搜索类型
   */
  const setSearchType = useCallback((type: 'plugin' | 'package') => {
    dispatch({ type: 'SET_SEARCH_TYPE', payload: type });
  }, []);

  /**
   * 选择插件
   */
  const selectPlugin = useCallback((pluginName: string | null) => {
    dispatch({ type: 'SELECT_PLUGIN', payload: pluginName });
  }, []);

  /**
   * 安装单个包
   */
  const installPackage = useCallback(async (dependency: Dependency) => {
    try {
      // 创建操作记录
      const operation: Operation = {
        id: `install-${dependency.id}-${Date.now()}`,
        type: 'install_single' as OperationType,
        status: 'running' as OperationStatus,
        target: dependency.packageName,
        progress: 0,
        message: `正在安装 ${dependency.packageName}...`,
        startTime: Date.now(),
        endTime: null,
        result: null
      };

      dispatch({ type: 'SET_CURRENT_OPERATION', payload: operation });

      // 调用安装 API
      const result = await DependencyApi.installPackage(
        dependency.packageName,
        dependency.versionSpec
      );

      if (result.success) {
        // 更新依赖状态
        dispatch({
          type: 'UPDATE_DEPENDENCY_STATUS',
          payload: {
            id: dependency.id,
            status: {
              installed: true,
              installedVersion: result.data?.installedVersion || null,
              versionMatch: true,
              status: 'installed' as DependencyStatus
            }
          }
        });

        // 更新操作状态
        dispatch({
          type: 'SET_CURRENT_OPERATION',
          payload: {
            ...operation,
            status: 'success' as OperationStatus,
            progress: 100,
            message: `${dependency.packageName} 安装成功`,
            endTime: Date.now(),
            result: {
              success: true,
              message: '安装成功'
            }
          }
        });
      } else {
        throw new Error(result.error?.message || '安装失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '安装失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('安装包失败:', error);
      
      // 更新操作状态为失败
      dispatch({
        type: 'SET_CURRENT_OPERATION',
        payload: null
      });
    }
  }, []);

  /**
   * 卸载单个包
   */
  const uninstallPackage = useCallback(async (dependency: Dependency) => {
    try {
      // 创建操作记录
      const operation: Operation = {
        id: `uninstall-${dependency.id}-${Date.now()}`,
        type: 'uninstall_single' as OperationType,
        status: 'running' as OperationStatus,
        target: dependency.packageName,
        progress: 0,
        message: `正在卸载 ${dependency.packageName}...`,
        startTime: Date.now(),
        endTime: null,
        result: null
      };

      dispatch({ type: 'SET_CURRENT_OPERATION', payload: operation });

      // 调用卸载 API
      const result = await DependencyApi.uninstallPackage(dependency.packageName);

      if (result.success) {
        // 更新依赖状态
        dispatch({
          type: 'UPDATE_DEPENDENCY_STATUS',
          payload: {
            id: dependency.id,
            status: {
              installed: false,
              installedVersion: null,
              versionMatch: false,
              status: 'not_installed' as DependencyStatus
            }
          }
        });

        // 更新操作状态
        dispatch({
          type: 'SET_CURRENT_OPERATION',
          payload: {
            ...operation,
            status: 'success' as OperationStatus,
            progress: 100,
            message: `${dependency.packageName} 卸载成功`,
            endTime: Date.now(),
            result: {
              success: true,
              message: '卸载成功'
            }
          }
        });
      } else {
        throw new Error(result.error?.message || '卸载失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '卸载失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('卸载包失败:', error);
      
      // 更新操作状态为失败
      dispatch({
        type: 'SET_CURRENT_OPERATION',
        payload: null
      });
    }
  }, []);

  /**
   * 批量安装核心依赖
   */
  const batchInstallCore = useCallback(async () => {
    try {
      // 创建操作记录
      const operation: Operation = {
        id: `batch-install-core-${Date.now()}`,
        type: 'install_batch' as OperationType,
        status: 'running' as OperationStatus,
        target: 'core',
        progress: 0,
        message: '正在安装核心依赖...',
        startTime: Date.now(),
        endTime: null,
        result: null
      };

      dispatch({ type: 'SET_CURRENT_OPERATION', payload: operation });

      // 调用批量安装 API
      // 注意：这里需要核心 requirements.txt 的路径
      const result = await DependencyApi.installFromRequirements('ComfyUI/requirements.txt');

      if (result.success && result.data) {
        // 刷新依赖状态
        await refreshStatus();

        // 更新操作状态
        dispatch({
          type: 'SET_CURRENT_OPERATION',
          payload: {
            ...operation,
            status: 'success' as OperationStatus,
            progress: 100,
            message: `核心依赖安装完成（成功: ${result.data.succeeded}, 失败: ${result.data.failed}）`,
            endTime: Date.now(),
            result: {
              success: true,
              message: '批量安装完成',
              details: result.data
            }
          }
        });
      } else {
        throw new Error(result.error?.message || '批量安装失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量安装失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('批量安装核心依赖失败:', error);
      
      dispatch({
        type: 'SET_CURRENT_OPERATION',
        payload: null
      });
    }
  }, [refreshStatus]);

  /**
   * 批量安装插件依赖
   */
  const batchInstallPlugin = useCallback(async (pluginName: string) => {
    try {
      // 创建操作记录
      const operation: Operation = {
        id: `batch-install-plugin-${pluginName}-${Date.now()}`,
        type: 'install_batch' as OperationType,
        status: 'running' as OperationStatus,
        target: pluginName,
        progress: 0,
        message: `正在安装 ${pluginName} 的依赖...`,
        startTime: Date.now(),
        endTime: null,
        result: null
      };

      dispatch({ type: 'SET_CURRENT_OPERATION', payload: operation });

      // 调用批量安装 API
      const result = await DependencyApi.installFromRequirements(
        `ComfyUI/custom_nodes/${pluginName}/requirements.txt`
      );

      if (result.success && result.data) {
        // 刷新依赖状态
        await refreshStatus();

        // 更新操作状态
        dispatch({
          type: 'SET_CURRENT_OPERATION',
          payload: {
            ...operation,
            status: 'success' as OperationStatus,
            progress: 100,
            message: `${pluginName} 依赖安装完成（成功: ${result.data.succeeded}, 失败: ${result.data.failed}）`,
            endTime: Date.now(),
            result: {
              success: true,
              message: '批量安装完成',
              details: result.data
            }
          }
        });
      } else {
        throw new Error(result.error?.message || '批量安装失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量安装失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('批量安装插件依赖失败:', error);
      
      dispatch({
        type: 'SET_CURRENT_OPERATION',
        payload: null
      });
    }
  }, [refreshStatus]);

  /**
   * 批量安装全部依赖
   */
  const batchInstallAll = useCallback(async () => {
    try {
      // 创建操作记录
      const operation: Operation = {
        id: `batch-install-all-${Date.now()}`,
        type: 'install_batch' as OperationType,
        status: 'running' as OperationStatus,
        target: 'all',
        progress: 0,
        message: '正在安装全部依赖...',
        startTime: Date.now(),
        endTime: null,
        result: null
      };

      dispatch({ type: 'SET_CURRENT_OPERATION', payload: operation });

      // 先安装核心依赖
      dispatch({
        type: 'UPDATE_OPERATION_PROGRESS',
        payload: {
          id: operation.id,
          progress: 10,
          message: '正在安装核心依赖...'
        }
      });

      await DependencyApi.installFromRequirements('ComfyUI/requirements.txt');

      // 然后依次安装每个插件的依赖
      const totalPlugins = state.plugins.length;
      for (let i = 0; i < totalPlugins; i++) {
        const plugin = state.plugins[i];
        const progress = 10 + ((i + 1) / totalPlugins) * 90;
        
        dispatch({
          type: 'UPDATE_OPERATION_PROGRESS',
          payload: {
            id: operation.id,
            progress,
            message: `正在安装 ${plugin.name} 的依赖... (${i + 1}/${totalPlugins})`
          }
        });

        if (plugin.hasRequirements) {
          await DependencyApi.installFromRequirements(
            `ComfyUI/custom_nodes/${plugin.name}/requirements.txt`
          );
        }
      }

      // 刷新依赖状态
      await refreshStatus();

      // 更新操作状态
      dispatch({
        type: 'SET_CURRENT_OPERATION',
        payload: {
          ...operation,
          status: 'success' as OperationStatus,
          progress: 100,
          message: '全部依赖安装完成',
          endTime: Date.now(),
          result: {
            success: true,
            message: '批量安装完成'
          }
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量安装失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('批量安装全部依赖失败:', error);
      
      dispatch({
        type: 'SET_CURRENT_OPERATION',
        payload: null
      });
    }
  }, [state.plugins, refreshStatus]);

  /**
   * 取消操作
   */
  const cancelOperation = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_OPERATION', payload: null });
  }, []);

  // ==================== Context 值 ====================

  const contextValue = useMemo<DependencyContextValue>(
    () => ({
      state,
      actions: {
        initialize,
        scanDependencies,
        refreshStatus,
        setSearchQuery,
        setSearchType,
        selectPlugin,
        installPackage,
        uninstallPackage,
        batchInstallCore,
        batchInstallPlugin,
        batchInstallAll,
        cancelOperation
      }
    }),
    [
      state,
      initialize,
      scanDependencies,
      refreshStatus,
      setSearchQuery,
      setSearchType,
      selectPlugin,
      installPackage,
      uninstallPackage,
      batchInstallCore,
      batchInstallPlugin,
      batchInstallAll,
      cancelOperation
    ]
  );

  return (
    <DependencyContext.Provider value={contextValue}>
      {children}
    </DependencyContext.Provider>
  );
}

/**
 * 使用依赖管理 Context 的 Hook
 * 
 * @returns Context 值
 * @throws 如果在 Provider 外部使用
 */
export function useDependencyContext(): DependencyContextValue {
  const context = useContext(DependencyContext);
  
  if (context === undefined) {
    throw new Error('useDependencyContext 必须在 DependencyProvider 内部使用');
  }
  
  return context;
}

export default DependencyContext;

// ==================== 派生状态计算函数 ====================

/**
 * 获取过滤后的依赖列表
 * 
 * @param state - 当前状态
 * @returns 过滤后的依赖列表
 */
export function getFilteredDependencies(state: DependencyState): Dependency[] {
  let filtered = state.dependencies;
  
  // 按插件过滤
  if (state.selectedPlugin) {
    if (state.selectedPlugin === 'core') {
      filtered = filtered.filter(dep => dep.source === 'core');
    } else if (state.selectedPlugin !== 'all') {
      filtered = filtered.filter(dep => dep.source === state.selectedPlugin);
    }
  }
  
  // 按搜索关键词过滤
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    if (state.searchType === 'package') {
      filtered = filtered.filter(dep =>
        dep.packageName.toLowerCase().includes(query)
      );
    } else {
      filtered = filtered.filter(dep =>
        dep.source.toLowerCase().includes(query)
      );
    }
  }
  
  return filtered;
}

/**
 * 获取依赖统计信息
 * 
 * @param dependencies - 依赖列表
 * @returns 统计信息
 */
export function getDependencyStats(dependencies: Dependency[]) {
  return {
    total: dependencies.length,
    installed: dependencies.filter(d => d.installed).length,
    notInstalled: dependencies.filter(d => !d.installed).length,
    versionMismatch: dependencies.filter(d => d.installed && !d.versionMatch).length
  };
}

/**
 * 使用派生状态的 Hook
 * 
 * @returns 包含过滤后依赖和统计信息的对象
 */
export function useDerivedDependencyState() {
  const { state } = useDependencyContext();
  
  // 使用 useMemo 缓存过滤结果
  const filteredDependencies = useMemo(
    () => getFilteredDependencies(state),
    [state.dependencies, state.selectedPlugin, state.searchQuery, state.searchType]
  );
  
  // 使用 useMemo 缓存统计结果
  const stats = useMemo(
    () => getDependencyStats(filteredDependencies),
    [filteredDependencies]
  );
  
  return {
    filteredDependencies,
    stats
  };
}
