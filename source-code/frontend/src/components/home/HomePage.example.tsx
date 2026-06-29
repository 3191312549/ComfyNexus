/**
 * HomePage 组件使用示例
 * 
 * 本文件展示了 HomePage 组件的各种使用场景
 */

import React from 'react'
import { HomePage } from './HomePage'
import { Button } from '@/components/ui/Button'

/**
 * 示例 1: 基础使用
 * 
 * HomePage 是首页的主容器组件，不需要传入任何 props
 * 它会自动加载所有必要的数据并渲染子组件
 */
export const BasicExample: React.FC = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen">
      <HomePage />
    </div>
  )
}

/**
 * 示例 2: 自定义样式
 * 
 * 可以通过 className 属性添加自定义样式
 */
export const CustomStyleExample: React.FC = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen">
      <HomePage className="custom-home-page" />
    </div>
  )
}

/**
 * 示例 3: 在路由中使用
 * 
 * HomePage 通常作为路由的一个页面组件使用
 */
export const RouterExample: React.FC = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen">
      <HomePage />
    </div>
  )
}

/**
 * 示例 4: 响应式布局演示
 * 
 * HomePage 支持响应式布局：
 * - 大屏（≥1024px）：左右分栏布局（创作者推荐 2/3 + 监控状态 1/3）
 * - 小屏（<1024px）：单列布局，垂直排列
 * 
 * 可以通过调整浏览器窗口大小来查看效果
 */
export const ResponsiveExample: React.FC = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen">
      <div className="bg-blue-50 dark:bg-blue-900 mb-4 p-4 text-center">
        <p className="text-blue-900 dark:text-blue-100 text-sm">
          💡 提示：调整浏览器窗口大小查看响应式布局效果
        </p>
      </div>
      <HomePage />
    </div>
  )
}

/**
 * 示例 5: 深色主题演示
 * 
 * HomePage 完全支持深色主题
 * 通过在父元素添加 'dark' 类来启用深色模式
 */
export const DarkThemeExample: React.FC = () => {
  const [isDark, setIsDark] = React.useState(false)

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen">
        {/* 主题切换按钮 */}
        <div className="fixed left-4 top-4 z-50">
          <Button
            onClick={() => setIsDark(!isDark)}
            variant="outline"
          >
            {isDark ? '🌞 切换到亮色' : '🌙 切换到深色'}
          </Button>
        </div>

        <HomePage />
      </div>
    </div>
  )
}

/**
 * 示例 6: 加载状态演示
 * 
 * HomePage 在加载数据时会在右上角显示加载指示器
 * 这个示例展示了加载状态的视觉效果
 */
export const LoadingStateExample: React.FC = () => {
  return (
    <div className="dark:bg-dark-bg-primary bg-gray-50 min-h-screen">
      <div className="bg-yellow-50 dark:bg-yellow-900 mb-4 p-4 text-center">
        <p className="text-yellow-900 dark:text-yellow-100 text-sm">
          ℹ️ 页面首次加载时，右上角会显示加载指示器
        </p>
      </div>
      <HomePage />
    </div>
  )
}

/**
 * 默认导出：所有示例的集合
 */
export default function HomePageExamples() {
  const [currentExample, setCurrentExample] = React.useState<string>('basic')

  const examples = [
    { id: 'basic', name: '基础使用', component: BasicExample },
    { id: 'custom', name: '自定义样式', component: CustomStyleExample },
    { id: 'router', name: '路由使用', component: RouterExample },
    { id: 'responsive', name: '响应式布局', component: ResponsiveExample },
    { id: 'dark', name: '深色主题', component: DarkThemeExample },
    { id: 'loading', name: '加载状态', component: LoadingStateExample },
  ]

  const CurrentComponent = examples.find(e => e.id === currentExample)?.component || BasicExample

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* 示例选择器 */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto p-4">
          <h1 className="mb-4 text-2xl font-bold">HomePage 组件示例</h1>
          <div className="flex flex-wrap gap-2">
            {examples.map(example => (
              <Button
                key={example.id}
                onClick={() => setCurrentExample(example.id)}
                variant={currentExample === example.id ? 'default' : 'secondary'}
                size="sm"
              >
                {example.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 示例内容 */}
      <div className="container mx-auto p-4">
        <CurrentComponent />
      </div>
    </div>
  )
}
