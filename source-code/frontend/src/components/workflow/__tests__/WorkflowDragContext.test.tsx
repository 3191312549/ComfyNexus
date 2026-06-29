/**
 * WorkflowDragContext 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DragProvider, useDragContext } from '../WorkflowDragContext'

function TestComponent({ onDrop }: { onDrop: (folderId: string, workflowIds: string[]) => void }) {
  const {
    isDragging,
    draggingWorkflowIds,
    dragPosition,
    dropTargetId,
    startDrag,
    updatePosition,
    endDrag,
    cancelDrag,
    setDropTargetId
  } = useDragContext()

  return (
    <div>
      <span data-testid="is-dragging">{String(isDragging)}</span>
      <span data-testid="dragging-ids">{draggingWorkflowIds.join(',')}</span>
      <span data-testid="drop-target">{dropTargetId || 'null'}</span>
      <span data-testid="position">{`${dragPosition.x},${dragPosition.y}`}</span>
      <button
        data-testid="start-drag"
        onClick={() => startDrag('workflow-1', ['workflow-1', 'workflow-2'], 100, 200)}
      >
        Start Drag
      </button>
      <button data-testid="update-position" onClick={() => updatePosition(150, 250)}>
        Update Position
      </button>
      <button data-testid="end-drag" onClick={endDrag}>
        End Drag
      </button>
      <button data-testid="cancel-drag" onClick={cancelDrag}>
        Cancel Drag
      </button>
      <button data-testid="set-target" onClick={() => setDropTargetId('folder-1')}>
        Set Target
      </button>
    </div>
  )
}

describe('WorkflowDragContext', () => {
  const mockOnDrop = vi.fn()

  beforeEach(() => {
    mockOnDrop.mockClear()
  })

  it('should provide initial state', () => {
    render(
      <DragProvider onDrop={mockOnDrop}>
        <TestComponent onDrop={mockOnDrop} />
      </DragProvider>
    )

    expect(screen.getByTestId('is-dragging').textContent).toBe('false')
    expect(screen.getByTestId('dragging-ids').textContent).toBe('')
    expect(screen.getByTestId('drop-target').textContent).toBe('null')
    expect(screen.getByTestId('position').textContent).toBe('0,0')
  })

  it('should start drag with single workflow', async () => {
    render(
      <DragProvider onDrop={mockOnDrop}>
        <TestComponent onDrop={mockOnDrop} />
      </DragProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-drag'))
    })

    expect(screen.getByTestId('is-dragging').textContent).toBe('true')
    expect(screen.getByTestId('dragging-ids').textContent).toBe('workflow-1,workflow-2')
    expect(screen.getByTestId('position').textContent).toBe('100,200')
  })

  it('should update position during drag', async () => {
    render(
      <DragProvider onDrop={mockOnDrop}>
        <TestComponent onDrop={mockOnDrop} />
      </DragProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-drag'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('update-position'))
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(screen.getByTestId('position').textContent).toBe('150,250')
  })

  it('should set drop target', async () => {
    render(
      <DragProvider onDrop={mockOnDrop}>
        <TestComponent onDrop={mockOnDrop} />
      </DragProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-drag'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('set-target'))
    })

    expect(screen.getByTestId('drop-target').textContent).toBe('folder-1')
  })

  it('should call onDrop when ending drag with target', async () => {
    render(
      <DragProvider onDrop={mockOnDrop}>
        <TestComponent onDrop={mockOnDrop} />
      </DragProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-drag'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('set-target'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('end-drag'))
    })

    expect(mockOnDrop).toHaveBeenCalledWith('folder-1', ['workflow-1', 'workflow-2'])
  })

  it('should not call onDrop when ending drag without target', async () => {
    render(
      <DragProvider onDrop={mockOnDrop}>
        <TestComponent onDrop={mockOnDrop} />
      </DragProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-drag'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('end-drag'))
    })

    expect(mockOnDrop).not.toHaveBeenCalled()
  })

  it('should cancel drag without calling onDrop', async () => {
    render(
      <DragProvider onDrop={mockOnDrop}>
        <TestComponent onDrop={mockOnDrop} />
      </DragProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-drag'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('set-target'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('cancel-drag'))
    })

    expect(mockOnDrop).not.toHaveBeenCalled()
    expect(screen.getByTestId('is-dragging').textContent).toBe('false')
    expect(screen.getByTestId('drop-target').textContent).toBe('null')
  })

  it('should throw error when useDragContext is used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent onDrop={mockOnDrop} />)
    }).toThrow('useDragContext must be used within DragProvider')

    consoleError.mockRestore()
  })
})
