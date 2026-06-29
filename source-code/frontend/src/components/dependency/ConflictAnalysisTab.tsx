/**
 * 冲突分析选项卡容器组件
 * 
 * 负责：
 * - 整合 DependencyTree 和 ConflictPanel 组件
 * - 使用 ResizablePanel 实现左右分栏布局
 * - 调用后端 API 进行依赖分析
 * - 管理加载状态和错误处理
 * - 提供重新分析功能
 * - 检查 pipdeptree 是否已安装，提供安装指引
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  RefreshCw, 
  AlertCircle, 
  Loader2,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DependencyTree } from './DependencyTree'
import { ConflictPanel } from './ConflictPanel'
import { useDependencyStore } from '@/stores/useDependencyStore'
import type { DependencyNode, ConflictInfo } from '@/types/dependency'

/**
 * 冲突分析选项卡组件
 */
export const ConflictAnalysisTab: React.FC = () => {
  const { t } = useTranslation()
  // Zustand Store
  const {
    currentEnvId,
    dependencyTree,
    conflicts,
    analysisStatus,
    analysisError,
    lastAnalysisTime,
    setDependencyTree,
    setConflicts,
    setAnalysisStatus,
    setAnalysisError,
    clearAnalysisData,
    addLog
  } = useDependencyStore()

  // 本地状态
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [pipDepTreeInstalled, setPipDepTreeInstalled] = useState<boolean | null>(null)
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  /**
   * 检查 pipdeptree 是否已安装
   */
  const checkPipDepTree = useCallback(async () => {
    try {
      console.log('[ConflictAnalysisTab] 检查 pipdeptree 是否已安装')
      
      // 开发环境 Mock
      if (!window.pywebview || !window.pywebview.api) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setPipDepTreeInstalled(true)
        return
      }

      const response = await window.pywebview.api.dependency_check_pipdeptree()
      
      if (response.success) {
        setPipDepTreeInstalled(response.installed)
        
        if (!response.installed) {
          setShowInstallDialog(true)
        }
      } else {
        console.error('[ConflictAnalysisTab] 检查 pipdeptree 失败:', response.error_message)
        setPipDepTreeInstalled(false)
      }
    } catch (error) {
      console.error('[ConflictAnalysisTab] 检查 pipdeptree 异常:', error)
      setPipDepTreeInstalled(false)
    }
  }, [])

  /**
   * 安装 pipdeptree
   */
  const installPipDepTree = useCallback(async () => {
    try {
      setIsInstalling(true)
      
      addLog({
        level: 'info',
        message: t('dependency.pipdeptree.installing'),
        source: 'system'
      })

      // 开发环境 Mock
      if (!window.pywebview || !window.pywebview.api) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        setPipDepTreeInstalled(true)
        setShowInstallDialog(false)
        
        addLog({
          level: 'success',
          message: t('dependency.pipdeptree.installSuccessMock'),
          source: 'system'
        })
        
        return
      }

      const response = await window.pywebview.api.dependency_install_pipdeptree()
      
      if (response.success) {
        setPipDepTreeInstalled(true)
        setShowInstallDialog(false)
        
        addLog({
          level: 'success',
          message: t('dependency.pipdeptree.installSuccess'),
          source: 'system'
        })
        
        // 安装成功后自动触发分析
        await analyzeDependencies()
      } else {
        addLog({
          level: 'error',
          message: t('dependency.pipdeptree.installFailed', { error: response.error_message }),
          source: 'system'
        })
      }
    } catch (error) {
      console.error('[ConflictAnalysisTab] 安装 pipdeptree 异常:', error)
      
      addLog({
        level: 'error',
        message: t('dependency.pipdeptree.installError', { error }),
        source: 'system'
      })
    } finally {
      setIsInstalling(false)
    }
  }, [addLog])

  /**
   * 执行依赖分析
   */
  const analyzeDependencies = useCallback(async () => {
    try {
      console.log('[ConflictAnalysisTab] 开始依赖分析')
      
      setAnalysisStatus('loading')
      setAnalysisError(null)
      
      addLog({
        level: 'info',
        message: t('dependency.analyzingTree'),
        source: 'system'
      })

      // 开发环境 Mock
      if (!window.pywebview || !window.pywebview.api) {
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Mock 数据
        const mockTree: DependencyNode[] = [
          {
            id: 'numpy-1.24.0',
            packageName: 'numpy',
            installedVersion: '1.24.0',
            dependencies: [],
            hasConflict: false,
            depth: 0
          },
          {
            id: 'pandas-2.0.0',
            packageName: 'pandas',
            installedVersion: '2.0.0',
            dependencies: [
              {
                id: 'numpy-1.24.0-child',
                packageName: 'numpy',
                installedVersion: '1.24.0',
                requiredVersion: '>=1.20.0',
                dependencies: [],
                hasConflict: false,
                depth: 1,
                parentId: 'pandas-2.0.0'
              }
            ],
            hasConflict: false,
            depth: 0
          }
        ]
        
        const mockConflicts: ConflictInfo[] = []
        
        setDependencyTree(mockTree)
        setConflicts(mockConflicts)
        setAnalysisStatus('success')
        
        addLog({
          level: 'success',
          message: t('dependency.analysisCompleteMock'),
          source: 'system'
        })
        
        return
      }

      const response = await window.pywebview.api.dependency_analyze_dependencies()
      
      if (response.success && response.data) {
        setDependencyTree(response.data.tree)
        setConflicts(response.data.conflicts)
        setAnalysisStatus('success')
        
        addLog({
          level: 'success',
          message: t('dependency.analysisComplete', { packages: response.data.stats.totalPackages, conflicts: response.data.stats.totalConflicts }),
          source: 'system'
        })
      } else {
        throw new Error(response.error_message || t('dependency.analysisFailed'))
      }
    } catch (error) {
      console.error('[ConflictAnalysisTab] 依赖分析失败:', error)
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      setAnalysisStatus('error')
      setAnalysisError(errorMessage)
      
      addLog({
        level: 'error',
        message: `依赖分析失败: ${errorMessage}`,
        source: 'system'
      })
    }
  }, [setDependencyTree, setConflicts, setAnalysisStatus, setAnalysisError, addLog])

  /**
   * 重新分析
   */
  const handleReAnalyze = useCallback(async () => {
    console.log('[ConflictAnalysisTab] 重新分析')
    clearAnalysisData()
    await analyzeDependencies()
  }, [clearAnalysisData, analyzeDependencies])



  /**
   * 处理节点选择
   */
  const handleNodeSelect = useCallback((node: DependencyNode) => {
    setSelectedNodeId(node.id)
  }, [])

  /**
   * 处理冲突项点击（高亮树中的节点）
   */
  const handleConflictClick = useCallback((conflict: ConflictInfo) => {
    // 高亮第一个相关节点
    if (conflict.relatedNodeIds && conflict.relatedNodeIds.length > 0) {
      setSelectedNodeId(conflict.relatedNodeIds[0])
    }
  }, [])

  /**
   * 组件挂载时检查 pipdeptree 并触发首次分析
   */
  useEffect(() => {
    const init = async () => {
      await checkPipDepTree()
      
      // 如果没有缓存数据，自动触发分析
      if (!dependencyTree && pipDepTreeInstalled) {
        await analyzeDependencies()
      }
    }
    
    init()
  }, [])

  /**
   * 当 pipdeptree 安装状态变化时，触发分析
   */
  useEffect(() => {
    if (pipDepTreeInstalled && !dependencyTree) {
      analyzeDependencies()
    }
  }, [pipDepTreeInstalled])

  /**
   * 监听环境切换，自动重新分析
   */
  useEffect(() => {
    // 如果环境 ID 存在且 pipdeptree 已安装，触发重新分析
    if (currentEnvId && pipDepTreeInstalled) {
      console.log('[ConflictAnalysisTab] 环境切换，触发重新分析')
      analyzeDependencies()
    }
  }, [currentEnvId])

  // 计算是否正在加载
  const isLoading = analysisStatus === 'loading'

  return (
    <div className="flex h-full flex-col">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t("dependency.conflictAnalysis")}</h2>
          {lastAnalysisTime && (
            <span className="text-xs text-muted-foreground">
              {t('dependency.lastAnalysis')}: {new Date(lastAnalysisTime).toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 重新分析按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReAnalyze}
            disabled={isLoading || !pipDepTreeInstalled}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('dependency.analyzing')}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" />
                {t('dependency.reanalyze')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        {/* 错误提示 */}
        {analysisStatus === 'error' && analysisError && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>{t("dependency.analysisFailed")}</AlertTitle>
              <AlertDescription>
                {analysisError}
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2 h-auto p-0"
                  onClick={() => {
                    console.log('查看日志')
                  }}
                >
                  {t('dependency.viewLog')}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 size-12 animate-spin text-primary" />
              <p className="text-lg font-medium">{t("dependency.analyzingTree")}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                这可能需要几秒钟时间
              </p>
            </div>
          </div>
        )}

        {/* 成功状态：显示依赖树和冲突面板 */}
        {analysisStatus === 'success' && dependencyTree && conflicts && (
          <div className="flex h-full flex-col lg:flex-row">
            {/* 左侧/上方：依赖树 */}
            <div className="h-1/2 w-full border-b lg:h-full lg:w-1/2 lg:border-b-0 lg:border-r">
              <DependencyTree
                treeData={dependencyTree}
                conflicts={conflicts}
                onNodeSelect={handleNodeSelect}
                selectedNodeId={selectedNodeId}
              />
            </div>

            {/* 右侧/下方：冲突面板 */}
            <div className="h-1/2 w-full lg:h-full lg:w-1/2">
              <ConflictPanel
                conflicts={conflicts}
                onConflictClick={handleConflictClick}
                onReanalyze={analyzeDependencies}
              />
            </div>
          </div>
        )}

        {/* 空状态 */}
        {analysisStatus === 'idle' && !isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 size-12 text-muted-foreground" />
              <p className="text-lg font-medium">{t("dependency.ready")}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("dependency.clickReanalyze")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* pipdeptree 安装对话框 */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dependency.needPipdeptree")}</DialogTitle>
            <DialogDescription>
              {t("dependency.pipdeptreeDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>{t("dependency.installCommand")}</AlertTitle>
              <AlertDescription>
                <code className="mt-2 block rounded bg-muted p-2 text-sm">
                  pip install pipdeptree
                </code>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInstallDialog(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={installPipDepTree}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('dependency.installing')}
                </>
              ) : (
                t('dependency.autoInstall')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

