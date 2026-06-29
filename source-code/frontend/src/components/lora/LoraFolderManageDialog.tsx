/**
 * LoRA 文件夹管理弹窗组件
 */

import { useState, useCallback, useEffect } from 'react'
import { Trash2, Plus, Loader2 } from 'lucide-react'
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
import { bridgeService, type LoraFolderNode } from '@/services/bridge'

interface LoraFolderManageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

interface FolderRow {
  id: string
  parentId: string
  name: string
  originalName?: string
  originalParentId?: string
  isNew?: boolean
}

export function LoraFolderManageDialog({
  open,
  onOpenChange,
  onRefresh
}: LoraFolderManageDialogProps) {
  const { t } = useTranslation()
  const [folders, setFolders] = useState<LoraFolderNode[]>([])
  const [rows, setRows] = useState<FolderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [scanPathId, setScanPathId] = useState<string>('')

  useEffect(() => {
    if (open) {
      loadScanPath()
      loadFolders()
    }
  }, [open])

  const loadScanPath = async () => {
    try {
      const result = await bridgeService.loraGetScanPaths()
      if (result.success && result.paths) {
        const enabledPath = result.paths.find((p: any) => p.enabled === true)
        if (enabledPath) {
          setScanPathId(enabledPath.id || enabledPath.path)
        }
      }
    } catch (error) {
      console.error('加载扫描路径失败:', error)
    }
  }

  const loadFolders = async () => {
    try {
      const result = await bridgeService.loraGetFolderStructure()
      if (result.success && result.folders) {
        setFolders(result.folders)
      }
    } catch (error) {
      console.error('加载文件夹结构失败:', error)
    }
  }

  const buildRowsFromFolders = useCallback((folderList: LoraFolderNode[], parentId: string = 'root'): FolderRow[] => {
    const rows: FolderRow[] = []
    folderList.forEach((folder) => {
      rows.push({
        id: folder.id,
        parentId: parentId,
        name: folder.name,
        originalName: folder.name,
        originalParentId: parentId
      })
      if (folder.children && folder.children.length > 0) {
        rows.push(...buildRowsFromFolders(folder.children, folder.id))
      }
    })
    return rows
  }, [])

  const getParentOptions = useCallback(() => {
    const options = [{ value: 'root', label: t('lora.folderManage.topLevel') }]
    
    const addFolderOptions = (folderList: LoraFolderNode[], depth = 0) => {
      folderList.forEach((folder) => {
        const prefix = '  '.repeat(depth)
        options.push({ value: folder.id, label: `${prefix}${folder.name}` })
        if (folder.children && folder.children.length > 0) {
          addFolderOptions(folder.children, depth + 1)
        }
      })
    }
    
    addFolderOptions(folders)
    
    return options
  }, [folders, t])

  const handleAddRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        parentId: 'root',
        name: '',
        isNew: true
      }
    ])
  }, [])

  const handleDeleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const handleRowChange = useCallback((id: string, field: 'parentId' | 'name', value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }, [])

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    setLoading(true)
    try {
      const result = await bridgeService.loraDeleteFolder(folderId)
      if (result.success) {
        await loadFolders()
        onRefresh()
      } else {
        alert(result.message || t('lora.folderManage.deleteFailed'))
      }
    } catch (error) {
      console.error('删除文件夹失败:', error)
      alert(t('lora.folderManage.deleteFailed'))
    } finally {
      setLoading(false)
    }
  }, [onRefresh, t])

  const handleSave = useCallback(async () => {
    setLoading(true)
    let hasError = false

    for (const row of rows) {
      if (row.isNew && row.name.trim()) {
        try {
          const parentFolderId = row.parentId === 'root' ? undefined : row.parentId
          const result = await bridgeService.loraCreateFolder(
            scanPathId,
            row.name.trim(),
            parentFolderId
          )
          if (!result.success) {
            alert(result.message || t('lora.folderManage.createFailed'))
            hasError = true
            break
          }
        } catch (error) {
          console.error('创建文件夹失败:', error)
          alert(t('lora.folderManage.createFailed'))
          hasError = true
          break
        }
      } else if (!row.isNew) {
        const nameChanged = row.name !== row.originalName && row.name.trim()
        const parentChanged = row.parentId !== row.originalParentId
        
        if (nameChanged || parentChanged) {
          try {
            const newParentId = row.parentId === 'root' ? '' : row.parentId
            const result = await bridgeService.loraUpdateFolder(
              row.id,
              nameChanged ? row.name.trim() : undefined,
              parentChanged ? newParentId : undefined
            )
            if (!result.success) {
              alert(result.message || t('lora.folderManage.updateFailed'))
              hasError = true
              break
            }
          } catch (error) {
            console.error('更新文件夹失败:', error)
            alert(t('lora.folderManage.updateFailed'))
            hasError = true
            break
          }
        }
      }
    }

    if (!hasError) {
      await loadFolders()
      onRefresh()
      setRows([])
      onOpenChange(false)
    }

    setLoading(false)
  }, [rows, scanPathId, onRefresh, onOpenChange, t])

  const allRows = [...buildRowsFromFolders(folders), ...rows]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('lora.folderManage.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
            <span className="flex-1">{t('lora.folderManage.parentFolder')}</span>
            <span className="flex-[2]">{t('lora.folderManage.folderName')}</span>
            <span className="w-10" />
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {allRows.map((row) => (
              <div key={row.id} className="flex items-center gap-3">
                <NativeSelect
                  value={row.parentId}
                  onValueChange={(value) => handleRowChange(row.id, 'parentId', value)}
                  className="flex-1"
                  disabled={!row.isNew}
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
                  placeholder={t('lora.folderManage.folderNamePlaceholder')}
                  className="flex-[2]"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-danger hover:bg-danger/10 hover:text-danger"
                  onClick={() => row.isNew ? handleDeleteRow(row.id) : handleDeleteFolder(row.id)}
                  disabled={loading}
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
            disabled={!scanPathId}
          >
            <Plus className="mr-2 size-4" />
            {t('lora.folderManage.addRow')}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading || (rows.filter(r => r.isNew && r.name.trim()).length === 0 && allRows.every(r => r.name === r.originalName && r.parentId === r.originalParentId))}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('lora.folderManage.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
