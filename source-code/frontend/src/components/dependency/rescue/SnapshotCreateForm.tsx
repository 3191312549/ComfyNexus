/**
 * 快照创建表单组件
 *
 * 提供快照名称、备份选项、.git 选项、备注输入，
 * 创建前检查 ComfyUI 进程状态。
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRescueStore } from '@/stores/useRescueStore'
import type { BackupOption } from '@/types/rescue'
import SnapshotProgressDialog, { type ProgressStatus } from './SnapshotProgressDialog'

/** 备份选项配置 */
const BACKUP_OPTIONS: { value: BackupOption; label: string }[] = [
  { value: 'all', label: 'all' },
  { value: 'deps_only', label: 'depsOnly' },
  { value: 'plugins_only', label: 'pluginsOnly' },
]

export default function SnapshotCreateForm() {
  const { t } = useTranslation()
  const { creating, checkProcess, createSnapshot } = useRescueStore()

  // 表单状态
  const [name, setName] = useState('')
  const [backupOption, setBackupOption] = useState<BackupOption>('all')
  const [includeGit, setIncludeGit] = useState(false)
  const [note, setNote] = useState('')

  // 进程确认对话框
  const [showProcessDialog, setShowProcessDialog] = useState(false)

  // 进度弹窗状态
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressStatus, setProgressStatus] = useState<ProgressStatus>('running')
  const [progressError, setProgressError] = useState<string | undefined>()

  // 验证
  const nameError = name.length > 0 && (name.length < 1 || name.length > 50)
    ? t('rescue.snapshot.nameLengthError') : ''
  const noteError = note.length > 500 ? t('rescue.snapshot.noteLengthError') : ''
  const canSubmit = name.length >= 1 && name.length <= 50 && note.length <= 500 && !creating

  // 插件相关选项是否禁用（仅依赖模式下禁用 .git 选项）
  const gitDisabled = backupOption === 'deps_only'

  /** 提交创建 */
  const handleCreate = async () => {
    if (!canSubmit) return

    // 检查 ComfyUI 进程
    const running = await checkProcess()
    if (running) {
      setShowProcessDialog(true)
      return
    }

    await doCreate()
  }

  /** 执行创建 */
  const doCreate = async () => {
    setProgressOpen(true)
    setProgressStatus('running')
    setProgressError(undefined)

    const success = await createSnapshot({
      name: name.trim(),
      backupOption,
      includeGit: gitDisabled ? false : includeGit,
      note: note.trim(),
    })

    if (success) {
      setProgressStatus('success')
      // 重置表单
      setName('')
      setBackupOption('all')
      setIncludeGit(false)
      setNote('')
    } else {
      setProgressStatus('error')
      // 从 store 读取错误信息
      setProgressError(useRescueStore.getState().error ?? t('rescue.snapshot.createFailed'))
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold text-content-primary">{t("rescue.createSnapshot")}</h3>

      {/* 快照名称 */}
      <div>
        <label className="mb-1.5 block text-sm text-content-secondary">
          {t('rescue.snapshotName')}
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("common.placeholder.snapshotName")}
          maxLength={50}
          disabled={creating}
        />
        {nameError && <p className="mt-1 text-xs text-danger">{nameError}</p>}
      </div>

      {/* 备份选项 */}
      <div>
        <label className="mb-1.5 block text-sm text-content-secondary">
          {t('rescue.backupScope')}
        </label>
        <div className="space-y-2">
          {BACKUP_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2" onClick={() => !creating && setBackupOption(opt.value)}>
              <div className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${backupOption === opt.value ? 'border-primary' : 'border-muted-foreground'}`}>
                {backupOption === opt.value && <div className="size-2 rounded-full bg-primary" />}
              </div>
              <span className="text-sm text-content-primary">{t(`rescue.backupOption.${opt.label}`)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* .git 目录选项 */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="includeGit"
          checked={gitDisabled ? false : includeGit}
          onCheckedChange={(checked) => setIncludeGit(checked === true)}
          disabled={gitDisabled || creating}
        />
        <label
          htmlFor="includeGit"
          className={`cursor-pointer text-sm ${
            gitDisabled
              ? 'text-content-muted'
              : 'text-content-primary'
          }`}
        >
          保留插件 .git 目录
        </label>
      </div>

      {/* 备注 */}
      <div>
        <label className="mb-1.5 block text-sm text-content-secondary">
          备注
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("common.placeholder.snapshotNote")}
          maxLength={500}
          rows={3}
          disabled={creating}
        />
        {noteError && <p className="mt-1 text-xs text-danger">{noteError}</p>}
        <p className="mt-1 text-right text-xs text-content-muted">
          {note.length}/500
        </p>
      </div>

      {/* 创建按钮 */}
      <Button
        className="w-full"
        onClick={handleCreate}
        disabled={!canSubmit}
      >
        {creating ? '创建中...' : '创建快照'}
      </Button>

      {/* ComfyUI 进程运行中确认对话框 */}
      <AlertDialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rescue.snapshot.comfyuiRunning')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rescue.snapshot.comfyuiRunningDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={doCreate}>{t("rescue.continueCreate")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 创建进度弹窗 */}
      <SnapshotProgressDialog
        open={progressOpen}
        status={progressStatus}
        snapshotName={name.trim() || '快照'}
        errorMessage={progressError}
        onClose={() => setProgressOpen(false)}
      />
    </div>
  )
}
