/**
 * workflowApi 批量操作单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { workflowApi } from '../workflow'

const mockApi = {
  batch_move_workflows_to_folder: vi.fn(),
  batch_toggle_workflow_favorite: vi.fn(),
  batch_delete_workflows: vi.fn()
}

vi.mock('@/api/workflow', async () => {
  const actual = await vi.importActual('@/api/workflow')
  return {
    ...actual,
    getAPI: () => mockApi
  }
})

describe('workflowApi - 批量操作', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('batchMoveToFolder', () => {
    it('should call API with correct parameters', async () => {
      mockApi.batch_move_workflows_to_folder.mockResolvedValue({
        success: true,
        moved_count: 2
      })

      const result = await workflowApi.batchMoveToFolder(
        ['workflow-1', 'workflow-2'],
        'folder-1'
      )

      expect(mockApi.batch_move_workflows_to_folder).toHaveBeenCalledWith(
        ['workflow-1', 'workflow-2'],
        'folder-1'
      )
      expect(result).toEqual({ success: true, movedCount: 2 })
    })

    it('should handle null folderId', async () => {
      mockApi.batch_move_workflows_to_folder.mockResolvedValue({
        success: true,
        moved_count: 1
      })

      const result = await workflowApi.batchMoveToFolder(['workflow-1'], null)

      expect(mockApi.batch_move_workflows_to_folder).toHaveBeenCalledWith(
        ['workflow-1'],
        null
      )
      expect(result).toEqual({ success: true, movedCount: 1 })
    })

    it('should return failure on API error', async () => {
      mockApi.batch_move_workflows_to_folder.mockResolvedValue({
        success: false,
        error: '移动失败'
      })

      const result = await workflowApi.batchMoveToFolder(['workflow-1'], 'folder-1')

      expect(result).toEqual({ success: false, movedCount: 0 })
    })

    it('should handle API not available', async () => {
      const { getAPI } = await import('../workflow')
      vi.spyOn(await import('../workflow'), 'getAPI').mockReturnValue(null)

      const result = await workflowApi.batchMoveToFolder(['workflow-1'], 'folder-1')

      expect(result).toEqual({ success: false, movedCount: 0 })
    })
  })

  describe('batchToggleFavorite', () => {
    it('should call API with correct parameters', async () => {
      mockApi.batch_toggle_workflow_favorite.mockResolvedValue({
        success: true,
        results: { 'workflow-1': true, 'workflow-2': false }
      })

      const result = await workflowApi.batchToggleFavorite(['workflow-1', 'workflow-2'])

      expect(mockApi.batch_toggle_workflow_favorite).toHaveBeenCalledWith([
        'workflow-1',
        'workflow-2'
      ])
      expect(result).toEqual({ success: true })
    })

    it('should return failure on API error', async () => {
      mockApi.batch_toggle_workflow_favorite.mockResolvedValue({
        success: false,
        error: '切换失败'
      })

      const result = await workflowApi.batchToggleFavorite(['workflow-1'])

      expect(result).toEqual({ success: false })
    })
  })

  describe('batchDeleteWorkflows', () => {
    it('should call API with correct parameters', async () => {
      mockApi.batch_delete_workflows.mockResolvedValue({
        success: true,
        deleted_count: 2
      })

      const result = await workflowApi.batchDeleteWorkflows(['workflow-1', 'workflow-2'])

      expect(mockApi.batch_delete_workflows).toHaveBeenCalledWith([
        'workflow-1',
        'workflow-2'
      ])
      expect(result).toEqual({ success: true, deletedCount: 2 })
    })

    it('should return failure on API error', async () => {
      mockApi.batch_delete_workflows.mockResolvedValue({
        success: false,
        error: '删除失败'
      })

      const result = await workflowApi.batchDeleteWorkflows(['workflow-1'])

      expect(result).toEqual({ success: false, deletedCount: 0 })
    })
  })
})
