/**
 * CreatorCard 组件
 * 用于显示推荐创作者信息的卡片
 * 
 * Bento Grid 设计：
 * - 深浅色主题适配
 * - 更紧凑的布局
 * - 优化悬停效果
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Video, Youtube, Github, Globe, LucideIcon, Music, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Creator } from '@/types/home'
import { useLastCommitTime } from '@/hooks/useLastCommitTime'
import { useTimeSince } from '@/hooks/useTimeSince'

export interface CreatorCardProps {
  creator: Creator
}

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  bilibili: Video,
  youtube: Youtube,
  github: Github,
  web: Globe,
  douyin: Music,
}

const getPlatformIcon = (platform: string): LucideIcon => {
  return PLATFORM_ICONS[platform.toLowerCase()] || Globe
}

const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-primary',
    'bg-success',
    'bg-info',
    'bg-danger',
    'bg-warning',
    'bg-primary/80',
    'bg-info/80',
    'bg-danger/80',
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

const getInitial = (name: string): string => {
  if (!name) return '?'
  if (/[\u4e00-\u9fa5]/.test(name[0])) {
    return name[0]
  }
  return name[0].toUpperCase()
}

export const CreatorCard: React.FC<CreatorCardProps> = ({ creator }) => {
  const { t } = useTranslation()
  const PlatformIcon = getPlatformIcon(creator.platform)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const isWeige = creator.name === '诶-阿伟哥'
  const isQiaoba = creator.name === '乔巴大战Comfyui'
  const { timeDiff, loading } = useLastCommitTime({ enabled: isWeige })
  const { timeDiff: qiaobaTimeDiff, loading: qiaobaLoading } = useTimeSince({
    startTime: '2026-04-21 15:25:55',
    enabled: isQiaoba
  })

  const handleClick = () => {
    window.open(creator.link, '_blank', 'noopener,noreferrer')
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const showPlaceholder = !creator.avatar || imageError

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-center gap-4 p-5 rounded-2xl w-full',
        'bg-surface-hover',
        'border border-border-subtle',
        'hover:bg-surface-hover/80 hover:border-border',
        'transition-all duration-200 cursor-pointer group',
        'hover:-translate-y-1 hover:shadow-lg hover:shadow-border-subtle/50'
      )}
    >
      <div className="relative shrink-0">
        {showPlaceholder ? (
          <div
            className={cn(
              'w-[52px] h-[52px] rounded-full',
              'flex items-center justify-center',
              'text-white font-bold text-lg',
              'ring-2 ring-border-subtle',
              'group-hover:ring-primary',
              'transition-all duration-200',
              getAvatarColor(creator.name)
            )}
          >
            {getInitial(creator.name)}
          </div>
        ) : (
          <img
            src={creator.avatar}
            alt={creator.name}
            loading="lazy"
            onError={handleImageError}
            onLoad={handleImageLoad}
            className={cn(
              'w-[52px] h-[52px] rounded-full object-cover',
              'ring-2 ring-border-subtle',
              'group-hover:ring-primary',
              'transition-all duration-200',
              !imageLoaded && 'opacity-0'
            )}
          />
        )}
        
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5',
            'bg-surface rounded-full p-1.5',
            'ring-2 ring-surface'
          )}
        >
          <PlatformIcon className="text-muted-foreground size-3.5" />
        </div>

        {isWeige && !loading && (
          <div
            className={cn(
              'absolute -top-12 left-1/2 -translate-x-1/2',
              'px-3 py-1.5 rounded-lg',
              'bg-gradient-to-r from-primary to-info',
              'text-white text-xs font-medium whitespace-nowrap',
              'shadow-lg shadow-primary/30',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200',
              'pointer-events-none'
            )}
          >
            <div className="flex items-center gap-1.5">
              <Clock className="size-3" />
              <span>⏰ {t('home.creatorSince', { timeDiff })}</span>
            </div>
            <div className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-gradient-to-r from-primary to-info" />
          </div>
        )}

        {isQiaoba && !qiaobaLoading && (
          <div
            className={cn(
              'absolute -top-12 left-1/2 -translate-x-1/2',
              'px-3 py-1.5 rounded-lg',
              'bg-gradient-to-r from-primary to-info',
              'text-white text-xs font-medium whitespace-nowrap',
              'shadow-lg shadow-primary/30',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200',
              'pointer-events-none'
            )}
          >
            <div className="flex items-center gap-1.5">
              <Clock className="size-3" />
              <span>⏰ {t('home.creatorSince', { timeDiff: qiaobaTimeDiff })}</span>
            </div>
            <div className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-gradient-to-r from-primary to-info" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden">
        <p
          className={cn(
            'font-semibold text-sm',
            'text-foreground',
            'group-hover:text-primary',
            'transition-colors duration-200',
            'truncate'
          )}
        >
          {creator.name}
        </p>
        
        <p
          className={cn(
            'text-xs leading-relaxed',
            'text-muted-foreground',
            'line-clamp-2'
          )}
        >
          {creator.description}
        </p>
      </div>
    </div>
  )
}

export default CreatorCard
