/**
 * 依赖管理状态管理 Store
 * 
 * 负责管理依赖管理模块的所有状态和操作
 */

import { create } from 'zustand'
import type {
  LogEntry,
  ExtendedEnvironmentInfo,
  MirrorSource,
  CudaVersionResponse,
  PytorchVersionsResponse,
  PackageSearchResponse,
  PackageVersionsResponse,
  InstalledVersionResponse,
  InstallResponse,
  OpenTerminalResponse,
  FileSelectResponse,
  DependencyNode,
  ConflictInfo
} from '@/types/dependency'
import { InstallMode } from '@/types/dependency'
import { useEnvStore } from './useEnvStore'
import { useAPIConfigStore } from './useAPIConfigStore'

/**
 * 依赖管理 Store 接口
 */
interface DependencyStore {
  // 状态
  currentEnvId: string | null
  logs: LogEntry[]
  isExecuting: boolean
  envInfo: ExtendedEnvironmentInfo | null
  
  // 核心安装
  cudaVersion: string  // 当前系统检测到的 CUDA 版本
  availableCudaVersions: string[]  // 可用的 CUDA 版本列表
  selectedCudaVersion: string  // 用户选择的 CUDA 版本
  pytorchVersions: string[]
  selectedPytorchVersion: string
  
  // 手动安装
  packageName: string
  packageVersions: string[]
  selectedVersion: string
  installedVersion: string | null  // 已安装的版本
  installMode: InstallMode
  
  // 清单安装
  requirementsFile: string | null
  selectedFileType: 'requirements' | 'whl' | null  // 选中的文件类型
  
  // AI 分析
  aiAnalysisOpen: boolean
  aiAnalysisContent: string
  aiAnalysisStreaming: boolean
  selectedApiConfigId: string | null  // 选中的 API 配置 ID
  
  // 镜像源
  mirrorSource: MirrorSource
  autoFallbackEnabled: boolean  // 是否启用自动降级
  
  // 依赖冲突分析
  dependencyTree: DependencyNode[] | null  // 依赖树数据
  conflicts: ConflictInfo[] | null  // 冲突信息列表
  analysisStatus: 'idle' | 'loading' | 'success' | 'error'  // 分析状态
  analysisError: string | null  // 分析错误信息
  lastAnalysisTime: number | null  // 最后分析时间戳
  
  // Actions
  setCurrentEnv: (envId: string) => void
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void
  clearLogs: () => void
  setMirrorSource: (source: MirrorSource) => void
  setAutoFallback: (enabled: boolean) => void
  setEnvInfo: (envInfo: ExtendedEnvironmentInfo | null) => void
  
  // 核心安装
  detectCudaVersion: () => Promise<void>
  setSelectedCudaVersion: (version: string) => void  // 设置用户选择的 CUDA 版本
  fetchPytorchVersions: (cudaVersion: string) => Promise<void>
  installPytorch: (version: string, cudaVersion: string) => Promise<void>
  
  // 手动安装
  searchPackage: (name: string) => Promise<void>
  fetchPackageVersions: (name: string) => Promise<void>
  installPackage: (name: string, version: string, mode: InstallMode) => Promise<void>
  uninstallPackage: (name: string) => Promise<void>
  
  // 清单安装
  selectRequirementsFile: () => Promise<void>
  installFromRequirements: (mode: 'dry-run' | 'install') => Promise<void>
  
  // 工具箱
  openTerminal: () => Promise<void>
  
  // 环境检测
  detectEnvironment: () => Promise<void>
  
  // AI 分析
  analyzeLogsWithAI: () => Promise<void>
  closeAIAnalysis: () => void
  setSelectedApiConfigId: (configId: string | null) => void
  
  // 依赖冲突分析
  setDependencyTree: (tree: DependencyNode[]) => void
  setConflicts: (conflicts: ConflictInfo[]) => void
  setAnalysisStatus: (status: 'idle' | 'loading' | 'success' | 'error') => void
  setAnalysisError: (error: string | null) => void
  clearAnalysisData: () => void
}

/**
 * 检查是否在开发环境
 */
const isDevelopment = (): boolean => {
  return !window.pywebview || !window.pywebview.api
}

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * 依赖管理 Store 实现
 */
