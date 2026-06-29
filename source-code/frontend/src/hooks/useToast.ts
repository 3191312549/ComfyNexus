/**
 * useToast Hook
 * 提供统一的 Toast 提示功能
 * 
 * 底层使用 sonner 库实现
 * 
 * 功能：
 * - 简化 Toast 组件的使用
 * - 提供 success、error、warning、info 快捷方法
 * - 统一管理 Toast 样式和持续时间
 */

import { useCallback } from 'react'
import { toast as sonnerToast } from 'sonner'

const TOAST_DURATION = {
  SUCCESS: 1500,
  ERROR: 3000,
  WARNING: 1500,
  INFO: 1500,
  DEFAULT: 1500,
} as const

export interface ToastOptions {
  duration?: number
}

export interface ToastConfig {
  title?: string
  description: string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export interface ToastState extends ToastConfig {
  open: boolean
}

export interface UseToastReturn {
  toastState: ToastState
  showToast: (config: ToastConfig) => void
  success: (description: string, title?: string, options?: ToastOptions) => void
  error: (description: string, title?: string, options?: ToastOptions) => void
  warning: (description: string, title?: string, options?: ToastOptions) => void
  info: (description: string, title?: string, options?: ToastOptions) => void
  closeToast: () => void
}

export const useToast = (): UseToastReturn => {
  const showToast = useCallback((config: ToastConfig) => {
    const { title, description, variant = 'default', duration } = config
    
    const options = {
      duration: duration || TOAST_DURATION.DEFAULT,
      description: title ? description : undefined,
    }

    switch (variant) {
      case 'success':
        sonnerToast.success(title || description, { ...options, duration: duration || TOAST_DURATION.SUCCESS })
        break
      case 'error':
        sonnerToast.error(title || description, { ...options, duration: duration || TOAST_DURATION.ERROR })
        break
      case 'warning':
        sonnerToast.warning(title || description, { ...options, duration: duration || TOAST_DURATION.WARNING })
        break
      case 'info':
        sonnerToast.info(title || description, { ...options, duration: duration || TOAST_DURATION.INFO })
        break
      default:
        sonnerToast(title || description, options)
    }
  }, [])

  const closeToast = useCallback(() => {
    sonnerToast.dismiss()
  }, [])

  const success = useCallback((description: string, title?: string, options?: ToastOptions) => {
    const duration = options?.duration ?? TOAST_DURATION.SUCCESS
    if (title) {
      sonnerToast.success(title, { description, duration })
    } else {
      sonnerToast.success(description, { duration })
    }
  }, [])

  const error = useCallback((description: string, title?: string, options?: ToastOptions) => {
    const duration = options?.duration ?? TOAST_DURATION.ERROR
    if (title) {
      sonnerToast.error(title, { description, duration })
    } else {
      sonnerToast.error(description, { duration })
    }
  }, [])

  const warning = useCallback((description: string, title?: string, options?: ToastOptions) => {
    const duration = options?.duration ?? TOAST_DURATION.WARNING
    if (title) {
      sonnerToast.warning(title, { description, duration })
    } else {
      sonnerToast.warning(description, { duration })
    }
  }, [])

  const info = useCallback((description: string, title?: string, options?: ToastOptions) => {
    const duration = options?.duration ?? TOAST_DURATION.INFO
    if (title) {
      sonnerToast.info(title, { description, duration })
    } else {
      sonnerToast.info(description, { duration })
    }
  }, [])

  return {
    toastState: {
      open: false,
      description: '',
      variant: 'default',
      duration: TOAST_DURATION.DEFAULT
    },
    showToast,
    success,
    error,
    warning,
    info,
    closeToast
  }
}
