import { useTranslation } from 'react-i18next'
import { Code2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const techStackItems = [
  {
    name: 'Python 3.12.x',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    textColor: 'text-primary',
  },
  {
    name: 'React 19.x',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/30',
    textColor: 'text-info',
  },
  {
    name: 'Vite 7.x',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    textColor: 'text-primary',
  },
  {
    name: 'Tailwind CSS 3.4.19',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    textColor: 'text-success',
  },
  {
    name: 'pywebview 6.x',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    textColor: 'text-muted-foreground',
  },
]

export function TechStackSection() {
  const { t } = useTranslation()

  return (
    <Card className="flex h-full flex-col p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
        <Code2 className="size-4 text-success" />
        {t('about.techStack.title')}
      </h2>
      <div className="flex flex-1 flex-wrap content-start gap-2">
        {techStackItems.map((item) => (
          <span
            key={item.name}
            className={`rounded-md px-2.5 py-0.5 ${item.bgColor} ${item.textColor} border ${item.borderColor} font-mono text-xs`}
          >
            {item.name}
          </span>
        ))}
      </div>
    </Card>
  )
}

export default TechStackSection
