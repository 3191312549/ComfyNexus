import { useRef, forwardRef, useImperativeHandle, useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PresetManagerRef } from '@/components/settings/PresetManager'
import { PresetSelector } from './PresetSelector'
import { VRAMStrategySection } from './VRAMStrategySection'
import { PrecisionControlSection } from './PrecisionControlSection'
import { PerformanceSection } from './PerformanceSection'
import { AuxiliarySection } from './AuxiliarySection'
import { Cpu, Zap, Layers, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/Textarea'
import { bridgeService } from '@/services/bridge'
import { useEnvStore } from '@/stores/useEnvStore'
import type { AccelerationTabProps } from '@/types/environment'
import type { PresetConfig, GeekPreset } from '@/types/environment'
import { getPytorchBackendLabel } from '@/types/environment'

export interface AccelerationTabRef extends PresetManagerRef {
  getGeekModeState: () => { enabled: boolean; hasUnsavedChanges: boolean }
  toggleGeekMode: (enabled: boolean) => void
}

export const AccelerationTab = forwardRef<AccelerationTabRef, AccelerationTabProps & {
  onPresetSelect?: (presetId: string, presetConfig: Record<string, unknown>, presetName?: string) => void
  onShowToast?: (message: string, variant: 'success' | 'error') => void
  onCreatePreset?: (name: string, description: string, vramRequirement: string) => void
  onEditPreset?: (presetId: string, name: string, description: string, vramRequirement: string) => void
  onDeletePreset?: (presetId: string) => void
  onSaveAsPreset?: () => void
  onManagePresets?: () => void
}>(
  function AccelerationTab({
    config,
    currentEnvId,
    onConfigChange,
    onPresetSelect,
    onShowToast: _onShowToast,
    onCreatePreset: _onCreatePreset,
    onEditPreset: _onEditPreset,
    onDeletePreset: _onDeletePreset,
    onSaveAsPreset,
    onManagePresets
  }, ref) {
    const { t } = useTranslation()
    const { pytorchBackend } = useEnvStore()
    const presetManagerRef = useRef<PresetManagerRef>(null)

    const [geekModeEnabled, setGeekModeEnabled] = useState(false)
    const [geekModeArgs, setGeekModeArgs] = useState('')
    const [geekModeHasUnsavedChanges, setGeekModeHasUnsavedChanges] = useState(false)
    const [presets, setPresets] = useState<PresetConfig[]>([])
    const [geekPresets, setGeekPresets] = useState<GeekPreset[]>([])
    const [presetsLoading, setPresetsLoading] = useState(true)

    useEffect(() => {
      if (config.geekMode !== undefined) {
        setGeekModeEnabled(config.geekMode.enabled || false)
        setGeekModeArgs(config.geekMode.customArgs || '')
      }
    }, [config.geekMode])

    useEffect(() => {
      loadPresets()
    }, [])

    useEffect(() => {
      if (geekModeEnabled) {
        loadGeekPresets()
      }
    }, [geekModeEnabled])

    const loadPresets = async () => {
      try {
        const result = await bridgeService.getAllPresets()
        if (result && result.data) {
          setPresets(result.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            vramRequirement: p.vram_requirement || '',
            type: p.type || 'builtin',
            config: p.config || {}
          })))
        }
      } catch (err) {
        console.error('[AccelerationTab] 加载预设失败:', err)
      } finally {
        setPresetsLoading(false)
      }
    }

    const loadGeekPresets = async () => {
      try {
        const result = await bridgeService.getGeekPresets()
        if (result) {
          setGeekPresets(result)
        }
      } catch (err) {
        console.error('[AccelerationTab] 加载极客预设失败:', err)
      }
    }

    const handleGeekModeToggle = useCallback(async (enabled: boolean) => {
      if (enabled) {
        let initialArgs = ''
        
        if (config.geekMode?.customArgs) {
          initialArgs = config.geekMode.customArgs
        }
        
        setGeekModeEnabled(true)
        setGeekModeArgs(initialArgs)
        setGeekModeHasUnsavedChanges(false)
        
        onConfigChange({
          ...config,
          geekMode: {
            enabled: true,
            customArgs: initialArgs
          }
        })
      } else {
        setGeekModeEnabled(false)
        setGeekModeHasUnsavedChanges(false)
        
        onConfigChange({
          ...config,
          geekMode: {
            ...config.geekMode,
            enabled: false
          }
        })
      }
    }, [config, onConfigChange])

    useImperativeHandle(ref, () => ({
      openImportDialog: () => {
        presetManagerRef.current?.openImportDialog()
      },
      openExportDialog: () => {
        onManagePresets?.()
      },
      openCreatePresetDialog: () => {
        onSaveAsPreset?.()
      },
      reloadPresets: () => {
        if (geekModeEnabled) {
          loadGeekPresets()
        } else {
          loadPresets()
        }
      },
      getGeekModeState: () => ({
        enabled: geekModeEnabled,
        hasUnsavedChanges: geekModeHasUnsavedChanges
      }),
      toggleGeekMode: handleGeekModeToggle
    }), [geekModeEnabled, geekModeHasUnsavedChanges, handleGeekModeToggle, onSaveAsPreset, onManagePresets])

    const handleConfigChangeWrapper = (changes: Partial<typeof config>) => {
      onConfigChange(changes)
    }

    const handlePresetSelect = async (_presetId: string, presetConfig: Record<string, unknown>, presetName?: string) => {
      onPresetSelect?.(_presetId, presetConfig, presetName)
    }

    const handleGeekPresetSelect = async (presetId: string, _presetConfig: Record<string, unknown>) => {
      const preset = geekPresets.find(p => p.id === presetId)
      if (preset) {
        setGeekModeArgs(preset.args)
        onConfigChange({
          ...config,
          geekMode: {
            enabled: true,
            customArgs: preset.args
          }
        })
      }
    }

    const handleGeekModeArgsChange = (args: string) => {
      setGeekModeArgs(args)
      setGeekModeHasUnsavedChanges(true)
      
      onConfigChange({
        ...config,
        geekMode: {
          enabled: geekModeEnabled,
          customArgs: args
        }
      })
    }

    const handleSaveAsPresetClick = () => {
      onSaveAsPreset?.()
    }

    const handleManagePresetsClick = () => {
      onManagePresets?.()
    }

    const currentPresets: PresetConfig[] = useMemo(() => {
      if (geekModeEnabled) {
        return geekPresets.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          vramRequirement: '',
          type: 'custom' as const,
          config: {}
        }))
      }
      return presets
    }, [geekModeEnabled, geekPresets, presets])

    return (
      <div className="space-y-6">
        {!presetsLoading && (
          <PresetSelector
            presets={currentPresets}
            onPresetSelect={geekModeEnabled ? handleGeekPresetSelect : handlePresetSelect}
            onSaveAs={handleSaveAsPresetClick}
            onManage={handleManagePresetsClick}
            showGroups={!geekModeEnabled}
          />
        )}

        <div className="relative">
          <div
            className={cn(
              'transition-all duration-300 ease-out origin-top',
              geekModeEnabled 
                ? 'opacity-0 scale-95 pointer-events-none absolute inset-0' 
                : 'opacity-100 scale-100'
            )}
          >
            <div className="space-y-5">
              <ConfigSection
                icon={<Cpu className="size-4 text-muted-foreground" />}
                title={t('env.acceleration.vram.title')}
                description={t('env.acceleration.vram.description')}
              >
                <VRAMStrategySection config={config} currentEnvId={currentEnvId} onConfigChange={handleConfigChangeWrapper} />
              </ConfigSection>

              <GhostDivider />

              <ConfigSection
                icon={<Zap className="size-4 text-muted-foreground" />}
                title={t('env.acceleration.performance.title')}
                description={t('env.acceleration.performance.description')}
              >
                <PerformanceSection config={config} onConfigChange={handleConfigChangeWrapper} />
              </ConfigSection>

              <GhostDivider />

              <ConfigSection
                icon={<Layers className="size-4 text-muted-foreground" />}
                title={t('env.acceleration.precision.title')}
                description={t('env.acceleration.precision.description')}
              >
                <PrecisionControlSection config={config} onConfigChange={handleConfigChangeWrapper} />
              </ConfigSection>

              <GhostDivider />

              <ConfigSection
                icon={<ToggleRight className="size-4 text-muted-foreground" />}
                title={t('env.acceleration.auxiliary.title')}
                description={t('env.acceleration.auxiliary.description')}
              >
                <AuxiliarySection config={config} onConfigChange={handleConfigChangeWrapper} />
              </ConfigSection>
            </div>
          </div>

          <div
            className={cn(
              'transition-all duration-300 ease-out origin-top',
              geekModeEnabled 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-95 pointer-events-none absolute inset-0'
            )}
          >
            {pytorchBackend && pytorchBackend.backend !== 'unknown' && pytorchBackend.backend !== 'none' && (
              <div className="mb-3 flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span>{t('env.acceleration.device.pytorchBackend')}:</span>
                <span className="font-medium">
                  {getPytorchBackendLabel(pytorchBackend.backend)}
                </span>
                {pytorchBackend.torchVersion && (
                  <span className="opacity-60">({pytorchBackend.torchVersion})</span>
                )}
              </div>
            )}
            <GeekModeTerminal
              value={geekModeArgs}
              onChange={handleGeekModeArgsChange}
            />
          </div>
        </div>
      </div>
    )
  }
)

