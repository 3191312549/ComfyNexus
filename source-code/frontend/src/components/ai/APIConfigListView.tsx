/**
 * API 配置列表视图组件
 * 
 * 显示和管理 API 配置列表，提供以下功能：
 * - 配置列表渲染
 * - 搜索框（按别名和服务商搜索）
 * - 服务商筛选器
 * - 排序功能（按名称、更新时间、使用频率）
 * - 配置状态指示器（可用/不可用/未测试）
 * - 配置操作（编辑、删除、测试、设为默认）
 * 
 * 验证需求：1.1, 1.4, 8.1, 8.3
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAPIConfigStore, APIConfig } from '@/stores/useAPIConfigStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { NativeSelect } from '@/components/ui/NativeSelect'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  Star, 
  StarOff,
  RefreshCw,
  Filter,
  ArrowUpDown
} from 'lucide-react'

type SortBy = 'name' | 'updated' | 'usage'

interface APIConfigListViewProps {
  onAddConfig?: () => void
  onEditConfig?: (configId: string) => void
}

/**
 * API 配置列表视图组件
 */
export const APIConfigListView: React.FC<APIConfigListViewProps> = ({
  onAddConfig,
  onEditConfig
}) => {
  const { t } = useTranslation()
  
  const PROVIDER_NAMES: Record<string, string> = {
    'xflow': t('ai.providerNames.xflow'),
    'zhipu': t('ai.providerNames.zhipu'),
    'volcengine': t('ai.providerNames.volcengine'),
    'iflow': t('ai.providerNames.iflow'),
    'ollama': t('ai.providerNames.ollama'),
    'custom-openai': t('ai.providerNames.customOpenai')
  }
  
  const getStatusConfig = (status: APIConfig['status']) => ({
    available: { label: t('ai.statusNames.available'), variant: 'default' as const, className: 'bg-success/10 text-success border-success/20' },
    unavailable: { label: t('ai.statusNames.unavailable'), variant: 'destructive' as const, className: 'bg-danger/10 text-danger' },
    untested: { label: t('ai.statusNames.untested'), variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' }
  }[status])
  
  const StatusBadge: React.FC<{ status: APIConfig['status'] }> = ({ status }) => {
    const config = getStatusConfig(status)
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }
  
  const {
    configs,
    isLoading,
    error,
    loadConfigs,
    deleteConfig,
    setDefaultConfig,
    testConfig,
    searchConfigs,
    clearError
  } = useAPIConfigStore()
  
  // 组件本地状态
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortBy>('updated')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<APIConfig | null>(null)
  const [testingConfigId, setTestingConfigId] = useState<string | null>(null)
  const [testResultDialogOpen, setTestResultDialogOpen] = useState(false)
  const [testResult, setTestResult] = useState<{
    configName: string
    success: boolean
    available: boolean
    message: string
    latency?: number
  } | null>(null)
  
  // 加载配置列表（强制刷新以获取最新的使用次数）
  useEffect(() => {
    console.log('[APIConfigListView] 组件挂载，强制刷新配置列表')
    loadConfigs(true) // 传递 true 强制刷新，忽略缓存
  }, [loadConfigs])
  
  // 监听配置使用次数更新事件
  useEffect(() => {
    const handleConfigUsageUpdated = (event: CustomEvent) => {
      console.log('[APIConfigListView] 收到配置使用次数更新事件:', event.detail)
      // 强制刷新配置列表以获取最新数据
      loadConfigs(true)
    }
    
    window.addEventListener('api_config_usage_updated', handleConfigUsageUpdated as EventListener)
    
    return () => {
      window.removeEventListener('api_config_usage_updated', handleConfigUsageUpdated as EventListener)
    }
  }, [loadConfigs])
  
  // 获取所有服务商列表（用于筛选器）
  const providers = useMemo(() => {
    const providerSet = new Set(configs.map(c => c.provider))
    return Array.from(providerSet).sort()
  }, [configs])
  
  // 过滤和排序配置列表
  const displayConfigs = useMemo(() => {
    console.log('[APIConfigListView] 重新计算显示配置列表')
    
    // 1. 应用搜索
    let filtered = searchQuery ? searchConfigs(searchQuery) : configs
    
    // 2. 应用服务商筛选
    if (selectedProvider) {
      filtered = filtered.filter(c => c.provider === selectedProvider)
    }
    
    // 3. 应用排序
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.alias.localeCompare(b.alias, 'zh-CN')
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'usage':
          return b.usageCount - a.usageCount
        default:
          return 0
      }
    })
    
    console.log(`[APIConfigListView] 显示 ${sorted.length} 个配置（共 ${configs.length} 个）`)
    return sorted
  }, [configs, searchQuery, selectedProvider, sortBy, searchConfigs])
  
  /**
   * 处理搜索输入变化
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    console.log('[APIConfigListView] 搜索关键词变化:', query)
    setSearchQuery(query)
  }
  
  /**
   * 清空搜索
   */
  const handleClearSearch = () => {
    console.log('[APIConfigListView] 清空搜索')
    setSearchQuery('')
  }
  
  /**
   * 处理服务商筛选变化
   */
  const handleProviderFilterChange = (provider: string) => {
    console.log('[APIConfigListView] 服务商筛选变化:', provider)
    setSelectedProvider(provider)
  }
  
  /**
   * 清空服务商筛选
   */
  const handleClearProviderFilter = () => {
    console.log('[APIConfigListView] 清空服务商筛选')
    setSelectedProvider('')
  }
  
  /**
   * 处理排序方式变化
   */
  const handleSortChange = (newSortBy: SortBy) => {
    console.log('[APIConfigListView] 排序方式变化:', newSortBy)
    setSortBy(newSortBy)
  }
  
  /**
   * 处理刷新按钮点击
   */
  const handleRefresh = () => {
    console.log('[APIConfigListView] 刷新配置列表')
    loadConfigs()
  }
  
  /**
   * 处理删除按钮点击
   */
  const handleDeleteClick = (config: APIConfig) => {
    console.log('[APIConfigListView] 点击删除配置:', config.alias)
    setConfigToDelete(config)
    setDeleteDialogOpen(true)
  }
  
  /**
   * 确认删除配置
   */
  const handleConfirmDelete = async () => {
    if (!configToDelete) return
    
    console.log('[APIConfigListView] 确认删除配置:', configToDelete.alias)
    const success = await deleteConfig(configToDelete.id)
    
    if (success) {
      console.log('[APIConfigListView] 配置删除成功')
      setDeleteDialogOpen(false)
      setConfigToDelete(null)
    } else {
      console.error('[APIConfigListView] 配置删除失败')
    }
  }
  
  /**
   * 取消删除
   */
  const handleCancelDelete = () => {
    console.log('[APIConfigListView] 取消删除')
    setDeleteDialogOpen(false)
    setConfigToDelete(null)
  }
  
  /**
   * 处理设为默认按钮点击
   * 验证需求：3.3, 3.4
   */
  const handleSetDefault = async (config: APIConfig) => {
    console.log('[APIConfigListView] 设置默认配置:', config.alias)
    
    try {
      const success = await setDefaultConfig(config.id)
      
      if (success) {
        console.log('[APIConfigListView] 默认配置设置成功')
        // UI 会自动更新，因为 setDefaultConfig 会调用 loadConfigs() 刷新配置列表
        // 这会取消其他配置的默认标记，并将当前配置标记为默认
      } else {
        console.error('[APIConfigListView] 默认配置设置失败')
        // 错误信息已经由 store 设置，会在 UI 中显示
      }
    } catch (error) {
      console.error('[APIConfigListView] 设置默认配置异常:', error)
      // 异常情况下也会由 store 处理错误信息
    }
  }
  
  /**
   * 处理测试连接按钮点击
   */
  const handleTestConfig = async (config: APIConfig) => {
    console.log('[APIConfigListView] 测试配置连接:', config.alias)
    setTestingConfigId(config.id)
    
    const result = await testConfig(config.id)
    
    setTestingConfigId(null)
    
    // 显示测试结果弹窗
    setTestResult({
      configName: config.alias,
      success: result.success,
      available: result.available || false,
      message: result.message || (result.available ? t('ai.connectionSuccessMsg') : t('ai.connectionFailedMsg')),
      latency: result.latency
    })
    setTestResultDialogOpen(true)
    
    if (result.success) {
      console.log('[APIConfigListView] 配置测试完成:', result.available ? '可用' : '不可用')
    } else {
      console.error('[APIConfigListView] 配置测试失败:', result.errorMessage)
    }
  }
  
  /**
   * 处理编辑按钮点击
   */
  const handleEditConfig = (config: APIConfig) => {
    console.log('[APIConfigListView] 编辑配置:', config.alias)
    if (onEditConfig) {
      onEditConfig(config.id)
    }
  }
  
  /**
   * 处理添加配置按钮点击
   */
  const handleAddConfig = () => {
    console.log('[APIConfigListView] 添加新配置')
    if (onAddConfig) {
      onAddConfig()
    }
  }
  
  /**
   * 格式化日期时间
   */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // 加载状态
  if (isLoading && configs.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text={t('ai.loadingConfigList')} />
      </div>
    )
  }
  
  // 错误状态
  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">{t("ai.loadFailed")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {error}
          </p>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              {t("ai.reload")}
            </Button>
            <Button onClick={clearError} variant="ghost">
              {t("ai.clearError")}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="flex h-full flex-col">
      {/* 搜索栏和操作按钮 */}
      <div className="m-4 flex shrink-0 items-center gap-4">
        {/* 搜索框 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("common.placeholder.searchConfig")}
            value={searchQuery}
            onChange={handleSearchChange}
            className="px-10"
          />
          {searchQuery && (
            <Button
              onClick={handleClearSearch}
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 size-6 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground"
            >
              ×
            </Button>
          )}
        </div>
        
        {/* 服务商筛选器 */}
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <NativeSelect
            value={selectedProvider}
            onValueChange={handleProviderFilterChange}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("ai.allProviders")}</option>
            {providers.map(provider => (
              <option key={provider} value={provider}>
                {PROVIDER_NAMES[provider] || provider}
              </option>
            ))}
          </NativeSelect>
          {selectedProvider && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearProviderFilter}
            >
              {t("ai.clear")}
            </Button>
          )}
        </div>
        
        {/* 排序选择器 */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="size-4 text-muted-foreground" />
          <NativeSelect
            value={sortBy}
            onValueChange={(value) => handleSortChange(value as SortBy)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="updated">{t("ai.sortByUpdateTime")}</option>
            <option value="name">{t("ai.sortByName")}</option>
            <option value="usage">{t("ai.sortByUsage")}</option>
          </NativeSelect>
        </div>
        
        {/* 刷新按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 size-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t("ai.refreshBtn")}
        </Button>
        
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleAddConfig}
        >
          <Plus className="mr-2 size-4" />
          {t("ai.addConfigBtn")}
        </Button>
      </div>
      
      {/* 配置列表 */}
      {displayConfigs.length === 0 ? (
        /* 空状态视图 */
        <Card className="mx-4">
          <CardContent className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">
                {searchQuery || selectedProvider 
                  ? t('ai.noMatchingConfig') 
                  : t('ai.noConfig')}
              </p>
              {(searchQuery || selectedProvider) ? (
                <div className="flex justify-center gap-2">
                  {searchQuery && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleClearSearch}
                    >
                      {t('ai.clearSearch')}
                    </Button>
                  )}
                  {selectedProvider && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleClearProviderFilter}
                    >
                      {t('ai.clearFilter')}
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddConfig}
                >
                  <Plus className="mr-2 size-4" />
                  {t('ai.addFirstConfig')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* 配置表格 */
        <Card className="mx-4 mb-4 flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <colgroup>
                <col style={{ width: '50px' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '200px' }} />
              </colgroup>
              <TableHeader className="sticky top-0 z-10 bg-muted/50">
                <TableRow>
                  <TableHead className="text-center">{t("ai.default")}</TableHead>
                  <TableHead>{t("ai.alias")}</TableHead>
                  <TableHead>{t("ai.provider")}</TableHead>
                  <TableHead>{t("ai.model")}</TableHead>
                  <TableHead className="text-center">{t("ai.status")}</TableHead>
                  <TableHead className="text-center">{t("ai.usageCount")}</TableHead>
                  <TableHead className="text-center">{t("ai.updateTime")}</TableHead>
                  <TableHead className="text-center">{t("ai.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayConfigs.map((config) => (
                  <TableRow key={config.id}>
                    {/* 默认标记 */}
                    <TableCell className="text-center">
                      {config.isDefault ? (
                        <Star className="inline-block size-4 fill-warning text-warning" />
                      ) : (
                        <Button
                          onClick={() => handleSetDefault(config)}
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground transition-colors hover:text-warning"
                          title={t("common.title.setDefault")}
                        >
                          <StarOff className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                    
                    {/* 别名 */}
                    <TableCell className="font-medium">
                      {config.alias}
                    </TableCell>
                    
                    {/* 服务商 */}
                    <TableCell>
                      {PROVIDER_NAMES[config.provider] || config.provider}
                    </TableCell>
                    
                    {/* 模型 */}
                    <TableCell>
                      {config.model}
                    </TableCell>
                    
                    {/* 状态 */}
                    <TableCell className="text-center">
                      <StatusBadge status={config.status} />
                    </TableCell>
                    
                    {/* 使用次数 */}
                    <TableCell className="text-center">
                      {config.usageCount}
                    </TableCell>
                    
                    {/* 更新时间 */}
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {formatDateTime(config.updatedAt)}
                    </TableCell>
                    
                    {/* 操作按钮 */}
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {/* 测试按钮 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestConfig(config)}
                          disabled={testingConfigId === config.id}
                          title={t("common.title.testConnection")}
                        >
                          <TestTube className={`size-4 ${testingConfigId === config.id ? 'animate-pulse' : ''}`} />
                        </Button>
                        
                        {/* 编辑按钮 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditConfig(config)}
                          title={t("common.title.editConfig")}
                        >
                          <Edit className="size-4" />
                        </Button>
                        
                        {/* 删除按钮 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(config)}
                          title={t("common.title.deleteConfig")}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* 配置总数 */}
          <div className="shrink-0 border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {t("ai.totalConfigCount", { count: configs.length })}
              {(searchQuery || selectedProvider) && displayConfigs.length !== configs.length && (
                <span className="ml-2">
                  {t("ai.filteredCount", { count: displayConfigs.length })}
                </span>
              )}
            </p>
          </div>
        </Card>
      )}
      
      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ai.confirmDeleteConfig")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("ai.confirmDeleteConfigDesc", { name: configToDelete?.alias })}
              {configToDelete?.isDefault && (
                <span className="mt-2 block text-warning">
                  {t("ai.defaultConfigDeleteWarning")}
                </span>
              )}
              <span className="mt-2 block">
                {t("ai.cannotUndo")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("ai.confirmDeleteBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 测试结果弹窗 */}
      <AlertDialog open={testResultDialogOpen} onOpenChange={setTestResultDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {testResult?.available ? `✓ ${t('ai.connectionSuccess')}` : `✗ ${t('ai.connectionFailed')}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">{t("ai.configName")}:</span>
                  {' '}{testResult?.configName}
                </p>
                {testResult?.latency != null && (
                  <p>
                    <span className="font-medium">{t("ai.responseLatency")}:</span>
                    {' '}{testResult.latency.toFixed(0)} ms
                  </p>
                )}
                {testResult?.message && (
                  <p className={testResult?.available ? 'text-success' : 'text-danger'}>
                    <span className="font-medium">{t("ai.result")}:</span>
                    {testResult.message}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setTestResultDialogOpen(false)}>
              {t("ai.okBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * 默认导出
 */
export default APIConfigListView
