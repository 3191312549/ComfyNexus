/**
 * SystemMonitorGrid 组件示例
 * 展示组件的各种使用场景
 */

import { SystemMonitorGrid } from './SystemMonitorGrid'

/**
 * 基础示例
 */
export const BasicExample = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="dark:text-dark-text-primary text-gray-900 mb-6 text-2xl font-bold">
          SystemMonitorGrid 基础示例
        </h1>
        
        <SystemMonitorGrid />
      </div>
    </div>
  )
}

/**
 * 自定义样式示例
 */
export const CustomStyleExample = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="dark:text-dark-text-primary text-gray-900 mb-6 text-2xl font-bold">
          SystemMonitorGrid 自定义样式示例
        </h1>
        
        {/* 自定义背景和边框 */}
        <SystemMonitorGrid className="dark:bg-dark-bg-secondary bg-white rounded-lg p-6 shadow-lg" />
      </div>
    </div>
  )
}

/**
 * 卡片布局示例
 */
export const CardLayoutExample = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <h1 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
          SystemMonitorGrid 卡片布局示例
        </h1>
        
        {/* 放在卡片容器中 */}
        <div className="dark:bg-dark-bg-secondary bg-white rounded-xl p-6 shadow-md">
          <SystemMonitorGrid />
        </div>
      </div>
    </div>
  )
}

/**
 * 响应式布局示例
 */
export const ResponsiveExample = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="dark:text-dark-text-primary text-gray-900 mb-4 text-xl font-bold md:mb-6 md:text-2xl">
          SystemMonitorGrid 响应式布局示例
        </h1>
        
        <p className="dark:text-dark-text-secondary text-gray-600 mb-4 text-sm">
          调整浏览器窗口大小查看响应式效果：
          <br />
          - 小屏（&lt;768px）：2列布局
          <br />
          - 中屏及以上（≥768px）：3列布局
        </p>
        
        <SystemMonitorGrid />
      </div>
    </div>
  )
}

/**
 * 多个实例示例
 */
export const MultipleInstancesExample = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <h1 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
          SystemMonitorGrid 多实例示例
        </h1>
        
        <div className="space-y-6">
          <div className="dark:bg-dark-bg-secondary bg-white rounded-xl p-6 shadow-md">
            <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-lg font-semibold">
              实例 1
            </h2>
            <SystemMonitorGrid />
          </div>
          
          <div className="dark:bg-dark-bg-secondary bg-white rounded-xl p-6 shadow-md">
            <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-lg font-semibold">
              实例 2
            </h2>
            <SystemMonitorGrid />
          </div>
        </div>
        
        <p className="text-yellow-600 dark:text-yellow-400 text-sm">
          ⚠️ 注意：多个实例会共享同一个轮询定时器（由 Store 管理），不会重复请求数据。
        </p>
      </div>
    </div>
  )
}

/**
 * 集成示例（模拟首页布局）
 */
export const IntegrationExample = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <h1 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
          首页集成示例
        </h1>
        
        {/* 模拟首页布局 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 左侧区域（占2列） */}
          <div className="lg:col-span-2">
            <div className="dark:bg-dark-bg-secondary bg-white rounded-xl p-6 shadow-md">
              <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-lg font-semibold">
                创作者推荐
              </h2>
              <div className="dark:bg-dark-bg-primary bg-gray-100 flex h-64 items-center justify-center rounded-lg">
                <p className="dark:text-dark-text-secondary text-gray-500">
                  创作者推荐区域（占位）
                </p>
              </div>
            </div>
          </div>
          
          {/* 右侧区域（占1列） */}
          <div className="space-y-6 lg:col-span-1">
            {/* 系统监控 */}
            <div className="dark:bg-dark-bg-secondary bg-white rounded-xl p-6 shadow-md">
              <SystemMonitorGrid />
            </div>
            
            {/* ComfyUI状态 */}
            <div className="dark:bg-dark-bg-secondary bg-white rounded-xl p-6 shadow-md">
              <h3 className="dark:text-dark-text-primary text-gray-800 mb-4 text-lg font-semibold">
                ComfyUI 状态
              </h3>
              <div className="dark:bg-dark-bg-primary bg-gray-100 flex h-32 items-center justify-center rounded-lg">
                <p className="dark:text-dark-text-secondary text-gray-500">
                  ComfyUI状态区域（占位）
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 默认导出所有示例
 */
export default {
  BasicExample,
  CustomStyleExample,
  CardLayoutExample,
  ResponsiveExample,
  MultipleInstancesExample,
  IntegrationExample,
}
