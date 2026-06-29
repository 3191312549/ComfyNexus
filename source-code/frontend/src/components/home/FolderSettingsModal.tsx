/**
 * FolderSettingsModal 组件
 * 文件夹快捷方式设置弹窗
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Folder, Eye, EyeOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toast } from '@/components/ui/Toast'
import type { FolderShortcut } from '@/types/home'
import { cn } from '@/lib/utils'

/**
 * FolderSettingsModal 组件属性
 */
export interface FolderSettingsModalProps {
  open: boolean
  onClose: () => void
  shortcuts: FolderShortcut[]
  onSave: (shortcuts: FolderShortcut[]) => Promise<void>
}

/**
 * 检查是否在开发环境
 */
const isDevelopment = (): boolean => {
  return !window.pywebview || !window.pywebview.api
}

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return `folder_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * FolderSettingsModal 组件
 */
export const FolderSettingsModal: React.FC<FolderSettingsModalProps> = ({
  open,
  onClose,
  shortcuts,
  onSave
}) => {
  const { t } = useTranslation()
  
  const [editingShortcuts, setEditingShortcuts] = useState<FolderShortcut[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newShortcut, setNewShortcut] = useState<Partial<FolderShortcut>>({})
  const [saving, setSaving] = useState(false)
  
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'warning'>('success')
  
  useEffect(() => {
    if (open) {
      setEditingShortcuts([...shortcuts])
      setShowAddForm(false)
      setNewShortcut({})
    }
  }, [open, shortcuts])
  
  const showToast = (message: string, variant: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message)
    setToastVariant(variant)
    setToastOpen(true)
  }
  
  const validateFolderPath = async (path: string): Promise<boolean> => {
    if (!path || path.trim() === '') {
      return false
    }
    
    try {
      if (isDevelopment()) {
        return path.length > 0
      } else {
        const response = await window.pywebview.api.validate_folder_path(path)
        return response.success && response.isValid === true
      }
    } catch (error) {
      console.error('[FolderSettingsModal] 验证路径失败:', error)
      return false
    }
  }
  
  const handleBrowseFolder = async () => {
    try {
      if (isDevelopment()) {
        const mockPath = 'C:\\Users\\Example\\Documents\\ComfyUI\\input'
        setNewShortcut({ ...newShortcut, path: mockPath })
        showToast(t('common.success'), 'success')
      } else {
        console.log('[FolderSettingsModal] 开始调用 browse_folder_for_shortcut API...')
        const startTime = performance.now()
        
        const response = await window.pywebview.api.browse_folder_for_shortcut()
        
        const apiTime = performance.now() - startTime
        console.log(`[FolderSettingsModal] API 返回，耗时: ${apiTime.toFixed(2)}ms`)
        
        if (response.success && response.path) {
          console.log(`[FolderSettingsModal] 获取到路径: ${response.path}`)
          requestAnimationFrame(() => {
            setNewShortcut(prev => ({ ...prev, path: response.path || '' }))
          })
        } else if (!response.success && response.error_message) {
          showToast(response.error_message, 'error')
        }
      }
    } catch (error) {
      console.error('[FolderSettingsModal] 浏览文件夹失败:', error)
      showToast(t('home.error.operationFailed'), 'error')
    }
  }
  
  const handleAdd = async () => {
    if (editingShortcuts.length >= 6) {
      showToast(t('home.folder.maxLimitReached'), 'warning')
      return
    }
    
    if (!newShortcut.name || !newShortcut.name.trim()) {
      showToast(t('home.folder.fillComplete'), 'warning')
      return
    }
    
    if (!newShortcut.path || !newShortcut.path.trim()) {
      showToast(t('home.folder.fillComplete'), 'warning')
      return
    }
    
    const isValid = await validateFolderPath(newShortcut.path)
    if (!isValid) {
      showToast(t('home.folder.pathInvalid'), 'error')
      return
    }
    
    const shortcut: FolderShortcut = {
      id: generateId(),
      name: newShortcut.name.trim(),
      path: newShortcut.path.trim(),
      icon: newShortcut.icon || 'Folder',
      order: editingShortcuts.length,
      isDefault: false,
      visible: true
    }
    
    setEditingShortcuts([...editingShortcuts, shortcut])
    setNewShortcut({})
    setShowAddForm(false)
    
    showToast(t('home.folder.saveSuccess'), 'success')
  }
  
  const handleDelete = (id: string) => {
    const shortcut = editingShortcuts.find(s => s.id === id)
    
    if (shortcut?.isDefault) {
      showToast(t('home.folder.cannotDeleteDefault'), 'warning')
      return
    }
    
    const updated = editingShortcuts.filter(s => s.id !== id)
    setEditingShortcuts(updated)
    
    showToast(t('common.delete') + t('common.success'), 'success')
  }
  
  const handleSave = async () => {
    setSaving(true)
    
    try {
      const reordered = editingShortcuts.map((s, index) => ({
        ...s,
        order: index
      }))
      
      await onSave(reordered)
      
      showToast(t('home.folder.saveSuccess'), 'success')
      
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error) {
      console.error('[FolderSettingsModal] 保存配置失败:', error)
      showToast(t('home.folder.saveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEditingShortcuts([...shortcuts])
      setShowAddForm(false)
      setNewShortcut({})
      onClose()
    }
  }
  
  const toggleVisibility = (shortcutId: string) => {
    setEditingShortcuts(prev => 
      prev.map(s => 
        s.id === shortcutId 
          ? { ...s, visible: s.visible === false ? true : false }
          : s
      )
    )
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('home.folder.settingsTitle')}</DialogTitle>
            <DialogDescription>{t('home.folder.maxLimitReached')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {editingShortcuts.map(shortcut => {
                const isVisible = shortcut.visible !== false
                return (
                  <div
                    key={shortcut.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-lg",
                      "hover:border-primary/50 transition-colors",
                      !isVisible && "opacity-50"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Button
                        type="button"
                        onClick={() => toggleVisibility(shortcut.id)}
                        variant="ghost"
                        size="icon"
                        aria-label={isVisible ? '隐藏快捷方式' : '显示快捷方式'}
                        title={isVisible ? '点击隐藏此快捷方式' : '点击显示此快捷方式'}
                      >
                        {isVisible ? (
                          <Eye className="text-muted-foreground size-4" />
                        ) : (
                          <EyeOff className="text-muted-foreground size-4" />
                        )}
                      </Button>
                      
                      <Folder className="text-primary size-5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {shortcut.isDefault ? t(shortcut.name) : shortcut.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {shortcut.path || t('home.folder.pathNotSet')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex shrink-0 items-center gap-2">
                      {shortcut.isDefault && (
                        <span className="bg-primary/10 text-primary rounded px-2 py-1 text-xs">
                          {t('home.folder.default')}
                        </span>
                      )}
                      {!shortcut.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(shortcut.id)}
                          className="size-8"
                          aria-label={t('home.folder.delete')}
                        >
                          <Trash2 className="text-danger size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {editingShortcuts.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <p>{t('home.folder.pathNotSet')}</p>
                </div>
              )}
            </div>
            
            {!showAddForm && editingShortcuts.length < 6 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="mr-2 size-4" />
                {t('home.folder.add')}
              </Button>
            )}
            
            {showAddForm && (
              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t('home.folder.name')}
                  </label>
                  <Input
                    placeholder={t('home.folder.namePlaceholder')}
                    value={newShortcut.name || ''}
                    onChange={(e) => setNewShortcut({ ...newShortcut, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAdd()
                      }
                    }}
                  />
                </div>
                
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t('home.folder.path')}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={t('home.folder.pathPlaceholder')}
                      value={newShortcut.path || ''}
                      onChange={(e) => setNewShortcut({ ...newShortcut, path: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleBrowseFolder}
                    >
                      {t('home.folder.browse')}
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleAdd} 
                    className="flex-1"
                    disabled={!newShortcut.name || !newShortcut.name.trim() || !newShortcut.path || !newShortcut.path.trim()}
                  >
                    {t('common.add')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewShortcut({})
                    }}
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        title={toastMessage}
        variant={toastVariant}
        duration={3000}
      />
    </>
  )
}

export default FolderSettingsModal
