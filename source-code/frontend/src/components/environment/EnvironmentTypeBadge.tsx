import { cn } from '@/lib/utils'

interface EnvironmentTypeBadgeProps {
  type?: 'portable' | 'desktop' | 'unknown'
  className?: string
}

const typeConfig = {
  desktop: {
    label: '桌面版',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  portable: {
    label: '便携版',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  unknown: {
    label: '未知',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
  },
}

export function EnvironmentTypeBadge({ type = 'portable', className }: EnvironmentTypeBadgeProps) {
  const config = typeConfig[type] || typeConfig.unknown

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
