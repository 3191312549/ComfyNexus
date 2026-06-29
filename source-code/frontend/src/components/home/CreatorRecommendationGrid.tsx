/**
 * CreatorRecommendationGrid 组件
 * 展示推荐的 ComfyUI 创作者
 * 
 * 新设计：
 * - 5列布局（Bento Grid 风格）
 * - 2排共10个博主
 * - 优化间距
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Creator } from '@/types/home'
import { CreatorCard } from './CreatorCard'

/**
 * CreatorRecommendationGrid 组件属性
 */
export interface CreatorRecommendationGridProps {
  /** 自定义样式类名 */
  className?: string
}

/**
 * 推荐创作者数据
 * 使用现有首页的博主数据，去掉 Replicate 和 RunwayML
 */
const RECOMMENDED_CREATORS: Creator[] = [
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
    name: '乔巴大战Comfyui',
    avatar: '/avatars/qb.jpg',
    description: 'ComfyUI教程创作者',
    link: 'https://space.bilibili.com/522625412',
    platform: 'bilibili'
  },
  {
    id: 3,
    name: '早点睡觉',
    avatar: '/avatars/hhsj.jpg',
    description: 'ComfyUI教程创作者',
    link: 'https://space.bilibili.com/628353217',
    platform: 'bilibili'
  },
  {
    id: 4,
    name: '六斤 AIGC',
    avatar: '/avatars/z.jpg',
    description: 'AIGC视频创作者',
    link: 'https://www.douyin.com/user/MS4wLjABAAAA4WH_ahqk0gUf-kMv6VSzY4QGWX-UazlNPQYk_gVgik8Bd4_PjOXwVZxBEputZLvP',
    platform: 'douyin'
  },
  {
    id: 5,
    name: '初阳AIAgent',
    avatar: '/avatars/cy.jpg',
    description: 'AIGC视频创作者',
    link: 'https://space.bilibili.com/3546954344696042',
    platform: 'bilibili'
  },
  {
    id: 6,
    name: 'ComfyUI 官方',
    avatar: '/avatars/comfyui-official.jpg',
    description: 'ComfyUI 官方团队',
    link: 'https://github.com/comfyanonymous/ComfyUI',
    platform: 'github'
  },
  {
    id: 7,
    name: 'Civitai',
    avatar: '/avatars/civitai.jpg',
    description: 'AI 模型分享社区',
    link: 'https://civitai.com',
    platform: 'web'
  },
  {
    id: 8,
    name: 'Hugging Face',
    avatar: '/avatars/huggingface.jpg',
    description: 'AI 模型和数据集平台',
    link: 'https://huggingface.co',
    platform: 'web'
  },
  {
    id: 9,
    name: 'Midjourney',
    avatar: '/avatars/midjourney.jpg',
    description: 'AI 图像生成社区',
    link: 'https://www.midjourney.com',
    platform: 'web'
  },
  {
    id: 10,
    name: 'Leonardo.AI',
    avatar: '/avatars/leonardo.jpg',
    description: 'AI 艺术创作平台',
    link: 'https://leonardo.ai',
    platform: 'web'
  }
]

/**
 * CreatorRecommendationGrid 组件
 * 显示推荐的 ComfyUI 创作者网格（5列布局，2排）
 */
export const CreatorRecommendationGrid: React.FC<CreatorRecommendationGridProps> = ({ 
  className 
}) => {
  return (
    <div 
      className={cn(
        'grid grid-cols-5 gap-x-4 gap-y-5',
        className
      )}
    >
      {RECOMMENDED_CREATORS.map(creator => (
        <CreatorCard key={creator.id} creator={creator} />
      ))}
    </div>
  )
}

export default React.memo(CreatorRecommendationGrid)
