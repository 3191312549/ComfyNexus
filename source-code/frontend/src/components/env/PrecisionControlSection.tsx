import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PrecisionControlSectionProps } from '@/types/environment'

export function PrecisionControlSection({ config, onConfigChange }: PrecisionControlSectionProps) {
  const { t } = useTranslation()
  const [showUnetHelp, setShowUnetHelp] = useState(false)
  const [showVaeHelp, setShowVaeHelp] = useState(false)
  const [showTextEncHelp, setShowTextEncHelp] = useState(false)

  const unetOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'fp16', label: 'FP16' },
    { value: 'bf16', label: 'BF16' },
    { value: 'fp8_e4m3fn', label: 'FP8 E4M3FN' },
    { value: 'fp8_e5m2', label: 'FP8 E5M2' },
    { value: 'fp32', label: 'FP32' }
  ]

  const vaeOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'fp32', label: 'FP32' },
    { value: 'fp16', label: 'FP16' },
    { value: 'bf16', label: 'BF16' },
    { value: 'cpu', label: 'CPU' }
  ]

  const textEncOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'fp8_e4m3fn', label: 'FP8 E4M3FN' },
    { value: 'fp8_e5m2', label: 'FP8 E5M2' },
    { value: 'fp16', label: 'FP16' },
    { value: 'fp32', label: 'FP32' },
    { value: 'bf16', label: 'BF16' }
  ]

  return (
    <>
      <div className="space-y-3 p-5">
        {/* UNet精度 - 横向布局 */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.precision.unet')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowUnetHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.unetPrecisionHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            <Select
              value={config?.unetPrecision || 'auto'}
              onValueChange={(value) => onConfigChange({ unetPrecision: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.placeholder.selectPrecision')} />
              </SelectTrigger>
              <SelectContent>
                {unetOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* VAE精度 - 横向布局 */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.precision.vae')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVaeHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.vaePrecisionHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            <Select
              value={config?.vaePrecision || 'fp32'}
              onValueChange={(value) => onConfigChange({ vaePrecision: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.placeholder.selectPrecision')} />
              </SelectTrigger>
              <SelectContent>
                {vaeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 文本编码器精度 - 横向布局 */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.precision.textEnc')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTextEncHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.textEncoderPrecisionHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            <Select
              value={config?.textEncPrecision || 'fp16'}
              onValueChange={(value) => onConfigChange({ textEncPrecision: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.placeholder.selectPrecision')} />
              </SelectTrigger>
              <SelectContent>
                {textEncOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 帮助弹窗 - UNet精度 */}
      <Dialog open={showUnetHelp} onOpenChange={(open) => !open && setShowUnetHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.unetPrecisionHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.autoTitle')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.autoFunction')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.autoSuggestion')}
              </p>
            </div>

            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.fp16Title')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.fp16Function')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.fp16Suggestion')}
              </p>
            </div>

            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.bf16Title')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.bf16Function')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.bf16Suggestion')}
              </p>
            </div>

            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.fp8e4Title')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.fp8e4Function')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.fp8e4Suggestion')}
              </p>
            </div>

            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.fp8e5Title')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.fp8e5Function')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.fp8e5Suggestion')}
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.fp32Title')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.fp32Function')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.fp32Suggestion')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - VAE精度 */}
      <Dialog open={showVaeHelp} onOpenChange={(open) => !open && setShowVaeHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.vaePrecisionHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.vaeFp32Title')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.vaeFp32Function')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.vaeFp32Suggestion')}
              </p>
            </div>

            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.vaeFp16Title')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.vaeFp16Function')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.vaeFp16Suggestion')}
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.vaeCpuTitle')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.vaeCpuFunction')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.vaeCpuSuggestion')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - 文本编码器精度 */}
      <Dialog open={showTextEncHelp} onOpenChange={(open) => !open && setShowTextEncHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.textEncoderPrecisionHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.textEncFp8Title')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.textEncFp8Function')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.textEncFp8Suggestion')}
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.precision.help.textEncFp16Title')}
              </h3>
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.function")}:</span>{t('env.acceleration.precision.help.textEncFp16Function')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.precision.suggestion")}:</span>{t('env.acceleration.precision.help.textEncFp16Suggestion')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
