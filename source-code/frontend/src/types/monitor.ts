/**
 * 监控模块数据类型定义
 * 与后端 API 契约保持一致
 */

export interface CPUMonitorData {
  load: number
  temp: number
  power: number
  freq: number
}

export interface GPUMonitorData {
  load: number
  temp: number
  power: number
  core_clock: number
}

export interface MemoryInfo {
  used: number
  total: number
  percent: number
}

export interface SystemMemoryData {
  ram: MemoryInfo
  vram: MemoryInfo
  page: MemoryInfo
}

export interface NetworkData {
  up: number
  down: number
}

export interface DiskInfo {
  letter: string
  name: string
  used: number
  total: number
}

export interface CPUInfo {
  name: string
  cores: number
  threads: number
  vendor: string
}

export interface GPUInfo {
  name: string
  vendor: string
  vram_total: number
}

export interface HardwareInfo {
  cpu: CPUInfo
  gpu: GPUInfo
}

export interface MonitorData {
  cpu: CPUMonitorData
  gpu: GPUMonitorData
  sys: SystemMemoryData
  net: NetworkData
  disks: DiskInfo[]
}

export interface FloatingWindowSettings {
  opacity: number
  visibleItems: string[]
  itemOrder: string[]
  visible?: boolean
}

export const DEFAULT_FLOATING_WINDOW_SETTINGS: FloatingWindowSettings = {
  opacity: 75,
  visibleItems: ['cpu', 'gpu', 'ram', 'vram', 'net', 'page'],
  itemOrder: ['cpu', 'gpu', 'ram', 'vram', 'net', 'page']
}

export const FLOATING_WINDOW_ITEMS = [
  { id: 'cpu', labelKey: 'monitor.floatingWindow.cpu' },
  { id: 'gpu', labelKey: 'monitor.floatingWindow.gpu' },
  { id: 'ram', labelKey: 'monitor.floatingWindow.ram' },
  { id: 'vram', labelKey: 'monitor.floatingWindow.vram' },
  { id: 'net', labelKey: 'monitor.floatingWindow.net' },
  { id: 'page', labelKey: 'monitor.floatingWindow.page' }
] as const

export type FloatingWindowItemId = typeof FLOATING_WINDOW_ITEMS[number]['id']
