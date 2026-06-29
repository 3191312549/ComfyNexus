/**
 * useFileStore 单元测试
 * 
 * 测试文件上传状态管理的核心功能：
 * - 文件添加
 * - 文件删除
 * - 大小计算
 * - 进度管理
 * - 错误管理
 * 
 * 验证需求: 4.1, 4.4
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useFileStore, type UploadedFile } from '../useFileStore'

describe('useFileStore', () => {
  // 创建测试用的文件对象
  const createMockFile = (overrides?: Partial<UploadedFile>): UploadedFile => ({
    id: `file_${Date.now()}_${Math.random()}`,
    name: 'test.jpg',
    type: 'image',
    mime_type: 'image/jpeg',
    size: 1024000, // 1MB
    content: 'base64_content_here',
    content_type: 'base64',
    thumbnail: 'thumbnail_base64',
    metadata: {
      original_name: 'test.jpg'
    },
    uploaded_at: new Date().toISOString(),
    ...overrides
  })

  beforeEach(() => {
    // 重置 store 状态
    useFileStore.setState({
      files: [],
      uploading: false,
      progress: {},
      errors: {},
      totalSize: 0
    })
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useFileStore.getState()
      
      expect(state.files).toEqual([])
      expect(state.uploading).toBe(false)
      expect(state.progress).toEqual({})
      expect(state.errors).toEqual({})
      expect(state.totalSize).toBe(0)
    })
  })

  describe('addFile', () => {
    it('应该成功添加文件到列表', () => {
      const store = useFileStore.getState()
      const file = createMockFile()
      
      store.addFile(file)
      
      const state = useFileStore.getState()
      expect(state.files).toHaveLength(1)
      expect(state.files[0]).toEqual(file)
    })

    it('应该正确计算总文件大小', () => {
      const store = useFileStore.getState()
      const file1 = createMockFile({ size: 1000000 }) // 1MB
      const file2 = createMockFile({ size: 2000000 }) // 2MB
      
      store.addFile(file1)
      store.addFile(file2)
      
      const state = useFileStore.getState()
      expect(state.totalSize).toBe(3000000) // 3MB
    })

    it('应该保持文件的添加顺序', () => {
      const store = useFileStore.getState()
      const file1 = createMockFile({ id: 'file1', name: 'first.jpg' })
      const file2 = createMockFile({ id: 'file2', name: 'second.jpg' })
      const file3 = createMockFile({ id: 'file3', name: 'third.jpg' })
      
      store.addFile(file1)
      store.addFile(file2)
      store.addFile(file3)
      
      const state = useFileStore.getState()
      expect(state.files[0].name).toBe('first.jpg')
      expect(state.files[1].name).toBe('second.jpg')
      expect(state.files[2].name).toBe('third.jpg')
    })

    it('应该支持添加不同类型的文件', () => {
      const store = useFileStore.getState()
      const imageFile = createMockFile({ 
        type: 'image', 
        mime_type: 'image/png',
        name: 'image.png'
      })
      const docFile = createMockFile({ 
        type: 'document', 
        mime_type: 'application/pdf',
        name: 'document.pdf',
        content_type: 'text'
      })
      
      store.addFile(imageFile)
      store.addFile(docFile)
      
      const state = useFileStore.getState()
      expect(state.files).toHaveLength(2)
      expect(state.files[0].type).toBe('image')
      expect(state.files[1].type).toBe('document')
    })
  })

  describe('removeFile', () => {
    it('应该成功从列表中移除文件', () => {
      const store = useFileStore.getState()
      const file = createMockFile({ id: 'file1' })
      
      store.addFile(file)
      expect(useFileStore.getState().files).toHaveLength(1)
      
      store.removeFile('file1')
      expect(useFileStore.getState().files).toHaveLength(0)
    })

    it('应该正确更新总文件大小', () => {
      const store = useFileStore.getState()
      const file1 = createMockFile({ id: 'file1', size: 1000000 })
      const file2 = createMockFile({ id: 'file2', size: 2000000 })
      
      store.addFile(file1)
      store.addFile(file2)
      expect(useFileStore.getState().totalSize).toBe(3000000)
      
      store.removeFile('file1')
      expect(useFileStore.getState().totalSize).toBe(2000000)
    })

    it('应该同时清除文件的进度信息', () => {
      const store = useFileStore.getState()
      const file = createMockFile({ id: 'file1' })
      
      store.addFile(file)
      store.setProgress('file1', 50)
      expect(useFileStore.getState().progress['file1']).toBe(50)
      
      store.removeFile('file1')
      expect(useFileStore.getState().progress['file1']).toBeUndefined()
    })

    it('应该同时清除文件的错误信息', () => {
      const store = useFileStore.getState()
      const file = createMockFile({ id: 'file1' })
      
      store.addFile(file)
      store.setError('file1', '上传失败')
      expect(useFileStore.getState().errors['file1']).toBe('上传失败')
      
      store.removeFile('file1')
      expect(useFileStore.getState().errors['file1']).toBeUndefined()
    })

    it('移除不存在的文件不应该报错', () => {
      const store = useFileStore.getState()
      
      expect(() => store.removeFile('non_existent')).not.toThrow()
    })

    it('应该只移除指定的文件，不影响其他文件', () => {
      const store = useFileStore.getState()
      const file1 = createMockFile({ id: 'file1', name: 'first.jpg' })
      const file2 = createMockFile({ id: 'file2', name: 'second.jpg' })
      const file3 = createMockFile({ id: 'file3', name: 'third.jpg' })
      
      store.addFile(file1)
      store.addFile(file2)
      store.addFile(file3)
      
      store.removeFile('file2')
      
      const state = useFileStore.getState()
      expect(state.files).toHaveLength(2)
      expect(state.files[0].id).toBe('file1')
      expect(state.files[1].id).toBe('file3')
    })
  })

  describe('clearFiles', () => {
    it('应该清空所有文件', () => {
      const store = useFileStore.getState()
      const file1 = createMockFile()
      const file2 = createMockFile()
      
      store.addFile(file1)
      store.addFile(file2)
      expect(useFileStore.getState().files).toHaveLength(2)
      
      store.clearFiles()
      expect(useFileStore.getState().files).toHaveLength(0)
    })

    it('应该重置总文件大小', () => {
      const store = useFileStore.getState()
      const file = createMockFile({ size: 1000000 })
      
      store.addFile(file)
      expect(useFileStore.getState().totalSize).toBe(1000000)
      
      store.clearFiles()
      expect(useFileStore.getState().totalSize).toBe(0)
    })

    it('应该清空所有进度信息', () => {
      const store = useFileStore.getState()
      const file = createMockFile({ id: 'file1' })
      
      store.addFile(file)
      store.setProgress('file1', 50)
      expect(useFileStore.getState().progress).not.toEqual({})
      
      store.clearFiles()
      expect(useFileStore.getState().progress).toEqual({})
    })

    it('应该清空所有错误信息', () => {
      const store = useFileStore.getState()
      const file = createMockFile({ id: 'file1' })
      
      store.addFile(file)
      store.setError('file1', '错误')
      expect(useFileStore.getState().errors).not.toEqual({})
      
      store.clearFiles()
      expect(useFileStore.getState().errors).toEqual({})
    })

    it('应该重置上传状态', () => {
      const store = useFileStore.getState()
      
      store.setUploading(true)
      expect(useFileStore.getState().uploading).toBe(true)
      
      store.clearFiles()
      expect(useFileStore.getState().uploading).toBe(false)
    })
  })

  describe('setUploading', () => {
    it('应该正确设置上传状态', () => {
      const store = useFileStore.getState()
      
      store.setUploading(true)
      expect(useFileStore.getState().uploading).toBe(true)
      
      store.setUploading(false)
      expect(useFileStore.getState().uploading).toBe(false)
    })
  })

  describe('setProgress', () => {
    it('应该正确设置文件上传进度', () => {
      const store = useFileStore.getState()
      
      store.setProgress('file1', 50)
      expect(useFileStore.getState().progress['file1']).toBe(50)
      
      store.setProgress('file1', 100)
      expect(useFileStore.getState().progress['file1']).toBe(100)
    })

    it('应该支持多个文件的进度管理', () => {
      const store = useFileStore.getState()
      
      store.setProgress('file1', 30)
      store.setProgress('file2', 60)
      store.setProgress('file3', 90)
      
      const state = useFileStore.getState()
      expect(state.progress['file1']).toBe(30)
      expect(state.progress['file2']).toBe(60)
      expect(state.progress['file3']).toBe(90)
    })
  })

  describe('setError', () => {
    it('应该正确设置文件错误信息', () => {
      const store = useFileStore.getState()
      
      store.setError('file1', '文件太大')
      expect(useFileStore.getState().errors['file1']).toBe('文件太大')
    })

    it('应该支持多个文件的错误管理', () => {
      const store = useFileStore.getState()
      
      store.setError('file1', '错误1')
      store.setError('file2', '错误2')
      
      const state = useFileStore.getState()
      expect(state.errors['file1']).toBe('错误1')
      expect(state.errors['file2']).toBe('错误2')
    })
  })

  describe('clearError', () => {
    it('应该清除指定文件的错误信息', () => {
      const store = useFileStore.getState()
      
      store.setError('file1', '错误')
      expect(useFileStore.getState().errors['file1']).toBe('错误')
      
      store.clearError('file1')
      expect(useFileStore.getState().errors['file1']).toBeUndefined()
    })

    it('应该只清除指定文件的错误，不影响其他文件', () => {
      const store = useFileStore.getState()
      
      store.setError('file1', '错误1')
      store.setError('file2', '错误2')
      
      store.clearError('file1')
      
      const state = useFileStore.getState()
      expect(state.errors['file1']).toBeUndefined()
      expect(state.errors['file2']).toBe('错误2')
    })
  })

  describe('clearAllErrors', () => {
    it('应该清除所有错误信息', () => {
      const store = useFileStore.getState()
      
      store.setError('file1', '错误1')
      store.setError('file2', '错误2')
      store.setError('file3', '错误3')
      
      expect(Object.keys(useFileStore.getState().errors)).toHaveLength(3)
      
      store.clearAllErrors()
      expect(useFileStore.getState().errors).toEqual({})
    })
  })

  describe('getFileCount', () => {
    it('应该返回正确的文件数量', () => {
      const store = useFileStore.getState()
      
      expect(store.getFileCount()).toBe(0)
      
      store.addFile(createMockFile())
      expect(store.getFileCount()).toBe(1)
      
      store.addFile(createMockFile())
      expect(store.getFileCount()).toBe(2)
      
      store.removeFile(useFileStore.getState().files[0].id)
      expect(store.getFileCount()).toBe(1)
    })
  })

  describe('getTotalSize', () => {
    it('应该返回正确的总文件大小', () => {
      const store = useFileStore.getState()
      
      expect(store.getTotalSize()).toBe(0)
      
      store.addFile(createMockFile({ size: 1000000 }))
      expect(store.getTotalSize()).toBe(1000000)
      
      store.addFile(createMockFile({ size: 2000000 }))
      expect(store.getTotalSize()).toBe(3000000)
    })
  })

  describe('hasErrors', () => {
    it('没有错误时应该返回 false', () => {
      const store = useFileStore.getState()
      
      expect(store.hasErrors()).toBe(false)
    })

    it('有错误时应该返回 true', () => {
      const store = useFileStore.getState()
      
      store.setError('file1', '错误')
      expect(store.hasErrors()).toBe(true)
    })

    it('清除所有错误后应该返回 false', () => {
      const store = useFileStore.getState()
      
      store.setError('file1', '错误1')
      store.setError('file2', '错误2')
      expect(store.hasErrors()).toBe(true)
      
      store.clearAllErrors()
      expect(store.hasErrors()).toBe(false)
    })
  })

  describe('边界条件', () => {
    it('应该处理空文件列表', () => {
      const store = useFileStore.getState()
      
      expect(store.getFileCount()).toBe(0)
      expect(store.getTotalSize()).toBe(0)
      expect(store.hasErrors()).toBe(false)
    })

    it('应该处理大量文件', () => {
      const store = useFileStore.getState()
      
      // 添加 100 个文件
      for (let i = 0; i < 100; i++) {
        store.addFile(createMockFile({ 
          id: `file${i}`,
          size: 1000 
        }))
      }
      
      expect(store.getFileCount()).toBe(100)
      expect(store.getTotalSize()).toBe(100000)
    })

    it('应该处理零大小的文件', () => {
      const store = useFileStore.getState()
      const file = createMockFile({ size: 0 })
      
      store.addFile(file)
      
      expect(store.getFileCount()).toBe(1)
      expect(store.getTotalSize()).toBe(0)
    })

    it('应该处理非常大的文件', () => {
      const store = useFileStore.getState()
      const largeSize = 50 * 1024 * 1024 // 50MB
      const file = createMockFile({ size: largeSize })
      
      store.addFile(file)
      
      expect(store.getTotalSize()).toBe(largeSize)
    })
  })

  describe('状态一致性', () => {
    it('totalSize 应该始终等于所有文件大小之和', () => {
      const store = useFileStore.getState()
      
      const file1 = createMockFile({ size: 1000 })
      const file2 = createMockFile({ size: 2000 })
      const file3 = createMockFile({ size: 3000 })
      
      store.addFile(file1)
      store.addFile(file2)
      store.addFile(file3)
      
      const state = useFileStore.getState()
      const calculatedSize = state.files.reduce((sum, f) => sum + f.size, 0)
      
      expect(state.totalSize).toBe(calculatedSize)
      expect(state.totalSize).toBe(6000)
    })

    it('移除文件后 totalSize 应该保持一致', () => {
      const store = useFileStore.getState()
      
      const file1 = createMockFile({ id: 'file1', size: 1000 })
      const file2 = createMockFile({ id: 'file2', size: 2000 })
      
      store.addFile(file1)
      store.addFile(file2)
      store.removeFile('file1')
      
      const state = useFileStore.getState()
      const calculatedSize = state.files.reduce((sum, f) => sum + f.size, 0)
      
      expect(state.totalSize).toBe(calculatedSize)
      expect(state.totalSize).toBe(2000)
    })
  })
})
