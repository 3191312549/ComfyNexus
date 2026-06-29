import { useTranslation } from 'react-i18next'
import { useAppVersion } from '@/hooks/useAppVersion'
import {
  AboutHeader,
  AboutSection,
  TechStackSection,
  ChangelogSection,
  Disclaimer,
  SponsorSection,
  TelegramSection,
} from '@/components/about'

export default function AboutPage() {
  const { t } = useTranslation()
  const { version } = useAppVersion()

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex min-h-full flex-col p-6 md:p-8">
        <div className="flex w-full flex-1 flex-col gap-6">
          <AboutHeader version={version} />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <AboutSection />
            </div>
            <div className="md:col-span-1">
              <TechStackSection />
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 items-stretch gap-6 md:grid-cols-3">
            <div className="flex flex-col md:col-span-2">
              <ChangelogSection className="flex-1" />
            </div>
            <div className="flex flex-col gap-6 md:col-span-1">
              <SponsorSection className="flex-1" />
              <TelegramSection className="flex-1" />
            </div>
          </div>

          <footer className="space-y-3 border-t border-border pt-4 text-center">
            <Disclaimer />
            <p className="text-xs text-muted-foreground">
              {t('about.copyright')}
              <br />
              {t('about.poweredBy')}
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
