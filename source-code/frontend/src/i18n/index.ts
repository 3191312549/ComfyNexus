/**
 * 国际化配置
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

/**
 * 获取初始语言
 */
const getInitialLanguage = (): string => {
  // 首先检查localStorage中的语言偏好
  const savedLanguage = localStorage.getItem('language-preference')
  if (savedLanguage) {
    return savedLanguage
  }
  
  // 然后检查系统语言
  const lang = navigator.language.toLowerCase()
  
  // 中文优先
  if (lang.startsWith('zh')) {
    return 'zh-CN'
  }
  
  // 英文
  if (lang.startsWith('en')) {
    return 'en-US'
  }
  
  // 默认中文
  return 'zh-CN'
}

/**
 * 初始化 i18n
 */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': {
        translation: zhCN,
      },
      'en-US': {
        translation: enUS,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
      prefix: '{',
      suffix: '}',
    },
  })

// 将 i18n 实例挂载到 window 对象，便于调试
if (typeof window !== 'undefined') {
  (window as any).i18n = i18n;
}

export default i18n
