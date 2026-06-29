import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Zap, Shield, Sparkles, Upload, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
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
import { cn } from '@/lib/utils'
import type { PresetConfig } from '@/types/environment'

interface ManagePresetsModalProps {
  open: boolean
  onClose: () => void
  presets: PresetConfig[]
  onEdit: (preset: PresetConfig) => void
  onDelete: (preset: PresetConfig) => void
  onImport: () => void
}

const presetIcons: Record<string, React.ReactNode> = {
  flux: <Star className="size-4 text-primary" />,
  flagship: <Zap className="size-4 text-success" />,
  legacy: <Shield className="size-4 text-warning" />,
  default: <Sparkles className="size-4 text-primary" />,
}

function getPresetIcon(id: string) {
  if (id.includes('flux') || id.includes('standard')) return presetIcons.flux
  if (id.includes('flagship') || id.includes('high')) return presetIcons.flagship
  if (id.includes('legacy') || id.includes('low')) return presetIcons.legacy
  return presetIcons.default
}

export function ManagePresetsModal({
  open,
  onClose,
  presets,
  onEdit,
  onDelete,
  onImport,
}: ManagePresetsModalProps) {
  const { t } = useTranslation()

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState<PresetConfig | null>(null)

  const builtinPresets = presets.filter((p) => p.type === 'builtin')
  const customPresets = presets.filter((p) => p.type === 'custom')

  const handleDeleteClick = (preset: PresetConfig) => {
    setPresetToDelete(preset)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (presetToDelete) {
      onDelete(presetToDelete)
    }
    setDeleteConfirmOpen(false)
    setPresetToDelete(null)
  }

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false)
    setPresetToDelete(null)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('preset.manageTitle')}</DialogTitle>
          </DialogHeader>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {builtinPresets.map((preset) => (
            <div
              key={preset.id}
              className={cn(
                'p-4 rounded-lg border border-border bg-muted/50',
                'flex items-center justify-between'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  {getPresetIcon(preset.id)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">{t('preset.officialUndeletable')}</p>
                </div>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                {t('preset.systemPreset')}
              </span>
            </div>
          ))}

          {customPresets.map((preset) => (
            <div
              key={preset.id}
              className={cn(
                'p-4 rounded-lg border border-primary/20 bg-primary/5',
                'flex items-center justify-between'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  {getPresetIcon(preset.id)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('preset.customCreatedAt', { date: formatDate(preset.createdAt || '') })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(preset)}
                  className="text-muted-foreground hover:text-primary size-8 p-1.5 hover:bg-primary/10"
                  aria-label={t('common.edit')}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteClick(preset)}
                  className="text-muted-foreground hover:text-destructive size-8 p-1.5 hover:bg-destructive/10"
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}

          {builtinPresets.length === 0 && customPresets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">{t('preset.noPresets')}</div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onImport}>
            <Upload className="size-4 mr-1.5" />
            {t('preset.import')}
          </Button>
          <Button onClick={onClose}>{t('common.done')}</Button>
        </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              {t('preset.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('preset.deleteConfirmDesc', { name: presetToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
