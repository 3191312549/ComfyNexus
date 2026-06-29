/**
 * 模型管理 Mock 数据
 */

export interface Model {
  id: string
  name: string
  path: string
  size: number
  category: string
  type: string
  createdAt: string
}

export interface DownloadItem {
  id: string
  name: string
  url: string
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  size: number
  downloadedSize: number
  speed: string
  category: string
}

export const mockModels: Model[] = [
  {
    id: '1',
    name: 'sd_xl_base_1.0.safetensors',
    path: '/models/checkpoints/sd_xl_base_1.0.safetensors',
    size: 6938078208,
    category: 'checkpoints',
    type: 'SDXL',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'sd_xl_refiner_1.0.safetensors',
    path: '/models/checkpoints/sd_xl_refiner_1.0.safetensors',
    size: 6075981930,
    category: 'checkpoints',
    type: 'SDXL',
    createdAt: '2024-01-15T11:00:00Z'
  },
  {
    id: '3',
    name: 'v1-5-pruned-emaonly.safetensors',
    path: '/models/checkpoints/v1-5-pruned-emaonly.safetensors',
    size: 4265380512,
    category: 'checkpoints',
    type: 'SD1.5',
    createdAt: '2024-01-10T09:00:00Z'
  },
  {
    id: '4',
    name: 'control_v11p_sd15_openpose.pth',
    path: '/models/controlnet/control_v11p_sd15_openpose.pth',
    size: 1445427752,
    category: 'controlnet',
    type: 'ControlNet',
    createdAt: '2024-01-12T14:20:00Z'
  },
  {
    id: '5',
    name: 'control_v11f1e_sd15_tile.pth',
    path: '/models/controlnet/control_v11f1e_sd15_tile.pth',
    size: 1445427752,
    category: 'controlnet',
    type: 'ControlNet',
    createdAt: '2024-01-12T14:30:00Z'
  }
]

export const mockDownloads: DownloadItem[] = [
  {
    id: '1',
    name: 'realisticVisionV60B1_v51VAE.safetensors',
    url: 'https://civitai.com/api/download/models/130072',
    progress: 65,
    status: 'downloading',
    size: 2132860928,
    downloadedSize: 1386359603,
    speed: '15.2 MB/s',
    category: 'checkpoints'
  },
  {
    id: '2',
    name: 'epicrealism_naturalSinRC1VAE.safetensors',
    url: 'https://civitai.com/api/download/models/143906',
    progress: 100,
    status: 'completed',
    size: 2132860928,
    downloadedSize: 2132860928,
    speed: '0 MB/s',
    category: 'checkpoints'
  },
  {
    id: '3',
    name: 'control_v11p_sd15_canny.pth',
    url: 'https://civitai.com/api/download/models/90854',
    progress: 0,
    status: 'pending',
    size: 1445427752,
    downloadedSize: 0,
    speed: '0 MB/s',
    category: 'controlnet'
  }
]

export const modelCategories = [
  { value: 'all', label: '全部' },
  { value: 'checkpoints', label: 'Checkpoints' },
  { value: 'loras', label: 'LoRA' },
  { value: 'controlnet', label: 'ControlNet' },
  { value: 'vae', label: 'VAE' },
  { value: 'embeddings', label: 'Embeddings' },
  { value: 'upscale_models', label: 'Upscale Models' }
]
