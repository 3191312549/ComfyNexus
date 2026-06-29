import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DependencyInfoSectionProps } from '@/types/environment'

export function DependencyInfoSection({ dependencies, onRefresh }: DependencyInfoSectionProps) {
  const { t } = useTranslation()

  const depItems = [
    { label: t('env.general.pythonVersion'), value: dependencies.pythonVersion },
    { label: t('env.general.pytorchVersion'), value: dependencies.pytorchVersion },
    { label: t('env.general.cudaVersion'), value: dependencies.cudaVersion },
    { label: t('env.general.sageAttentionVersion'), value: dependencies.sageAttentionVersion },
    { label: t('env.general.flashAttnVersion'), value: dependencies.flashAttnVersion },
    { label: t('env.general.tritonVersion'), value: dependencies.tritonVersion },
    { label: t('env.general.xformersVersion'), value: dependencies.xformersVersion }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('env.general.dependencies')}</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            {t('env.general.refreshButton')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {depItems.map((item, index) => (
            <div key={index} className="border-gray-100 dark:border-gray-700 flex items-center justify-between border-b py-2 last:border-0">
              <span className="text-gray-600 dark:text-gray-400 text-sm">{item.label}</span>
              <span className="text-gray-900 dark:text-gray-100 text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
