/**
 * BranchSelector 组件
 * 
 * 展示插件的所有分支，提供分支切换功能
 * 标注默认分支和当前分支
 * 
 * 验证需求: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6（分支管理）
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { CheckCircle2, AlertCircle, GitBranch, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pluginAPI } from '@/services/PluginAPIService';
import type { BranchInfo, PluginInfo } from '@/types/plugin';

/**
 * BranchSelector 组件属性
 */
export interface BranchSelectorProps {
  pluginName: string;
  currentBranch: string;
  onClose: () => void;
  onBranchChanged: (updatedPlugin?: PluginInfo) => void;
}

/**
 * BranchSelector 组件
 */
export const BranchSelector: React.FC<BranchSelectorProps> = ({
  pluginName,
  currentBranch: _currentBranch,
  onClose,
  onBranchChanged,
}) => {
  const { t } = useTranslation()
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [switching, setSwitching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [switchResult, setSwitchResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const loadBranches = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await pluginAPI.getBranches(pluginName);

      if (response.success && response.branches) {
        const sortedBranches = [...response.branches].sort((a, b) => {
          if (a.is_current) return -1;
          if (b.is_current) return 1;
          if (a.is_default) return -1;
          if (b.is_default) return 1;
          return a.name.localeCompare(b.name);
        });
        
        setBranches(sortedBranches);
      } else {
        setError(response.error || t('plugin.loadBranchFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('plugin.loadBranchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [pluginName]);

  const handleSwitchBranch = async (branch: BranchInfo) => {
    if (branch.is_current) {
      return;
    }

    setSwitching(true);
    setSwitchResult(null);
    setError(null);

    try {
      const response = await pluginAPI.switchBranch(
        pluginName, 
        branch.name,
        branch.commit_hash,
        branch.commit_date
      );

      if (response.success) {
        setSwitchResult({
          success: true,
          message: `成功切换到分支 ${branch.name}`,
        });

        setTimeout(() => {
          onBranchChanged(response.plugin);
        }, 1500);
      } else {
        setSwitchResult({
          success: false,
          message: response.error || t('plugin.switchBranchFailed'),
        });
      }
    } catch (err: any) {
      setSwitchResult({
        success: false,
        message: err.message || t('plugin.switchBranchFailed'),
      });
    } finally {
      setSwitching(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose()
  };

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("common.title.branchManagement", { name: pluginName })}</DialogTitle>
          <DialogDescription>{t("plugin.selectBranchDesc")}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loading size="md" text={t('plugin.loadingBranchList')} />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 text-destructive" />
                <div className="flex-1">
                  <h4 className="mb-1 font-semibold text-destructive">{t("plugin.branch.loadFailed")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && branches.length === 0 && (
            <div className="py-12 text-center">
              <GitBranch className="mx-auto mb-3 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                没有可用的分支
              </p>
            </div>
          )}

          {!loading && !error && branches.length > 0 && (
            <div className="-mx-6 max-h-[55vh] overflow-y-auto px-6 py-2">
              <div className="space-y-2 pr-2">
                {branches.map((branch, index) => {
                  const isCurrent = branch.is_current;
                  const isDefault = branch.is_default;

                  return (
                    <Button
                      key={`${branch.name}-${index}`}
                      onClick={() => handleSwitchBranch(branch)}
                      disabled={switching || isCurrent}
                      variant="outline"
                      className={cn(
                        'w-full justify-start p-4 text-left h-auto',
                        isCurrent && 'ring-2 ring-primary bg-primary/5'
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <GitBranch className="size-5 shrink-0 text-muted-foreground" />
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="break-all text-base font-semibold">
                                {branch.name}
                              </span>
                              
                              {isDefault && (
                                <Badge variant="secondary" className="shrink-0">
                                  默认
                                </Badge>
                              )}
                              
                              {isCurrent && (
                                <Badge variant="secondary" className="shrink-0">
                                  <Check className="mr-1 size-3" />
                                  当前分支
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {!isCurrent && !switching && (
                          <span className="shrink-0 text-sm text-muted-foreground">
                            点击切换
                          </span>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {switching && (
            <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <Loading size="sm" />
                <span className="text-sm text-foreground">
                  正在切换分支...
                </span>
              </div>
            </div>
          )}

          {switchResult?.success && (
            <div className="mt-6 rounded-lg border border-success/50 bg-success/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 text-success" />
                <div className="flex-1">
                  <h4 className="mb-1 font-semibold text-success">
                    切换成功
                  </h4>
                  <p className="text-sm text-success">
                    {switchResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {switchResult && !switchResult.success && (
            <div className="mt-6 rounded-lg border border-destructive bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 text-destructive" />
                <div className="flex-1">
                  <h4 className="mb-1 font-semibold text-destructive">{t("plugin.branch.switchFailed")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {switchResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={switching}
            >
              {switchResult?.success ? t('common.done') : t('common.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BranchSelector;
