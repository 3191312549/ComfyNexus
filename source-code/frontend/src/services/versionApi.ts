/**
 * 版本管理 API 接口
 */

import {
  VersionInfo,
  RemoteInfo,
  SwitchResult,
  DependencyUpdateResult,
  ProcessStatus,
  VersionListResponse,
  SwitchVersionParams,
  BranchesData,
  SwitchBranchResult,
} from '@/types/version'
import { PluginInfo } from '@/types/plugin'

import * as mockVersion from '@/mocks/version'

interface DepInstallResult {
  package: string
  version: string
  success: boolean
  error?: string
}

const isDevelopment = (): boolean => {
  const isPureBrowserDev = window.location.port === '5173' || window.location.port === '3000'
  return isPureBrowserDev
}

/**
 * 获取版本列表
 */
export async function getVersions(params: {
  type: 'stable' | 'dev'
  page: number
  pageSize: number
  branch?: string
  forceRefresh?: boolean
}): Promise<VersionListResponse> {
  if (isDevelopment()) {
    const result = mockVersion.getVersions(params.type, params.page, params.pageSize)
    return result
  }

  try {
    const response = await window.pywebview.api.get_versions(
      params.type,
      params.page,
      params.pageSize,
      params.branch || null,
      params.forceRefresh || false
    ) as {
      success: boolean
      versions: VersionInfo[]
      hasMore: boolean
      fromCache?: boolean
      cacheAge?: number
      isUpdating?: boolean
      totalCached?: number
      newItemsCount?: number
      needBackgroundUpdate?: boolean
      errorType?: string
      error?: string
      repoPath?: string
      branch?: string
    }
    
    if (response.success) {
      return {
        versions: response.versions,
        hasMore: response.hasMore,
        fromCache: response.fromCache,
        cacheAge: response.cacheAge,
        isUpdating: response.isUpdating,
        totalCached: response.totalCached,
        newItemsCount: response.newItemsCount,
        needBackgroundUpdate: response.needBackgroundUpdate,
      }
    }
    
    return {
      versions: response.versions || [],
      hasMore: response.hasMore || false,
      errorType: response.errorType as VersionListResponse['errorType'],
      error: response.error,
      repoPath: response.repoPath,
      branch: response.branch,
      fromCache: response.fromCache,
      cacheAge: response.cacheAge,
      isUpdating: response.isUpdating,
    }
  } catch (error) {
    console.error('获取版本列表失败:', error)
    return {
      versions: [],
      hasMore: false,
    }
  }
}

/**
 * 获取当前版本信息
 */
export async function getCurrentVersion(): Promise<VersionInfo | null> {
  if (isDevelopment()) {
    return mockVersion.getCurrentVersion()
  }

  try {
    const response = await window.pywebview.api.get_current_version()
    
    if (response.success && response.version) {
      return response.version
    }
    
    return null
  } catch (error) {
    console.error('获取当前版本失败:', error)
    return null
  }
}

/**
 * 切换版本
 */
export async function switchVersion(params: SwitchVersionParams): Promise<SwitchResult> {
  if (isDevelopment()) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      success: true,
      needDependencyUpdate: Math.random() > 0.5,
      message: '版本切换成功（Mock）',
    }
  }

  try {
    const response = await window.pywebview.api.switch_version(
      params.versionId,
      params.type,
      params.force || false
    )
    
    return {
      success: response.success,
      needDependencyUpdate: response.needDependencyUpdate,
      message: response.message,
      originalCommit: response.originalCommit,
      requiresForce: response.requires_force,
      stashed: response.stashed ?? false,
    }
  } catch (error) {
    console.error('切换版本失败:', error)
    return {
      success: false,
      needDependencyUpdate: false,
      message: `切换版本失败: ${error}`,
    }
  }
}

/**
 * 回退到指定版本
 */
export async function rollbackVersion(commitHash: string): Promise<{ success: boolean; message: string }> {
  if (isDevelopment()) {
    return { success: true, message: '回退成功（Mock）' }
  }

  try {
    const response = await window.pywebview.api.rollback_version(commitHash)
    
    return {
      success: response.success,
      message: response.message,
    }
  } catch (error) {
    console.error('回退版本失败:', error)
    return {
      success: false,
      message: `回退版本失败: ${error}`,
    }
  }
}

/**
 * 更新依赖
 */
export async function updateDependencies(): Promise<DependencyUpdateResult> {
  if (isDevelopment()) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return {
      success: true,
      message: '依赖更新成功（Mock）',
    }
  }

  try {
    const response = await window.pywebview.api.update_dependencies()
    
    return {
      success: response.success,
      message: response.message,
      logFile: response.log_file,
    }
  } catch (error) {
    console.error('更新依赖失败:', error)
    return {
      success: false,
      message: `更新依赖失败: ${error}`,
    }
  }
}

