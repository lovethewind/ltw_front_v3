/**
 * 全库快速打开（Quick Open）的纯逻辑。
 *
 * ## 与桌面端的关系
 *
 * 桌面端 `QuickOpenDialog.vue` 的候选与打分在组件内实现，数据源是本地 SQLite
 * （`window.notesDesktop.searchNotes`）。网页端**没有本地库**，但目录树本来就是把
 * 全部笔记一次拉进 `store.notes`（见 `src/stores/note.ts` 的 `fetchAllNotes`），
 * 且列表项自带完整正文（`contentPreview` 即 `content`），所以这里**纯本地过滤**即可，
 * 不额外发请求 —— 打开面板零延迟，也不受当前目录筛选影响。
 *
 * ## 与 `formatNoteExcerpt` 的关系
 *
 * 摘要统一走左栏同款 `formatNoteExcerpt`（去 HTML、压空白）。理由：快速打开列表与
 * 左栏列表视觉同构，两边摘要口径必须一致，否则同一篇笔记在两处显示不同文字很怪。
 *
 * ## 为什么单独成模块
 *
 * 打分、子树展开、时间过滤都是**纯逻辑**（不碰 DOM、不碰请求），按项目既有约定
 * （见 `src/utils/note-tabs.ts`、`src/components/note/note-navigation.ts`），
 * 这类逻辑要用**真实行为断言**守住，而不是对 `.vue` 源码做正则匹配。
 */
import type { ApiId, INoteFolder, INoteListItem } from '@/interface/note'
import { formatNoteExcerpt } from '@/components/note/note-navigation'

/** 「最近更新」时间范围（与桌面端下拉一致）。 */
export type QuickOpenUpdatedWithin = 'all' | '7' | '30' | '365'

/** 快速打开的筛选条件。 */
export interface QuickOpenFilters {
  keyword: string
  folderId: ApiId | null
  tagId: ApiId | null
  updatedWithin: QuickOpenUpdatedWithin
  pinnedOnly: boolean
}

/** 一条快速打开结果。 */
export interface QuickOpenResult {
  note: INoteListItem
  folderPath: string
  excerpt: string
  contentMatched: boolean
}

/** 结果条数上限（与桌面端一致）。 */
export const QUICK_OPEN_RESULT_LIMIT = 12

/** 默认（空）筛选条件。 */
export function createQuickOpenFilters(): QuickOpenFilters {
  return { keyword: '', folderId: null, tagId: null, updatedWithin: 'all', pinnedOnly: false }
}

/**
 * 判断筛选条件是否为空（关键词与四个筛选项全空）。
 *
 * :param filters: 筛选条件。
 * :return: 全空返回 true。
 */
export function isEmptyQuickOpenFilter(filters: QuickOpenFilters): boolean {
  return (
    filters.keyword.trim() === '' &&
    !filters.folderId &&
    !filters.tagId &&
    filters.updatedWithin === 'all' &&
    !filters.pinnedOnly
  )
}

/**
 * 生成笔记所在文件夹的完整路径。
 *
 * :param folderId: 笔记所属文件夹；空值表示未分类。
 * :param folders: 当前账号的全部文件夹。
 * :param uncategorizedLabel: 未分类的展示名（对齐侧栏用词）。
 * :return: `父 / 子` 形式的路径，未分类时返回未分类标签。
 */
export function buildFolderPath(
  folderId: ApiId | null,
  folders: INoteFolder[],
  uncategorizedLabel = '未分类'
): string {
  if (folderId === null || folderId === undefined || folderId === '' || folderId === 0) {
    return uncategorizedLabel
  }
  const folderById = new Map(folders.map((folder) => [String(folder.id), folder]))
  const names: string[] = []
  const visited = new Set<string>()
  let currentId: string | null = String(folderId)
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const folder = folderById.get(currentId)
    if (!folder || folder.isDeleted) break
    names.unshift(folder.name)
    currentId = folder.parentId === null || folder.parentId === undefined ? null : String(folder.parentId)
  }
  return names.join(' / ') || uncategorizedLabel
}

/**
 * 展开某个文件夹及其全部子文件夹的标识集合。
 *
 * 与侧栏目录语义一致：按父文件夹筛选要**覆盖整棵子树**，而不是只匹配直接归属。
 *
 * :param rootId: 根文件夹标识。
 * :param folders: 全部文件夹。
 * :return: 含根在内的子树标识字符串集合。
 */
