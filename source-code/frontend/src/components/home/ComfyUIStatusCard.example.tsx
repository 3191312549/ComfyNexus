/**
 * ComfyUIStatusCard 组件使用示例
 * 
 * 本文件展示了 ComfyUIStatusCard 组件的各种使用场景
 */

import React from 'react'
import { ComfyUIStatusCard } from './ComfyUIStatusCard'

/**
 * 示例 1: 基本使用
 * 
 * 最简单的使用方式，组件会自动从 useProcessStore 获取状态
 */
export const BasicExample: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">基本使用</h2>
      <ComfyUIStatusCard />
    </div>
  )
}

/**
 * 示例 2: 自定义样式
 * 
 * 通过 className 属性添加自定义样式
 */
export const CustomStyleExample: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">自定义样式</h2>
      <ComfyUIStatusCard className="mx-auto max-w-md shadow-xl" />
    </div>
  )
}

/**
 * 示例 3: 网格布局
 * 
 * 在网格布局中使用多个卡片
 */
export const GridLayoutExample: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">网格布局</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ComfyUIStatusCard />
        {/* 其他卡片组件 */}
      </div>
    </div>
  )
}

/**
 * 示例 4: 响应式布局
 * 
 * 在不同屏幕尺寸下的布局
 */
export const ResponsiveLayoutExample: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">响应式布局</h2>
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ComfyUIStatusCard />
        </div>
      </div>
    </div>
  )
}

/**
 * 示例 5: 深色主题
 * 
 * 在深色主题下的显示效果
 */
export const DarkThemeExample: React.FC = () => {
  return (
    <div className="bg-gray-900 min-h-screen p-4">
      <h2 className="text-white mb-4 text-xl font-bold">深色主题</h2>
      <div className="dark">
        <ComfyUIStatusCard />
      </div>
    </div>
  )
}

/**
 * 示例 6: 完整页面集成
 * 
 * 在完整页面中集成 ComfyUIStatusCard
 */
export const FullPageExample: React.FC = () => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-gray-900 dark:text-white mb-6 text-3xl font-bold">
          ComfyUI 管理面板
        </h1>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ComfyUI 状态卡片 */}
          <ComfyUIStatusCard />
          
          {/* 其他卡片可以放在这里 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h2 className="text-gray-900 dark:text-white mb-4 text-xl font-semibold">
                其他内容区域
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                这里可以放置其他组件和内容
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 示例 7: 状态说明
 * 
 * 展示不同状态下的组件表现
 */
export const StatusExplanationExample: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <h2 className="mb-4 text-xl font-bold">状态说明</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 font-semibold">运行中状态</h3>
          <ul className="text-gray-600 dark:text-gray-400 mb-2 list-inside list-disc text-sm">
            <li>显示绿色脉冲指示器</li>
            <li>显示"运行中"文本</li>
            <li>显示端口号和运行时长</li>
            <li>按钮显示"打开 ComfyUI"</li>
          </ul>
          <ComfyUIStatusCard />
        </div>
        
        <div>
          <h3 className="mb-2 font-semibold">已停止状态</h3>
          <ul className="text-gray-600 dark:text-gray-400 mb-2 list-inside list-disc text-sm">
            <li>显示灰色静态指示器</li>
            <li>显示"已停止"文本</li>
            <li>不显示运行信息</li>
            <li>按钮显示"启动 ComfyUI"</li>
          </ul>
          <ComfyUIStatusCard />
        </div>
      </div>
    </div>
  )
}

/**
 * 默认导出：所有示例的集合
 */
export default function ComfyUIStatusCardExamples() {
  return (
    <div className="space-y-8">
      <BasicExample />
      <CustomStyleExample />
      <GridLayoutExample />
      <ResponsiveLayoutExample />
      <DarkThemeExample />
      <FullPageExample />
      <StatusExplanationExample />
    </div>
  )
}
