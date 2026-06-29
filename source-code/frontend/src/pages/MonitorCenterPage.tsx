/**
 * 监控中心页面
 * Bento UI 布局 + ECharts 实时图表
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, RefreshCw } from 'lucide-react'
import { Button, Switch } from '@/components/ui'
import {
  CPUMonitorCard,
  GPUMonitorCard,
  SystemMemoryCard,
  NetworkCard,
  DiskListCard,
  FloatingWindowSettings
} from '@/components/monitor'
import { useMonitorStore } from '@/stores/useMonitorStore'

export default function MonitorCenterPage() {
  const { t } = useTranslation()
  const {
    currentData,
    cpuHistory,
    gpuHistory,
    sysHistory,
    netDownHistory,
    netUpHistory,
    sysHistorySource,
    floatingWindowVisible,
    floatingWindowSettings,
    hardwareInfo,
    networkInterfaceName,
    hardwareMonitorStatus,
    startMonitoring,
    stopMonitoring,
    refreshData,
    fetchHardwareInfo,
    fetchNetworkInterfaceName,
    fetchHardwareMonitorStatus,
    setSysHistorySource,
    setFloatingWindowVisible,
    setFloatingWindowSettings,
    initFloatingWindowState
  } = useMonitorStore()

  const [settingsModalOpen, setSettingsModalOpen] = useState(false)

  useEffect(() => {
    startMonitoring()
    fetchHardwareInfo()
    fetchNetworkInterfaceName()
    fetchHardwareMonitorStatus()
    initFloatingWindowState()
    return () => stopMonitoring()
  }, [startMonitoring, stopMonitoring, fetchHardwareInfo, fetchNetworkInterfaceName, fetchHardwareMonitorStatus, initFloatingWindowState])

  const handleSysSourceChange = useCallback(
    (source: 'ram' | 'vram' | 'page') => {
      setSysHistorySource(source)
    },
    [setSysHistorySource]
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-10 pb-3 pt-6">
        <h1 className="text-xl font-bold text-foreground">{t('monitor.title')}</h1>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-content-secondary">
            {t('monitor.floatingWindow.title')}
            <Switch
              checked={floatingWindowVisible}
              onCheckedChange={setFloatingWindowVisible}
            />
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setSettingsModalOpen(true)}
            className="gap-2"
          >
            <Settings className="size-4" />
            {t('monitor.floatingWindow.preferences')}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData} className="gap-2">
            <RefreshCw className="size-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-10 pt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <CPUMonitorCard
            data={currentData.cpu}
            historyData={cpuHistory}
            cpuName={hardwareInfo.cpu.name}
            hardwareMonitorAvailable={hardwareMonitorStatus.available}
          />
          <GPUMonitorCard
            data={currentData.gpu}
            historyData={gpuHistory}
            gpuName={hardwareInfo.gpu.name}
            hardwareMonitorAvailable={hardwareMonitorStatus.available}
          />
          <SystemMemoryCard
            data={currentData.sys}
            historyData={sysHistory}
            historySource={sysHistorySource}
            onSourceChange={handleSysSourceChange}
          />
          <NetworkCard
            data={currentData.net}
            downHistoryData={netDownHistory}
            upHistoryData={netUpHistory}
            interfaceName={networkInterfaceName}
          />
          <DiskListCard disks={currentData.disks} />
        </div>
      </div>

      <FloatingWindowSettings
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        settings={floatingWindowSettings}
        onSettingsChange={setFloatingWindowSettings}
      />
    </div>
  )
}
