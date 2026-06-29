import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Monitor } from 'lucide-react'
import { useEnvStore } from '@/stores/useEnvStore'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'

interface EnvRequiredGuideProps {
  icon?: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function EnvRequiredGuide({ 
  icon, 
  title, 
  description,
  className 
}: EnvRequiredGuideProps) {
  const { t } = useTranslation()
  const { environments, currentEnvId, createEnvironment } = useEnvStore()
  const { success, error: showError } = useToast()

  const noEnvironment = environments.length === 0 || !currentEnvId

  const handleAddEnvironment = useCallback(async () => {
    try {
      let selectedPath: string | undefined

      if (window.pywebview?.api?.select_directory) {
        const response = await window.pywebview.api.select_directory()
        if (!response.success || !response.path) {
          return
        }
        selectedPath = response.path
        await new Promise(resolve => setTimeout(resolve, 300))
      } else {
        const path = prompt(t('titleBar.env.inputPathDev'), 'C:\\ComfyUI-New')
        if (!path) {
          return
        }
        selectedPath = path
      }

      await createEnvironment(selectedPath)
      success(t('env.message.createSuccess'))
    } catch (error) {
      console.error('Failed to create environment:', error)
      const errorMessage = error instanceof Error ? error.message : t('env.message.createFailed')
      showError(errorMessage)
    }
  }, [createEnvironment, t, success, showError])

  if (!noEnvironment) {
    return null
  }

  const displayTitle = title || (environments.length === 0 
    ? t('env.guide.addFirst') 
    : t('env.guide.selectOne'))
  
  const displayDescription = description || (environments.length === 0 
    ? t('env.guide.noEnvDesc') 
    : t('env.guide.selectEnvDesc'))

  return (
    <div className={cn("flex h-full flex-col items-center justify-center p-8", className)}>
      <div 
        onClick={handleAddEnvironment}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-10 cursor-pointer hover:border-primary/50 hover:shadow-soft-md transition-all group"
      >
        <div className="flex justify-center mb-8">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
            {icon || <Monitor className="size-8 text-primary" />}
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-4">
          {displayTitle}
        </h2>
        
        <p className="text-muted-foreground text-center mb-8 leading-relaxed">
          {displayDescription}
        </p>
        
        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="gap-2"
          >
            <Plus className="size-5" />
            {environments.length === 0 ? t('env.guide.addFirstEnv') : t('env.guide.selectEnv')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function useEnvRequiredGuide(options?: EnvRequiredGuideProps) {
  const { environments, currentEnvId } = useEnvStore()
  const noEnvironment = environments.length === 0 || !currentEnvId

  if (!noEnvironment) {
    return null
  }

  return <EnvRequiredGuide {...options} />
}
