/**
 * 翻译设置组件
 * 
 * 提供翻译方式选择和配置功能
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, Bot, Info, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { useAPIConfigStore } from '@/stores/useAPIConfigStore'
import { toast } from '@/utils/toast'

interface TranslationSettingsProps {
  provider: 'google' | 'llm'
  llmConfigId: string
  onProviderChange: (provider: 'google' | 'llm') => void
  onLlmConfigChange: (configId: string) => void
}

export function TranslationSettings({
  provider,
  llmConfigId,
  onProviderChange,
  onLlmConfigChange
}: TranslationSettingsProps) {
  const { t } = useTranslation()
  const { configs, loadConfigs } = useAPIConfigStore()
  const [isClearingCache, setIsClearingCache] = useState(false)

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const handleClearCache = async () => {
    if (!window.pywebview?.api) {
      toast.error(t('common.apiUnavailable'))
      return
    }

    setIsClearingCache(true)
    try {
      const result = await window.pywebview.api.clear_translation_cache()
      if (result.success) {
        toast.success(result.message || t('settings.translation.cacheCleared'))
      } else {
        toast.error(result.message || t('settings.translation.cacheClearFailed'))
      }
    } catch (error) {
      console.error('清除翻译缓存失败:', error)
      toast.error(t('settings.translation.cacheClearFailed'))
    } finally {
      setIsClearingCache(false)
    }
  }

  const availableConfigs = configs.filter(c => c.status === 'available' || c.status === 'untested')

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Languages className="size-4" />
          {t('settings.translation.provider')}
        </label>
        
        <div className="space-y-3">
          <div 
            className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              provider === 'google' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onProviderChange('google')}
          >
            <div className="flex h-5 items-center">
              <div 
                className={`h-4 w-4 rounded-full border-2 ${
                  provider === 'google' 
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground'
                }`}
              >
                {provider === 'google' && (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-medium">{t('settings.translation.googleTranslate')}</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.translation.googleTranslateDesc')}
              </div>
            </div>
          </div>

          <div 
            className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              provider === 'llm' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onProviderChange('llm')}
          >
            <div className="flex h-5 items-center">
              <div 
                className={`h-4 w-4 rounded-full border-2 ${
                  provider === 'llm' 
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground'
                }`}
              >
                {provider === 'llm' && (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Bot className="size-4" />
                <span className="font-medium">{t('settings.translation.llmTranslate')}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {t('settings.translation.llmTranslateDesc')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {provider === 'llm' && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Bot className="size-4" />
            {t('settings.translation.selectModel')}
          </label>
          
          {availableConfigs.length === 0 ? (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
              <div className="text-sm text-warning">
                {t('settings.translation.noModelConfig')}
              </div>
            </div>
          ) : (
            <Select
              value={llmConfigId}
              onValueChange={onLlmConfigChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings.translation.selectModelPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableConfigs.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    <div className="flex items-center gap-2">
                      <span>{config.alias}</span>
                      <span className="text-xs text-muted-foreground">
                        ({config.provider} / {config.model})
                      </span>
                      {config.isDefault && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          {t('common.default')}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <p className="text-xs text-muted-foreground">
            {t('settings.translation.modelConfigHint')}
          </p>
        </div>
      )}

      <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <Info className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="text-sm text-foreground">
          <div className="mb-1 font-medium">{t('settings.translation.usageHint')}</div>
          <div className="text-muted-foreground">
            {t('settings.translation.usageHintDesc')}
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">{t('settings.translation.cacheManagement')}</div>
            <div className="text-xs text-muted-foreground">
              {t('settings.translation.cacheManagementDesc')}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            disabled={isClearingCache}
          >
            <Trash2 className="mr-2 size-4" />
            {isClearingCache ? t('common.clearing') : t('common.clearCache')}
          </Button>
        </div>
      </div>
    </div>
  )
}