/**
 * 重启进程
 */
export async function restartProcess(): Promise<{ success: boolean; message: string }> {
  if (isDevelopment()) {
    return { success: true, message: '重启成功（Mock）' }
  }

  try {
    const response = await window.pywebview.api.restart_process()
    
    return {
      success: response.success,
      message: response.message,
    }
  } catch (error) {
    console.error('重启进程失败:', error)
    return {
      success: false,
      message: `重启进程失败: ${error}`,
    }
  }
}

/**
 * 获取远端信息
 */
export async function getRemoteInfo(): Promise<RemoteInfo | null> {
  if (isDevelopment()) {
    return mockVersion.mockRemoteInfo
  }

  try {
    const response = await window.pywebview.api.get_remote_info()
    
    if (response.success && response.remoteInfo) {
      return response.remoteInfo
    }
    
    return null
  } catch (error) {
    console.error('获取远端信息失败:', error)
    return null
  }
}

/**
 * 更新远端地址
 */
export async function updateRemoteUrl(url: string): Promise<{ success: boolean; message: string }> {
  if (isDevelopment()) {
    return { success: true, message: '远端地址更新成功（Mock）' }
  }

  try {
    const response = await window.pywebview.api.update_remote_url(url)
    
    return {
      success: response.success,
      message: response.message,
    }
  } catch (error) {
    console.error('更新远端地址失败:', error)
    return {
      success: false,
      message: `更新远端地址失败: ${error}`,
    }
  }
}

/**
 * 检查进程状态
 */
export async function checkProcessStatus(): Promise<ProcessStatus> {
  if (isDevelopment()) {
    return { isRunning: false, hasTask: false }
  }

  try {
    const response = await window.pywebview.api.check_process_status()
    
    if (response.success) {
      return {
        isRunning: response.isRunning,
        hasTask: response.hasTask,
      }
    }
    
    return {
      isRunning: false,
      hasTask: false,
    }
  } catch (error) {
    console.error('检查进程状态失败:', error)
    return {
      isRunning: false,
      hasTask: false,
    }
  }
}

/**
 * 修复 Git 所有权问题
 */
export async function fixGitOwnership(): Promise<{
  success: boolean
  message?: string
}> {
  if (isDevelopment()) {
    return { success: true, message: '修复成功（Mock）' }
  }

  try {
    const result = await window.pywebview.api.fix_git_ownership()
    return result
  } catch (error) {
    console.error('修复 Git 权限失败:', error)
    return {
      success: false,
      message: '修复失败'
    }
  }
}

/**
 * 获取分支列表
 */
export async function getBranches(): Promise<BranchesData | null> {
  if (isDevelopment()) {
    return mockVersion.mockBranches
  }

  try {
    const response = await window.pywebview.api.get_branches()
    
    if (response.success) {
      return {
        currentBranch: response.current_branch,
        localBranches: response.local_branches,
        remoteBranches: response.remote_branches,
      }
    }
    
    console.error('获取分支列表失败:', response.error)
    return null
  } catch (error) {
    console.error('获取分支列表失败:', error)
    return null
  }
}

/**
 * 切换分支
 */
export async function switchBranch(branchName: string): Promise<SwitchBranchResult> {
  if (isDevelopment()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true, message: `已切换到分支: ${branchName}（Mock）` }
  }

  try {
    const response = await window.pywebview.api.switch_branch(branchName)
    
    return {
      success: response.success,
      message: response.message,
    }
  } catch (error) {
    console.error('切换分支失败:', error)
    return {
      success: false,
      message: `切换分支失败: ${error}`,
    }
  }
}

/**
 * 切换插件版本
 */
export async function switchPluginVersion(
  pluginName: string,
  commitHash: string,
  commitDate?: string,
  behindCommits?: number,
  force?: boolean
): Promise<{ success: boolean; message: string; plugin?: PluginInfo; installed_deps?: DepInstallResult[]; failed_deps?: DepInstallResult[] }> {
  if (isDevelopment()) {
    return { success: true, message: `插件 ${pluginName} 已切换到 ${commitHash}（Mock）` }
  }

  try {
    const response = await window.pywebview.api.switch_plugin_version(
      pluginName,
      commitHash,
      commitDate,
      behindCommits,
      force
    )
    
    return {
      success: response.success,
      message: response.message,
      plugin: response.plugin,
      installed_deps: response.installed_deps,
      failed_deps: response.failed_deps,
    }
  } catch (error) {
    console.error('切换插件版本失败:', error)
    return {
      success: false,
      message: `切换版本失败: ${error}`,
    }
  }
}
