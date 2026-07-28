<template>
  <aside class="note-sidebar" aria-label="笔记资源目录">
    <div class="note-sidebar-fixed">
      <div class="note-sidebar-toolbar" :class="{ 'is-recycle': filter.isDeleted }">
        <el-dropdown
          v-if="!filter.isDeleted"
          class="note-sidebar-create-dropdown"
          popper-class="note-resource-popper"
          trigger="click"
          @command="(command: string) => handleCreateCommand(command, null)"
        >
          <el-button class="note-sidebar-create" type="primary">
            <Icon icon="material-symbols:add-rounded" />
            新建
            <Icon icon="material-symbols:keyboard-arrow-down-rounded" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="note">
                <Icon icon="material-symbols:description-outline-rounded" />
                新建笔记
              </el-dropdown-item>
              <el-dropdown-item command="folder">
                <Icon icon="material-symbols:create-new-folder-outline-rounded" />
                新建文件夹
              </el-dropdown-item>
              <el-dropdown-item command="tag">
                <Icon icon="material-symbols:new-label-outline-rounded" />
                新建标签
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-input
          :model-value="filter.keyword ?? ''"
          clearable
          placeholder="搜索笔记"
          aria-label="搜索笔记"
          @input="emit('search', String($event))"
        >
          <template #prefix>
            <Icon icon="material-symbols:search-rounded" />
          </template>
        </el-input>
      </div>

      <NoteNavigation
        class="note-sidebar-nav"
        :active="navigationActive"
        :counts="{ all: counts.all, pinned: counts.pinned, trash: counts.recycle }"
        @select="selectNavigation"
      />
    </div>

    <section class="note-sidebar-section note-sidebar-explorer">
      <div class="note-sidebar-section__heading">
        <h2>{{ filter.isDeleted ? '已删除项目' : '文件夹' }}</h2>
        <el-button
          v-if="!filter.isDeleted"
          text
          circle
          aria-label="快捷新建文件夹"
          @click="handleCreateCommand('folder', null)"
        >
          <Icon icon="material-symbols:create-new-folder-outline-rounded" />
        </el-button>
      </div>
      <div v-if="loading" class="note-sidebar-state">正在加载…</div>
      <div v-else-if="error" class="note-sidebar-state is-error">
        <span>{{ error }}</span>
        <el-button text type="primary" @click="emit('retry')">重试</el-button>
      </div>
      <el-tree
        v-else
        class="note-resource-tree"
        :data="treeData"
        :current-node-key="currentNodeKey"
        :default-expanded-keys="expandedFolderKeys"
        node-key="key"
        highlight-current
        :expand-on-click-node="false"
        :indent="10"
        empty-text="暂无笔记"
        @node-click="selectTreeNode"
        @node-expand="rememberExpandedFolder"
        @node-collapse="forgetExpandedFolder"
      >
        <template #default="{ data }">
          <el-dropdown
            class="note-resource-node-context"
            popper-class="note-resource-popper"
            trigger="contextmenu"
            :disabled="filter.isDeleted && (data.type === 'folder' ? !data.deletionRoot : data.managedByFolder)"
            @contextmenu.capture="dismissOpenDropdowns"
            @command="(command: string) => handleContextCommand(command, data)"
          >
            <div class="note-resource-node" :class="`is-${data.type}`">
              <Icon
                class="note-resource-node__icon"
                :icon="data.type === 'folder'
                  ? data.virtual
                    ? 'tabler:folder-question'
                    : expandedFolderKeys.includes(data.key)
                    ? 'material-symbols:folder-open-outline-rounded'
                    : 'material-symbols:folder-outline-rounded'
                  : data.note?.isPinned && !filter.isDeleted
                    ? 'material-symbols:keep-rounded'
                    : 'material-symbols:description-outline-rounded'"
              />
              <span v-if="data.type === 'folder'" class="note-resource-node__label" :title="data.label">
                {{ data.label }}
              </span>
              <span v-else class="note-resource-node__copy">
                <strong class="note-resource-node__label" :title="data.label">{{ data.label }}</strong>
                <small>{{ formatNoteExcerpt(data.note?.contentPreview ?? '') }}</small>
              </span>
              <small v-if="data.type === 'folder'" class="note-resource-node__count">
                {{ folderNoteCount(data.key) }}
              </small>
              <time v-else-if="data.note" :datetime="data.note.updateTime">
                {{ formatNoteUpdatedTime(data.note.updateTime) }}
              </time>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <template v-if="data.type === 'folder'">
                  <template v-if="filter.isDeleted">
                    <el-dropdown-item command="restore">
                      <Icon icon="material-symbols:restore-from-trash-outline-rounded" />
                      恢复整个文件夹
                    </el-dropdown-item>
                    <el-dropdown-item class="is-danger" command="permanent" divided>
                      <Icon icon="material-symbols:delete-forever-rounded" />
                      彻底删除整个文件夹
                    </el-dropdown-item>
                  </template>
                  <template v-else>
                    <el-dropdown-item command="create-note">
                      <Icon icon="material-symbols:note-add-outline-rounded" />
                      新建笔记
                    </el-dropdown-item>
                    <el-dropdown-item v-if="!data.virtual" command="create-folder">
                      <Icon icon="material-symbols:create-new-folder-outline-rounded" />
                      新建子文件夹
                    </el-dropdown-item>
                    <el-dropdown-item v-if="!data.virtual" command="rename" divided>
                      <Icon icon="material-symbols:drive-file-rename-outline-rounded" />
                      重命名
                    </el-dropdown-item>
                    <el-dropdown-item v-if="!data.virtual" class="is-danger" command="remove">
                      <Icon icon="material-symbols:delete-outline-rounded" />
                      删除文件夹
                    </el-dropdown-item>
                  </template>
                </template>
                <template v-else>
                  <template v-if="filter.isDeleted">
                    <el-dropdown-item command="restore">
                      <Icon icon="material-symbols:restore-from-trash-outline-rounded" />
                      恢复
                    </el-dropdown-item>
                    <el-dropdown-item class="is-danger" command="permanent" divided>
                      <Icon icon="material-symbols:delete-forever-rounded" />
                      彻底删除
                    </el-dropdown-item>
                  </template>
                  <template v-else>
                    <el-dropdown-item command="pin">
                      <Icon :icon="data.note?.isPinned ? 'material-symbols:keep-off-outline-rounded' : 'material-symbols:keep-outline-rounded'" />
                      {{ data.note?.isPinned ? '取消置顶' : '置顶' }}
                    </el-dropdown-item>
                    <el-dropdown-item class="is-danger" command="remove" divided>
                      <Icon icon="material-symbols:delete-outline-rounded" />
                      删除
                    </el-dropdown-item>
                  </template>
                </template>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-tree>
    </section>

    <section v-if="!filter.isDeleted" class="note-sidebar-section note-sidebar-tags">
      <div class="note-sidebar-section__heading">
        <h2>标签</h2>
        <el-button text circle aria-label="快捷新建标签" @click="createTag">
          <Icon icon="material-symbols:new-label-outline-rounded" />
        </el-button>
      </div>
      <div class="note-sidebar-tag-list">
        <el-dropdown
          v-for="tag in tags"
          :key="tag.id"
          class="note-sidebar-tag-context"
          popper-class="note-resource-popper"
          trigger="contextmenu"
          @contextmenu.capture="dismissOpenDropdowns"
          @command="removeTag(tag.id)"
        >
          <div
            class="note-sidebar-tag-row"
            :class="{ 'is-active': String(filter.tagId) === String(tag.id) }"
          >
            <button type="button" class="note-sidebar-tag-main" @click="emit('select-tag', tag.id)">
              <Icon icon="material-symbols:label-outline-rounded" />
              <span>{{ tag.name }}</span>
            </button>
            <small>{{ tagNoteCount(tag.id) }}</small>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item class="is-danger" command="remove">
                <Icon icon="material-symbols:delete-outline-rounded" />
                删除标签
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import NoteNavigation from './NoteNavigation.vue'
import {
  formatNoteExcerpt,
  formatNoteUpdatedTime,
  type NoteNavigationKind
} from './note-navigation'
import type { ApiId, INoteFolder, INoteListItem, INoteTag, NoteQuery } from '@/interface/note'
import {
  buildFolderNoteCounts,
  buildNoteExplorerTree,
  buildTagNoteCounts,
  getFolderPathKeys,
  toggleFolderExpansion,
  type FolderTreeNodeState,
  type NoteExplorerNode as ExplorerNode
} from './note-tree'

