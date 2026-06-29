/**
 * 工作流文件夹管理弹窗组件
 */

import { useState, useCallback, useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NativeSelect } from '@/components/ui/NativeSelect'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'
import type { WorkflowFolder } from '@/types/workflow'

interface WorkflowFolderManageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folders: WorkflowFolder[]
  onAddFolder: (name: string, parentId?: string) => Promise<WorkflowFolder | null>
  onUpdateFolder: (id: string, updates: Partial<WorkflowFolder>) => Promise<void>
  onDeleteFolder: (id: string) => Promise<void>
}

interface FolderRow {
  id: string
  parentId: string | null
  name: string
  originalParentId?: string | null
  originalName?: string
  isNew?: boolean
}

export function WorkflowFolderManageDialog({
  open,
  onOpenChange,
  folders,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder
}: WorkflowFolderManageDialogProps) {
  const { t } = useTranslation()
  
  const buildRowsFromFolders = useCallback((folderList: WorkflowFolder[]): FolderRow[] => {
    return folderList.map((folder) => ({
      id: folder.id,
      parentId: folder.parentId || null,
      name: folder.name,
      originalParentId: folder.parentId || null,
      originalName: folder.name
    }))
  }, [])

  const [rows, setRows] = useState<FolderRow[]>(() => buildRowsFromFolders(folders))

  useEffect(() => {
    if (open) {
      setRows(buildRowsFromFolders(folders))
    }
  }, [open, folders, buildRowsFromFolders])

  const getParentOptions = useCallback(() => {
    const options = [{ value: '', label: t('workflow.folderManage.topLevel') }]
    
    const addFolderOptions = (folderList: WorkflowFolder[], depth: number = 0) => {
      folderList.forEach((folder) => {
        const prefix = '　'.repeat(depth)
        options.push({ value: folder.id, label: `${prefix}${folder.name}` })
        const children = folders.filter((f) => f.parentId === folder.id)
        if (children.length > 0) {
          addFolderOptions(children, depth + 1)
        }
      })
    }
    
    const rootFolders = folders.filter((f) => !f.parentId)
    addFolderOptions(rootFolders)
    
    return options
  }, [folders, t])

  const handleAddRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        parentId: null,
        name: '',
        isNew: true
      }
    ])
  }, [])

  const handleDeleteRow = useCallback(async (id: string) => {
    if (!id.startsWith('new-')) {
      await onDeleteFolder(id)
    }
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [onDeleteFolder])

  const handleRowChange = useCallback((id: string, field: 'parentId' | 'name', value: string | null) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }, [])

  const handleSave = useCallback(async () => {
    for (const row of rows) {
      if (row.isNew && row.name.trim()) {
        await onAddFolder(row.name.trim(), row.parentId || undefined)
      } else if (!row.isNew) {
        const nameChanged = row.name !== row.originalName
        const parentChanged = row.parentId !== row.originalParentId
        if (nameChanged || parentChanged) {
          const updates: Partial<WorkflowFolder> = {}
          if (nameChanged) updates.name = row.name.trim()
          if (parentChanged) updates.parentId = row.parentId || undefined
          await onUpdateFolder(row.id, updates)
        }
      }
    }
    onOpenChange(false)
  }, [rows, onAddFolder, onUpdateFolder, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('workflow.folderManage.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
            <span className="flex-1">{t('workflow.folderManage.parentFolder')}</span>
            <span className="flex-[2]">{t('workflow.folderManage.folderName')}</span>
            <span className="w-10" />
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3">
                <NativeSelect
                  value={row.parentId || ''}
                  onValueChange={(value) => handleRowChange(row.id, 'parentId', value || null)}
                  className="flex-1"
                >
                  {getParentOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </NativeSelect>

                <Input
                  value={row.name}
                  onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                  placeholder={t('workflow.folderManage.folderNamePlaceholder')}
                  className="flex-[2]"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-danger hover:bg-danger/10 hover:text-danger"
                  onClick={() => handleDeleteRow(row.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={handleAddRow}
          >
            <Plus className="mr-2 size-4" />
            {t('workflow.folderManage.addRow')}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('workflow.folderManage.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
