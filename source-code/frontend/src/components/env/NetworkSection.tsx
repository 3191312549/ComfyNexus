import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { NetworkSectionProps } from '@/types/environment'

export function NetworkSection({ config, onConfigChange }: NetworkSectionProps) {
  const { t } = useTranslation()
  const [showListenNetworkHelp, setShowListenNetworkHelp] = useState(false)
  const [showPortHelp, setShowPortHelp] = useState(false)
  const [showTlsHelp, setShowTlsHelp] = useState(false)
  const [showCorsHelp, setShowCorsHelp] = useState(false)

  const handleFileSelect = async (type: 'key' | 'cert') => {
    console.log('[NetworkSection] 开始选择文件，类型:', type)
    
    try {
      if (!window.pywebview?.api?.select_file) {
        console.warn('[NetworkSection] pywebview API not available')
        return
      }

      const fileTypes = type === 'key' 
        ? ['PEM files (*.pem)', 'Key files (*.key)', 'All files (*.*)']
        : ['PEM files (*.pem)', 'Certificate files (*.crt;*.cer)', 'All files (*.*)']
      
      console.log('[NetworkSection] 调用 select_file API，文件类型:', fileTypes)
      const result = await window.pywebview.api.select_file(fileTypes)
      console.log('[NetworkSection] API 返回结果:', result)
      console.log('[NetworkSection] result 类型:', typeof result)
      console.log('[NetworkSection] result 是否为 undefined:', result === undefined)
      console.log('[NetworkSection] result 是否为 null:', result === null)
      
      if (!result) {
        console.error('[NetworkSection] API 返回了空值 (undefined 或 null)')
        return
      }
      
      if (result.success && result.path) {
        console.log('[NetworkSection] 选择成功，路径:', result.path, '类型:', type)
        if (type === 'key') {
          onConfigChange({ tlsKeyfile: result.path })
        } else {
          onConfigChange({ tlsCertfile: result.path })
        }
      } else {
        console.log('[NetworkSection] 用户取消选择或选择失败')
      }
    } catch (error) {
      console.error('[NetworkSection] 文件选择失败:', error)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('env.acceleration.network.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.network.listenNetwork')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowListenNetworkHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.lanAccessHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <Switch
            checked={config?.listenNetwork || false}
            onCheckedChange={(checked) => onConfigChange({ listenNetwork: checked })}
          />
        </div>

        {config?.listenNetwork && (
          <div className="flex items-center gap-4">
            <div className="flex min-w-[120px] items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('env.acceleration.network.listenAddress')}
              </label>
            </div>
            <div className="flex-1">
              <Input
                value={config?.listenAddress || ''}
                onChange={(e) => onConfigChange({ listenAddress: e.target.value })}
                placeholder={t('env.acceleration.network.listenAddressPlaceholder')}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.network.port')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPortHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.portHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex-1">
            <Input
              type="number"
              value={config?.port || 8188}
              onChange={(e) => onConfigChange({ port: parseInt(e.target.value) })}
              min="1024"
              max="65535"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.network.tlsKeyfile')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTlsHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.tlsHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex flex-1 gap-2">
            <Input
              value={config?.tlsKeyfile || ''}
              onChange={(e) => onConfigChange({ tlsKeyfile: e.target.value })}
              placeholder="/path/to/key.pem"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFileSelect('key')}
              className="whitespace-nowrap"
            >
              {t('env.acceleration.network.browse')}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex min-w-[120px] items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.network.tlsCertfile')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTlsHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.dnsHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <div className="flex flex-1 gap-2">
            <Input
              value={config?.tlsCertfile || ''}
              onChange={(e) => onConfigChange({ tlsCertfile: e.target.value })}
              placeholder="/path/to/cert.pem"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFileSelect('cert')}
              className="whitespace-nowrap"
            >
              {t('env.acceleration.network.browse')}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              {t('env.acceleration.network.enableCors')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCorsHelp(true)}
              className="text-muted-foreground size-6 p-0 hover:text-foreground"
              aria-label={t('common.aria.corsHelp')}
            >
              <HelpCircle className="size-4" />
            </Button>
          </div>
          <Switch
            checked={config?.enableCors || false}
            onCheckedChange={(checked) => onConfigChange({ enableCors: checked })}
          />
        </div>
      </CardContent>

      <Dialog open={showListenNetworkHelp} onOpenChange={(open) => !open && setShowListenNetworkHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.lanAccessHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.network.lanAccessTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.function")}:</span>{t('env.acceleration.network.lanAccessFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.defaultBehavior")}:</span>{t('env.acceleration.network.lanAccessDefault')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.afterEnable")}:</span>{t('env.acceleration.network.lanAccessAfterEnable')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.useCase")}:</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.network.mobileAccess')}</li>
                <li>{t('env.acceleration.network.teamCollab')}</li>
                <li>{t('env.acceleration.network.remoteAccess')}</li>
              </ul>
            </div>
            <div className="border-danger bg-danger/10 rounded border-l-4 p-3">
              <p className="text-danger mb-2 text-sm">
                <span className="font-medium">{t("env.acceleration.network.securityWarning")}:</span>{t('env.acceleration.network.lanAccessSecurityWarning')}
              </p>
              <ul className="text-danger ml-2 list-inside list-disc text-sm">
                <li>{t('env.acceleration.network.firewallSuggestion')}</li>
                <li>{t('env.acceleration.network.noPublicWifi')}</li>
                <li>{t('env.acceleration.network.sslForPublic')}</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPortHelp} onOpenChange={(open) => !open && setShowPortHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.portHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.network.webPortTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.function")}:</span>{t('env.acceleration.network.webPortFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.defaultValue")}:</span>{t('env.acceleration.network.webPortDefaultValue')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.accessAddress")}:</span>{t('env.acceleration.network.webPortAccessAddress')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.whenToModify")}:</span>
              </p>
              <ul className="mb-2 ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.network.port8188Occupied')}</li>
                <li>{t('env.acceleration.network.multiInstance')}</li>
                <li>{t('env.acceleration.network.enterprisePort')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.portRange")}:</span>{t('env.acceleration.network.webPortRange')}
              </p>
            </div>
            <div className="border-primary bg-primary/10 rounded border-l-4 p-3">
              <p className="text-primary text-sm">
                <span className="font-medium">{t('env.acceleration.network.tip')}:</span>{t('env.acceleration.network.portChangeHint')}
              </p>
            </div>
            <div className="border-warning bg-warning/10 rounded border-l-4 p-3">
              <p className="text-warning text-sm">
                <span className="font-medium">{t('env.acceleration.network.note')}:</span>{t('env.acceleration.network.avoidReservedPorts')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTlsHelp} onOpenChange={(open) => !open && setShowTlsHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.sslTlsHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.network.httpsTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.function")}:</span>{t('env.acceleration.network.httpsFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.requiredFiles")}:</span>
              </p>
              <ul className="mb-2 ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li><span className="font-medium">{t('env.acceleration.network.sslKeyFile')}</span>{t('env.acceleration.network.sslKeyDesc')}</li>
                <li><span className="font-medium">{t('env.acceleration.network.sslCertFile')}</span>{t('env.acceleration.network.sslCertDesc')}</li>
              </ul>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.useCase")}:</span>
              </p>
              <ul className="mb-2 ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.network.publicAccessComfy')}</li>
                <li>{t('env.acceleration.network.protectDataTransfer')}</li>
                <li>{t('env.acceleration.network.enterpriseCompliance')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.howToGetCert")}:</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.network.letsEncrypt')}</li>
                <li>{t('env.acceleration.network.commercialSSL')}</li>
                <li>{t('env.acceleration.network.selfSignedCert')}</li>
              </ul>
            </div>
            <div className="border-primary bg-primary/10 rounded border-l-4 p-3">
              <p className="text-primary text-sm">
                <span className="font-medium">{t('env.acceleration.network.tip')}:</span>{t('env.acceleration.network.localNoSsl')}
              </p>
            </div>
            <div className="border-warning bg-warning/10 rounded border-l-4 p-3">
              <p className="text-warning text-sm">
                <span className="font-medium">{t('env.acceleration.network.note')}:</span>{t('env.acceleration.network.httpsAccessHint')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCorsHelp} onOpenChange={(open) => !open && setShowCorsHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.corsHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.network.corsTitleFull')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.function")}:</span>{t('env.acceleration.network.corsFunction')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.techNote")}:</span>{t('env.acceleration.network.corsTechNoteFull')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.useCase")}:</span>
              </p>
              <ul className="ml-2 list-inside list-disc text-sm text-muted-foreground">
                <li>{t('env.acceleration.network.devCustomFrontend')}</li>
                <li>{t('env.acceleration.network.apiFromOtherSite')}</li>
                <li>{t('env.acceleration.network.thirdPartyIntegration')}</li>
                <li>{t('env.acceleration.network.browserExtension')}</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.defaultBehavior")}:</span>{t('env.acceleration.network.corsDefaultBehavior')}
              </p>
            </div>
            <div className="border-warning bg-warning/10 rounded border-l-4 p-3">
              <p className="text-warning mb-2 text-sm">
                <span className="font-medium">{t("env.acceleration.network.securityTip")}:</span>{t('env.acceleration.network.corsSecurityTip')}
              </p>
              <ul className="text-danger ml-2 list-inside list-disc text-sm">
                <li>{t('env.acceleration.network.corsWarning1')}</li>
                <li>{t('env.acceleration.network.corsWarning2')}</li>
                <li>{t('env.acceleration.network.corsWarning3')}</li>
              </ul>
            </div>
            <div className="border-danger bg-danger/10 rounded border-l-4 p-3">
              <p className="text-danger text-sm">
                <span className="font-medium">{t("env.acceleration.network.prodSuggestion")}:</span>{t('env.acceleration.network.corsProdSuggestion')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
