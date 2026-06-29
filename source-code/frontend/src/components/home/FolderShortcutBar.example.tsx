/**
 * FolderShortcutBar 组件示例
 * 
 * 展示 FolderShortcutBar 组件的各种用法
 */

import { FolderShortcutBar } from './FolderShortcutBar'

/**
 * FolderShortcutBar 示例组件
 */
export default function FolderShortcutBarExample() {
  return (
    <div className="mx-auto max-w-7xl space-y-12 p-8">
      {/* 标题 */}
      <div>
        <h1 className="mb-2 text-3xl font-bold">FolderShortcutBar 组件示例</h1>
        <p className="text-muted-foreground">
          文件夹快捷方式横栏组件，支持拖拽排序和路径同步
        </p>
      </div>

      {/* 基础用法 */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-2 text-2xl font-bold">基础用法</h2>
          <p className="mb-4 text-muted-foreground">
            默认展示文件夹快捷方式，支持拖拽调整顺序
          </p>
        </div>
        <div className="dark:bg-dark-bg-secondary bg-white rounded-lg border p-6">
          <FolderShortcutBar />
        </div>
      </section>

      {/* 自定义样式 */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-2 text-2xl font-bold">自定义样式</h2>
          <p className="mb-4 text-muted-foreground">
            可以通过 className 属性自定义容器样式
          </p>
        </div>
        <div className="dark:bg-dark-bg-secondary bg-white rounded-lg border p-6">
          <FolderShortcutBar className="dark:bg-dark-bg-tertiary bg-gray-50 rounded-lg p-6" />
        </div>
      </section>

      {/* 功能说明 */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-2 text-2xl font-bold">功能说明</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 mt-1.5 size-2 rounded-full" />
              <div>
                <p className="font-medium">拖拽排序</p>
                <p className="text-muted-foreground">
                  可以通过拖拽调整文件夹快捷方式的显示顺序，拖拽结束后自动保存
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 mt-1.5 size-2 rounded-full" />
              <div>
                <p className="font-medium">路径同步</p>
                <p className="text-muted-foreground">
                  监听环境配置变化，自动同步默认文件夹（输入、输出、模型）的路径
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 mt-1.5 size-2 rounded-full" />
              <div>
                <p className="font-medium">设置入口</p>
                <p className="text-muted-foreground">
                  点击右上角的设置按钮可以打开文件夹设置弹窗（需要集成 FolderSettingsModal 组件）
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 mt-1.5 size-2 rounded-full" />
              <div>
                <p className="font-medium">响应式布局</p>
                <p className="text-muted-foreground">
                  自动适配不同屏幕尺寸：小屏 3 列、中屏 4 列、大屏 6 列
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 mt-1.5 size-2 rounded-full" />
              <div>
                <p className="font-medium">状态处理</p>
                <p className="text-muted-foreground">
                  支持加载状态、错误状态和空状态的友好展示
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 使用说明 */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-2 text-2xl font-bold">使用说明</h2>
          <div className="dark:bg-dark-bg-tertiary bg-gray-50 space-y-4 rounded-lg p-6">
            <div>
              <h3 className="mb-2 font-medium">基础用法</h3>
              <pre className="dark:bg-dark-bg-secondary bg-white overflow-x-auto rounded border p-4 text-xs">
{`import { FolderShortcutBar } from '@/components/home/FolderShortcutBar'

function HomePage() {
  return (
    <div>
      <FolderShortcutBar />
    </div>
  )
}`}
              </pre>
            </div>
            
            <div>
              <h3 className="mb-2 font-medium">自定义样式</h3>
              <pre className="dark:bg-dark-bg-secondary bg-white overflow-x-auto rounded border p-4 text-xs">
{`import { FolderShortcutBar } from '@/components/home/FolderShortcutBar'

function HomePage() {
  return (
    <div>
      <FolderShortcutBar className="bg-gray-50 p-6 rounded-lg" />
    </div>
  )
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Props 说明 */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-2 text-2xl font-bold">Props</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="dark:bg-dark-bg-tertiary bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-medium">属性</th>
                  <th className="p-3 text-left font-medium">类型</th>
                  <th className="p-3 text-left font-medium">默认值</th>
                  <th className="p-3 text-left font-medium">说明</th>
                </tr>
              </thead>
              <tbody className="dark:divide-dark-border divide-y">
                <tr>
                  <td className="p-3 font-mono text-xs">className</td>
                  <td className="p-3 font-mono text-xs">string</td>
                  <td className="p-3 font-mono text-xs">-</td>
                  <td className="p-3">可选的自定义样式类名</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 依赖说明 */}
      <section className="space-y-4">
        <div>
          <h2 className="mb-2 text-2xl font-bold">依赖</h2>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">该组件依赖以下模块：</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li><code className="dark:bg-dark-bg-tertiary bg-gray-100 rounded px-1.5 py-0.5 text-xs">useFolderShortcutStore</code> - 文件夹快捷方式状态管理</li>
              <li><code className="dark:bg-dark-bg-tertiary bg-gray-100 rounded px-1.5 py-0.5 text-xs">useEnvStore</code> - 环境配置状态管理</li>
              <li><code className="dark:bg-dark-bg-tertiary bg-gray-100 rounded px-1.5 py-0.5 text-xs">FolderShortcutCard</code> - 文件夹快捷方式卡片组件</li>
              <li><code className="dark:bg-dark-bg-tertiary bg-gray-100 rounded px-1.5 py-0.5 text-xs">@dnd-kit/core</code> - 拖拽功能库</li>
              <li><code className="dark:bg-dark-bg-tertiary bg-gray-100 rounded px-1.5 py-0.5 text-xs">@dnd-kit/sortable</code> - 排序功能库</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
