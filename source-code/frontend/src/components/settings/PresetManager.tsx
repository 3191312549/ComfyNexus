import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit, Upload, Settings, Star, Save } from 'lucide-react';
import { bridgeService } from '@/services/bridge';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';

export interface PresetManagerRef {
  openImportDialog: () => void;
  openExportDialog: () => void;
  openCreatePresetDialog: () => void;
  reloadPresets: () => void;
}

interface PresetConfig {
  id: string;
  name: string;
  description: string;
  vram_requirement: string;
  type: 'builtin' | 'custom';
  created_at?: string;
  updated_at?: string;
  config: Record<string, any>;
  file?: string;
}

interface PresetManagerProps {
  currentEnvId?: string;
  onPresetSelect?: (presetConfig: Record<string, any>) => void;
  onCreatePreset?: (name: string, description: string, vramRequirement: string) => void;
  onEditPreset?: (presetId: string, name: string, description: string, vramRequirement: string) => void;
  onDeletePreset?: (presetId: string) => void;
}

export const PresetManager = forwardRef<PresetManagerRef, PresetManagerProps>(
  function PresetManager({
    currentEnvId,
    onPresetSelect,
    onCreatePreset,
    onEditPreset,
    onDeletePreset
  }, ref) {
    const { t } = useTranslation();
    const [presets, setPresets] = useState<PresetConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<PresetConfig | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editVramRequirement, setEditVramRequirement] = useState('');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetDescription, setNewPresetDescription] = useState('');
    const [newPresetVramRequirement, setNewPresetVramRequirement] = useState('');
    const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false);
    const [overwriteTargetPreset, setOverwriteTargetPreset] = useState<PresetConfig | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deleteTargetPreset, setDeleteTargetPreset] = useState<PresetConfig | null>(null);
    
    const toast = useToast();
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
      if (type === 'error') {
        toast.error(message);
      } else {
        toast.success(message);
      }
    };

    useImperativeHandle(ref, () => {
      return {
        openImportDialog: () => {
          setImportDialogOpen(true);
        },
        openExportDialog: () => {
          setExportDialogOpen(true);
        },
        openCreatePresetDialog: () => {
          setCreateDialogOpen(true);
        },
        reloadPresets: () => {
          loadPresets();
        }
      };
    }, []);

    useEffect(() => {
      loadPresets();
    }, []);

    const loadPresets = async () => {
      setLoading(true);
      try {
        const result = await bridgeService.getAllPresets();
        console.log('[PresetManager] getAllPresets 返回结果:', result);
        
        if (result.success && result.data) {
          if (Array.isArray(result.data)) {
            setPresets(result.data);
          } else {
            console.error('[PresetManager] result.data 不是数组:', result.data);
            showToast(t('preset.dataFormatError'), 'error');
            setPresets([]);
          }
        } else {
          showToast(result.error_message || t('preset.loadFailed'), 'error');
          setPresets([]);
        }
      } catch (error) {
        console.error('Failed to load presets:', error);
        showToast(t('preset.loadFailed'), 'error');
        setPresets([]);
      } finally {
        setLoading(false);
      }
    };

    const handlePresetClick = async (preset: PresetConfig) => {
      try {
        const result = await bridgeService.getPresetDetails(preset.id);
        if (result.success && result.data?.config) {
          onPresetSelect?.(result.data.config);
          showToast(t('preset.applied', { name: preset.name }), 'success');
        }
      } catch (error) {
        console.error('[PresetManager] 加载预设配置失败:', error);
        showToast(t('preset.loadFailed'), 'error');
      }
    };

    const handleImportPreset = async (file: File) => {
      console.log('[PresetManager] 开始导入预设, file:', file);
      console.log('[PresetManager] currentEnvId:', currentEnvId);
      
      try {
        const text = await file.text();
        console.log('[PresetManager] 文件内容:', text);
        
        const presetData = JSON.parse(text);
        console.log('[PresetManager] 解析后的数据:', presetData);
        
        if (!presetData.id || !presetData.name || !presetData.config) {
          console.error('[PresetManager] 预设文件格式无效:', presetData);
          showToast(t('preset.fileFormatInvalid'), 'error');
          return;
        }

        if (!currentEnvId) {
          console.error('[PresetManager] 未选择环境');
          showToast(t('preset.selectEnvFirst'), 'error');
          return;
        }

        console.log('[PresetManager] 调用 importPreset API');
        const result = await bridgeService.importPreset(presetData, currentEnvId);
        console.log('[PresetManager] importPreset 结果:', result);
        
        if (result.success) {
          const presetName = result.data?.preset_name || presetData.name;
          showToast(t('preset.importSuccess', { name: presetName }), 'success');
          setImportDialogOpen(false);
          loadPresets();
        } else {
          showToast(result.error_message || t('preset.importFailed'), 'error');
        }
      } catch (error) {
        console.error('[PresetManager] 导入预设失败:', error);
        showToast(t('preset.importFailed'), 'error');
      }
    };

    const handleExportPreset = async (preset: PresetConfig) => {
      try {
        if (!currentEnvId) {
          showToast(t('preset.selectEnvFirst'), 'error');
          return;
        }

        const result = await bridgeService.exportPreset(
          currentEnvId,
          preset.name,
          preset.description,
          preset.vram_requirement
        );
        
        if (result.success && result.data) {
          const defaultName = `${preset.name.replace(/\s+/g, '_')}_preset.json`;
          const saveResult = await bridgeService.saveFileDialog(defaultName);
          
          if (saveResult.success && saveResult.path) {
            const writeResult = await bridgeService.savePresetToFile(saveResult.path, result.data.preset);
            
            if (writeResult.success) {
              showToast(t('preset.exportSuccess'), 'success');
              setExportDialogOpen(false);
            } else {
              showToast(writeResult.error_message || t('preset.writeFileFailed'), 'error');
            }
          }
        } else {
          showToast(result.error_message || t('preset.exportFailed'), 'error');
        }
      } catch (error) {
        console.error('Failed to export preset:', error);
        showToast(t('preset.exportFailed'), 'error');
      }
    };

    const handleDeletePreset = async (presetId: string) => {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        setDeleteTargetPreset(preset);
        setConfirmDeleteOpen(true);
      }
    };

    const handleConfirmDelete = async () => {
      if (!deleteTargetPreset) return;

      try {
        const result = await bridgeService.deleteCustomPreset(deleteTargetPreset.id);
        if (result.success) {
          showToast(t('preset.deleteSuccess'), 'success');
          onDeletePreset?.(deleteTargetPreset.id);
          loadPresets();
          setConfirmDeleteOpen(false);
          setDeleteTargetPreset(null);
        } else {
          showToast(result.error_message || t('preset.deleteFailed'), 'error');
        }
      } catch (error) {
        console.error('Failed to delete preset:', error);
        showToast(t('preset.deleteFailed'), 'error');
      }
    };

    const handleEditPreset = (preset: PresetConfig) => {
      setEditingPreset(preset);
      setEditName(preset.name);
      setEditDescription(preset.description || '');
      setEditVramRequirement(preset.vram_requirement || '');
      setEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
      if (!editingPreset) return;

      try {
        const result = await bridgeService.updateCustomPreset(editingPreset.id, {
          name: editName,
          description: editDescription,
          vram_requirement: editVramRequirement
        });
        
        if (result.success) {
          setEditDialogOpen(false);
          await loadPresets();
          showToast(t('preset.updateSuccess'), 'success');
        } else {
          showToast(result.error_message || t('preset.updateFailed'), 'error');
        }
      } catch (error) {
        console.error('[PresetManager] 更新预设失败:', error);
        showToast(t('preset.updateFailed'), 'error');
      }
    };

    const handleCreatePreset = () => {
      const existingPreset = presets.find(p => p.name === newPresetName);
      
      if (existingPreset) {
        if (existingPreset.type === 'builtin') {
          showToast(t('preset.cannotOverrideBuiltin'), 'error');
          return;
        } else {
          setOverwriteTargetPreset(existingPreset);
          setConfirmOverwriteOpen(true);
          return;
        }
      }

      onCreatePreset?.(newPresetName, newPresetDescription, newPresetVramRequirement);
      setCreateDialogOpen(false);
      setNewPresetName('');
      setNewPresetDescription('');
      setNewPresetVramRequirement('');
    };

    const handleConfirmOverwrite = () => {
      if (overwriteTargetPreset) {
        onEditPreset?.(overwriteTargetPreset.id, newPresetName, newPresetDescription, newPresetVramRequirement);
        setConfirmOverwriteOpen(false);
        setCreateDialogOpen(false);
        setNewPresetName('');
        setNewPresetDescription('');
        setNewPresetVramRequirement('');
        setOverwriteTargetPreset(null);
        loadPresets();
        showToast(t('preset.overrideSuccess'), 'success');
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">{t("common.loading")}</div>
        </div>
      );
    }

    const builtinPresets = presets.filter(p => p.type === 'builtin');
    const customPresets = presets.filter(p => p.type === 'custom');

    return (
      <div className="space-y-6">
        {builtinPresets.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Star className="size-4" />
              内置预设
            </h3>
            <div className="flex flex-wrap gap-2">
              {builtinPresets.map(preset => (
                <PresetCapsule
                  key={preset.id}
                  preset={preset}
                  onClick={() => handlePresetClick(preset)}
                />
              ))}
            </div>
          </div>
        )}

        {customPresets.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Settings className="size-4" />
              用户预设
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {customPresets.map(preset => (
                <PresetCapsule
                  key={preset.id}
                  preset={preset}
                  onClick={() => handlePresetClick(preset)}
                  onEdit={() => handleEditPreset(preset)}
                  onExport={() => handleExportPreset(preset)}
                  onDelete={() => handleDeletePreset(preset.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-8"
          >
            <Save className="mr-1.5 size-4" />
            另存为预设
          </Button>
        </div>

        {presets.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Settings className="mx-auto mb-4 size-12 opacity-50" />
            <p>{t("preset.noPresets")}</p>
          </div>
        )}

        <Dialog
          open={importDialogOpen}
          onOpenChange={(open) => !open && setImportDialogOpen(false)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("common.title.importPreset")}</DialogTitle>
            </DialogHeader>
            <PresetImportContent onImport={handleImportPreset} onCancel={() => setImportDialogOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog
          open={exportDialogOpen}
          onOpenChange={(open) => !open && setExportDialogOpen(false)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("common.title.exportPreset")}</DialogTitle>
            </DialogHeader>
            <PresetExportContent
              presets={presets}
              onExport={handleExportPreset}
              onCancel={() => setExportDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => !open && setEditDialogOpen(false)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("common.title.editPreset")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">{t("preset.name")}</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t("common.placeholder.presetName")}
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t("preset.description")}</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t("common.placeholder.presetDesc")}
                  rows={3}
                  spellCheck={false}
                  className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t("preset.recommendedVram")}</label>
                <Input
                  value={editVramRequirement}
                  onChange={(e) => setEditVramRequirement(e.target.value)}
                  placeholder={t("common.placeholder.vramExample")}
                  spellCheck={false}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  建议格式：4-6GB、8-16GB、24GB+ 等
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSaveEdit}>
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => !open && setCreateDialogOpen(false)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("common.title.addPreset")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">{t("preset.presetName")}</label>
                <Input
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder={t("common.placeholder.presetName")}
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t("preset.presetDesc")}</label>
                <Textarea
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  placeholder={t("common.placeholder.presetDesc")}
                  rows={3}
                  spellCheck={false}
                  className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t("preset.vramRequirement")}</label>
                <Input
                  value={newPresetVramRequirement}
                  onChange={(e) => setNewPresetVramRequirement(e.target.value)}
                  placeholder="例如：8-16GB、24GB+"
                  spellCheck={false}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  建议格式：4-6GB、8-16GB、24GB+ 等
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreatePreset} disabled={!newPresetName}>
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={confirmOverwriteOpen}
          onOpenChange={(open) => !open && setConfirmOverwriteOpen(false)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("common.title.confirmOverwrite")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>{t("preset.presetName")} "{newPresetName}" {t('preset.alreadyExists')}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmOverwriteOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleConfirmOverwrite}>
                  {t('common.confirm')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={confirmDeleteOpen}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmDeleteOpen(false);
              setDeleteTargetPreset(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("common.title.deletePreset")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {t('preset.confirmDelete')} <span className="font-medium text-foreground">"{deleteTargetPreset?.name}"</span> {t('common.questionMark')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('preset.cannotUndo')}
              </p>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setConfirmDeleteOpen(false);
                    setDeleteTargetPreset(null);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete}>
                  {t('preset.confirmDeleteBtn')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

interface PresetCapsuleProps {
  preset: PresetConfig;
  onClick: () => void;
  onEdit?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}

function PresetCapsule({ 
  preset, 
  onClick, 
  onEdit, 
  onExport, 
  onDelete
}: PresetCapsuleProps) {
  const { t } = useTranslation();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const capsuleRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const isUserPreset = preset.type === 'custom';
  const hasContextMenu = isUserPreset && (onEdit || onExport || onDelete);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!hasContextMenu) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [hasContextMenu]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (contextMenu) {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          capsuleRef.current && 
          !capsuleRef.current.contains(e.target as Node) &&
          contextMenuRef.current &&
          !contextMenuRef.current.contains(e.target as Node)
        ) {
          handleCloseContextMenu();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu, handleCloseContextMenu]);

  const tooltipTitle = [
    preset.name,
    preset.description,
    preset.vram_requirement && `${t('preset.vramRequirement')}: ${preset.vram_requirement}`
  ].filter(Boolean).join('\n');

  return (
    <>
      <div
        ref={capsuleRef}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        title={tooltipTitle}
        className={cn(
          "group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all select-none",
          "border text-sm font-medium",
          "bg-background hover:bg-accent border-border hover:border-primary/50",
          hasContextMenu && "cursor-context-menu"
        )}
      >
        {preset.type === 'builtin' && (
          <Star className="text-yellow-500 size-3.5 fill-current" />
        )}
        {isUserPreset && (
          <Settings className="size-3.5" />
        )}
        <span>{preset.name}</span>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="dark:bg-dark-secondary dark:border-dark-border animate-in fade-in-0 zoom-in-95 fixed z-50 min-w-[140px] rounded-lg border border-border bg-card py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <Button
              onClick={() => {
                handleCloseContextMenu();
                onEdit();
              }}
              variant="ghost"
              className="h-auto w-full justify-start gap-2 px-3 py-2 text-sm"
            >
              <Edit className="size-4" />
              {t('common.edit')}
            </Button>
          )}
          {onExport && (
            <Button
              onClick={() => {
                handleCloseContextMenu();
                onExport();
              }}
              variant="ghost"
              className="h-auto w-full justify-start gap-2 px-3 py-2 text-sm"
            >
              <Upload className="size-4" />
              {t('common.export')}
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={() => {
                handleCloseContextMenu();
                onDelete();
              }}
              variant="ghost"
              className="h-auto w-full justify-start gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              {t('common.delete')}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function PresetImportContent({ onImport, onCancel }: { onImport: (file: File) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PresetConfig | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setPreview(data);
      } catch (error) {
        console.error('Failed to parse preset file:', error);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith('.json')) {
      processFile(droppedFile);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging ? 'border-primary bg-primary/5' : 'border-border'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* eslint-disable-next-line no-restricted-syntax */}
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          id="preset-file"
        />
        <label htmlFor="preset-file" className="cursor-pointer">
          <div className="mx-auto mb-4 size-12 text-muted-foreground">📄</div>
          <p className="text-sm text-muted-foreground">
            点击选择文件或拖拽文件到这里
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            支持 .json 格式的预设文件
          </p>
        </label>
      </div>

      {preview && (
        <div className="space-y-2 rounded-lg bg-muted p-4">
          <h4 className="shrink-0 font-medium">{t("preset.preview")}</h4>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">{t("preset.name")}:</span> {preview.name}</p>
            <p><span className="font-medium">{t("preset.description")}:</span> {preview.description || t('preset.none')}</p>
            <p><span className="font-medium">{t("preset.vramRequirement")}:</span> {preview.vram_requirement || 'N/A'}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          onClick={() => {
            console.log('[PresetImportContent] 导入按钮被点击');
            if (file) {
              onImport(file);
            }
          }}
          disabled={!file || !preview}
        >
          导入
        </Button>
      </div>
    </div>
  );
}

function PresetExportContent({
  presets,
  onExport,
  onCancel
}: {
  presets: PresetConfig[];
  onExport: (preset: PresetConfig) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState<PresetConfig | null>(null);
  const [exportName, setExportName] = useState('');
  const [exportDescription, setExportDescription] = useState('');

  const handleSelectPreset = (preset: PresetConfig) => {
    setSelectedPreset(preset);
    setExportName(preset.name);
    setExportDescription(preset.description || '');
  };

  const handleExport = () => {
    if (selectedPreset) {
      const presetToExport = {
        ...selectedPreset,
        name: exportName,
        description: exportDescription
      };
      onExport(presetToExport);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium">{t("preset.selectToExport")}</label>
        <div className="grid max-h-48 gap-2 overflow-y-auto">
          {presets.map(preset => (
            <div
              key={preset.id}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-colors",
                selectedPreset?.id === preset.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
              )}
              onClick={() => handleSelectPreset(preset)}
            >
              <div className="truncate font-medium">{preset.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {preset.description || t('preset.noDescription')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">{t("preset.presetName")}</label>
        <Input
          value={exportName}
          onChange={(e) => setExportName(e.target.value)}
          placeholder={t("common.placeholder.presetName")}
          spellCheck={false}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">{t("preset.description")}</label>
        <Textarea
          value={exportDescription}
          onChange={(e) => setExportDescription(e.target.value)}
          placeholder={t("common.placeholder.presetDesc")}
          rows={3}
          spellCheck={false}
          className="w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          onClick={handleExport}
          disabled={!selectedPreset || !exportName}
        >
          导出
        </Button>
      </div>
    </div>
  );
}
