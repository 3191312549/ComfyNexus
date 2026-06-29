/**
 * CreatorCard 组件使用示例
 * 用于开发和测试 CreatorCard 组件
 */

import { CreatorCard } from './CreatorCard'
import { Creator } from '@/types/home'

/**
 * 示例创作者数据
 */
const exampleCreators: Creator[] = [
  {
    id: 1,
    name: '诶-阿伟哥',
    avatar: '/avatars/weige.jpg',
    description: 'ComfyUI最好用的提示词插件作者',
    link: 'https://space.bilibili.com/520680644',
    platform: 'bilibili'
  },
  {
    id: 2,
    name: 'Olivio Sarikas',
    avatar: '/avatars/olivio.jpg',
    description: 'ComfyUI 教程大师，YouTube 百万订阅',
    link: 'https://www.youtube.com/@OlivioSarikas',
    platform: 'youtube'
  },
  {
    id: 3,
    name: 'comfyanonymous',
    avatar: '/avatars/comfy.jpg',
    description: 'ComfyUI 核心开发者',
    link: 'https://github.com/comfyanonymous',
    platform: 'github'
  },
  {
    id: 4,
    name: 'ComfyUI 官网',
    avatar: '/avatars/official.jpg',
    description: 'ComfyUI 官方网站和文档',
    link: 'https://www.comfy.org',
    platform: 'web'
  },
  {
    id: 5,
    name: '测试长文本',
    avatar: '/avatars/test.jpg',
    description: '这是一个非常非常非常非常非常非常非常非常非常非常长的描述文本，用于测试文本截断功能是否正常工作，应该被限制在两行内显示',
    link: 'https://example.com',
    platform: 'web'
  },
  {
    id: 6,
    name: '未知平台测试',
    avatar: '/avatars/unknown.jpg',
    description: '测试未知平台是否显示默认图标',
    link: 'https://example.com',
    platform: 'unknown'
  }
]

/**
 * CreatorCard 示例组件
 * 展示不同场景下的 CreatorCard 使用
 */
export const CreatorCardExample: React.FC = () => {
  return (
    <div className="dark:bg-dark-background bg-gray-50 min-h-screen space-y-8 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="dark:text-dark-text-primary text-gray-900 mb-2 text-3xl font-bold">
          CreatorCard 组件示例
        </h1>
        <p className="dark:text-dark-text-secondary text-gray-600 mb-8">
          展示不同平台和场景下的创作者卡片
        </p>

        {/* 单个卡片示例 */}
        <section className="mb-12">
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-2xl font-semibold">
            单个卡片
          </h2>
          <div className="dark:bg-dark-surface bg-white max-w-xs rounded-lg p-6 shadow-sm">
            <CreatorCard creator={exampleCreators[0]} />
          </div>
        </section>

        {/* 网格布局示例 (3列) */}
        <section className="mb-12">
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-2xl font-semibold">
            网格布局 (3列)
          </h2>
          <div className="dark:bg-dark-surface bg-white rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-4">
              {exampleCreators.slice(0, 3).map(creator => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </div>
          </div>
        </section>

        {/* 所有平台示例 */}
        <section className="mb-12">
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-2xl font-semibold">
            所有平台图标
          </h2>
          <div className="dark:bg-dark-surface bg-white rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {exampleCreators.map(creator => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </div>
          </div>
        </section>

        {/* 响应式布局示例 */}
        <section className="mb-12">
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-2xl font-semibold">
            响应式布局
          </h2>
          <p className="dark:text-dark-text-secondary text-gray-600 mb-4 text-sm">
            调整浏览器窗口大小查看响应式效果
          </p>
          <div className="dark:bg-dark-surface bg-white rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {exampleCreators.map(creator => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </div>
          </div>
        </section>

        {/* 交互说明 */}
        <section className="mb-12">
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-2xl font-semibold">
            交互说明
          </h2>
          <div className="dark:bg-dark-surface bg-white rounded-lg p-6 shadow-sm">
            <ul className="dark:text-dark-text-secondary text-gray-700 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>悬停卡片时，背景色会变化</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>悬停时，创作者名称会变为蓝色</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>悬停时，头像边框会变为蓝色</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>点击卡片会在新窗口打开创作者主页</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>支持深色主题切换</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>长描述文本会自动截断为2行</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 平台图标说明 */}
        <section>
          <h2 className="dark:text-dark-text-primary text-gray-800 mb-4 text-2xl font-semibold">
            平台图标映射
          </h2>
          <div className="dark:bg-dark-surface bg-white rounded-lg p-6 shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="dark:border-dark-border border-b">
                  <th className="dark:text-dark-text-primary text-gray-700 pb-2">平台</th>
                  <th className="dark:text-dark-text-primary text-gray-700 pb-2">图标</th>
                  <th className="dark:text-dark-text-primary text-gray-700 pb-2">说明</th>
                </tr>
              </thead>
              <tbody className="dark:text-dark-text-secondary text-gray-600">
                <tr className="dark:border-dark-border border-b">
                  <td className="py-2">bilibili</td>
                  <td className="py-2">Video</td>
                  <td className="py-2">B站创作者</td>
                </tr>
                <tr className="dark:border-dark-border border-b">
                  <td className="py-2">youtube</td>
                  <td className="py-2">Youtube</td>
                  <td className="py-2">YouTube 创作者</td>
                </tr>
                <tr className="dark:border-dark-border border-b">
                  <td className="py-2">github</td>
                  <td className="py-2">Github</td>
                  <td className="py-2">GitHub 开发者</td>
                </tr>
                <tr className="dark:border-dark-border border-b">
                  <td className="py-2">web</td>
                  <td className="py-2">Globe</td>
                  <td className="py-2">网站/其他平台</td>
                </tr>
                <tr>
                  <td className="py-2">其他</td>
                  <td className="py-2">Globe (默认)</td>
                  <td className="py-2">未知平台使用默认图标</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CreatorCardExample
