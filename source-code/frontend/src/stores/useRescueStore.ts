/**
 * 救援模式状态管理 Store
 *
 * 管理快照列表、创建/删除/恢复操作状态，
 * 通过 window.pywebview.api.rescue_* 调用后端 API。
 */

import { create } from 'zustand'
import type {
  SnapshotInfo,
  CreateSnapshotParams,
  UpdateSnapshotParams,
  DiffResult,
  RestoreReport,
  RestoreMode,
} from '@/types/rescue'

/** Store 接口 */
interface RescueStore {
  // 状态
  snapshots: SnapshotInfo[]
  loading: boolean
  creating: boolean
  restoring: boolean
  error: string | null

  // 操作
  fetchSnapshots: () => Promise<void>
  createSnapshot: (params: CreateSnapshotParams) => Promise<boolean>
  updateSnapshot: (params: UpdateSnapshotParams) => Promise<boolean>
  deleteSnapshot: (snapshotPath: string) => Promise<boolean>
  computeDiff: (snapshotPath: string) => Promise<DiffResult | null>
  executeSmartRollback: (snapshotPath: string) => Promise<RestoreReport | null>
  executeDirectRestore: (snapshotPath: string, mode: RestoreMode) => Promise<boolean>
  checkProcess: () => Promise<boolean>
  clearError: () => void
}

/** 检查是否在开发环境 */
const isDev = (): boolean => !window.pywebview || !window.pywebview.api

export const useRescueStore = create<RescueStore>((set, get) => ({
  snapshots: [],
  loading: false,
  creating: false,
  restoring: false,
  error: null,

  clearError: () => set({ error: null }),

  /** 获取当前环境的快照列表 */
  fetchSnapshots: async () => {
    set({ loading: true, error: null })
    try {
      if (isDev()) {
        // 开发环境 Mock
        await new Promise(r => setTimeout(r, 300))
        set({ snapshots: [], loading: false })
        return
      }
      const res = await window.pywebview.api.rescue_list_snapshots()
      if (!res.success) {
        throw new Error(res.error_message || '获取快照列表失败')
      }
      set({ snapshots: res.snapshots ?? [], loading: false })
    } catch (e: any) {
      console.error('[useRescueStore] fetchSnapshots 失败:', e)
      set({ error: String(e.message ?? e), loading: false })
    }
  },

  /** 创建快照 */
  createSnapshot: async (params) => {
    set({ creating: true, error: null })
    try {
      if (isDev()) {
        await new Promise(r => setTimeout(r, 1000))
        set({ creating: false })
        return true
      }
      const res = await window.pywebview.api.rescue_create_snapshot(
        params.name,
        params.backupOption,
        params.includeGit,
        params.note
      )
      if (!res.success) {
        throw new Error(res.error_message || '创建快照失败')
      }
      set({ creating: false })
      // 刷新列表
      await get().fetchSnapshots()
      return true
    } catch (e: any) {
      console.error('[useRescueStore] createSnapshot 失败:', e)
      set({ error: String(e.message ?? e), creating: false })
      return false
    }
  },

  /** 更新快照元数据 */
  updateSnapshot: async (params) => {
    set({ error: null })
    try {
      if (isDev()) {
        await new Promise(r => setTimeout(r, 300))
        return true
      }
      const res = await window.pywebview.api.rescue_update_snapshot(
        params.filePath,
        params.name,
        params.note
      )
      if (!res.success) {
        throw new Error(res.error_message || '更新快照失败')
      }
      // 刷新列表
      await get().fetchSnapshots()
      return true
    } catch (e: any) {
      console.error('[useRescueStore] updateSnapshot 失败:', e)
      set({ error: String(e.message ?? e) })
      return false
    }
  },

  /** 删除快照 */
  deleteSnapshot: async (snapshotPath) => {
    set({ error: null })
    try {
      if (isDev()) {
        await new Promise(r => setTimeout(r, 300))
        return true
      }
      const res = await window.pywebview.api.rescue_delete_snapshot(snapshotPath)
      if (!res.success) {
        throw new Error(res.error_message || '删除快照失败')
      }
      // 刷新列表
      await get().fetchSnapshots()
      return true
    } catch (e: any) {
      console.error('[useRescueStore] deleteSnapshot 失败:', e)
      set({ error: String(e.message ?? e) })
      return false
    }
  },

  /** 计算差异 */
  computeDiff: async (snapshotPath) => {
    set({ error: null })
    try {
      if (isDev()) {
        await new Promise(r => setTimeout(r, 500))
        return { dependencies: { added: [], removed: [], changed: [] }, plugins: { added: [], removed: [] } }
      }
      const res = await window.pywebview.api.rescue_compute_diff(snapshotPath)
      if (!res.success) {
        throw new Error(res.error_message || '差异计算失败')
      }
      return res.diff_result as DiffResult
    } catch (e: any) {
      console.error('[useRescueStore] computeDiff 失败:', e)
      set({ error: String(e.message ?? e) })
      return null
    }
  },

  /** 执行智能回滚 */
  executeSmartRollback: async (snapshotPath) => {
    set({ restoring: true, error: null })
    try {
      if (isDev()) {
        await new Promise(r => setTimeout(r, 2000))
        set({ restoring: false })
        return { totalItems: 0, succeeded: 0, failed: 0, failures: [] }
      }
      const res = await window.pywebview.api.rescue_smart_rollback(snapshotPath)
      if (!res.success) {
        throw new Error(res.error_message || '智能回滚失败')
      }
      set({ restoring: false })
      return res.report as RestoreReport
    } catch (e: any) {
      console.error('[useRescueStore] executeSmartRollback 失败:', e)
      set({ error: String(e.message ?? e), restoring: false })
      return null
    }
  },

  /** 执行直接恢复 */
  executeDirectRestore: async (snapshotPath, mode) => {
    set({ restoring: true, error: null })
    try {
      if (isDev()) {
        await new Promise(r => setTimeout(r, 2000))
        set({ restoring: false })
        return true
      }
      const res = await window.pywebview.api.rescue_direct_restore(snapshotPath, mode)
      if (!res.success) {
        throw new Error(res.error_message || '直接恢复失败')
      }
      set({ restoring: false })
      return true
    } catch (e: any) {
      console.error('[useRescueStore] executeDirectRestore 失败:', e)
      set({ error: String(e.message ?? e), restoring: false })
      return false
    }
  },

  /** 检查 ComfyUI 进程状态 */
  checkProcess: async () => {
    try {
      if (isDev()) return false
      const res = await window.pywebview.api.rescue_check_process()
      return res.running ?? false
    } catch {
      return false
    }
  },
}))
