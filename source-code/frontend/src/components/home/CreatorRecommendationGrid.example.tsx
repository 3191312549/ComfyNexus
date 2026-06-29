/**
 * CreatorRecommendationGrid 组件使用示例
 */

import { CreatorRecommendationGrid } from './CreatorRecommendationGrid'

/**
 * 基本使用示例
 */
export const BasicExample = () => {
  return (
    <div className="dark:bg-dark-background bg-gray-50 min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="dark:text-dark-text-primary text-gray-900 mb-6 text-2xl font-bold">
          CreatorRecommendationGrid 组件示例
        </h1>
        
        {/* 基本使用 */}
        <section className="mb-8">
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-xl font-semibold">
            基本使用
          </h2>
          <CreatorRecommendationGrid />
        </section>

        {/* 自定义样式 */}
        <section className="mb-8">
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-xl font-semibold">
            自定义样式
          </h2>
          <CreatorRecommendationGrid className="shadow-lg" />
        </section>

        {/* 在容器中使用 */}
        <section className="mb-8">
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-xl font-semibold">
            在容器中使用
          </h2>
          <div className="mx-auto max-w-4xl">
            <CreatorRecommendationGrid />
          </div>
        </section>
      </div>
    </div>
  )
}

/**
 * 响应式布局示例
 */
export const ResponsiveExample = () => {
  return (
    <div className="dark:bg-dark-background bg-gray-50 min-h-screen p-8">
      <div className="space-y-8">
        <h1 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
          响应式布局示例
        </h1>
        
        {/* 超小屏模拟 (< 640px) */}
        <section>
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-xl font-semibold">
            超小屏 (&lt; 640px) - 1列布局
          </h2>
          <div className="max-w-sm">
            <CreatorRecommendationGrid />
          </div>
        </section>

        {/* 小屏模拟 (640px - 1023px) */}
        <section>
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-xl font-semibold">
            小屏 (640px - 1023px) - 2列布局
          </h2>
          <div className="max-w-2xl">
            <CreatorRecommendationGrid />
          </div>
        </section>

        {/* 大屏 (>= 1024px) */}
        <section>
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-xl font-semibold">
            大屏 (&gt;= 1024px) - 3列布局
          </h2>
          <div className="max-w-6xl">
            <CreatorRecommendationGrid />
          </div>
        </section>
      </div>
    </div>
  )
}

/**
 * 深色主题示例
 */
export const DarkThemeExample = () => {
  return (
    <div className="dark">
      <div className="bg-dark-background min-h-screen p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-dark-text-primary mb-6 text-2xl font-bold">
            深色主题示例
          </h1>
          
          <CreatorRecommendationGrid />
        </div>
      </div>
    </div>
  )
}

/**
 * 完整页面集成示例
 */
export const FullPageExample = () => {
  return (
    <div className="dark:bg-dark-background bg-gray-50 min-h-screen">
      {/* 页面头部 */}
      <header className="dark:bg-dark-secondary bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="dark:text-dark-text-primary text-gray-900 text-3xl font-bold">
            ComfyUI 启动器
          </h1>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-8">
          {/* 其他内容区域 */}
          <section className="dark:bg-dark-secondary bg-white rounded-lg p-6 shadow">
            <h2 className="dark:text-dark-text-primary text-gray-900 mb-4 text-xl font-semibold">
              系统状态
            </h2>
            <p className="dark:text-dark-text-secondary text-gray-600">
              ComfyUI 运行正常
            </p>
          </section>

          {/* 创作者推荐区域 */}
          <CreatorRecommendationGrid />

          {/* 其他内容区域 */}
          <section className="dark:bg-dark-secondary bg-white rounded-lg p-6 shadow">
            <h2 className="dark:text-dark-text-primary text-gray-900 mb-4 text-xl font-semibold">
              快速操作
            </h2>
            <p className="dark:text-dark-text-secondary text-gray-600">
              启动 ComfyUI、打开工作流等
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default BasicExample
