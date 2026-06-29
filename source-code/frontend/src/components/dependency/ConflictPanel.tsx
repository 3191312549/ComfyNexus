/**
 * 冲突面板组件
 * 
 * 展示依赖冲突详情，支持：
 * - 冲突统计卡片
 * - 冲突列表展示
 * - 冲突类型视觉区分
 * - 点击高亮树节点
 * - 复制冲突信息
 * - 显示解决建议
 */

import { useTranslation } from 'react-i18next'
import React, { useState, useMemo, useCallback } from 'react'
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Copy, 
  CheckCircle,
  RefreshCw,
  Package,
  Wrench
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { ConflictInfo, DependencyNode } from '@/types/dependency'
import { cn } from '@/lib/utils'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { FixConflictDialog } from './FixConflictDialog'

/**
 * 组件 Props
 */
interface ConflictPanelProps {
  /** 冲突信息列表 */
  conflicts: ConflictInfo[]
  /** 当前选中的节点 */
  selectedNode?: DependencyNode | null
  /** 冲突项点击回调 */
  onConflictClick?: (conflict: ConflictInfo) => void
  /** 重新分析回调 */
  onReanalyze?: () => void
}

/**
 * 冲突面板组件
 */
export const ConflictPanel: React.FC<ConflictPanelProps> = ({
  conflicts,
  selectedNode: _selectedNode,
  onConflictClick,
  onReanalyze
}) => {
  const { t } = useTranslation()
  // 状态管理
  const [sortBy, setSortBy] = useState<'severity' | 'package'>('severity')
  const [filterType, setFilterType] = useState<'all' | 'version' | 'circular'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // 修复对话框状态
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogStatus, setDialogStatus] = useState<'fixing' | 'success' | 'error'>('fixing')
  const [dialogMessage, setDialogMessage] = useState<string>('')
  const [dialogPackageName, setDialogPackageName] = useState<string>('')
  
  // Zustand Store
  const { addLog } = useDependencyStore()

  /**
   * 计算冲突统计
   */
  const stats = useMemo(() => {
    const total = conflicts.length
    const versionConflicts = conflicts.filter(c => c.type === 'version_mismatch').length
    const circularDependencies = conflicts.filter(c => c.type === 'circular_dependency').length
    const criticalCount = conflicts.filter(c => c.severity === 'critical').length
    
    return {
      total,
      versionConflicts,
      circularDependencies,
      criticalCount
    }
  }, [conflicts])

  /**
   * 排序和过滤冲突列表
   */
  const sortedAndFilteredConflicts = useMemo(() => {
    let filtered = conflicts

    // 过滤
    if (filterType !== 'all') {
      filtered = conflicts.filter(c => {
        if (filterType === 'version') return c.type === 'version_mismatch'
        if (filterType === 'circular') return c.type === 'circular_dependency'
        return true
      })
    }

    // 排序
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'severity') {
        const severityOrder = { critical: 0, warning: 1, info: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      } else {
        return a.packageName.localeCompare(b.packageName)
      }
    })

    return sorted
  }, [conflicts, sortBy, filterType])

  /**
   * 获取严重程度图标
   */
  const getSeverityIcon = useCallback((severity: ConflictInfo['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="text-danger size-4" />
      case 'warning':
        return <AlertTriangle className="text-warning size-4" />
      case 'info':
        return <Info className="text-info size-4" />
    }
  }, [])

  /**
   * 获取冲突类型图标
   */
  const getConflictTypeIcon = useCallback((type: ConflictInfo['type']) => {
    switch (type) {
      case 'version_mismatch':
        return <Package className="text-warning size-4" />
      case 'circular_dependency':
        return <RefreshCw className="text-purple-400 size-4" />
      case 'missing_dependency':
        return <AlertCircle className="text-danger size-4" />
    }
  }, [])

  /**
   * 获取严重程度颜色类
   */
  const getSeverityColorClass = useCallback((severity: ConflictInfo['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-l-4 border-l-danger bg-danger/10'
      case 'warning':
        return 'border-l-4 border-l-warning bg-warning/10'
      case 'info':
        return 'border-l-4 border-l-info bg-info/10'
    }
  }, [])

  /**
   * 复制冲突信息到剪贴板
   */
  const copyToClipboard = useCallback(async (conflict: ConflictInfo) => {
    const text = `
冲突类型: ${conflict.type}
严重程度: ${conflict.severity}
包名: ${conflict.packageName}
已安装版本: ${conflict.installedVersion}
要求版本: ${conflict.requiredVersion}
来源: ${conflict.source}
描述: ${conflict.description}
建议: ${conflict.suggestion}
    `.trim()

    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(conflict.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }, [])

  /**
   * 处理冲突项点击
   */
  const handleConflictClick = useCallback((conflict: ConflictInfo) => {
    onConflictClick?.(conflict)
  }, [onConflictClick])

  /**
   * 修复冲突
   */
  const handleFixConflict = useCallback(async (conflict: ConflictInfo, event: React.MouseEvent) => {
    // 阻止事件冒泡，避免触发卡片点击
    event.stopPropagation()
    
    try {
      // 打开对话框并设置为修复中状态
      setDialogPackageName(conflict.packageName)
      setDialogStatus('fixing')
      setDialogMessage('')
      setDialogOpen(true)
      
      addLog({
        level: 'info',
        message: `正在修复冲突: ${conflict.packageName}`,
        source: 'system'
      })

      // 开发环境 Mock
      if (!window.pywebview || !window.pywebview.api) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        setDialogStatus('success')
        setDialogMessage('修复成功 (Mock)')
        
        addLog({
          level: 'success',
          message: `${conflict.packageName} 修复成功 (Mock)`,
          source: 'system'
        })
        
        return
      }

      const response = await window.pywebview.api.dependency_fix_conflict(
        {
          id: conflict.id,
          type: conflict.type,
          packageName: conflict.packageName,
          installedVersion: conflict.installedVersion,
          requiredVersion: conflict.requiredVersion,
          source: conflict.source
        },
        'official' // 使用官方镜像源，可以后续改为用户配置
      )
      
      if (response.success) {
        setDialogStatus('success')
        setDialogMessage('修复成功')
        
        addLog({
          level: 'success',
          message: `${conflict.packageName} 修复成功`,
          source: 'system'
        })
      } else {
        setDialogStatus('error')
        setDialogMessage(response.error_message || '修复失败')
        
        addLog({
          level: 'error',
          message: response.error_message || `${conflict.packageName} 修复失败`,
          source: 'system'
        })
      }
    } catch (error) {
      console.error('修复冲突失败:', error)
      
      setDialogStatus('error')
      setDialogMessage(String(error))
      
      addLog({
        level: 'error',
        message: `修复冲突失败: ${error}`,
        source: 'system'
      })
    }
  }, [addLog])
  
  /**
   * 关闭对话框
   */
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false)
  }, [])
  
  /**
   * 重新分析
   */
  const handleReanalyze = useCallback(() => {
    setDialogOpen(false)
    onReanalyze?.()
  }, [onReanalyze])

  return (
    <div className="flex h-full flex-col">
      {/* 头部：统计卡片 */}
      <div className="border-b p-4">
        <h3 className="mb-3 text-lg font-semibold">{t("dependency.conflictAnalysis")}</h3>
        
        <div className="grid grid-cols-3 gap-3">
          {/* 总冲突数 */}
          <Card className="border-2">
            <CardHeader className="p-3">
              <CardDescription className="text-xs">{t("dependency.totalConflicts")}</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>

          {/* 版本冲突数 */}
          <Card className="border-warning/50 border-2">
            <CardHeader className="p-3">
              <CardDescription className="text-xs">{t("dependency.versionConflicts")}</CardDescription>
              <CardTitle className="text-warning text-2xl">
                {stats.versionConflicts}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* 循环依赖数 */}
          <Card className="border-purple-400/50 border-2">
            <CardHeader className="p-3">
              <CardDescription className="text-xs">{t("dependency.circularDeps")}</CardDescription>
              <CardTitle className="text-purple-400 text-2xl">
                {stats.circularDependencies}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 过滤和排序控制 */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              全部
            </Button>
            <Button
              variant={filterType === 'version' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('version')}
            >
              版本冲突
            </Button>
            <Button
              variant={filterType === 'circular' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('circular')}
            >
              循环依赖
            </Button>
          </div>

          <div className="ml-auto flex gap-1">
            <Button
              variant={sortBy === 'severity' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('severity')}
            >
              按严重程度
            </Button>
            <Button
              variant={sortBy === 'package' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('package')}
            >
              按包名
            </Button>
          </div>
        </div>
      </div>

      {/* 冲突列表 */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {sortedAndFilteredConflicts.length > 0 ? (
            sortedAndFilteredConflicts.map(conflict => (
              <Card
                key={conflict.id}
                className={cn(
                  'border-l-4 cursor-pointer transition-all hover:shadow-md',
                  getSeverityColorClass(conflict.severity)
                )}
                onClick={() => handleConflictClick(conflict)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(conflict.severity)}
                      {getConflictTypeIcon(conflict.type)}
                      <CardTitle className="text-base">
                        {conflict.packageName}
                      </CardTitle>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* 修复按钮 */}
                      {conflict.type !== 'circular_dependency' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={(e) => handleFixConflict(conflict, e)}
                        >
                          <Wrench className="mr-1 size-4" />
                          修复
                        </Button>
                      )}
                      
                      {/* 复制按钮 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(conflict)
                        }}
                      >
                        {copiedId === conflict.id ? (
                        <CheckCircle className="text-success size-4" />
                      ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {conflict.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {conflict.type}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 p-4 pt-2">
                  {/* 版本信息 */}
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t("dependency.installed")}:</span>
                      <span className="font-mono">{conflict.installedVersion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t("dependency.required")}:</span>
                      <span className="font-mono">{conflict.requiredVersion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t("dependency.source")}:</span>
                      <span className="font-medium">{conflict.source}</span>
                    </div>
                  </div>

                  {/* 描述 */}
                  <div className="text-sm text-muted-foreground">
                    {conflict.description}
                  </div>

                  {/* 解决建议 */}
                  {conflict.suggestion && (
                    <div className="mt-2 rounded border bg-background p-2">
                      <div className="mb-1 text-xs font-semibold text-muted-foreground">
                        解决建议:
                      </div>
                      <div className="font-mono text-sm">
                        {conflict.suggestion}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-12 text-center">
              <CheckCircle className="text-success mx-auto mb-3 size-12" />
              <h4 className="mb-1 text-lg font-semibold">{t("dependency.noConflictsDetected")}</h4>
              <p className="text-sm text-muted-foreground">
                {conflicts.length === 0 
                  ? '当前环境的依赖关系良好，没有发现冲突。'
                  : '当前过滤条件下没有冲突。'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* 修复进度对话框 */}
      <FixConflictDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onReanalyze={handleReanalyze}
        packageName={dialogPackageName}
        status={dialogStatus}
        message={dialogMessage}
      />
    </div>
  )
}

