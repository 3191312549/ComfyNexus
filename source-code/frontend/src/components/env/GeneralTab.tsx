import { useTranslation } from 'react-i18next'
import { Tag, Microchip, Globe, FolderKanban, FolderOpen, FileCode, HelpCircle, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'
import type { GeneralTabProps } from '@/types/environment'

export function GeneralTab({
  config,
  dependencies,
  onConfigChange,
  onRefreshDependencies
}: GeneralTabProps) {
  const { t } = useTranslation()
  const [showListenNetworkHelp, setShowListenNetworkHelp] = useState(false)
  const [showPortHelp, setShowPortHelp] = useState(false)
  const [showTlsHelp, setShowTlsHelp] = useState(false)
  const [showCorsHelp, setShowCorsHelp] = useState(false)

  const handleSelectDirectory = async (type: 'comfyui' | 'python' | 'pip') => {
    try {
      let response
      
      if (type === 'comfyui') {
        if (!window.pywebview?.api?.select_directory) return
        response = await window.pywebview.api.select_directory()
      } else {
        if (!window.pywebview?.api?.select_file) return
        const fileTypes = ['Executable files (*.exe)', 'All files (*.*)']
        response = await window.pywebview.api.select_file(fileTypes)
      }
      
      if (!response) return
      
      if (response.success && response.path) {
        const path = response.path
        
        if (type === 'python') {
          if (!path.toLowerCase().endsWith('python.exe')) {
            alert(t('env.pathConfig.selectPython'))
            return
          }
        } else if (type === 'pip') {
          if (!path.toLowerCase().endsWith('pip.exe')) {
            alert(t('env.pathConfig.selectPip'))
            return
          }
        }
        
        if (type === 'comfyui') {
          onConfigChange({ comfyuiPath: path })
        } else if (type === 'python') {
          onConfigChange({ pythonPath: path })
        } else if (type === 'pip') {
          onConfigChange({ pipPath: path })
        }
      }
    } catch (error) {
      console.error('[GeneralTab] 选择失败:', error)
    }
  }

  const handleFileSelect = async (type: 'key' | 'cert') => {
    try {
      if (!window.pywebview?.api?.select_file) return

      const fileTypes = type === 'key' 
        ? ['PEM files (*.pem)', 'Key files (*.key)', 'All files (*.*)']
        : ['PEM files (*.pem)', 'Certificate files (*.crt;*.cer)', 'All files (*.*)']
      
      const result = await window.pywebview.api.select_file(fileTypes)
      
      if (!result) return
      
      if (result.success && result.path) {
        if (type === 'key') {
          onConfigChange({ tlsKeyfile: result.path })
        } else {
          onConfigChange({ tlsCertfile: result.path })
        }
      }
    } catch (error) {
      console.error('[GeneralTab] 文件选择失败:', error)
    }
  }

  const handleBrowsePath = async (type: string) => {
    try {
      if (!window.pywebview?.api?.select_directory) return
      const result = await window.pywebview.api.select_directory()
      
      if (!result) return
      
      if (result.success && result.path) {
        onConfigChange({ [type]: result.path })
      }
    } catch (error) {
      console.error('[GeneralTab] 选择文件夹失败:', error)
    }
  }

  const depItems = [
    { label: t('env.general.pythonVersion'), value: dependencies.pythonVersion },
    { label: t('env.general.pytorchVersion'), value: dependencies.pytorchVersion },
    { label: t('env.general.cudaVersion'), value: dependencies.cudaVersion },
    { label: t('env.general.sageAttentionVersion'), value: dependencies.sageAttentionVersion },
    { label: t('env.general.flashAttnVersion'), value: dependencies.flashAttnVersion },
    { label: t('env.general.tritonVersion'), value: dependencies.tritonVersion },
    { label: t('env.general.xformersVersion'), value: dependencies.xformersVersion }
  ]

  const pathFields = [
    { key: 'inputDirectory', label: t('env.acceleration.paths.inputDirectory') },
    { key: 'outputDirectory', label: t('env.acceleration.paths.outputDirectory') },
    { key: 'tempDirectory', label: t('env.acceleration.paths.tempDirectory') },
    { key: 'userDirectory', label: t('env.acceleration.paths.userDirectory') }
  ]

  return (
    <div className="space-y-10">
      {/* 基本信息与核心路径 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-start">
        <div className="lg:col-span-4 lg:sticky lg:top-36">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            {t('env.general.basicInfoAndPaths')}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-2.5 leading-relaxed">
            {t('env.general.basicInfoDesc')}
          </p>
        </div>
        <div className="lg:col-span-8">
          <div className="premium-card">
            <div className="divide-y divide-border">
              <div className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="pr-8">
                  <label className="text-sm font-semibold text-foreground block">{t('env.general.alias')}</label>
                  <p className="text-[13px] text-muted-foreground mt-1">{t('env.general.aliasHint')}</p>
                </div>
                <div className="w-72 shrink-0">
                  <Input
                    value={config.alias || ''}
                    onChange={(e) => onConfigChange({ alias: e.target.value })}
                    placeholder="ComfyUI"
                  />
                </div>
              </div>
              <div className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="pr-8">
                  <label className="text-sm font-semibold text-foreground block">{t('env.general.comfyuiPath')}</label>
                </div>
                <div className="w-80 shrink-0 flex gap-2">
                  <Input
                    value={config.comfyuiPath}
                    onChange={(e) => onConfigChange({ comfyuiPath: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleSelectDirectory('comfyui')}>
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="pr-8">
                  <label className="text-sm font-semibold text-foreground block">{t('env.general.pythonPath')}</label>
                </div>
                <div className="w-80 shrink-0 flex gap-2">
                  <Input
                    value={config.pythonPath}
                    onChange={(e) => onConfigChange({ pythonPath: e.target.value })}
                    placeholder="C:\Python\python.exe"
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleSelectDirectory('python')}>
                    <FileCode className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="pr-8">
                  <label className="text-sm font-semibold text-foreground block">{t('env.general.pipPath')}</label>
                </div>
                <div className="w-80 shrink-0 flex gap-2">
                  <Input
                    value={config.pipPath}
                    onChange={(e) => onConfigChange({ pipPath: e.target.value })}
                    placeholder="C:\Python\Scripts\pip.exe"
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleSelectDirectory('pip')}>
                    <FileCode className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ghost-divider my-5" />

      {/* 底层依赖探针 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-start">
        <div className="lg:col-span-4 lg:sticky lg:top-36">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Microchip className="w-4 h-4 text-muted-foreground" />
            {t('env.general.dependencies')}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-2.5 leading-relaxed">
            {t('env.general.dependenciesDesc')}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 text-xs py-1.5 flex items-center gap-1.5"
            onClick={onRefreshDependencies}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('env.general.refreshButton')}
          </Button>
        </div>
        <div className="lg:col-span-8">
          <div className="premium-card bg-muted/30">
            <div className="divide-y divide-border p-2">
              {depItems.map((item, index) => (
                <div key={index} className="px-6 py-3 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
                  <span className="text-[13px] font-mono font-semibold text-foreground bg-background px-2 py-1 rounded shadow-sm border border-border">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="ghost-divider my-5" />

      {/* 网络与服务架构 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-start">
        <div className="lg:col-span-4 lg:sticky lg:top-36">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            {t('env.acceleration.network.title')}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-2.5 leading-relaxed">
            {t('env.acceleration.network.desc')}
          </p>
        </div>
        <div className="lg:col-span-8">
          <div className="premium-card">
            <div className="divide-y divide-border">
              <div className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="pr-8 flex items-center gap-2">
                  <label className="text-sm font-semibold text-foreground">{t('env.acceleration.network.listenNetwork')}</label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowListenNetworkHelp(true)}
                    className="text-muted-foreground size-5 p-0 hover:text-foreground"
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
                <div className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="pr-8">
                    <label className="text-sm font-semibold text-foreground block">{t('env.acceleration.network.listenAddress')}</label>
                  </div>
                  <div className="w-80 shrink-0">
                    <Input
                      value={config?.listenAddress || ''}
                      onChange={(e) => onConfigChange({ listenAddress: e.target.value })}
                      placeholder={t('env.acceleration.network.listenAddressPlaceholder')}
                      className="font-mono text-[13px]"
                    />
                  </div>
                </div>
              )}
              <div className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="pr-8">
                  <label className="text-sm font-semibold text-foreground block">{t('env.acceleration.network.port')}</label>
                </div>
                <div className="w-32 shrink-0">
                  <Input
                    type="number"
                    value={config?.port || 8188}
                    onChange={(e) => onConfigChange({ port: parseInt(e.target.value) })}
                    min="1024"
                    max="65535"
                    className="font-mono text-center"
                  />
                </div>
              </div>
              <div className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="pr-8">
                  <label className="text-sm font-semibold text-foreground block">{t('env.acceleration.network.tlsKeyfile')}</label>
                </div>
                <div className="w-80 shrink-0 flex gap-2">
                  <Input
                    value={config?.tlsKeyfile || ''}
                    onChange={(e) => onConfigChange({ tlsKeyfile: e.target.value })}
                    placeholder="/path/to/key.pem"
                    className="font-mono text-[13px]"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleFileSelect('key')}>
                    {t('common.browse')}
                  </Button>
                </div>
              </div>
              <div className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="pr-8">
                  <label className="text-sm font-semibold text-foreground block">{t('env.acceleration.network.tlsCertfile')}</label>
                </div>
                <div className="w-80 shrink-0 flex gap-2">
                  <Input
                    value={config?.tlsCertfile || ''}
                    onChange={(e) => onConfigChange({ tlsCertfile: e.target.value })}
                    placeholder="/path/to/cert.pem"
                    className="font-mono text-[13px]"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleFileSelect('cert')}>
                    {t('common.browse')}
                  </Button>
                </div>
              </div>
              <div className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="pr-8 flex items-center gap-2">
                  <label className="text-sm font-semibold text-foreground">{t('env.acceleration.network.enableCors')}</label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCorsHelp(true)}
                    className="text-muted-foreground size-5 p-0 hover:text-foreground"
                  >
                    <HelpCircle className="size-4" />
                  </Button>
                </div>
                <Switch
                  checked={config?.enableCors || false}
                  onCheckedChange={(checked) => onConfigChange({ enableCors: checked })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ghost-divider my-5" />

      {/* 工作区目录映射 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-start">
        <div className="lg:col-span-4 lg:sticky lg:top-36">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-muted-foreground" />
            {t('env.acceleration.paths.title')}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-2.5 leading-relaxed">
            {t('env.acceleration.paths.desc')}
          </p>
        </div>
        <div className="lg:col-span-8">
          <div className="premium-card">
            <div className="divide-y divide-border">
              {pathFields.map((field) => (
                <div key={field.key} className="p-3 px-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="pr-8">
                    <label className="text-sm font-semibold text-foreground block">{field.label}</label>
                  </div>
                  <div className="w-80 shrink-0 flex gap-2">
                    <Input
                      value={(config?.[field.key as keyof typeof config] as string) || ''}
                      onChange={(e) => onConfigChange({ [field.key]: e.target.value })}
                      className="font-mono text-[13px]"
                    />
                    <Button variant="outline" size="sm" onClick={() => handleBrowsePath(field.key)}>
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 帮助弹窗 - 局域网访问 */}
      <Dialog open={showListenNetworkHelp} onOpenChange={(open) => !open && setShowListenNetworkHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.lanAccessHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.network.listenNetworkTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.function")}:</span>{t('env.acceleration.network.listenDesc')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.defaultBehavior")}:</span>{t('env.acceleration.network.listenDefault')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.afterEnable")}:</span>{t('env.acceleration.network.listenEnabled')}
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
                <span className="font-medium">{t("env.acceleration.network.securityWarning")}:</span>{t('env.acceleration.network.securityWarningDesc')}
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

      {/* 帮助弹窗 - 访问端口 */}
      <Dialog open={showPortHelp} onOpenChange={(open) => !open && setShowPortHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.portHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                {t('env.acceleration.network.portTitle')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.function")}:</span>{t('env.acceleration.network.portDesc')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.defaultValue")}:</span>{t('env.acceleration.network.defaultValue8188')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.accessAddress")}:</span>{t('env.acceleration.network.accessAddressLocalhost')}
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
                <span className="font-medium">{t("env.acceleration.network.portRange")}:</span>1024-65535
              </p>
            </div>
            <div className="border-primary bg-primary/10 rounded border-l-4 p-3">
              <p className="text-primary text-sm">
                <span className="font-medium">{t('env.acceleration.network.tip')}:</span>{t('env.acceleration.network.portChangeHint')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - SSL/TLS */}
      <Dialog open={showTlsHelp} onOpenChange={(open) => !open && setShowTlsHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.sslTlsHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 font-semibold">
                HTTPS {t('env.acceleration.network.tlsEncryption')}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.function")}:</span>{t('env.acceleration.network.tlsDesc')}
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
            </div>
            <div className="border-primary bg-primary/10 rounded border-l-4 p-3">
              <p className="text-primary text-sm">
                <span className="font-medium">{t('env.acceleration.network.tip')}:</span>{t('env.acceleration.network.localNoSsl')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助弹窗 - CORS */}
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
                <span className="font-medium">{t("env.acceleration.network.function")}:</span>{t('env.acceleration.network.corsDesc')}
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">{t("env.acceleration.network.techNote")}:</span>{t('env.acceleration.network.corsTechNote')}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
