/// <reference types="vite/client" />

declare module '*.css' {
  const content: string
  export default content
}

declare global {
  interface Window {
    showDragErrorToast?: () => void
    triggerCloseDialog?: () => void
  }
}

export {}
