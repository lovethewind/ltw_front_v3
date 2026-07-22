import type { ApiId, INoteFolder, INoteListItem } from '@/interface/note'

export interface NoteExplorerNode {
  key: string
  type: 'folder' | 'note'
  label: string
  folderId: ApiId | null
  note?: INoteListItem
  folder?: INoteFolder
  virtual?: boolean
  deletionRoot?: boolean
  managedByFolder?: boolean
  children?: NoteExplorerNode[]
}

interface BuildNoteExplorerTreeOptions {
  folders: INoteFolder[]
  notes: INoteListItem[]
  isDeleted: boolean
  isFilteredView: boolean
}

export interface FolderTreeNodeState {
  expanded: boolean
  expand: () => void
  collapse: () => void
}

/**
 * 切换文件夹树节点的展开状态。
 *
 * :param treeNode: Element Plus 目录树节点状态。
 * :return: 无返回值。
 */
export function toggleFolderExpansion(treeNode: FolderTreeNodeState): void {
  if (treeNode.expanded) treeNode.collapse()
  else treeNode.expand()
}

/**
 * 获取目标文件夹从根节点到自身的展开键路径。
 *
 * :param folders: 全部文件夹。
 * :param folderId: 目标文件夹标识；空值表示未分类。
 * :return: 需要展开的文件夹节点键。
 */
export function getFolderPathKeys(
  folders: INoteFolder[],
  folderId: ApiId | null
): string[] {
  if (folderId === null) return ['folder-unclassified']
  const foldersById = new Map(folders.map((folder) => [String(folder.id), folder]))
  const path: string[] = []
  const visited = new Set<string>()
  let current = foldersById.get(String(folderId))
  while (current && !visited.has(String(current.id))) {
    visited.add(String(current.id))
    path.unshift(`folder-${current.id}`)
    current = current.parentId === null
      ? undefined
      : foldersById.get(String(current.parentId))
  }
  return path
}

/**
 * 统计每个文件夹及其父级路径包含的笔记数量。
 *
 * :param folders: 全部文件夹。
 * :param notes: 当前视图中的笔记列表。
 * :return: 以目录树节点键为索引的笔记数量。
 */
export function buildFolderNoteCounts(
  folders: INoteFolder[],
  notes: INoteListItem[]
): Map<string, number> {
  const counts = new Map<string, number>()
  notes.forEach((note) => {
    getFolderPathKeys(folders, note.folderId).forEach((key) => {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
  })
  return counts
}

/**
 * 统计每个标签关联的笔记数量。
 *
 * :param notes: 当前视图中的笔记列表。
 * :return: 以标签标识为索引的笔记数量。
 */
export function buildTagNoteCounts(notes: INoteListItem[]): Map<string, number> {
  const counts = new Map<string, number>()
  notes.forEach((note) => {
    note.tagList.forEach((tag) => {
      const key = String(tag.id)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
  })
  return counts
}

/**
 * 递归移除不包含笔记的文件夹分支。
 *
 * :param nodes: 待处理的目录树节点。
 * :return: 仅保留包含笔记路径的目录树节点。
 */
function pruneEmptyFolders(nodes: NoteExplorerNode[]): NoteExplorerNode[] {
  return nodes.flatMap((node) => {
    if (node.type === 'note') return [node]
    const children = pruneEmptyFolders(node.children ?? [])
    return children.length ? [{ ...node, children }] : []
  })
}

/**
 * 构建笔记侧栏目录树，并在筛选视图中隐藏没有匹配笔记的目录分支。
 *
 * :param options: 文件夹、可见笔记和当前视图状态。
 * :return: 可直接交给目录树组件渲染的节点列表。
 */
export function buildNoteExplorerTree(options: BuildNoteExplorerTreeOptions): NoteExplorerNode[] {
  const { folders, notes, isDeleted, isFilteredView } = options
  const folderNodes = new Map<string, NoteExplorerNode>()
  const rootNodes: NoteExplorerNode[] = []
  folders.forEach((folder) => {
    folderNodes.set(String(folder.id), {
      key: `folder-${folder.id}`,
      type: 'folder',
      label: folder.name,
      folderId: folder.id,
      folder,
      children: []
    })
  })
  folders.forEach((folder) => {
    const node = folderNodes.get(String(folder.id))!
    const parent = folder.parentId === null ? undefined : folderNodes.get(String(folder.parentId))
    const belongsToSameDeletion =
      !isDeleted || String(folder.deletedRootId) === String(parent?.folder?.deletedRootId)
    if (parent && belongsToSameDeletion) {
      parent.children!.push(node)
    } else {
      node.deletionRoot = isDeleted
      rootNodes.push(node)
    }
  })
  const unclassifiedNotes: NoteExplorerNode[] = []
  notes.forEach((note) => {
    const node: NoteExplorerNode = {
      key: `note-${note.id}`,
      type: 'note',
      label: note.title || '无标题笔记',
      folderId: note.folderId,
      note,
      managedByFolder: folderNodes.has(String(note.folderId))
    }
    const folder = note.folderId === null ? undefined : folderNodes.get(String(note.folderId))
    if (folder) folder.children!.push(node)
    else unclassifiedNotes.push(node)
  })
  if (unclassifiedNotes.length || (!isDeleted && !isFilteredView)) {
    rootNodes.unshift({
      key: 'folder-unclassified',
      type: 'folder',
      label: isDeleted ? '其他已删除笔记' : '未分类',
      folderId: null,
      virtual: true,
      children: unclassifiedNotes
    })
  }
  return isFilteredView ? pruneEmptyFolders(rootNodes) : rootNodes
}
