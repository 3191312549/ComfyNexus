/**
 * Git 错误提示组件
 * 
 * 根据不同的错误类型显示相应的提示和修复建议
 */

import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/Button'
import { AlertCircle, RefreshCw, ExternalLink, Network, GitBranch, Tag } from 'lucide-react'

type ErrorType = 'ownership' | 'network' | 'branch_not_found' | 'no_tags' | 'no_commits' | 'unknown'

interface GitErrorAlertProps {
  errorType: ErrorType
  error: string
  repoPath?: string
  branch?: string
  onFix?: () => void
  onRefresh?: () => void
  isFixing?: boolean
}

// 定义操作按钮的类型
interface ErrorAction {
  label: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'outline'
  icon?: React.ReactNode
}

export function GitErrorAlert({ 
  errorType,
  error,
  repoPath,
  branch,
  onFix,
  onRefresh,
  isFixing = false
}: GitErrorAlertProps) {
  const { t } = useTranslation()
  
  const getErrorConfig = () => {
    switch (errorType) {
      case 'ownership':
        return {
          icon: <AlertCircle className="size-5" />,
          title: t('version.error.ownership.title'),
          description: t('version.error.ownership.description'),
          variant: 'destructive' as const,
          showRepoPath: true,
          actions: [
            {
              label: isFixing ? t('version.error.fixing') : t('version.error.fixNow'),
              onClick: onFix,
              disabled: isFixing || !onFix,
              icon: isFixing ? <RefreshCw className="size-4 animate-spin" /> : undefined,
              variant: 'default' as const,
            },
            {
              label: t('version.error.learnMore'),
              onClick: () => window.open('https://git-scm.com/docs/git-config#Documentation/git-config.txt-safedirectory', '_blank'),
              variant: 'outline' as const,
              icon: <ExternalLink className="size-4" />,
              disabled: false,
            },
          ] as ErrorAction[],
          hint: t('version.error.ownership.hint'),
        }
        
      case 'network':
        return {
          icon: <Network className="size-5" />,
          title: t('version.error.network.title'),
          description: t('version.error.network.description'),
          variant: 'destructive' as const,
          showRepoPath: false,
          actions: [
            {
              label: t('version.error.retry'),
              onClick: onRefresh,
              disabled: !onRefresh,
              icon: <RefreshCw className="size-4" />,
              variant: 'default' as const,
            },
          ] as ErrorAction[],
          hint: t('version.error.network.hint'),
        }
        
      case 'branch_not_found':
        return {
          icon: <GitBranch className="size-5" />,
          title: t('version.error.branchNotFound.title'),
          description: t('version.error.branchNotFound.description', { branch: branch || 'unknown' }),
          variant: 'default' as const,
          showRepoPath: false,
          actions: [
            {
              label: t('version.error.refreshBranches'),
              onClick: onRefresh,
              disabled: !onRefresh,
              icon: <RefreshCw className="size-4" />,
              variant: 'default' as const,
            },
          ] as ErrorAction[],
          hint: t('version.error.branchNotFound.hint'),
        }
        
      case 'no_tags':
        return {
          icon: <Tag className="size-5" />,
          title: t('version.error.noTags.title'),
          description: t('version.error.noTags.description'),
          variant: 'default' as const,
          showRepoPath: false,
          actions: [
            {
              label: t('version.error.viewDev'),
              onClick: () => {
                const devTab = document.querySelector('[data-tab="dev"]') as HTMLElement
                if (devTab) devTab.click()
              },
              variant: 'outline' as const,
              disabled: false,
            },
          ] as ErrorAction[],
          hint: t('version.error.noTags.hint'),
        }
        
      case 'no_commits':
        return {
          icon: <AlertCircle className="size-5" />,
          title: t('version.error.noCommits.title'),
          description: t('version.error.noCommits.description', { branch: branch || 'unknown' }),
          variant: 'default' as const,
          showRepoPath: false,
          actions: [
            {
              label: t('version.error.switchBranch'),
              onClick: onRefresh,
              disabled: !onRefresh,
              variant: 'outline' as const,
            },
          ] as ErrorAction[],
          hint: t('version.error.noCommits.hint'),
        }
        
      default:
        return {
          icon: <AlertCircle className="size-5" />,
          title: t('version.error.unknown.title'),
          description: error || t('version.error.unknown.description'),
          variant: 'destructive' as const,
          showRepoPath: false,
          actions: [
            {
              label: t('version.error.retry'),
              onClick: onRefresh,
              disabled: !onRefresh,
              icon: <RefreshCw className="size-4" />,
              variant: 'default' as const,
            },
          ] as ErrorAction[],
          hint: t('version.error.unknown.hint'),
        }
    }
  }
  
  const config = getErrorConfig()
  
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Alert variant={config.variant} className="max-w-2xl">
        {config.icon}
        <AlertTitle className="text-lg font-semibold">
          {config.title}
        </AlertTitle>
        <AlertDescription className="mt-3 space-y-3">
          <p>{config.description}</p>
          
          {config.showRepoPath && repoPath && (
            <div className="rounded-md bg-muted p-3">
              <p className="break-all font-mono text-sm">
                {t('version.error.repoPath')}{repoPath}
              </p>
            </div>
          )}
          
          {config.actions.length > 0 && (
            <div className="flex gap-3 pt-2">
              {config.actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled ?? false}
                  variant={action.variant ?? 'default'}
                  className="gap-2"
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
          
          {config.hint && (
            <p className="pt-2 text-xs text-muted-foreground">
              {config.hint}
            </p>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
