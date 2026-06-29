import { StrictMode, useEffect, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { FloatingWindowApp } from './FloatingWindowApp'
import './styles/main.css'
import './styles/floating.css'
import './i18n'
import { waitForAPI } from './utils/pywebview'

type Theme = 'light' | 'dark'

function FloatingAppInitializer() {
  const [isReady, setIsReady] = useState(false)

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === 'dark') {                        
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [])

  const fetchTheme = useCallback(async () => {
    try {
      const response = await window.pywebview?.api?.get_settings()
      if (response?.success && response?.settings?.appearance?.theme) {
        applyTheme(response.settings.appearance.theme)
      }
    } catch (error) {
      console.error('[FloatingWindow] Failed to fetch theme:', error)
    }
  }, [applyTheme])

  useEffect(() => {
    const init = async () => {
      const apiReady = await waitForAPI(5000)
      if (apiReady) {
        console.log('[FloatingWindow] API 就绪')
        await fetchTheme()
        setIsReady(true)
      } else {
        console.warn('[FloatingWindow] API 超时，使用默认主题')
        setIsReady(true)
      }
    }
    init()

    const themeInterval = setInterval(fetchTheme, 2000)
    return () => clearInterval(themeInterval)
  }, [fetchTheme])

  if (!isReady) {
    return null
  }

  return <FloatingWindowApp />
}

function FloatingApp() {
  return (
    <StrictMode>
      <FloatingAppInitializer />
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<FloatingApp />)
