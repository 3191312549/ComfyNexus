/**
 * 快照列表组件
 *
 * 展示当前环境的快照列表，提供恢复、编辑和删除操作。
 * 列表按创建时间降序排列（后端已排序）。
 */

import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRescueStore } from '@/stores/useRescueStore'
import type { SnapshotInfo } from '@/types/rescue'
import RestoreModeDialog from './RestoreModeDialog'

/** 备份选项标签映射 */
const BACKUP_LABELS: Record<string, string> = {
  all: 'all',
  deps_only: 'depsOnly',
  plugins_only: 'pluginsOnly',
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 格式化时间 */
function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function SnapshotList() {
  const { t } = useTranslation()
  const { snapshots, loading, deleteSnapshot, updateSnapshot } = useRescueStore()

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<SnapshotInfo | null>(null)
  // 恢复对话框
  const [restoreTarget, setRestoreTarget] = useState<SnapshotInfo | null>(null)
  // 编辑对话框
  const [editTarget, setEditTarget] = useState<SnapshotInfo | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteSnapshot(deleteTarget.filePath)
    setDeleteTarget(null)
  }

  const openEditDialog = (snap: SnapshotInfo) => {
    setEditTarget(snap)
    setEditName(snap.name)
    setEditNote(snap.note)
  }

  const handleEditSave = async () => {
    if (!editTarget) return
    if (editName.length < 1 || editName.length > 50) return
    if (editNote.length > 500) return

    setEditSaving(true)
    const success = await updateSnapshot({
      filePath: editTarget.filePath,
      name: editName.trim(),
      note: editNote.trim(),
    })
    setEditSaving(false)

    if (success) {
      setEditTarget(null)
    }
  }

  const editNameError = editName.length > 0 && (editName.length < 1 || editName.length > 50)
    ? t('rescue.snapshot.nameLengthError') : ''
  const editNoteError = editNote.length > 500 ? t('rescue.snapshot.noteLengthError') : ''
  const canSaveEdit = editName.length >= 1 && editName.length <= 50 && editNote.length <= 500 && !editSaving

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-4 font-semibold text-content-primary">{t("rescue.snapshotList.label")}</h3>
        <p className="text-sm text-content-secondary">{t("common.loading")}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-4 font-semibold text-content-primary">{t("rescue.snapshotList.label")}</h3>

      {snapshots.length === 0 ? (
        <p className="text-sm text-content-secondary">
          {t('rescue.snapshot.noSnapshotHint')}
        </p>
      ) : (
        <div className="max-h-[calc(100vh-280px)] space-y-3 overflow-y-auto pr-1">
          {snapshots.map((snap) => (
            <div
              key={snap.filePath}
              className="rounded-md border border-border p-3 transition-colors hover:bg-muted/50"
            >
              {/* 标题行 */}
              <div className="mb-1.5 flex items-center justify-between">
                <span className="mr-2 truncate text-sm font-medium text-content-primary">
                  {snap.name}
                </span>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {t(`rescue.backupLabel.${BACKUP_LABELS[snap.backupOption] ?? snap.backupOption}`)}
                </Badge>
              </div>

              {/* 信息行 */}
              <div className="mb-2 flex items-center gap-3 text-xs text-content-secondary">
                <span>{formatTime(snap.createdAt)}</span>
                <span>{formatSize(snap.fileSize)}</span>
              </div>

              {/* 备注 */}
              {snap.note && (
                <p className="mb-2 line-clamp-2 text-xs text-content-muted">
                  {snap.note}
                </p>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setRestoreTarget(snap)}
                >
                  {t('rescue.restore')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => openEditDialog(snap)}
                >
                  {t('rescue.snapshot.edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-danger hover:border-danger/50 hover:text-danger"
                  onClick={() => setDeleteTarget(snap)}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rescue.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rescue.snapshot.confirmDeleteMessage', { name: deleteTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 恢复模式选择对话框 */}
      {restoreTarget && (
        <RestoreModeDialog
          snapshot={restoreTarget}
          open={!!restoreTarget}
          onClose={() => setRestoreTarget(null)}
        />
      )}

      {/* 编辑快照对话框 */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rescue.snapshot.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('rescue.snapshot.editDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1.5 block text-sm text-content-secondary">
                {t('rescue.snapshot.name')}
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t('rescue.snapshot.namePlaceholder')}
                maxLength={50}
                disabled={editSaving}
              />
              {editNameError && <p className="mt-1 text-xs text-danger">{editNameError}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-content-secondary">
                {t('rescue.snapshot.note')}
              </label>
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder={t('rescue.snapshot.notePlaceholder')}
                maxLength={500}
                rows={3}
                disabled={editSaving}
              />
              {editNoteError && <p className="mt-1 text-xs text-danger">{editNoteError}</p>}
              <p className="mt-1 text-right text-xs text-content-muted">
                {editNote.length}/500
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditSave} disabled={!canSaveEdit}>
              {editSaving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
