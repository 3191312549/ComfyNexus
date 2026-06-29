/**
 * 监控中心状态管理
 * 支持真实 API 数据获取和历史数据追踪
 */

import { create } from 'zustand'
import type {
  MonitorData,
  CPUMonitorData,
  GPUMonitorData,
  SystemMemoryData,
  NetworkData,
  FloatingWindowSettings,
  HardwareInfo,
  CPUInfo,
  GPUInfo
} from '@/types/monitor'
import { DEFAULT_FLOATING_WINDOW_SETTINGS } from '@/types/monitor'

const HISTORY_LENGTH = 40

const DEFAULT_CPU_DATA: CPUMonitorData = {
  load: 0,
  temp: 0,
  power: 0,
  freq: 0
}

const DEFAULT_GPU_DATA: GPUMonitorData = {
  load: 0,
  temp: 0,
  power: 0,
  core_clock: 0
}

const DEFAULT_SYS_DATA: SystemMemoryData = {
  ram: { used: 0, total: 0, percent: 0 },
  vram: { used: 0, total: 0, percent: 0 },
  page: { used: 0, total: 0, percent: 0 }
}

const DEFAULT_NET_DATA: NetworkData = {
  up: 0,
  down: 0
}

const DEFAULT_CPU_INFO: CPUInfo = {
  name: 'Unknown CPU',
  cores: 0,
  threads: 0,
  vendor: 'Unknown'
}

const DEFAULT_GPU_INFO: GPUInfo = {
  name: 'Unknown GPU',
  vendor: 'Unknown',
  vram_total: 0
}

const DEFAULT_HARDWARE_INFO: HardwareInfo = {
  cpu: DEFAULT_CPU_INFO,
  gpu: DEFAULT_GPU_INFO
}

const DEFAULT_MONITOR_DATA: MonitorData = {
  cpu: DEFAULT_CPU_DATA,
  gpu: DEFAULT_GPU_DATA,
  sys: DEFAULT_SYS_DATA,
  net: DEFAULT_NET_DATA,
  disks: []
}

interface MonitorStore {
  currentData: MonitorData
  cpuHistory: number[]
  gpuHistory: number[]
  sysHistory: number[]
  netDownHistory: number[]
  netUpHistory: number[]
  sysHistorySource: 'ram' | 'vram' | 'page'
  isMonitoring: boolean
  floatingWindowVisible: boolean
  floatingWindowSettings: FloatingWindowSettings
  monitorIntervalId: number | null
  hardwareInfo: HardwareInfo
  networkInterfaceName: string
  hardwareMonitorStatus: {
    available: boolean
    hasAdminPrivilege: boolean
    error?: string
  }
  floatingWindowInitialized: boolean

  setCurrentData: (data: MonitorData) => void
  setSysHistorySource: (source: 'ram' | 'vram' | 'page') => void
  setFloatingWindowVisible: (visible: boolean) => void
  setFloatingWindowSettings: (settings: FloatingWindowSettings) => void
  startMonitoring: () => void
  stopMonitoring: () => void
  refreshData: () => Promise<void>
  fetchMonitorData: () => Promise<void>
  fetchHardwareInfo: () => Promise<void>
  fetchNetworkInterfaceName: () => Promise<void>
  fetchHardwareMonitorStatus: () => Promise<void>
  initFloatingWindowState: () => Promise<void>
}

const createArray = (length: number, fill: number = 0): number[] => Array(length).fill(fill)

