/**
 * 极客模式预设管理组件
 * 
 * 功能：
 * - 显示预设卡片列表
 * - 加载预设
 * - 创建新预设
 * - 删除预设
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Card } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { Download, Trash2, Edit, Settings, Save } from 'lucide-react'
import { bridgeService } from '@/services/bridge'
import { CUSTOM_PRESET_BASE, CUSTOM_PRESET_ID } from '@/utils/geekModeUtils'
import type { GeekPreset, GeekModeSaveConfig } from '@/types/environment'

export interface GeekModePresetsProps {
  currentEnvId?: string
  currentArgs: string
  currentPresetId?: string
  onLoadPreset: (args: string, presetId: string) => void
  onShowToast?: (message: string, variant: 'success' | 'error') => void
  onSaveConfig?: (config: GeekModeSaveConfig) => Promise<void>
  onPresetCreated?: (presetId: string) => void
}

export function GeekModePresets({
  currentEnvId: _currentEnvId,
  currentArgs,
  currentPresetId = CUSTOM_PRESET_ID,
  onLoadPreset,
  onShowToast,
  onSaveConfig,
  onPresetCreated
}: GeekModePresetsProps) {
  const { t } = useTranslation()
  const [presets, setPresets] = useState<GeekPreset[]>([])
  const [customPreset, setCustomPreset] = useState<GeekPreset | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDescription, setNewPresetDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<GeekPreset | null>(null)
  const [editPresetName, setEditPresetName] = useState('')
  const [editPresetDescription, setEditPresetDescription] = useState('')
  const [editPresetArgs, setEditPresetArgs] = useState('')

  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false)
  const [overwriteTargetPreset, setOverwriteTargetPreset] = useState<GeekPreset | null>(null)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deletingPreset, setDeletingPreset] = useState<GeekPreset | null>(null)

  const [confirmSwitchOpen, setConfirmSwitchOpen] = useState(false)
  const [pendingPreset, setPendingPreset] = useState<GeekPreset | null>(null)

  const allPresets = useMemo(() => {
    const customPresetData: GeekPreset = customPreset || {
      ...CUSTOM_PRESET_BASE,
      args: ''
    }

    if (!customPreset) {
      console.warn('[GeekModePresets] Custom 预设未加载，使用空参数')
    }

    return [customPresetData, ...presets]
  }, [presets, customPreset])

  const loadPresets = useCallback(async () => {
    try {
      const result = await bridgeService.getGeekPresets()
      console.log('[GeekModePresets] getGeekPresets 返回结果:', result)
      
      if (Array.isArray(result)) {
        const customPresetData = result.find(p => p.id === CUSTOM_PRESET_ID)
        const otherPresets = result.filter(p => p.id !== CUSTOM_PRESET_ID)
        
        setCustomPreset(customPresetData || null)
        setPresets(otherPresets)
      } else {
        console.error('[GeekModePresets] result 不是数组:', result)
        setCustomPreset(null)
        setPresets([])
      }
    } catch (error) {
      console.error('加载极客模式预设失败:', error)
      setCustomPreset(null)
      setPresets([])
    }
  }, [])

  useEffect(() => {
    loadPresets()
  }, [loadPresets])

  useEffect(() => {
    if (customPreset && currentPresetId === CUSTOM_PRESET_ID) {
      onLoadPreset(customPreset.args, customPreset.id)
    }
  }, [customPreset, currentPresetId])

  const handleLoadPreset = (preset: GeekPreset) => {
    if (preset.id === currentPresetId) {
      return
    }
    
    if (preset.id === CUSTOM_PRESET_ID) {
      onLoadPreset(preset.args, preset.id)
      
      if (onShowToast) {
        onShowToast(t('env.geekMode.switchedToCustom'), 'success')
      }
      return
    }
    
    setPendingPreset(preset)
    setConfirmSwitchOpen(true)
  }

  const handleConfirmSwitch = async () => {
    if (!pendingPreset) return
    
    setIsLoading(true)
    try {
      onLoadPreset(pendingPreset.args, pendingPreset.id)
      
      if (onSaveConfig) {
        await onSaveConfig({
          geekMode: {
            enabled: true,
            customArgs: pendingPreset.args,
            currentPresetId: pendingPreset.id
          }
        })
      }
      
      if (onShowToast) {
        const presetName = pendingPreset.name || pendingPreset.id
        onShowToast(t('env.geekMode.switchedTo', { name: presetName }), 'success')
      }
      
      setConfirmSwitchOpen(false)
      setPendingPreset(null)
    } catch (error) {
      console.error('切换预设失败:', error)
      if (onShowToast) {
        onShowToast(t('preset.switchFailed'), 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSwitch = () => {
    setConfirmSwitchOpen(false)
    setPendingPreset(null)
  }

  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) {
      alert(t('preset.enterName'))
      return
    }

    const duplicatePreset = presets.find(
      p => p.name === newPresetName
    )

    if (duplicatePreset) {
      setOverwriteTargetPreset(duplicatePreset)
      setConfirmOverwriteOpen(true)
      return
    }

    await createPreset()
  }

  const createPreset = async () => {
    setIsLoading(true)
    try {
      const result = await bridgeService.createGeekPreset(
        newPresetName,
        newPresetDescription,
        currentArgs
      )
      
      await loadPresets()
      
      setIsCreateDialogOpen(false)
      setNewPresetName('')
      setNewPresetDescription('')
      
      const newPresetId = result.id
      
      if (onPresetCreated && newPresetId) {
        onPresetCreated(newPresetId)
      }
      
      if (newPresetId) {
        const newPreset = await bridgeService.loadGeekPreset(newPresetId)
        if (newPreset) {
          onLoadPreset(newPreset.args, newPresetId)
          
          if (onShowToast) {
            onShowToast(t('env.geekMode.presetCreateSuccess', { name: newPresetName }), 'success')
          }
        }
      }
    } catch (error) {
      console.error('创建预设失败:', error)
      if (onShowToast) {
        onShowToast(t('preset.createFailed'), 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePreset = (preset: GeekPreset) => {
    setDeletingPreset(preset)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingPreset) return

    setIsLoading(true)
    try {
      const deletingPresetId = deletingPreset.id
      
      await bridgeService.deleteGeekPreset(deletingPresetId)
      await loadPresets()
      
      if (currentPresetId === deletingPresetId) {
        console.log('[GeekModePresets] 删除的是当前预设，切换到 Custom')
        
        const customPresetData = await bridgeService.loadGeekPreset('custom')
        if (customPresetData) {
          onLoadPreset(customPresetData.args, 'custom')
        } else {
          onLoadPreset('', 'custom')
        }
        
        if (onShowToast) {
          onShowToast(t('preset.switchedToUserConfig'), 'success')
        }
      } else {
        if (onShowToast) {
          onShowToast(t('preset.deleteSuccess'), 'success')
        }
      }
      
      setConfirmDeleteOpen(false)
      setDeletingPreset(null)
    } catch (error) {
      console.error('删除预设失败:', error)
      if (onShowToast) {
        onShowToast(t('preset.deleteFailed'), 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditPreset = (preset: GeekPreset) => {
    setEditingPreset(preset)
    setEditPresetName(preset.name)
    setEditPresetDescription(preset.description)
    setEditPresetArgs(preset.args)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingPreset) return
    
    if (!editPresetName.trim()) {
      alert(t('preset.enterName'))
      return
    }

    const duplicatePreset = presets.find(
      p => p.name === editPresetName && p.id !== editingPreset.id
    )

    if (duplicatePreset) {
      setOverwriteTargetPreset(duplicatePreset)
      setConfirmOverwriteOpen(true)
      return
    }

    await updatePreset()
  }

  const updatePreset = async () => {
    if (!editingPreset) return

    setIsLoading(true)
    try {
      await bridgeService.updateGeekPreset(
        editingPreset.id,
        editPresetName,
        editPresetDescription,
        editPresetArgs
      )
      
      await loadPresets()
      
      if (currentPresetId === editingPreset.id) {
        console.log('[GeekModePresets] 更新当前选中预设的参数')
        onLoadPreset(editPresetArgs, editingPreset.id)
      }
      
      setIsEditDialogOpen(false)
      setEditingPreset(null)
      setEditPresetName('')
      setEditPresetDescription('')
      setEditPresetArgs('')
      
      if (onShowToast) {
        onShowToast(t('preset.updateSuccess'), 'success')
      }
    } catch (error) {
      console.error('更新预设失败:', error)
      if (onShowToast) {
        onShowToast(t('preset.updateFailed'), 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmOverwrite = async () => {
    if (!overwriteTargetPreset) return
    
    setIsLoading(true)
    try {
      if (editingPreset) {
        await bridgeService.updateGeekPreset(
          overwriteTargetPreset.id,
          editPresetName,
          editPresetDescription,
          editPresetArgs
        )
        
        if (editingPreset.id !== CUSTOM_PRESET_ID) {
          await bridgeService.deleteGeekPreset(editingPreset.id)
        }
        
        await loadPresets()
        setConfirmOverwriteOpen(false)
        setIsEditDialogOpen(false)
        setEditingPreset(null)
        setEditPresetName('')
        setEditPresetDescription('')
        setEditPresetArgs('')
      } else {
        await bridgeService.updateGeekPreset(
          overwriteTargetPreset.id,
          newPresetName,
          newPresetDescription,
          currentArgs
        )
        
        await loadPresets()
        setConfirmOverwriteOpen(false)
        setIsCreateDialogOpen(false)
        setNewPresetName('')
        setNewPresetDescription('')
      }
    } catch (error) {
      console.error('覆盖预设失败:', error)
      alert(t('preset.overrideFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t("env.geekMode.myPresets")}</h3>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          size="sm"
          variant="outline"
        >
          <Save className="mr-2 size-4" />
          {t('env.geekMode.saveAsPreset')}
        </Button>
      </div>

      {/* 预设列表 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {allPresets.map((preset) => {
          const isCustom = preset.id === CUSTOM_PRESET_ID
          const isSelected = currentPresetId === preset.id

          return (
            <Card
              key={preset.id}
              className={`cursor-pointer p-4 transition-shadow hover:shadow-md ${
                isSelected
                  ? 'bg-primary/5 ring-2 ring-primary'
                  : ''
              }`}
              onClick={() => handleLoadPreset(preset)}
            >
              <div className="space-y-3">
                <div>
                  <h4 className="flex items-center gap-2 text-base font-medium">
                    {isCustom && <Settings className="text-primary size-4" />}
                    {preset.name}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {preset.description || t('preset.noDescription')}
                  </p>
                </div>
                {!isCustom && (
                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLoadPreset(preset)
                      }}
                      size="sm"
                      variant="default"
                      className="flex-1"
                    >
                      <Download className="mr-2 size-4" />
                      {t('env.geekMode.load')}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditPreset(preset)
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePreset(preset)
                      }}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* 保存为预设对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && setIsCreateDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.saveGeekPreset')}</DialogTitle>
            <DialogDescription>{t('env.geekMode.saveAsPresetDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="preset-name" className="text-sm font-medium">
                {t('env.geekMode.presetName')} *
              </label>
              <Input
                id="preset-name"
                value={newPresetName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPresetName(e.target.value)}
                placeholder={t("common.placeholder.presetNameExample")}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="preset-description" className="text-sm font-medium">
                {t('env.geekMode.presetDesc')}
              </label>
              <Textarea
                id="preset-description"
                value={newPresetDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewPresetDescription(e.target.value)}
                placeholder={t("common.placeholder.presetDescExample")}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleCreatePreset}
                disabled={isLoading}
              >
                {isLoading ? t('env.geekMode.creating') : t('common.add')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑预设对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && setIsEditDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.editGeekPreset')}</DialogTitle>
            <DialogDescription>{t('env.geekMode.editPresetDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-preset-name" className="text-sm font-medium">
                {t('env.geekMode.presetName')} *
              </label>
              <Input
                id="edit-preset-name"
                value={editPresetName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditPresetName(e.target.value)}
                placeholder={t("common.placeholder.presetNameExample")}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-preset-description" className="text-sm font-medium">
                {t('env.geekMode.presetDesc')}
              </label>
              <Textarea
                id="edit-preset-description"
                value={editPresetDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditPresetDescription(e.target.value)}
                placeholder={t("common.placeholder.presetDescExample")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-preset-args" className="text-sm font-medium">
                {t('env.geekMode.startupArgs')} *
              </label>
              <Textarea
                id="edit-preset-args"
                value={editPresetArgs}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditPresetArgs(e.target.value)}
                placeholder={t("common.placeholder.argsPerLine")}
                rows={8}
                className="font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isLoading}
              >
                {isLoading ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 覆盖确认对话框 */}
      <Dialog open={confirmOverwriteOpen} onOpenChange={(open) => !open && setConfirmOverwriteOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.confirmOverride')}</DialogTitle>
            <DialogDescription>{t('env.geekMode.overwriteConfirmDesc', { name: editingPreset ? editPresetName : newPresetName })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('env.geekMode.overwriteWarning')}
            </p>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setConfirmOverwriteOpen(false)}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmOverwrite}
                disabled={isLoading}
              >
                {isLoading ? t('env.geekMode.overwriting') : t('env.geekMode.confirmOverwrite')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={confirmDeleteOpen} onOpenChange={(open) => !open && setConfirmDeleteOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.confirmDeletePreset')}</DialogTitle>
            <DialogDescription>{deletingPreset ? t('env.geekMode.deleteConfirmDesc', { name: deletingPreset.name }) : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('env.geekMode.deleteWarning')}
            </p>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isLoading}
              >
                {isLoading ? t('env.geekMode.deleting') : t('preset.confirmDeleteBtn')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 预设切换确认对话框 */}
      <Dialog open={confirmSwitchOpen} onOpenChange={(open) => !open && handleCancelSwitch()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.switchPreset')}</DialogTitle>
            <DialogDescription>{pendingPreset ? t('env.geekMode.switchConfirmDesc', { name: pendingPreset.name }) : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('env.geekMode.switchWarning')}
            </p>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCancelSwitch}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleConfirmSwitch}
                disabled={isLoading}
              >
                {isLoading ? t('env.geekMode.switching') : t('env.geekMode.confirmSwitch')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