interface Props {
  folders: INoteFolder[]
  tags: INoteTag[]
  notes: INoteListItem[]
  counts: {
    all: number
    pinned: number
    recycle: number
  }
  activeId?: ApiId
  filter: NoteQuery
  loading: boolean
  error: string
}

const props = defineProps<Props>()
const expandedFolderKeys = ref<string[]>([])
const emit = defineEmits<{
  (event: 'create-note', folderId: ApiId | null): void
  (event: 'show-all'): void
  (event: 'show-pinned'): void
  (event: 'show-recycle'): void
  (event: 'select-folder', id: ApiId | null): void
  (event: 'select-tag', id: ApiId): void
  (event: 'select-note', id: ApiId): void
  (event: 'search', keyword: string): void
  (event: 'retry'): void
  (event: 'create-folder', name: string, parentId: ApiId | null): void
  (event: 'rename-folder', id: ApiId, name: string): void
  (event: 'remove-folder', id: ApiId): void
  (event: 'restore-folder', id: ApiId): void
  (event: 'permanent-delete-folder', id: ApiId): void
  (event: 'create-tag', name: string): void
  (event: 'remove-tag', id: ApiId): void
  (event: 'toggle-pin', id: ApiId, value: boolean): void
  (event: 'remove-note', id: ApiId): void
  (event: 'restore-note', id: ApiId): void
  (event: 'permanent-delete-note', id: ApiId): void
}>()

