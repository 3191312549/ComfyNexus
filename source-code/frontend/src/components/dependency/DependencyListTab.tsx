/**
 * 依赖列表选项卡
 * 
 * 显示和管理 ComfyUI 核心及插件的依赖包
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import PluginSidebar, { type Plugin } from './PluginSidebar'
import { SearchBar, ConfirmDialog, ProgressDialog, type SearchType, type InstallationReport } from '@/components/common'
import OperationButtons from './OperationButtons'
import DependencyTable from './DependencyTable'
import type { Dependency } from '@/types/dependency'
import { DependencyStatus } from '@/types/dependency'
import { useToast } from '@/hooks/useToast'
import { useEnvStore } from '@/stores/useEnvStore'
import { Button } from '@/components/ui/Button'

// 依赖安装响应类型
interface DependencyInstallResponse {
  success: boolean
  error?: string
  error_message?: string
  log_file?: string
  logFile?: string
}

// 依赖卸载响应类型
interface DependencyUninstallResponse {
  success: boolean
  log_file?: string
  error_message?: string
}

export default function DependencyListTab() {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const currentEnvId = useEnvStore((state) => state.currentEnvId)

  // 状态管理
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>('all')
  const [searchType, setSearchType] = useState<SearchType>('package')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOnlyUninstalled, setShowOnlyUninstalled] = useState(false)

  // 对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    variant: 'default' | 'destructive'
    requireTextConfirm: boolean
    confirmKeyword?: string
    onConfirm: () => void
    details?: any
  }>({
    open: false,
    title: '',
    description: '',
    variant: 'default',
    requireTextConfirm: false,
    onConfirm: () => {}
  })

  const [progressDialog, setProgressDialog] = useState<{
    open: boolean
    title: string
    progress: number
    message: string
    isComplete: boolean
    report?: InstallationReport
  }>({
    open: false,
    title: '',
    progress: 0,
    message: '',
    isComplete: false
  })

  // 初始化：加载插件列表和依赖
  useEffect(() => {
    loadPluginsAndDependencies()
  }, [])

  // 监听环境切换，自动刷新数据
  useEffect(() => {
    if (currentEnvId) {
      console.log('[DependencyListTab] 环境切换，重新加载数据:', currentEnvId)
      loadPluginsAndDependencies()
    }
  }, [currentEnvId])

  // 加载插件和依赖数据
  const loadPluginsAndDependencies = async () => {
    setLoading(true)
    try {
      // 调用后端 API 获取插件列表
      const pluginsResponse = await window.pywebview.api.dependency_get_plugins()
      
      if (!pluginsResponse.success || !pluginsResponse.data) {
        throw new Error(pluginsResponse.error_message || '获取插件列表失败')
      }
      
      // 转换插件数据格式
      const pluginsList: Plugin[] = pluginsResponse.data.map((p: any) => ({
        name: p.name,
        path: p.path,
        hasRequirements: p.has_requirements || false,
        dependencyCount: p.dependency_count || 0
      }))
      
      setPlugins(pluginsList)
      
      // 使用 scan_dependencies API 获取所有依赖（核心 + 插件）
      const allDeps: Dependency[] = []
      
      try {
        const scanResponse = await window.pywebview.api.dependency_scan_dependencies()
        
        if (scanResponse.success && scanResponse.data) {
          const { core, plugins } = scanResponse.data
          
          // 处理核心依赖
          if (core && Array.isArray(core)) {
            const coreDeps = core.map((dep: any, index: number) => ({
              id: `core-${index}`,
              packageName: dep.package_name,
              versionSpec: dep.version_spec || '',
              source: 'core',
              sourceFile: dep.source_file || '',
              installed: false,
              installedVersion: null,
              versionMatch: false,
              status: DependencyStatus.NOT_INSTALLED
            }))
            allDeps.push(...coreDeps)
          }
          
          // 处理插件依赖
          if (plugins && typeof plugins === 'object') {
            Object.entries(plugins).forEach(([pluginName, deps]: [string, any]) => {
              if (Array.isArray(deps)) {
                const pluginDeps = deps.map((dep: any, index: number) => ({
                  id: `${pluginName}-${index}`,
                  packageName: dep.package_name,
                  versionSpec: dep.version_spec || '',
                  source: pluginName,
                  sourceFile: dep.source_file || '',
                  installed: false,
                  installedVersion: null,
                  versionMatch: false,
                  status: DependencyStatus.NOT_INSTALLED
                }))
                allDeps.push(...pluginDeps)
              }
            })
          }
          
          // 批量检查安装状态
          if (allDeps.length > 0) {
            const packageNames = allDeps.map(dep => dep.packageName)
            const statusResponse = await window.pywebview.api.dependency_check_all_status(packageNames)
            
            if (statusResponse.success && statusResponse.data) {
              // 更新依赖的安装状态
              allDeps.forEach(dep => {
                const status = statusResponse.data?.[dep.packageName]
                if (status) {
                  dep.installed = status.installed
                  dep.installedVersion = status.version
                  
                  // 判断版本是否匹配
                  if (status.installed && status.version && dep.versionSpec) {
                    // 简单的版本匹配检查（可以后续优化）
                    dep.versionMatch = true // 暂时标记为匹配，后续可以添加更精确的版本比较
                    dep.status = DependencyStatus.INSTALLED
                  } else if (status.installed) {
                    dep.status = DependencyStatus.INSTALLED
                    dep.versionMatch = true
                  } else {
                    dep.status = DependencyStatus.NOT_INSTALLED
                  }
                }
              })
            }
          }
        }
      } catch (error) {
        console.error('扫描依赖失败:', error)
      }
      
      setDependencies(allDeps)
    } catch (err) {
      console.error('加载数据失败:', err)
      error('无法加载插件和依赖数据', '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 计算依赖数量
  const dependencyCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: dependencies.length,
      core: dependencies.filter(d => d.source === 'core').length
    }
    
    plugins.forEach(plugin => {
      counts[plugin.name] = dependencies.filter(d => d.source === plugin.name).length
    })
    
    return counts
  }, [dependencies, plugins])

  // 过滤依赖列表
  const filteredDependencies = useMemo(() => {
    let filtered = dependencies

    // 按插件过滤
    if (selectedPlugin && selectedPlugin !== 'all') {
      filtered = filtered.filter(d => d.source === selectedPlugin)
    }

    // 按安装状态过滤
    if (showOnlyUninstalled) {
      filtered = filtered.filter(d => !d.installed)
    }

    // 按搜索关键词过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (searchType === 'package') {
        filtered = filtered.filter(d => d.packageName.toLowerCase().includes(query))
      } else {
        filtered = filtered.filter(d => d.source.toLowerCase().includes(query))
      }
    }

    return filtered
  }, [dependencies, selectedPlugin, searchQuery, searchType, showOnlyUninstalled])

  // 处理安装单个依赖
  const handleInstall = useCallback((dependency: Dependency) => {
    setConfirmDialog({
      open: true,
      title: t('dependency.confirmInstall'),
      description: t('dependency.confirmInstallDesc'),
      variant: 'default',
      requireTextConfirm: false,
      details: {
        packageName: dependency.packageName,
        version: dependency.versionSpec,
        source: dependency.source
      },
      onConfirm: async () => {
        try {
          setProgressDialog({
            open: true,
            title: t('dependency.installingDependency'),
            progress: 50,
            message: t('dependency.installingPackage', { package: dependency.packageName }),
            isComplete: false
          })
          
          // 调用后端 API 安装依赖
          const result: DependencyInstallResponse = await window.pywebview.api.install_dependency(
            dependency.source,
            dependency.packageName,
            dependency.versionSpec
          )
          
          if (result.success) {
            setProgressDialog({
              open: true,
              title: t('dependency.installComplete'),
              progress: 100,
              message: t('dependency.installComplete'),
              isComplete: true,
              report: {
                total: 1,
                succeeded: 1,
                failed: 0,
                details: [{
                  package: dependency.packageName,
                  success: true,
                  error: null,
                  logFile: result.logFile || result.log_file
                }]
              }
            })
            
            // 刷新依赖状态
            await loadPluginsAndDependencies()
          } else {
            setProgressDialog({
              open: true,
              title: t('common.error'),
              progress: 100,
              message: t('common.error'),
              isComplete: true,
              report: {
                total: 1,
                succeeded: 0,
                failed: 1,
                details: [{
                  package: dependency.packageName,
                  success: false,
                  error: result.error || result.error_message || t('common.error'),
                  logFile: result.logFile || result.log_file
                }]
              }
            })
            
            // 刷新依赖状态
            await loadPluginsAndDependencies()
          }
        } catch (err: any) {
          setProgressDialog({
            open: true,
            title: t('common.error'),
            progress: 100,
            message: t('common.error'),
            isComplete: true,
            report: {
              total: 1,
              succeeded: 0,
              failed: 1,
              details: [{
                package: dependency.packageName,
                success: false,
                error: err.message || t('common.error'),
                logFile: undefined
              }]
            }
          })
        }
      }
    })
  }, [success, error])

  // 处理卸载单个依赖
  const handleUninstall = useCallback((dependency: Dependency) => {
    setConfirmDialog({
      open: true,
      title: '确认卸载',
      description: '确定要卸载此依赖包吗？卸载后可能影响相关功能。',
      variant: 'destructive',
      requireTextConfirm: false,
      details: {
        packageName: dependency.packageName,
        version: dependency.installedVersion,
        source: dependency.source
      },
      onConfirm: async () => {
        try {
          // 显示进度指示器
          setProgressDialog({
            open: true,
            title: '正在卸载依赖',
            progress: 50,
            message: `正在卸载 ${dependency.packageName}...`,
            isComplete: false
          })
          
          // 调用后端 API 卸载依赖
          const result: DependencyUninstallResponse = await window.pywebview.api.dependency_uninstall_package(
            dependency.packageName
          )
          
          if (result.success) {
            setProgressDialog({
              open: true,
              title: '卸载完成',
              progress: 100,
              message: '卸载成功',
              isComplete: true,
              report: {
                total: 1,
                succeeded: 1,
                failed: 0,
                details: [{
                  package: dependency.packageName,
                  success: true,
                  error: null,
                  logFile: result.log_file
                }]
              }
            })
            
            // 刷新依赖状态
            await loadPluginsAndDependencies()
          } else {
            // 卸载失败，显示错误信息
            setProgressDialog({
              open: true,
              title: '卸载失败',
              progress: 100,
              message: '卸载失败',
              isComplete: true,
              report: {
                total: 1,
                succeeded: 0,
                failed: 1,
                details: [{
                  package: dependency.packageName,
                  success: false,
                  error: result.error_message || '卸载失败',
                  logFile: result.log_file
                }]
              }
            })
            
            // 刷新依赖状态
            await loadPluginsAndDependencies()
          }
        } catch (err: any) {
          setProgressDialog({
            open: true,
            title: t('common.error'),
            progress: 100,
            message: t('common.error'),
            isComplete: true,
            report: {
              total: 1,
              succeeded: 0,
              failed: 1,
              details: [{
                package: dependency.packageName,
                success: false,
                error: err.message || t('common.error'),
                logFile: undefined
              }]
            }
          })
        }
      }
    })
  }, [success, error])

  // 处理批量安装
  const handleBatchInstall = useCallback(async () => {
    if (!selectedPlugin) return

    const isAllInstall = selectedPlugin === 'all'
    const isCoreInstall = selectedPlugin === 'core'

    setConfirmDialog({
      open: true,
      title: isAllInstall ? '重装全部依赖' : isCoreInstall ? '安装核心依赖' : `安装 ${selectedPlugin} 依赖`,
      description: isAllInstall 
        ? `此操作将重新安装所有依赖包（ComfyUI 核心 + 所有插件），可能导致以下问题：

• 依赖版本冲突，导致 ComfyUI 无法启动
• 破坏现有的稳定环境配置
• 安装过程耗时较长（可能需要 10-30 分钟）

⚠️ 仅在以下情况下执行此操作：
• 环境已损坏，ComfyUI 完全无法启动
• 需要彻底清理并重建依赖环境
• 按照官方文档要求进行环境修复

如果只是某个插件有问题，建议单独重装该插件的依赖。`
        : isCoreInstall
        ? '将安装 ComfyUI 核心的所有依赖包。这是一个相对安全的操作，通常用于修复核心功能问题。'
        : `将安装 ${selectedPlugin} 插件的所有依赖包。`,
      variant: isAllInstall ? 'destructive' : 'default',
      requireTextConfirm: isAllInstall,
      confirmKeyword: '确认',
      onConfirm: async () => {
        setProgressDialog({
          open: true,
          title: '正在安装依赖',
          progress: 0,
          message: '准备安装...',
          isComplete: false
        })

        try {
          let totalPackages = 0
          let succeededCount = 0
          let failedCount = 0
          const details: Array<{ package: string; success: boolean; error: string | null; logFile?: string }> = []

          if (isAllInstall) {
            // 安装全部依赖：先安装核心，再安装所有插件
            // 获取所有未安装的依赖
            const allUninstalledDeps = dependencies.filter(d => !d.installed)
            totalPackages = allUninstalledDeps.length
            
            if (totalPackages === 0) {
              setProgressDialog({
                open: true,
                title: '安装完成',
                progress: 100,
                message: '所有依赖已安装',
                isComplete: true,
                report: {
                  total: 0,
                  succeeded: 0,
                  failed: 0,
                  details: []
                }
              })
              return
            }
            
            // 逐个安装
            for (let i = 0; i < allUninstalledDeps.length; i++) {
              const dep = allUninstalledDeps[i]
              const progress = 5 + ((i + 1) / allUninstalledDeps.length) * 90
              
              setProgressDialog(prev => ({
                ...prev,
                progress,
                message: `正在安装 ${dep.packageName} (${i + 1}/${totalPackages})...`
              }))
              
              try {
                const result: DependencyInstallResponse = await window.pywebview.api.install_dependency(
                  dep.source,
                  dep.packageName,
                  dep.versionSpec
                )
                
                // 调试日志
                console.log('[批量安装] 安装结果:', dep.packageName, result)
                
                if (result.success) {
                  succeededCount++
                  details.push({
                    package: dep.packageName,
                    success: true,
                    error: null,
                    logFile: result.logFile || result.log_file
                  })
                } else {
                  failedCount++
                  details.push({
                    package: dep.packageName,
                    success: false,
                    error: result.error || result.error_message || '安装失败',
                    logFile: result.logFile || result.log_file
                  })
                }
              } catch (err: any) {
                failedCount++
                details.push({
                  package: dep.packageName,
                  success: false,
                  error: err.message || '安装失败',
                  logFile: undefined
                })
              }
            }
          } else if (isCoreInstall) {
            // 安装核心依赖
            const coreDeps = dependencies.filter(d => d.source === 'core' && !d.installed)
            totalPackages = coreDeps.length
            
            if (totalPackages === 0) {
              setProgressDialog({
                open: true,
                title: '安装完成',
                progress: 100,
                message: '核心依赖已全部安装',
                isComplete: true,
                report: {
                  total: 0,
                  succeeded: 0,
                  failed: 0,
                  details: []
                }
              })
              return
            }
            
            for (let i = 0; i < coreDeps.length; i++) {
              const dep = coreDeps[i]
              const progress = 10 + ((i + 1) / coreDeps.length) * 80
              
              setProgressDialog(prev => ({
                ...prev,
                progress,
                message: `正在安装 ${dep.packageName} (${i + 1}/${totalPackages})...`
              }))
              
              try {
                const result: DependencyInstallResponse = await window.pywebview.api.install_dependency(
                  'core',
                  dep.packageName,
                  dep.versionSpec
                )
                
                if (result.success) {
                  succeededCount++
                  details.push({
                    package: dep.packageName,
                    success: true,
                    error: null,
                    logFile: result.logFile || result.log_file
                  })
                } else {
                  failedCount++
                  details.push({
                    package: dep.packageName,
                    success: false,
                    error: result.error || result.error_message || '安装失败',
                    logFile: result.logFile || result.log_file
                  })
                }
              } catch (err: any) {
                failedCount++
                details.push({
                  package: dep.packageName,
                  success: false,
                  error: err.message || '安装失败',
                  logFile: undefined
                })
              }
            }
          } else {
            // 安装单个插件的依赖
            setProgressDialog(prev => ({
              ...prev,
              progress: 50,
              message: `正在安装 ${selectedPlugin} 的依赖...`
            }))
            
            // 获取该插件的所有依赖
            const pluginDeps = dependencies.filter(d => d.source === selectedPlugin && !d.installed)
            totalPackages = pluginDeps.length
            
            for (let i = 0; i < pluginDeps.length; i++) {
              const dep = pluginDeps[i]
              const progress = 10 + ((i + 1) / pluginDeps.length) * 80
              
              setProgressDialog(prev => ({
                ...prev,
                progress,
                message: `正在安装 ${dep.packageName}...`
              }))
              
              try {
                const result: DependencyInstallResponse = await window.pywebview.api.install_dependency(
                  selectedPlugin,
                  dep.packageName,
                  dep.versionSpec
                )
                
                if (result.success) {
                  succeededCount++
                  details.push({
                    package: dep.packageName,
                    success: true,
                    error: null,
                    logFile: result.logFile || result.log_file
                  })
                } else {
                  failedCount++
                  details.push({
                    package: dep.packageName,
                    success: false,
                    error: result.error || result.error_message || '安装失败',
                    logFile: result.logFile || result.log_file
                  })
                }
              } catch (err: any) {
                failedCount++
                details.push({
                  package: dep.packageName,
                  success: false,
                  error: err.message || '安装失败',
                  logFile: undefined
                })
              }
            }
          }

          // 显示完成摘要
          setProgressDialog({
            open: true,
            title: '安装完成',
            progress: 100,
            message: '安装完成',
            isComplete: true,
            report: {
              total: totalPackages,
              succeeded: succeededCount,
              failed: failedCount,
              details
            }
          })

          // 刷新依赖状态
          await loadPluginsAndDependencies()
        } catch (_err) {
          error('批量安装过程中发生错误', '安装失败')
          setProgressDialog(prev => ({ ...prev, open: false }))
        }
      }
    })
  }, [selectedPlugin, plugins, dependencies, success, error])

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* 左侧插件列表 */}
      <PluginSidebar
        plugins={plugins}
        selectedPlugin={selectedPlugin}
        onSelect={setSelectedPlugin}
        dependencyCounts={dependencyCounts}
        loading={loading}
      />

      {/* 右侧内容区域 */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
        {/* 顶部操作栏 */}
        <div className="flex shrink-0 items-center justify-between gap-4">
          <SearchBar
            searchType={searchType}
            searchQuery={searchQuery}
            onSearchTypeChange={setSearchType}
            onSearchQueryChange={setSearchQuery}
            disabled={loading}
          />
          <div className="flex items-center gap-2">
            <Button
              variant={showOnlyUninstalled ? 'default' : 'outline'}
              size="default"
              onClick={() => setShowOnlyUninstalled(!showOnlyUninstalled)}
              disabled={loading}
              className="min-w-[120px]"
            >
              {showOnlyUninstalled ? '显示全部' : '仅未安装'}
            </Button>
            <OperationButtons
              selectedPlugin={selectedPlugin}
              onBatchInstall={handleBatchInstall}
              disabled={loading}
            />
          </div>
        </div>

        {/* 依赖表格 - 使用固定高度确保滚动 */}
        <div className="h-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface">
          <DependencyTable
            dependencies={filteredDependencies}
            loading={loading}
            onInstall={handleInstall}
            onUninstall={handleUninstall}
          />
        </div>
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        requireTextConfirm={confirmDialog.requireTextConfirm}
        details={confirmDialog.details}
        onConfirm={confirmDialog.onConfirm}
      />

      {/* 进度对话框 */}
      <ProgressDialog
        open={progressDialog.open}
        onOpenChange={(open) => setProgressDialog(prev => ({ ...prev, open }))}
        title={progressDialog.title}
        progress={progressDialog.progress}
        message={progressDialog.message}
        isComplete={progressDialog.isComplete}
        report={progressDialog.report}
        onClose={() => setProgressDialog(prev => ({ ...prev, open: false }))}
      />
    </div>
  )
}
