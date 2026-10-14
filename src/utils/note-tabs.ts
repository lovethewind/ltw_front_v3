/**
 * 笔记多标签页的纯逻辑。
 *
 * ## 与桌面端的关系
 *
 * 本模块是桌面端 `ltw_notes_desktop/src/utils/note-tabs.ts` 的移植版，函数签名与行为
 * 一一对应 —— 同一套「打开/关闭/置顶/溢出」规则在两端应当给出相同结果。
 * 后续若要调整标签行为，两端应同步改，别只动一边。
 *
 * ## 为什么单独成模块
 *
 * 标签的增删改与排序都是**纯逻辑**（不碰 DOM、不碰请求），按项目既有约定
 * （见 `src/utils/note-navigation.ts` 与 `src/components/note/note-navigation.spec.ts`），
 * 这类逻辑要用**真实行为断言**守住，而不是对 `.vue` 源码做正则匹配。
 */

/** 标签页状态：打开的笔记顺序与当前激活的笔记。 */
export interface NoteTabsState {
  noteIds: string[]
  activeNoteId: string | null
}

/** 可见标签与溢出标签的拆分结果。 */
export interface PartitionedNoteTabs {
  visibleNoteIds: string[]
  overflowNoteIds: string[]
}

/** 带置顶信息的标签页状态。 */
export interface PinnedNoteTabsState {
  noteIds: string[]
  pinnedNoteIds: string[]
}

/**
 * 在当前标签中打开笔记，已打开的笔记直接切换。
 *
 * 置顶标签不会被顶掉：当前标签是置顶标签时改为**追加**一个新标签。
 *
 * :param state: 当前标签状态。
 * :param noteId: 待打开的笔记 ID。
 * :param pinnedNoteIds: 置顶标签 ID。
 * :return: 更新后的标签状态。
 */
export function activateNoteInCurrentTab(
  state: NoteTabsState,
  noteId: string,
  pinnedNoteIds: string[] = []
): NoteTabsState {
  if (state.noteIds.includes(noteId)) {
    return { noteIds: [...state.noteIds], activeNoteId: noteId }
  }
  const activeIndex = state.activeNoteId ? state.noteIds.indexOf(state.activeNoteId) : -1
  if (state.activeNoteId && pinnedNoteIds.includes(state.activeNoteId)) {
    return { noteIds: [...state.noteIds, noteId], activeNoteId: noteId }
  }
  if (activeIndex < 0) {
    return { noteIds: [...state.noteIds, noteId], activeNoteId: noteId }
  }
  const noteIds = [...state.noteIds]
  noteIds[activeIndex] = noteId
  return { noteIds, activeNoteId: noteId }
}

/**
 * 在新标签中打开笔记，已打开的笔记直接切换。
 *
 * :param state: 当前标签状态。
 * :param noteId: 待打开的笔记 ID。
 * :return: 更新后的标签状态。
 */
export function activateNoteInNewTab(state: NoteTabsState, noteId: string): NoteTabsState {
  const noteIds = state.noteIds.includes(noteId) ? [...state.noteIds] : [...state.noteIds, noteId]
  return { noteIds, activeNoteId: noteId }
}

/**
 * 固定或取消固定标签，并维持固定标签在左侧。
 *
 * :param state: 当前标签状态。
 * :param noteId: 待切换置顶状态的笔记 ID。
 * :return: 更新后的标签状态。
 */
export function togglePinnedNoteTab(
  state: PinnedNoteTabsState,
  noteId: string
): PinnedNoteTabsState {
  if (!state.noteIds.includes(noteId)) {
    return { noteIds: [...state.noteIds], pinnedNoteIds: [...state.pinnedNoteIds] }
  }
  const pinnedSet = new Set(state.pinnedNoteIds.filter((id) => state.noteIds.includes(id)))
  if (pinnedSet.has(noteId)) pinnedSet.delete(noteId)
  else pinnedSet.add(noteId)
  const pinnedNoteIds = state.noteIds.filter((id) => pinnedSet.has(id))
  const regularNoteIds = state.noteIds.filter((id) => !pinnedSet.has(id))
  return { noteIds: [...pinnedNoteIds, ...regularNoteIds], pinnedNoteIds }
}

/**
 * 在固定或普通标签分组内部拖动排序。
 *
 * 跨分组拖动是**无效操作**（被拖动者原样返回）：置顶标签恒在左侧，靠拖动越过边界会
 * 让分组语义自相矛盾。
 *
 * :param state: 当前标签状态。
 * :param sourceNoteId: 被拖动的笔记 ID。
 * :param targetNoteId: 落点笔记 ID。
 * :return: 更新后的标签状态。
 */
