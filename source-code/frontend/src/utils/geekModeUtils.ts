/**
 * 极客模式工具函数
 * 
 * 提供参数规范化和预设匹配功能
 */

import type { GeekPreset } from '../types/environment'

/**
 * Custom 预设的固定数据
 * 
 * Custom 预设是一个特殊的预设，用于表示用户手动调整的启动参数。
 * - ID 固定为 'custom'
 * - 始终显示在预设列表中
 * - 不可编辑和删除
 * - 参数实时同步用户在编辑器中的修改
 */
export const CUSTOM_PRESET_ID = 'custom' as const

export const CUSTOM_PRESET_BASE: Readonly<Omit<GeekPreset, 'args'>> = {
  id: CUSTOM_PRESET_ID,
  name: '用户配置',
  description: '当前编辑器中的启动参数',
  createdAt: '',
  updatedAt: ''
}

/**
 * 规范化参数字符串
 * 
 * 移除空行和注释，用于参数匹配。
 * 这样用户可以自由添加注释和空行来组织参数，不会影响预设匹配。
 * 
 * @param args - 原始参数字符串
 * @returns 规范化后的参数字符串
 * 
 * @example
 * ```typescript
 * const input = '# Comment\n--port 8188\n\n--listen 0.0.0.0'
 * const output = normalizeArgs(input)
 * // output: '--port 8188\n--listen 0.0.0.0'
 * ```
 */
export const normalizeArgs = (args: string): string => {
  return args
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .join('\n')
}

/**
 * 检查当前参数是否匹配某个预设
 * 
 * 遍历所有预设（排除 custom），使用规范化算法比对参数。
 * 如果找到匹配的预设，返回预设 ID；否则返回 'custom'。
 * 
 * @param currentArgs - 当前参数字符串
 * @param presets - 预设列表
 * @returns 匹配的预设 ID 或 'custom'
 * 
 * @example
 * ```typescript
 * const presets = [
 *   { id: 'preset1', args: '--port 8188\n--listen 0.0.0.0', ... }
 * ]
 * const currentArgs = '# Comment\n--port 8188\n\n--listen 0.0.0.0'
 * const result = checkPresetMatch(currentArgs, presets)
 * // result: 'preset1'
 * ```
 */
export const checkPresetMatch = (
  currentArgs: string,
  presets: GeekPreset[]
): string => {
  const normalizedCurrent = normalizeArgs(currentArgs)

  // 遍历所有预设（排除 custom）
  for (const preset of presets) {
    if (preset.id === 'custom') continue

    const normalizedPreset = normalizeArgs(preset.args)
    if (normalizedCurrent === normalizedPreset) {
      return preset.id
    }
  }

  // 没有匹配的预设，返回 custom
  return 'custom'
}
