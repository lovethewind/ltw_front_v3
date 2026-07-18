<template>
  <aside class="note-sidebar" aria-label="笔记资源目录">
    <div class="note-sidebar-toolbar" :class="{ 'is-recycle': filter.isDeleted }">
      <el-dropdown
        v-if="!filter.isDeleted"
        class="note-sidebar-create-dropdown"
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

    <nav class="note-sidebar-nav" aria-label="笔记筛选">
      <el-button :class="{ 'is-active': isAllActive }" @click="emit('show-all')">
        <Icon icon="material-symbols:description-outline-rounded" />
        全部笔记
      </el-button>
      <el-button
        :class="{ 'is-active': filter.isPinned === true && !filter.isDeleted }"
        @click="emit('show-pinned')"
      >
        <Icon icon="material-symbols:keep-outline-rounded" />
        置顶笔记
      </el-button>
      <el-button :class="{ 'is-active': filter.isDeleted }" @click="emit('show-recycle')">
        <Icon icon="material-symbols:delete-outline-rounded" />
        回收站
      </el-button>
    </nav>

    <section class="note-sidebar-section note-sidebar-explorer">
      <div class="note-sidebar-section__heading">
        <h2>{{ filter.isDeleted ? '回收站' : '目录' }}</h2>
        <span>{{ folders.length }} 个文件夹 · {{ notes.length }} 篇笔记</span>
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
        :indent="14"
        empty-text="暂无笔记"
        @node-click="selectTreeNode"
        @node-expand="rememberExpandedFolder"
        @node-collapse="forgetExpandedFolder"
      >
        <template #default="{ data }">
          <el-dropdown
            class="note-resource-node-context"
            trigger="contextmenu"
            :disabled="filter.isDeleted && (data.type === 'folder' ? !data.deletionRoot : data.managedByFolder)"
            @contextmenu.capture="dismissOpenDropdowns"
            @command="(command: string) => handleContextCommand(command, data)"
          >
            <div class="note-resource-node" :class="`is-${data.type}`">
            <Icon
              class="note-resource-node__icon"
              :icon="data.type === 'folder' ? 'material-symbols:folder-outline-rounded' : 'material-symbols:description-outline-rounded'"
            />
            <span class="note-resource-node__label" :title="data.label">{{ data.label }}</span>
            <Icon
              v-if="data.type === 'note' && data.note?.isPinned && !filter.isDeleted"
              class="note-resource-node__pinned"
              icon="material-symbols:keep-rounded"
              aria-label="已置顶"
            />
              <div class="note-resource-node__actions" @click.stop>
              <el-dropdown
                v-if="data.type === 'folder' && !filter.isDeleted"
                class="note-resource-node__create"
                trigger="click"
                @command="(command: string) => handleCreateCommand(command, data.folderId)"
              >
                <el-button text circle :aria-label="`在 ${data.label} 中新建`">
                  <Icon icon="material-symbols:add-rounded" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="note">
                      <Icon icon="material-symbols:description-outline-rounded" />
                      新建笔记
                    </el-dropdown-item>
                    <el-dropdown-item v-if="!data.virtual" command="folder">
                      <Icon icon="material-symbols:create-new-folder-outline-rounded" />
                      新建子文件夹
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-dropdown
                v-if="data.type === 'folder' && !data.virtual && (!filter.isDeleted || data.deletionRoot)"
                class="note-resource-node__more"
                trigger="click"
                @command="(command: string) => handleFolderCommand(command, data)"
              >
                <el-button text circle :aria-label="`${data.label} 更多操作`">
                  <Icon icon="material-symbols:more-vert" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <template v-if="filter.isDeleted">
                      <el-dropdown-item command="restore">恢复整个文件夹</el-dropdown-item>
                      <el-dropdown-item command="permanent" divided>彻底删除整个文件夹</el-dropdown-item>
                    </template>
                    <template v-else>
                      <el-dropdown-item command="rename">重命名</el-dropdown-item>
                      <el-dropdown-item command="remove" divided>删除</el-dropdown-item>
                    </template>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-dropdown
                v-if="data.type === 'note' && (!filter.isDeleted || !data.managedByFolder)"
                class="note-resource-node__more"
                trigger="click"
                @command="(command: string) => handleNoteCommand(command, data)"
              >
                <el-button text circle :aria-label="`${data.label} 更多操作`">
                  <Icon icon="material-symbols:more-vert" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <template v-if="filter.isDeleted">
                      <el-dropdown-item command="restore">恢复</el-dropdown-item>
                      <el-dropdown-item command="permanent" divided>彻底删除</el-dropdown-item>
                    </template>
                    <template v-else>
                      <el-dropdown-item command="pin">{{ data.note?.isPinned ? '取消置顶' : '置顶' }}</el-dropdown-item>
                      <el-dropdown-item command="remove" divided>删除</el-dropdown-item>
                    </template>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              </div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <template v-if="data.type === 'folder'">
                  <template v-if="filter.isDeleted">
                    <el-dropdown-item command="restore">恢复整个文件夹</el-dropdown-item>
                    <el-dropdown-item command="permanent" divided>彻底删除整个文件夹</el-dropdown-item>
                  </template>
                  <template v-else>
                    <el-dropdown-item command="create-note">新建笔记</el-dropdown-item>
                    <el-dropdown-item v-if="!data.virtual" command="create-folder">新建子文件夹</el-dropdown-item>
                    <el-dropdown-item v-if="!data.virtual" command="rename" divided>重命名</el-dropdown-item>
                    <el-dropdown-item v-if="!data.virtual" command="remove">删除</el-dropdown-item>
                  </template>
                </template>
                <template v-else>
                  <template v-if="filter.isDeleted">
                    <el-dropdown-item command="restore">恢复</el-dropdown-item>
                    <el-dropdown-item command="permanent" divided>彻底删除</el-dropdown-item>
                  </template>
                  <template v-else>
                    <el-dropdown-item command="pin">{{ data.note?.isPinned ? '取消置顶' : '置顶' }}</el-dropdown-item>
                    <el-dropdown-item command="remove" divided>删除</el-dropdown-item>
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
        <el-button text circle aria-label="新建标签" @click="createTag">
          <Icon icon="material-symbols:add-rounded" />
        </el-button>
      </div>
      <div class="note-sidebar-tag-list">
        <el-tag
          v-for="tag in tags"
          :key="tag.id"
          :effect="String(filter.tagId) === String(tag.id) ? 'dark' : 'plain'"
          closable
          @click="emit('select-tag', tag.id)"
          @close.stop="removeTag(tag.id)"
        >
          # {{ tag.name }}
        </el-tag>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import type { ApiId, INoteFolder, INoteListItem, INoteTag, NoteQuery } from '@/interface/note'

