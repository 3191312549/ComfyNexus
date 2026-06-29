import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'

export function Disclaimer() {
  const { t } = useTranslation()

  return (
    <Card className="border-border/50 p-4">
      <p className="text-[11px] leading-tight text-muted-foreground">
        <strong className="text-foreground">{t('about.disclaimer.title')}:</strong>
        <br />
        {t('about.disclaimer.content')}
      </p>
    </Card>
  )
}

export default Disclaimer
