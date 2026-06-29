/**
 * 语言切换组件
 */

import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'

export function LanguageToggle() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language-preference', newLang)
  }

  const currentLangLabel = i18n.language === 'zh-CN' ? '中' : 'EN'

  return (
    <Button
      onClick={toggleLanguage}
      variant="ghost"
      size="icon"
      className="size-8"
      aria-label={i18n.language === 'zh-CN' ? '切换到英文' : 'Switch to Chinese'}
      title={i18n.language === 'zh-CN' ? '切换到英文' : 'Switch to Chinese'}
    >
      <span className="text-xs font-medium">{currentLangLabel}</span>
    </Button>
  )
}
