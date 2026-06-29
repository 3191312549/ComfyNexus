/**
 * 模型管理状态管理
 */

import { create } from 'zustand'
import { mockModels, mockDownloads, type Model, type DownloadItem } from '@/mocks/model'

interface ModelStore {
  models: Model[]
  downloads: DownloadItem[]
  selectedCategory: string
  isLoading: boolean
  
  // Actions
  setModels: (models: Model[]) => void
  setDownloads: (downloads: DownloadItem[]) => void
  setSelectedCategory: (category: string) => void
  addDownload: (url: string, category: string) => void
  removeDownload: (id: string) => void
  deleteModel: (id: string) => void
  refreshModels: () => void
  refreshDownloads: () => void
}

export const useModelStore = create<ModelStore>((set) => ({
  models: mockModels,
  downloads: mockDownloads,
  selectedCategory: 'all',
  isLoading: false,

  setModels: (models) => set({ models }),
  
  setDownloads: (downloads) => set({ downloads }),
  
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  
  addDownload: (url, category) => {
    const newDownload: DownloadItem = {
      id: Date.now().toString(),
      name: url.split('/').pop() || 'unknown',
      url,
      progress: 0,
      status: 'pending',
      size: 0,
      downloadedSize: 0,
      speed: '0 MB/s',
      category
    }
    set((state) => ({
      downloads: [newDownload, ...state.downloads]
    }))
  },
  
  removeDownload: (id) => {
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== id)
    }))
  },
  
  deleteModel: (id) => {
    set((state) => ({
      models: state.models.filter((m) => m.id !== id)
    }))
  },
  
  refreshModels: () => {
    set({ isLoading: true })
    // 模拟API调用
    setTimeout(() => {
      set({ models: mockModels, isLoading: false })
    }, 500)
  },
  
  refreshDownloads: () => {
    set({ isLoading: true })
    // 模拟API调用
    setTimeout(() => {
      set({ downloads: mockDownloads, isLoading: false })
    }, 500)
  }
}))
