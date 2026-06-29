/**
 * 简单的事件总线
 * 用于跨组件通信
 */

type EventCallback = (...args: any[]) => void

class EventBus {
  private events: Map<string, EventCallback[]> = new Map()

  /**
   * 订阅事件
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    
    const callbacks = this.events.get(event)!
    callbacks.push(callback)
    
    // 返回取消订阅函数
    return () => {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 发送事件
   */
  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args)
        } catch (error) {
          console.error(`[EventBus] 事件处理错误 (${event}):`, error)
        }
      })
    }
  }

  /**
   * 取消所有订阅
   */
  off(event: string): void {
    this.events.delete(event)
  }
}

// 导出单例
export const eventBus = new EventBus()

// 定义事件类型
export const EVENTS = {
  /** 插件安装完成 */
  PLUGIN_INSTALLED: 'plugin:installed',
  /** 插件卸载完成 */
  PLUGIN_UNINSTALLED: 'plugin:uninstalled',
  /** 插件更新完成 */
  PLUGIN_UPDATED: 'plugin:updated',
} as const
