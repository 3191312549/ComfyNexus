/**
 * 工作流卡片网格组件
 */

import { useCallback, useRef, useImperativeHandle, forwardRef } from 'react'
import { WorkflowCard } from './WorkflowCard'
import { useTranslation } from 'react-i18next'
import type { Workflow } from '@/types/workflow'

export interface WorkflowGridRef {
  getCardRefs: () => Map<string, HTMLDivElement>
}

interface WorkflowGridProps {
  workflows: Workflow[]
  selectedWorkflowIds: string[]
  isBatchMode: boolean
  onSelectWorkflow: (id: string) => void
  onAnalyzeWorkflow: (workflow: Workflow) => void
  onExportWorkflow: (workflow: Workflow) => void
  onDeleteWorkflow: (workflow: Workflow) => void
  onToggleFavorite: (workflow: Workflow) => void
  onPreviewChange?: () => void
}

export const WorkflowGrid = forwardRef<WorkflowGridRef, WorkflowGridProps>(function WorkflowGrid(
  {
    workflows,
    selectedWorkflowIds,
    isBatchMode,
    onSelectWorkflow,
    onAnalyzeWorkflow,
    onExportWorkflow,
    onDeleteWorkflow,
    onToggleFavorite,
    onPreviewChange
  },
  ref
) {
  const { t } = useTranslation()
  const cardRefsRef = useRef<Map<string, HTMLDivElement>>(new Map())

  useImperativeHandle(ref, () => ({
    getCardRefs: () => cardRefsRef.current
  }), [])

  const setCardRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefsRef.current.set(id, el)
    } else {
      cardRefsRef.current.delete(id)
    }
  }, [])

  const handleSelect = useCallback((id: string) => {
    onSelectWorkflow(id)
  }, [onSelectWorkflow])

  const handleAnalyze = useCallback((workflow: Workflow) => {
    onAnalyzeWorkflow(workflow)
  }, [onAnalyzeWorkflow])

  const handleExport = useCallback((workflow: Workflow) => {
    onExportWorkflow(workflow)
  }, [onExportWorkflow])

  const handleDelete = useCallback((workflow: Workflow) => {
    onDeleteWorkflow(workflow)
  }, [onDeleteWorkflow])

  const handleToggleFavorite = useCallback((workflow: Workflow) => {
    onToggleFavorite(workflow)
  }, [onToggleFavorite])

  if (workflows.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{t('workflow.empty')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-4">
      {workflows.map((workflow) => (
        <WorkflowCard
          key={workflow.id}
          ref={setCardRef(workflow.id)}
          workflow={workflow}
          isSelected={selectedWorkflowIds.includes(workflow.id)}
          isBatchMode={isBatchMode}
          selectedWorkflowIds={selectedWorkflowIds}
          onSelect={handleSelect}
          onAnalyze={handleAnalyze}
          onExport={handleExport}
          onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite}
          onPreviewChange={onPreviewChange}
        />
      ))}
    </div>
  )
})
