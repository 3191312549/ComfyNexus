/**
 * 极客模式工具函数单元测试
 */

import { describe, it, expect } from 'vitest'
import { normalizeArgs, checkPresetMatch } from './geekModeUtils'
import type { GeekPreset } from '../types/environment'

describe('normalizeArgs', () => {
  it('should remove empty lines', () => {
    const input = '--port 8188\n\n--listen 0.0.0.0'
    const expected = '--port 8188\n--listen 0.0.0.0'
    expect(normalizeArgs(input)).toBe(expected)
  })

  it('should remove comments', () => {
    const input = '# Comment\n--port 8188\n# Another comment\n--listen 0.0.0.0'
    const expected = '--port 8188\n--listen 0.0.0.0'
    expect(normalizeArgs(input)).toBe(expected)
  })

  it('should trim whitespace', () => {
    const input = '  --port 8188  \n  --listen 0.0.0.0  '
    const expected = '--port 8188\n--listen 0.0.0.0'
    expect(normalizeArgs(input)).toBe(expected)
  })

  it('should handle mixed empty lines, comments, and whitespace', () => {
    const input = '# Network config\n  --port 8188  \n\n# GPU config\n  --gpu-only  '
    const expected = '--port 8188\n--gpu-only'
    expect(normalizeArgs(input)).toBe(expected)
  })

  it('should return empty string for empty input', () => {
    expect(normalizeArgs('')).toBe('')
  })

  it('should return empty string for only comments and empty lines', () => {
    const input = '# Comment 1\n\n# Comment 2\n\n'
    expect(normalizeArgs(input)).toBe('')
  })

  it('should preserve parameter order', () => {
    const input = '--port 8188\n--listen 0.0.0.0\n--gpu-only'
    const expected = '--port 8188\n--listen 0.0.0.0\n--gpu-only'
    expect(normalizeArgs(input)).toBe(expected)
  })
})

describe('checkPresetMatch', () => {
  const mockPresets: GeekPreset[] = [
    {
      id: 'preset1',
      name: 'Preset 1',
      description: 'Test preset 1',
      args: '--port 8188\n--listen 0.0.0.0',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    },
    {
      id: 'preset2',
      name: 'Preset 2',
      description: 'Test preset 2',
      args: '--gpu-only\n--highvram',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Custom preset',
      args: '--custom-args',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    }
  ]

  it('should match preset with same args', () => {
    const args = '--port 8188\n--listen 0.0.0.0'
    expect(checkPresetMatch(args, mockPresets)).toBe('preset1')
  })

  it('should match preset ignoring comments and empty lines', () => {
    const args = '# Comment\n--port 8188\n\n--listen 0.0.0.0'
    expect(checkPresetMatch(args, mockPresets)).toBe('preset1')
  })

  it('should match preset ignoring whitespace', () => {
    const args = '  --port 8188  \n  --listen 0.0.0.0  '
    expect(checkPresetMatch(args, mockPresets)).toBe('preset1')
  })

  it('should return custom when no match', () => {
    const args = '--port 9999'
    expect(checkPresetMatch(args, mockPresets)).toBe('custom')
  })

  it('should return custom for empty args', () => {
    expect(checkPresetMatch('', mockPresets)).toBe('custom')
  })

  it('should skip custom preset when matching', () => {
    const args = '--custom-args'
    // 即使参数匹配 custom 预设，也应该返回 'custom' 而不是匹配到 custom 预设
    expect(checkPresetMatch(args, mockPresets)).toBe('custom')
  })

  it('should match second preset', () => {
    const args = '--gpu-only\n--highvram'
    expect(checkPresetMatch(args, mockPresets)).toBe('preset2')
  })

  it('should not match if parameter order is different', () => {
    const args = '--listen 0.0.0.0\n--port 8188'
    // 参数顺序不同，不应该匹配
    expect(checkPresetMatch(args, mockPresets)).toBe('custom')
  })

  it('should handle empty preset list', () => {
    const args = '--port 8188'
    expect(checkPresetMatch(args, [])).toBe('custom')
  })
})
