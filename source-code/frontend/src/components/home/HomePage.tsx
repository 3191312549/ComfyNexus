/**
 * HomePage 主容器组件
 * 
 * Bento Grid 设计：
 * - 欢迎横幅：跨3列 + 状态卡片1列
 * - 推荐关注：跨4列（5列2排）
 * - 快速访问：跨4列
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WelcomeBanner } from './WelcomeBanner'
import { StatusCard } from './StatusCard'
import { FolderShortcutBar } from './FolderShortcutBar'
import { CreatorRecommendationGrid } from './CreatorRecommendationGrid'
import { useProcessStore } from '@/stores/useProcessStore'
import { useFolderShortcutStore } from '@/stores/useFolderShortcutStore'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HomePageProps {
  className?: string
}

export const HomePage: React.FC<HomePageProps> = ({ className }) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const processStore = useProcessStore()
  const folderStore = useFolderShortcutStore()

  useEffect(() => {
    const loadData = async () => {
      console.log('[HomePage] 开始加载页面数据')
      setLoading(true)

      try {
        const results = await Promise.allSettled([
          processStore.loadComfyUIStatus(),
          folderStore.loadShortcuts()
        ])

        results.forEach((result, index) => {
          const names = ['ComfyUI 状态', '文件夹快捷方式']
          if (result.status === 'fulfilled') {
            console.log(`[HomePage] ${names[index]} 加载成功`)
          } else {
            console.warn(`[HomePage] ${names[index]} 加载失败:`, result.reason)
          }
        })

        console.log('[HomePage] 页面数据加载完成')
      } catch (error) {
        console.error('[HomePage] 页面数据加载异常:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <div className={cn('p-[21px] space-y-5 max-w-[1200px] mx-auto', className)}>
      <div className="grid grid-cols-4 gap-5">
        <WelcomeBanner className="col-span-3" />
        <StatusCard className="col-span-1" />
      </div>

      <FolderShortcutBar />

      <div className={cn(
        'rounded-2xl p-[18px] border shadow-lg shadow-border-subtle/50',
        'bg-surface',
        'border-border-subtle'
      )}>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground size-4" />
            <h2 className="text-foreground text-sm font-semibold">{t('home.creatorRecommendation')}</h2>
          </div>
          <div className="size-7" />
        </div>

        <CreatorRecommendationGrid />
      </div>

      {loading && (
        <div className={cn(
          'fixed top-4 right-4 shadow-lg rounded-lg p-4 z-50 border',
          'bg-surface',
          'border-border-subtle'
        )}>
          <div className="flex items-center gap-2">
            <div className="border-primary size-4 animate-spin rounded-full border-b-2" />
            <span className="text-foreground text-sm">{t('common.loading')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(HomePage)
