/**
 * 依赖管理页面
 * 
 * 包含四个选项卡：运行环境、依赖列表、冲突分析、救援模式
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Package } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { useEnvStore } from '@/stores/useEnvStore'
import { EnvRequiredGuide } from '@/components/common/EnvRequiredGuide'
import RuntimeEnvTab from '@/components/dependency/RuntimeEnvTab'
import DependencyListTab from '@/components/dependency/DependencyListTab'
import { ConflictAnalysisTab } from '@/components/dependency/ConflictAnalysisTab'
import RescueTab from '@/components/dependency/rescue/RescueTab'

function DependencyManagePageContent() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'runtime' | 'list' | 'conflict-analysis' | 'rescue'>('runtime')
  const currentEnvId = useEnvStore((state) => state.currentEnvId)
  const setCurrentEnv = useDependencyStore((state) => state.setCurrentEnv)

  // 监听环境切换
  useEffect(() => {
    if (currentEnvId) {
      setCurrentEnv(currentEnvId)
    }
  }, [currentEnvId, setCurrentEnv])

  return (
    <div className="flex size-full flex-col overflow-hidden bg-background">
      {/* 页面标题区域 */}
      <div className="shrink-0 bg-surface px-6 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Package className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight text-content-primary">
              {t('dependency.title')}
            </h1>
            <p className="text-xs leading-tight text-content-secondary">{t('dependency.description')}</p>
          </div>
        </div>
      </div>

      {/* 选项卡导航和内容 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border bg-surface px-6">
          <TabsList className="h-10 justify-start rounded-none bg-transparent p-0">
            <TabsTrigger
              value="runtime"
              className="rounded-none border-b-2 border-transparent px-5 text-sm text-content-secondary transition-colors duration-200 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              {t('dependency.tabs.runtime')}
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="rounded-none border-b-2 border-transparent px-5 text-sm text-content-secondary transition-colors duration-200 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              {t('dependency.tabs.list')}
            </TabsTrigger>
            <TabsTrigger
              value="conflict-analysis"
              className="rounded-none border-b-2 border-transparent px-5 text-sm text-content-secondary transition-colors duration-200 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              {t('dependency.tabs.conflictAnalysis')}
            </TabsTrigger>
            <TabsTrigger
              value="rescue"
              className="rounded-none border-b-2 border-transparent px-5 text-sm text-content-secondary transition-colors duration-200 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              {t('dependency.tabs.rescue')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="runtime" className="m-0 min-h-0 flex-1 overflow-hidden bg-background">
          <RuntimeEnvTab />
        </TabsContent>

        <TabsContent value="list" className="m-0 min-h-0 flex-1 overflow-hidden bg-background">
          <DependencyListTab />
        </TabsContent>

        <TabsContent value="conflict-analysis" className="m-0 min-h-0 flex-1 overflow-hidden bg-background">
          <ConflictAnalysisTab />
        </TabsContent>

        <TabsContent value="rescue" className="m-0 min-h-0 flex-1 overflow-hidden bg-background">
          <RescueTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function DependencyManagePage() {
  const currentEnvId = useEnvStore((state) => state.currentEnvId)
  const environments = useEnvStore((state) => state.environments)
  const noEnvironment = environments.length === 0 || !currentEnvId

  if (noEnvironment) {
    return (
      <EnvRequiredGuide 
        icon={<Package className="size-24 text-muted-foreground" />}
      />
    )
  }

  return <DependencyManagePageContent />
}
