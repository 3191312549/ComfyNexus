import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, FolderOpen, Info, CheckCircle, Database } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { bridgeService } from '@/services/bridge'

interface ModelPathConfig {
  name: string
  basePath: string
  isDefault?: boolean
  paths: {
    checkpoints?: string
    clip?: string
    clipVision?: string
    configs?: string
    controlnet?: string
    diffusionModels?: string
    embeddings?: string
    loras?: string
    upscaleModels?: string
    vae?: string
    gligen?: string
    hypernetworks?: string
    customNodes?: string
    styleModels?: string
    diffusers?: string
    vaeApprox?: string
    t2iAdapter?: string
    latentUpscaleModels?: string
    photomaker?: string
    classifiers?: string
    modelPatches?: string
    audioEncoders?: string
    frameInterpolation?: string
    [key: string]: string | undefined
  }
}

interface CustomField {
  key: string
  value: string
}

interface ModelPathsTabProps {
  configs: ModelPathConfig[]
  onConfigsChange: (configs: ModelPathConfig[]) => void
}

export function ModelPathsTab({ configs, onConfigsChange }: ModelPathsTabProps) {
  const { t } = useTranslation()
  const [autoFilledIndex, setAutoFilledIndex] = useState<number | null>(null)
  const [showBasePathHelp, setShowBasePathHelp] = useState(false)
  const [customFields, setCustomFields] = useState<Record<number, CustomField[]>>({})

  const handleAddConfig = () => {
    const newConfig: ModelPathConfig = {
      name: '',
      basePath: '',
      isDefault: false,
      paths: {}
    }
    onConfigsChange([...configs, newConfig])
  }

  const handleDeleteConfig = (index: number) => {
    const config = configs[index]
    if (config.name && !window.confirm(t('env.acceleration.modelPaths.deleteConfirm', { name: config.name }))) {
      return
    }
    const newConfigs = configs.filter((_, i) => i !== index)
    onConfigsChange(newConfigs)
  }

  const handleConfigChange = (index: number, field: keyof ModelPathConfig, value: unknown) => {
    const newConfigs = [...configs]
    newConfigs[index] = { ...newConfigs[index], [field]: value }
    onConfigsChange(newConfigs)
    
    if (field === 'basePath' && typeof value === 'string' && value.trim()) {
      detectAndFillComfyUIPaths(index, value)
    }
  }

  const handlePathChange = (configIndex: number, pathKey: string, value: string) => {
    const newConfigs = [...configs]
    newConfigs[configIndex] = {
      ...newConfigs[configIndex],
      paths: {
        ...newConfigs[configIndex].paths,
        [pathKey]: value
      }
    }
    onConfigsChange(newConfigs)
  }

  const handleAddCustomField = (configIndex: number) => {
    setCustomFields(prev => ({
      ...prev,
      [configIndex]: [...(prev[configIndex] || []), { key: '', value: '' }]
    }))
  }

  const handleRemoveCustomField = (configIndex: number, fieldIndex: number) => {
    setCustomFields(prev => {
      const updated = [...(prev[configIndex] || [])]
      updated.splice(fieldIndex, 1)
      return { ...prev, [configIndex]: updated }
    })
  }

  const handleCustomFieldChange = (configIndex: number, fieldIndex: number, field: 'key' | 'value', val: string) => {
    setCustomFields(prev => {
      const updated = [...(prev[configIndex] || [])]
      updated[fieldIndex] = { ...updated[fieldIndex], [field]: val }
      return { ...prev, [configIndex]: updated }
    })
  }

  // 同步自定义字段到 configs 的 paths 中
  useEffect(() => {
    const newConfigs = [...configs]
    let hasChanges = false
    for (const configIndex of Object.keys(customFields)) {
      const idx = Number(configIndex)
      if (idx >= newConfigs.length) continue
      const customPaths: Record<string, string> = {}
      for (const field of customFields[idx] || []) {
        if (field.key.trim()) {
          customPaths[field.key.trim()] = field.value
        }
      }
      // 合并：移除旧的自定义键，添加新值
      const currentPaths = { ...newConfigs[idx].paths }
      const standardKeys = new Set(modelTypeFields.map(f => f.key))
      for (const key of Object.keys(currentPaths)) {
        if (!standardKeys.has(key)) {
          delete currentPaths[key]
        }
      }
      Object.assign(currentPaths, customPaths)
      if (JSON.stringify(currentPaths) !== JSON.stringify(newConfigs[idx].paths)) {
        newConfigs[idx] = { ...newConfigs[idx], paths: currentPaths }
        hasChanges = true
      }
    }
    if (hasChanges) {
      onConfigsChange(newConfigs)
    }
  }, [customFields, configs.length])

  // 从外部 configs 变化中提取自定义字段（用于加载数据时）
  useEffect(() => {
    const newCustomFields: Record<number, CustomField[]> = {}
    for (let idx = 0; idx < configs.length; idx++) {
      const config = configs[idx]
      const standardKeys = new Set(modelTypeFields.map(f => f.key))
      const custom: CustomField[] = []
      for (const key of Object.keys(config.paths || {})) {
        if (!standardKeys.has(key) && config.paths[key] !== undefined && config.paths[key] !== null) {
          custom.push({ key, value: config.paths[key] || '' })
        }
      }
      if (custom.length > 0) {
        newCustomFields[idx] = custom
      }
    }
    // 只有在实际变化时才更新，避免循环触发
    setCustomFields(prev => {
      const prevJson = JSON.stringify(prev)
      const newJson = JSON.stringify(newCustomFields)
      if (prevJson !== newJson) {
        return newCustomFields
      }
      return prev
    })
  }, [configs])

  const handleBrowse = async (configIndex: number, field: 'basePath' | string) => {
    try {
      if (!window.pywebview?.api?.select_directory) {
        console.warn('pywebview API not available')
        return
      }

      const response = await window.pywebview.api.select_directory()
      
      if (response.success && response.path) {
        if (field === 'basePath') {
          handleConfigChange(configIndex, 'basePath', response.path)
        } else {
          handlePathChange(configIndex, field, response.path)
        }
      }
    } catch (error) {
      console.error('Failed to select directory:', error)
    }
  }

  const detectAndFillComfyUIPaths = async (configIndex: number, basePath: string) => {
    try {
      let processedPath = basePath.trim()
      
      const modelsPattern = /[\\/]models[\\/]?$/i
      
      if (modelsPattern.test(processedPath)) {
        processedPath = processedPath.replace(modelsPattern, '')
        
        const newConfigs = [...configs]
        newConfigs[configIndex] = {
          ...newConfigs[configIndex],
          basePath: processedPath
        }
        onConfigsChange(newConfigs)
      }
      
      const pathLower = processedPath.toLowerCase()
      const isComfyUIByName = pathLower.includes('comfyui') || pathLower.includes('comfy')
      
      if (isComfyUIByName) {
        const newConfigs = [...configs]
        newConfigs[configIndex] = {
          ...newConfigs[configIndex],
          basePath: processedPath,
          paths: {
            checkpoints: 'models/checkpoints',
            clip: 'models/clip',
            clipVision: 'models/clip_vision',
            configs: 'models/configs',
            controlnet: 'models/controlnet',
            diffusionModels: 'models/unet',
            embeddings: 'models/embeddings',
            loras: 'models/loras',
            upscaleModels: 'models/upscale_models',
            vae: 'models/vae',
            gligen: 'models/gligen',
            hypernetworks: 'models/hypernetworks',
            customNodes: 'custom_nodes',
            styleModels: 'models/style_models',
            diffusers: 'models/diffusers',
            vaeApprox: 'models/vae_approx',
            t2iAdapter: 'models/t2i_adapter',
            latentUpscaleModels: 'models/latent_upscale_models',
            photomaker: 'models/photomaker',
            classifiers: 'models/classifiers',
            modelPatches: 'models/model_patches',
            audioEncoders: 'models/audio_encoders',
            frameInterpolation: 'models/frame_interpolation',
          }
        }
        onConfigsChange(newConfigs)
        
        setAutoFilledIndex(configIndex)
        setTimeout(() => setAutoFilledIndex(null), 3000)
        return
      }
      
      const result = await bridgeService.detectModelPathsStructure(processedPath)
      
      if (result.success && result.is_comfyui_style && result.detected_paths) {
        const mappedPaths: Record<string, string> = {}
        
        const pathMapping: Record<string, string> = {
          'checkpoints': 'checkpoints',
          'clip': 'clip',
          'clip_vision': 'clipVision',
          'configs': 'configs',
          'controlnet': 'controlnet',
          'unet': 'diffusionModels',
          'diffusion_models': 'diffusionModels',
          'embeddings': 'embeddings',
          'loras': 'loras',
          'upscale_models': 'upscaleModels',
          'vae': 'vae',
          'gligen': 'gligen',
          'hypernetworks': 'hypernetworks',
          'custom_nodes': 'customNodes',
          'style_models': 'styleModels',
          'diffusers': 'diffusers',
          'vae_approx': 'vaeApprox',
          't2i_adapter': 't2iAdapter',
          'latent_upscale_models': 'latentUpscaleModels',
          'photomaker': 'photomaker',
          'classifiers': 'classifiers',
          'model_patches': 'modelPatches',
          'audio_encoders': 'audioEncoders',
          'frame_interpolation': 'frameInterpolation',
        }
        
        for (const [key, value] of Object.entries(result.detected_paths)) {
          const mappedKey = pathMapping[key] || key
          mappedPaths[mappedKey] = value
        }
        
        const newConfigs = [...configs]
        newConfigs[configIndex] = {
          ...newConfigs[configIndex],
          basePath: processedPath,
          paths: mappedPaths
        }
        onConfigsChange(newConfigs)
        
        setAutoFilledIndex(configIndex)
        setTimeout(() => setAutoFilledIndex(null), 3000)
      }
    } catch (error) {
      console.error('Failed to detect ComfyUI directory:', error)
    }
  }

  const modelTypeFields = [
    { key: 'checkpoints', label: t('env.acceleration.modelPaths.checkpoints') },
    { key: 'clip', label: t('env.acceleration.modelPaths.clip') },
    { key: 'clipVision', label: t('env.acceleration.modelPaths.clipVision') },
    { key: 'configs', label: t('env.acceleration.modelPaths.configs') },
    { key: 'controlnet', label: t('env.acceleration.modelPaths.controlnet') },
    { key: 'diffusionModels', label: t('env.acceleration.modelPaths.diffusionModels') },
    { key: 'embeddings', label: t('env.acceleration.modelPaths.embeddings') },
    { key: 'loras', label: t('env.acceleration.modelPaths.loras') },
    { key: 'upscaleModels', label: t('env.acceleration.modelPaths.upscaleModels') },
    { key: 'vae', label: t('env.acceleration.modelPaths.vae') },
    { key: 'gligen', label: t('env.acceleration.modelPaths.gligen') },
    { key: 'hypernetworks', label: t('env.acceleration.modelPaths.hypernetworks') },
    { key: 'customNodes', label: t('env.acceleration.modelPaths.customNodes') },
    { key: 'styleModels', label: t('env.acceleration.modelPaths.styleModels') },
    { key: 'diffusers', label: t('env.acceleration.modelPaths.diffusers') },
    { key: 'vaeApprox', label: t('env.acceleration.modelPaths.vaeApprox') },
    { key: 't2iAdapter', label: t('env.acceleration.modelPaths.t2iAdapter') },
    { key: 'latentUpscaleModels', label: t('env.acceleration.modelPaths.latentUpscaleModels') },
    { key: 'photomaker', label: t('env.acceleration.modelPaths.photomaker') },
    { key: 'classifiers', label: t('env.acceleration.modelPaths.classifiers') },
    { key: 'modelPatches', label: t('env.acceleration.modelPaths.modelPatches') },
    { key: 'audioEncoders', label: t('env.acceleration.modelPaths.audioEncoders') },
    { key: 'frameInterpolation', label: t('env.acceleration.modelPaths.frameInterpolation') }
  ]

  return (
    <div className="space-y-12">
      <div className="rounded-[0.875rem] border-l-4 border-l-primary bg-primary/5 p-6 ring-1 ring-border-subtle">
        <div className="flex items-start gap-4">
          <Info className="mt-0.5 size-6 shrink-0 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {t('env.acceleration.modelPaths.infoTitle')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('env.acceleration.modelPaths.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-x-12 gap-y-6 lg:grid-cols-12">
        <div className="lg:sticky lg:top-36 lg:col-span-4">
          <h3 className="text-base font-bold text-foreground">
            {t('env.acceleration.modelPaths.configList')}
          </h3>
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
            {t('env.acceleration.modelPaths.configListDesc')}
          </p>
          <Button
            variant="outline"
            onClick={handleAddConfig}
            className="mt-6 flex w-full items-center justify-center gap-2 border-2 border-dashed py-6 text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            <Plus className="size-4" />
            {t('env.acceleration.modelPaths.addConfig')}
          </Button>
        </div>
        
        <div className="space-y-6 lg:col-span-8">
          {configs.map((config, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[0.875rem] bg-surface shadow-soft ring-1 ring-border-subtle transition-shadow duration-300 hover:shadow-soft-md"
            >
              <div className="flex items-center justify-between border-b border-border-subtle bg-surface-hover p-4">
                <div className="flex items-center gap-3">
                  <Database className="size-4 text-primary" />
                  <h3 className="text-[15px] font-semibold text-foreground">
                    {config.name || t('env.acceleration.modelPaths.configName')}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteConfig(index)}
                  className="text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              
              <div className="divide-y divide-border-subtle">
                <div className="flex items-center justify-between p-5 transition-colors hover:bg-muted/50">
                  <div className="pr-8">
                    <label className="block text-sm font-semibold text-foreground">
                      {t('env.acceleration.modelPaths.configName')}
                    </label>
                  </div>
                  <div className="w-72 shrink-0">
                    <Input
                      value={config.name}
                      onChange={(e) => handleConfigChange(index, 'name', e.target.value)}
                      placeholder={t('env.acceleration.modelPaths.configNamePlaceholder')}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-5 transition-colors hover:bg-muted/50">
                  <div className="pr-8">
                    <label className="block text-sm font-semibold text-foreground">
                      {t('env.acceleration.modelPaths.basePath')}
                    </label>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      {t('env.acceleration.modelPaths.basePathHint')}
                    </p>
                  </div>
                  <div className="flex w-80 shrink-0 gap-2">
                    <Input
                      value={config.basePath}
                      onChange={(e) => handleConfigChange(index, 'basePath', e.target.value)}
                      placeholder={t('common.placeholder.modelPathExample')}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBrowse(index, 'basePath')}
                      className="shrink-0 px-3"
                    >
                      <FolderOpen className="size-4" />
                    </Button>
                  </div>
                </div>
                
                <div 
                  className="flex cursor-pointer items-center justify-between p-5 transition-colors hover:bg-muted/50"
                  onClick={() => handleConfigChange(index, 'isDefault', !config.isDefault)}
                >
                  <div className="pr-8">
                    <label className="cursor-pointer text-sm font-semibold text-foreground">
                      {t('env.acceleration.modelPaths.isDefault')}
                    </label>
                  </div>
                  <Switch
                    checked={config.isDefault || false}
                    onCheckedChange={(checked) => handleConfigChange(index, 'isDefault', checked)}
                  />
                </div>
                
                {/* 自定义映射区域 */}
                <div className="bg-muted/20 p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('env.acceleration.modelPaths.customMappings')}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddCustomField(index)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    >
                      <Plus className="size-3" />
                      {t('env.acceleration.modelPaths.addCustomMapping')}
                    </Button>
                  </div>
                  {customFields[index] && customFields[index].length > 0 && (
                    <div className="mt-3 space-y-2">
                      {customFields[index].map((field, fieldIndex) => (
                        <div key={fieldIndex} className="flex items-center gap-4">
                          <Input
                            value={field.key}
                            onChange={(e) => handleCustomFieldChange(index, fieldIndex, 'key', e.target.value)}
                            placeholder={t('env.acceleration.modelPaths.customMappingDirNamePlaceholder')}
                            className="w-40 font-mono text-[13px] shrink-0"
                          />
                          <div className="flex flex-1 gap-2">
                            <Input
                              value={field.value}
                              onChange={(e) => handleCustomFieldChange(index, fieldIndex, 'value', e.target.value)}
                              placeholder={t('env.acceleration.modelPaths.customMappingPathPlaceholder')}
                              className="font-mono text-[13px]"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBrowse(index, field.key || `custom_${fieldIndex}`)}
                              className="shrink-0 px-2"
                            >
                              <FolderOpen className="size-3.5" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCustomField(index, fieldIndex)}
                            className="shrink-0 text-muted-foreground hover:text-danger"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-muted/30 p-5">
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t('env.acceleration.modelPaths.modelTypes')}
                  </h4>
                  
                  {autoFilledIndex === index && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-success">
                      <CheckCircle className="size-4" />
                      <span>{t('env.modelPathsAutoFilled')}</span>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {modelTypeFields.map((field) => (
                      <div key={field.key} className="flex items-center gap-4">
                        <label className="min-w-[100px] text-sm font-medium text-foreground">
                          {field.label}
                        </label>
                        <div className="flex flex-1 gap-2">
                          <Input
                            value={config.paths[field.key as keyof typeof config.paths] || ''}
                            onChange={(e) => handlePathChange(index, field.key, e.target.value)}
                            placeholder={`models/${field.key}`}
                            className="font-mono text-[13px]"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBrowse(index, field.key)}
                            className="shrink-0 px-2"
                          >
                            <FolderOpen className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {configs.length === 0 && (
            <div className="rounded-[0.875rem] border-2 border-dashed border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t('env.acceleration.modelPaths.noConfigHint')}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showBasePathHelp} onOpenChange={(open) => !open && setShowBasePathHelp(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.title.modelPathHelp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Info className="size-4 text-primary" />
                {t('env.acceleration.modelPaths.help.whatIsConfigName')}
              </h4>
              <p className="mb-2 text-sm text-muted-foreground">
                {t('env.acceleration.modelPaths.help.configNameDesc')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('env.acceleration.modelPaths.help.configNameExample')}
              </p>
            </div>

            <div className="border-t border-border pt-3">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Info className="size-4 text-primary" />
                {t('env.acceleration.modelPaths.help.basePathTarget')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('env.acceleration.modelPaths.help.basePathDesc')}
              </p>
            </div>

            {/* eslint-disable i18next/no-literal-string */}
            <div className="space-y-3">
              <div className="rounded-lg bg-muted p-3">
                <h5 className="mb-1 text-sm font-medium">{t('env.acceleration.modelPaths.anotherComfyDir')}</h5>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t('env.acceleration.modelPaths.shareModelsHint')}
                </p>
                <code className="block rounded bg-background p-2 text-xs">
                  {t('env.acceleration.modelPaths.configName')}: comfyui_2<br />
                  {t('env.acceleration.modelPaths.basePath')}: D:\ComfyUI-aki-v2\ComfyUI
                </code>
                <p className="mt-1 text-xs text-success">
                  ✓ {t('env.acceleration.modelPaths.autoFillHint')}
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <h5 className="mb-1 text-sm font-medium">{t('env.acceleration.modelPaths.sdWebuiDir')}</h5>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t('env.acceleration.modelPaths.shareWithA1111')}
                </p>
                <code className="block rounded bg-background p-2 text-xs">
                  {t('env.acceleration.modelPaths.configName')}: a1111<br />
                  {t('env.acceleration.modelPaths.basePath')}: D:\stable-diffusion-webui
                </code>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('env.acceleration.modelPaths.manualConfigHint')}
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <h5 className="mb-1 text-sm font-medium">{t('env.acceleration.modelPaths.centralModelDir')}</h5>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t('env.acceleration.modelPaths.unifiedModelMgmt')}
                </p>
                <code className="block rounded bg-background p-2 text-xs">
                  {t('env.acceleration.modelPaths.configName')}: shared_models<br />
                  {t('env.acceleration.modelPaths.basePath')}: E:\AI_Models
                </code>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('env.acceleration.modelPaths.manualConfigHint')}
                </p>
              </div>
            </div>
            {/* eslint-enable i18next/no-literal-string */}

            <div className="border-t border-border pt-3">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <CheckCircle className="size-4 text-success" />
                {t('env.acceleration.modelPaths.smartRecognition')}
              </h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• {t('env.acceleration.modelPaths.autoFillNote1')}</li>
                <li>• {t('env.acceleration.modelPaths.autoFillNote2')}</li>
                <li>• {t('env.acceleration.modelPaths.autoFillNote3')}</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