function ConfigSection({
  icon,
  title,
  description,
  children,
  variant = 'default'
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  variant?: 'default' | 'warning'
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-x-12 gap-y-6 lg:grid-cols-12">
      <div className="lg:sticky lg:top-36 lg:col-span-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
          {icon}
          {title}
        </h3>
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="lg:col-span-8">
        <div className={cn(
          'rounded-[0.875rem] overflow-hidden',
          'bg-surface shadow-soft',
          'ring-1 ring-border-subtle',
          'transition-shadow duration-300',
          'hover:shadow-soft-md',
          variant === 'warning' && 'ring-warning/30'
        )}>
          {children}
        </div>
      </div>
    </div>
  )
}

function GhostDivider() {
  return (
    <div 
      className="my-5 h-px w-full"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, hsl(var(--border-subtle)) 50%, transparent 100%)'
      }}
    />
  )
}

/* eslint-disable no-restricted-syntax */
function GeekModeTerminal({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  const lines = value.split('\n')
  const lineCount = Math.max(lines.length, 10)
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[600px] flex-col overflow-hidden rounded-[0.75rem] border border-border-subtle bg-[hsl(var(--bg-base))] shadow-soft-lg">
      <div className="flex items-center border-b border-border-subtle bg-surface-active px-4 py-3">
        <div className="flex gap-2">
          <div className="size-3 rounded-full bg-[#ff5f56]" />
          <div className="size-3 rounded-full bg-[#ffbd2e]" />
          <div className="size-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex-1 text-center">
          <span className="font-mono text-xs text-content-muted">
            {t('env.geekMode.terminalTitle')}
          </span>
        </div>
      </div>
      <div className="flex flex-1 font-mono text-[13px] leading-relaxed">
        <div className="min-w-10 select-none border-r border-border-subtle bg-surface-active/50 py-4 pl-4 pr-3 text-right text-content-muted">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[540px] flex-1 resize-none bg-transparent p-4 font-mono text-content-primary outline-none placeholder:text-content-muted"
          spellCheck={false}
          placeholder={t('env.geekMode.terminalPlaceholder')}
        />
      </div>
    </div>
  )
}
/* eslint-enable no-restricted-syntax */
