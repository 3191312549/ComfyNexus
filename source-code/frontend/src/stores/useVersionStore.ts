/**
 * 版本管理状态管理 Store
 */

import { create } from 'zustand'
import {
  VersionInfo,
  RemoteInfo,
  BranchesData,
  SwitchProgress,
  // VersionListResponse, // 暂未使用
} from '@/types/version'
import * as versionApi from '@/services/versionApi'
import { toast } from '@/utils/toast'
import { useEnvStore } from './useEnvStore'

interface VersionStore {
  // 状态
  versions: {
    stable: VersionInfo[]
    dev: VersionInfo[]
  }
  currentVersion: VersionInfo | null
  remoteInfo: RemoteInfo | null
  branches: BranchesData | null
  loading: boolean
  error: string | null
  initialized: boolean
  
  // Git 所有权错误状态
  gitOwnershipError: boolean
  isFixing: boolean
  
  // 后台更新状态
  isBackgroundUpdating: {
    stable: boolean
    dev: boolean
  }
  
  // 分页状态
  pagination: {
    stable: { page: number; hasMore: boolean; loading: boolean; totalCached?: number }
    dev: { page: number; hasMore: boolean; loading: boolean; totalCached?: number }
  }
  
  // 缓存
  cache: {
    timestamp: number
    duration: number // 5分钟
  }
  
  // 版本切换卡片状态
  showSwitchCard: boolean
  switchProgress: SwitchProgress
  switchingVersion: VersionInfo | null
  
  // 操作
  fetchVersions: (type: 'stable' | 'dev', page?: number, forceRefresh?: boolean) => Promise<void>
  fetchCurrentVersion: () => Promise<void>
  fetchRemoteInfo: () => Promise<void>
  fetchBranches: () => Promise<void>
  switchVersion: (version: VersionInfo) => Promise<void>
  switchBranch: (branchName: string) => Promise<void>
  updateRemoteUrl: (url: string) => Promise<void>
  refreshVersions: () => Promise<void>
  loadMore: (type: 'stable' | 'dev') => Promise<void>
  reset: () => void
  
  // Git 所有权相关操作
  setGitOwnershipError: (error: boolean) => void
  fixGitOwnership: () => Promise<void>
  
  // 版本切换卡片操作
  openSwitchCard: (version: VersionInfo) => void
  closeSwitchCard: () => void
  executeSwitchVersion: (force?: boolean) => Promise<void>
}

const CACHE_DURATION = 5 * 60 * 1000 // 5分钟

// 初始进度状态
const initialProgress: SwitchProgress = {
  currentStep: 'idle',
  steps: {
    git: { status: 'pending', message: '等待中' },
    dependencyCheck: { status: 'pending', message: '等待中' },
    dependencyInstall: { status: 'pending', message: '等待中' },
    restart: { status: 'pending', message: '等待中' },
  },
  success: null,
  message: '',
}

