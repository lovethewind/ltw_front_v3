import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import noteApi from '@/api/note'
import noteFolderApi from '@/api/note-folder'
import noteTagApi from '@/api/note-tag'
import type {
  ApiId,
  INote,
  INoteFolder,
  INoteListItem,
  INoteTag,
  NoteQuery
} from '@/interface/note'
import {
  createNoteAutosave,
  type NoteAutosaveController,
  type NoteSaveStatus,
  type NoteSnapshot
} from '@/utils/note-autosave'

const TREE_PAGE_SIZE = 100
const UNCATEGORIZED_FOLDER_ID = 0
const NOTE_DETAIL_CACHE_MAX_ENTRIES = 6
const NOTE_DETAIL_CACHE_MAX_CHARS = 32 * 1024 * 1024

interface AutosaveSession {
  controller: NoteAutosaveController
  generation: number
  noteId: ApiId
}

interface NoteNavigationCounts {
  all: number
  pinned: number
  recycle: number
}

/**
 * 比较可能以数字或字符串返回的接口标识。
 *
 * :param left: 左侧标识。
 * :param right: 右侧标识。
 * :return: 两个标识是否相同。
 */
function sameId(left: ApiId | null | undefined, right: ApiId | null | undefined): boolean {
  return (
    left !== null &&
    left !== undefined &&
    right !== null &&
    right !== undefined &&
    String(left) === String(right)
  )
}

/**
 * 管理私人笔记的导航、列表、详情和自动保存。
 *
 * :return: 笔记工作台状态与操作。
 */
