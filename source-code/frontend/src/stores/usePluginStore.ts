/**
 * 插件管理状态管理
 * 
 * 使用 Zustand 管理插件相关状态
 */

import { create } from 'zustand';
import { pluginService } from '../services/pluginService';
import type { 
  PluginInfo, 
  Dependency, 
  CommitInfo, 
  BranchInfo,
  UpdateResult 
} from '../types/plugin';

interface UpdateInfo {
  pluginName: string;
  currentVersion: string | null;
  latestVersion: string;
  commits: CommitInfo[];
}

interface PluginStore {
  // 基础状态
  plugins: PluginInfo[];
  loading: boolean;
  error: string | null;
  searchKeyword: string;
  selectedPlugin: PluginInfo | null;
  
  // 依赖管理状态
  showDependencyCard: boolean;
  currentDependencies: Dependency[];
  dependencyLoading: boolean;
  
  // 更新管理状态
  showUpdateCard: boolean;
  updateInfo: UpdateInfo | null;
  showBatchUpdateModal: boolean;
  batchUpdateProgress: Map<string, { status: string; progress: number; result?: UpdateResult }>;
  
  // 分支管理状态
  showBranchSelector: boolean;
  branches: BranchInfo[];
  branchLoading: boolean;
  
  // 插件列表管理 Actions
  loadPlugins: (useCache?: boolean) => Promise<void>;
  searchPlugins: (keyword: string) => void;
  refreshPlugins: () => Promise<void>;
  
  // 依赖管理 Actions
  getDependencies: (pluginName: string) => Promise<void>;
  installDependency: (pluginName: string, packageName: string, version: string) => Promise<void>;
  closeDependencyCard: () => void;
  
  // 更新管理 Actions
  updatePlugin: (pluginName: string) => Promise<boolean>;
  updateAllPlugins: () => Promise<void>;
  getUpdateInfo: (pluginName: string) => Promise<void>;
  closeUpdateCard: () => void;
  
  // 分支管理 Actions
  getBranches: (pluginName: string) => Promise<void>;
  switchBranch: (pluginName: string, branch: string) => Promise<void>;
  closeBranchSelector: () => void;
  
  // 插件操作 Actions
  uninstallPlugin: (pluginName: string) => Promise<boolean>;
  openPluginFolder: (pluginName: string) => Promise<void>;
  
  // 辅助方法
  setSelectedPlugin: (plugin: PluginInfo | null) => void;
  clearError: () => void;
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  // 初始状态
  plugins: [],
  loading: false,
  error: null,
  searchKeyword: '',
  selectedPlugin: null,
  
  // 依赖管理状态
  showDependencyCard: false,
  currentDependencies: [],
  dependencyLoading: false,
  
  // 更新管理状态
  showUpdateCard: false,
  updateInfo: null,
  showBatchUpdateModal: false,
  batchUpdateProgress: new Map(),
  
  // 分支管理状态
  showBranchSelector: false,
  branches: [],
  branchLoading: false,
  
  // ========== 插件列表管理 Actions ==========
  