interface ExplorerNode {
  key: string
  type: 'folder' | 'note'
  label: string
  folderId: ApiId | null
  note?: INoteListItem
  folder?: INoteFolder
  virtual?: boolean
  deletionRoot?: boolean
  managedByFolder?: boolean
  children?: ExplorerNode[]
}

interface Props {
  folders: INoteFolder[]
  tags: INoteTag[]
  notes: INoteListItem[]
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

const isAllActive = computed(() =>
  props.filter.isPinned === null &&
  !props.filter.isDeleted &&
  props.filter.folderId === null &&
  !props.filter.tagId
)

const currentNodeKey = computed(() => {
  if (props.activeId !== undefined) return `note-${props.activeId}`
  if (props.filter.folderId === 0) return 'folder-unclassified'
  if (props.filter.folderId !== null && props.filter.folderId !== undefined) {
    return `folder-${props.filter.folderId}`
  }
  return undefined
})

const treeData = computed<ExplorerNode[]>(() => {
  const folderNodes = new Map<string, ExplorerNode>()
  const rootNodes: ExplorerNode[] = []
  props.folders.forEach((folder) => {
    folderNodes.set(String(folder.id), {
      key: `folder-${folder.id}`,
      type: 'folder',
      label: folder.name,
      folderId: folder.id,
      folder,
      children: []
    })
  })
  props.folders.forEach((folder) => {
    const node = folderNodes.get(String(folder.id))!
    const parent = folder.parentId === null ? undefined : folderNodes.get(String(folder.parentId))
    const belongsToSameDeletion =
      !props.filter.isDeleted || String(folder.deletedRootId) === String(parent?.folder?.deletedRootId)
    if (parent && belongsToSameDeletion) {
      parent.children!.push(node)
    } else {
      node.deletionRoot = props.filter.isDeleted === true
      rootNodes.push(node)
    }
  })
  const unclassifiedNotes: ExplorerNode[] = []
  props.notes.forEach((note) => {
    const node: ExplorerNode = {
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
  if (unclassifiedNotes.length || !props.filter.isDeleted) {
    rootNodes.unshift({
      key: 'folder-unclassified',
      type: 'folder',
      label: props.filter.isDeleted ? '其他已删除笔记' : '未分类',
      folderId: null,
      virtual: true,
      children: unclassifiedNotes
    })
  }
  return rootNodes
})

/**
 * 处理目录树节点选择。
 *
 * :param node: 被选择的目录或笔记节点。
 * :return: 无返回值。
 */
function selectTreeNode(node: ExplorerNode): void {
  if (node.type === 'note' && node.note) {
    emit('select-note', node.note.id)
  } else if (!props.filter.isDeleted) {
    emit('select-folder', node.folderId)
  }
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
  gap: 12px;
  padding: 14px 12px 28px;
}

.note-sidebar-toolbar {
  position: sticky;
  z-index: 4;
  top: 0;
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 8px;
  margin: -14px -12px 0;
  padding: 14px 12px 8px;
  background: var(--note-surface);
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
  font-weight: 700;
}

.note-sidebar-nav {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}

.note-sidebar-nav .el-button {
  display: grid;
  justify-items: center;
  gap: 2px;
  height: 50px;
  margin: 0;
  padding: 5px 3px;
  border: 0;
  color: var(--note-text-muted);
  background: transparent;
  font-size: 12px;
}

.note-sidebar-nav .el-button:hover,
.note-sidebar-nav .el-button.is-active {
  color: var(--note-primary);
  background: var(--note-surface-active);
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
  padding: 0 4px;
}

.note-sidebar-section__heading h2 {
  margin: 0;
  font-size: 17px;
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
  box-sizing: border-box;
  height: 38px;
  margin: 1px 0;
  overflow: hidden;
  border-radius: 8px;
}

.note-resource-tree :deep(.el-tree-node__content:hover),
.note-resource-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--note-surface-active);
}

.note-resource-node {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  width: 0;
  height: 100%;
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
}

.note-resource-node.is-note .note-resource-node__icon {
  color: var(--note-text-muted);
  font-size: 16px;
}

.note-resource-node__label {
  flex: 1;
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-resource-node__pinned {
  flex: 0 0 auto;
  margin-left: 5px;
  color: var(--note-primary);
  font-size: 16px;
}

.note-resource-node__actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  margin-left: auto;
  padding-left: 5px;
  background: linear-gradient(90deg, transparent, var(--note-surface) 20%);
  opacity: 0;
}

.note-resource-tree :deep(.el-tree-node__content:hover) .note-resource-node__actions,
.note-resource-tree :deep(.el-tree-node__content:focus-within) .note-resource-node__actions {
  opacity: 1;
}

.note-resource-node__more {
  order: 1;
}

.note-resource-node__create {
  order: 2;
}

.note-resource-tree :deep(.el-tree-node__content:hover) .note-resource-node__actions,
.note-resource-tree :deep(.el-tree-node.is-current > .el-tree-node__content) .note-resource-node__actions {
  background: linear-gradient(90deg, transparent, var(--note-surface-active) 20%);
}

.note-resource-node__actions .el-button {
  width: 26px;
  height: 26px;
  margin: 0;
  padding: 0;
}

.note-sidebar-tags {
  padding-top: 4px;
  border-top: 1px solid var(--note-border);
}

.note-sidebar-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 0 4px;
}

.note-sidebar-tag-list .el-tag {
  max-width: 100%;
  cursor: pointer;
}

.note-sidebar :deep(.el-input__wrapper) {
  min-height: 38px;
  border-radius: 9px;
  box-shadow: 0 0 0 1px var(--note-border) inset;
}

@media (max-width: 767px) {
  .note-sidebar-toolbar {
    grid-template-columns: 98px minmax(0, 1fr);
  }
}
</style>
