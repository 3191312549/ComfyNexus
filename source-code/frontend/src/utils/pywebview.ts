/**
 * PyWebView 工具函数
 * 
 * 提供统一的 PyWebView API 检测和等待逻辑
 */

/**
 * 必需的 API 方法列表
 * 这些方法必须在 PyWebView API 中存在，否则应用无法正常运行
 */
export const REQUIRED_API_METHODS: string[] = [
  'getAppInfo',
  'closeApp',
  'minimizeApp',
  'maximizeApp',
  'isMaximized',
  'get_module_config',
  'get_environments',
  'get_comfyui_status',
]

/**
 * 检查是否在开发环境（纯浏览器环境）
 */
export const isDevelopment = (): boolean => {
  // 如果 window.pywebview 存在，说明在 PyWebView 环境中
  if (typeof window !== 'undefined' && window.pywebview) {
    return false
  }
  // 否则是纯浏览器环境（开发环境）
  return true
}

/**
 * 等待 PyWebView API 就绪
 * 
 * @param timeout 超时时间（毫秒），默认 5000ms
 * @returns Promise<boolean> - API 是否就绪
 */
export const waitForAPI = async (timeout: number = 5000): Promise<boolean> => {
  console.log('[PyWebView] waitForAPI 开始')
  console.log('[PyWebView] window.pywebview 存在:', !!window.pywebview)
  console.log('[PyWebView] window.pywebview.api 存在:', !!(window.pywebview?.api))
  
  // 检查是否在纯浏览器开发环境（通过端口访问）
  const isPureBrowserDev = window.location.port === '5173' || window.location.port === '3000'
  
  // 如果在纯浏览器开发环境，直接返回 false
  if (isPureBrowserDev) {
    console.log('[PyWebView] 纯浏览器开发环境（端口 ' + window.location.port + '），跳过 API 就绪等待')
    return false
  }

  // 快速路径：如果 API 已经存在且有方法，立即返回 true
  if (window.pywebview?.api) {
    const api = window.pywebview.api as any
    const methodCount = Object.keys(api).filter(k => typeof api[k] === 'function').length
    
    if (methodCount > 0) {
      console.log('[PyWebView] API 已就绪（快速路径），方法数量:', methodCount)
      return true
    } else {
      console.warn('[PyWebView] API 对象存在但没有方法，等待 pywebviewready 事件')
    }
  }

  console.log('[PyWebView] 等待 pywebviewready 事件...')

  // 等待 pywebviewready 事件
  return new Promise((resolve) => {
    let timeoutId: NodeJS.Timeout | null = null

    const handleReady = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      const isReady = !!window.pywebview?.api
      const api = window.pywebview?.api as any
      const methodCount = api ? Object.keys(api).filter((k: string) => typeof api[k] === 'function').length : 0
      
      console.log(`[PyWebView] pywebviewready 事件触发，API 就绪: ${isReady}, 方法数量: ${methodCount}`)
      
      // 只有当 API 存在且有方法时才认为就绪
      resolve(isReady && methodCount > 0)
    }

    // 监听 pywebviewready 事件
    window.addEventListener('pywebviewready', handleReady, { once: true })

    // 设置超时
    timeoutId = setTimeout(() => {
      window.removeEventListener('pywebviewready', handleReady)
      
      // 超时后再次检查 API 是否可用
      const api = window.pywebview?.api as any
      const methodCount = api ? Object.keys(api).filter((k: string) => typeof api[k] === 'function').length : 0
      
      if (methodCount > 0) {
        console.log(`[PyWebView] 超时后检查，API 可用，方法数量: ${methodCount}`)
        resolve(true)
      } else {
        console.warn(`[PyWebView] API 未在 ${timeout}ms 内就绪，超时`)
        resolve(false)
      }
    }, timeout)
  })
}

/**
 * 验证必需的 API 方法是否存在
 * 
 * @param requiredMethods 必需方法列表
 * @returns { valid: boolean; missing: string[] } 验证结果和缺失方法列表
 */
export const validateAPIMethods = (requiredMethods: string[]): {
  valid: boolean
  missing: string[]
} => {
  // 检查是否在纯浏览器开发环境（通过端口访问）
  const isPureBrowserDev = window.location.port === '5173' || window.location.port === '3000'
  
  // 如果在纯浏览器开发环境，跳过验证
  if (isPureBrowserDev) {
    console.log('[PyWebView] 纯浏览器开发环境，跳过 API 方法验证')
    return { valid: true, missing: [] }
  }

  // 检查 API 对象是否存在
  if (!window.pywebview?.api) {
    console.warn('[PyWebView] API 对象不存在')
    return { valid: false, missing: requiredMethods }
  }

  const api = window.pywebview.api as any
  const missing: string[] = []

  // 检查每个必需方法
  for (const method of requiredMethods) {
    if (typeof api[method] !== 'function') {
      missing.push(method)
    }
  }

  const valid = missing.length === 0

  if (!valid) {
    console.warn('[PyWebView] 缺失的 API 方法:', missing)
  } else {
    console.log('[PyWebView] 所有必需的 API 方法都已注册')
  }

  return { valid, missing }
}

/**
 * 安全地调用 PyWebView API
 * 
 * @param apiCall API 调用函数
 * @param fallback 失败时的回退值
 * @param waitTimeout 等待超时时间（毫秒）
 * @returns Promise<T> - API 调用结果或回退值
 */
export async function safeAPICall<T>(
  apiCall: () => Promise<T>,
  fallback: T,
  waitTimeout: number = 5000
): Promise<T> {
  try {
    // 检查是否在纯浏览器开发环境（通过端口访问）
    const isPureBrowserDev = window.location.port === '5173' || window.location.port === '3000'
    
    // 如果在纯浏览器开发环境，直接返回回退值
    if (isPureBrowserDev) {
      console.log('[PyWebView] 纯浏览器开发环境，使用回退值')
      return fallback
    }

    // 等待 API 就绪
    const apiReady = await waitForAPI(waitTimeout)
    
    if (!apiReady) {
      console.warn('[PyWebView] API 未就绪，使用回退值')
      return fallback
    }

    // 调用 API
    const result = await apiCall()
    return result
  } catch (error) {
    console.error('[PyWebView] API 调用失败:', error)
    if (error instanceof Error) {
      console.error('[PyWebView] 错误栈:', error.stack)
    }
    return fallback
  }
}
