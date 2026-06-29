/**
 * ConfirmUpdateDialog 组件
 * 
 * 批量更新确认对话框
 * - 显示待更新插件数量
 * - 提供确认和取消按钮
 * - 使用标准 AlertDialog 组件
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Package } from 'lucide-react';
import type { PluginInfo } from '@/types/plugin';

export interface ConfirmUpdateDialogProps {
  plugins: PluginInfo[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmUpdateDialog: React.FC<ConfirmUpdateDialogProps> = ({
  plugins,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();

  const displayPlugins = plugins.slice(0, 5);
  const hasMore = plugins.length > 5;

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="size-6 text-warning" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle>{t('plugin.confirmUpdate.title')}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t('plugin.confirmUpdate.description', { count: plugins.length })}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="mb-4 rounded-lg border border-border bg-muted/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {t('plugin.confirmUpdate.pluginsToUpdate')}
            </span>
          </div>
          <ul className="space-y-1">
            {displayPlugins.map((plugin) => (
              <li
                key={plugin.name}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="size-1 rounded-full bg-muted-foreground" />
                {plugin.name}
              </li>
            ))}
            {hasMore && (
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-1 rounded-full bg-muted-foreground" />
                {t('plugin.confirmUpdate.andMore', { count: plugins.length - 5 })}
              </li>
            )}
          </ul>
        </div>

        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
          <p className="text-sm text-warning">
            <strong>{t("common.note")}:</strong>{t('plugin.confirmUpdate.warning')}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t('plugin.confirmUpdate.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmUpdateDialog;
