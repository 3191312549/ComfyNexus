/**
 * WelcomeSection 组件
 * 首页欢迎区域，显示日期时间和欢迎语
 * 
 * 功能:
 * - 实时显示日期和时间
 * - 根据时间段显示不同的欢迎语
 * - 优雅的渐变背景
 * - 动画效果
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WelcomeSectionProps {
  className?: string
  userName?: string
}

const getTimeOfDay = (hour: number): 'morning' | 'afternoon' | 'evening' | 'night' => {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 24) return 'evening'
  return 'night'
}

const formatDate = (date: Date, t: (key: string) => string): string => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = [
    t('common.weekdays.sunday'),
    t('common.weekdays.monday'),
    t('common.weekdays.tuesday'),
    t('common.weekdays.wednesday'),
    t('common.weekdays.thursday'),
    t('common.weekdays.friday'),
    t('common.weekdays.saturday')
  ]
  const weekday = weekdays[date.getDay()]
  
  return `${year}${t('common.date.year')}${month}${t('common.date.month')}${day}${t('common.date.day')} ${weekday}`
}

/**
 * 格式化时间
 */
const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${hours}:${minutes}:${seconds}`
}

const getGreeting = (timeOfDay: string, t: (key: string) => string): string => {
  const greetingsMap = {
    morning: [
      t('home.greeting.morning1'),
      t('home.greeting.morning2'),
      t('home.greeting.morning3')
    ],
    afternoon: [
      t('home.greeting.afternoon1'),
      t('home.greeting.afternoon2'),
      t('home.greeting.afternoon3')
    ],
    evening: [
      t('home.greeting.evening1'),
      t('home.greeting.evening2'),
      t('home.greeting.evening3')
    ],
    night: [
      t('home.greeting.night1'),
      t('home.greeting.night2'),
      t('home.greeting.night3')
    ]
  }
  const messages = greetingsMap[timeOfDay as keyof typeof greetingsMap] || greetingsMap.afternoon
  return messages[Math.floor(Math.random() * messages.length)]
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({ 
  className,
  userName 
}) => {
  const { t } = useTranslation()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const currentHour = currentTime.getHours()

  useEffect(() => {
    const updateGreeting = () => {
      const timeOfDay = getTimeOfDay(currentHour)
      setGreeting(getGreeting(timeOfDay, t))
    }

    updateGreeting()

    const timer = setInterval(updateGreeting, 60 * 60 * 1000)

    return () => clearInterval(timer)
  }, [currentHour, t])

  const dateStr = formatDate(currentTime, t)
  const timeStr = formatTime(currentTime)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-8',
        'bg-gradient-to-br from-surface via-background to-surface',
        'border border-border-subtle',
        'shadow-sm',
        className
      )}
    >
      <div className="absolute right-0 top-0 size-64 rounded-full bg-gradient-to-br from-primary/10 to-info/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 size-64 rounded-full bg-gradient-to-tr from-info/10 to-primary/10 blur-3xl" />

      <div className="relative space-y-4">
        <div className="text-muted-foreground flex items-center gap-4">
          <Clock className="size-5" />
          <div className="flex items-center gap-3">
            <span className="text-base font-medium">{dateStr}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="font-mono text-base">{timeStr}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-foreground flex items-center gap-3 text-4xl font-bold">
            <Sparkles className="text-warning size-8" />
            {greeting}
          </h1>
          {userName && (
            <p className="text-muted-foreground text-xl">
              {userName}，{t('home.welcomeBack')}
            </p>
          )}
        </div>

        <p className="text-muted-foreground text-base">
          {t('home.startComfyUIJourney')}
        </p>
      </div>
    </div>
  )
}

export default React.memo(WelcomeSection)
