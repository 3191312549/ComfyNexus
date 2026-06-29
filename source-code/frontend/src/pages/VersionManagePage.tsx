/**
 * 版本管理页面
 * 
 * 功能：
 * - 显示当前版本信息和远端地址
 * - 支持稳定版和开发版的标签页切换
 * - 版本列表展示（稳定版4列铭牌，开发版表格布局）
 * - 版本切换功能（带确认对话框）
 * - 支持国际化和深色主题
 * - Git 所有权问题检测和修复
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Package, Monitor, Box } from 'lucide-react'
import { useVersionStore } from '@/stores/useVersionStore'
import { useEnvStore } from '@/stores/useEnvStore'
import { useWarningStore } from '@/stores/useWarningStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { AutoTranslateSwitch } from '@/components/version/AutoTranslateSwitch'
import RemoteAddressBar from '@/components/version/RemoteAddressBar'
import { VersionTabs, TabType } from '@/components/version/VersionTabs'
import { GitOwnershipError } from '@/components/version/GitOwnershipError'
import { GitErrorAlert } from '@/components/version/GitErrorAlert'
import { DevVersionWarningDialog } from '@/components/version/DevVersionWarningDialog'
import { VersionSwitchCard } from '@/components/version/VersionSwitchCard'
import { StableVersionBadge } from '@/components/version/StableVersionBadge'
import { DevVersionTable } from '@/components/version/DevVersionTable'
import { VersionDetailPanel } from '@/components/version/VersionDetailPanel'
import { EnvRequiredGuide } from '@/components/common/EnvRequiredGuide'
import { VersionInfo } from '@/types/version'

function VersionManagePageContent() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('stable')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDevWarning, setShowDevWarning] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<VersionInfo | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  
  const {
    versions,
    currentVersion,
    loading,
    error,
    initialized,
    gitOwnershipError,
    isFixing,
    fetchVersions,
    fetchCurrentVersion,
    fetchRemoteInfo,
    fetchBranches,
    refreshVersions,
    fixGitOwnership,
    switchVersion,
    loadMore,
    pagination,
    showSwitchCard,
    switchProgress,
    switchingVersion,
    closeSwitchCard,
    executeSwitchVersion,
  } = useVersionStore()
  
  const { environments, currentEnvId } = useEnvStore()
  const currentEnv = environments.find(e => e.id === currentEnvId)
  
  const { warnings, loadWarnings, setWarningDismissed } = useWarningStore()

  const observerTarget = useRef<HTMLDivElement>(null)
  
  const isDesktopEnv = currentEnv?.envType === 'desktop'
  
  // 监听后台更新事件
  useEffect(() => {
    const handleVersionListUpdated = (event: Event) => {
      const customEvent = event as CustomEvent
      const { versionType, page, versions: updatedVersions, hasMore } = customEvent.detail
      
      useVersionStore.setState((state) => ({
        versions: {
          ...state.versions,
          [versionType]: updatedVersions,
        },
        pagination: {
          ...state.pagination,
          [versionType]: { page, hasMore, loading: false },
        },
        isBackgroundUpdating: {
          ...state.isBackgroundUpdating,
          [versionType]: false,
        },
      }))
    }
    
    window.addEventListener('versionListUpdated', handleVersionListUpdated)
    return () => window.removeEventListener('versionListUpdated', handleVersionListUpdated)
  }, [])

  useEffect(() => {
    const initData = async () => {
      await Promise.all([
        fetchCurrentVersion(),
        fetchRemoteInfo(),
        fetchBranches(),
        fetchVersions('stable'),
        fetchVersions('dev'),
        loadWarnings(),
      ])
      
      useVersionStore.setState({ initialized: true, loading: false })
    }
    
    initData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEnvId])

  const handleLoadMore = useCallback(() => {
    const currentPagination = pagination[activeTab]
    if (currentPagination.hasMore && !currentPagination.loading && !loading) {
      loadMore(activeTab)
    }
  }, [activeTab, pagination, loading, loadMore])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [handleLoadMore])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshVersions()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTabChange = (tab: TabType) => {
    if (tab === 'dev' && warnings.devVersionWarning) {
      setShowDevWarning(true)
    }
    setActiveTab(tab)
  }
  
  const handleDontShowAgain = (dontShow: boolean) => {
    setWarningDismissed('devVersionWarning', dontShow)
  }

  const handleVersionClick = (version: VersionInfo) => {
    setSelectedVersion(version)
    setPanelOpen(true)
  }

  const handlePanelClose = () => {
    setPanelOpen(false)
  }

  const handlePanelSwitch = () => {
    if (selectedVersion) {
      switchVersion(selectedVersion)
      setPanelOpen(false)
    }
  }

  const currentVersions = versions[activeTab]
  
  if (isDesktopEnv) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-12">
        <div className="flex size-24 items-center justify-center rounded-full bg-muted">
          <Monitor className="size-12 text-muted-foreground" />
        </div>
        <div className="max-w-md text-center space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            {t('version.desktopEnv.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('version.desktopEnv.description')}
          </p>
        </div>
      </div>
    )
  }
  
  if (gitOwnershipError) {
    return (
      <div className="h-full">
        <GitOwnershipError
          repoPath={currentEnv?.general?.comfyuiPath || ''}
          onFix={fixGitOwnership}
          isFixing={isFixing}
        />
      </div>
    )
  }
  
  if (error && currentVersions.length === 0 && !loading) {
    let errorType: 'network' | 'branch_not_found' | 'no_tags' | 'no_commits' | 'unknown' = 'unknown'
    
    if (error.includes('网络') || error.includes('连接')) {
      errorType = 'network'
    } else if (error.includes('分支') && error.includes('不存在')) {
      errorType = 'branch_not_found'
    } else if (error.includes('没有任何标签')) {
      errorType = 'no_tags'
    } else if (error.includes('没有任何提交')) {
      errorType = 'no_commits'
    }
    
    return (
      <div className="h-full">
        <GitErrorAlert
          errorType={errorType}
          error={error}
          repoPath={currentEnv?.general?.comfyuiPath || ''}
          onRefresh={handleRefresh}
        />
      </div>
    )
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-12 py-10">
      <header className="flex items-end justify-between">
        <h1 className="flex items-center gap-3 text-[28px] font-bold tracking-wide">
          <svg className="size-7 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          {t('version.title')}
        </h1>
        <div className="flex items-center gap-5">
          <AutoTranslateSwitch />
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            {t('version.refresh')}
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border-2 border-danger/50 bg-danger/10 p-4 shadow-lg">
          <p className="text-sm font-medium text-danger">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-7">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <Box className="size-4" />
              {t('version.currentVersion')}
            </div>
            
            {currentVersion ? (
              <>
                <div className="-mt-1 flex items-center gap-3">
                  <div className="text-[48px] font-extrabold leading-none tracking-tight text-foreground">
                    {currentVersion.tag || currentVersion.id}
                  </div>
                  <div className={cn(
                    'px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5',
                    currentVersion.type === 'stable'
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-warning/15 text-warning border border-warning/30'
                  )}>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      currentVersion.type === 'stable' ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary))]' : 'bg-warning shadow-[0_0_8px_hsl(var(--warning))]'
                    )}></span>
                    {currentVersion.type === 'stable' ? t('version.stable') : t('version.dev')}
                  </div>
                </div>
                
                <div className="flex items-center gap-8 text-[13px] text-muted-foreground">
                  <div>
                    {t('version.hash')}: <span className="font-mono text-foreground">{currentVersion.id}</span>
                  </div>
                  <div>
                    {t('version.updateTime')}: <span className="font-mono text-foreground">{formatDate(currentVersion.timestamp)}</span>
                  </div>
                </div>
                
                <div className="my-1 h-px w-full bg-gradient-to-r from-border to-transparent"></div>
                
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('version.changelog')}
                  </div>
                  <div className="rounded-xl bg-muted/50 py-2 text-sm leading-relaxed text-muted-foreground">
                    {currentVersion.message}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                {loading ? t('version.loading') : t('version.cannotGetVersion')}
              </div>
            )}
          </div>
        </div>

        <RemoteAddressBar />
      </div>

      <VersionTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        stableCount={versions.stable.length}
        devCount={versions.dev.length}
        stableTotalCached={pagination.stable.totalCached}
        devTotalCached={pagination.dev.totalCached}
      />

      <div className="space-y-4">
        {!initialized ? (
          <div className={cn(
            'grid gap-4',
            activeTab === 'stable' ? 'grid-cols-5' : 'grid-cols-1'
          )}>
            {[...Array(activeTab === 'stable' ? 8 : 5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className={cn(
                  'bg-muted rounded-xl',
                  activeTab === 'stable' ? 'h-20' : 'h-16'
                )} />
              </div>
            ))}
          </div>
        ) : currentVersions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="flex size-20 items-center justify-center rounded-full bg-muted">
                <Package className="size-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-muted-foreground">
                  {t('version.noVersions')}
                </p>
              </div>
            </div>
          </div>
        ) : activeTab === 'stable' ? (
          <div className="grid grid-cols-5 gap-4">
            {currentVersions.map((version) => (
              <StableVersionBadge
                key={version.id}
                version={version}
                isCurrent={version.id === currentVersion?.id}
                isSelected={selectedVersion?.id === version.id}
                onClick={() => handleVersionClick(version)}
                onSwitch={switchVersion}
                disabled={loading}
              />
            ))}
          </div>
        ) : (
          <DevVersionTable
            versions={currentVersions}
            currentVersionId={currentVersion?.id}
            onSwitch={switchVersion}
            disabled={loading}
          />
        )}

        {currentVersions.length > 0 && (
          <div ref={observerTarget} className="py-8">
            {pagination[activeTab].loading && (
              <div className="text-center text-muted-foreground">
                <div className="inline-flex items-center gap-3">
                  <div className="border-3 size-5 animate-spin rounded-full border-primary border-t-transparent" />
                  <span className="text-sm font-medium">
                    {t('version.loadingMore')}
                  </span>
                </div>
              </div>
            )}
            {!pagination[activeTab].hasMore && !pagination[activeTab].loading && (
              <div className="text-center text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2">
                  <span>{t('version.noMoreVersions')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <DevVersionWarningDialog
        open={showDevWarning}
        onOpenChange={setShowDevWarning}
        onDontShowAgain={handleDontShowAgain}
      />
      
      {showSwitchCard && switchingVersion && currentVersion && (
        <VersionSwitchCard
          open={showSwitchCard}
          onClose={closeSwitchCard}
          currentVersion={currentVersion}
          targetVersion={switchingVersion}
          progress={switchProgress}
          switching={switchProgress.currentStep !== 'idle' && switchProgress.currentStep !== 'complete'}
          onConfirm={executeSwitchVersion}
        />
      )}

      <VersionDetailPanel
        open={panelOpen}
        version={selectedVersion}
        isCurrent={selectedVersion?.id === currentVersion?.id}
        onClose={handlePanelClose}
        onSwitch={handlePanelSwitch}
        switching={switchProgress.currentStep !== 'idle' && switchProgress.currentStep !== 'complete'}
      />
    </div>
  )
}

export default function VersionManagePage() {
  const { environments, currentEnvId } = useEnvStore()
  const noEnvironment = environments.length === 0 || !currentEnvId

  if (noEnvironment) {
    return (
      <EnvRequiredGuide 
        icon={<Monitor className="size-24 text-muted-foreground" />}
      />
    )
  }

  return <VersionManagePageContent />
}
