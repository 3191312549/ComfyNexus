/**
 * Git 所有权错误提示组件
 * 
 * 当检测到 Git 仓库所有权问题时显示此组件
 * 提供一键修复功能
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/Button'
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface GitOwnershipErrorProps {
  repoPath: string
  onFix: () => void
  isFixing: boolean
}

export function GitOwnershipError({ 
  repoPath, 
  onFix, 
  isFixing 
}: GitOwnershipErrorProps) {
  const { t } = useTranslation()
  
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Alert variant="destructive" className="max-w-2xl">
        <AlertCircle className="size-5" />
        <AlertTitle className="text-lg font-semibold">
          {t('version.gitOwnershipError.title', 'Git 权限问题')}
        </AlertTitle>
        <AlertDescription className="mt-3 space-y-3">
          <p>
            {t(
              'version.gitOwnershipError.description',
              '检测到 Git 仓库权限问题，无法访问版本信息。这通常发生在切换用户账户或从其他位置复制仓库后。'
            )}
          </p>
          
          <div className="rounded-md bg-muted p-3">
            <p className="break-all font-mono text-sm">
              {t('version.gitOwnershipError.repoPath', '仓库路径')}：{repoPath}
            </p>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={onFix} 
              disabled={isFixing}
              className="gap-2"
            >
              {isFixing && <RefreshCw className="size-4 animate-spin" />}
              {isFixing 
                ? t('version.gitOwnershipError.fixing', '修复中...') 
                : t('version.gitOwnershipError.fixButton', '一键修复')
              }
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.open('https://git-scm.com/docs/git-config#Documentation/git-config.txt-safedirectory', '_blank')}
              className="gap-2"
            >
              {t('version.gitOwnershipError.learnMore', '了解更多')}
              <ExternalLink className="size-4" />
            </Button>
          </div>
          
          <p className="pt-2 text-xs text-muted-foreground">
            {t(
              'version.gitOwnershipError.hint',
              '提示：修复操作会将此仓库添加到 Git 的安全目录列表中。'
            )}
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
