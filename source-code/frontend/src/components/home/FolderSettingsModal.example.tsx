/**
 * FolderSettingsModal 组件示例
 */

import { useState } from 'react'
import { FolderSettingsModal } from './FolderSettingsModal'
import { Button } from '@/components/ui/Button'
import type { FolderShortcut } from '@/types/home'

/**
 * 示例数据
 */
const exampleShortcuts: FolderShortcut[] = [
  {
    id: 'input',
    name: '输入',
    path: 'C:\\ComfyUI\\input',
    icon: 'FolderInput',
    order: 0,
    isDefault: true
  },
  {
    id: 'output',
    name: '输出',
    path: 'C:\\ComfyUI\\output',
    icon: 'FolderOutput',
    order: 1,
    isDefault: true
  },
  {
    id: 'models',
    name: '模型',
    path: 'C:\\ComfyUI\\models',
    icon: 'FolderCog',
    order: 2,
    isDefault: true
  },
  {
    id: 'custom1',
    name: '工作流',
    path: 'C:\\ComfyUI\\workflows',
    icon: 'Folder',
    order: 3,
    isDefault: false
  }
]

/**
 * 基础示例
 */
export const BasicExample = () => {
  const [open, setOpen] = useState(false)
  const [shortcuts, setShortcuts] = useState<FolderShortcut[]>(exampleShortcuts)

  const handleSave = async (updatedShortcuts: FolderShortcut[]) => {
    console.log('保存快捷方式:', updatedShortcuts)
    setShortcuts(updatedShortcuts)
    // 模拟异步保存
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return (
    <div className="p-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">FolderSettingsModal 基础示例</h2>
        <p className="text-muted-foreground">
          点击按钮打开文件夹设置弹窗
        </p>
        
        <Button onClick={() => setOpen(true)}>
          打开设置弹窗
        </Button>
        
        <div className="mt-4 rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">当前快捷方式：</h3>
          <ul className="space-y-1">
            {shortcuts.map(shortcut => (
              <li key={shortcut.id} className="text-sm">
                {shortcut.name} - {shortcut.path}
                {shortcut.isDefault && <span className="text-blue-500 ml-2">(默认)</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <FolderSettingsModal
        open={open}
        onClose={() => setOpen(false)}
        shortcuts={shortcuts}
        onSave={handleSave}
      />
    </div>
  )
}

/**
 * 空状态示例
 */
export const EmptyStateExample = () => {
  const [open, setOpen] = useState(false)
  const [shortcuts, setShortcuts] = useState<FolderShortcut[]>([])

  const handleSave = async (updatedShortcuts: FolderShortcut[]) => {
    console.log('保存快捷方式:', updatedShortcuts)
    setShortcuts(updatedShortcuts)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return (
    <div className="p-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">FolderSettingsModal 空状态示例</h2>
        <p className="text-muted-foreground">
          没有任何快捷方式时的状态
        </p>
        
        <Button onClick={() => setOpen(true)}>
          打开设置弹窗
        </Button>
      </div>

      <FolderSettingsModal
        open={open}
        onClose={() => setOpen(false)}
        shortcuts={shortcuts}
        onSave={handleSave}
      />
    </div>
  )
}

/**
 * 最大数量示例
 */
export const MaxLimitExample = () => {
  const [open, setOpen] = useState(false)
  const [shortcuts, setShortcuts] = useState<FolderShortcut[]>([
    ...exampleShortcuts,
    {
      id: 'custom2',
      name: '插件',
      path: 'C:\\ComfyUI\\plugins',
      icon: 'Folder',
      order: 4,
      isDefault: false
    },
    {
      id: 'custom3',
      name: '备份',
      path: 'C:\\ComfyUI\\backup',
      icon: 'Folder',
      order: 5,
      isDefault: false
    }
  ])

  const handleSave = async (updatedShortcuts: FolderShortcut[]) => {
    console.log('保存快捷方式:', updatedShortcuts)
    setShortcuts(updatedShortcuts)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return (
    <div className="p-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">FolderSettingsModal 最大数量示例</h2>
        <p className="text-muted-foreground">
          已达到6个快捷方式的最大限制
        </p>
        
        <Button onClick={() => setOpen(true)}>
          打开设置弹窗
        </Button>
        
        <div className="mt-4 rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">当前快捷方式数量：{shortcuts.length}/6</h3>
        </div>
      </div>

      <FolderSettingsModal
        open={open}
        onClose={() => setOpen(false)}
        shortcuts={shortcuts}
        onSave={handleSave}
      />
    </div>
  )
}

/**
 * 所有示例
 */
export default function FolderSettingsModalExamples() {
  return (
    <div className="space-y-12">
      <BasicExample />
      <EmptyStateExample />
      <MaxLimitExample />
    </div>
  )
}