export const useDependencyStore = create<DependencyStore>((set, get) => ({
  // 初始状态
  currentEnvId: null,
  logs: [],
  isExecuting: false,
  envInfo: null,
  
  // 核心安装
  cudaVersion: '',
  availableCudaVersions: [],
  selectedCudaVersion: '',
  pytorchVersions: [],
  selectedPytorchVersion: '',
  
  // 手动安装
  packageName: '',
  packageVersions: [],
  selectedVersion: '',
  installedVersion: null,  // 已安装的版本
  installMode: InstallMode.STANDARD,
  
  // 清单安装
  requirementsFile: null,
  selectedFileType: null,
  
  // AI 分析
  aiAnalysisOpen: false,
  aiAnalysisContent: '',
  aiAnalysisStreaming: false,
  selectedApiConfigId: null,  // 初始为 null，将在加载配置后设置为默认配置
  
  // 镜像源
  mirrorSource: 'auto',  // 默认使用自动模式
  autoFallbackEnabled: true,  // 默认启用自动降级
  
  // 依赖冲突分析
  dependencyTree: null,
  conflicts: null,
  analysisStatus: 'idle',
  analysisError: null,
  lastAnalysisTime: null,

  /**
   * 设置当前环境 ID
   */
  setCurrentEnv: (envId) => {
    console.log('[useDependencyStore] 设置当前环境:', envId)
    set({ currentEnvId: envId })
    
    // 环境切换时自动检测环境信息
    get().detectEnvironment()
  },
  
  /**
   * 添加日志条目
   */
  addLog: (log) => {
    const newLog: LogEntry = {
      id: generateId(),
      timestamp: Date.now(),
      ...log
    }
    
    set((state) => ({
      logs: [...state.logs, newLog]
    }))
    
    console.log(`[useDependencyStore] 添加日志 [${newLog.level}]:`, newLog.message)
  },
  
  /**
   * 清空日志
   */
  clearLogs: () => {
    console.log('[useDependencyStore] 清空日志')
    set({ logs: [] })
  },
  
  /**
   * 设置镜像源
   */
  setMirrorSource: (source) => {
    console.log('[useDependencyStore] 设置镜像源:', source)
    set({ mirrorSource: source })
    
    const sourceNames: Record<MirrorSource, string> = {
      auto: '自动',
      official: '官方源',
      tuna: '清华源',
      bfsu: '北外源',
      aliyun: '阿里源',
      tencent: '腾讯源'
    }
    
    get().addLog({
      level: 'info',
      message: `已切换到${sourceNames[source]}`,
      source: 'system'
    })
  },
  
  /**
   * 设置自动降级开关
   */
  setAutoFallback: (enabled) => {
    console.log('[useDependencyStore] 设置自动降级:', enabled)
    set({ autoFallbackEnabled: enabled })
  },
  
  /**
   * 设置环境信息
   */
  setEnvInfo: (envInfo) => {
    console.log('[useDependencyStore] 设置环境信息:', envInfo)
    set({ envInfo })
  },
  
  /**
   * 检测 CUDA 版本
   */
  detectCudaVersion: async () => {
    try {
      console.log('[useDependencyStore] 检测 CUDA 版本')
      
      get().addLog({
        level: 'info',
        message: '正在检测 CUDA 版本...',
        source: 'system'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const mockVersion = '12.1'
        const mockAvailableVersions = [
          '13.1', '13.0', '12.8', '12.6', '12.4', '12.1', '11.8', 'CPU'
        ]
        
        set({ 
          cudaVersion: mockVersion,
          availableCudaVersions: mockAvailableVersions,
          selectedCudaVersion: mockVersion  // 默认选中当前系统版本
        })
        
        get().addLog({
          level: 'success',
          message: `检测到 CUDA 版本: ${mockVersion} (Mock)`,
          source: 'system'
        })
        
        return
      }
      
      // 生产环境：调用后端 API
      const response: CudaVersionResponse = await window.pywebview.api.dependency_detect_cuda_version()
      
      if (!response.success) {
        throw new Error(response.error_message || '检测 CUDA 版本失败')
      }
      
      const version = response.cuda_version || 'CPU'
      const availableVersions = response.available_versions || []
      
      set({ 
        cudaVersion: version,
        availableCudaVersions: availableVersions,
        selectedCudaVersion: version  // 默认选中当前系统版本
      })
      
      get().addLog({
        level: 'success',
        message: `检测到 CUDA 版本: ${version}`,
        source: 'system'
      })
      
    } catch (error) {
      console.error('[useDependencyStore] 检测 CUDA 版本失败:', error)
      
      get().addLog({
        level: 'error',
        message: `检测 CUDA 版本失败: ${error}`,
        source: 'system'
      })
    }
  },
  
  /**
   * 设置用户选择的 CUDA 版本
   */
  setSelectedCudaVersion: (version) => {
    console.log('[useDependencyStore] 设置选中的 CUDA 版本:', version)
    set({ selectedCudaVersion: version })
    
    // 移除自动查询 PyTorch 版本的逻辑
    // 用户需要手动点击查询按钮
  },
  
  /**
   * 获取 PyTorch 版本列表
   */
  fetchPytorchVersions: async (cudaVersion) => {
    try {
      console.log('[useDependencyStore] 获取 PyTorch 版本列表:', cudaVersion)
      
      get().addLog({
        level: 'info',
        message: `正在查询 PyTorch 版本列表 (CUDA ${cudaVersion})...`,
        source: 'system'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const mockVersions = ['2.1.0', '2.0.1', '2.0.0', '1.13.1']
        set({ pytorchVersions: mockVersions })
        
        get().addLog({
          level: 'success',
          message: `找到 ${mockVersions.length} 个可用版本 (Mock)`,
          source: 'system'
        })
        
        return
      }
      
      // 生产环境：调用后端 API
      const response: PytorchVersionsResponse = await window.pywebview.api.dependency_fetch_pytorch_versions(cudaVersion)
      
      if (!response.success) {
        throw new Error(response.error_message || '获取 PyTorch 版本列表失败')
      }
      
      set({ pytorchVersions: response.versions })
      
      get().addLog({
        level: 'success',
        message: `找到 ${response.versions.length} 个可用版本`,
        source: 'system'
      })
      
    } catch (error) {
      console.error('[useDependencyStore] 获取 PyTorch 版本列表失败:', error)
      
      get().addLog({
        level: 'error',
        message: `获取 PyTorch 版本列表失败: ${error}`,
        source: 'system'
      })
    }
  },

  /**
   * 安装 PyTorch
   */
  installPytorch: async (version, cudaVersion) => {
    try {
      const envId = get().currentEnvId
      if (!envId) {
        throw new Error('未选择环境')
      }
      
      console.log('[useDependencyStore] 安装 PyTorch:', version, cudaVersion)
      
      set({ isExecuting: true })
      
      get().addLog({
        level: 'info',
        message: `开始安装 PyTorch ${version} (CUDA ${cudaVersion})...`,
        source: 'pip'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        get().addLog({
          level: 'success',
          message: `PyTorch ${version} 安装成功 (Mock)`,
          source: 'pip'
        })
        
        set({ isExecuting: false })
        return
      }
      
      // 生产环境：调用后端 API
      const mirrorSource = get().mirrorSource
      const response: InstallResponse = await window.pywebview.api.dependency_install_pytorch(
        version,
        cudaVersion,
        mirrorSource
      )
      
      if (!response.success) {
        throw new Error(response.error_message || '安装 PyTorch 失败')
      }
      
      // 注意：后端已经通过 _push_log 推送了成功消息和"日志已保存"的消息，这里不再重复添加
      
      set({ isExecuting: false })
      
    } catch (error) {
      console.error('[useDependencyStore] 安装 PyTorch 失败:', error)
      
      get().addLog({
        level: 'error',
        message: `安装 PyTorch 失败: ${error}`,
        source: 'pip'
      })
      
      set({ isExecuting: false })
    }
  },
  
  /**
   * 搜索包
   */
  searchPackage: async (name) => {
    try {
      console.log('[useDependencyStore] 搜索包:', name)
      
      set({ packageName: name, installedVersion: null, packageVersions: [], selectedVersion: '' })
      
      get().addLog({
        level: 'info',
        message: `正在搜索包: ${name}...`,
        source: 'system'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Mock 已安装版本
        set({ installedVersion: '1.2.3' })
        
        get().addLog({
          level: 'info',
          message: `当前已安装版本: 1.2.3`,
          source: 'system'
        })
        
        get().addLog({
          level: 'success',
          message: `找到包: ${name} (Mock)`,
          source: 'system'
        })
        
        // 自动获取版本列表
        await get().fetchPackageVersions(name)
        
        return
      }
      
      // 生产环境：先获取已安装版本
      const installedResponse: InstalledVersionResponse = await window.pywebview.api.dependency_get_installed_version(name)
      
      console.log('[useDependencyStore] 已安装版本查询结果:', installedResponse)
      
      if (installedResponse.success) {
        if (installedResponse.installed && installedResponse.version) {
          set({ installedVersion: installedResponse.version })
          get().addLog({
            level: 'info',
            message: `当前已安装版本: ${installedResponse.version}`,
            source: 'system'
          })
        } else {
          set({ installedVersion: null })
          get().addLog({
            level: 'info',
            message: `包 '${name}' 未安装`,
            source: 'system'
          })
        }
      } else {
        // 查询失败，也要记录日志
        set({ installedVersion: null })
        get().addLog({
          level: 'warning',
          message: `无法查询本地安装状态: ${installedResponse.error_message || '未知错误'}`,
          source: 'system'
        })
      }
      
      // 然后搜索包信息（验证包是否存在）
      const mirrorSource = get().mirrorSource
      const response: PackageSearchResponse = await window.pywebview.api.dependency_search_package(name, mirrorSource)
      
      if (!response.success) {
        // 检查是否是网络错误，如果是自动模式或启用了自动降级且当前是官方源，则尝试切换到镜像源
        if ((mirrorSource === 'auto' || (get().autoFallbackEnabled && mirrorSource === 'official')) && 
            (response.error_message?.includes('网络') || response.error_message?.includes('timeout') || response.error_message?.includes('连接'))) {
          
          get().addLog({
            level: 'warning',
            message: '当前源连接失败，自动切换到清华镜像源...',
            source: 'system'
          })
          
          const retryResponse: PackageSearchResponse = await window.pywebview.api.dependency_search_package(name, 'tuna')
          
          if (!retryResponse.success) {
            throw new Error(retryResponse.error_message || '搜索包失败')
          }
          
          get().addLog({
            level: 'success',
            message: `在 PyPI 找到包: ${retryResponse.package_info?.name}，最新版本: ${retryResponse.package_info?.latest_version} [使用清华源]`,
            source: 'system'
          })
          
          // 自动获取版本列表
          await get().fetchPackageVersions(name)
          
          return
        }
        
        throw new Error(response.error_message || '搜索包失败')
      }
      
      get().addLog({
        level: 'success',
        message: `在 PyPI 找到包: ${response.package_info?.name}，最新版本: ${response.package_info?.latest_version}`,
        source: 'system'
      })
      
      // 自动获取版本列表
      await get().fetchPackageVersions(name)
      
    } catch (error) {
      console.error('[useDependencyStore] 搜索包失败:', error)
      
      get().addLog({
        level: 'error',
        message: `搜索包失败: ${error}`,
        source: 'system'
      })
    }
  },
  
  /**
   * 获取包版本列表
   */
  fetchPackageVersions: async (name) => {
    try {
      console.log('[useDependencyStore] 获取包版本列表:', name)
      
      get().addLog({
        level: 'info',
        message: `正在查询 ${name} 的版本列表...`,
        source: 'system'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 600))
        
        const mockVersions = ['3.1.0', '3.0.5', '3.0.0', '2.9.1']
        set({ packageVersions: mockVersions })
        
        get().addLog({
          level: 'success',
          message: `找到 ${mockVersions.length} 个可用版本 (Mock)`,
          source: 'system'
        })
        
        return
      }
      
      // 生产环境：调用后端 API（带镜像源参数）
      const mirrorSource = get().mirrorSource
      const response: PackageVersionsResponse = await window.pywebview.api.dependency_fetch_package_versions(name, mirrorSource)
      
      if (!response.success) {
        if ((mirrorSource === 'auto' || (get().autoFallbackEnabled && mirrorSource === 'official')) && 
            (response.error_message?.includes('网络') || response.error_message?.includes('timeout') || response.error_message?.includes('连接'))) {
          
          get().addLog({
            level: 'warning',
            message: '当前源连接失败，自动切换到清华镜像源...',
            source: 'system'
          })
          
          const retryResponse: PackageVersionsResponse = await window.pywebview.api.dependency_fetch_package_versions(name, 'tuna')
          
          if (!retryResponse.success) {
            throw new Error(retryResponse.error_message || '获取版本列表失败')
          }
          
          set({ packageVersions: retryResponse.versions })
          
          get().addLog({
            level: 'success',
            message: `找到 ${retryResponse.versions.length} 个可用版本 [使用清华源]`,
            source: 'system'
          })
          
          return
        }
        
        throw new Error(response.error_message || '获取版本列表失败')
      }
      
      set({ packageVersions: response.versions })
      
      get().addLog({
        level: 'success',
        message: `找到 ${response.versions.length} 个可用版本`,
        source: 'system'
      })
      
    } catch (error) {
      console.error('[useDependencyStore] 获取包版本列表失败:', error)
      
      get().addLog({
        level: 'error',
        message: `获取版本列表失败: ${error}`,
        source: 'system'
      })
    }
  },

  /**
   * 安装包
   */
  installPackage: async (name, version, mode) => {
    try {
      const envId = get().currentEnvId
      if (!envId) {
        throw new Error('未选择环境')
      }
      
      console.log('[useDependencyStore] 安装包:', name, version, mode)
      
      set({ isExecuting: true })
      
      const modeText = mode === InstallMode.DRY_RUN ? '模拟安装' : '安装'
      get().addLog({
        level: 'info',
        message: `开始${modeText} ${name}==${version}...`,
        source: 'pip'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        get().addLog({
          level: 'success',
          message: `${name}==${version} ${modeText}成功 (Mock)`,
          source: 'pip'
        })
        
        set({ isExecuting: false })
        return
      }
      
      // 生产环境：调用后端 API
      // 获取当前镜像源
      const mirrorSource = get().mirrorSource
      
      const response: InstallResponse = await window.pywebview.api.dependency_install_package(
        name,
        version,
        mode === InstallMode.DRY_RUN ? 'dry-run' : 'install',
        mirrorSource
      )
      
      if (!response.success) {
        throw new Error(response.error_message || `${modeText}失败`)
      }
      
      get().addLog({
        level: 'success',
        message: `${name}==${version} ${modeText}成功`,
        source: 'pip'
      })
      
      // 注意：后端已经通过 _push_log 推送了"日志已保存"的消息，这里不再重复添加
      
      set({ isExecuting: false })
      
    } catch (error) {
      console.error('[useDependencyStore] 安装包失败:', error)
      
      get().addLog({
        level: 'error',
        message: `安装包失败: ${error}`,
        source: 'pip'
      })
      
      set({ isExecuting: false })
    }
  },
  
  /**
   * 卸载包
   */
  uninstallPackage: async (name) => {
    try {
      const envId = get().currentEnvId
      if (!envId) {
        throw new Error('未选择环境')
      }
      
      console.log('[useDependencyStore] 卸载包:', name)
      
      set({ isExecuting: true })
      
      get().addLog({
        level: 'info',
        message: `开始卸载 ${name}...`,
        source: 'pip'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        get().addLog({
          level: 'success',
          message: `${name} 卸载成功 (Mock)`,
          source: 'pip'
        })
        
        set({ isExecuting: false })
        return
      }
      
      // 生产环境：调用后端 API
      const response: InstallResponse = await window.pywebview.api.dependency_uninstall_package(name)
      
      if (!response.success) {
        throw new Error(response.error_message || '卸载失败')
      }
      
      get().addLog({
        level: 'success',
        message: `${name} 卸载成功`,
        source: 'pip'
      })
      
      get().addLog({
        level: 'info',
        message: `日志已保存到: ${response.log_file}`,
        source: 'system'
      })
      
      set({ isExecuting: false })
      
    } catch (error) {
      console.error('[useDependencyStore] 卸载包失败:', error)
      
      get().addLog({
        level: 'error',
        message: `卸载包失败: ${error}`,
        source: 'pip'
      })
      
      set({ isExecuting: false })
    }
  },
  
  /**
   * 选择 requirements.txt 或 .whl 文件
   */
  selectRequirementsFile: async () => {
    try {
      console.log('[useDependencyStore] 选择文件')
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const mockPath = 'C:/Projects/ComfyUI/requirements.txt'
        set({ requirementsFile: mockPath, selectedFileType: 'requirements' })
        
        return
      }
      
      // 生产环境：调用文件选择对话框
      const response: FileSelectResponse = await window.pywebview.api.dependency_select_file('all')
      
      if (!response.success) {
        return
      }
      
      set({ 
        requirementsFile: response.file_path || null,
        selectedFileType: response.file_type || null
      })
      
      // 如果是 requirements 文件，调用分析方法
      if (response.file_type === 'requirements' && response.file_path) {
        await window.pywebview.api.dependency_analyze_requirements_file(response.file_path)
      }
      
    } catch (error) {
      console.error('[useDependencyStore] 选择文件失败:', error)
    }
  },
  
  /**
   * 从 requirements.txt 安装或安装 whl 文件
   */
  installFromRequirements: async (mode) => {
    try {
      const envId = get().currentEnvId
      const filePath = get().requirementsFile
      const fileType = get().selectedFileType
      
      if (!envId) {
        throw new Error('未选择环境')
      }
      
      if (!filePath) {
        throw new Error('未选择文件')
      }
      
      console.log('[useDependencyStore] 批量安装:', filePath, mode, fileType)
      
      set({ isExecuting: true })
      
      // 如果是 whl 文件，直接调用 whl 安装接口
      if (fileType === 'whl') {
        const fileName = filePath.split(/[/\\]/).pop() || filePath
        get().addLog({
          level: 'info',
          message: `开始安装 ${fileName}...`,
          source: 'pip'
        })
        
        // 开发环境使用 Mock
        if (isDevelopment()) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          get().addLog({
            level: 'success',
            message: `${fileName} 安装成功 (Mock)`,
            source: 'pip'
          })
          
          set({ isExecuting: false })
          return
        }
        
        // 生产环境：调用后端 API
        const response: InstallResponse = await window.pywebview.api.dependency_install_whl(filePath)
        
        if (!response.success) {
          throw new Error(response.error_message || '安装失败')
        }
        
        // 注意：后端已经通过 _push_log 推送了日志，这里不再重复添加
        
        set({ isExecuting: false })
        return
      }
      
      // requirements.txt 文件安装
      const modeText = mode === 'dry-run' ? '模拟安装' : '安装'
      get().addLog({
        level: 'info',
        message: `开始从 ${filePath} ${modeText}依赖...`,
        source: 'pip'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 2500))
        
        get().addLog({
          level: 'success',
          message: `依赖${modeText}成功 (Mock)`,
          source: 'pip'
        })
        
        set({ isExecuting: false })
        return
      }
      
      // 生产环境：调用后端 API
      const mirrorSource = get().mirrorSource
      const response: InstallResponse = await window.pywebview.api.dependency_install_from_requirements(
        filePath,
        mode,
        mirrorSource
      )
      
      if (!response.success) {
        throw new Error(response.error_message || `${modeText}失败`)
      }
      
      // 注意：后端已经通过 _push_log 推送了日志，这里不再重复添加
      
      set({ isExecuting: false })
      
    } catch (error) {
      console.error('[useDependencyStore] 批量安装失败:', error)
      
      get().addLog({
        level: 'error',
        message: `安装失败: ${error}`,
        source: 'pip'
      })
      
      set({ isExecuting: false })
    }
  },

  /**
   * 打开终端
   */
  openTerminal: async () => {
    try {
      const envId = get().currentEnvId
      if (!envId) {
        throw new Error('未选择环境')
      }
      
      console.log('[useDependencyStore] 打开终端')
      
      get().addLog({
        level: 'info',
        message: '正在打开终端...',
        source: 'system'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        get().addLog({
          level: 'success',
          message: '终端已打开 (Mock)',
          source: 'system'
        })
        
        return
      }
      
      // 生产环境：调用后端 API
      const response: OpenTerminalResponse = await window.pywebview.api.dependency_open_terminal()
      
      if (!response.success) {
        throw new Error(response.error_message || '打开终端失败')
      }
      
      get().addLog({
        level: 'success',
        message: '终端已打开',
        source: 'system'
      })
      
    } catch (error) {
      console.error('[useDependencyStore] 打开终端失败:', error)
      
      get().addLog({
        level: 'error',
        message: `打开终端失败: ${error}`,
        source: 'system'
      })
    }
  },
  
  /**
   * 检测环境信息
   */
  detectEnvironment: async () => {
    try {
      const envId = get().currentEnvId
      if (!envId) {
        console.log('[useDependencyStore] 未选择环境，跳过检测')
        return
      }
      
      console.log('[useDependencyStore] 检测环境信息')
      
      get().addLog({
        level: 'info',
        message: '正在检测环境信息...',
        source: 'system'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockEnvInfo: ExtendedEnvironmentInfo = {
          pythonPath: 'C:/Projects/ComfyUI/python_embeded/python.exe',
          pythonVersion: '3.11.5',
          pipVersion: '23.2.1',
          isVenv: true,
          venvPath: 'C:/Projects/ComfyUI/python_embeded',
          windowsVersion: 'Windows 11 Pro',
          gpu: {
            model: 'NVIDIA GeForce RTX 4090',
            vram: '24 GB'
          },
          cpu: {
            model: 'Intel Core i9-13900K',
            ram: '64 GB'
          },
          python: {
            version: '3.11.5',
            path: 'C:/Projects/ComfyUI/python_embeded/python.exe'
          },
          cuda: {
            version: '12.1'
          },
          dependencies: {
            pytorch: '2.1.0',
            transformer: '4.35.0'
          }
        }
        
        set({ envInfo: mockEnvInfo })
        
        get().addLog({
          level: 'success',
          message: '环境信息检测完成 (Mock)',
          source: 'system'
        })
        
        return
      }
      
      // 生产环境：调用后端 API
      const response = await window.pywebview.api.dependency_detect_environment() as any
      
      if (!response.success || !response.env_info) {
        throw new Error(response.error_message || '检测环境信息失败')
      }
      
      // 转换字段名（后端使用下划线，前端使用驼峰）
      const envInfo: ExtendedEnvironmentInfo = {
        pythonPath: response.env_info.python_path || '',
        pythonVersion: response.env_info.python_version || '',
        pipVersion: response.env_info.pip_version || '',
        isVenv: response.env_info.is_venv || false,
        venvPath: response.env_info.venv_path || null,
        windowsVersion: response.env_info.windows_version,
        gpu: response.env_info.gpu,
        cpu: response.env_info.cpu,
        python: response.env_info.python,
        cuda: response.env_info.cuda,
        dependencies: {
          pytorch: response.env_info.dependencies?.pytorch || 'N/A',
          transformer: response.env_info.dependencies?.transformer || 'N/A',
          ...response.env_info.dependencies
        }
      }
      
      set({ envInfo })
      
      get().addLog({
        level: 'success',
        message: '环境信息检测完成',
        source: 'system'
      })
      
    } catch (error) {
      console.error('[useDependencyStore] 检测环境信息失败:', error)
      
      get().addLog({
        level: 'error',
        message: `检测环境信息失败: ${error}`,
        source: 'system'
      })
    }
  },
  
  /**
   * 使用 AI 分析日志
   */
  analyzeLogsWithAI: async () => {
    try {
      console.log('[useDependencyStore] 使用 AI 分析日志')
      
      const logs = get().logs
      if (logs.length === 0) {
        throw new Error('没有日志可供分析')
      }
      
      // 获取默认 API 配置
      const apiConfigStore = useAPIConfigStore.getState()
      
      console.log('[useDependencyStore] 当前配置列表长度:', apiConfigStore.configs.length)
      
      // 如果配置列表为空，先加载配置
      if (apiConfigStore.configs.length === 0) {
        console.log('[useDependencyStore] 配置列表为空，正在加载...')
        await apiConfigStore.loadConfigs()
        console.log('[useDependencyStore] 配置加载完成，配置数量:', apiConfigStore.configs.length)
      }
      
      // 重新获取最新的 store 状态（loadConfigs 可能更新了状态）
      const updatedApiConfigStore = useAPIConfigStore.getState()
      console.log('[useDependencyStore] 更新后的配置列表:', updatedApiConfigStore.configs.map(c => ({ id: c.id, alias: c.alias, isDefault: c.isDefault })))
      
      // 获取选中的配置 ID，如果没有选中则使用默认配置
      const selectedConfigId = get().selectedApiConfigId
      let configIdToUse: string | null = null
      
      if (selectedConfigId) {
        // 验证选中的配置是否存在
        const selectedConfig = updatedApiConfigStore.configs.find(c => c.id === selectedConfigId)
        if (selectedConfig) {
          configIdToUse = selectedConfigId
          console.log('[useDependencyStore] 使用选中的配置:', selectedConfig.alias, '(ID:', selectedConfigId, ')')
        } else {
          console.warn('[useDependencyStore] 选中的配置不存在:', selectedConfigId)
        }
      }
      
      // 如果没有选中配置或选中的配置不存在，使用默认配置
      if (!configIdToUse) {
        const defaultConfig = updatedApiConfigStore.configs.find(c => c.isDefault)
        
        if (!defaultConfig) {
          console.error('[useDependencyStore] 未找到默认配置')
          console.error('[useDependencyStore] 所有配置:', updatedApiConfigStore.configs)
          throw new Error('未配置默认 AI API，请先在 AI 助手中配置')
        }
        
        configIdToUse = defaultConfig.id
        console.log('[useDependencyStore] 使用默认配置:', defaultConfig.alias, '(ID:', defaultConfig.id, ')')
        
        // 更新选中的配置 ID 为默认配置
        set({ selectedApiConfigId: defaultConfig.id })
      }
      
      // 打开 AI 分析对话框
      set({
        aiAnalysisOpen: true,
        aiAnalysisContent: '',
        aiAnalysisStreaming: true
      })
      
      get().addLog({
        level: 'info',
        message: '正在使用 AI 分析日志...',
        source: 'system'
      })
      
      // 开发环境使用 Mock
      if (isDevelopment()) {
        // 模拟流式输出
        const mockResponse = '根据日志分析，您遇到的问题可能是由于网络连接超时导致的。建议：\n\n1. 检查网络连接\n2. 尝试使用镜像源\n3. 增加超时时间'
        
        for (let i = 0; i < mockResponse.length; i += 5) {
          await new Promise(resolve => setTimeout(resolve, 50))
          const chunk = mockResponse.slice(0, i + 5)
          set({ aiAnalysisContent: chunk })
        }
        
        set({ aiAnalysisStreaming: false })
        
        get().addLog({
          level: 'success',
          message: 'AI 分析完成 (Mock)',
          source: 'system'
        })
        
        return
      }
      
      // 生产环境：调用后端 API（流式）
      console.log('[useDependencyStore] 调用后端 API: dependency_analyze_logs_with_ai')
      
      // 将日志转换为字符串
      const logsText = logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n')
      
      // 设置流式响应监听器
      const handleChunk = (event: CustomEvent) => {
        const { chunk, done } = event.detail
        
        if (done) {
          console.log('[useDependencyStore] AI 分析完成')
          set({ aiAnalysisStreaming: false })
          
          get().addLog({
            level: 'success',
            message: 'AI 分析完成',
            source: 'system'
          })
        } else {
          // 追加 chunk 到内容
          const currentContent = get().aiAnalysisContent
          set({ aiAnalysisContent: currentContent + chunk })
        }
      }
      
      // 添加事件监听器
      window.addEventListener('dependency_ai_analysis_chunk', handleChunk as EventListener)
      
      try {
        // 调用后端 API
        const response = await window.pywebview.api.dependency_analyze_logs_with_ai(
          logsText,
          configIdToUse  // 使用选中的配置 ID
        )
        
        if (!response.success) {
          throw new Error(response.error_message || 'AI 分析失败')
        }
        
        console.log('[useDependencyStore] AI 分析已启动，话题 ID:', response.topic_id)
        
      } finally {
        // 移除事件监听器
        window.removeEventListener('dependency_ai_analysis_chunk', handleChunk as EventListener)
      }
      
    } catch (error) {
      console.error('[useDependencyStore] AI 分析失败:', error)
      
      get().addLog({
        level: 'error',
        message: `AI 分析失败: ${error}`,
        source: 'system'
      })
      
      set({
        aiAnalysisOpen: false,
        aiAnalysisStreaming: false
      })
    }
  },
  
  /**
   * 设置选中的 API 配置 ID
   */
  setSelectedApiConfigId: (configId) => {
    console.log('[useDependencyStore] 设置选中的 API 配置:', configId)
    set({ selectedApiConfigId: configId })
  },
  
  /**
   * 关闭 AI 分析对话框
   */
  closeAIAnalysis: () => {
    console.log('[useDependencyStore] 关闭 AI 分析对话框')
    set({
      aiAnalysisOpen: false,
      aiAnalysisContent: '',
      aiAnalysisStreaming: false
    })
  },
  
  /**
   * 设置依赖树数据
   */
  setDependencyTree: (tree) => {
    console.log('[useDependencyStore] 设置依赖树数据，节点数量:', tree.length)
    set({ 
      dependencyTree: tree,
      lastAnalysisTime: Date.now()
    })
  },
  
  /**
   * 设置冲突信息列表
   */
  setConflicts: (conflicts) => {
    console.log('[useDependencyStore] 设置冲突信息，冲突数量:', conflicts.length)
    set({ conflicts })
  },
  
  /**
   * 设置分析状态
   */
  setAnalysisStatus: (status) => {
    console.log('[useDependencyStore] 设置分析状态:', status)
    set({ analysisStatus: status })
  },
  
  /**
   * 设置分析错误信息
   */
  setAnalysisError: (error) => {
    console.log('[useDependencyStore] 设置分析错误:', error)
    set({ analysisError: error })
  },
  
  /**
   * 清空分析数据
   */
  clearAnalysisData: () => {
    console.log('[useDependencyStore] 清空分析数据')
    set({
      dependencyTree: null,
      conflicts: null,
      analysisStatus: 'idle',
      analysisError: null,
      lastAnalysisTime: null
    })
  }
}))

// 监听环境切换
useEnvStore.subscribe((state) => {
  const currentEnvId = state.currentEnvId
  const dependencyStore = useDependencyStore.getState()
  
  // 如果环境 ID 发生变化，更新依赖管理 Store
  if (currentEnvId && currentEnvId !== dependencyStore.currentEnvId) {
    console.log('[useDependencyStore] 检测到环境切换:', currentEnvId)
    dependencyStore.setCurrentEnv(currentEnvId)
    
    // 环境切换时，清空冲突分析数据，触发重新分析
    // 注意：实际的重新分析会在 ConflictAnalysisTab 组件中通过监听 currentEnvId 变化来触发
    if (dependencyStore.dependencyTree || dependencyStore.conflicts) {
      console.log('[useDependencyStore] 环境切换，清空冲突分析数据')
      dependencyStore.clearAnalysisData()
    }
  }
})