  // 加载插件列表
  loadPlugins: async (useCache = true) => {
    set({ loading: true, error: null });
    
    try {
      const result = await pluginService.getPlugins(useCache);
      
      if (result.success && result.plugins) {
        set({ plugins: result.plugins, loading: false });
      } else {
        set({ error: result.error || '加载失败', loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
  
  // 刷新插件列表
  refreshPlugins: async () => {
    set({ loading: true, error: null });
    
    try {
      const result = await pluginService.refreshPlugins();
      
      if (result.success && result.plugins) {
        set({ plugins: result.plugins, loading: false });
      } else {
        set({ error: result.error || '刷新失败', loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
  
  // 搜索插件
  searchPlugins: (keyword: string) => {
    set({ searchKeyword: keyword });
  },
  
  // ========== 依赖管理 Actions ==========
  
  // 获取插件依赖列表
  getDependencies: async (pluginName: string) => {
    set({ dependencyLoading: true, error: null });
    
    try {
      const result = await pluginService.getPluginDependencies(pluginName);
      
      if (result.success && result.dependencies) {
        set({ 
          currentDependencies: result.dependencies,
          showDependencyCard: true,
          dependencyLoading: false,
          // 标记依赖已查看,清除依赖更新提示
          plugins: get().plugins.map(p => 
            p.name === pluginName 
              ? { ...p, dependency_viewed: true, dependency_updated: false }
              : p
          )
        });
      } else {
        set({ error: result.error || '获取依赖失败', dependencyLoading: false });
      }
    } catch (error) {
      set({ error: String(error), dependencyLoading: false });
    }
  },
  
  // 安装依赖
  installDependency: async (pluginName: string, packageName: string, version: string) => {
    set({ dependencyLoading: true, error: null });
    
    try {
      const result = await pluginService.installDependency(pluginName, packageName, version);
      
      if (result.success) {
        // 更新依赖列表中的安装状态
        set(state => ({
          currentDependencies: state.currentDependencies.map(dep =>
            dep.package === packageName
              ? { 
                  ...dep, 
                  installed: result.installed || false,
                  installed_version: result.installed_version || dep.installed_version
                }
              : dep
          ),
          dependencyLoading: false
        }));
      } else {
        set({ error: result.error || '安装失败', dependencyLoading: false });
      }
    } catch (error) {
      set({ error: String(error), dependencyLoading: false });
    }
  },
  
  // 关闭依赖卡片
  closeDependencyCard: () => {
    set({ 
      showDependencyCard: false,
      currentDependencies: []
    });
  },
  
  // ========== 更新管理 Actions ==========
  
  // 更新单个插件
  updatePlugin: async (pluginName: string) => {
    set({ loading: true, error: null });
    
    try {
      const result = await pluginService.updatePlugin(pluginName);
      
      if (result.success) {
        // 刷新列表
        await get().refreshPlugins();
        set({ loading: false });
        return true;
      } else {
        set({ error: result.error || '更新失败', loading: false });
        return false;
      }
    } catch (error) {
      set({ error: String(error), loading: false });
      return false;
    }
  },
  
  // 一键更新所有插件
  updateAllPlugins: async () => {
    set({ 
      showBatchUpdateModal: true,
      batchUpdateProgress: new Map(),
      error: null 
    });
    
    try {
      const result = await pluginService.updateAllPlugins();
      
      if (result.success) {
        // 刷新列表
        await get().refreshPlugins();
        
        // 更新进度信息
        if (result.results) {
          const progressMap = new Map();
          result.results.forEach((r: UpdateResult) => {
            progressMap.set(r.plugin_name, {
              status: r.success ? 'success' : 'failed',
              progress: 100,
              result: r
            });
          });
          set({ batchUpdateProgress: progressMap });
        }
      } else {
        set({ error: result.error || '批量更新失败' });
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },
  
  // 获取更新信息
  getUpdateInfo: async (pluginName: string) => {
    set({ loading: true, error: null });
    
    try {
      const result = await pluginService.getUpdateInfo(pluginName);
      
      if (result.success && result.commits) {
        const plugin = get().plugins.find(p => p.name === pluginName);
        
        if (plugin) {
          set({
            updateInfo: {
              pluginName,
              currentVersion: plugin.commit_hash,
              latestVersion: result.commits[0]?.hash || '',
              commits: result.commits
            },
            showUpdateCard: true,
            loading: false
          });
        } else {
          set({ error: '插件不存在', loading: false });
        }
      } else {
        set({ error: result.error || '获取更新信息失败', loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
  
  // 关闭更新卡片
  closeUpdateCard: () => {
    set({ 
      showUpdateCard: false,
      updateInfo: null
    });
  },
  
  // ========== 分支管理 Actions ==========
  
  // 获取分支列表
  getBranches: async (pluginName: string) => {
    set({ branchLoading: true, error: null });
    
    try {
      const result = await pluginService.getPluginBranches(pluginName);
      
      if (result.success && result.branches) {
        set({
          branches: result.branches,
          showBranchSelector: true,
          branchLoading: false
        });
      } else {
        set({ error: result.error || '获取分支列表失败', branchLoading: false });
      }
    } catch (error) {
      set({ error: String(error), branchLoading: false });
    }
  },
  
  // 切换分支
  switchBranch: async (pluginName: string, branch: string) => {
    set({ branchLoading: true, error: null });
    
    try {
      const result = await pluginService.switchPluginBranch(pluginName, branch);
      
      if (result.success) {
        // 刷新列表
        await get().refreshPlugins();
        
        // 关闭分支选择器
        set({ 
          showBranchSelector: false,
          branches: [],
          branchLoading: false
        });
      } else {
        set({ error: result.error || '切换分支失败', branchLoading: false });
      }
    } catch (error) {
      set({ error: String(error), branchLoading: false });
    }
  },
  
  // 关闭分支选择器
  closeBranchSelector: () => {
    set({ 
      showBranchSelector: false,
      branches: []
    });
  },
  
  // ========== 插件操作 Actions ==========
  
  // 卸载插件
  uninstallPlugin: async (pluginName: string) => {
    set({ loading: true, error: null });
    
    try {
      const result = await pluginService.uninstallPlugin(pluginName);
      
      if (result.success) {
        // 从列表中移除
        set(state => ({
          plugins: state.plugins.filter(p => p.name !== pluginName),
          loading: false
        }));
        return true;
      } else {
        set({ error: result.error || '卸载失败', loading: false });
        return false;
      }
    } catch (error) {
      set({ error: String(error), loading: false });
      return false;
    }
  },
  
  // 打开插件文件夹
  openPluginFolder: async (pluginName: string) => {
    try {
      await pluginService.openPluginFolder(pluginName);
    } catch (error) {
      set({ error: String(error) });
    }
  },
  
  // ========== 辅助方法 ==========
  
  // 设置选中的插件
  setSelectedPlugin: (plugin: PluginInfo | null) => {
    set({ selectedPlugin: plugin });
  },
  
  // 清除错误
  clearError: () => {
    set({ error: null });
  }
}));

export default usePluginStore;
