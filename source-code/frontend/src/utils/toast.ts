/**
 * Toast 工具函数
 * 统一管理 Toast 提示的时长配置
 */

import { toast as sonnerToast } from 'sonner'

const TOAST_DURATION = {
  SUCCESS: 1500,
  ERROR: 3000,
  WARNING: 1500,
  INFO: 1500,
  DEFAULT: 1500,
} as const

export const toast = {
  success: (message: string, options?: { description?: string; [key: string]: unknown }) => {
    sonnerToast.success(message, { ...options, duration: TOAST_DURATION.SUCCESS })
  },
  
  error: (message: string, options?: { description?: string; [key: string]: unknown }) => {
    sonnerToast.error(message, { ...options, duration: TOAST_DURATION.ERROR })
  },
  
  warning: (message: string, options?: { description?: string; [key: string]: unknown }) => {
    sonnerToast.warning(message, { ...options, duration: TOAST_DURATION.WARNING })
  },
  
  info: (message: string, options?: { description?: string; [key: string]: unknown }) => {
    sonnerToast.info(message, { ...options, duration: TOAST_DURATION.INFO })
  },
  
  dismiss: () => {
    sonnerToast.dismiss()
  },
}
