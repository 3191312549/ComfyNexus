/**
 * 文件上传状态管理
 * 
 * 负责管理文件上传的状态，包括：
 * - 文件列表管理
 * - 文件上传进度
 * - 总文件大小计算
 * - 错误状态管理
 * 
 * 验证需求: 1.3, 1.4, 4.1, 6.3
 */

import { create } from 'zustand'

/**
 * 文件类型
 */
export type FileType = 'image' | 'document'

/**
 * 文件内容类型
 */
export type FileContentType = 'base64' | 'text'

/**
 * 文件元数据接口
 */
export interface FileMetadata {
  original_name: string
  extracted_text_length?: number  // 文档提取的文本长度
  extraction_method?: string      // 提取方法（pdf/docx/xlsx/plain）
  extraction_success?: boolean    // 提取是否成功
}

/**
 * 文件接口
 */
export interface UploadedFile {
  id: string                      // UUID
  name: string                    // 文件名
  type: FileType                  // 文件类型
  mime_type: string               // MIME类型
  size: number                    // 文件大小（字节）
  content: string                 // Base64或文本内容
  content_type: FileContentType   // 内容类型
  thumbnail?: string              // 缩略图Base64（仅图片）
  metadata: FileMetadata          // 文件元数据
  uploaded_at: string             // ISO 8601时间戳
}

/**
 * 文件上传状态接口
 */
interface FileStore {
  // 状态
  files: UploadedFile[]                    // 已上传文件列表
  uploading: boolean                       // 是否正在上传
  progress: Record<string, number>         // 文件上传进度（文件ID -> 进度百分比）
  errors: Record<string, string>           // 文件错误信息（文件ID -> 错误消息）
  totalSize: number                        // 总文件大小（字节）
  
  // Actions
  addFile: (file: UploadedFile) => void
  removeFile: (fileId: string) => void
  clearFiles: () => void
  setUploading: (uploading: boolean) => void
  setProgress: (fileId: string, progress: number) => void
  setError: (fileId: string, error: string) => void
  clearError: (fileId: string) => void
  clearAllErrors: () => void
  
  // 计算属性（通过方法实现）
  getFileCount: () => number
  getTotalSize: () => number
  hasErrors: () => boolean
}

/**
 * 文件上传状态管理实现
 */
export const useFileStore = create<FileStore>((set, get) => ({
  // 初始状态
  files: [],
  uploading: false,
  progress: {},
  errors: {},
  totalSize: 0,
  
  /**
   * 添加文件到列表
   * 
   * @param file 要添加的文件
   */
  addFile: (file) => {
    set((state) => {
      const newFiles = [...state.files, file]
      const newTotalSize = newFiles.reduce((sum, f) => sum + f.size, 0)
      
      return {
        files: newFiles,
        totalSize: newTotalSize
      }
    })
  },
  
  /**
   * 从列表中移除文件
   * 
   * @param fileId 要移除的文件ID
   */
  removeFile: (fileId) => {
    set((state) => {
      const newFiles = state.files.filter(f => f.id !== fileId)
      const newTotalSize = newFiles.reduce((sum, f) => sum + f.size, 0)
      
      // 同时清除该文件的进度和错误信息
      const newProgress = { ...state.progress }
      delete newProgress[fileId]
      
      const newErrors = { ...state.errors }
      delete newErrors[fileId]
      
      return {
        files: newFiles,
        totalSize: newTotalSize,
        progress: newProgress,
        errors: newErrors
      }
    })
  },
  
  /**
   * 清空所有文件
   */
  clearFiles: () => {
    set({
      files: [],
      totalSize: 0,
      progress: {},
      errors: {},
      uploading: false
    })
  },
  
  /**
   * 设置上传状态
   * 
   * @param uploading 是否正在上传
   */
  setUploading: (uploading) => {
    set({ uploading })
  },
  
  /**
   * 设置文件上传进度
   * 
   * @param fileId 文件ID
   * @param progress 进度百分比（0-100）
   */
  setProgress: (fileId, progress) => {
    set((state) => ({
      progress: {
        ...state.progress,
        [fileId]: progress
      }
    }))
  },
  
  /**
   * 设置文件错误信息
   * 
   * @param fileId 文件ID
   * @param error 错误消息
   */
  setError: (fileId, error) => {
    set((state) => ({
      errors: {
        ...state.errors,
        [fileId]: error
      }
    }))
  },
  
  /**
   * 清除文件错误信息
   * 
   * @param fileId 文件ID
   */
  clearError: (fileId) => {
    set((state) => {
      const newErrors = { ...state.errors }
      delete newErrors[fileId]
      return { errors: newErrors }
    })
  },
  
  /**
   * 清除所有错误信息
   */
  clearAllErrors: () => {
    set({ errors: {} })
  },
  
  /**
   * 获取文件数量
   * 
   * @returns 文件数量
   */
  getFileCount: () => {
    return get().files.length
  },
  
  /**
   * 获取总文件大小
   * 
   * @returns 总文件大小（字节）
   */
  getTotalSize: () => {
    return get().totalSize
  },
  
  /**
   * 检查是否有错误
   * 
   * @returns 是否有错误
   */
  hasErrors: () => {
    return Object.keys(get().errors).length > 0
  }
}))
