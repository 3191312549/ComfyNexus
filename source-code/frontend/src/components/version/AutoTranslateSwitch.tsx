/**
 * 自动翻译开关组件
 * 
 * 用于控制是否自动翻译更新日志
 */

import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/Switch'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function AutoTranslateSwitch() {
  const { t } = useTranslation()
  const { systemSettings, updateSystemSettings } = useSettingsStore()
  
  const checked = systemSettings.autoTranslateChangelog ?? false
  
  const handleCheckedChange = (checked: boolean) => {
    updateSystemSettings({ autoTranslateChangelog: checked })
  }
  
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={checked}
        onCheckedChange={handleCheckedChange}
      />
      <span className="text-sm text-muted-foreground">{t('version.autoTranslate')}</span>
    </div>
  )
}

export default AutoTranslateSwitch
