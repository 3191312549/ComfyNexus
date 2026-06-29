import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useEnvStore } from '@/stores/useEnvStore'
import type { VRAMStrategySectionProps } from '@/types/environment'
import { getPytorchBackendLabel } from '@/types/environment'

export function VRAMStrategySection({ config, currentEnvId, onConfigChange }: VRAMStrategySectionProps) {
  const { t } = useTranslation()
  const { computeDevices, pytorchBackend, fetchFilteredComputeDevices, fetchComputeDevices } = useEnvStore()
  const [showHelp, setShowHelp] = useState(false)
  const [showGpuOnlyHelp, setShowGpuOnlyHelp] = useState(false)
  const [showReserveVramHelp, setShowReserveVramHelp] = useState(false)
  const [showDeviceHelp, setShowDeviceHelp] = useState(false)

  useEffect(() => {
    if (currentEnvId) {
      fetchFilteredComputeDevices(currentEnvId)
    } else {
      fetchComputeDevices()
    }
  }, [currentEnvId, fetchFilteredComputeDevices, fetchComputeDevices])

  const isCpuMode = config?.computeDevice?.toLowerCase() === 'cpu'
  const isNonAutoVram = (config?.vramStrategy || 'auto') !== 'auto'
  const isGpuOnlyDisabled = isCpuMode || isNonAutoVram

  const selectedDeviceIncompatible = (() => {
    const device = config?.computeDevice || ''
    if (!device || device === 'auto' || device === 'cpu') return false
    const found = computeDevices.find(d => `${d.type}:${d.index}` === device)
    return found && found.compatible === false
  })()

  const selectedDeviceWarning = (() => {
    if (!selectedDeviceIncompatible) return ''
    const device = config?.computeDevice || ''
    const found = computeDevices.find(d => `${d.type}:${d.index}` === device)
    return found?.incompatibilityReason || t('env.acceleration.device.incompatibleDefault')
  })()

  const normalizeDeviceValue = (value: string | undefined): string => {
    if (!value) return 'auto'
    if (value.startsWith('gpu:')) return value.replace('gpu:', 'nvidia:')
    return value
  }

  const vramModes = [
    { value: 'auto', label: t('env.acceleration.vram.auto') },
    { value: 'normal', label: t('env.acceleration.vram.normal') },
    { value: 'low', label: t('env.acceleration.vram.low') },
    { value: 'high', label: t('env.acceleration.vram.high') },
    { value: 'no', label: t('env.acceleration.vram.noVram') }
  ]

  const vramHelp = [
    {
      mode: t('env.acceleration.vram.help.autoMode'),
      param: t('env.acceleration.vram.help.autoParam'),
      description: t('env.acceleration.vram.help.autoDesc'),
      usage: t('env.acceleration.vram.help.autoUsage'),
      speed: t('env.acceleration.vram.help.autoSpeed'),
      vram: t('env.acceleration.vram.help.autoVram'),
      recommend: true,
      autoRules: [
        { vram: '≥24GB', mode: t('env.acceleration.vram.help.highVramMode') },
        { vram: '8-24GB', mode: t('env.acceleration.vram.help.normalMode') },
        { vram: '4-8GB', mode: t('env.acceleration.vram.help.lowVramMode') },
        { vram: '<4GB', mode: t('env.acceleration.vram.help.noVramMode') }
      ]
    },
    {
      mode: t('env.acceleration.vram.help.normalMode'),
      param: '',
      description: t('env.acceleration.vram.help.normalDesc'),
      usage: t('env.acceleration.vram.help.normalUsage'),
      speed: t('env.acceleration.vram.help.normalSpeed'),
      vram: '8-12GB',
      recommend: false
    },
    {
      mode: t('env.acceleration.vram.help.highVramMode'),
      param: '--highvram',
      description: t('env.acceleration.vram.help.highVramDesc'),
      usage: t('env.acceleration.vram.help.highVramUsage'),
      speed: t('env.acceleration.vram.help.highVramSpeed'),
      vram: '16-24GB',
      recommend: false,
      note: t('env.acceleration.vram.help.highVramNote')
    },
    {
      mode: t('env.acceleration.vram.help.lowVramMode'),
      param: '--lowvram',
      description: t('env.acceleration.vram.help.lowVramDesc'),
      usage: t('env.acceleration.vram.help.lowVramUsage'),
      speed: t('env.acceleration.vram.help.lowVramSpeed'),
      vram: '4-6GB',
      recommend: false
    },
    {
      mode: t('env.acceleration.vram.help.noVramMode'),
      param: '--novram',
      description: t('env.acceleration.vram.help.noVramDesc'),
      usage: t('env.acceleration.vram.help.noVramUsage'),
      speed: t('env.acceleration.vram.help.noVramSpeed'),
      vram: '2-4GB',
      recommend: false
    }
  ]

  return (
    <>
      <div className="space-y-3 p-5">
        {/* 计算设备选择 - 横向布局 */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.device.title')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeviceHelp(true)}
              className="size-6 p-0 text-muted-foreground hover:text-foreground"
              aria-label={t('env.acceleration.device.ariaHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            {computeDevices.length === 0 ? (
              <div className="space-y-2">
                <div className="rounded bg-warning/10 p-2 text-sm text-warning">
                  {t('env.acceleration.device.noGpuDetected')}
                </div>
                <Select
                  value={normalizeDeviceValue(config?.computeDevice)}
                  onValueChange={(value) => onConfigChange({ computeDevice: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('env.acceleration.device.selectDevice')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('env.acceleration.device.auto')}</SelectItem>
                    <SelectItem value="cpu">{t('env.acceleration.device.cpu')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Select
                value={normalizeDeviceValue(config?.computeDevice)}
                onValueChange={(value) => onConfigChange({ computeDevice: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('env.acceleration.device.selectDevice')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('env.acceleration.device.auto')}</SelectItem>
                  {computeDevices
                    .filter((device) => device.index >= 0)
                    .map((device) => {
                      const vendorLabel = device.type === 'nvidia' ? 'NVIDIA' : device.type === 'amd' ? 'AMD' : device.type === 'intel' || device.type === 'intel-arc' ? 'Intel' : ''
                      const isCompat = device.compatible !== false
                      return (
                        <SelectItem key={`${device.type}:${device.index}`} value={`${device.type}:${device.index}`} disabled={!isCompat}>
                          <span className={isCompat ? '' : 'text-muted-foreground line-through'}>
                            {vendorLabel && <span className="mr-1 text-xs font-medium opacity-70">[{vendorLabel}]</span>}
                            GPU {device.index} - {device.name}
                          </span>
                          {!isCompat && <span className="ml-2 text-xs text-destructive">⛔</span>}
                        </SelectItem>
                      )
                    })}
                  <SelectItem value="cpu">{t('env.acceleration.device.cpu')}</SelectItem>
                </SelectContent>
              </Select>
            )}
            {selectedDeviceIncompatible && selectedDeviceWarning && (
              <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2">
                <span className="text-sm text-destructive">⛔</span>
                <p className="text-xs text-destructive">{selectedDeviceWarning}</p>
              </div>
            )}
            {pytorchBackend && pytorchBackend.backend !== 'unknown' && pytorchBackend.backend !== 'none' && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{t('env.acceleration.device.pytorchBackend')}:</span>
                <span className="font-medium">
                  {getPytorchBackendLabel(pytorchBackend.backend)}
                </span>
                {pytorchBackend.ipexInstalled && (
                  <span className="ml-1 text-xs text-amber-500">({t('env.acceleration.device.ipexWarning')})</span>
                )}
                {pytorchBackend.torchVersion && (
                  <span className="opacity-60">({pytorchBackend.torchVersion})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 显存策略 - 横向布局 */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className={`text-sm font-medium ${isCpuMode ? 'text-muted-foreground' : 'text-foreground'}`}>
              {t('env.acceleration.vram.strategy')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHelp(true)}
              className="size-6 p-0 text-muted-foreground hover:text-foreground"
              aria-label={t('env.acceleration.vram.ariaHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            <Select
              value={config?.vramStrategy || 'auto'}
              onValueChange={(value) => onConfigChange({ vramStrategy: value === 'auto' ? '' : value as any })}
              disabled={isCpuMode}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('env.acceleration.vram.selectStrategy')} />
              </SelectTrigger>
              <SelectContent>
                {vramModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCpuMode && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('env.acceleration.vram.cpuModeDisabled')}
              </p>
            )}
          </div>
        </div>

        {/* 禁用内存卸载 - 横向布局 */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className={`text-sm font-medium ${isGpuOnlyDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>
              {t('env.acceleration.vram.disableMemoryUnload')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGpuOnlyHelp(true)}
              className="size-6 p-0 text-muted-foreground hover:text-foreground"
              aria-label={t('env.acceleration.vram.gpuOnlyAriaHelp')}
              disabled={isGpuOnlyDisabled}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex flex-1 justify-end">
            <Switch
              checked={config?.gpuOnly || false}
              onCheckedChange={(checked) => onConfigChange({ gpuOnly: checked })}
              disabled={isGpuOnlyDisabled}
            />
          </div>
        </div>
        {isNonAutoVram && !isCpuMode && (
          <p className="-mt-2 ml-[136px] text-xs text-muted-foreground">
            {t('env.acceleration.vram.gpuOnlyConflictWithVram')}
          </p>
        )}

        {/* 显存预留 - 横向布局 */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className={`text-sm font-medium ${isCpuMode ? 'text-muted-foreground' : 'text-foreground'}`}>
              {t('env.acceleration.vram.reserveVram')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowReserveVramHelp(true)}
              className="size-6 p-0 text-muted-foreground hover:text-foreground"
              aria-label={t('env.acceleration.vram.reserveVramAriaHelp')}
              disabled={isCpuMode}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            <Input
              type="number"
              value={config?.reserveVram ?? 0.5}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                if (!isNaN(value) && value >= 0) {
                  onConfigChange({ reserveVram: value })
                }
              }}
              step="0.1"
              min="0"
              className="w-full"
              disabled={isCpuMode}
            />
          </div>
        </div>
      </div>

      {/* 帮助弹窗 - 计算设备 */}
      <Dialog open={showDeviceHelp} onOpenChange={(open) => !open && setShowDeviceHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('env.acceleration.device.help.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('env.acceleration.device.help.description')}
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-primary">{t('common.statusIndicator.primary')}</span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t('env.acceleration.device.help.autoTitle')}</span>
                  {t('env.acceleration.device.help.auto')}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-success">{t('common.statusIndicator.success')}</span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t('env.acceleration.device.help.nvidiaTitle')}</span>
                  {t('env.acceleration.device.help.nvidia')}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">{t('common.statusIndicator.primary')}</span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t('env.acceleration.device.help.amdTitle')}</span>
                  {t('env.acceleration.device.help.amd')}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">{t('common.statusIndicator.primary')}</span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t('env.acceleration.device.help.intelArcTitle')}</span>
                  {t('env.acceleration.device.help.intelArc')}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary/70">{t('common.statusIndicator.primary70')}</span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t('env.acceleration.device.help.intelTitle')}</span>
                  {t('env.acceleration.device.help.intel')}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">{t('common.statusIndicator.muted')}</span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t('env.acceleration.device.help.cpuTitle')}</span>
                  {t('env.acceleration.device.help.cpu')}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - 显存策略 */}
      <Dialog open={showHelp} onOpenChange={(open) => !open && setShowHelp(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('env.acceleration.vram.help.detailTitle')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            {vramHelp.map((item, index) => (
              <div key={index} className="border-b pb-4 last:border-0">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="font-semibold">
                    {item.mode}
                  </h3>
                  {item.recommend && (
                    <span className="rounded bg-success/20 px-2 py-0.5 text-xs text-success">
                      {t('common.recommended')}
                    </span>
                  )}
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-medium">{t('env.acceleration.vram.help.param')}:</span>{item.param}
                </p>
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-medium">{t('env.acceleration.vram.help.description')}:</span>{item.description}
                </p>
                {item.autoRules && (
                  <div className="mb-2 rounded bg-muted/50 p-2">
                    <p className="mb-1 text-sm text-muted-foreground">
                      <span className="font-medium">{t('env.acceleration.vram.help.autoRules')}:</span>
                    </p>
                    <ul className="ml-2 space-y-0.5 text-sm text-muted-foreground">
                      {item.autoRules.map((rule, i) => (
                        <li key={i}>• {rule.vram} → {rule.mode}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">{t('env.acceleration.vram.help.vramReq')}:</span>{item.vram}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">{t('env.acceleration.vram.help.speed')}:</span>{item.speed}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t('env.acceleration.vram.help.applicableScenarios')}:</span>{item.usage}
                </p>
                {item.note && (
                  <p className="mt-2 text-sm text-primary">
                    <span className="font-medium">💡 {t('env.acceleration.vram.help.tip')}:</span>{item.note}
                  </p>
                )}
              </div>
            ))}
            
            <div className="mt-4 rounded border-l-4 border-primary bg-primary/10 p-3">
              <p className="mb-2 text-sm font-medium text-primary">
                💡 {t('env.acceleration.vram.help.recommendedConfig')}
              </p>
              <ul className="space-y-1 text-sm text-primary">
                <li>• <strong>{t('env.acceleration.vram.help.autoMode')}</strong>: {t('env.acceleration.vram.help.autoModeDesc')}</li>
                <li>• <strong>{t('env.acceleration.vram.help.vramSize46gb')}</strong>: {t('env.acceleration.vram.help.lowVramConfig')}</li>
                <li>• <strong>{t('env.acceleration.vram.help.vramSize812gb')}</strong>: {t('env.acceleration.vram.help.normalVramConfig')}</li>
                <li>• <strong>{t('env.acceleration.vram.help.vramSize16gb')}</strong>: {t('env.acceleration.vram.help.highVramConfig')}</li>
                <li>• <strong>{t('env.acceleration.vram.help.vramSize24gb')}</strong>: {t('env.acceleration.vram.help.ultraVramConfig')}</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - 禁用内存卸载 */}
      <Dialog open={showGpuOnlyHelp} onOpenChange={(open) => !open && setShowGpuOnlyHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('env.acceleration.vram.help.gpuOnlyTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.vram.help.gpuOnlyMode')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.performance.function')}:</span>{t('env.acceleration.vram.help.gpuOnlyFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.acceleration.vram.help.advantage')}:</span>{t('env.acceleration.vram.help.gpuOnlyAdvantage')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.acceleration.vram.help.disadvantage')}:</span>{t('env.acceleration.vram.help.gpuOnlyDisadvantage')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.acceleration.vram.help.applicableScenarios')}:</span>{t('env.acceleration.vram.help.gpuOnlyUsage')}
              </p>
            </div>
            
            <div className="rounded bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium">
                {t('env.acceleration.vram.help.comparisonWithHighVramTitle')}
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="min-w-[100px] font-medium text-primary">{t('env.acceleration.vram.help.paramHighvram')}</span>
                  <p className="text-sm text-muted-foreground">{t('env.acceleration.vram.help.highVramBehavior')}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="min-w-[100px] font-medium text-success">{t('env.acceleration.vram.help.paramGpuOnly')}</span>
                  <p className="text-sm text-muted-foreground">{t('env.acceleration.vram.help.gpuOnlyBehavior')}</p>
                </div>
              </div>
            </div>
            
            <div className="rounded border-l-4 border-warning bg-warning/10 p-3">
              <p className="text-sm text-warning">
                {t('env.acceleration.vram.help.gpuOnlyWarningTitle')}
              </p>
            </div>
            
            <div className="rounded border-l-4 border-primary bg-primary/10 p-3">
              <p className="text-sm text-primary">
                {t('env.acceleration.vram.help.gpuOnlySuggestionTitle')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - 显存预留 */}
      <Dialog open={showReserveVramHelp} onOpenChange={(open) => !open && setShowReserveVramHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('env.acceleration.vram.help.reserveVramTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.vram.help.reserveVramMode')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.performance.function')}:</span>{t('env.acceleration.vram.help.reserveVramFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.acceleration.vram.help.unit')}:</span>{t('env.acceleration.vram.help.reserveVramUnit')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.performance.suggestedValue')}:</span>
              </p>
              <ul className="mb-2 ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.vram.help.reserveVramWindows')}</li>
                <li>{t('env.acceleration.vram.help.reserveVramLinux')}</li>
                <li>{t('env.acceleration.vram.help.reserveVramMultiTask')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t('env.acceleration.vram.help.applicableScenarios')}:</span>{t('env.acceleration.vram.help.reserveVramUsage')}
              </p>
            </div>
            <div className="rounded border-l-4 border-primary bg-primary/10 p-3">
              <p className="text-sm text-primary">
                {t('env.acceleration.vram.help.reserveVramSuggestionTitle')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
