/**
 * 问题反馈页面
 * 用户可以提交 Bug 报告或功能建议到 GitHub Issues
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Send, RotateCcw, ExternalLink, Lightbulb, FileText, Monitor } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea } from '@/components/ui'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { useEnvStore } from '@/stores/useEnvStore'
import { bridgeService } from '@/services/bridge'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

type FeedbackType = 'bug' | 'feature' | 'usage' | 'other'

interface FeedbackFormData {
  type: FeedbackType
  title: string
  description: string
  stepsToReproduce: string
  expectedBehavior: string
  actualBehavior: string
  additionalInfo: string
}

interface SystemInfo {
  os: string
  appVersion: string
  pythonVersion: string
  currentEnv: string
  comfyuiPath: string
  comfyuiVersion: string
  pytorchVersion: string
  cudaVersion: string
}

interface FormErrors {
  type?: string
  title?: string
  description?: string
  stepsToReproduce?: string
  expectedBehavior?: string
  actualBehavior?: string
}

export default function FeedbackPage() {
  const { success, error: showError } = useToast()
  const { currentEnvId, environments } = useEnvStore()
  
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: 'bug',
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    additionalInfo: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const { t } = useTranslation()
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    os: t('feedback.getting'),
    appVersion: t('feedback.getting'),
    pythonVersion: t('feedback.unknown'),
    currentEnv: t('feedback.notSelected'),
    comfyuiPath: t('feedback.unknown'),
    comfyuiVersion: t('feedback.unknown'),
    pytorchVersion: t('feedback.unknown'),
    cudaVersion: t('feedback.unknown')
  })

  // 获取操作系统信息
  const getOSInfo = (): string => {
    const ua = navigator.userAgent
    if (ua.indexOf('Win') !== -1) {
      if (ua.indexOf('Windows NT 10.0') !== -1) return 'Windows 10/11'
      if (ua.indexOf('Windows NT 6.3') !== -1) return 'Windows 8.1'
      if (ua.indexOf('Windows NT 6.2') !== -1) return 'Windows 8'
      if (ua.indexOf('Windows NT 6.1') !== -1) return 'Windows 7'
      return 'Windows'
    }
    if (ua.indexOf('Mac') !== -1) return 'macOS'
    if (ua.indexOf('Linux') !== -1) return 'Linux'
    return t('feedback.unknown')
  }

  // 收集系统信息
  useEffect(() => {
    const collectSystemInfo = async () => {
      try {
        // 获取应用信息
        const appInfo = await bridgeService.getAppInfo()
        
        // 获取当前环境信息
        const currentEnv = environments.find(e => e.id === currentEnvId)
        
        setSystemInfo({
          os: getOSInfo(),
          appVersion: appInfo.version || t('feedback.unknown'),
          pythonVersion: currentEnv?.dependencies?.pythonVersion || t('feedback.unknown'),
          currentEnv: currentEnv?.alias || t('feedback.notSelected'),
          comfyuiPath: currentEnv?.general?.comfyuiPath || t('feedback.unknown'),
          comfyuiVersion: currentEnv?.version || t('feedback.unknown'),
          pytorchVersion: currentEnv?.dependencies?.pytorchVersion || t('feedback.unknown'),
          cudaVersion: currentEnv?.dependencies?.cudaVersion || t('feedback.unknown')
        })
      } catch (error) {
        console.error('Failed to collect system info:', error)
        setSystemInfo(prev => ({
          ...prev,
          os: getOSInfo(),
          appVersion: t('feedback.unknown')
        }))
      }
    }

    collectSystemInfo()
  }, [currentEnvId, environments])

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.type) {
      newErrors.type = t('feedback.errors.typeRequired')
    }

    if (!formData.title.trim()) {
      newErrors.title = t('feedback.errors.titleRequired')
    } else if (formData.title.length > 100) {
      newErrors.title = t('feedback.errors.titleTooLong')
    }

    if (!formData.description.trim()) {
      newErrors.description = t('feedback.errors.descriptionRequired')
    } else if (formData.description.length < 10) {
      newErrors.description = t('feedback.errors.descriptionTooShort')
    } else if (formData.description.length > 2000) {
      newErrors.description = t('feedback.errors.descriptionTooLong')
    }

    if (formData.type === 'bug' && !formData.stepsToReproduce.trim()) {
      newErrors.stepsToReproduce = t('feedback.errors.stepsToReproduceRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 构造 GitHub Issues URL
  const buildIssueUrl = (): string => {
    const labelMap: Record<FeedbackType, string> = {
      bug: 'bug',
      feature: 'enhancement',
      usage: 'question',
      other: 'other'
    }

    const typeLabels: Record<FeedbackType, string> = {
      bug: t('feedback.types.bug'),
      feature: t('feedback.types.feature'),
      usage: t('feedback.types.usage'),
      other: t('feedback.types.other')
    }

    let body = ''

    if (formData.type === 'bug') {
      body = `
## ${t('feedback.issueDescription')}
${formData.description}

## ${t('feedback.reproduceSteps')}
${formData.stepsToReproduce}

## ${t('feedback.expectedBehavior')}
${formData.expectedBehavior}

## ${t('feedback.actualBehavior')}
${formData.actualBehavior}

## ${t('feedback.systemInfoAuto')}
- **${t('feedback.os')}**: ${systemInfo.os}
- **${t('feedback.appVersion')}**: ${systemInfo.appVersion}
- **${t('feedback.pythonVersion')}**: ${systemInfo.pythonVersion}
- **${t('feedback.currentEnv')}**: ${systemInfo.currentEnv}
- **${t('feedback.comfyuiPath')}**: \`${systemInfo.comfyuiPath}\`
- **${t('feedback.comfyuiVersion')}**: ${systemInfo.comfyuiVersion}
- **${t('feedback.pytorchVersion')}**: ${systemInfo.pytorchVersion}
- **${t('feedback.cudaVersion')}**: ${systemInfo.cudaVersion}

## ${t('feedback.additionalInfo')}
${formData.additionalInfo || t('common.placeholder.none')}
`.trim()
    } else if (formData.type === 'feature') {
      body = `
## ${t('feedback.featureDescription')}
${formData.description}

## ${t('feedback.useCase')}
${formData.stepsToReproduce || t('feedback.placeholder.featureDescription')}

## ${t('feedback.expectedEffect')}
${formData.expectedBehavior || t('feedback.placeholder.featureDescription')}

## ${t('feedback.alternativeSolution')}
${formData.actualBehavior || t('feedback.placeholder.featureDescription')}

## ${t('feedback.additionalInfo')}
${formData.additionalInfo || t('common.placeholder.none')}

## ${t('feedback.systemInfoAuto')}
- **${t('feedback.os')}**: ${systemInfo.os}
- **${t('feedback.appVersion')}**: ${systemInfo.appVersion}
`.trim()
    } else {
      body = `
## ${t('feedback.issueDescription')}
${formData.description}

${formData.stepsToReproduce ? `## ${t('feedback.useCase')}\n${formData.stepsToReproduce}\n` : ''}
${formData.expectedBehavior ? `## ${t('feedback.expectedBehavior')}\n${formData.expectedBehavior}\n` : ''}
${formData.actualBehavior ? `## ${t('feedback.actualBehavior')}\n${formData.actualBehavior}\n` : ''}

## ${t('feedback.systemInfoAuto')}
- **${t('feedback.os')}**: ${systemInfo.os}
- **${t('feedback.appVersion')}**: ${systemInfo.appVersion}

## ${t('feedback.additionalInfo')}
${formData.additionalInfo || t('common.placeholder.none')}
`.trim()
    }

    const params = new URLSearchParams({
      title: `[${typeLabels[formData.type]}] ${formData.title}`,
      body,
      labels: labelMap[formData.type]
    })

    return `https://github.com/Allen-xxa/ComfyNexus/issues/new?${params.toString()}`
  }

  // 提交反馈
  const handleSubmit = async () => {
    if (!validateForm()) {
      showError(t('feedback.checkForm'))
      return
    }

    try {
      const url = buildIssueUrl()
      
      if (window.pywebview?.api?.open_url) {
        await window.pywebview.api.open_url(url)
      } else {
        window.open(url, '_blank')
      }
      
      success(t('feedback.githubOpened'))
    } catch (error) {
      console.error('Failed to open GitHub:', error)
      showError(t('feedback.openBrowserFailed'))
    }
  }

  // 重置表单
  const handleReset = () => {
    setFormData({
      type: 'bug',
      title: '',
      description: '',
      stepsToReproduce: '',
      expectedBehavior: '',
      actualBehavior: '',
      additionalInfo: ''
    })
    setErrors({})
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* 提示卡片 */}
      <Card className="border-primary/30 bg-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-2 text-sm text-primary">
              <p className="flex items-center gap-2 font-medium">
                <Lightbulb className="size-4" />
                {t('feedback.tip')}
              </p>
              <p>
                {t('feedback.tipContent')}
              </p>
              <p className="text-xs opacity-80">
                {t('feedback.noGithubAccount')}{' '}
                <a
                  href="https://github.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary/80"
                >
                  github.com/signup
                </a>
                {' '}{t('feedback.freeSignup')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 问题信息表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            {t('feedback.issueInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 问题类型和标题 - 横向布局 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
            {/* 问题类型 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('feedback.issueType')} <span className="text-danger">*</span>
              </label>
              <NativeSelect
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as FeedbackType })}
                className={cn(errors.type && 'border-danger')}
              >
                <option value="bug">🐛 {t('feedback.bugReport')}</option>
                <option value="feature">✨ {t('feedback.featureRequest')}</option>
                <option value="usage">❓ {t('feedback.usageQuestion')}</option>
                <option value="other">💬 {t('feedback.other')}</option>
              </NativeSelect>
              {errors.type && (
                <p className="text-sm text-danger">{errors.type}</p>
              )}
            </div>

            {/* 问题标题 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('feedback.issueTitle')} <span className="text-danger">*</span>
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("common.placeholder.issueSummary")}
                maxLength={100}
                className={cn(errors.title && 'border-danger')}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                {errors.title ? (
                  <span className="text-danger">{errors.title}</span>
                ) : (
                  <span></span>
                )}
                <span className={cn(
                  formData.title.length > 90 && 'text-warning',
                  formData.title.length === 100 && 'text-danger'
                )}>
                  {formData.title.length}/100
                </span>
              </div>
            </div>
          </div>

          {/* 问题描述 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('feedback.issueDescription')} <span className="text-danger">*</span>
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={
                formData.type === 'bug' 
                  ? t('feedback.placeholder.bugDescription')
                  : formData.type === 'feature'
                  ? t('feedback.placeholder.featureDescription')
                  : t('feedback.placeholder.generalDescription')
              }
              maxLength={2000}
              rows={4}
              className={cn(
                'w-full px-3 py-2 rounded-md border border-input bg-muted',
                'text-foreground',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'resize-y min-h-[100px]',
                errors.description && 'border-danger'
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {errors.description ? (
                <span className="text-danger">{errors.description}</span>
              ) : (
                <span></span>
              )}
              <span className={cn(
                formData.description.length > 1800 && 'text-warning',
                formData.description.length === 2000 && 'text-danger'
              )}>
                {formData.description.length}/2000
              </span>
            </div>
          </div>

          {formData.type === 'bug' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('feedback.reproduceSteps')} <span className="text-danger">*</span>
                </label>
                <Textarea
                  value={formData.stepsToReproduce}
                  onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                  placeholder={t("common.placeholder.reproduceSteps")}
                  maxLength={1000}
                  rows={4}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border border-input bg-muted',
                    'text-foreground',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    'resize-y min-h-[100px]',
                    errors.stepsToReproduce && 'border-danger'
                  )}
                />
                {errors.stepsToReproduce && (
                  <p className="text-sm text-danger">{errors.stepsToReproduce}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('feedback.expectedBehavior')}
                </label>
                <Textarea
                  value={formData.expectedBehavior}
                  onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
                  placeholder={t("common.placeholder.expectedBehavior")}
                  maxLength={1000}
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border border-input bg-muted',
                    'text-foreground',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    'resize-y min-h-[80px]',
                    errors.expectedBehavior && 'border-danger'
                  )}
                />
                {errors.expectedBehavior && (
                  <p className="text-sm text-danger">{errors.expectedBehavior}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('feedback.actualBehavior')}
                </label>
                <Textarea
                  value={formData.actualBehavior}
                  onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
                  placeholder={t("common.placeholder.actualBehavior")}
                  maxLength={1000}
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border border-input bg-muted',
                    'text-foreground',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    'resize-y min-h-[80px]',
                    errors.actualBehavior && 'border-danger'
                  )}
                />
                {errors.actualBehavior && (
                  <p className="text-sm text-danger">{errors.actualBehavior}</p>
                )}
              </div>
            </>
          )}

          {formData.type === 'feature' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('feedback.useCase')}
                </label>
                <Textarea
                  value={formData.stepsToReproduce}
                  onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                  placeholder={t("common.placeholder.featureScenario")}
                  maxLength={1000}
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border border-input bg-muted',
                    'text-foreground',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    'resize-y min-h-[80px]'
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('feedback.expectedEffect')}
                </label>
                <Textarea
                  value={formData.expectedBehavior}
                  onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
                  placeholder={t("common.placeholder.featureEffect")}
                  maxLength={1000}
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border border-input bg-muted',
                    'text-foreground',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    'resize-y min-h-[80px]'
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('feedback.alternativeSolution')}
                </label>
                <Textarea
                  value={formData.actualBehavior}
                  onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
                  placeholder={t("common.placeholder.alternativeSolution")}
                  maxLength={1000}
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border border-input bg-muted',
                    'text-foreground',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    'resize-y min-h-[80px]'
                  )}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('feedback.additionalInfo')}
            </label>
            <Textarea
              value={formData.additionalInfo}
              onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
              placeholder={t("common.placeholder.additionalInfo")}
              maxLength={1000}
              rows={3}
              className={cn(
                'w-full px-3 py-2 rounded-md border border-input bg-muted',
                'text-foreground',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'resize-y min-h-[80px]'
              )}
            />
            <p className="text-xs text-muted-foreground">
              {t('feedback.uploadHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 系统信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="size-5" />
            {t('feedback.systemInfoAuto')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">{t("feedback.os")}</span>
              <span className="font-medium">{systemInfo.os}</span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">{t("feedback.appVersion")}</span>
              <span className="font-medium">{systemInfo.appVersion}</span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">{t('feedback.pythonVersion')}</span>
              <span className="font-medium">{systemInfo.pythonVersion}</span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">{t("feedback.currentEnv")}</span>
              <span className="font-medium">{systemInfo.currentEnv}</span>
            </div>
            <div className="col-span-1 flex justify-between border-b border-border py-2 md:col-span-2">
              <span className="text-muted-foreground">{t('feedback.comfyuiPath')}</span>
              <span className="ml-4 truncate text-right font-medium" title={systemInfo.comfyuiPath}>
                {systemInfo.comfyuiPath}
              </span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">{t('feedback.comfyuiVersion')}</span>
              <span className="font-medium">{systemInfo.comfyuiVersion}</span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">{t('feedback.pytorchVersion')}</span>
              <span className="font-medium">{systemInfo.pytorchVersion}</span>
            </div>
            <div className="col-span-1 flex justify-between border-b border-border py-2 md:col-span-2">
              <span className="text-muted-foreground">{t('feedback.cudaVersion')}</span>
              <span className="font-medium">{systemInfo.cudaVersion}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw size={16} />
          {t('feedback.resetForm')}
        </Button>
        <Button
          onClick={handleSubmit}
          className="text-warning-foreground gap-2 bg-warning hover:bg-warning/90"
        >
          <Send size={16} />
          {t('feedback.submitFeedback')}
          <ExternalLink size={14} />
        </Button>
      </div>
    </div>
  )
}