export const useVersionStore = create<VersionStore>((set, get) => ({
  // 初始状态
  versions: {
    stable: [],
    dev: [],
  },
  currentVersion: null,
  remoteInfo: null,
  branches: null,
  loading: false,
  error: null,
  initialized: false,
  gitOwnershipError: false,
  isFixing: false,
  isBackgroundUpdating: {
    stable: false,
    dev: false,
  },
  
  pagination: {
    stable: { page: 1, hasMore: true, loading: false },
    dev: { page: 1, hasMore: true, loading: false },
  },
  
  cache: {
    timestamp: 0,
    duration: CACHE_DURATION,
  },
  
  // 版本切换卡片状态
  showSwitchCard: false,
  switchProgress: initialProgress,
  switchingVersion: null,
  
  // 设置所有权错误状态
  setGitOwnershipError: (error: boolean) => {
    set({ gitOwnershipError: error })
  },
  
  // 修复所有权问题
  fixGitOwnership: async () => {
    try {
      set({ isFixing: true })
      
      const result = await versionApi.fixGitOwnership()
      
      if (result.success) {
        set({ gitOwnershipError: false })
        toast.success('Git 权限问题已修复')
        
        // 重新获取版本信息
        await Promise.all([
          get().fetchVersions('stable', 1),
          get().fetchVersions('dev', 1),
          get().fetchCurrentVersion(),
          get().fetchRemoteInfo(),
        ])
      } else {
        toast.error(result.message || '修复失败')
      }
    } catch (error) {
      console.error('[useVersionStore] 修复 Git 权限失败:', error)
      toast.error('修复失败，请稍后重试')
    } finally {
      set({ isFixing: false })
    }
  },
  
  // 获取版本列表
  fetchVersions: async (type: 'stable' | 'dev', page = 1, forceRefresh = false) => {
    const state = get()
    
    // 检查内存缓存（5分钟内不重复请求），强制刷新时跳过
    const now = Date.now()
    if (
      !forceRefresh &&
      page === 1 &&
      state.versions[type].length > 0 &&
      now - state.cache.timestamp < state.cache.duration
    ) {
      console.log(`[useVersionStore] 使用内存缓存的 ${type} 版本列表`)
      return
    }
    
    // 不设置全局 loading，改为局部状态
    set({ error: null })
    
    try {
      const pageSize = 35 // 默认每页35个
      // 获取当前分支（仅对开发版有效）
      const branch = type === 'dev' && state.branches ? state.branches.currentBranch : undefined
      const response = await versionApi.getVersions({ type, page, pageSize, branch, forceRefresh })
      
      // 如果是从缓存返回且需要后台更新，先渲染缓存数据
      if (response.fromCache && response.needBackgroundUpdate) {
        console.log(`[useVersionStore] ${type} 缓存已过期，先渲染缓存数据，等待后台更新`)
        set((state) => ({
          versions: {
            ...state.versions,
            [type]: page === 1 ? response.versions : [...state.versions[type], ...response.versions],
          },
          pagination: {
            ...state.pagination,
            [type]: {
              page,
              hasMore: response.hasMore,
              loading: false,
            },
          },
          loading: false,
          error: null,
          gitOwnershipError: false,
          isBackgroundUpdating: {
            ...state.isBackgroundUpdating,
            [type]: true,
          },
        }))
        return
      }
      
      // 检查是否有错误类型
      if (response.errorType) {
        // 根据错误类型设置不同的状态
        switch (response.errorType) {
          case 'no_environment':
            set({
              versions: {
                ...get().versions,
                [type]: [],
              },
              pagination: {
                ...get().pagination,
                [type]: {
                  page: 1,
                  hasMore: false,
                  loading: false,
                },
              },
              loading: false,
              error: null,
              gitOwnershipError: false,
            })
            return
          
          case 'ownership':
            // Git 权限问题
            set({ 
              gitOwnershipError: true,
              loading: false,
              error: response.error || 'Git 权限问题',
            })
            break
            
          case 'no_tags':
            // 没有标签（稳定版）
            set({
              versions: {
                ...get().versions,
                [type]: [],
              },
              pagination: {
                ...get().pagination,
                [type]: {
                  page: 1,
                  hasMore: false,
                  loading: false,
                },
              },
              loading: false,
              error: '仓库中没有任何标签（稳定版本）。稳定版本需要通过 Git 标签来标记。',
              gitOwnershipError: false,
            })
            break
            
          case 'no_commits':
            // 没有提交（开发版）
            set({
              versions: {
                ...get().versions,
                [type]: [],
              },
              pagination: {
                ...get().pagination,
                [type]: {
                  page: 1,
                  hasMore: false,
                  loading: false,
                },
              },
              loading: false,
              error: response.error || '分支中没有任何提交',
              gitOwnershipError: false,
            })
            break
            
          case 'branch_not_found':
            // 远程分支不存在
            set({
              versions: {
                ...get().versions,
                [type]: [],
              },
              pagination: {
                ...get().pagination,
                [type]: {
                  page: 1,
                  hasMore: false,
                  loading: false,
                },
              },
              loading: false,
              error: response.error || '远程分支不存在。请检查分支名称或拉取最新的远程更新。',
              gitOwnershipError: false,
            })
            break
            
          case 'network':
            // 网络错误
            set({
              versions: {
                ...get().versions,
                [type]: page === 1 ? [] : get().versions[type],
              },
              pagination: {
                ...get().pagination,
                [type]: {
                  page,
                  hasMore: false,
                  loading: false,
                },
              },
              loading: false,
              error: '网络连接失败。请检查网络连接或远程仓库地址。',
              gitOwnershipError: false,
            })
            break
            
          default:
            // 未知错误
            set({
              versions: {
                ...get().versions,
                [type]: page === 1 ? [] : get().versions[type],
              },
              pagination: {
                ...get().pagination,
                [type]: {
                  page,
                  hasMore: false,
                  loading: false,
                },
              },
              loading: false,
              error: response.error || '获取版本列表失败',
              gitOwnershipError: false,
            })
        }
        return
      }
      
      // 成功获取版本列表
      set((state) => ({
        versions: {
          ...state.versions,
          [type]: page === 1 ? response.versions : [...state.versions[type], ...response.versions],
        },
        pagination: {
          ...state.pagination,
          [type]: {
            page,
            hasMore: response.hasMore,
            loading: false,
            totalCached: response.totalCached,
          },
        },
        loading: false,
        error: null,
        gitOwnershipError: false,
        isBackgroundUpdating: {
          ...state.isBackgroundUpdating,
          [type]: false,
        },
        cache: {
          ...state.cache,
          timestamp: page === 1 ? now : state.cache.timestamp,
        },
      }))
    } catch (error) {
      console.error(`[useVersionStore] 获取 ${type} 版本列表失败:`, error)
      set({ 
        loading: false, 
        error: '获取版本列表失败',
        gitOwnershipError: false,
      })
    }
  },
  
  // 获取当前版本
  fetchCurrentVersion: async () => {
    try {
      const currentVersion = await versionApi.getCurrentVersion()
      set({ currentVersion })
    } catch (error) {
      console.error('[useVersionStore] 获取当前版本失败:', error)
    }
  },
  
  // 获取远端信息
  fetchRemoteInfo: async () => {
    try {
      const remoteInfo = await versionApi.getRemoteInfo()
      set({ remoteInfo })
    } catch (error) {
      console.error('[useVersionStore] 获取远端信息失败:', error)
    }
  },
  
  // 获取分支列表
  fetchBranches: async () => {
    try {
      const branches = await versionApi.getBranches()
      set({ branches })
    } catch (error) {
      console.error('[useVersionStore] 获取分支列表失败:', error)
    }
  },
  
  // 切换版本（打开卡片）
  switchVersion: async (version: VersionInfo) => {
    // 打开切换卡片
    get().openSwitchCard(version)
  },
  
  // 打开切换卡片
  openSwitchCard: (version: VersionInfo) => {
    set({
      showSwitchCard: true,
      switchingVersion: version,
      switchProgress: initialProgress,
    })
  },
  
  // 关闭切换卡片
  closeSwitchCard: () => {
    set({
      showSwitchCard: false,
      switchingVersion: null,
      switchProgress: initialProgress,
    })
  },
  
  // 执行版本切换
  executeSwitchVersion: async (force = false) => {
    const { switchingVersion, currentVersion } = get()
    if (!switchingVersion) return
    
    console.log('[useVersionStore] 开始执行版本切换:', switchingVersion, 'force:', force)
    
    // 保存原始版本信息（用于回退）
    const originalVersion = currentVersion
    let originalCommit: string | null = null
    
    try {
      // 步骤 1: 检查进程状态
      console.log('[useVersionStore] 步骤 1: 检查进程状态')
      const processStatus = await versionApi.checkProcessStatus()
      console.log('[useVersionStore] 进程状态:', processStatus)
      
      if (processStatus.hasTask) {
        set({
          switchProgress: {
            ...get().switchProgress,
            currentStep: 'complete',
            success: false,
            message: '请等待当前任务完成',
          },
        })
        return
      }
      
      // 步骤 2: Git 切换
      console.log('[useVersionStore] 步骤 2: Git 切换')
      set({
        switchProgress: {
          ...get().switchProgress,
          currentStep: 'git',
          steps: {
            ...get().switchProgress.steps,
            git: { status: 'running', message: '正在切换版本...' },
          },
        },
      })
      
      const switchResult = await versionApi.switchVersion({
        versionId: switchingVersion.id,
        type: switchingVersion.type,
        force,
      })
      console.log('[useVersionStore] Git 切换结果:', switchResult)
      
      // 保存原始 commit（用于回退）
      if (switchResult.success && switchResult.originalCommit) {
        originalCommit = switchResult.originalCommit
        console.log('[useVersionStore] 保存原始版本:', originalCommit)
      }
      
      // 检查是否需要强制切换
      if (!switchResult.success && switchResult.requiresForce) {
        console.log('[useVersionStore] 检测到本地修改，需要强制切换')
        set({
          switchProgress: {
            ...get().switchProgress,
            currentStep: 'idle', // 回到初始状态，等待用户确认强制切换
            steps: {
              ...get().switchProgress.steps,
              git: { 
                status: 'error', 
                message: '检测到本地修改，需要强制切换' 
              },
            },
            success: null,
            message: switchResult.message,
            requiresForce: true, // 标记需要强制切换
          },
        })
        return
      }
      
      if (!switchResult.success) {
        set({
          switchProgress: {
            ...get().switchProgress,
            currentStep: 'complete',
            steps: {
              ...get().switchProgress.steps,
              git: { status: 'error', message: switchResult.message },
            },
            success: false,
            message: `Git 切换失败: ${switchResult.message}`,
          },
        })
        return
      }
      
      set({
        switchProgress: {
          ...get().switchProgress,
          steps: {
            ...get().switchProgress.steps,
            git: { 
              status: 'success', 
              message: switchResult.stashed 
                ? 'Git 切换成功（已暂存本地文件）' 
                : 'Git 切换成功'
            },
          },
          stashed: switchResult.stashed,
        },
      })
      
      // 步骤 3: 依赖检测
      console.log('[useVersionStore] 步骤 3: 依赖检测')
      set({
        switchProgress: {
          ...get().switchProgress,
          currentStep: 'dependency-check',
          steps: {
            ...get().switchProgress.steps,
            dependencyCheck: { status: 'running', message: '正在检测依赖...' },
          },
        },
      })
      
      const needUpdate = switchResult.needDependencyUpdate
      console.log('[useVersionStore] 是否需要更新依赖:', needUpdate)
      
      set({
        switchProgress: {
          ...get().switchProgress,
          steps: {
            ...get().switchProgress.steps,
            dependencyCheck: { 
              status: 'success', 
              message: needUpdate ? '检测到依赖变更' : '依赖无变更' 
            },
          },
        },
      })
      
      // 步骤 4: 依赖安装（如需要）
      if (needUpdate) {
        console.log('[useVersionStore] 步骤 4: 依赖安装')
        set({
          switchProgress: {
            ...get().switchProgress,
            currentStep: 'dependency-install',
            steps: {
              ...get().switchProgress.steps,
              dependencyInstall: { status: 'running', message: '正在安装依赖...' },
            },
          },
        })
        
        const updateResult = await versionApi.updateDependencies()
        console.log('[useVersionStore] 依赖安装结果:', updateResult)
        
        if (!updateResult.success) {
          // 依赖安装失败，尝试回退
          console.error('[useVersionStore] 依赖安装失败，开始回退')
          
          if (originalCommit) {
            console.log('[useVersionStore] 回退到原始版本:', originalCommit)
            const rollbackResult = await versionApi.rollbackVersion(originalCommit)
            
            if (rollbackResult.success) {
              console.log('[useVersionStore] 回退成功')
              set({
                switchProgress: {
                  ...get().switchProgress,
                  currentStep: 'complete',
                  steps: {
                    ...get().switchProgress.steps,
                    dependencyInstall: { status: 'error', message: '安装失败' },
                  },
                  success: false,
                  message: '版本已自动回退到切换前的状态。请查看安装日志了解详情，检查依赖配置后重试。',
                  logFile: updateResult.logFile,
                },
                currentVersion: originalVersion, // 恢复原始版本信息
              })
            } else {
              console.error('[useVersionStore] 回退失败:', rollbackResult.message)
              set({
                switchProgress: {
                  ...get().switchProgress,
                  currentStep: 'complete',
                  steps: {
                    ...get().switchProgress.steps,
                    dependencyInstall: { status: 'error', message: '安装失败' },
                  },
                  success: false,
                  message: '⚠️ 版本回退失败，系统可能处于不一致状态。请查看安装日志，并手动检查当前版本。',
                  logFile: updateResult.logFile,
                },
              })
            }
          } else {
            // 没有原始 commit 信息，无法回退
            console.warn('[useVersionStore] 无原始版本信息，无法回退')
            set({
              switchProgress: {
                ...get().switchProgress,
                currentStep: 'complete',
                steps: {
                  ...get().switchProgress.steps,
                  dependencyInstall: { status: 'error', message: '安装失败' },
                },
                success: false,
                message: '⚠️ 无法自动回退版本。请查看安装日志，并手动检查当前版本。',
                logFile: updateResult.logFile,
              },
            })
          }
          return
        }
        
        set({
          switchProgress: {
            ...get().switchProgress,
            steps: {
              ...get().switchProgress.steps,
              dependencyInstall: { status: 'success', message: '依赖安装成功' },
            },
            logFile: updateResult.logFile,
          },
        })
      } else {
        // 跳过依赖安装
        set({
          switchProgress: {
            ...get().switchProgress,
            currentStep: 'dependency-install',
            steps: {
              ...get().switchProgress.steps,
              dependencyInstall: { status: 'skipped', message: '无需安装依赖' },
            },
          },
        })
      }
      
      // 步骤 5: 进程重启（如需要）
      console.log('[useVersionStore] 步骤 5: 进程重启')
      if (processStatus.isRunning) {
        set({
          switchProgress: {
            ...get().switchProgress,
            currentStep: 'restart',
            steps: {
              ...get().switchProgress.steps,
              restart: { status: 'running', message: '正在重启进程...' },
            },
          },
        })
        
        const restartResult = await versionApi.restartProcess()
        console.log('[useVersionStore] 重启结果:', restartResult)
        
        if (!restartResult.success) {
          set({
            switchProgress: {
              ...get().switchProgress,
              currentStep: 'complete',
              steps: {
                ...get().switchProgress.steps,
                restart: { status: 'error', message: '重启失败' },
              },
              success: false,
              message: '版本切换成功，但进程重启失败，请手动重启',
            },
          })
          return
        }
        
        set({
          switchProgress: {
            ...get().switchProgress,
            steps: {
              ...get().switchProgress.steps,
              restart: { status: 'success', message: '进程重启成功' },
            },
          },
        })
      } else {
        // 跳过重启
        set({
          switchProgress: {
            ...get().switchProgress,
            currentStep: 'restart',
            steps: {
              ...get().switchProgress.steps,
              restart: { status: 'skipped', message: '进程未运行，无需重启' },
            },
          },
        })
      }
      
      // 完成
      set({
        switchProgress: {
          ...get().switchProgress,
          currentStep: 'complete',
          success: true,
          message: '版本切换成功',
        },
        currentVersion: switchingVersion,
      })
      
      // 刷新版本列表
      console.log('[useVersionStore] 刷新版本列表')
      get().refreshVersions()
      
      // 刷新环境信息（更新工作台引导页面的版本信息）
      console.log('[useVersionStore] 刷新环境信息')
      useEnvStore.getState().fetchEnvironments(true)
    } catch (error) {
      console.error('[useVersionStore] 版本切换失败:', error)
      
      // 尝试回退
      if (originalCommit) {
        console.log('[useVersionStore] 异常情况，尝试回退到:', originalCommit)
        try {
          const rollbackResult = await versionApi.rollbackVersion(originalCommit)
          if (rollbackResult.success) {
            console.log('[useVersionStore] 回退成功')
            set({
              switchProgress: {
                ...get().switchProgress,
                currentStep: 'complete',
                success: false,
                message: '版本切换过程中出现异常，已自动回退到切换前的状态。',
              },
              currentVersion: originalVersion,
            })
            return
          }
        } catch (rollbackError) {
          console.error('[useVersionStore] 回退失败:', rollbackError)
        }
      }
      
      set({
        switchProgress: {
          ...get().switchProgress,
          currentStep: 'complete',
          success: false,
          message: '版本切换失败。请检查网络连接和系统状态后重试。',
        },
      })
    }
  },
  
  // 切换分支
  switchBranch: async (branchName: string) => {
    set({ loading: true, error: null })
    
    try {
      const result = await versionApi.switchBranch(branchName)
      
      if (!result.success) {
        set({ loading: false, error: result.message })
        toast.error(result.message)
        return
      }
      
      toast.success('分支切换成功')
      
      // 刷新数据
      await Promise.all([
        get().fetchCurrentVersion(),
        get().fetchBranches(),
        get().refreshVersions(),
      ])
      
      // 刷新环境信息（更新工作台引导页面的版本信息）
      useEnvStore.getState().fetchEnvironments(true)
      
      set({ loading: false })
    } catch (error) {
      console.error('[useVersionStore] 切换分支失败:', error)
      set({ loading: false, error: '分支切换失败' })
      toast.error('分支切换失败')
    }
  },
  
  // 更新远端地址
  updateRemoteUrl: async (url: string) => {
    set({ loading: true, error: null })
    
    try {
      const result = await versionApi.updateRemoteUrl(url)
      
      if (!result.success) {
        set({ loading: false, error: result.message })
        return
      }
      
      // 更新远端信息
      await get().fetchRemoteInfo()
      
      // 刷新版本列表
      await get().refreshVersions()
      
      set({ loading: false })
    } catch (error) {
      console.error('[useVersionStore] 更新远端地址失败:', error)
      set({ loading: false, error: '更新远端地址失败' })
    }
  },
  
  // 刷新版本列表（强制刷新，忽略缓存）
  refreshVersions: async () => {
    set({
      cache: {
        timestamp: 0,
        duration: CACHE_DURATION,
      },
    })
    
    await Promise.all([
      get().fetchCurrentVersion(),
      get().fetchRemoteInfo(),
      get().fetchBranches(),
      get().fetchVersions('stable', 1, true),
      get().fetchVersions('dev', 1, true),
    ])
  },
  
  // 加载更多
  loadMore: async (type: 'stable' | 'dev') => {
    const state = get()
    const currentPage = state.pagination[type].page
    const hasMore = state.pagination[type].hasMore
    
    if (!hasMore || state.pagination[type].loading) {
      return
    }
    
    await get().fetchVersions(type, currentPage + 1)
  },
  
  // 重置状态
  reset: () => {
    set({
      versions: {
        stable: [],
        dev: [],
      },
      currentVersion: null,
      remoteInfo: null,
      branches: null,
      loading: false,
      error: null,
      initialized: false,
      pagination: {
        stable: { page: 1, hasMore: true, loading: false },
        dev: { page: 1, hasMore: true, loading: false },
      },
      cache: {
        timestamp: 0,
        duration: CACHE_DURATION,
      },
    })
  },
}))
