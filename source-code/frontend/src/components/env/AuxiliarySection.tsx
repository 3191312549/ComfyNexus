import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AuxiliarySectionProps } from '@/types/environment'

export function AuxiliarySection({ config, onConfigChange }: AuxiliarySectionProps) {
  const { t } = useTranslation()
  const [showPreviewMethodHelp, setShowPreviewMethodHelp] = useState(false)
  const [showPreviewSizeHelp, setShowPreviewSizeHelp] = useState(false)
  const [showSafeModeHelp, setShowSafeModeHelp] = useState(false)
  const [showEnableManagerHelp, setShowEnableManagerHelp] = useState(false)
  const [showDisableMetadataHelp, setShowDisableMetadataHelp] = useState(false)
  const [showLogLevelHelp, setShowLogLevelHelp] = useState(false)

  const previewMethods = [
    { value: 'auto', label: 'Auto' },
    { value: 'taesd', label: 'TAESD' },
    { value: 'latent2rgb', label: 'Latent2RGB' },
    { value: 'none', label: 'None' }
  ]

  const logLevels = [
    { value: 'DEBUG', label: 'DEBUG' },
    { value: 'INFO', label: 'INFO' }
  ]

  return (
    <>
      <div className="space-y-3 p-5">
        {/* 预览方式 - 横向布局 */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.auxiliary.previewMethod')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreviewMethodHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.previewModeHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            <Select
              value={config?.previewMethod || 'auto'}
              onValueChange={(value) => onConfigChange({ previewMethod: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.placeholder.selectPreviewMode')} />
              </SelectTrigger>
              <SelectContent>
                {previewMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 预览大小 - 横向布局 */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.auxiliary.previewSize')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreviewSizeHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.previewSizeHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            <Input
              type="number"
              min="128"
              max="2048"
              step="64"
              value={config?.previewSize || 512}
              onChange={(e) => onConfigChange({ previewSize: parseInt(e.target.value) || 512 })}
              placeholder="512"
            />
          </div>
        </div>

        {/* 安全模式 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.auxiliary.safeMode')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSafeModeHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.safeModeHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <Switch
            checked={config?.safeMode || false}
            onCheckedChange={(checked) => onConfigChange({ safeMode: checked })}
          />
        </div>

        {/* 启用管理器 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.auxiliary.enableManager')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEnableManagerHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.managerHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <Switch
            checked={config?.enableManager || false}
            onCheckedChange={(checked) => onConfigChange({ enableManager: checked })}
          />
        </div>

        {/* 禁用元数据 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.auxiliary.disableMetadata')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDisableMetadataHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.metadataHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <Switch
            checked={config?.disableMetadata || false}
            onCheckedChange={(checked) => onConfigChange({ disableMetadata: checked })}
          />
        </div>

        {/* 日志级别 - 横向布局 */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.auxiliary.logLevel')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLogLevelHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.logLevelHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            <Select
              value={config?.logLevel || 'INFO'}
              onValueChange={(value) => onConfigChange({ logLevel: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.placeholder.selectLogLevel')} />
              </SelectTrigger>
              <SelectContent>
                {logLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 帮助弹窗 - 预览方式 */}
      <Dialog open={showPreviewMethodHelp} onOpenChange={(open) => !open && setShowPreviewMethodHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.previewModeHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.auxiliary.previewAuto')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.function")}:</span>{t('env.acceleration.auxiliary.previewAutoDesc')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.auxiliary.suggestion")}:</span>{t('env.acceleration.auxiliary.previewAutoSuggestion')}
              </p>
            </div>

            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.auxiliary.previewTaesd')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.function")}:</span>{t('env.acceleration.auxiliary.previewTaesdDesc')}
              </p>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.auxiliary.advantage")}:</span>{t('env.acceleration.auxiliary.previewTaesdAdvantage')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.auxiliary.applicable")}:</span>{t('env.acceleration.auxiliary.previewTaesdApplicable')}
              </p>
            </div>

            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.auxiliary.previewLatent2rgb')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.function")}:</span>{t('env.acceleration.auxiliary.previewLatent2rgbDesc')}
              </p>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.advantage")}:</span>{t('env.acceleration.auxiliary.previewLatent2rgbAdvantage')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.auxiliary.disadvantage")}:</span>{t('env.acceleration.auxiliary.previewLatent2rgbDisadvantage')}
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.auxiliary.previewNone')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.function")}:</span>{t('env.acceleration.auxiliary.previewNoneDesc')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.applicable")}:</span>{t('env.acceleration.auxiliary.previewNoneApplicable')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - 预览大小 */}
      <Dialog open={showPreviewSizeHelp} onOpenChange={(open) => !open && setShowPreviewSizeHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.previewSizeHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.auxiliary.previewSizeTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.function")}:</span>{t('env.acceleration.auxiliary.previewSizeFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.auxiliary.suggestedValue")}:</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.auxiliary.preview256')}</li>
                <li>{t('env.acceleration.auxiliary.preview512')}</li>
                <li>{t('env.acceleration.auxiliary.preview1024')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.auxiliary.performanceImpact")}:</span>{t('env.acceleration.auxiliary.previewSizePerformance')}
              </p>
            </div>
            <div className="border-primary bg-primary/10 rounded border-l-4 p-3">
              <p className="text-primary text-sm">
                <span className="font-medium">{t("env.aux.tip")}:</span>{t('env.acceleration.auxiliary.previewSizeTip')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - 安全模式 */}
      <Dialog open={showSafeModeHelp} onOpenChange={(open) => !open && setShowSafeModeHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.safeModeHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.auxiliary.safeModeTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.function")}:</span>{t('env.acceleration.auxiliary.safeModeFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.applicableScenarios")}:</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.auxiliary.troubleshootPlugin')}</li>
                <li>{t('env.acceleration.auxiliary.testCoreFunction')}</li>
                <li>{t('env.acceleration.auxiliary.safeStartBeforeClean')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.auxiliary.note")}:</span>{t('env.acceleration.auxiliary.safeModeNote')}
              </p>
            </div>
            <div className="border-warning bg-warning/10 rounded border-l-4 p-3">
              <p className="text-warning text-sm">
                <span className="font-medium">{t("env.aux.tip")}:</span>{t('env.acceleration.auxiliary.safeModeTip')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - 启用管理器 */}
      <Dialog open={showEnableManagerHelp} onOpenChange={(open) => !open && setShowEnableManagerHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.managerHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.auxiliary.managerTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.function")}:</span>{t('env.acceleration.auxiliary.managerFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.auxiliary.mainFunction")}:</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.auxiliary.oneClickInstallNodes')}</li>
                <li>{t('env.acceleration.auxiliary.manageModels')}</li>
                <li>{t('env.acceleration.auxiliary.detectMissingNodes')}</li>
                <li>{t('env.acceleration.auxiliary.browsePlugins')}</li>
                <li>{t('env.acceleration.auxiliary.batchInstallMissing')}</li>
                <li>{t('env.acceleration.auxiliary.depConflictScan')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.suggestion")}:</span>{t('env.acceleration.auxiliary.managerSuggestion')}
              </p>
            </div>
            <div className="border-primary bg-primary/10 rounded border-l-4 p-3">
              <p className="text-primary text-sm">
                <span className="font-medium">{t("env.aux.tip")}:</span>{t('env.acceleration.auxiliary.managerTip')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - 禁用元数据 */}
      <Dialog open={showDisableMetadataHelp} onOpenChange={(open) => !open && setShowDisableMetadataHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.metadataHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.auxiliary.metadataTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.function")}:</span>{t('env.acceleration.auxiliary.metadataFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t('env.acceleration.auxiliary.metadataIncludes')}</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.auxiliary.fullWorkflowJson')}</li>
                <li>{t('env.acceleration.auxiliary.modelsAndParams')}</li>
                <li>{t('env.acceleration.auxiliary.genTimeAndSeed')}</li>
                <li>{t('env.acceleration.auxiliary.nodeConfigInfo')}</li>
              </ul>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.auxiliary.disableReason")}:</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.auxiliary.protectWorkflowPrivacy')}</li>
                <li>{t('env.acceleration.auxiliary.reduceFileSize')}</li>
                <li>{t('env.acceleration.auxiliary.avoidMetadataLeak')}</li>
              </ul>
            </div>
            <div className="border-warning bg-warning/10 rounded border-l-4 p-3">
              <p className="text-warning text-sm">
                <span className="font-medium">{t("env.aux.note")}:</span>{t('env.acceleration.auxiliary.metadataNote')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - 日志级别 */}
      <Dialog open={showLogLevelHelp} onOpenChange={(open) => !open && setShowLogLevelHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.logLevelHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.auxiliary.logInfoTitle')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.function")}:</span>{t('env.acceleration.auxiliary.logInfoFunction')}
              </p>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.auxiliary.includeContent")}:</span>{t('env.acceleration.auxiliary.logInfoContent')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.suggestion")}:</span>{t('env.acceleration.auxiliary.logInfoSuggestion')}
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.auxiliary.logDebugTitle')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.function")}:</span>{t('env.acceleration.auxiliary.logDebugFunction')}
              </p>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.includeContent")}:</span>{t('env.acceleration.auxiliary.logDebugContent')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.applicableScenarios")}:</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.auxiliary.troubleshootComplex')}</li>
                <li>{t('env.acceleration.auxiliary.devTestPlugin')}</li>
                <li>{t('env.acceleration.auxiliary.perfAnalysis')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.aux.note")}:</span>{t('env.acceleration.auxiliary.logDebugNote')}
              </p>
            </div>
          </div>
          <div className="border-primary bg-primary/10 mt-4 rounded border-l-4 p-3">
            <p className="text-primary text-sm">
              <span className="font-medium">{t("env.aux.tip")}:</span>{t('env.acceleration.auxiliary.logLevelTip')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
