import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Input } from '@/components/ui/Input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PerformanceSectionProps, EnvironmentConfig } from '@/types/environment'

export function PerformanceSection({ config, onConfigChange }: PerformanceSectionProps) {
  const { t } = useTranslation()
  const [showAttentionHelp, setShowAttentionHelp] = useState(false)
  const [showXformersHelp, setShowXformersHelp] = useState(false)
  const [showSmartMemoryHelp, setShowSmartMemoryHelp] = useState(false)
  const [showChannelsLastHelp, setShowChannelsLastHelp] = useState(false)
  const [showCacheLruHelp, setShowCacheLruHelp] = useState(false)
  const [showDeterministicHelp, setShowDeterministicHelp] = useState(false)
  const [showFastModeHelp, setShowFastModeHelp] = useState(false)
  const [showCudaMallocHelp, setShowCudaMallocHelp] = useState(false)

  const attentionModes = [
    { value: 'auto', label: t('env.acceleration.performance.attentionModes.auto') },
    { value: 'flash', label: t('env.acceleration.performance.attentionModes.flash') },
    { value: 'sage', label: t('env.acceleration.performance.attentionModes.sage') },
    { value: 'split', label: t('env.acceleration.performance.attentionModes.split') },
    { value: 'pytorch', label: t('env.acceleration.performance.attentionModes.pytorch') },
    { value: 'quad', label: t('env.acceleration.performance.attentionModes.quad') }
  ]

  const cudaMallocModes = [
    { value: 'auto', label: t('env.acceleration.performance.cudaMallocModes.auto') },
    { value: 'enable', label: t('env.acceleration.performance.cudaMallocModes.enable') },
    { value: 'disable', label: t('env.acceleration.performance.cudaMallocModes.disable') }
  ]

  const attentionHelpKeys = ['auto', 'flash', 'sage', 'split', 'pytorch', 'quad'] as const

  return (
    <>
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.performance.attentionMode')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAttentionHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.attentionHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            <Select
              value={config?.attentionMode || 'flash'}
              onValueChange={(value) => onConfigChange({ attentionMode: value as EnvironmentConfig['acceleration']['attentionMode'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.placeholder.selectAttention')} />
              </SelectTrigger>
              <SelectContent>
                {attentionModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('env.acceleration.performance.disableXformers')}
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowXformersHelp(true)}
                className="text-muted-foreground size-6 p-0 hover:text-foreground"
                aria-label={t('common.aria.xformersHelp')}
              >
                <HelpCircle className="size-4" />
              </Button>
            </div>
            <Switch
              checked={config?.disableXformers || false}
              onCheckedChange={(checked) => onConfigChange({ disableXformers: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('env.acceleration.performance.disableSmartMemory')}
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSmartMemoryHelp(true)}
                className="text-muted-foreground size-6 p-0 hover:text-foreground"
                aria-label={t('common.aria.smartMemoryHelp')}
              >
                <HelpCircle className="size-4" />
              </Button>
            </div>
            <Switch
              checked={config?.disableSmartMemory || false}
              onCheckedChange={(checked) => onConfigChange({ disableSmartMemory: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('env.acceleration.performance.forceChannelsLast')}
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChannelsLastHelp(true)}
                className="text-muted-foreground size-6 p-0 hover:text-foreground"
                aria-label={t('common.aria.channelsLastHelp')}
              >
                <HelpCircle className="size-4" />
              </Button>
            </div>
            <Switch
              checked={config?.forceChannelsLast || false}
              onCheckedChange={(checked) => onConfigChange({ forceChannelsLast: checked })}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex min-w-[120px] items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('env.acceleration.performance.cacheLru')}
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCacheLruHelp(true)}
                className="text-muted-foreground size-6 p-0 hover:text-foreground"
                aria-label={t('common.aria.cacheLruHelp')}
              >
                <HelpCircle className="size-4" />
              </Button>
            </div>
            <div className="flex-1">
              <Input
                type="number"
                min="0"
                value={config?.cacheLru || 0}
                onChange={(e) => onConfigChange({ cacheLru: parseInt(e.target.value) || 0 })}
                placeholder={t('common.placeholder.zeroDisable')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('env.acceleration.performance.deterministic')}
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeterministicHelp(true)}
                className="text-muted-foreground size-6 p-0 hover:text-foreground"
                aria-label={t('common.aria.deterministicHelp')}
              >
                <HelpCircle className="size-4" />
              </Button>
            </div>
            <Switch
              checked={config?.deterministic || false}
              onCheckedChange={(checked) => onConfigChange({ deterministic: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('env.acceleration.performance.fastMode')}
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFastModeHelp(true)}
                className="text-muted-foreground size-6 p-0 hover:text-foreground"
                aria-label={t('common.aria.fastModeHelp')}
              >
                <HelpCircle className="size-4" />
              </Button>
            </div>
            <Switch
              checked={config?.fastMode || false}
              onCheckedChange={(checked) => onConfigChange({ fastMode: checked })}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex min-w-[120px] items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('env.acceleration.performance.cudaMalloc')}
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCudaMallocHelp(true)}
                className="text-muted-foreground size-6 p-0 hover:text-foreground"
                aria-label={t('common.aria.cudaMallocHelp')}
              >
                <HelpCircle className="size-4" />
              </Button>
            </div>
            <div className="flex-1">
              <Select
                value={config?.cudaMalloc || 'auto'}
                onValueChange={(value) => onConfigChange({ cudaMalloc: value as EnvironmentConfig['acceleration']['cudaMalloc'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.placeholder.selectCudaMalloc')} />
                </SelectTrigger>
                <SelectContent>
                  {cudaMallocModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showAttentionHelp} onOpenChange={(open) => !open && setShowAttentionHelp(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('env.acceleration.performance.attentionDetailTitle')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            {attentionHelpKeys.map((key) => {
              const item = t(`env.acceleration.performance.attentionHelp.${key}`, { returnObjects: true }) as {
                mode: string
                param: string
                description: string
                hardware: string
                performance: string
                usage: string
                speed: string
                vram: string
                install?: string
                deps?: string
                note?: string
              }
              return (
                <div key={key} className="border-b pb-4 last:border-0">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-semibold">
                      {item.mode}
                    </h3>
                    {key === 'flash' && (
                      <span className="rounded bg-success/20 px-2 py-0.5 text-xs text-success">
                        {t('common.recommended')}
                      </span>
                    )}
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-medium">{t('env.acceleration.performance.param')}:</span><code className="rounded bg-muted px-1">{item.param}</code>
                  </p>
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-medium">{t('env.acceleration.performance.description')}:</span>{item.description}
                  </p>
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-medium">{t('env.acceleration.performance.hardwareReq')}:</span>{item.hardware}
                  </p>
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-medium">{t('env.acceleration.performance.performance')}:</span>{item.performance}
                  </p>
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">{t('env.acceleration.performance.speed')}:</span>{item.speed}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">{t('env.acceleration.performance.vram')}:</span>{item.vram}
                    </p>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-medium">{t('env.acceleration.performance.applicableScenarios')}:</span>{item.usage}
                  </p>
                  {item.install && (
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-medium">{t('env.acceleration.performance.install')}:</span><code className="rounded bg-muted px-1 text-xs">{item.install}</code>
                    </p>
                  )}
                  {item.deps && (
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-medium">{t('env.acceleration.performance.deps')}:</span>{item.deps}
                    </p>
                  )}
                  {item.note && (
                    <p className="mt-2 text-sm text-primary">
                      <span className="font-medium">💡 {t('env.acceleration.performance.tip')}:</span>{item.note}
                    </p>
                  )}
                </div>
              )
            })}
            
            <div className="mt-4 rounded border-l-4 border-primary bg-primary/10 p-3">
              <p className="mb-2 text-sm font-medium text-primary">
                💡 {t('env.acceleration.performance.recommendedConfig')}
              </p>
              <ul className="space-y-1 text-sm text-primary">
                <li>• <strong>{t('env.acceleration.performance.recommendedConfigItems.rtx50Label')}</strong>: {t('env.acceleration.performance.recommendedConfigItems.rtx50')}</li>
                <li>• <strong>{t('env.acceleration.performance.recommendedConfigItems.rtx40Label')}</strong>: {t('env.acceleration.performance.recommendedConfigItems.rtx40')}</li>
                <li>• <strong>{t('env.acceleration.performance.recommendedConfigItems.rtx30Label')}</strong>: {t('env.acceleration.performance.recommendedConfigItems.rtx30')}</li>
                <li>• <strong>{t('env.acceleration.performance.recommendedConfigItems.rtx20Label')}</strong>: {t('env.acceleration.performance.recommendedConfigItems.rtx20')}</li>
                <li>• <strong>{t('env.acceleration.performance.recommendedConfigItems.vram48gbLabel')}</strong>: {t('env.acceleration.performance.recommendedConfigItems.vram48gb')}</li>
                <li>• <strong>{t('env.acceleration.performance.recommendedConfigItems.vram4gbLabel')}</strong>: {t('env.acceleration.performance.recommendedConfigItems.vram4gb')}</li>
              </ul>
            </div>
            
            <div className="mt-2 rounded border-l-4 border-warning bg-warning/10 p-3">
              <p className="mb-1 text-sm font-medium text-warning">
                {t('env.acceleration.performance.hardwareCompatibilityTitle')}
              </p>
              <ul className="space-y-0.5 text-sm text-warning">
                <li>• <strong>{t('env.acceleration.performance.hardwareCompatItems.rtx20')}</strong>: {t('env.acceleration.performance.rtx20Note')}</li>
                <li>• <strong>{t('env.acceleration.performance.hardwareCompatItems.rtx30')}</strong>: {t('env.acceleration.performance.rtx30Note')}</li>
                <li>• <strong>{t('env.acceleration.performance.hardwareCompatItems.rtx40')}</strong>: {t('env.acceleration.performance.rtx40Note')}</li>
                <li>• <strong>{t('env.acceleration.performance.hardwareCompatItems.rtx50')}</strong>: {t('env.acceleration.performance.rtx50Note')}</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showXformersHelp} onOpenChange={(open) => !open && setShowXformersHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.disableXformersHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.performance.xformersTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.status")}:</span>{t('env.acceleration.performance.xformersStatus')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.recommended")}:</span>{t('env.acceleration.performance.xformersRecommended')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.suggestedAction")}:</span>{t('env.acceleration.performance.xformersAction')}
              </p>
            </div>
            <div className="rounded border-l-4 border-warning bg-warning/10 p-3">
              <p className="text-sm text-warning">
                <span className="font-medium">{t("env.performance.tip")}:</span>{t('env.acceleration.performance.xformersTip')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSmartMemoryHelp} onOpenChange={(open) => !open && setShowSmartMemoryHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.smartVramHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.performance.smartMemoryTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.performance.function')}:</span>{t('env.acceleration.performance.smartMemoryFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.performance.defaultBehavior')}:</span>{t('env.acceleration.performance.smartMemoryDefault')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.acceleration.performance.smartMemoryDisableEffect')}</span>
              </p>
              <ul className="mb-2 ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.performance.smartMemoryEffect1')}</li>
                <li>{t('env.acceleration.performance.smartMemoryEffect2')}</li>
                <li>{t('env.acceleration.performance.smartMemoryEffect3')}</li>
                <li>{t('env.acceleration.performance.smartMemoryEffect4')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t('env.acceleration.performance.smartMemoryApplicable')}</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.performance.smartMemoryUsage1')}</li>
                <li>{t('env.acceleration.performance.smartMemoryUsage2')}</li>
                <li>{t('env.acceleration.performance.smartMemoryUsage3')}</li>
                <li>{t('env.acceleration.performance.smartMemoryUsage4')}</li>
              </ul>
            </div>
            <div className="rounded border-l-4 border-warning bg-warning/10 p-3">
              <p className="text-sm text-warning">
                {t('env.acceleration.performance.smartMemoryWarningTitle')}
              </p>
            </div>
            <div className="rounded border-l-4 border-primary bg-primary/10 p-3">
              <p className="text-sm text-primary">
                {t('env.acceleration.performance.smartMemoryTipTitle')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChannelsLastHelp} onOpenChange={(open) => !open && setShowChannelsLastHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.channelsLastHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.performance.channelsLastTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.function")}:</span>{t('env.acceleration.performance.channelsLastFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.advantage")}:</span>{t('env.acceleration.performance.channelsLastAdvantage')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.whenToEnable")}:</span>{t('env.acceleration.performance.channelsLastWhen')}
              </p>
            </div>
            <div className="rounded border-l-4 border-primary bg-primary/10 p-3">
              <p className="text-sm text-primary">
                <span className="font-medium">{t("env.performance.tip")}:</span>{t('env.acceleration.performance.channelsLastTip')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCacheLruHelp} onOpenChange={(open) => !open && setShowCacheLruHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.lruCacheHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.performance.lruCacheTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.function")}:</span>{t('env.acceleration.performance.lruCacheFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.paramDesc")}:</span>{t('env.acceleration.performance.lruCacheParam')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.suggestedValue")}:</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.performance.cache0')}</li>
                <li>{t('env.performance.cache12')}</li>
                <li>{t('env.performance.cache35')}</li>
              </ul>
            </div>
            <div className="rounded border-l-4 border-warning bg-warning/10 p-3">
              <p className="text-sm text-warning">
                <span className="font-medium">{t("env.performance.note")}:</span>{t('env.acceleration.performance.lruCacheNote')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeterministicHelp} onOpenChange={(open) => !open && setShowDeterministicHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.deterministicHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.performance.deterministicMode')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.function")}:</span>{t('env.performance.deterministicDesc')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.usage")}:</span>
              </p>
              <ul className="mb-2 ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.performance.deterministicUsage1')}</li>
                <li>{t('env.performance.deterministicUsage2')}</li>
                <li>{t('env.performance.deterministicUsage3')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.performanceImpact")}:</span>{t('env.acceleration.performance.deterministicHelp.performanceImpact')}
              </p>
            </div>
            <div className="rounded border-l-4 border-primary bg-primary/10 p-3">
              <p className="text-sm text-primary">
                <span className="font-medium">{t("env.performance.tip")}:</span>{t('env.acceleration.performance.deterministicHelp.tip')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFastModeHelp} onOpenChange={(open) => !open && setShowFastModeHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.aggressiveSpeedupHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.performance.aggressiveMode')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.function")}:</span>{t('env.performance.aggressiveDesc')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.optimizationContent")}:</span>
              </p>
              <ul className="mb-2 ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.performance.aggressiveOpt1')}</li>
                <li>{t('env.performance.aggressiveOpt2')}</li>
                <li>{t('env.performance.aggressiveOpt3')}</li>
                <li>{t('env.performance.aggressiveOpt4')}</li>
              </ul>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.applicableScenarios")}:</span>
              </p>
              <ul className="mb-2 ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.performance.aggressiveUsage1')}</li>
                <li>{t('env.performance.aggressiveUsage2')}</li>
                <li>{t('env.performance.aggressiveUsage3')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.performanceGain")}:</span>{t('env.acceleration.performance.aggressiveHelp.performanceGain')}
              </p>
            </div>
            <div className="rounded border-l-4 border-warning bg-warning/10 p-3">
              <p className="mb-2 text-sm text-warning">
                <span className="font-medium">{t("env.performance.warning")}:</span>{t('env.performance.aggressiveWarning')}
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-warning">
                <li>{t('env.performance.aggressiveRisk1')}</li>
                <li>{t('env.performance.aggressiveRisk2')}</li>
                <li>{t('env.performance.aggressiveRisk3')}</li>
              </ul>
            </div>
            <div className="rounded border-l-4 border-danger bg-danger/10 p-3">
              <p className="text-sm text-danger">
                <span className="font-medium">{t("env.performance.suggestion")}:</span>{t('env.acceleration.performance.aggressiveHelp.suggestion')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCudaMallocHelp} onOpenChange={(open) => !open && setShowCudaMallocHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.cudaMallocHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.performance.cudaMallocHelp.title')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.function")}:</span>{t('env.acceleration.performance.cudaMallocHelp.function')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.options")}:</span>
              </p>
              <ul className="mb-2 ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.performance.cudaMallocHelp.optionAuto')}</li>
                <li>{t('env.acceleration.performance.cudaMallocHelp.optionEnable')}</li>
                <li>{t('env.acceleration.performance.cudaMallocHelp.optionDisable')}</li>
              </ul>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.performance.applicableScenarios")}:</span>
              </p>
              <ul className="mb-2 ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.performance.cudaMallocHelp.usage1')}</li>
                <li>{t('env.acceleration.performance.cudaMallocHelp.usage2')}</li>
              </ul>
            </div>
            <div className="rounded border-l-4 border-primary bg-primary/10 p-3">
              <p className="text-sm text-primary">
                <span className="font-medium">{t("env.performance.tip")}:</span>{t('env.acceleration.performance.cudaMallocHelp.tip')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