const navigationActive = computed<NoteNavigationKind | null>(() => {
  if (props.filter.isDeleted) return 'trash'
  if (props.filter.isPinned === true) return 'pinned'
  if (props.filter.folderId !== null || props.filter.tagId) return null
  return 'all'
})
const folderNoteCounts = computed(() => buildFolderNoteCounts(props.folders, props.notes))
const tagNoteCounts = computed(() => buildTagNoteCounts(props.notes))

/**
 * 根据共享导航项分发网页端筛选事件。
 *
 * :param kind: 共享导航类型。
 * :return: 无返回值。
 */
function selectNavigation(kind: NoteNavigationKind): void {
  if (kind === 'all') emit('show-all')
  else if (kind === 'pinned') emit('show-pinned')
  else emit('show-recycle')
}

/**
 * 获取文件夹在当前视图中的笔记数量。
 *
 * :param key: 文件夹目录树节点键。
 * :return: 文件夹及其子级包含的笔记数量。
 */
function folderNoteCount(key: string): number {
  return folderNoteCounts.value.get(key) ?? 0
}

/**
 * 获取标签在当前视图中的笔记数量。
 *
 * :param tagId: 标签标识。
 * :return: 标签关联的笔记数量。
 */
function tagNoteCount(tagId: ApiId): number {
  return tagNoteCounts.value.get(String(tagId)) ?? 0
}

const currentNodeKey = computed(() => {
  if (props.activeId !== undefined) return `note-${props.activeId}`
  if (props.filter.folderId === 0) return 'folder-unclassified'
  if (props.filter.folderId !== null && props.filter.folderId !== undefined) {
    return `folder-${props.filter.folderId}`
  }
  return undefined
})

