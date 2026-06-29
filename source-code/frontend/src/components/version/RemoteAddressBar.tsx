/**
 * 远端地址栏组件
 * 
 * 功能：
 * - 显示当前分支和远端地址
 * - 支持编辑分支和远端地址
 * - 提供历史记录快速选择
 * - URL 格式验证
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GitBranch, Edit2 } from 'lucide-react'
import {
  Button,
  Input,
} from '@/components/ui'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { cn } from '@/lib/utils'
import { useVersionStore } from '@/stores/useVersionStore'

const GIT_URL_PATTERNS = [
  /^https?:\/\/.+\.git$/,
  /^https?:\/\/github\.com\/.+\/.+$/,
  /^https?:\/\/gitlab\.com\/.+\/.+$/,
  /^git@.+:.+\.git$/,
  /^git:\/\/.+\.git$/,
]

function isValidGitUrl(url: string): boolean {
  if (!url || url.trim() === '') return false
  return GIT_URL_PATTERNS.some(pattern => pattern.test(url.trim()))
}

function getUrlError(url: string, t: (key: string) => string): string {
  if (!url || url.trim() === '') {
    return t('version.remoteUrlPlaceholder')
  }
  if (!isValidGitUrl(url)) {
    return t('version.remoteUrlInvalid')
  }
  return ''
}

export default function RemoteAddressBar() {
  const { t } = useTranslation()
  const { 
    remoteInfo, 
    branches, 
    updateRemoteUrl, 
    switchBranch, 
    fetchCurrentVersion,
    fetchBranches,
    refreshVersions,
    loading 
  } = useVersionStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editUrl, setEditUrl] = useState('')
  const [editBranch, setEditBranch] = useState('')
  const [urlError, setUrlError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isEditing) {
      setIsEditing(false)
      setEditUrl('')
      setEditBranch('')
      setUrlError('')
    }
  }, [remoteInfo, branches])

  const handleEdit = () => {
    if (remoteInfo && branches) {
      setEditUrl(remoteInfo.url)
      setEditBranch(branches.currentBranch)
      setUrlError('')
      setIsEditing(true)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditUrl('')
    setEditBranch('')
    setUrlError('')
  }

  const handleSave = async () => {
    const error = getUrlError(editUrl, t)
    if (error) {
      setUrlError(error)
      return
    }
    
    setIsSaving(true)
    try {
      if (editUrl !== remoteInfo?.url) {
        await updateRemoteUrl(editUrl)
      }
      
      if (editBranch !== branches?.currentBranch) {
        await switchBranch(editBranch)
      }
      
      await Promise.all([
        fetchCurrentVersion(),
        fetchBranches(),
        refreshVersions(),
      ])
      
      setIsEditing(false)
      setUrlError('')
    } catch (_err) {
      setUrlError(t('version.remoteUrlInvalid'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!remoteInfo || !branches) {
    return null
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-7">
      <div className="flex flex-col justify-start gap-6">
        <div className="flex items-center justify-between text-[15px] font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <svg className="size-5 text-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            {t('version.remote')}
          </div>
          {!isEditing && (
            <Button
              onClick={handleEdit}
              disabled={loading}
              variant="ghost"
              size="icon"
              title={t('common.edit')}
            >
              <Edit2 className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        
        {!isEditing ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">{t('version.branch')}</span>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted px-4 py-3 font-mono text-sm text-foreground">
                <GitBranch className="size-4 text-muted-foreground" />
                {branches.currentBranch}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">{t('version.remote')} URL</span>
              <div className="flex items-center gap-2.5 break-all rounded-xl border border-border bg-muted px-4 py-3 font-mono text-sm text-foreground">
                <svg className="size-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span className="break-all">{remoteInfo.url}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="branch-select" className="text-xs text-muted-foreground">
                {t('version.branch')}
              </label>
              <NativeSelect
                value={editBranch}
                onValueChange={(value) => setEditBranch(value)}
                disabled={isSaving}
                className="rounded-xl"
              >
                <option value="" disabled>
                  {t('version.selectBranch')}
                </option>

                {branches.localBranches.length > 0 && (
                  <optgroup label={t('version.localBranches')}>
                    {branches.localBranches.map((branch) => (
                      <option key={`local-${branch}`} value={branch}>
                        {branch}
                        {branch === branches.currentBranch ? ` (${t('version.current')})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}

                {branches.remoteBranches.length > 0 && (
                  <optgroup label={t('version.remoteBranches')}>
                    {branches.remoteBranches.map((branch) => (
                      <option key={`remote-${branch}`} value={branch}>
                        {branch} ({t('version.remote')})
                      </option>
                    ))}
                  </optgroup>
                )}
              </NativeSelect>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="remote-url" className="flex items-center gap-2 text-xs text-muted-foreground">
                {t('version.remote')} URL
                {remoteInfo.history && remoteInfo.history.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({remoteInfo.history.length} {t('version.historyRecords')})
                  </span>
                )}
              </label>
              <Input
                id="remote-url"
                type="text"
                list="url-history"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('version.remoteUrlPlaceholder')}
                aria-label={t('version.remote')}
                aria-invalid={!!urlError}
                aria-describedby={urlError ? 'url-error' : undefined}
                disabled={isSaving}
                className={cn(
                  'bg-muted border border-border rounded-xl font-mono text-sm',
                  urlError && 'border-danger focus-visible:ring-danger'
                )}
              />
              {remoteInfo.history && remoteInfo.history.length > 0 && (
                <datalist id="url-history">
                  {remoteInfo.history.slice(0, 10).map((url, index) => (
                    <option key={index} value={url} />
                  ))}
                </datalist>
              )}
              {urlError && (
                <p 
                  id="url-error" 
                  role="alert" 
                  className="text-sm text-danger"
                >
                  {urlError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
