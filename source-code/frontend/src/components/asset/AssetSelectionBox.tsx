/**
 * 资产框选选区绘制组件
 */

import { useMemo } from 'react'
import { createPortal } from 'react-dom'

interface AssetSelectionBoxProps {
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
}

export function AssetSelectionBox({ startPoint, endPoint }: AssetSelectionBoxProps) {
  const style = useMemo(() => {
    const left = Math.min(startPoint.x, endPoint.x)
    const top = Math.min(startPoint.y, endPoint.y)
    const width = Math.abs(endPoint.x - startPoint.x)
    const height = Math.abs(endPoint.y - startPoint.y)

    return {
      left,
      top,
      width,
      height,
    }
  }, [startPoint, endPoint])

  if (style.width < 5 && style.height < 5) {
    return null
  }

  return createPortal(
    <div
      className="pointer-events-none fixed z-50 border-2 border-dashed border-primary bg-primary/10"
      style={{
        left: style.left,
        top: style.top,
        width: style.width,
        height: style.height,
      }}
    />,
    document.body
  )
}
