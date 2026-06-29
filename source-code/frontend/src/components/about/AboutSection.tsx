import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export function AboutSection() {
  const { t } = useTranslation()

  return (
    <Card className="flex h-full flex-col p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
        <Info className="size-4 text-primary" />
        {t('about.projectIntro.title')}
      </h2>
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
        <strong className="text-foreground">{t('about.projectIntro.slogan')}</strong>
        <br /><br />
        {t('about.projectIntro.description1')}
        <br /><br />
        {t('about.projectIntro.description2')}
      </p>
    </Card>
  )
}

export default AboutSection
