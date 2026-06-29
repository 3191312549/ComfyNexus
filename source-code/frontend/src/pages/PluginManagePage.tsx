/**
 * 插件管理页面
 * 
 * 功能:
 * - 插件列表展示
 * - 插件搜索
 * - 插件更新
 * - 依赖管理
 * - 分支切换
 * - 一键更新所有插件
 */

import { useTranslation } from 'react-i18next';
import { PluginList } from '@/components/plugin/PluginList';
import { useEnvStore } from '@/stores/useEnvStore';
import { Plug } from 'lucide-react';
import { EnvRequiredGuide } from '@/components/common/EnvRequiredGuide';

export default function PluginManagePage() {
  const { t } = useTranslation();
  const { environments, currentEnvId } = useEnvStore();

  const noEnvironment = environments.length === 0 || !currentEnvId;

  if (noEnvironment) {
    return (
      <EnvRequiredGuide 
        icon={<Plug className="size-24 text-muted-foreground" />}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 pb-4 pt-6">
        <Plug className="size-7 text-primary" />
        <h1 className="text-2xl font-bold text-content-primary">
          {t('plugin.title')}
        </h1>
      </div>
      
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <PluginList environmentId={currentEnvId} />
      </div>
    </div>
  )
}
