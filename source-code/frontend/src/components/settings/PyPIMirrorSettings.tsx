/**
 * PyPI 镜像加速设置组件
 * 提供镜像开关、源选择、测速功能
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { Switch } from '@/components/ui/Switch'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Package, Gauge, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { toast } from '@/utils/toast'
import { PyPIMirrorSpeedTestDialog } from './PyPIMirrorSpeedTestDialog'

interface PyPIMirrorSettingsData {
  enabled: boolean
  mode: string
  forceSource: string | null
  statusText: string
  currentSource: string
  isTesting: boolean
}

const SOURCE_OPTIONS = [
  { value: 'auto', labelKey: 'settings.pypiMirror.sources.auto' },
  { value: 'tuna', labelKey: 'settings.pypiMirror.sources.tuna' },
  { value: 'bfsu', labelKey: 'settings.pypiMirror.sources.bfsu' },
  { value: 'aliyun', labelKey: 'settings.pypiMirror.sources.aliyun' },
  { value: 'tencent', labelKey: 'settings.pypiMirror.sources.tencent' },
  { value: 'official', labelKey: 'settings.pypiMirror.sources.official' },
]

export function PyPIMirrorSettings() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<PyPIMirrorSettingsData>({
    enabled: false,
    mode: 'auto',
    forceSource: null,
    statusText: '',
    currentSource: '',
    isTesting: false,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSpeedTest, setShowSpeedTest] = useState(false)

  const loadSettings = useCallback(async () => {
    if (!window.pywebview?.api) return
    try {
      const result = await window.pywebview.api.get_pypi_mirror_settings()
      if (result.success && result.settings) {
        setSettings({
          enabled: result.settings.enabled || false,
          mode: result.settings.mode || 'auto',
          forceSource: result.settings.forceSource || null,
          statusText: result.settings.statusText || '',
          currentSource: result.settings.currentSource || '',
          isTesting: result.settings.isTesting || false,
        })
      }
    } catch (e) {
      console.error('[PyPIMirrorSettings] 加载设置失败:', e)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const updateSettings = async (updates: Partial<PyPIMirrorSettingsData>) => {
    if (!window.pywebview?.api) return
    try {
      const apiUpdates: Record<string, unknown> = {}
      if (updates.enabled !== undefined) apiUpdates.enabled = updates.enabled
      if (updates.mode !== undefined) apiUpdates.mode = updates.mode
      if (updates.forceSource !== undefined) apiUpdates.forceSource = updates.forceSource

      await window.pywebview.api.update_pypi_mirror_settings(apiUpdates)
      setSettings((prev) => ({ ...prev, ...updates }))
    } catch (e) {
      console.error('[PyPIMirrorSettings] 更新设置失败:', e)
      toast.error(t('settings.pypiMirror.updateFailed'))
    }
  }

  const handleToggle = async (checked: boolean) => {
    await updateSettings({ enabled: checked })
    if (checked) {
      toast.success(t('settings.pypiMirror.enabled'))
    } else {
      toast.info(t('settings.pypiMirror.disabled'))
    }
  }

  const handleSourceChange = async (value: string) => {
    if (value === 'auto') {
      await updateSettings({ mode: 'auto', forceSource: null })
    } else {
      await updateSettings({ mode: 'manual', forceSource: value })
    }
  }

  const currentSourceValue = settings.mode === 'auto' ? 'auto' : (settings.forceSource || 'auto')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-primary" />
            <label className="text-sm font-medium">{t('settings.pypiMirror.enable')}</label>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleToggle}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('settings.pypiMirror.enableHint')}
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
              <span className="text-sm font-medium">{t('settings.pypiMirror.advancedOptions')}</span>
              {showAdvanced ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>

            {showAdvanced && (
              <div className="space-y-4 rounded-md border border-border p-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('settings.pypiMirror.forceSource')}</label>
                  <NativeSelect
                    value={currentSourceValue}
                    onValueChange={handleSourceChange}
                  >
                    {SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </NativeSelect>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.pypiMirror.forceSourceHint')}
                  </p>
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
              {settings.isTesting ? t('settings.pypiMirror.testing') : t('settings.pypiMirror.speedTest')}
            </Button>
          </div>
        </>
      )}

      <PyPIMirrorSpeedTestDialog
        open={showSpeedTest}
        onOpenChange={setShowSpeedTest}
      />
    </div>
  )
}