const treeData = computed<ExplorerNode[]>(() => {
  return buildNoteExplorerTree({
    folders: props.folders,
    notes: props.notes,
    isDeleted: props.filter.isDeleted === true,
    isFilteredView:
      !props.filter.isDeleted &&
      (props.filter.isPinned === true ||
        (props.filter.tagId !== null && props.filter.tagId !== undefined))
  })
})

/**
 * 自动展开当前笔记所在文件夹及其父级路径。
 *
 * :return: 无返回值。
 */
function expandActiveNoteFolder(): void {
  if (props.activeId === undefined) return
  const activeNote = props.notes.find((note) => String(note.id) === String(props.activeId))
  if (!activeNote) return
  const pathKeys = getFolderPathKeys(props.folders, activeNote.folderId)
  expandedFolderKeys.value = Array.from(new Set([...expandedFolderKeys.value, ...pathKeys]))
}

watch(
  [() => props.activeId, () => props.folders, () => props.notes],
  expandActiveNoteFolder,
  { immediate: true }
)

/**
 * 处理目录树节点点击，笔记用于打开内容，文件夹用于切换展开状态。
 *
 * :param node: 被选择的目录或笔记节点。
 * :param treeNode: Element Plus 目录树节点状态。
 * :return: 无返回值。
 */
function selectTreeNode(node: ExplorerNode, treeNode: FolderTreeNodeState): void {
  if (node.type === 'note' && node.note) {
    emit('select-note', node.note.id)
    return
  }
  toggleFolderExpansion(treeNode)
}

/**
 * 记录用户手动展开的文件夹，供树数据更新后恢复状态。
 *
 * :param node: 展开的目录节点。
 * :return: 无返回值。
 */
function rememberExpandedFolder(node: ExplorerNode): void {
  if (node.type !== 'folder' || expandedFolderKeys.value.includes(node.key)) return
  expandedFolderKeys.value = [...expandedFolderKeys.value, node.key]
}

/**
 * 移除用户手动折叠文件夹及其全部后代的展开状态。
 *
 * :param node: 折叠的目录节点。
 * :return: 无返回值。
 */
function forgetExpandedFolder(node: ExplorerNode): void {
  const collapsedKeys = new Set<string>([node.key])
  if (node.folderId !== null) {
    const pendingFolderIds: ApiId[] = [node.folderId]
    while (pendingFolderIds.length) {
      const parentId = pendingFolderIds.pop()!
      props.folders
        .filter((folder) => String(folder.parentId) === String(parentId))
        .forEach((folder) => {
          collapsedKeys.add(`folder-${folder.id}`)
          pendingFolderIds.push(folder.id)
        })
    }
  }
  expandedFolderKeys.value = expandedFolderKeys.value.filter((key) => !collapsedKeys.has(key))
}

/**
 * 根据入口命令创建笔记或文件夹。
 *
 * :param command: 创建类型。
 * :param parentId: 目标父文件夹标识。
 * :return: 无返回值。
 */
async function handleCreateCommand(command: string, parentId: ApiId | null): Promise<void> {
  if (command === 'note') {
    emit('create-note', parentId)
    return
  }
  if (command === 'tag') {
    await createTag()
    return
  }
  try {
    const { value } = await ElMessageBox.prompt(
      parentId === null ? '请输入文件夹名称' : '请输入子文件夹名称',
      parentId === null ? '新建文件夹' : '新建子文件夹',
      {
        inputPattern: /\S+/,
        inputErrorMessage: '文件夹名称不能为空',
        confirmButtonText: '创建',
        cancelButtonText: '取消'
      }
    )
    emit('create-folder', value.trim(), parentId)
  } catch {
    // 用户取消时不创建文件夹。
  }
}

/**
 * 在打开右键菜单前关闭页面中已展开的下拉菜单。
 *
 * :return: 无返回值。
 */
function dismissOpenDropdowns(): void {
  const eventOptions: MouseEventInit = { bubbles: true, cancelable: true, view: window }
  document.body.dispatchEvent(new MouseEvent('mousedown', eventOptions))
  document.body.dispatchEvent(new MouseEvent('mouseup', eventOptions))
  document.body.dispatchEvent(new MouseEvent('click', eventOptions))
}

