export type ApiId = string | number

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  total: number
  records: T[]
}

export interface INoteTag {
  id: ApiId
  name: string
}

export interface INoteFolder {
  id: ApiId
  name: string
  sortOrder: number
  parentId: ApiId | null
  isDeleted: boolean
  deletedRootId: ApiId | null
}

export interface INoteListItem {
  id: ApiId
  title: string
  folderId: ApiId | null
  tagList: INoteTag[]
  isPinned: boolean
  updateTime: string
}

export interface INote extends INoteListItem {
  content: string
  createTime: string
  deletedTime: string | null
}

export interface INoteHistoryListItem {
  id: ApiId
  title: string
  contentPreview: string
  createTime: string
}

export interface INoteHistory {
  id: ApiId
  title: string
  content: string
  folderId: ApiId | null
  tagIds: ApiId[]
  createTime: string
}

export interface NoteQuery {
  keyword?: string | null
  folderId?: ApiId | null
  tagId?: ApiId | null
  isPinned?: boolean | null
  isDeleted?: boolean
}

export interface NoteNamePayload {
  name: string
}

export interface NoteFolderPayload extends NoteNamePayload {
  parentId: ApiId | null
}

export interface NoteSavePayload {
  title: string
  content: string
  folderId: ApiId | null
  tagIds: ApiId[]
}
