/**
 * 工作流设置模态框组件
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { FolderOpen, Loader2, AlertTriangle, Zap } from 'lucide-react'
import { bridgeService } from '@/services/bridge'
import { workflowConfigApi } from '@/api/workflow'
import { useEnvStore } from '@/stores/useEnvStore'
import { useWorkflowStore } from '@/stores/useWorkflowStore'

interface WorkflowSettingsModalProps {
  open: boolean
  onClose: () => void
}

export function WorkflowSettingsModal({ open, onClose }: WorkflowSettingsModalProps) {
  const { t } = useTranslation()
  const environments = useEnvStore(state => state.environments)
  const currentEnvId = useEnvStore(state => state.currentEnvId)
  const refreshWorkflows = useWorkflowStore(state => state.refreshWorkflows)
  const saveEnvConfig = useEnvStore(state => state.saveEnvConfig)

  const [useGlobalPath, setUseGlobalPath] = useState(false)
  const [globalPath, setGlobalPath] = useState('')
  const [envPaths, setEnvPaths] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [injecting, setInjecting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const confirmActionRef = useRef<(() => void) | null>(null)
  const [confirmMessage, setConfirmMessage] = useState('')

  const currentEnvPath = useMemo(() => {
    return envPaths[currentEnvId || ''] || ''
  }, [envPaths, currentEnvId])

  const currentEnv = useMemo(() => {
    return environments.find(e => e.id === currentEnvId)
  }, [environments, currentEnvId])

  const isDesktopEnv = useMemo(() => {
    return currentEnv?.envType === 'desktop'
  }, [currentEnv])

  const activePath = useMemo(() => {
    return useGlobalPath ? globalPath : currentEnvPath
  }, [useGlobalPath, globalPath, currentEnvPath])

  const canInjectUserDirectory = useMemo(() => {
    if (!activePath) return false
    const normalized = activePath.replace(/\\/g, '/')
    return normalized.endsWith('/default/workflows')
  }, [activePath])

  const userDirectoryValue = useMemo(() => {
    if (!canInjectUserDirectory || !activePath) return ''
    const normalized = activePath.replace(/\\/g, '/')
    return normalized.replace(/\/default\/workflows\/?$/, '')
  }, [canInjectUserDirectory, activePath])

  const isUserDirectoryInjected = useMemo(() => {
    if (!userDirectoryValue) return false
    const value = userDirectoryValue.replace(/\//g, '\\')
    const checkEnvs = useGlobalPath
      ? environments.filter(e => e.envType !== 'desktop')
      : currentEnv ? [currentEnv] : []
    if (checkEnvs.length === 0) return false
    return checkEnvs.every(env => env.acceleration?.userDirectory === value || env.acceleration?.userDirectory === userDirectoryValue)
  }, [currentEnv, environments, userDirectoryValue, useGlobalPath])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const config = await workflowConfigApi.getConfig()
      if (config) {
        setUseGlobalPath(config.use_global_path ?? false)
        setGlobalPath(config.global_path ?? '')
        setEnvPaths(config.env_paths ?? {})
      }
    } catch (error) {
      console.error('加载工作流配置失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadConfig()
    }
  }, [open, currentEnvId])

  const handleBrowse = async (isGlobal: boolean) => {
    try {
      const result = await bridgeService.selectDirectory()
      if (result.success && result.path) {
        if (isGlobal) {
          if (result.path !== globalPath) {
            setConfirmMessage(t('workflow.settings.confirmPathChange'))
            confirmActionRef.current = () => {
              setGlobalPath(result.path!)
              setShowConfirm(false)
            }
            setShowConfirm(true)
          }
        } else {
          if (result.path !== currentEnvPath) {
            setConfirmMessage(t('workflow.settings.confirmPathChange'))
            confirmActionRef.current = () => {
              setEnvPaths(prev => ({ ...prev, [currentEnvId!]: result.path! }))
              setShowConfirm(false)
            }
            setShowConfirm(true)
          }
        }
      }
    } catch (error) {
      console.error('浏览文件夹失败:', error)
    }
  }

  const handleGlobalSwitchChange = (checked: boolean) => {
    if (checked && !useGlobalPath) {
      setConfirmMessage(t('workflow.settings.confirmEnableGlobal'))
      confirmActionRef.current = () => {
        setUseGlobalPath(true)
        setShowConfirm(false)
      }
      setShowConfirm(true)
    } else if (!checked && useGlobalPath) {
      setConfirmMessage(t('workflow.settings.confirmDisableGlobal'))
      confirmActionRef.current = () => {
        setUseGlobalPath(false)
        setShowConfirm(false)
      }
      setShowConfirm(true)
    }
  }

  const handleInjectUserDirectory = async () => {
    if (!userDirectoryValue) return

    if (useGlobalPath) {
      setConfirmMessage(t('workflow.settings.confirmInjectAllEnvs'))
      confirmActionRef.current = () => {
        doInjectAllEnvironments()
        setShowConfirm(false)
      }
      setShowConfirm(true)
      return
    }

    if (!currentEnvId) return
    setInjecting(true)
    try {
      await saveEnvConfig(currentEnvId, {
        acceleration: {
          userDirectory: userDirectoryValue.replace(/\//g, '\\')
        }
      } as any)
    } catch (error) {
      console.error('注入 --user-directory 失败:', error)
    } finally {
      setInjecting(false)
    }
  }

  const doInjectAllEnvironments = async () => {
    setInjecting(true)
    try {
      const value = userDirectoryValue.replace(/\//g, '\\')
      for (const env of environments) {
        if (env.envType === 'desktop') continue
        try {
          await saveEnvConfig(env.id, {
            acceleration: { userDirectory: value }
          } as any)
        } catch (e) {
          console.error(`注入环境 ${env.alias} 失败:`, e)
        }
      }
    } finally {
      setInjecting(false)
    }
  }

  const handleSave = async () => {
    if (useGlobalPath && !globalPath.trim()) {
      return
    }
    if (!useGlobalPath) {
      const path = envPaths[currentEnvId || '']
      if (!path?.trim()) {
        return
      }
    }

    setSaving(true)
    try {
      if (useGlobalPath) {
        await workflowConfigApi.setGlobalPath(globalPath)
        await workflowConfigApi.setUseGlobalPath(true)
      } else {
        await workflowConfigApi.setUseGlobalPath(false)
        for (const [envId, path] of Object.entries(envPaths)) {
          if (path) {
            await workflowConfigApi.setEnvPath(envId, path)
          }
        }
      }
      refreshWorkflows()
      onClose()
    } catch (error) {
      console.error('保存工作流配置失败:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) onClose()
  }

  const renderInjectButton = () => {
    if (!canInjectUserDirectory || isDesktopEnv) return null
    if (isUserDirectoryInjected) {
      return (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 p-2">
          <Zap className="size-4 shrink-0 text-green-500" />
          <span className="text-xs text-green-600">
            {t('workflow.settings.userDirectoryInjected')}
          </span>
        </div>
      )
    }
    return (
      <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-2">
        <span className="text-xs text-blue-600">
          {t('workflow.settings.canInjectUserDirectory')}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleInjectUserDirectory}
          disabled={injecting}
          className="shrink-0 border-blue-500/30 text-blue-600 hover:bg-blue-500/10 hover:text-blue-700"
        >
          {injecting ? (
            <Loader2 className="mr-1 size-3 animate-spin" />
          ) : (
            <Zap className="mr-1 size-3" />
          )}
          {t('workflow.settings.injectUserDirectory')}
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('workflow.settings.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-foreground">
                    {t('workflow.settings.useGlobalPath')}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {t('workflow.settings.useGlobalPathDesc')}
                  </span>
                </div>
                <Switch
                  checked={useGlobalPath}
                  onCheckedChange={handleGlobalSwitchChange}
                  disabled={saving}
                />
              </div>

              {useGlobalPath ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    {t('workflow.settings.globalPath')}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={t('workflow.settings.pathPlaceholder')}
                      value={globalPath}
                      onChange={(e) => setGlobalPath(e.target.value)}
                      className="flex-1"
                      disabled={saving}
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleBrowse(true)}
                      className="shrink-0"
                      disabled={saving}
                    >
                      <FolderOpen className="size-4" />
                    </Button>
                  </div>
                  {globalPath && !canInjectUserDirectory && (
                    <div className="mt-2 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-500" />
                      <span className="text-xs text-yellow-600">
                        {t('workflow.settings.pathNotCompliant')}
                      </span>
                    </div>
                  )}
                  {renderInjectButton()}
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                      {t('workflow.settings.currentEnv')}
                    </label>
                    <Badge variant="secondary" className="text-sm">
                      {currentEnv?.alias || currentEnv?.name || '-'}
                    </Badge>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                      {t('workflow.settings.envPath')}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder={t('workflow.settings.pathPlaceholder')}
                        value={currentEnvPath}
                        onChange={(e) => {
                          if (currentEnvId) {
                            setEnvPaths(prev => ({ ...prev, [currentEnvId]: e.target.value }))
                          }
                        }}
                        className="flex-1"
                        disabled={saving}
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleBrowse(false)}
                        className="shrink-0"
                        disabled={saving}
                      >
                        <FolderOpen className="size-4" />
                      </Button>
                    </div>
                    {isDesktopEnv && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-500" />
                        <span className="text-xs text-yellow-600">
                          {t('workflow.settings.desktopEnvWarning')}
                        </span>
                      </div>
                    )}
                    {currentEnvPath && !canInjectUserDirectory && !isDesktopEnv && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-500" />
                        <span className="text-xs text-yellow-600">
                          {t('workflow.settings.pathNotCompliant')}
                        </span>
                      </div>
                    )}
                    {renderInjectButton()}
                  </div>
                </>
              )}

              <div className="flex items-start gap-2 rounded-md border border-border bg-surface-active p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t('workflow.settings.pathChangeWarning')}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('common.save')
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {showConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="mx-4 max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-yellow-500" />
                <div className="space-y-3">
                  <p className="text-sm text-foreground">{confirmMessage}</p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirm(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => confirmActionRef.current?.()}
                    >
                      {t('common.confirm')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