/**
 * 根据节点类型分发右键菜单命令。
 *
 * :param command: 右键菜单命令。
 * :param node: 当前资源节点。
 * :return: 无返回值。
 */
async function handleContextCommand(command: string, node: ExplorerNode): Promise<void> {
  if (node.type === 'folder') {
    if (command === 'create-note' || command === 'create-folder') {
      await handleCreateCommand(command === 'create-note' ? 'note' : 'folder', node.folderId)
      return
    }
    await handleFolderCommand(command, node)
    return
  }
  await handleNoteCommand(command, node)
}

/**
 * 处理文件夹的重命名、回收站和恢复操作。
 *
 * :param command: 操作命令。
 * :param node: 文件夹节点。
 * :return: 无返回值。
 */
async function handleFolderCommand(command: string, node: ExplorerNode): Promise<void> {
  if (!node.folder) return
  if (command === 'rename') {
    try {
      const { value } = await ElMessageBox.prompt('请输入新的文件夹名称', '重命名文件夹', {
        inputValue: node.folder.name,
        inputPattern: /\S+/,
        inputErrorMessage: '文件夹名称不能为空',
        confirmButtonText: '保存',
        cancelButtonText: '取消'
      })
      if (value.trim() !== node.folder.name) emit('rename-folder', node.folder.id, value.trim())
    } catch {
      // 用户取消时保持原名称。
    }
    return
  }
  const permanent = command === 'permanent'
  const restore = command === 'restore'
  if (restore) {
    emit('restore-folder', node.folder.id)
    return
  }
  try {
    await ElMessageBox.confirm(
      permanent
        ? '该文件夹、所有子文件夹及其中笔记将被永久删除，无法恢复。'
        : '删除后可从回收站找回该文件夹、所有子文件夹及其中笔记。',
      permanent ? '彻底删除文件夹' : '删除文件夹',
      {
        confirmButtonText: permanent ? '彻底删除' : '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    if (permanent) {
      emit('permanent-delete-folder', node.folder.id)
    } else {
      emit('remove-folder', node.folder.id)
    }
  } catch {
    // 用户取消时不改变文件夹状态。
  }
}

/**
 * 处理笔记的置顶、回收站和恢复操作。
 *
 * :param command: 操作命令。
 * :param node: 笔记节点。
 * :return: 无返回值。
 */
async function handleNoteCommand(command: string, node: ExplorerNode): Promise<void> {
  if (!node.note) return
  if (command === 'pin') {
    emit('toggle-pin', node.note.id, !node.note.isPinned)
    return
  }
  if (command === 'restore') {
    emit('restore-note', node.note.id)
    return
  }
  const permanent = command === 'permanent'
  try {
    await ElMessageBox.confirm(
      permanent ? '笔记将被永久删除，无法恢复。' : '删除后可从回收站找回该笔记。',
      permanent ? '彻底删除笔记' : '删除笔记',
      {
        confirmButtonText: permanent ? '彻底删除' : '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    if (permanent) {
      emit('permanent-delete-note', node.note.id)
    } else {
      emit('remove-note', node.note.id)
    }
  } catch {
    // 用户取消时不改变笔记状态。
  }
}

/**
 * 新建标签。
 *
 * :return: 无返回值。
 */
async function createTag(): Promise<void> {
  try {
    const { value } = await ElMessageBox.prompt('请输入标签名称', '新建标签', {
      inputPattern: /\S+/,
      inputErrorMessage: '标签名称不能为空',
      confirmButtonText: '创建',
      cancelButtonText: '取消'
    })
    emit('create-tag', value.trim())
  } catch {
    // 用户取消时不创建标签。
  }
}

/**
 * 确认后删除标签。
 *
 * :param id: 标签标识。
 * :return: 无返回值。
 */
async function removeTag(id: ApiId): Promise<void> {
  try {
    await ElMessageBox.confirm('删除标签不会删除关联笔记，是否继续？', '删除标签', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    emit('remove-tag', id)
  } catch {
    // 用户取消时不执行删除。
  }
}
</script>

<style scoped lang="scss">
.note-sidebar {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 18px 16px 30px;
}

.note-sidebar-fixed {
  position: sticky;
  z-index: 4;
  top: 0;
  display: grid;
  gap: 14px;
  margin: -18px -16px 0;
  padding: 14px 16px 10px;
  background: color-mix(in srgb, var(--note-surface) 96%, transparent);
  backdrop-filter: blur(12px);
}

.note-sidebar-toolbar {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 8px;
}

.note-sidebar-toolbar.is-recycle {
  grid-template-columns: minmax(0, 1fr);
}

.note-sidebar-create-dropdown,
.note-sidebar-create {
  width: 100%;
}

.note-sidebar-create {
  height: 38px;
  margin: 0;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #2f80ed, #22a6f2);
  box-shadow: 0 8px 18px rgb(47 128 237 / 22%);
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.note-sidebar-create:hover,
.note-sidebar-create:focus-visible {
  background: linear-gradient(135deg, #1d6fe3, #168fdb);
  box-shadow: 0 11px 24px rgb(47 128 237 / 28%);
  transform: translateY(-1px);
}

.note-sidebar-create:active {
  transform: translateY(0);
}

.note-sidebar-create svg {
  width: 17px;
  height: 17px;
}

.note-sidebar :deep(.note-sidebar-toolbar .el-input__wrapper) {
  min-height: 38px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--note-surface) 88%, #f8fbff);
  box-shadow: 0 0 0 1px var(--note-border) inset;
  transition: box-shadow 0.18s ease, background 0.18s ease;
}

.note-sidebar :deep(.note-sidebar-toolbar .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgb(47 128 237 / 32%) inset;
}

.note-sidebar :deep(.note-sidebar-toolbar .el-input__wrapper.is-focus) {
  background: var(--note-surface);
  box-shadow: 0 0 0 1px var(--note-primary) inset, 0 0 0 3px rgb(47 128 237 / 10%);
}

.note-sidebar :deep(.note-sidebar-toolbar .el-input__prefix-inner svg) {
  width: 17px;
  height: 17px;
}

.note-sidebar-nav {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--note-border);
  --note-navigation-muted: var(--note-text-muted);
  --note-navigation-text: var(--note-text);
  --note-navigation-primary: var(--note-primary);
  --note-navigation-hover: var(--note-surface-active);
  --note-navigation-active: var(--note-surface-active);
}

.note-sidebar-section {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.note-sidebar-section__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
  padding: 0 4px 0 6px;
}

.note-sidebar-section__heading .el-button {
  width: 28px;
  height: 28px;
  margin: 0;
  border-radius: 7px;
  color: var(--note-text-muted);
  transition: color 0.16s ease, background 0.16s ease;
}

.note-sidebar-section__heading .el-button:hover,
.note-sidebar-section__heading .el-button:focus-visible {
  color: var(--note-primary);
  background: var(--note-surface-active);
}

.note-sidebar-section__heading h2 {
  margin: 0;
  color: var(--note-text);
  font-size: 14px;
  font-weight: 700;
}

.note-sidebar-section__heading span {
  color: var(--note-text-muted);
  font-size: 11px;
}

.note-sidebar-state {
  padding: 24px 10px;
  color: var(--note-text-muted);
  text-align: center;
}

.note-sidebar-state.is-error {
  color: var(--note-danger);
}

.note-resource-tree {
  color: var(--note-text);
  background: transparent;
}

.note-resource-tree :deep(.el-tree-node__content) {
  position: relative;
  box-sizing: border-box;
  height: 36px;
  margin: 1px 0;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 7px;
  transition: color 0.16s ease, border-color 0.16s ease, background 0.16s ease,
    box-shadow 0.18s ease, transform 0.18s ease;
}

.note-resource-tree :deep(.el-tree-node__content:has(.note-resource-node.is-note)) {
  height: 50px;
}

.note-resource-tree :deep(.el-tree-node__content:hover),
.note-resource-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--note-surface-active);
}

.note-resource-tree :deep(.el-tree-node__content:hover) {
  border-color: rgb(47 128 237 / 10%);
  box-shadow: 0 5px 14px rgb(47 128 237 / 8%);
  transform: translateX(2px);
}

.note-resource-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  border-left: 3px solid var(--note-primary);
  color: var(--note-primary);
}

