/**
 * GitHub 镜像加速设置组件
 * 提供镜像开关、预设选择、测速功能
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { Switch } from '@/components/ui/Switch'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Zap, Gauge, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { toast } from '@/utils/toast'
import { MirrorSpeedTestDialog } from './MirrorSpeedTestDialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

interface MirrorSettingsData {
  enabled: boolean
  mode: string
  forcePreset: string | null
  statusText: string
  currentPreset: string
  isTesting: boolean
  verifySSL: boolean
  fallbackToDirect: boolean
}

const PRESET_OPTIONS = [
  { value: 'auto', labelKey: 'settings.mirror.presets.auto' },
  { value: 'hybrid', labelKey: 'settings.mirror.presets.hybrid' },
  { value: 'gitclone', labelKey: 'settings.mirror.presets.gitclone' },
  { value: 'ur1fun', labelKey: 'settings.mirror.presets.ur1fun' },
  { value: 'ghproxy', labelKey: 'settings.mirror.presets.ghproxy' },
]

export function MirrorSettings() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<MirrorSettingsData>({
    enabled: false,
    mode: 'auto',
    forcePreset: null,
    statusText: '',
    currentPreset: '',
    isTesting: false,
    verifySSL: true,
    fallbackToDirect: true,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSpeedTest, setShowSpeedTest] = useState(false)
  const [showEnableConfirm, setShowEnableConfirm] = useState(false)

  const loadSettings = useCallback(async () => {
    if (!window.pywebview?.api) return
    try {
      const result = await window.pywebview.api.get_github_mirror_settings()
      if (result.success && result.settings) {
        setSettings({
          enabled: result.settings.enabled || false,
          mode: result.settings.mode || 'auto',
          forcePreset: result.settings.forcePreset || null,
          statusText: result.settings.statusText || '',
          currentPreset: result.settings.currentPreset || '',
          isTesting: result.settings.isTesting || false,
          verifySSL: result.settings.verifySSL !== false,
          fallbackToDirect: result.settings.fallbackToDirect !== false,
        })
      }
    } catch (e) {
      console.error('[MirrorSettings] 加载设置失败:', e)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const updateSettings = async (updates: Partial<MirrorSettingsData>) => {
    if (!window.pywebview?.api) return
    try {
      const apiUpdates: Record<string, unknown> = {}
      if (updates.enabled !== undefined) apiUpdates.enabled = updates.enabled
      if (updates.mode !== undefined) apiUpdates.mode = updates.mode
      if (updates.forcePreset !== undefined) apiUpdates.forcePreset = updates.forcePreset
      if (updates.verifySSL !== undefined) apiUpdates.verifySSL = updates.verifySSL
      if (updates.fallbackToDirect !== undefined) apiUpdates.fallbackToDirect = updates.fallbackToDirect

      await window.pywebview.api.update_github_mirror_settings(apiUpdates)
      setSettings((prev) => ({ ...prev, ...updates }))
    } catch (e) {
      console.error('[MirrorSettings] 更新设置失败:', e)
      toast.error(t('settings.mirror.updateFailed'))
    }
  }

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      setShowEnableConfirm(true)
    } else {
      await updateSettings({ enabled: false })
      toast.info(t('settings.mirror.disabled'))
    }
  }

  const handleConfirmEnable = async () => {
    await updateSettings({ enabled: true })
    toast.success(t('settings.mirror.enabled'))
  }

  const handlePresetChange = async (value: string) => {
    if (value === 'auto') {
      await updateSettings({ mode: 'auto', forcePreset: null })
    } else {
      await updateSettings({ mode: 'manual', forcePreset: value })
    }
  }

  const currentPresetValue = settings.mode === 'auto' ? 'auto' : (settings.forcePreset || 'auto')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <label className="text-sm font-medium">{t('settings.mirror.enable')}</label>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleToggle}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('settings.mirror.enableHint')}
        </p>
      </div>

      {settings.enabled && (
        <>
          {settings.statusText && (
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2">
              <Info className="size-3.5 text-primary" />
              <span className="text-xs text-primary">{settings.statusText}</span>
            </div>
          )}

          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between p-0 hover:bg-transparent"
            >
              <span className="text-sm font-medium">{t('settings.mirror.advancedOptions')}</span>
              {showAdvanced ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>

            {showAdvanced && (
              <div className="space-y-4 rounded-md border border-border p-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('settings.mirror.forcePreset')}</label>
                  <NativeSelect
                    value={currentPresetValue}
                    onValueChange={handlePresetChange}
                  >
                    {PRESET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </NativeSelect>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.mirror.forcePresetHint')}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">{t('settings.mirror.verifySSL')}</label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.mirror.verifySSLHint')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.verifySSL}
                    onCheckedChange={(checked) => updateSettings({ verifySSL: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">{t('settings.mirror.fallbackToDirect')}</label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.mirror.fallbackToDirectHint')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.fallbackToDirect}
                    onCheckedChange={(checked) => updateSettings({ fallbackToDirect: checked })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpeedTest(true)}
              disabled={settings.isTesting}
            >
              <Gauge className="mr-2 size-4" />
              {settings.isTesting ? t('settings.mirror.testing') : t('settings.mirror.speedTest')}
            </Button>
          </div>
        </>
      )}

      <MirrorSpeedTestDialog
        open={showSpeedTest}
        onOpenChange={setShowSpeedTest}
      />

      <ConfirmDialog
        open={showEnableConfirm}
        onOpenChange={setShowEnableConfirm}
        title={t('settings.mirror.enableWarningTitle')}
        description={t('settings.mirror.enableWarningDesc')}
        confirmText={t('settings.mirror.enableConfirm')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmEnable}
        variant="warning"
      />
    </div>
  )
}