export function collectSubtreeFolderIds(rootId: ApiId, folders: INoteFolder[]): Set<string> {
  const selected = new Set<string>([String(rootId)])
  let changed = true
  while (changed) {
    changed = false
    for (const folder of folders) {
      if (folder.isDeleted) continue
      if (folder.parentId === null || folder.parentId === undefined) continue
      const parentId = String(folder.parentId)
      const id = String(folder.id)
      if (selected.has(parentId) && !selected.has(id)) {
        selected.add(id)
        changed = true
      }
    }
  }
  return selected
}

/** 单条笔记的搜索文本与打分（拆出来便于测试覆盖）。 */
interface ScoredNote {
  note: INoteListItem
  folderPath: string
  excerpt: string
  contentMatched: boolean
  searchText: string
  score: number
}

/**
 * 把「时间范围」选项换算成毫秒下限。
 *
 * :param updatedWithin: 时间范围选项。
 * :return: 距当前时间的毫秒数；`all` 时返回 0。
 */
export function quickOpenUpdatedWithinMs(updatedWithin: QuickOpenUpdatedWithin): number {
  if (updatedWithin === 'all') return 0
  return Number(updatedWithin) * 24 * 60 * 60 * 1000
}

/**
 * 计算快速打开的候选结果。
 *
 * 打分与桌面端 `QuickOpenDialog.vue` 一致：标题命中权重最高，其次标签、文件夹路径、
 * 正文。同分时按更新时间倒序；结果条数截断到 `QUICK_OPEN_RESULT_LIMIT`。
 *
 * @param notes 全库笔记列表（网页端即 `store.notes`）。
 * @param folders 全部文件夹。
 * @param filters 筛选条件。
 * @param now 当前时间戳（测试可注入固定值）。
 * @returns 排序后的结果数组。
 */
export function buildQuickOpenResults(
  notes: INoteListItem[],
  folders: INoteFolder[],
  filters: QuickOpenFilters,
  now: number = Date.now()
): QuickOpenResult[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase()
  const subtreeIds = filters.folderId ? collectSubtreeFolderIds(filters.folderId, folders) : null
  const updatedAfterMs = quickOpenUpdatedWithinMs(filters.updatedWithin)

  const scored: ScoredNote[] = []
  for (const note of notes) {
    if (subtreeIds) {
      const noteFolderId = note.folderId === null || note.folderId === undefined ? '' : String(note.folderId)
      if (!noteFolderId || !subtreeIds.has(noteFolderId)) continue
    }
    if (filters.tagId) {
      const tagIds = note.tagList.map((tag) => String(tag.id))
      if (!tagIds.includes(String(filters.tagId))) continue
    }
    if (filters.pinnedOnly && !note.isPinned) continue
    if (updatedAfterMs > 0) {
      const updatedAt = Date.parse(note.updateTime)
      if (!Number.isFinite(updatedAt) || now - updatedAt > updatedAfterMs) continue
    }

    const folderPath = buildFolderPath(note.folderId, folders)
    const content = note.contentPreview ?? ''
    const searchText = [
      note.title,
      content,
      note.tagList.map((tag) => tag.name).join(' '),
      folderPath
    ]
      .join(' ')
      .toLocaleLowerCase()

    if (keyword && !searchText.includes(keyword)) continue

    const score = keyword
      ? Number(note.title.toLocaleLowerCase().includes(keyword)) * 4 +
        Number(note.tagList.some((tag) => tag.name.toLocaleLowerCase().includes(keyword))) * 3 +
        Number(folderPath.toLocaleLowerCase().includes(keyword)) * 2 +
        Number(content.toLocaleLowerCase().includes(keyword))
      : 0

    scored.push({
      note,
      folderPath,
      excerpt: formatNoteExcerpt(content),
      contentMatched: Boolean(keyword && content.toLocaleLowerCase().includes(keyword)),
      searchText,
      score
    })
  }

  return scored
    .sort(
      (left, right) =>
        right.score - left.score ||
        Date.parse(right.note.updateTime) - Date.parse(left.note.updateTime)
    )
    .slice(0, QUICK_OPEN_RESULT_LIMIT)
    .map(({ note, folderPath, excerpt, contentMatched }) => ({
      note,
      folderPath,
      excerpt,
      contentMatched
    }))
}
