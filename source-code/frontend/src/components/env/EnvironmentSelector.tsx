import { useTranslation } from 'react-i18next'
import { NativeSelect } from '@/components/ui/NativeSelect'
import type { EnvironmentSelectorProps } from '@/types/environment'

export function EnvironmentSelector({
  currentEnvId,
  environments,
  onSwitch
}: EnvironmentSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-medium text-foreground">
        {t('env.currentEnv')}
      </label>
      <NativeSelect
        value={currentEnvId}
        onValueChange={(value) => onSwitch(value)}
        className="w-64"
      >
        {environments.map((env) => (
          <option key={env.id} value={env.id}>
            {env.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}
