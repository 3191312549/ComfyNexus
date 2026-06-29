import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { PathsSectionProps } from '@/types/environment'

export function PathsSection({ config, onConfigChange }: PathsSectionProps) {
  const { t } = useTranslation()

  const handleBrowse = async (type: string) => {
    console.log('[PathsSection] 开始选择文件夹，类型:', type)
    
    try {
      if (!window.pywebview?.api?.select_directory) {
        console.warn('[PathsSection] pywebview API not available')
        return
      }

      console.log('[PathsSection] 调用 select_directory API...')
      const result = await window.pywebview.api.select_directory()
      console.log('[PathsSection] API 返回结果:', result)
      console.log('[PathsSection] result 类型:', typeof result)
      console.log('[PathsSection] result 是否为 undefined:', result === undefined)
      console.log('[PathsSection] result 是否为 null:', result === null)
      
      if (!result) {
        console.error('[PathsSection] API 返回了空值 (undefined 或 null)')
        return
      }
      
      if (result.success && result.path) {
        console.log('[PathsSection] 选择成功，路径:', result.path, '类型:', type)
        const changeObject = { [type]: result.path }
        console.log('[PathsSection] 调用 onConfigChange，参数:', changeObject)
        onConfigChange(changeObject)
        console.log('[PathsSection] onConfigChange 调用完成')
      } else {
        console.log('[PathsSection] 用户取消选择或选择失败')
      }
    } catch (error) {
      console.error('[PathsSection] 选择文件夹失败:', error)
    }
  }

  const pathFields = [
    { key: 'inputDirectory', label: t('env.acceleration.paths.inputDirectory') },
    { key: 'outputDirectory', label: t('env.acceleration.paths.outputDirectory') },
    { key: 'tempDirectory', label: t('env.acceleration.paths.tempDirectory') },
    { key: 'userDirectory', label: t('env.acceleration.paths.userDirectory') }
  ]

  console.log('[PathsSection] 渲染，当前 config:', config)
  console.log('[PathsSection] inputDirectory 值:', config?.inputDirectory)
  console.log('[PathsSection] outputDirectory 值:', config?.outputDirectory)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('env.acceleration.paths.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pathFields.map((field) => (
          <div key={field.key} className="flex items-center gap-4">
            <label className="min-w-[180px] text-sm font-medium text-foreground">
              {field.label}
            </label>
            <div className="flex-1">
              <Input
                value={(config?.[field.key as keyof typeof config] as string) || ''}
                onChange={(e) => onConfigChange({ [field.key]: e.target.value })}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => handleBrowse(field.key)}
            >
              {t('env.general.browseButton')}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
