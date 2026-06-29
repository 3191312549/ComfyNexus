/**
 * 插件管理 Mock 数据
 * 
 * 用于开发和测试插件管理功能
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
  PluginInfo,
  Dependency,
  CommitInfo,
  BranchInfo,
  UpdateResult,
  UpdateSummary,
} from '@/types/plugin'

const now = new Date()
const formatDate = (daysAgo: number): string => {
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return date.toISOString()
}

export const mockInstalledPlugins: PluginInfo[] = [
  {
    name: 'ComfyUI-Manager',
    path: 'custom_nodes/ComfyUI-Manager',
    is_git_repo: true,
    git_url: 'https://github.com/ltdrdata/ComfyUI-Manager',
    branch: 'main',
    default_branch: 'main',
    commit_hash: 'abc123def456',
    commit_date: formatDate(1),
    has_update: true,
    behind_commits: 5,
    dependency_updated: true,
    dependency_viewed: false,
    install_date: formatDate(30),
    enabled: true,
  },
  {
    name: 'ComfyUI-Impact-Pack',
    path: 'custom_nodes/ComfyUI-Impact-Pack',
    is_git_repo: true,
    git_url: 'https://github.com/ltdrdata/ComfyUI-Impact-Pack',
    branch: 'main',
    default_branch: 'main',
    commit_hash: 'def456ghi789',
    commit_date: formatDate(3),
    has_update: false,
    behind_commits: 0,
    dependency_updated: true,
    dependency_viewed: true,
    install_date: formatDate(60),
    enabled: true,
  },
  {
    name: 'ComfyUI-AnimateDiff-Evolved',
    path: 'custom_nodes/ComfyUI-AnimateDiff-Evolved',
    is_git_repo: true,
    git_url: 'https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved',
    branch: 'main',
    default_branch: 'main',
    commit_hash: 'ghi789jkl012',
    commit_date: formatDate(5),
    has_update: true,
    behind_commits: 10,
    dependency_updated: false,
    dependency_viewed: false,
    install_date: formatDate(45),
    enabled: true,
  },
  {
    name: 'ComfyUI-ControlNet-Aux',
    path: 'custom_nodes/comfyui_controlnet_aux',
    is_git_repo: true,
    git_url: 'https://github.com/Fannovel16/comfyui_controlnet_aux',
    branch: 'main',
    default_branch: 'main',
    commit_hash: 'jkl012mno345',
    commit_date: formatDate(7),
    has_update: false,
    behind_commits: 0,
    dependency_updated: true,
    dependency_viewed: true,
    install_date: formatDate(90),
    enabled: false,
  },
]

export const mockPluginService = {
  getPlugins: async (_useCache?: boolean): Promise<PluginsResponse> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      success: true,
      plugins: mockInstalledPlugins,
    }
  },

  searchPlugins: async (keyword: string): Promise<PluginsResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const filtered = mockInstalledPlugins.filter(p =>
      p.name.toLowerCase().includes(keyword.toLowerCase())
    )
    return {
      success: true,
      plugins: filtered,
    }
  },

  refreshPlugins: async (): Promise<PluginsResponse> => {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      success: true,
      plugins: mockInstalledPlugins,
    }
  },

  getPluginDependencies: async (_pluginName: string): Promise<DependenciesResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const dependencies: Dependency[] = [
      { package: 'torch', version: '>=2.0.0', installed: true, installed_version: '2.1.0', version_match: true, message: '已安装' },
      { package: 'numpy', version: '>=1.24.0', installed: true, installed_version: '1.25.0', version_match: true, message: '已安装' },
      { package: 'pillow', version: '>=9.0.0', installed: true, installed_version: '10.0.0', version_match: true, message: '已安装' },
      { package: 'opencv-python', version: '>=4.8.0', installed: false, installed_version: null, version_match: false, message: '未安装' },
    ]
    return {
      success: true,
      dependencies,
    }
  },

  installDependency: async (_pluginName: string, packageName: string, _version?: string): Promise<OperationResponse> => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return {
      success: true,
      message: `成功安装 ${packageName}`,
    }
  },

  updatePlugin: async (pluginName: string, _force?: boolean): Promise<OperationResponse> => {
    await new Promise(resolve => setTimeout(resolve, 3000))
    return {
      success: true,
      message: `成功更新 ${pluginName}`,
    }
  },

  updateAllPlugins: async (): Promise<BatchUpdateResponse> => {
    await new Promise(resolve => setTimeout(resolve, 5000))
    const results: UpdateResult[] = [
      {
        plugin_name: 'ComfyUI-Manager',
        success: true,
        message: '更新成功',
        dependency_changed: false,
        dependencies_installed: 0,
      },
      {
        plugin_name: 'ComfyUI-AnimateDiff-Evolved',
        success: true,
        message: '更新成功',
        dependency_changed: true,
        dependencies_installed: 2,
      },
    ]
    const summary: UpdateSummary = {
      total: 2,
      success: 2,
      failed: 0,
      dependencies_installed: 2,
    }
    return {
      success: true,
      message: '成功更新所有插件',
      results,
      summary,
    }
  },

  getUpdateInfo: async (_pluginName: string): Promise<UpdateInfoResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const commits: CommitInfo[] = [
      { hash: 'abc123', message: '修复了一些 bug', date: formatDate(1) },
      { hash: 'def456', message: '优化了性能', date: formatDate(2) },
      { hash: 'ghi789', message: '新增了一些功能', date: formatDate(3) },
    ]
    return {
      success: true,
      commits,
    }
  },

  switchPluginBranch: async (_pluginName: string, branch: string): Promise<OperationResponse> => {
    await new Promise(resolve => setTimeout(resolve, 1500))
    return {
      success: true,
      message: `成功切换到分支 ${branch}`,
    }
  },

  getPluginBranches: async (_pluginName: string): Promise<BranchesResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const branches: BranchInfo[] = [
      { name: 'main', is_current: true, is_default: true },
      { name: 'dev', is_current: false, is_default: false },
      { name: 'feature/new-ui', is_current: false, is_default: false },
      { name: 'hotfix/bug-fix', is_current: false, is_default: false },
    ]
    return {
      success: true,
      branches,
    }
  },

  uninstallPlugin: async (pluginName: string): Promise<OperationResponse> => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return {
      success: true,
      message: `成功卸载 ${pluginName}`,
    }
  },

  openPluginFolder: async (_pluginName: string): Promise<OperationResponse> => {
    return {
      success: false,
      error: '开发环境不支持打开文件夹',
    }
  },

  detectPluginConflicts: async (): Promise<ConflictsResponse> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      success: true,
      conflicts: [],
    }
  },

  checkGitPermissions: async (): Promise<GitPermissionCheckResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      success: true,
      total: 4,
      problem_count: 0,
      problem_repos: [],
      git_version: '2.40.0',
      is_supported: true,
    }
  },

  fixGitPermissions: async (): Promise<GitPermissionFixResponse> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      success: true,
      total: 4,
      fixed: 0,
      failed: 0,
      message: '权限修复完成',
    }
  },
}
