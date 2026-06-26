/// <reference types="vite/client" />

declare module 'nprogress'

declare module '@wangeditor/editor-for-vue' {
  export const Editor: any
  export const Toolbar: any
}

type InsertFnType = (url: string, alt?: string, href?: string) => void
type ToolbarDisplayType = 'none' | 'emoji' | 'image' | 'file' | 'video' | string
