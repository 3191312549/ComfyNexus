/**
 * 资产库设置弹窗
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen, Shield, Play, Pause, Square, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Toast } from '@/components/ui/Toast'
import { useAssetStore } from '@/stores/useAssetStore'

interface AssetSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const isDevelopment = (): boolean => {
  return !window.pywebview || !window.pywebview.api
}

export function AssetSettingsDialog({ open, onOpenChange }: AssetSettingsDialogProps) {
  const { t } = useTranslation()
  const {
    getSettings,
    saveSettings, 
    startBackgroundScan,
    getNsfwStatus,
    setNsfwEnabled,
    setNsfwAutoBlur,
    classifyAllImages,
    pauseNsfwScan,
    resumeNsfwScan,
    cancelNsfwScan
  } = useAssetStore()
  const [libraryPath, setLibraryPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [nsfwEnabled, setNsfwEnabledState] = useState(false)
  const [nsfwAutoBlur, setNsfwAutoBlurState] = useState(true)
  const [nsfwModelAvailable, setNsfwModelAvailable] = useState(true)
  const [nsfwScanning, setNsfwScanning] = useState(false)
  const [nsfwPaused, setNsfwPaused] = useState(false)

  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'warning'>('success')

  useEffect(() => {
    if (open) {
      setLoading(true)
      Promise.all([
        getSettings(),
        getNsfwStatus()
      ]).then(([settingsResult, nsfwResult]) => {
        if (nsfwResult.success) {
          setNsfwEnabledState(nsfwResult.nsfwAutoClassify || false)
          setNsfwAutoBlurState(nsfwResult.nsfwAutoBlur ?? true)
          setNsfwModelAvailable(nsfwResult.modelAvailable ?? true)
          setNsfwScanning(nsfwResult.isScanning || false)
          setNsfwPaused(nsfwResult.isPaused || false)
        }
        if (settingsResult?.libraryPath !== undefined) {
          setLibraryPath(settingsResult.libraryPath)
        }
      }).finally(() => setLoading(false))
    }
  }, [open, getSettings, getNsfwStatus])

  const showToast = (message: string, variant: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message)
    setToastVariant(variant)
    setToastOpen(true)
  }

  const handleBrowse = async () => {
    try {
      if (isDevelopment()) {
        const mockPath = 'C:\\Users\\Example\\Documents\\ComfyUI\\output'
        setLibraryPath(mockPath)
      } else {
        const response = await window.pywebview.api.browse_folder_for_shortcut()
        if (response.success && response.path) {
          setLibraryPath(response.path)
        } else if (response.error_message) {
          showToast(response.error_message, 'error')
        }
      }
    } catch (error) {
      console.error('[AssetSettingsDialog] 浏览文件夹失败:', error)
      showToast(t('asset.settingsDialog.browseError'), 'error')
    }
  }

  const handleSave = async () => {
    if (!libraryPath.trim()) {
      showToast(t('asset.settingsDialog.pathRequired'), 'warning')
      return
    }

    setSaving(true)
    try {
      console.log('[AssetSettingsDialog] 保存设置:', libraryPath.trim())
      const success = await saveSettings(libraryPath.trim())
      console.log('[AssetSettingsDialog] 保存结果:', success)
      
      if (success) {
        showToast(t('asset.settingsDialog.saveSuccess'), 'success')
        onOpenChange(false)
        console.log('[AssetSettingsDialog] 启动后台扫描...')
        startBackgroundScan(libraryPath.trim())
      } else {
        showToast(t('asset.settingsDialog.saveError'), 'error')
      }
    } catch (error) {
      console.error('[AssetSettingsDialog] 保存失败:', error)
      showToast(t('asset.settingsDialog.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleNsfwToggle = async (enabled: boolean) => {
    if (!nsfwModelAvailable) {
      showToast(t('asset.settingsDialog.nsfwModelNotAvailable'), 'error')
      return
    }
    
    const success = await setNsfwEnabled(enabled)
    if (success) {
      setNsfwEnabledState(enabled)
      showToast(enabled ? t('asset.settingsDialog.nsfwEnabled') : t('asset.settingsDialog.nsfwDisabled'), 'success')
    } else {
      showToast(t('asset.settingsDialog.nsfwToggleError'), 'error')
    }
  }

  const handleNsfwAutoBlurToggle = async (enabled: boolean) => {
    const success = await setNsfwAutoBlur(enabled)
    if (success) {
      setNsfwAutoBlurState(enabled)
      showToast(enabled ? t('asset.settingsDialog.nsfwAutoBlurEnabled') : t('asset.settingsDialog.nsfwAutoBlurDisabled'), 'success')
    } else {
      showToast(t('asset.settingsDialog.nsfwAutoBlurToggleError'), 'error')
    }
  }

  const handleClassifyAll = async () => {
    if (!nsfwEnabled) {
      showToast(t('asset.settingsDialog.nsfwEnableFirst'), 'warning')
      return
    }
    
    setNsfwScanning(true)
    setNsfwPaused(false)
    
    const result = await classifyAllImages()
    if (result.success) {
      showToast(result.message || t('asset.settingsDialog.nsfwScanStarted'), 'success')
    } else {
      setNsfwScanning(false)
      showToast(t('asset.settingsDialog.nsfwScanError'), 'error')
    }
  }

  const handlePauseResume = async () => {
    if (nsfwPaused) {
      const success = await resumeNsfwScan()
      if (success) {
        setNsfwPaused(false)
        showToast(t('asset.settingsDialog.nsfwScanResumed'), 'success')
      }
    } else {
      const success = await pauseNsfwScan()
      if (success) {
        setNsfwPaused(true)
        showToast(t('asset.settingsDialog.nsfwScanPaused'), 'success')
      }
    }
  }

  const handleCancelScan = async () => {
    const success = await cancelNsfwScan()
    if (success) {
      setNsfwScanning(false)
      setNsfwPaused(false)
      showToast(t('asset.settingsDialog.nsfwScanCancelled'), 'success')
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('asset.settingsDialog.title')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('asset.settingsDialog.libraryPath')}
              </label>
              <div className="flex gap-2">
                <Input
                  value={libraryPath}
                  onChange={(e) => setLibraryPath(e.target.value)}
                  placeholder={t('asset.settingsDialog.pathPlaceholder')}
                  className="flex-1"
                  disabled={loading}
                />
                <Button variant="outline" onClick={handleBrowse} disabled={loading}>
                  <FolderOpen className="mr-1 size-4" />
                  {t('asset.settingsDialog.browse')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('asset.settingsDialog.pathHint')}
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-muted-foreground" />
                    <label className="text-sm font-medium">
                      {t('asset.settingsDialog.nsfwAutoClassify')}
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('asset.settingsDialog.nsfwAutoClassifyHint')}
                  </p>
                </div>
                <Switch
                  checked={nsfwEnabled}
                  onCheckedChange={handleNsfwToggle}
                  disabled={loading || !nsfwModelAvailable}
                />
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Eye className="size-4 text-muted-foreground" />
                    <label className="text-sm font-medium">
                      {t('asset.settingsDialog.nsfwAutoBlur')}
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('asset.settingsDialog.nsfwAutoBlurHint')}
                  </p>
                </div>
                <Switch
                  checked={nsfwAutoBlur}
                  onCheckedChange={handleNsfwAutoBlurToggle}
                  disabled={loading}
                />
              </div>
              
              {nsfwEnabled && (
                <div className="mt-3 flex gap-2">
                  {nsfwScanning ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePauseResume}
                        disabled={loading}
                      >
                        {nsfwPaused ? (
                          <>
                            <Play className="mr-1 size-3" />
                            {t('asset.settingsDialog.nsfwResume')}
                          </>
                        ) : (
                          <>
                            <Pause className="mr-1 size-3" />
                            {t('asset.settingsDialog.nsfwPause')}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelScan}
                        disabled={loading}
                      >
                        <Square className="mr-1 size-3" />
                        {t('asset.settingsDialog.nsfwCancel')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClassifyAll}
                      disabled={loading}
                    >
                      <Play className="mr-1 size-3" />
                      {t('asset.settingsDialog.nsfwClassifyAll')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        title={toastMessage}
        variant={toastVariant}
        duration={3000}
      />
    </>
  )
}
