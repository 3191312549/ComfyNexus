/**
 * 救援模式类型定义
 *
 * 与后端 RescueController 数据模型一一对应
 */

/** 备份选项 */
export type BackupOption = 'deps_only' | 'plugins_only' | 'all'

/** 恢复模式 */
export type RestoreMode = 'deps_only' | 'plugins_only' | 'all'

/** 快照信息（列表展示用） */
export interface SnapshotInfo {
  /** zip 文件完整路径 */
  filePath: string
  /** 快照名称 */
  name: string
  /** 备份选项 */
  backupOption: BackupOption
  /** 备注 */
  note: string
  /** ISO8601 时间戳 */
  createdAt: string
  /** 文件大小（字节） */
  fileSize: number
}

/** 创建快照参数 */
export interface CreateSnapshotParams {
  /** 快照名称（1-50 字符） */
  name: string
  /** 备份选项 */
  backupOption: BackupOption
  /** 是否保留插件 .git 目录 */
  includeGit: boolean
  /** 备注（0-500 字符） */
  note: string
}

/** 更新快照参数 */
export interface UpdateSnapshotParams {
  /** 快照文件路径 */
  filePath: string
  /** 新的快照名称（1-50 字符） */
  name: string
  /** 新的备注（0-500 字符） */
  note: string
}

/** 依赖差异项 */
export interface DependencyDiffItem {
  name: string
  version: string
}

/** 依赖版本变更项 */
export interface DependencyChangedItem {
  name: string
  current: string
  snapshot: string
}

/** 差异计算结果 */
export interface DiffResult {
  /** 快照的备份选项，决定对比范围 */
  backupOption?: BackupOption
  dependencies: {
    /** 当前有、快照无 → 需卸载 */
    added: DependencyDiffItem[]
    /** 快照有、当前无 → 需安装 */
    removed: DependencyDiffItem[]
    /** 版本变更 */
    changed: DependencyChangedItem[]
  }
  plugins: {
    /** 当前有、快照无 → 需删除 */
    added: string[]
    /** 快照有、当前无 → 需恢复 */
    removed: string[]
  }
}

/** 恢复失败项 */
export interface RestoreFailure {
  item: string
  error: string
}

/** 恢复报告 */
export interface RestoreReport {
  totalItems: number
  succeeded: number
  failed: number
  failures: RestoreFailure[]
}
