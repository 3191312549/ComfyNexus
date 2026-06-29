/**
 * 极客模式切换按钮组件
 * 
 * 功能：
 * - 在普通模式和极客模式之间切换
 * - 显示当前模式状态
 * - 未保存修改时提示用户
 */

import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/Switch'
import { Code2 } from 'lucide-react'

export interface GeekModeToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  hasUnsavedChanges: boolean
}

export function GeekModeToggle({ enabled, onChange, hasUnsavedChanges }: GeekModeToggleProps) {
  const { t } = useTranslation()
  
  const handleToggle = (checked: boolean) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        t('env.geekMode.unsavedChangesWarning')
      )
      if (!confirmed) {
        return
      }
    }
    
    onChange(checked)
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Code2 className="size-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <label htmlFor="geek-mode" className="cursor-pointer text-base font-medium">
            {t('env.geekMode.title')}
          </label>
          <p className="text-sm text-muted-foreground">
            {enabled ? t('env.geekMode.enabledDesc') : t('env.geekMode.disabledDesc')}
          </p>
        </div>
      </div>
      
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  )
}
