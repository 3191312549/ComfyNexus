import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Save, Terminal, Settings } from 'lucide-react'
import { TabContainer } from '@/components/env/TabContainer'
import { NavIsland } from '@/components/env'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { Toast } from '@/components/ui/Toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useEnvStore } from '@/stores/useEnvStore'
import { useNavigationGuard } from '@/contexts/NavigationGuardContext'
import { useEnvSwitchGuard } from '@/contexts/EnvSwitchGuardContext'
import { EnvRequiredGuide } from '@/components/common/EnvRequiredGuide'
import type { EnvironmentConfig } from '@/types/environment'
import { AccelerationTabRef } from '@/components/env/AccelerationTab'
import { bridgeService } from '@/services/bridge'
import { cn } from '@/lib/utils'

export default function EnvManagePage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { registerGuard, unregisterGuard } = useNavigationGuard()
  const { registerGuard: registerEnvSwitchGuard, unregisterGuard: unregisterEnvSwitchGuard } = useEnvSwitchGuard()
  const {
    environments,
    currentEnvId,
    loading,
    error,
    switchEnvironment,
    saveEnvConfig,
    getDependencies,
    getEnvConfig
  } = useEnvStore()

  const [activeTab, setActiveTab] = useState<'general' | 'acceleration' | 'modelPaths' | 'advancedEnv'>('general')
  const tabContainerRef = useRef<AccelerationTabRef>(null)
  const [currentConfig, setCurrentConfig] = useState<EnvironmentConfig | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')
  
  const [showCreatePresetDialog, setShowCreatePresetDialog] = useState(false)
  const [showManagePresetsDialog, setShowManagePresetsDialog] = useState(false)
  const [showPresetConfirmDialog, setShowPresetConfirmDialog] = useState(false)
  const [showExportPresetDialog, setShowExportPresetDialog] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDescription, setNewPresetDescription] = useState('')
  const [newPresetVramRequirement, setNewPresetVramRequirement] = useState('')
  const [isCreatingPreset, setIsCreatingPreset] = useState(false)
  const [presets, setPresets] = useState<any[]>([])
  const [editingPreset, setEditingPreset] = useState<any | null>(null)
  const [isGeekModeForPreset, setIsGeekModeForPreset] = useState(false)
  const [pendingPresetConfig, setPendingPresetConfig] = useState<Record<string, unknown> | null>(null)
  const [pendingPresetName, setPendingPresetName] = useState('')
  const [pendingPresetId, setPendingPresetId] = useState('')
  const [exportSelectedPresetIds, setExportSelectedPresetIds] = useState<Set<string>>(new Set())
  const [showImportPresetDialog, setShowImportPresetDialog] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any | null>(null)
  
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const isNavigatingRef = useRef(false)
  const pendingNavigationRef = useRef<string | null>(null)
  
  const [showEnvSwitchConfirm, setShowEnvSwitchConfirm] = useState(false)
  const pendingEnvIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (currentEnvId) {
      const env = environments.find(e => e.id === currentEnvId)
      if (env) {
        setCurrentConfig(env)
        setHasUnsavedChanges(false)
      }
    }
  }, [currentEnvId, environments])

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        e.preventDefault()
        setShowLeaveConfirm(true)
        window.history.pushState(null, '', location.pathname)
      }
    }

    if (hasUnsavedChanges) {
      window.history.pushState(null, '', location.pathname)
      window.addEventListener('popstate', handlePopState)
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [hasUnsavedChanges, location.pathname])

  useEffect(() => {
    const guard = {
      beforeNavigate: (path: string): boolean => {
        if (!hasUnsavedChanges || isNavigatingRef.current) {
          return true
        }

        if (path === location.pathname) {
          return true
        }

        pendingNavigationRef.current = path
        setShowLeaveConfirm(true)
        return false
      }
    }

    registerGuard(guard)

    return () => {
      unregisterGuard()
    }
  }, [hasUnsavedChanges, location.pathname, registerGuard, unregisterGuard])

  useEffect(() => {
    const envSwitchGuard = {
      beforeSwitch: async (targetEnvId: string): Promise<boolean> => {
        if (!hasUnsavedChanges) {
          return true
        }

        if (targetEnvId === currentEnvId) {
          return true
        }

        pendingEnvIdRef.current = targetEnvId
        setShowEnvSwitchConfirm(true)
        return false
      }
    }

    registerEnvSwitchGuard(envSwitchGuard)

    return () => {
      unregisterEnvSwitchGuard()
    }
  }, [hasUnsavedChanges, currentEnvId, registerEnvSwitchGuard, unregisterEnvSwitchGuard])

  const showSuccessToast = (message: string) => {
    setToastMessage(message)
    setToastVariant('success')
    setShowToast(true)
  }

  const showErrorToast = (message: string) => {
    setToastMessage(message)
    setToastVariant('error')
    setShowToast(true)
  }

  const handleConfigChange = async (changes: Partial<EnvironmentConfig>) => {
    console.log('[EnvManagePage] handleConfigChange 接收到变更:', changes)
    
    if (currentConfig) {
      const newConfig = {
        ...currentConfig,
        ...changes,
        ...(changes.acceleration && {
          acceleration: {
            ...currentConfig.acceleration,
            ...changes.acceleration
          }
        })
      }
      
      setCurrentConfig(newConfig)
      
      const isGeekModeToggle = changes.acceleration?.geekMode?.enabled !== undefined &&
                               changes.acceleration.geekMode.enabled !== currentConfig.acceleration?.geekMode?.enabled
      
      if (isGeekModeToggle && currentEnvId) {
        console.log('[EnvManagePage] 检测到极客模式切换，立即保存配置')
        try {
          await saveEnvConfig(currentEnvId, newConfig)
          console.log('[EnvManagePage] 极客模式状态已保存')
          setHasUnsavedChanges(false)
        } catch (err) {
          console.error('[EnvManagePage] 保存极客模式状态失败:', err)
          showErrorToast(t('env.geekMode.saveStateFailed'))
        }
      } else {
        setHasUnsavedChanges(true)
      }
    }
  }

  const handleSaveConfigClick = async () => {
    if (!currentConfig || !currentEnvId) {
      console.warn('[EnvManagePage] 保存配置失败: 缺少配置或环境ID')
      return
    }

    console.log('[EnvManagePage] 保存配置 - 当前配置:', currentConfig)
    
    try {
      await saveEnvConfig(currentEnvId, currentConfig)
      setHasUnsavedChanges(false)
      showSuccessToast(t('env.saveSuccess'))
      console.log('[EnvManagePage] 配置保存成功')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('env.configSaveFailed')
      console.error('[EnvManagePage] 配置保存失败:', err)
      showErrorToast(errorMessage)
    }
  }

  const handlePresetSelect = (presetId: string, presetConfig: Record<string, unknown>, presetName?: string) => {
    if (!currentConfig) return
    
    setPendingPresetId(presetId)
    setPendingPresetConfig(presetConfig)
    setPendingPresetName(presetName || '')
    setShowPresetConfirmDialog(true)
  }

  const handlePresetConfirmSave = async () => {
    if (!pendingPresetConfig || !currentConfig || !currentEnvId) return
    
    console.log('[EnvManagePage] 确认应用预设配置')
    
    // 应用预设配置
    const newConfig = {
      ...currentConfig,
      acceleration: {
        ...currentConfig.acceleration,
        ...pendingPresetConfig,
        geekMode: currentConfig.acceleration?.geekMode
      }
    }
    
    setCurrentConfig(newConfig)
    setShowPresetConfirmDialog(false)
    setPendingPresetConfig(null)
    setPendingPresetName('')
    
    // 自动保存到后端
    try {
      await saveEnvConfig(currentEnvId, newConfig)
      setHasUnsavedChanges(false)
      showSuccessToast(t('env.preset.appliedAndSaved'))
      console.log('[EnvManagePage] 预设配置已自动保存')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('env.configSaveFailed')
      console.error('[EnvManagePage] 自动保存预设配置失败:', err)
      showErrorToast(errorMessage)
    }
  }

  const handlePresetConfirmCancel = () => {
    console.log('[EnvManagePage] 取消应用预设')
    setShowPresetConfirmDialog(false)
    setPendingPresetId('')
    setPendingPresetConfig(null)
    setPendingPresetName('')
  }

  const handleExportPreset = async () => {
    if (exportSelectedPresetIds.size === 0 || !currentEnvId) return

    try {
      const selectedPresets = presets.filter(p => exportSelectedPresetIds.has(p.id))
      
      if (selectedPresets.length === 1) {
        const preset = selectedPresets[0]
        const safeName = preset.name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_')
        const defaultName = `${safeName}_preset.json`
        const saveResult = await bridgeService.saveFileDialog(defaultName, 'JSON files (*.json)')
        
        if (saveResult.success && saveResult.path) {
          const result = await bridgeService.batchExportPresets([preset], saveResult.path)
          if (result.success) {
            showSuccessToast(t('preset.exportSuccess'))
            setShowExportPresetDialog(false)
            setExportSelectedPresetIds(new Set())
          } else {
            showErrorToast(result.error_message || t('preset.exportFailed'))
          }
        }
      } else {
        const defaultName = `presets_export.zip`
        const saveResult = await bridgeService.saveFileDialog(defaultName, 'ZIP files (*.zip)')
        
        if (saveResult.success && saveResult.path) {
          const result = await bridgeService.batchExportPresets(selectedPresets, saveResult.path)
          if (result.success) {
            showSuccessToast(t('preset.exportSuccess'))
            setShowExportPresetDialog(false)
            setExportSelectedPresetIds(new Set())
          } else {
            showErrorToast(result.error_message || t('preset.exportFailed'))
          }
        }
      }
    } catch (err) {
      console.error('[EnvManagePage] 导出预设失败:', err)
      showErrorToast(t('preset.exportFailed'))
    }
  }

  const handleImportPreset = async (file: File) => {
    if (!currentEnvId) {
      showErrorToast(t('preset.selectEnvFirst'))
      return
    }

    try {
      const text = await file.text()
      const presetData = JSON.parse(text)
      
      if (!presetData.id || !presetData.name || !presetData.config) {
        showErrorToast(t('preset.fileFormatInvalid'))
        return
      }

      const result = await bridgeService.importPreset(presetData, currentEnvId)
      
      if (result.success) {
        const presetName = result.data?.preset_name || presetData.name
        showSuccessToast(t('preset.importSuccess', { name: presetName }))
        setShowImportPresetDialog(false)
        setImportFile(null)
        setImportPreview(null)
        // 重新加载预设列表
        const presetsResult = await bridgeService.getAllPresets()
        if (presetsResult && presetsResult.data) {
          setPresets(presetsResult.data)
        }
      } else {
        showErrorToast(result.error_message || t('preset.importFailed'))
      }
    } catch (err) {
      console.error('[EnvManagePage] 导入预设失败:', err)
      showErrorToast(t('preset.importFailed'))
    }
  }

  const handleProcessImportFile = (file: File) => {
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        setImportPreview(data)
      } catch (error) {
        console.error('Failed to parse preset file:', error)
      }
    }
    reader.readAsText(file)
  }

  const handleCreatePreset = (name: string, description: string, vramRequirement: string) => {
    setNewPresetName(name)
    setNewPresetDescription(description)
    setNewPresetVramRequirement(vramRequirement)
    setShowCreatePresetDialog(true)
  }

  const handleConfirmCreatePreset = async () => {
    if (!currentConfig || !currentEnvId) return
    if (!newPresetName.trim()) {
      showErrorToast(t('preset.enterName'))
      return
    }

    setIsCreatingPreset(true)
    try {
      if (isGeekModeForPreset) {
        const presetId = editingPreset?.id || `geek_${Date.now()}`
        const geekArgs = currentConfig.acceleration?.geekMode?.customArgs || ''
        
        if (editingPreset) {
          await bridgeService.createGeekPreset(newPresetName, newPresetDescription, geekArgs, presetId)
        } else {
          await bridgeService.createGeekPreset(newPresetName, newPresetDescription, geekArgs, presetId)
        }
        setEditingPreset(null)
        setIsGeekModeForPreset(false)
      } else {
        if (editingPreset) {
          await bridgeService.updateCustomPreset(editingPreset.id, {
            name: newPresetName,
            description: newPresetDescription,
            vram_requirement: newPresetVramRequirement || '自定义',
            config: currentConfig.acceleration
          })
          setEditingPreset(null)
        } else {
          const presetId = `custom_${Date.now()}`
          
          const presetData = {
            id: presetId,
            name: newPresetName,
            description: newPresetDescription,
            vram_requirement: newPresetVramRequirement || '自定义',
            type: 'custom',
            config: currentConfig.acceleration
          }
          
          await bridgeService.createCustomPreset(currentEnvId, presetId, newPresetName, newPresetDescription)
          await bridgeService.updateCustomPreset(presetId, presetData)
        }
      }
      
      setShowCreatePresetDialog(false)
      setNewPresetName('')
      setNewPresetDescription('')
      setNewPresetVramRequirement('')
      
      setTimeout(() => {
        if (tabContainerRef.current) {
          tabContainerRef.current.reloadPresets?.()
        }
      }, 100)
      
      showSuccessToast(editingPreset ? t('preset.updateSuccess') : t('preset.createSuccess'))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('env.preset.createFailed')
      showErrorToast(errorMessage)
    } finally {
      setIsCreatingPreset(false)
    }
  }

  const handleEditPreset = async (presetId: string, name: string, description: string, vramRequirement: string) => {
    try {
      await bridgeService.updateCustomPreset(presetId, {
        name,
        description,
        vram_requirement: vramRequirement
      })
      
      setTimeout(() => {
        if (tabContainerRef.current) {
          tabContainerRef.current.reloadPresets?.()
        }
      }, 100)
      
      showSuccessToast(t('preset.updateSuccess'))
    } catch (err) {
      console.error('[EnvManagePage] 更新预设失败:', err)
      showErrorToast(t('preset.updateFailed'))
    }
  }

  const handleDeletePreset = async (presetId: string) => {
    try {
      const result = await bridgeService.deleteCustomPreset(presetId)
      if (result.success) {
        showSuccessToast(t('preset.deleteSuccess'))
        setTimeout(() => {
          if (tabContainerRef.current) {
            tabContainerRef.current.reloadPresets?.()
          }
        }, 100)
      } else {
        showErrorToast(result.error_message || t('preset.deleteFailed'))
      }
    } catch (err) {
      console.error('[EnvManagePage] 删除预设失败:', err)
      showErrorToast(t('preset.deleteFailed'))
    }
  }

  const handleRefreshDependencies = async () => {
    if (!currentEnvId) return

    try {
      const deps = await getDependencies(currentEnvId)
      if (currentConfig) {
        setCurrentConfig({
          ...currentConfig,
          dependencies: deps
        })
      }
    } catch (_err) {
      showErrorToast(error || 'Failed to refresh dependencies')
    }
  }

  const handleLeaveConfirmSave = async () => {
    if (!currentConfig || !currentEnvId) return

    try {
      await saveEnvConfig(currentEnvId, currentConfig)
      
      setHasUnsavedChanges(false)
      setShowLeaveConfirm(false)
      isNavigatingRef.current = true
      
      showSuccessToast(t('env.geekMode.saveSuccess'))
      
      if (pendingNavigationRef.current) {
        const targetPath = pendingNavigationRef.current
        pendingNavigationRef.current = null
        setTimeout(() => {
          navigate(targetPath)
        }, 100)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('env.configSaveFailed')
      showErrorToast(errorMessage)
    }
  }

  const handleLeaveConfirmDiscard = () => {
    setHasUnsavedChanges(false)
    setShowLeaveConfirm(false)
    isNavigatingRef.current = true
    
    if (pendingNavigationRef.current) {
      const targetPath = pendingNavigationRef.current
      pendingNavigationRef.current = null
      navigate(targetPath)
    }
  }

  const handleLeaveConfirmCancel = () => {
    setShowLeaveConfirm(false)
    pendingNavigationRef.current = null
  }

  const handleEnvSwitchConfirmSave = async () => {
    if (!currentConfig || !currentEnvId) return

    try {
      await saveEnvConfig(currentEnvId, currentConfig)
      
      setHasUnsavedChanges(false)
      setShowEnvSwitchConfirm(false)
      
      showSuccessToast(t('env.geekMode.saveSuccess'))
      
      if (pendingEnvIdRef.current) {
        const targetEnvId = pendingEnvIdRef.current
        pendingEnvIdRef.current = null
        await switchEnvironment(targetEnvId)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('env.configSaveFailed')
      showErrorToast(errorMessage)
    }
  }

  const handleEnvSwitchConfirmDiscard = async () => {
    setHasUnsavedChanges(false)
    setShowEnvSwitchConfirm(false)
    
    if (pendingEnvIdRef.current) {
      const targetEnvId = pendingEnvIdRef.current
      pendingEnvIdRef.current = null
      await switchEnvironment(targetEnvId)
    }
  }

  const handleEnvSwitchConfirmCancel = () => {
    setShowEnvSwitchConfirm(false)
    pendingEnvIdRef.current = null
  }

  if (loading && !currentConfig) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (!currentConfig) {
    return (
      <EnvRequiredGuide 
        icon={<Settings className="size-24 text-muted-foreground" />}
      />
    )
  }

  const tabs = [
    { id: 'general' as const, label: t('env.tabs.general') },
    { id: 'acceleration' as const, label: t('env.tabs.acceleration') },
    { id: 'modelPaths' as const, label: t('env.tabs.modelPaths') },
    { id: 'advancedEnv' as const, label: t('env.tabs.advancedEnv') },
  ]

  return (
    <div className="h-full overflow-auto bg-background">
      <header className="sticky top-0 z-20 px-8 py-8 flex items-center justify-between bg-background/50 backdrop-blur-xl border-b border-border-subtle/50 shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-3">
            {t('env.title')}
            <span className="inline-flex items-center rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
              ACTIVE
            </span>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">{t('env.subtitle')}</p>
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2">
          <NavIsland
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as typeof activeTab)}
          />
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'acceleration' && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (tabContainerRef.current) {
                  const currentState = tabContainerRef.current.getGeekModeState()
                  
                  if (currentState.hasUnsavedChanges && currentState.enabled) {
                    const confirmed = window.confirm(t('env.geekMode.switchConfirm'))
                    if (!confirmed) {
                      return
                    }
                  }
                  
                  if (currentEnvId) {
                    try {
                      const env = await getEnvConfig(currentEnvId)
                      if (env) {
                        setCurrentConfig(env)
                      }
                    } catch (err) {
                      console.error('[EnvManagePage] 重新加载配置失败:', err)
                    }
                  }
                  
                  tabContainerRef.current?.toggleGeekMode(!currentState.enabled)
                }
              }}
            >
              <Terminal className="mr-1.5 size-4" />
              {t('env.geekMode.title')}
            </Button>
          )}
          
          <Button
            onClick={handleSaveConfigClick}
            disabled={!hasUnsavedChanges || loading}
            size="sm"
          >
            {loading ? (
              <>
                <div className="border-white mr-2 size-4 animate-spin rounded-full border-2 border-t-transparent" />
                {t('common.saving') || '保存中...'}
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                {t('env.saveButton') || '保存配置'}
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-6">
        <TabContainer
            ref={tabContainerRef}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            config={currentConfig}
            currentEnvId={currentEnvId || undefined}
            onConfigChange={handleConfigChange}
            onRefreshDependencies={handleRefreshDependencies}
            onPresetSelect={handlePresetSelect}
            onShowToast={(message, variant) => {
              if (variant === 'success') {
                showSuccessToast(message)
              } else {
                showErrorToast(message)
              }
            }}
            onCreatePreset={handleCreatePreset}
            onEditPreset={handleEditPreset}
            onDeletePreset={handleDeletePreset}
            onSaveAsPreset={() => {
              const geekModeState = tabContainerRef.current?.getGeekModeState?.()
              setIsGeekModeForPreset(geekModeState?.enabled || false)
              setShowCreatePresetDialog(true)
            }}
            onManagePresets={async () => {
              const geekModeState = tabContainerRef.current?.getGeekModeState?.()
              setIsGeekModeForPreset(geekModeState?.enabled || false)
              
              try {
                if (geekModeState?.enabled) {
                  const result = await bridgeService.getGeekPresets()
                  if (result) {
                    setPresets(result.map((p: any) => ({
                      id: p.id,
                      name: p.name,
                      description: p.description || '',
                      vram_requirement: '',
                      type: 'custom' as const,
                      config: {}
                    })))
                  }
                } else {
                  const result = await bridgeService.getAllPresets()
                  if (result && result.data) {
                    setPresets(result.data)
                  }
                }
              } catch (err) {
                console.error('[EnvManagePage] 加载预设列表失败:', err)
              }
              setShowManagePresetsDialog(true)
            }}
          />
        </div>

        <Dialog open={showCreatePresetDialog} onOpenChange={(v) => {
        if (!v) {
          setShowCreatePresetDialog(false)
          setNewPresetName('')
          setNewPresetDescription('')
          setNewPresetVramRequirement('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.title.addPreset")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">{t("preset.presetName")}</label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder={t("common.placeholder.presetName")}
                spellCheck={false}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{t("preset.presetDesc")}</label>
              <Textarea
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                placeholder={t("common.placeholder.presetDesc")}
                rows={3}
                spellCheck={false}
                className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{t("preset.vramRequirement")}</label>
              <Input
                value={newPresetVramRequirement}
                onChange={(e) => setNewPresetVramRequirement(e.target.value)}
                placeholder={t('common.placeholder.vramExample')}
                spellCheck={false}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('preset.vramFormatHint')}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowCreatePresetDialog(false)
                setNewPresetName('')
                setNewPresetDescription('')
                setNewPresetVramRequirement('')
              }}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleConfirmCreatePreset} disabled={!newPresetName.trim() || isCreatingPreset}>
                {isCreatingPreset ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showManagePresetsDialog} onOpenChange={(v) => {
        if (!v) {
          setShowManagePresetsDialog(false)
          setEditingPreset(null)
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("preset.manageTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`p-4 rounded-lg border flex items-center justify-between ${
                  preset.type === 'builtin' 
                    ? 'bg-muted/30 border-border' 
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    preset.type === 'builtin' ? 'bg-primary/10' : 'bg-success/10'
                  }`}>
                    <span className={`text-sm font-bold ${
                      preset.type === 'builtin' ? 'text-primary' : 'text-success'
                    }`}>
                      {preset.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {preset.type === 'builtin' ? t('preset.builtinHint') : t('preset.customHint')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {preset.type === 'custom' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPreset(preset)
                          setNewPresetName(preset.name)
                          setNewPresetDescription(preset.description || '')
                          setNewPresetVramRequirement(preset.vram_requirement || '')
                          setShowManagePresetsDialog(false)
                          setShowCreatePresetDialog(true)
                          setIsGeekModeForPreset(isGeekModeForPreset)
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-danger"
                        onClick={async () => {
                          try {
                            if (isGeekModeForPreset) {
                              await bridgeService.deleteGeekPreset(preset.id)
                              showSuccessToast(t('preset.deleteSuccess'))
                              const result = await bridgeService.getGeekPresets()
                              if (result) {
                                setPresets(result.map((p: any) => ({
                                  id: p.id,
                                  name: p.name,
                                  description: p.description || '',
                                  vram_requirement: '',
                                  type: 'custom' as const,
                                  config: {}
                                })))
                              }
                            } else {
                              await bridgeService.deleteCustomPreset(preset.id)
                              showSuccessToast(t('preset.deleteSuccess'))
                              const result = await bridgeService.getAllPresets()
                              if (result && result.data) {
                                setPresets(result.data)
                              }
                            }
                          } catch (err) {
                            showErrorToast(t('preset.deleteFailed'))
                          }
                        }}
                      >
                        {t('common.delete')}
                      </Button>
                    </>
                  )}
                  {preset.type === 'builtin' && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                      {t('preset.builtinLabel')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => {
              setShowManagePresetsDialog(false)
              setShowImportPresetDialog(true)
            }}>
              {t('preset.importPreset')}
            </Button>
            <Button variant="outline" onClick={() => {
              setShowManagePresetsDialog(false)
              setShowExportPresetDialog(true)
            }}>
              {t('preset.exportPreset')}
            </Button>
            <Button onClick={() => setShowManagePresetsDialog(false)}>
              {t('common.done')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeaveConfirm} onOpenChange={(v) => !v && handleLeaveConfirmCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.title.saveChanges")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">{t("env.unsavedChanges")}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleLeaveConfirmCancel}>
                {t('env.continueEditing')}
              </Button>
              <Button variant="destructive" onClick={handleLeaveConfirmDiscard}>
                {t('env.discardChanges')}
              </Button>
              <Button onClick={handleLeaveConfirmSave}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEnvSwitchConfirm} onOpenChange={(v) => !v && handleEnvSwitchConfirmCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.title.saveChanges")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">{t("env.saveBeforeSwitch")}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleEnvSwitchConfirmCancel}>
                {t('env.continueEditing')}
              </Button>
              <Button variant="destructive" onClick={handleEnvSwitchConfirmDiscard}>
                {t('env.discardChanges')}
              </Button>
              <Button onClick={handleEnvSwitchConfirmSave}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPresetConfirmDialog} onOpenChange={(v) => !v && handlePresetConfirmCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("env.preset.confirmApplyTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {t('env.preset.confirmApplyPrefix')}<span className="text-warning font-semibold">{pendingPresetName}</span>{t('env.preset.confirmApplySuffix')}
            </p>
            {pendingPresetId === 'author' && (
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 space-y-2">
                <p className="text-sm text-warning font-medium">{t('env.preset.authorWarning.title')}</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>{t('env.preset.authorWarning.item1')}</li>
                  <li>{t('env.preset.authorWarning.item2')}</li>
                  <li>{t('env.preset.authorWarning.item3')}</li>
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handlePresetConfirmCancel}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handlePresetConfirmSave}>
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportPresetDialog} onOpenChange={(v) => !v && setShowExportPresetDialog(false)}>
        <DialogContent className="!max-w-md">
          <DialogHeader>
            <DialogTitle>{t("common.title.exportPreset")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 min-w-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">{t("preset.selectToExport")}</label>
                <span className="text-xs text-muted-foreground">
                  {t('preset.selectedCount', { count: exportSelectedPresetIds.size })}
                </span>
              </div>
              <div className="grid max-h-64 gap-1 overflow-y-auto min-w-0">
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors min-w-0",
                      exportSelectedPresetIds.has(preset.id) ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                    )}
                    onClick={() => {
                      setExportSelectedPresetIds(prev => {
                        const next = new Set(prev)
                        if (next.has(preset.id)) {
                          next.delete(preset.id)
                        } else {
                          next.add(preset.id)
                        }
                        return next
                      })
                    }}
                  >
                    <div className={cn(
                      "size-4 rounded border flex items-center justify-center shrink-0",
                      exportSelectedPresetIds.has(preset.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                    )}>
                      {exportSelectedPresetIds.has(preset.id) && (
                        <svg className="size-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{preset.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {preset.description || t('preset.noDescription')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExportPresetDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleExportPreset} disabled={exportSelectedPresetIds.size === 0}>
                {t('common.export')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportPresetDialog} onOpenChange={(v) => !v && setShowImportPresetDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.title.importPreset")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary"
              onClick={() => document.getElementById('import-preset-file')?.click()}
            >
              <input
                type="file"
                accept=".json"
                onChange={(e) => e.target.files?.[0] && handleProcessImportFile(e.target.files[0])}
                className="hidden"
                id="import-preset-file"
              />
              <div className="mx-auto mb-4 size-12 text-muted-foreground">📄</div>
              <p className="text-sm text-muted-foreground">
                点击选择文件或拖拽文件到这里
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                支持 .json 格式的预设文件
              </p>
            </div>

            {importPreview && (
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <h4 className="font-medium">{t("preset.preview")}</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">{t("preset.name")}:</span> {importPreview.name}</p>
                  <p><span className="font-medium">{t("preset.description")}:</span> {importPreview.description || t('preset.none')}</p>
                  <p><span className="font-medium">{t("preset.vramRequirement")}:</span> {importPreview.vram_requirement || 'N/A'}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportPresetDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => importFile && handleImportPreset(importFile)} disabled={!importFile}>
                {t('common.import')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showToast && (
        <Toast
          open={showToast}
          variant={toastVariant}
          description={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