.note-resource-tree :deep(.el-tree-node__content:focus-visible) {
  outline: 2px solid rgb(47 128 237 / 24%);
  outline-offset: -1px;
}

.note-resource-tree :deep(.el-tree-node__expand-icon) {
  box-sizing: content-box;
  width: 14px;
  height: 14px;
  padding: 3px;
  border-radius: 5px;
  transition: color 0.16s ease, background 0.16s ease, transform 0.2s ease;
}

.note-resource-tree :deep(.el-tree-node__expand-icon:hover) {
  color: var(--note-primary);
  background: color-mix(in srgb, var(--note-primary) 9%, transparent);
}

.note-resource-tree :deep(.el-tree-node__expand-icon.is-leaf) {
  background: transparent;
}

.note-resource-node {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  width: 0;
  height: 100%;
  box-sizing: border-box;
  padding-right: 4px;
}

.note-resource-node-context {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-width: 0;
  width: 0;
  height: 100%;
}

.note-resource-node__icon {
  flex: 0 0 auto;
  margin-right: 7px;
  color: var(--note-primary);
  font-size: 18px;
  transition: color 0.16s ease, transform 0.18s ease;
}

.note-resource-node.is-note .note-resource-node__icon {
  color: var(--note-text-muted);
  font-size: 16px;
}

