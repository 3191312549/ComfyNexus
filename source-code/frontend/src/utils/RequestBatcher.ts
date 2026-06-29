/**
 * 请求批量合并工具
 * 
 * 将多个单独的请求合并为一个批量请求，减少网络开销
 * 适用于状态检测等场景
 * 
 * 需求: 13.3
 */

/**
 * 批量请求配置
 */
export interface BatcherConfig<T, R> {
  /** 批量处理函数 */
  batchFn: (items: T[]) => Promise<R[]>;
  /** 批量延迟（毫秒） */
  delay?: number;
  /** 最大批量大小 */
  maxBatchSize?: number;
}

/**
 * 请求批量合并器
 */
export class RequestBatcher<T, R> {
  private queue: Array<{
    item: T;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private timer: NodeJS.Timeout | null = null;
  private batchFn: (items: T[]) => Promise<R[]>;
  private delay: number;
  private maxBatchSize: number;

  /**
   * 创建批量请求器
   * 
   * @param config 配置选项
   */
  constructor(config: BatcherConfig<T, R>) {
    this.batchFn = config.batchFn;
    this.delay = config.delay ?? 100;
    this.maxBatchSize = config.maxBatchSize ?? 50;
  }

  /**
   * 添加请求到队列
   * 
   * @param item 请求项
   * @returns Promise 返回处理结果
   */
  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });

      // 如果达到最大批量大小，立即执行
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
        return;
      }

      // 否则设置延迟执行
      if (this.timer) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(() => {
        this.flush();
      }, this.delay);
    });
  }

  /**
   * 立即执行批量请求
   */
  async flush(): Promise<void> {
    // 清除定时器
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // 如果队列为空，直接返回
    if (this.queue.length === 0) {
      return;
    }

    // 取出当前队列
    const batch = this.queue.splice(0, this.queue.length);
    const items = batch.map(b => b.item);

    try {
      // 执行批量请求
      const results = await this.batchFn(items);

      // 分发结果
      if (results.length !== batch.length) {
        throw new Error(
          `批量请求结果数量不匹配：期望 ${batch.length}，实际 ${results.length}`
        );
      }

      batch.forEach((b, index) => {
        b.resolve(results[index]);
      });
    } catch (error) {
      // 批量请求失败，拒绝所有 Promise
      batch.forEach(b => {
        b.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }

  /**
   * 清空队列
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // 拒绝所有待处理的请求
    this.queue.forEach(b => {
      b.reject(new Error('批量请求器已清空'));
    });

    this.queue = [];
  }

  /**
   * 获取当前队列大小
   */
  get queueSize(): number {
    return this.queue.length;
  }
}

/**
 * 创建包名状态检测批量请求器
 * 
 * @param checkAllStatusFn 批量检测函数
 * @returns RequestBatcher 实例
 */
export function createPackageStatusBatcher(
  checkAllStatusFn: (packages: string[]) => Promise<Record<string, any>>
): RequestBatcher<string, any> {
  return new RequestBatcher({
    batchFn: async (packageNames: string[]) => {
      const result = await checkAllStatusFn(packageNames);
      // 将结果对象转换为数组，保持顺序
      return packageNames.map(name => result[name]);
    },
    delay: 100,
    maxBatchSize: 50
  });
}

export default RequestBatcher;
