import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, Settings } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PresetConfig } from '@/types/environment'

interface PresetSelectorProps {
  presets: PresetConfig[]
  onPresetSelect: (presetId: string, presetConfig: Record<string, unknown>, presetName?: string) => Promise<void>
  onSaveAs: () => void
  onManage: () => void
  className?: string
  showGroups?: boolean
}

export function PresetSelector({
  presets,
  onPresetSelect,
  onSaveAs,
  onManage,
  className,
  showGroups = true,
}: PresetSelectorProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (selectedPresetId && !presets.find(p => p.id === selectedPresetId)) {
      setSelectedPresetId(undefined)
    }
  }, [presets, selectedPresetId])

  const builtinPresets = presets.filter((p) => p.type === 'builtin')
  const customPresets = presets.filter((p) => p.type === 'custom')

  const handleValueChange = async (value: string) => {
    const preset = presets.find((p) => p.id === value)
    if (!preset) return

    setIsLoading(true)
    try {
      setSelectedPresetId(value)
      await onPresetSelect(value, preset.config || {}, preset.name)
    } catch (err) {
      console.error('[PresetSelector] 预设加载失败:', err)
      toast.error(t('preset.loadFailed'))
      setSelectedPresetId(undefined)
    } finally {
      setIsLoading(false)
    }
  }

  const renderPresetItem = (preset: PresetConfig) => (
    <SelectItem 
      key={preset.id} 
      value={preset.id} 
      className={showGroups ? 'pl-6' : ''}
    >
      {preset.name}
    </SelectItem>
  )

  return (
    <div
      className={cn(
        'p-5 rounded-lg',
        'bg-gradient-to-r from-background via-primary/5 to-primary/10',
        'border-l-4 border-l-primary',
        'flex items-center justify-between',
        className
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{t('env.acceleration.presetMode')}</span>
        </div>
        <p className="text-[13px] text-muted-foreground mt-0.5">{t('env.acceleration.presetModeDesc')}</p>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={selectedPresetId}
          onValueChange={handleValueChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-56 font-semibold bg-background/80 border-primary/20 shadow-sm">
            <SelectValue placeholder={t('preset.selectPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {showGroups ? (
              <>
                <SelectGroup>
                  <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 bg-muted/30 border-b border-border/50 mx-1 mb-1 rounded-t">
                    {t('preset.officialGroup')}
                  </div>
                  {builtinPresets.map(renderPresetItem)}
                </SelectGroup>
                {customPresets.length > 0 && (
                  <SelectGroup>
                    <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 bg-muted/30 border-b border-border/50 mx-1 mt-2 mb-1 rounded-t">
                      {t('preset.customGroup')}
                    </div>
                    {customPresets.map(renderPresetItem)}
                  </SelectGroup>
                )}
              </>
            ) : (
              <SelectGroup>
                {presets.map(renderPresetItem)}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={onSaveAs}
          className="bg-background border-primary/20 text-primary hover:bg-primary/10"
        >
          <Save className="size-4 mr-1.5" />
          {t('preset.saveAs')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onManage}
          className="bg-background border-primary/20 text-primary hover:bg-primary/10"
        >
          <Settings className="size-4 mr-1.5" />
          {t('preset.manage')}
        </Button>
      </div>
    </div>
  )
}
