/**
 * 分支选择器组件
 * 
 * 功能：
 * - 显示当前分支
 * - 列出所有本地和远程分支
 * - 支持切换分支
 */

import { useTranslation } from 'react-i18next'
import { GitBranch } from 'lucide-react'
import { NativeSelect } from '@/components/ui/NativeSelect'

interface BranchSelectorProps {
  currentBranch: string | null
  localBranches: string[]
  remoteBranches: string[]
  onBranchChange: (branchName: string) => void
  disabled?: boolean
}

export function BranchSelector({
  currentBranch,
  localBranches,
  remoteBranches,
  onBranchChange,
  disabled = false,
}: BranchSelectorProps) {
  const { t } = useTranslation()

  const handleChange = (value: string) => {
    if (value && value !== currentBranch) {
      onBranchChange(value)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <GitBranch className="size-4 text-muted-foreground" />
      <NativeSelect
        value={currentBranch || ''}
        onValueChange={handleChange}
        disabled={disabled}
        className="w-[200px]"
      >
        <option value="" disabled>
          {t('version.selectBranch')}
        </option>

        {/* 本地分支 */}
        {localBranches.length > 0 && (
          <optgroup label={t('version.localBranches')}>
            {localBranches.map((branch) => (
              <option key={`local-${branch}`} value={branch}>
                {branch}
                {branch === currentBranch ? ` (${t('version.current')})` : ''}
              </option>
            ))}
          </optgroup>
        )}

        {/* 远程分支 */}
        {remoteBranches.length > 0 && (
          <optgroup label={t('version.remoteBranches')}>
            {remoteBranches.map((branch) => (
              <option key={`remote-${branch}`} value={branch}>
                {branch} ({t('version.remote')})
              </option>
            ))}
          </optgroup>
        )}
      </NativeSelect>
    </div>
  )
}