export function reorderNoteTabs(
  state: PinnedNoteTabsState,
  sourceNoteId: string,
  targetNoteId: string
): PinnedNoteTabsState {
  const sourceIndex = state.noteIds.indexOf(sourceNoteId)
  const targetIndex = state.noteIds.indexOf(targetNoteId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceNoteId === targetNoteId) {
    return { noteIds: [...state.noteIds], pinnedNoteIds: [...state.pinnedNoteIds] }
  }
  const pinnedSet = new Set(state.pinnedNoteIds)
  if (pinnedSet.has(sourceNoteId) !== pinnedSet.has(targetNoteId)) {
    return { noteIds: [...state.noteIds], pinnedNoteIds: [...state.pinnedNoteIds] }
  }
  const noteIds = [...state.noteIds]
  noteIds.splice(sourceIndex, 1)
  noteIds.splice(noteIds.indexOf(targetNoteId), 0, sourceNoteId)
  return {
    noteIds,
    pinnedNoteIds: noteIds.filter((id) => pinnedSet.has(id))
  }
}

/**
 * 关闭指定标签，关闭当前标签时优先选择其右侧相邻标签。
 *
 * :param state: 当前标签状态。
 * :param noteId: 待关闭的笔记 ID。
 * :return: 更新后的标签状态。
 */
export function closeNoteTab(state: NoteTabsState, noteId: string): NoteTabsState {
  const closingIndex = state.noteIds.indexOf(noteId)
  if (closingIndex < 0) return { noteIds: [...state.noteIds], activeNoteId: state.activeNoteId }
  const noteIds = state.noteIds.filter((id) => id !== noteId)
  if (state.activeNoteId !== noteId) return { noteIds, activeNoteId: state.activeNoteId }
  return { noteIds, activeNoteId: noteIds[closingIndex] ?? noteIds.at(-1) ?? null }
}

/**
 * 移除已不存在或已删除笔记对应的标签。
 *
 * :param state: 当前标签状态。
 * :param availableNoteIds: 当前仍可打开的笔记 ID。
 * :return: 更新后的标签状态。
 */
export function reconcileNoteTabs(
  state: NoteTabsState,
  availableNoteIds: string[]
): NoteTabsState {
  const availableIdSet = new Set(availableNoteIds)
  const noteIds = state.noteIds.filter((id) => availableIdSet.has(id))
  const activeNoteId =
    state.activeNoteId && availableIdSet.has(state.activeNoteId)
      ? state.activeNoteId
      : noteIds[0] ?? null
  return { noteIds, activeNoteId }
}

/**
 * 只保留指定标签并关闭其他标签。
 *
 * :param state: 当前标签状态。
 * :param noteId: 需要保留的笔记 ID。
 * :param pinnedNoteIds: 不受「关闭其他」影响的固定标签 ID。
 * :return: 更新后的标签状态。
 */
export function closeOtherNoteTabs(
  state: NoteTabsState,
  noteId: string,
  pinnedNoteIds: string[] = []
): NoteTabsState {
  if (!state.noteIds.includes(noteId)) {
    return { noteIds: [...state.noteIds], activeNoteId: state.activeNoteId }
  }
  const pinnedSet = new Set(pinnedNoteIds)
  const noteIds = state.noteIds.filter((id) => id === noteId || pinnedSet.has(id))
  return { noteIds, activeNoteId: noteId }
}

/**
 * 关闭指定标签右侧的所有标签。
 *
 * :param state: 当前标签状态。
 * :param noteId: 边界标签对应的笔记 ID。
 * :return: 更新后的标签状态。
 */
export function closeNoteTabsToRight(state: NoteTabsState, noteId: string): NoteTabsState {
  const noteIndex = state.noteIds.indexOf(noteId)
  if (noteIndex < 0) return { noteIds: [...state.noteIds], activeNoteId: state.activeNoteId }
  const noteIds = state.noteIds.slice(0, noteIndex + 1)
  const activeNoteId =
    state.activeNoteId && noteIds.includes(state.activeNoteId) ? state.activeNoteId : noteId
  return { noteIds, activeNoteId }
}

/**
 * 按可用数量拆分可见标签与溢出标签，并优先保证当前标签可见。
 *
 * :param noteIds: 全部标签对应的笔记 ID。
 * :param activeNoteId: 当前标签对应的笔记 ID。
 * :param maxVisible: 最多可见的标签数量。
 * :return: 可见和溢出的标签 ID。
 */
export function partitionNoteTabs(
  noteIds: string[],
  activeNoteId: string | null,
  maxVisible: number
): PartitionedNoteTabs {
  const visibleCount = Math.max(1, maxVisible)
  if (noteIds.length <= visibleCount) {
    return { visibleNoteIds: [...noteIds], overflowNoteIds: [] }
  }
  const activeIndex = activeNoteId ? noteIds.indexOf(activeNoteId) : 0
  const startIndex = Math.min(
    Math.max(0, activeIndex - visibleCount + 1),
    noteIds.length - visibleCount
  )
  const visibleNoteIds = noteIds.slice(startIndex, startIndex + visibleCount)
  const visibleIdSet = new Set(visibleNoteIds)
  return {
    visibleNoteIds,
    overflowNoteIds: noteIds.filter((noteId) => !visibleIdSet.has(noteId))
  }
}
