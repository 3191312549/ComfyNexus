/**
 * FolderShortcutCard 组件使用示例
 */

import { FolderShortcutCard } from './FolderShortcutCard'
import type { FolderShortcut } from '@/types/home'

export const FolderShortcutCardExample = () => {
  // 示例数据
  const shortcuts: FolderShortcut[] = [
    {
      id: 'input',
      name: '输入',
      path: 'C:/ComfyUI/input',
      icon: 'FolderInput',
      order: 0,
      isDefault: true,
    },
    {
      id: 'output',
      name: '输出',
      path: 'C:/ComfyUI/output',
      icon: 'FolderOutput',
      order: 1,
      isDefault: true,
    },
    {
      id: 'models',
      name: '模型',
      path: 'C:/ComfyUI/models',
      icon: 'FolderCog',
      order: 2,
      isDefault: true,
    },
    {
      id: 'custom',
      name: '自定义',
      path: 'D:/MyFolder',
      icon: 'Folder',
      order: 3,
      isDefault: false,
    },
    {
      id: 'empty',
      name: '未设置',
      path: '',
      icon: 'Folder',
      order: 4,
      isDefault: false,
    },
  ]

  return (
    <div className="dark:bg-dark-primary bg-gray-50 min-h-screen space-y-6 p-8">
      <h1 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
        FolderShortcutCard 组件示例
      </h1>

      {/* 基础使用 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-secondary text-gray-800 text-xl font-semibold">
          1. 基础使用
        </h2>
        <p className="dark:text-dark-text-tertiary text-gray-600 text-sm">
          展示默认文件夹快捷方式（输入、输出、模型）
        </p>
        <div className="grid grid-cols-6 gap-4">
          {shortcuts.slice(0, 3).map(shortcut => (
            <FolderShortcutCard key={shortcut.id} shortcut={shortcut} />
          ))}
        </div>
      </section>

      {/* 禁用状态 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-secondary text-gray-800 text-xl font-semibold">
          2. 禁用状态（路径为空）
        </h2>
        <p className="dark:text-dark-text-tertiary text-gray-600 text-sm">
          当文件夹路径为空时，卡片显示为禁用状态（半透明，不可点击）
        </p>
        <div className="grid grid-cols-6 gap-4">
          <FolderShortcutCard shortcut={shortcuts[4]} />
        </div>
      </section>

      {/* 不同图标 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-secondary text-gray-800 text-xl font-semibold">
          3. 不同图标
        </h2>
        <p className="dark:text-dark-text-tertiary text-gray-600 text-sm">
          支持多种图标类型：FolderInput（输入）、FolderOutput（输出）、FolderCog（配置）、Folder（通用）
        </p>
        <div className="grid grid-cols-6 gap-4">
          {shortcuts.map(shortcut => (
            <FolderShortcutCard key={shortcut.id} shortcut={shortcut} />
          ))}
        </div>
      </section>

      {/* 交互说明 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-secondary text-gray-800 text-xl font-semibold">
          4. 交互说明
        </h2>
        <div className="dark:bg-dark-secondary bg-white space-y-2 rounded-lg p-4">
          <p className="dark:text-dark-text-primary text-gray-700 text-sm">
            <strong>点击卡片：</strong>在文件管理器中打开对应文件夹
          </p>
          <p className="dark:text-dark-text-primary text-gray-700 text-sm">
            <strong>拖拽卡片：</strong>调整文件夹快捷方式的显示顺序（需要在 DndContext 中使用）
          </p>
          <p className="dark:text-dark-text-primary text-gray-700 text-sm">
            <strong>悬停效果：</strong>卡片阴影加深，边框变为蓝色
          </p>
          <p className="dark:text-dark-text-primary text-gray-700 text-sm">
            <strong>禁用状态：</strong>路径为空时，卡片半透明且不可点击
          </p>
        </div>
      </section>

      {/* 深色模式对比 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-secondary text-gray-800 text-xl font-semibold">
          5. 深色模式支持
        </h2>
        <p className="dark:text-dark-text-tertiary text-gray-600 text-sm">
          组件完全支持深色模式，自动适配主题颜色
        </p>
        <div className="grid grid-cols-2 gap-6">
          {/* 亮色模式示例 */}
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-700 mb-3 text-sm font-medium">亮色模式</p>
            <div className="grid grid-cols-3 gap-3">
              {shortcuts.slice(0, 3).map(shortcut => (
                <FolderShortcutCard key={shortcut.id} shortcut={shortcut} />
              ))}
            </div>
          </div>
          
          {/* 深色模式示例 */}
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-300 mb-3 text-sm font-medium">深色模式</p>
            <div className="grid grid-cols-3 gap-3">
              {shortcuts.slice(0, 3).map(shortcut => (
                <FolderShortcutCard key={shortcut.id} shortcut={shortcut} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 使用代码示例 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-secondary text-gray-800 text-xl font-semibold">
          6. 代码示例
        </h2>
        <div className="bg-gray-900 overflow-x-auto rounded-lg p-4">
          <pre className="text-gray-100 text-sm">
            <code>{`import { FolderShortcutCard } from '@/components/home/FolderShortcutCard'

const shortcut = {
  id: 'input',
  name: '输入',
  path: 'C:/ComfyUI/input',
  icon: 'FolderInput',
  order: 0,
  isDefault: true,
}

<FolderShortcutCard shortcut={shortcut} />`}</code>
          </pre>
        </div>
      </section>
    </div>
  )
}

export default FolderShortcutCardExample