export const useMonitorStore = create<MonitorStore>()((set, get) => ({
  currentData: DEFAULT_MONITOR_DATA,
  cpuHistory: createArray(HISTORY_LENGTH),
  gpuHistory: createArray(HISTORY_LENGTH),
  sysHistory: createArray(HISTORY_LENGTH),
  netDownHistory: createArray(HISTORY_LENGTH),
  netUpHistory: createArray(HISTORY_LENGTH),
  sysHistorySource: 'ram',
  isMonitoring: false,
  floatingWindowVisible: false,
  floatingWindowSettings: DEFAULT_FLOATING_WINDOW_SETTINGS,
  monitorIntervalId: null,
  hardwareInfo: DEFAULT_HARDWARE_INFO,
  networkInterfaceName: 'Network',
  hardwareMonitorStatus: {
    available: false,
    hasAdminPrivilege: false,
    error: undefined
  },
  floatingWindowInitialized: false,

  setCurrentData: (data) => {
    const { sysHistorySource } = get()

    const getSysValue = () => {
      switch (sysHistorySource) {
        case 'vram':
          return data.sys.vram.percent
        case 'page':
          return data.sys.page.percent
        default:
          return data.sys.ram.percent
      }
    }

    set((state) => ({
      currentData: data,
      cpuHistory: [...state.cpuHistory.slice(1), data.cpu.load],
      gpuHistory: [...state.gpuHistory.slice(1), data.gpu.load],
      sysHistory: [...state.sysHistory.slice(1), getSysValue()],
      netDownHistory: [...state.netDownHistory.slice(1), data.net.down],
      netUpHistory: [...state.netUpHistory.slice(1), data.net.up]
    }))
  },

  setSysHistorySource: (source) => {
    const { currentData } = get()
    const getBaseValue = () => {
      switch (source) {
        case 'vram':
          return currentData.sys.vram.percent
        case 'page':
          return currentData.sys.page.percent
        default:
          return currentData.sys.ram.percent
      }
    }
    const baseValue = getBaseValue()
    set({
      sysHistorySource: source,
      sysHistory: createArray(HISTORY_LENGTH, baseValue)
    })
  },

  setFloatingWindowVisible: async (visible) => {
    set({ floatingWindowVisible: visible })
    try {
      await window.pywebview?.api?.toggle_floating_window(visible)
    } catch (error) {
      console.error('Failed to toggle floating window:', error)
    }
  },

  setFloatingWindowSettings: async (settings) => {
    set({ floatingWindowSettings: settings })
    try {
      await window.pywebview?.api?.update_floating_window_settings(settings)
    } catch (error) {
      console.error('Failed to update floating window settings:', error)
    }
  },

  fetchMonitorData: async () => {
    try {
      const response = await window.pywebview?.api?.get_monitor_data()
      if (response?.success && response.data) {
        get().setCurrentData(response.data)
      } else {
        const mockData = generateMockData()
        get().setCurrentData(mockData)
      }
    } catch (error) {
      console.error('Failed to fetch monitor data:', error)
      const mockData = generateMockData()
      get().setCurrentData(mockData)
    }
  },

  startMonitoring: () => {
    const { isMonitoring, fetchMonitorData } = get()
    if (isMonitoring) return

    fetchMonitorData()

    const intervalId = window.setInterval(fetchMonitorData, 1000)
    set({ isMonitoring: true, monitorIntervalId: intervalId })
  },

  stopMonitoring: () => {
    const { monitorIntervalId } = get()
    if (monitorIntervalId) {
      clearInterval(monitorIntervalId)
    }
    set({ isMonitoring: false, monitorIntervalId: null })
  },

  refreshData: async () => {
    await get().fetchMonitorData()
  },

  fetchHardwareInfo: async () => {
    try {
      const response = await window.pywebview?.api?.get_hardware_info()
      if (response?.success && response.data) {
        set({ hardwareInfo: response.data })
      }
    } catch (error) {
      console.error('Failed to fetch hardware info:', error)
    }
  },

  fetchNetworkInterfaceName: async () => {
    try {
      const response = await window.pywebview?.api?.get_network_interface_name()
      if (response?.success && response.data) {
        set({ networkInterfaceName: response.data })
      }
    } catch (error) {
      console.error('Failed to fetch network interface name:', error)
    }
  },

  fetchHardwareMonitorStatus: async () => {
    try {
      const response = await window.pywebview?.api?.get_hardware_monitor_status()
      if (response?.success && response.data) {
        set({ hardwareMonitorStatus: response.data })
      }
    } catch (error) {
      console.error('Failed to fetch hardware monitor status:', error)
    }
  },

  initFloatingWindowState: async () => {
    const { floatingWindowInitialized } = get()
    if (floatingWindowInitialized) {
      console.log('[MonitorStore] 悬浮窗已初始化，跳过')
      return
    }
    
    // 关键修复：将状态锁定提前，防止 React 严格模式下的并发请求导致重复初始化
    set({ floatingWindowInitialized: true })
    
    try {
      console.log('[MonitorStore] 开始初始化悬浮窗状态')
      
      const visibleResponse = await window.pywebview?.api?.get_floating_window_visible()
      if (visibleResponse?.success) {
        set({ floatingWindowVisible: visibleResponse.visible })
      }
      
      const settingsResponse = await window.pywebview?.api?.get_floating_window_settings()
      if (settingsResponse?.success && settingsResponse.data) {
        set({ floatingWindowSettings: settingsResponse.data })
      }
      
      // 仅同步状态到前端，不主动调用 toggle
      // 悬浮窗的显示由后端启动流程控制
      
      console.log('[MonitorStore] 悬浮窗状态初始化完成')
    } catch (error) {
      console.error('Failed to init floating window state:', error)
      // 请求失败时重置状态，允许后续重试
      set({ floatingWindowInitialized: false })
    }
  }
}))

function generateMockData(): MonitorData {
  return {
    cpu: {
      load: Math.floor(Math.random() * 20 + 5),
      temp: Math.floor(Math.random() * 20 + 40),
      power: Math.floor(Math.random() * 30 + 20),
      freq: parseFloat((Math.random() * 1 + 4).toFixed(1))
    },
    gpu: {
      load: Math.floor(Math.random() * 15 + 5),
      temp: Math.floor(Math.random() * 15 + 45),
      power: Math.floor(Math.random() * 50 + 30),
      core_clock: Math.floor(Math.random() * 500 + 1500)
    },
    sys: {
      ram: {
        used: parseFloat((Math.random() * 8 + 12).toFixed(1)),
        total: 32.0,
        percent: parseFloat((Math.random() * 25 + 37.5).toFixed(1))
      },
      vram: {
        used: parseFloat((Math.random() * 2 + 9).toFixed(1)),
        total: 12.0,
        percent: parseFloat((Math.random() * 15 + 75).toFixed(1))
      },
      page: {
        used: parseFloat((Math.random() * 3 + 3).toFixed(1)),
        total: 10.0,
        percent: parseFloat((Math.random() * 30 + 30).toFixed(1))
      }
    },
    net: {
      up: parseFloat((Math.random() * 2 + 0.5).toFixed(1)),
      down: parseFloat((Math.random() * 10 + 5).toFixed(1))
    },
    disks: [
      { letter: 'C:', name: '系统盘', used: 120, total: 500 },
      { letter: 'D:', name: '开发与软件', used: 850, total: 2000 },
      { letter: 'E:', name: '模型资源库', used: 3800, total: 4000 }
    ]
  } satisfies MonitorData
}