export const useNoteStore = defineStore('note', () => {
  const folders = ref<INoteFolder[]>([])
  const tags = ref<INoteTag[]>([])
  const notes = ref<INoteListItem[]>([])
  const navigationCounts = ref<NoteNavigationCounts>({ all: 0, pinned: 0, recycle: 0 })
  const activeNote = ref<INote | null>(null)
  const filter = ref<NoteQuery>({
    keyword: '',
    folderId: null,
    tagId: null,
    isPinned: null,
    isDeleted: false
  })
  const saveStatus = ref<NoteSaveStatus>('idle')
  const loading = ref(false)
  const actionError = ref('')
  const hasRecoverySnapshot = ref(false)
  const editorLocked = ref(false)
  const recoverySnapshot = ref<NoteSnapshot | null>(null)
  const isRecycleBin = computed(() => filter.value.isDeleted === true)
  const visibleNotes = computed(() => {
    const keyword = (filter.value.keyword ?? '').trim().toLocaleLowerCase()
    return notes.value.filter((note) => {
      if (keyword && !note.title.toLocaleLowerCase().includes(keyword)) return false
      if (
        filter.value.tagId !== null &&
        filter.value.tagId !== undefined &&
        !note.tagList.some((tag) => sameId(tag.id, filter.value.tagId))
      ) return false
      return (
        filter.value.isPinned === null ||
        filter.value.isPinned === undefined ||
        note.isPinned === filter.value.isPinned
      )
    })
  })
  let listRequestId = 0
  let detailRequestId = 0
  let sessionGeneration = 0
  let storeGeneration = 0
  let autosaveSession: AutosaveSession | undefined
  const noteDetailCache = new Map<string, INote>()
  let noteDetailCacheChars = 0

  /**
   * 将笔记详情写入有界的最近使用缓存。
   *
   * :param note: 待缓存的笔记详情。
   * :return: 无返回值。
   */
  function rememberNoteDetail(note: INote): void {
    const key = String(note.id)
    const existing = noteDetailCache.get(key)
    if (existing) noteDetailCacheChars -= existing.content.length
    noteDetailCache.delete(key)
    noteDetailCache.set(key, note)
    noteDetailCacheChars += note.content.length
    while (
      noteDetailCache.size > NOTE_DETAIL_CACHE_MAX_ENTRIES ||
      (noteDetailCacheChars > NOTE_DETAIL_CACHE_MAX_CHARS && noteDetailCache.size > 1)
    ) {
      const oldestKey = noteDetailCache.keys().next().value as string | undefined
      if (oldestKey === undefined) break
      const oldest = noteDetailCache.get(oldestKey)
      noteDetailCache.delete(oldestKey)
      noteDetailCacheChars -= oldest?.content.length ?? 0
    }
  }

  /**
   * 从最近使用缓存读取笔记详情并刷新淘汰顺序。
   *
   * :param noteId: 笔记标识。
   * :return: 已缓存详情；未命中时返回空值。
   */
  function readRememberedNoteDetail(noteId: ApiId): INote | undefined {
    const key = String(noteId)
    const note = noteDetailCache.get(key)
    if (!note) return undefined
    noteDetailCache.delete(key)
    noteDetailCache.set(key, note)
    return note
  }

  /**
   * 清空最近笔记详情缓存。
   *
   * :return: 无返回值。
   */
  function clearRememberedNoteDetails(): void {
    noteDetailCache.clear()
    noteDetailCacheChars = 0
  }

  /**
   * 记录操作失败信息。
   *
   * :param error: 捕获到的异常。
   * :return: 无返回值。
   */
  function setError(error: unknown): void {
    actionError.value = error instanceof Error ? error.message : '操作失败，请稍后重试'
  }

  /**
   * 生成当前笔记的可保存快照。
   *
   * :param note: 当前笔记。
   * :return: 自动保存快照。
   */
  function toSnapshot(note: INote): NoteSnapshot {
    return {
      title: note.title,
      content: note.content,
      folderId: note.folderId === null ? null : String(note.folderId),
      tagIds: note.tagList.map((tag) => String(tag.id))
    }
  }

  /**
   * 转换详情为列表项。
   *
   * :param note: 笔记详情。
   * :return: 列表展示项。
   */
  function toListItem(note: INote): INoteListItem {
    const { id, title, content, folderId, tagList, isPinned, updateTime } = note
    return { id, title, contentPreview: content, folderId, tagList, isPinned, updateTime }
  }

  /**
   * 分页读取指定回收站状态下的全部笔记元数据。
   *
   * :param isDeleted: 是否读取回收站笔记。
   * :return: 完整笔记列表。
   */
  async function fetchAllNotes(isDeleted: boolean): Promise<INoteListItem[]> {
    const firstResponse = await noteApi.getPageList(1, TREE_PAGE_SIZE, { isDeleted })
    const records = [...firstResponse.data.records]
    const totalPages = Math.ceil(firstResponse.data.total / TREE_PAGE_SIZE)
    for (let current = 2; current <= totalPages; current += 1) {
      const response = await noteApi.getPageList(current, TREE_PAGE_SIZE, { isDeleted })
      records.push(...response.data.records)
    }
    return records
  }

  /**
   * 读取合法的本地恢复草稿。
   *
   * :param noteId: 笔记标识。
   * :return: 恢复快照或空值。
   */
  function readRecoverySnapshot(noteId: ApiId): NoteSnapshot | null {
    try {
      const raw = sessionStorage.getItem(`noteContentCache_${noteId}`)
      if (!raw) return null
      const value = JSON.parse(raw) as NoteSnapshot
      return typeof value.title === 'string' &&
        typeof value.content === 'string' &&
        Array.isArray(value.tagIds)
        ? value
        : null
    } catch {
      return null
    }
  }

  /**
   * 停止当前自动保存会话，先提交已排队快照以确保删除后不再产生 PUT。
   *
   * :return: 会话停止后的 Promise。
   */
  async function closeAutosaveSession(): Promise<void> {
    const session = autosaveSession
    if (!session) return
    try {
      await session.controller.flush()
    } catch {
      /* 调度器已缓存失败快照 */
    }
    session.controller.destroy()
    if (autosaveSession === session) autosaveSession = undefined
  }

  /**
   * 启用绑定到笔记和代际的自动保存会话。
   *
   * :param note: 进入编辑器的笔记。
   * :return: 无返回值。
   */
  function startAutosaveSession(note: INote): void {
    const generation = ++sessionGeneration
    const controller = createNoteAutosave({
      noteId: String(note.id),
      storage: sessionStorage,
      save: (snapshot) => saveSnapshot(snapshot, note.id, generation)
    })
    autosaveSession = { controller, generation, noteId: note.id }
  }

  /**
   * 加载当前筛选的笔记列表，仅允许最后一次响应写入状态。
   *
   * :return: 是否加载成功。
   */
  async function loadNotes(): Promise<boolean> {
    const requestId = ++listRequestId
    const generation = storeGeneration
    loading.value = true
    actionError.value = ''
    try {
      const records = await fetchAllNotes(filter.value.isDeleted === true)
      if (requestId !== listRequestId || generation !== storeGeneration) return false
      notes.value = records
      navigationCounts.value = filter.value.isDeleted
        ? { ...navigationCounts.value, recycle: records.length }
        : {
            ...navigationCounts.value,
            all: records.length,
            pinned: records.filter((note) => note.isPinned).length
          }
      return true
    } catch (error) {
      if (requestId === listRequestId && generation === storeGeneration) setError(error)
      return false
    } finally {
      if (requestId === listRequestId && generation === storeGeneration) loading.value = false
    }
  }

  /**
   * 加载导航数据和首屏列表。
   *
   * :return: 是否加载成功。
   */
  async function loadWorkspace(initialNoteId?: ApiId): Promise<boolean> {
    const requestId = ++listRequestId
    const generation = storeGeneration
    loading.value = true
    actionError.value = ''
    try {
      const [folderResponse, tagResponse, noteResponse, recycleCountResponse] = await Promise.all([
        noteFolderApi.getAll(),
        noteTagApi.getAll(),
        fetchAllNotes(false),
        noteApi.getPageList(1, 1, { isDeleted: true })
      ])
      if (requestId !== listRequestId || generation !== storeGeneration) return false
      folders.value = folderResponse.data
      tags.value = tagResponse.data
      notes.value = noteResponse
      navigationCounts.value = {
        all: noteResponse.length,
        pinned: noteResponse.filter((note) => note.isPinned).length,
        recycle: recycleCountResponse.data.total
      }
      const targetNoteId = initialNoteId ?? noteResponse[0]?.id
      if (targetNoteId !== undefined) {
        await selectNote(targetNoteId)
      }
      return true
    } catch (error) {
      if (requestId === listRequestId && generation === storeGeneration) setError(error)
      return false
    } finally {
      if (requestId === listRequestId && generation === storeGeneration) loading.value = false
    }
  }

  /**
   * 选择笔记详情；重复选择当前笔记不会覆盖正在编辑的快照。
   *
   * :param noteId: 笔记标识。
   * :return: 是否选择成功。
   */
  async function selectNote(noteId: ApiId): Promise<boolean> {
    if (editorLocked.value) return false
    if (sameId(activeNote.value?.id, noteId)) {
      if (!autosaveSession && activeNote.value) startAutosaveSession(activeNote.value)
      return true
    }
    const requestId = ++detailRequestId
    actionError.value = ''
    try {
      const rememberedNote = readRememberedNoteDetail(noteId)
      const nextNote = rememberedNote ?? (await noteApi.getDetail(noteId)).data
      if (requestId !== detailRequestId) return false
      const previousNote = activeNote.value
      await closeAutosaveSession()
      if (requestId !== detailRequestId) return false
      if (previousNote) rememberNoteDetail(previousNote)
      rememberNoteDetail(nextNote)
      activeNote.value = nextNote
      saveStatus.value = 'idle'
      recoverySnapshot.value = readRecoverySnapshot(nextNote.id)
      hasRecoverySnapshot.value = recoverySnapshot.value !== null
      startAutosaveSession(nextNote)
      return true
    } catch (error) {
      if (requestId === detailRequestId) setError(error)
      return false
    }
  }

  /**
   * 创建笔记并在全部正常列表中插入新项目。
   *
   * :return: 是否创建成功。
   */
  async function createNote(folderId: ApiId | null = null): Promise<boolean> {
    actionError.value = ''
    try {
      const response = await noteApi.create(folderId)
      filter.value = { keyword: '', folderId: folderId ?? null, tagId: null, isPinned: null, isDeleted: false }
      if (!(await selectNote(response.data)) || !activeNote.value) return false
      notes.value = [
        toListItem(activeNote.value),
        ...notes.value.filter((note) => !sameId(note.id, activeNote.value?.id))
      ]
      navigationCounts.value = {
        ...navigationCounts.value,
        all: navigationCounts.value.all + 1
      }
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }

  /**
   * 设置目录树的本地筛选条件。
   *
   * :param nextFilter: 新筛选字段。
   * :return: 是否加载成功。
   */
  async function setFilter(nextFilter: Partial<NoteQuery>): Promise<boolean> {
    filter.value = { ...filter.value, ...nextFilter }
    return true
  }

  /**
   * 按标题筛选当前目录树。
   *
   * :param keyword: 查询关键词。
   * :return: 无返回值。
   */
  function search(keyword: string): void {
    filter.value.keyword = keyword
  }

  /** :return: 是否加载成功。 */
  async function showAll(): Promise<boolean> {
    const shouldReload = filter.value.isDeleted === true
    await setFilter({ folderId: null, tagId: null, isPinned: null, isDeleted: false })
    if (!shouldReload) return true
    const folderResponse = await noteFolderApi.getAll(false)
    folders.value = folderResponse.data
    return loadNotes()
  }
  /** :return: 是否加载成功。 */
  async function showPinned(): Promise<boolean> {
    const shouldReload = filter.value.isDeleted === true
    await setFilter({ folderId: null, tagId: null, isPinned: true, isDeleted: false })
    if (!shouldReload) return true
    const folderResponse = await noteFolderApi.getAll(false)
    folders.value = folderResponse.data
    return loadNotes()
  }
  /**
   * 切换到回收站，并在加载期间隐藏旧视图数据后原子替换目录和笔记。
   *
   * :return: 是否加载成功。
   */
  async function showRecycleBin(): Promise<boolean> {
    if (filter.value.isDeleted === true) return true
    const requestId = ++listRequestId
    const generation = storeGeneration
    loading.value = true
    actionError.value = ''
    await setFilter({ folderId: null, tagId: null, isPinned: null, isDeleted: true })
    try {
      const [folderResponse, records] = await Promise.all([
        noteFolderApi.getAll(true),
        fetchAllNotes(true)
      ])
      if (requestId !== listRequestId || generation !== storeGeneration) return false
      folders.value = folderResponse.data
      notes.value = records
      navigationCounts.value = { ...navigationCounts.value, recycle: records.length }
      return true
    } catch (error) {
      if (requestId === listRequestId && generation === storeGeneration) setError(error)
      return false
    } finally {
      if (requestId === listRequestId && generation === storeGeneration) loading.value = false
    }
  }
  /**
   * 按文件夹筛选。
   *
   * :param folderId: 文件夹标识；空值表示未分类。
   * :return: 是否加载成功。
   */
  async function selectFolder(folderId: ApiId | null): Promise<boolean> {
    return setFilter({
      folderId: folderId ?? UNCATEGORIZED_FOLDER_ID,
      tagId: null,
      isPinned: null,
      isDeleted: false
    })
  }
  /**
   * 按标签筛选。
   *
   * :param tagId: 标签标识。
   * :return: 是否加载成功。
   */
  async function selectTag(tagId: ApiId): Promise<boolean> {
    return setFilter({
      tagId: sameId(filter.value.tagId, tagId) ? null : tagId,
      folderId: null,
      isPinned: null,
      isDeleted: false
    })
  }

  /**
   * 更新本地编辑快照并调度保存。
   *
   * :param changes: 可部分更新的编辑字段。
   * :return: 无返回值。
   */
  function updateActiveNote(
    changes: Partial<Pick<INote, 'title' | 'content' | 'folderId' | 'tagList'>>
  ): void {
    if (!activeNote.value || editorLocked.value) return
    activeNote.value = { ...activeNote.value, ...changes }
    notes.value = notes.value.map((note) =>
      sameId(note.id, activeNote.value?.id)
        ? {
            ...note,
            ...(changes.title !== undefined ? { title: changes.title } : {}),
            ...(changes.folderId !== undefined ? { folderId: changes.folderId } : {}),
            ...(changes.tagList !== undefined ? { tagList: changes.tagList } : {})
          }
        : note
    )
    if (hasRecoverySnapshot.value) {
      recoverySnapshot.value = null
      hasRecoverySnapshot.value = false
    }
    saveStatus.value = 'idle'
    autosaveSession?.controller.schedule(toSnapshot(activeNote.value))
  }

  /**
   * 保存快照，仅当前同一代编辑会话可改变状态。
   *
   * :param snapshot: 待保存快照。
   * :param noteId: 目标笔记标识。
   * :param generation: 自动保存会话代际。
   * :return: 保存后的 Promise。
   */
  async function saveSnapshot(
    snapshot: NoteSnapshot,
    noteId: ApiId | undefined = activeNote.value?.id,
    generation?: number
  ): Promise<void> {
    if (noteId === undefined) return
    const isCurrent = () =>
      sameId(activeNote.value?.id, noteId) &&
      (generation === undefined ||
        (autosaveSession?.generation === generation && sameId(autosaveSession.noteId, noteId)))
    if (isCurrent()) saveStatus.value = 'saving'
    try {
      await noteApi.update(noteId, snapshot)
      if (isCurrent()) {
        saveStatus.value = 'saved'
        recoverySnapshot.value = null
        hasRecoverySnapshot.value = false
      }
    } catch (error) {
      if (isCurrent())
        saveStatus.value =
          typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'failed'
      throw error
    }
  }

  /** :return: 重试后的 Promise。 */
  async function retrySave(): Promise<void> {
    await autosaveSession?.controller.retry()
  }

  /**
   * 立即提交当前自动保存队列，并再次将当前内容提交到后台。
   *
   * :return: 是否保存成功。
   */
  async function saveNow(): Promise<boolean> {
    const session = autosaveSession
    if (!activeNote.value || !session || editorLocked.value) return false
    await session.controller.retry()
    await session.controller.flush()
    if (autosaveSession !== session || !sameId(activeNote.value?.id, session.noteId)) return false
    try {
      await saveSnapshot(toSnapshot(activeNote.value), session.noteId, session.generation)
      return saveStatus.value === 'saved'
    } catch {
      return false
    }
  }

  /**
   * 恢复当前笔记的指定历史版本。
   *
   * 恢复前会先提交本地保存队列，服务端还会强制保存恢复前的当前版本。
   *
   * :param historyId: 历史版本标识。
   * :return: 是否恢复成功。
   */
  async function restoreHistory(historyId: ApiId): Promise<boolean> {
    const noteId = activeNote.value?.id
    const session = autosaveSession
    if (noteId === undefined || !session || editorLocked.value) return false
    actionError.value = ''
    editorLocked.value = true
    try {
      await session.controller.retry()
      await session.controller.flush()
      if (saveStatus.value === 'failed' || saveStatus.value === 'offline') {
        throw new Error('当前内容尚未保存，暂时不能恢复历史版本')
      }
      session.controller.destroy()
      if (autosaveSession === session) autosaveSession = undefined
      await noteApi.restoreHistory(noteId, historyId)
      const response = await noteApi.getDetail(noteId)
      rememberNoteDetail(response.data)
      activeNote.value = response.data
      notes.value = notes.value.map((note) =>
        sameId(note.id, noteId) ? toListItem(response.data) : note
      )
      saveStatus.value = 'saved'
      recoverySnapshot.value = null
      hasRecoverySnapshot.value = false
      startAutosaveSession(response.data)
      return true
    } catch (error) {
      if (!autosaveSession && activeNote.value && sameId(activeNote.value.id, noteId)) {
        startAutosaveSession(activeNote.value)
      }
      setError(error)
      return false
    } finally {
      editorLocked.value = false
    }
  }
  /** :return: 无返回值。 */
  function restoreRecoverySnapshot(): void {
    if (!activeNote.value || !recoverySnapshot.value) return
    updateActiveNote({
      title: recoverySnapshot.value.title,
      content: recoverySnapshot.value.content,
      folderId: recoverySnapshot.value.folderId,
      tagList: recoverySnapshot.value.tagIds.map(
        (id) => tags.value.find((tag) => sameId(tag.id, id)) ?? { id, name: id }
      )
    })
  }
  /** :return: 无返回值。 */
  function discardRecoverySnapshot(): void {
    if (activeNote.value) sessionStorage.removeItem(`noteContentCache_${activeNote.value.id}`)
    recoverySnapshot.value = null
    hasRecoverySnapshot.value = false
  }

  /**
   * 置顶笔记。
   *
   * :param noteId: 笔记标识。
   * :param isPinned: 目标状态。
   * :return: 是否操作成功。
   */
  async function setPinned(noteId: ApiId, isPinned: boolean): Promise<boolean> {
    actionError.value = ''
    const previousNote = notes.value.find((note) => sameId(note.id, noteId))
    try {
      await noteApi.setPinned(noteId, isPinned)
      notes.value = notes.value
        .map((note) => (sameId(note.id, noteId) ? { ...note, isPinned } : note))
        .sort((left, right) => Number(right.isPinned) - Number(left.isPinned))
      if (sameId(activeNote.value?.id, noteId))
        activeNote.value = { ...activeNote.value!, isPinned }
      if (previousNote && previousNote.isPinned !== isPinned) {
        navigationCounts.value = {
          ...navigationCounts.value,
          pinned: Math.max(0, navigationCounts.value.pinned + (isPinned ? 1 : -1))
        }
      }
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }

  /**
   * 删除当前或指定笔记。
   *
   * :param noteId: 笔记标识。
   * :return: 是否操作成功。
   */
  async function removeNote(noteId: ApiId): Promise<boolean> {
    actionError.value = ''
    const deletingActive = sameId(activeNote.value?.id, noteId)
    const removedNote = notes.value.find((note) => sameId(note.id, noteId))
    if (deletingActive) {
      editorLocked.value = true
      await closeAutosaveSession()
    }
    try {
      await noteApi.remove(noteId)
      if (!filter.value.isDeleted)
        notes.value = notes.value.filter((note) => !sameId(note.id, noteId))
      if (sameId(activeNote.value?.id, noteId)) {
        activeNote.value = null
        saveStatus.value = 'idle'
        recoverySnapshot.value = null
        hasRecoverySnapshot.value = false
      }
      if (!filter.value.isDeleted && removedNote) {
        navigationCounts.value = {
          all: Math.max(0, navigationCounts.value.all - 1),
          pinned: Math.max(0, navigationCounts.value.pinned - Number(removedNote.isPinned)),
          recycle: navigationCounts.value.recycle + 1
        }
      }
      editorLocked.value = false
      return true
    } catch (error) {
      if (deletingActive && activeNote.value) startAutosaveSession(activeNote.value)
      editorLocked.value = false
      setError(error)
      return false
    }
  }
  /**
   * 恢复笔记。
   *
   * :param noteId: 笔记标识。
   * :return: 是否操作成功。
   */
  async function restoreNote(noteId: ApiId): Promise<boolean> {
    actionError.value = ''
    const restoredNote = notes.value.find((note) => sameId(note.id, noteId))
    try {
      await noteApi.restore(noteId)
      if (filter.value.isDeleted)
        notes.value = notes.value.filter((note) => !sameId(note.id, noteId))
      if (filter.value.isDeleted && restoredNote) {
        navigationCounts.value = {
          all: navigationCounts.value.all + 1,
          pinned: navigationCounts.value.pinned + Number(restoredNote.isPinned),
          recycle: Math.max(0, navigationCounts.value.recycle - 1)
        }
      }
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }
  /**
   * 永久删除笔记。
   *
   * :param noteId: 笔记标识。
   * :return: 是否操作成功。
   */
  async function permanentDeleteNote(noteId: ApiId): Promise<boolean> {
    actionError.value = ''
    const deletingActive = sameId(activeNote.value?.id, noteId)
    if (deletingActive) {
      editorLocked.value = true
      await closeAutosaveSession()
    }
    try {
      await noteApi.permanentDelete(noteId)
      notes.value = notes.value.filter((note) => !sameId(note.id, noteId))
      if (filter.value.isDeleted) {
        navigationCounts.value = {
          ...navigationCounts.value,
          recycle: Math.max(0, navigationCounts.value.recycle - 1)
        }
      }
      if (sameId(activeNote.value?.id, noteId)) {
        activeNote.value = null
        saveStatus.value = 'idle'
      }
      editorLocked.value = false
      return true
    } catch (error) {
      if (deletingActive && activeNote.value) startAutosaveSession(activeNote.value)
      editorLocked.value = false
      setError(error)
      return false
    }
  }

  /**
   * 新建文件夹。
   *
   * :param name: 文件夹名称。
   * :return: 是否操作成功。
   */
  async function createFolder(name: string, parentId: ApiId | null = null): Promise<boolean> {
    actionError.value = ''
    try {
      const response = await noteFolderApi.create({ name, parentId })
      folders.value = [...folders.value, response.data]
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }
  /**
   * 重命名文件夹。
   *
   * :param folderId: 文件夹标识。
   * :param name: 新名称。
   * :return: 是否操作成功。
   */
  async function renameFolder(folderId: ApiId, name: string): Promise<boolean> {
    actionError.value = ''
    try {
      await noteFolderApi.rename(folderId, { name })
      folders.value = folders.value.map((folder) =>
        sameId(folder.id, folderId) ? { ...folder, name } : folder
      )
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }
  /**
   * 删除文件夹。
   *
   * :param folderId: 文件夹标识。
   * :return: 是否操作成功。
   */
  async function removeFolder(folderId: ApiId): Promise<boolean> {
    actionError.value = ''
    try {
      await noteFolderApi.remove(folderId)
      const removedIds = new Set<string>()
      const pending = [folderId]
      while (pending.length) {
        const currentId = pending.pop()!
        removedIds.add(String(currentId))
        folders.value
          .filter((folder) => sameId(folder.parentId, currentId))
          .forEach((folder) => pending.push(folder.id))
      }
      const removedNotes = notes.value.filter((note) => removedIds.has(String(note.folderId)))
      folders.value = folders.value.filter((folder) => !removedIds.has(String(folder.id)))
      notes.value = notes.value.filter((note) => !removedIds.has(String(note.folderId)))
      navigationCounts.value = {
        all: Math.max(0, navigationCounts.value.all - removedNotes.length),
        pinned: Math.max(
          0,
          navigationCounts.value.pinned - removedNotes.filter((note) => note.isPinned).length
        ),
        recycle: navigationCounts.value.recycle + removedNotes.length
      }
      if (activeNote.value && removedIds.has(String(activeNote.value.folderId))) {
        await closeAutosaveSession()
        activeNote.value = null
      }
      if (sameId(filter.value.folderId, folderId)) await showAll()
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }

  /**
   * 恢复回收站中的文件夹子树。
   *
   * :param folderId: 根文件夹标识。
   * :return: 是否操作成功。
   */
  async function restoreFolder(folderId: ApiId): Promise<boolean> {
    actionError.value = ''
    try {
      await noteFolderApi.restore(folderId)
      const folderResponse = await noteFolderApi.getAll(true)
      folders.value = folderResponse.data
      await loadNotes()
      const [allCountResponse, pinnedCountResponse] = await Promise.all([
        noteApi.getPageList(1, 1, { isDeleted: false }),
        noteApi.getPageList(1, 1, { isDeleted: false, isPinned: true })
      ])
      navigationCounts.value = {
        ...navigationCounts.value,
        all: allCountResponse.data.total,
        pinned: pinnedCountResponse.data.total
      }
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }

  /**
   * 永久删除回收站中的文件夹子树。
   *
   * :param folderId: 根文件夹标识。
   * :return: 是否操作成功。
   */
  async function permanentDeleteFolder(folderId: ApiId): Promise<boolean> {
    actionError.value = ''
    try {
      await noteFolderApi.permanentDelete(folderId)
      const folderResponse = await noteFolderApi.getAll(true)
      folders.value = folderResponse.data
      await loadNotes()
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }
  /**
   * 排序文件夹。
   *
   * :param folderIds: 新顺序。
   * :return: 是否操作成功。
   */
  async function sortFolders(folderIds: ApiId[]): Promise<boolean> {
    actionError.value = ''
    try {
      await noteFolderApi.sort(folderIds)
      folders.value = folderIds
        .map((id, index) => {
          const folder = folders.value.find((item) => sameId(item.id, id))
          return folder ? { ...folder, sortOrder: index + 1 } : null
        })
        .filter((item): item is INoteFolder => item !== null)
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }
  /**
   * 新建标签。
   *
   * :param name: 标签名称。
   * :return: 是否操作成功。
   */
  async function createTag(name: string): Promise<boolean> {
    actionError.value = ''
    try {
      const response = await noteTagApi.create({ name })
      tags.value = [...tags.value, response.data]
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }
  /**
   * 重命名标签。
   *
   * :param tagId: 标签标识。
   * :param name: 新名称。
   * :return: 是否操作成功。
   */
  async function renameTag(tagId: ApiId, name: string): Promise<boolean> {
    actionError.value = ''
    try {
      await noteTagApi.rename(tagId, { name })
      tags.value = tags.value.map((tag) => (sameId(tag.id, tagId) ? { ...tag, name } : tag))
      const rename = (tag: INoteTag) => (sameId(tag.id, tagId) ? { ...tag, name } : tag)
      notes.value = notes.value.map((note) => ({ ...note, tagList: note.tagList.map(rename) }))
      if (activeNote.value)
        activeNote.value = { ...activeNote.value, tagList: activeNote.value.tagList.map(rename) }
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }
  /**
   * 删除标签。
   *
   * :param tagId: 标签标识。
   * :return: 是否操作成功。
   */
  async function removeTag(tagId: ApiId): Promise<boolean> {
    actionError.value = ''
    try {
      await noteTagApi.remove(tagId)
      tags.value = tags.value.filter((tag) => !sameId(tag.id, tagId))
      notes.value = notes.value.map((note) => ({
        ...note,
        tagList: note.tagList.filter((tag) => !sameId(tag.id, tagId))
      }))
      if (activeNote.value && activeNote.value.tagList.some((tag) => sameId(tag.id, tagId)))
        updateActiveNote({
          tagList: activeNote.value.tagList.filter((tag) => !sameId(tag.id, tagId))
        })
      if (sameId(filter.value.tagId, tagId)) await showAll()
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }

  /**
   * 销毁搜索与保存会话，并使在途响应失效。
   *
   * :return: 无返回值。
   */
  function dispose(): void {
    storeGeneration += 1
    listRequestId += 1
    detailRequestId += 1
    autosaveSession?.controller.destroy()
    autosaveSession = undefined
    clearRememberedNoteDetails()
  }

  return {
    folders,
    tags,
    notes,
    navigationCounts,
    visibleNotes,
    activeNote,
    filter,
    saveStatus,
    loading,
    actionError,
    hasRecoverySnapshot,
    editorLocked,
    isRecycleBin,
    loadWorkspace,
    loadNotes,
    selectNote,
    createNote,
    setFilter,
    search,
    showAll,
    showPinned,
    showRecycleBin,
    selectFolder,
    selectTag,
    updateActiveNote,
    saveSnapshot,
    retrySave,
    saveNow,
    restoreHistory,
    restoreRecoverySnapshot,
    discardRecoverySnapshot,
    setPinned,
    removeNote,
    restoreNote,
    permanentDeleteNote,
    restoreFolder,
    permanentDeleteFolder,
    createFolder,
    renameFolder,
    removeFolder,
    sortFolders,
    createTag,
    renameTag,
    removeTag,
    dispose
  }
})