.note-resource-tree :deep(.el-tree-node__content:hover) .note-resource-node__icon,
.note-resource-tree :deep(.el-tree-node.is-current > .el-tree-node__content) .note-resource-node__icon {
  color: var(--note-primary);
  transform: scale(1.06);
}

.note-resource-node__label {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.note-resource-node.is-folder > .note-resource-node__label {
  flex: 1;
}

.note-resource-node__copy {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.note-resource-node__copy strong,
.note-resource-node__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-resource-node__copy strong {
  color: var(--note-text);
  font-size: 12px;
  font-weight: 700;
}

.note-resource-node__copy small {
  min-height: 13px;
  color: var(--note-text-muted);
  font-size: 10px;
  font-weight: 500;
  line-height: 13px;
}

.note-resource-node time {
  align-self: flex-start;
  flex: 0 0 auto;
  margin: 8px 1px 0 8px;
  color: var(--note-text-muted);
  font-size: 9px;
  white-space: nowrap;
}

.note-resource-node__count {
  flex: 0 0 28px;
  width: 28px;
  margin-left: 0;
  color: var(--note-text-muted);
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}

.note-sidebar-tags {
  padding-top: 8px;
  border-top: 1px solid var(--note-border);
}

.note-sidebar-tag-list {
  display: grid;
  gap: 3px;
  padding: 0 4px;
}

.note-sidebar-tag-context {
  display: block;
  width: 100%;
}

.note-sidebar-tag-row {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 34px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--note-text-muted);
  transition: color 0.16s ease, border-color 0.16s ease, background 0.16s ease,
    box-shadow 0.18s ease, transform 0.18s ease;
}

.note-sidebar-tag-row:hover,
.note-sidebar-tag-row.is-active {
  color: var(--note-primary);
  background: var(--note-surface-active);
}

.note-sidebar-tag-row:hover {
  border-color: rgb(47 128 237 / 10%);
  box-shadow: 0 5px 14px rgb(47 128 237 / 8%);
  transform: translateX(2px);
}

.note-sidebar-tag-row.is-active {
  border-color: rgb(47 128 237 / 16%);
}

.note-sidebar-tag-main {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.note-sidebar-tag-main svg {
  flex: 0 0 auto;
  width: 17px;
  height: 17px;
  transition: transform 0.18s ease;
}

.note-sidebar-tag-row:hover .note-sidebar-tag-main svg,
.note-sidebar-tag-row.is-active .note-sidebar-tag-main svg {
  transform: scale(1.06);
}

.note-sidebar-tag-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-sidebar-tag-row small {
  flex: 0 0 28px;
  width: 28px;
  margin-left: auto;
  color: var(--note-text-muted);
  font-size: 12px;
  text-align: center;
}


:global(.note-resource-popper.el-popper) {
  overflow: hidden;
  padding: 6px;
  border: 1px solid rgb(148 163 184 / 16%);
  border-radius: 12px;
  background: rgb(255 255 255 / 98%);
  box-shadow: 0 18px 42px rgb(15 23 42 / 14%);
  backdrop-filter: blur(16px);
}

:global(.note-resource-popper.el-popper .el-popper__arrow::before) {
  border-color: rgb(148 163 184 / 16%);
  background: rgb(255 255 255 / 98%);
}

:global(.note-resource-popper .el-dropdown-menu) {
  min-width: 168px;
  padding: 0;
  border: 0;
  background: transparent;
}

:global(.note-resource-popper .el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 38px;
  margin: 1px 0;
  padding: 0 10px;
  border-radius: 8px;
  color: #475569;
  font-size: 13px;
  font-weight: 550;
  transition: color 0.16s ease, background 0.16s ease;
}

:global(.note-resource-popper .el-dropdown-menu__item svg) {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  color: #64748b;
  transition: color 0.16s ease, transform 0.18s ease;
}

:global(.note-resource-popper .el-dropdown-menu__item:hover),
:global(.note-resource-popper .el-dropdown-menu__item:focus) {
  color: #2478e5;
  background: rgb(47 128 237 / 9%);
}

:global(.note-resource-popper .el-dropdown-menu__item:hover svg),
:global(.note-resource-popper .el-dropdown-menu__item:focus svg) {
  color: #2478e5;
  transform: scale(1.05);
}

:global(.note-resource-popper .el-dropdown-menu__item--divided) {
  margin-top: 7px;
}

:global(.note-resource-popper .el-dropdown-menu__item--divided::before) {
  top: -4px;
  right: 2px;
  left: 2px;
  height: 1px;
  background: rgb(148 163 184 / 16%);
}

:global(.note-resource-popper .el-dropdown-menu__item.is-danger) {
  color: #dc5b62;
}

:global(.note-resource-popper .el-dropdown-menu__item.is-danger svg) {
  color: #dc5b62;
}

:global(.note-resource-popper .el-dropdown-menu__item.is-danger:hover),
:global(.note-resource-popper .el-dropdown-menu__item.is-danger:focus) {
  color: #cc3f49;
  background: rgb(220 91 98 / 10%);
}

:global(html.dark .note-resource-popper.el-popper) {
  border-color: rgb(148 163 184 / 14%);
  background: rgb(23 27 45 / 98%);
  box-shadow: 0 20px 46px rgb(0 0 0 / 34%);
}

:global(html.dark .note-resource-popper.el-popper .el-popper__arrow::before) {
  border-color: rgb(148 163 184 / 14%);
  background: rgb(23 27 45 / 98%);
}

:global(html.dark .note-resource-popper .el-dropdown-menu__item) {
  color: #cbd5e1;
}

:global(html.dark .note-resource-popper .el-dropdown-menu__item svg) {
  color: #94a3b8;
}

@media (prefers-reduced-motion: reduce) {
  .note-sidebar *,
  .note-sidebar *::before,
  .note-sidebar *::after,
  :global(.note-resource-popper *),
  :global(.note-resource-popper *::before),
  :global(.note-resource-popper *::after) {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
