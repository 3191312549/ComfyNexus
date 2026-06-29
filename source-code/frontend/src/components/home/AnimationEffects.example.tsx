/**
 * 动画效果示例
 * 展示首页所有动画效果的实现
 */

import { useState } from 'react'
import { Cpu } from 'lucide-react'
import { MonitorCard } from './MonitorCard'
import { ComfyUIStatusCard } from './ComfyUIStatusCard'
import { FolderShortcutCard } from './FolderShortcutCard'
import { CreatorCard } from './CreatorCard'
import { Button } from '@/components/ui/Button'
import type { FolderShortcut, Creator } from '@/types/home'

export default function AnimationEffectsExample() {
  const [cpuValue, setCpuValue] = useState(75)
  const [isAnimating, setIsAnimating] = useState(false)

  // 模拟数据变化动画
  const handleAnimate = () => {
    setIsAnimating(true)
    let value = 0
    const interval = setInterval(() => {
      value += 5
      setCpuValue(value)
      if (value >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          setCpuValue(75)
          setIsAnimating(false)
        }, 500)
      }
    }, 50)
  }

  const mockShortcut: FolderShortcut = {
    id: '1',
    name: '输入文件夹',
    path: '/path/to/input',
    icon: 'Folder',
    order: 0,
    isDefault: true,
  }

  const mockCreator: Creator = {
    id: 1,
    name: '诶-阿伟哥',
    avatar: '/avatars/weige.jpg',
    description: 'ComfyUI最好用的提示词插件作者',
    link: 'https://space.bilibili.com/520680644',
    platform: 'bilibili',
  }

  return (
    <div className="dark:bg-dark-primary bg-gray-50 min-h-screen space-y-8 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* 标题 */}
        <div>
          <h1 className="dark:text-dark-text-primary text-gray-900 mb-2 text-3xl font-bold">
            动画效果示例
          </h1>
          <p className="dark:text-dark-text-secondary text-gray-600">
            展示首页所有动画效果的实现
          </p>
        </div>

        {/* 1. 过渡动画 */}
        <section className="space-y-4">
          <h2 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
            1. 过渡动画
          </h2>
          <p className="dark:text-dark-text-secondary text-gray-600">
            所有组件使用统一的过渡时长：300ms
          </p>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MonitorCard
              label={t("common.label.cpuUsage")}
              value={cpuValue}
              unit="%"
              color="green"
              icon={Cpu}
            />
            <MonitorCard
              label={t("common.label.memory")}
              value={85}
              unit="%"
              color="blue"
              icon={Cpu}
            />
            <MonitorCard
              label={t("common.label.gpuTemp")}
              value={72}
              unit="°C"
              color="orange"
              icon={Cpu}
            />
          </div>
          
          <Button
            onClick={handleAnimate}
            disabled={isAnimating}
          >
            {isAnimating ? '动画中...' : '演示进度条动画'}
          </Button>
        </section>

        {/* 2. 悬停效果 */}
        <section className="space-y-4">
          <h2 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
            2. 悬停效果
          </h2>
          <p className="dark:text-dark-text-secondary text-gray-600">
            鼠标悬停时，卡片会显示阴影增强和边框高亮效果
          </p>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h3 className="dark:text-dark-text-primary text-gray-900 mb-2 text-lg font-semibold">
                监控卡片悬停
              </h3>
              <MonitorCard
                label="VRAM"
                value={65}
                unit="%"
                color="purple"
                icon={Cpu}
              />
            </div>
            
            <div>
              <h3 className="dark:text-dark-text-primary text-gray-900 mb-2 text-lg font-semibold">
                状态卡片悬停
              </h3>
              <ComfyUIStatusCard />
            </div>
          </div>
        </section>

        {/* 3. 拖拽效果 */}
        <section className="space-y-4">
          <h2 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
            3. 拖拽效果
          </h2>
          <p className="dark:text-dark-text-secondary text-gray-600">
            拖拽文件夹卡片时，会显示透明度降低和缩小效果
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <FolderShortcutCard shortcut={mockShortcut} />
            <FolderShortcutCard
              shortcut={{ ...mockShortcut, id: '2', name: '输出文件夹' }}
            />
            <FolderShortcutCard
              shortcut={{ ...mockShortcut, id: '3', name: '模型文件夹' }}
            />
          </div>
          
          <div className="border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20 rounded-lg border-2 border-dashed p-4">
            <p className="dark:text-dark-text-secondary text-gray-600 text-sm">
              💡 提示：拖拽文件夹卡片时，拖放区域会显示虚线边框和背景色变化
            </p>
          </div>
        </section>

        {/* 4. 状态指示器动画 */}
        <section className="space-y-4">
          <h2 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
            4. 状态指示器动画
          </h2>
          <p className="dark:text-dark-text-secondary text-gray-600">
            运行状态指示器使用脉冲动画（animate-pulse）
          </p>
          
          <div className="dark:bg-dark-secondary bg-white flex items-center gap-4 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="bg-green-500 size-3 animate-pulse rounded-full" />
              <span className="dark:text-dark-text-primary text-gray-900 text-sm font-medium">
                运行中（脉冲动画）
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-gray-400 dark:bg-gray-600 size-3 rounded-full" />
              <span className="dark:text-dark-text-primary text-gray-900 text-sm font-medium">
                已停止（无动画）
              </span>
            </div>
          </div>
        </section>

        {/* 5. 创作者卡片动画 */}
        <section className="space-y-4">
          <h2 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
            5. 创作者卡片动画
          </h2>
          <p className="dark:text-dark-text-secondary text-gray-600">
            悬停时背景色变化，头像环和名称高亮
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <CreatorCard creator={mockCreator} />
            <CreatorCard
              creator={{ ...mockCreator, id: 2, name: '创作者 2' }}
            />
            <CreatorCard
              creator={{ ...mockCreator, id: 3, name: '创作者 3' }}
            />
          </div>
        </section>

        {/* 6. 按钮动画 */}
        <section className="space-y-4">
          <h2 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
            6. 按钮动画
          </h2>
          <p className="dark:text-dark-text-secondary text-gray-600">
            按钮悬停时颜色平滑过渡
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Button variant="default">默认按钮</Button>
            <Button variant="outline">轮廓按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>
            <Button variant="destructive">危险按钮</Button>
          </div>
        </section>

        {/* 7. 加载动画 */}
        <section className="space-y-4">
          <h2 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
            7. 加载动画
          </h2>
          <p className="dark:text-dark-text-secondary text-gray-600">
            使用旋转动画（animate-spin）显示加载状态
          </p>
          
          <div className="dark:bg-dark-secondary bg-white flex items-center gap-4 rounded-lg p-4">
            <div className="border-blue-500 size-8 animate-spin rounded-full border-b-2" />
            <span className="dark:text-dark-text-secondary text-gray-600 text-sm">
              加载中...
            </span>
          </div>
        </section>

        {/* 动画规范总结 */}
        <section className="space-y-4">
          <h2 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
            动画规范总结
          </h2>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="dark:bg-dark-secondary bg-white rounded-lg p-4">
              <h3 className="dark:text-dark-text-primary text-gray-900 mb-2 font-semibold">
                过渡时长
              </h3>
              <ul className="dark:text-dark-text-secondary text-gray-600 space-y-1 text-sm">
                <li>• 默认：300ms (duration-300)</li>
                <li>• 快速：150ms (duration-150)</li>
                <li>• 慢速：500ms (duration-500)</li>
              </ul>
            </div>
            
            <div className="dark:bg-dark-secondary bg-white rounded-lg p-4">
              <h3 className="dark:text-dark-text-primary text-gray-900 mb-2 font-semibold">
                动画类型
              </h3>
              <ul className="dark:text-dark-text-secondary text-gray-600 space-y-1 text-sm">
                <li>• transition-all: 所有属性过渡</li>
                <li>• transition-colors: 颜色过渡</li>
                <li>• animate-pulse: 脉冲动画</li>
                <li>• animate-spin: 旋转动画</li>
              </ul>
            </div>
            
            <div className="dark:bg-dark-secondary bg-white rounded-lg p-4">
              <h3 className="dark:text-dark-text-primary text-gray-900 mb-2 font-semibold">
                悬停效果
              </h3>
              <ul className="dark:text-dark-text-secondary text-gray-600 space-y-1 text-sm">
                <li>• hover:shadow-lg: 阴影增强</li>
                <li>• hover:border-blue-300: 边框高亮</li>
                <li>• hover:bg-gray-50: 背景色变化</li>
              </ul>
            </div>
            
            <div className="dark:bg-dark-secondary bg-white rounded-lg p-4">
              <h3 className="dark:text-dark-text-primary text-gray-900 mb-2 font-semibold">
                拖拽效果
              </h3>
              <ul className="dark:text-dark-text-secondary text-gray-600 space-y-1 text-sm">
                <li>• opacity-50: 透明度降低</li>
                <li>• scale-95: 缩小</li>
                <li>• border-dashed: 虚线边框</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
