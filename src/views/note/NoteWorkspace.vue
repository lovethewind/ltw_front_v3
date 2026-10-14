<template>
  <main v-if="!user" class="note-guest-page">
    <section class="note-guest-card">
      <div class="note-guest-icon" aria-hidden="true">
        <Icon icon="tabler:notes" />
      </div>
      <p class="note-guest-eyebrow">私人笔记</p>
      <h1>记录想法，也整理生活</h1>
      <p class="note-guest-description">
        登录后即可使用文件夹、标签和 Markdown 编辑器管理私人笔记，内容仅对当前账号可见。
      </p>
      <div class="note-guest-features">
        <span><Icon icon="tabler:markdown" />即写即预览</span>
        <span><Icon icon="tabler:device-floppy" />自动保存与恢复</span>
        <span><Icon icon="tabler:folders" />文件夹与标签整理</span>
      </div>
      <button class="note-guest-login" type="button" @click="openLogin">
        登录后使用笔记
        <Icon icon="tabler:arrow-right" />
      </button>
    </section>
  </main>
  <main v-else class="note-workspace" :class="`panel-${mobilePanel}`">
    <div v-if="store.actionError" class="note-workspace-error" role="alert">
      <span>{{ store.actionError }}</span>
      <button type="button" @click="store.loadNotes">重新加载</button>
    </div>
    <aside class="note-workspace-sidebar">
      <ElScrollbar ref="sidebarScrollbarRef" class="note-workspace-scrollbar" always>
        <NoteSidebar
          :folders="store.folders"
          :tags="store.tags"
          :notes="store.visibleNotes"
          :counts="store.navigationCounts"
          :active-id="store.activeNote?.id"
          :filter="store.filter"
          :loading="store.loading"
          :error="store.actionError"
          @create-note="createNote"
          @show-all="showTree(store.showAll)"
          @show-pinned="showTree(store.showPinned)"
          @show-recycle="showTree(store.showRecycleBin)"
          @clear-recycle="clearRecycleBin"
          @select-folder="store.selectFolder"
          @select-tag="store.selectTag"
          @select-note="selectNote"
          @open-in-new-tab="openNoteInNewTab"
          @move-note="openMoveNotePicker"
          @duplicate-note="openDuplicateNotePicker"
          @quick-open="quickOpenVisible = true"
          @search="store.search"
          @retry="store.loadNotes"
          @create-folder="store.createFolder"
          @rename-folder="store.renameFolder"
          @remove-folder="store.removeFolder"
          @restore-folder="store.restoreFolder"
          @permanent-delete-folder="store.permanentDeleteFolder"
          @create-tag="store.createTag"
          @remove-tag="store.removeTag"
          @toggle-pin="store.setPinned"
          @remove-note="store.removeNote"
          @restore-note="store.restoreNote"
          @permanent-delete-note="store.permanentDeleteNote"
        />
      </ElScrollbar>
      <a
        class="note-sidebar-desktop-download"
        href="https://github.com/lovethewind/ltw_notes_desktop/releases"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="下载笔记桌面版"
        title="下载笔记桌面版"
      >
        <span class="note-sidebar-desktop-download__icon">
          <Icon icon="material-symbols:desktop-windows-outline-rounded" />
        </span>
        <span class="note-sidebar-desktop-download__copy">
          <strong>心悦笔记桌面版</strong>
          <small>离线记录，随时同步</small>
        </span>
        <Icon class="note-sidebar-desktop-download__arrow" icon="material-symbols:arrow-outward-rounded" />
      </a>
    </aside>
    <section class="note-workspace-editor">
      <button
        class="note-workspace-back"
        type="button"
        aria-label="返回笔记目录"
        @click="mobilePanel = 'sidebar'"
      >
        返回目录</button
      ><NoteTabsBar
        v-if="user"
        :note-ids="tabNoteIds"
        :active-note-id="store.activeNote ? String(store.activeNote.id) : null"
        :pinned-note-ids="tabPinnedNoteIds"
        :titles="tabTitles"
        @activate="selectNote"
        @close="closeTab"
        @close-others="closeOtherTabs"
        @close-right="closeTabsToRight"
        @toggle-pin="toggleTabPin"
        @reorder="reorderTabs"
      /><NoteEditor
        :note="store.activeNote"
        :folders="store.folders"
        :tags="store.tags"
        :save-status="store.saveStatus"
        :has-recovery-snapshot="store.hasRecoverySnapshot"
        :locked="store.editorLocked"
        @update-note="store.updateActiveNote"
        @retry-save="store.retrySave"
        @save-now="saveActiveNote"
        @restore-recovery="store.restoreRecoverySnapshot"
        @discard-recovery="store.discardRecoverySnapshot"
        @show-history="openHistory"
      />
    </section>
    <NoteHistoryDrawer
      v-model="historyVisible"
      :histories="histories"
      :selected="selectedHistory"
      :previous-history="previousHistory"
      :loading="historyLoading"
      :detail-loading="historyDetailLoading"
      :previous-loading="previousHistoryLoading"
      :restoring="historyRestoring"
      :deleting="historyDeleting"
      @select="selectHistory"
      @restore="restoreHistory"
      @delete="deleteHistoryVersion"
    />
    <NoteQuickOpenDialog
      v-if="user"
      v-model:visible="quickOpenVisible"
      :notes="quickOpenNotes"
      :folders="store.folders"
      :tags="store.tags"
      @select="openQuickOpenResult"
    />
    <NoteFolderPickerDialog
      v-model:visible="folderPickerVisible"
      :folders="store.folders"
      :title="folderPickerMode === 'move' ? '移动到文件夹' : '复制到文件夹'"
      :hint="folderPickerMode === 'move'
        ? '选择目标文件夹，笔记将从当前位置移出。'
        : '选择目标文件夹，将在此处创建一个内容相同的副本。'"
      :confirm-text="folderPickerMode === 'move' ? '移动' : '复制'"
      :initial-folder-id="folderPickerInitialFolderId"
      @confirm="applyFolderPicker"
    />
  </main>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, ElScrollbar } from 'element-plus'
import type { ScrollbarInstance } from 'element-plus'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import NoteEditor from '@/components/note/NoteEditor.vue'
import NoteFolderPickerDialog from '@/components/note/NoteFolderPickerDialog.vue'
import NoteHistoryDrawer from '@/components/note/NoteHistoryDrawer.vue'
import NoteQuickOpenDialog from '@/components/note/NoteQuickOpenDialog.vue'
import NoteSidebar from '@/components/note/NoteSidebar.vue'
import NoteTabsBar from '@/components/note/NoteTabsBar.vue'
import noteApi from '@/api/note'
import userApi from '@/api/user'
import type { ApiId, INoteHistory, INoteHistoryListItem, INoteListItem } from '@/interface/note'
import { useCommonStore } from '@/stores/common'
import { useModalStore } from '@/stores/modal'
import { useNoteStore } from '@/stores/note'
import { useUserStore } from '@/stores/user'
import { OPEN_NOTE_EVENT, type OpenNoteEventDetail } from '@/utils/note-open-events'
import {
  activateNoteInCurrentTab,
  activateNoteInNewTab,
  closeNoteTab,
  closeNoteTabsToRight,
  closeOtherNoteTabs,
  reorderNoteTabs,
  togglePinnedNoteTab,
  type NoteTabsState
} from '@/utils/note-tabs'
type MobilePanel = 'sidebar' | 'editor'

const store = useNoteStore()
const commonStore = useCommonStore()
const modalStore = useModalStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
let unmounted = false
let workspaceActive = false
let desktopAuthRequested = false
const user = computed(() => userStore.user)
const mobilePanel = ref<MobilePanel>('sidebar')
const sidebarScrollbarRef = ref<ScrollbarInstance | null>(null)
/**
 * 已打开标签（纯前端内存态）。
 *
 * ⚠️ 网页端地址栏只承载**一篇**笔记（`/notes/:id`），所以标签不像桌面端那样可持久化：
 * 激活哪个标签就把它同步到路由，刷新后只剩当前这一篇。标签逻辑本身与桌面端同源
 * （`@/utils/note-tabs`），差别只在「存哪儿」。
 */
const tabNoteIds = ref<string[]>([])
const tabPinnedNoteIds = ref<string[]>([])
const tabTitles = ref<Record<string, string>>({})
const quickOpenVisible = ref(false)
/** 文件夹选择弹窗的用途：移动 / 复制。 */
const folderPickerMode = ref<'move' | 'duplicate'>('move')
const folderPickerVisible = ref(false)
const folderPickerNote = ref<INoteListItem | null>(null)
const folderPickerInitialFolderId = ref<ApiId | null>(null)
const historyVisible = ref(false)
const historyLoading = ref(false)
const historyDetailLoading = ref(false)
const historyRestoring = ref(false)
const historyDeleting = ref(false)
const histories = ref<INoteHistoryListItem[]>([])
const selectedHistory = ref<INoteHistory | null>(null)
/** 对比基准：选中版本在列表中「更旧的那一条」的完整正文。 */
const previousHistory = ref<INoteHistory | null>(null)
const previousHistoryLoading = ref(false)
/** 已取回正文的历史版本，按 id 缓存 —— 反复选中同一条时不再打接口。 */
const historyDetailCache = ref<Record<string, INoteHistory>>({})
let historyRequestId = 0
let historyDetailRequestId = 0
/**
 * 打开当前笔记的历史版本抽屉并加载最近版本。
 *
 * :return: 无返回值。
 */
async function openHistory(): Promise<void> {
  const noteId = store.activeNote?.id
  if (noteId === undefined) return
  const requestId = ++historyRequestId
  historyVisible.value = true
  historyLoading.value = true
  histories.value = []
  selectedHistory.value = null
  previousHistory.value = null
  previousHistoryLoading.value = false
  // 缓存跟着笔记走：换了笔记，上一轮的版本正文一律作废。
  historyDetailCache.value = {}
  try {
    const response = await noteApi.getHistoryList(noteId)
    if (requestId !== historyRequestId || String(store.activeNote?.id) !== String(noteId)) return
    histories.value = response.data.records
    if (histories.value[0]) await selectHistory(histories.value[0].id)
  } catch {
    if (requestId === historyRequestId) ElMessage.error('历史版本加载失败')
  } finally {
    if (requestId === historyRequestId) historyLoading.value = false
  }
}

/**
 * 取列表中比某条历史版本更旧的一条（列表按时间倒序）。
 *
 * 快照存的是「改成这样之后」的正文，因此「选中版本」与它后面那一条正好构成
 * **这一次改动** —— 对比档要的就是这一对。
 *
 * :param historyId: 历史版本标识。
 * :return: 更旧的列表项；不存在（已是最早一版）时返回 null。
 */
function findOlderHistory(historyId: ApiId): INoteHistoryListItem | null {
  const index = histories.value.findIndex((item) => String(item.id) === String(historyId))
  return index >= 0 ? (histories.value[index + 1] ?? null) : null
}

/**
 * 取某个历史版本的完整正文（带缓存）。
 *
 * 列表接口只带摘要，正文要单独取；对比档一次要用两个版本，缓存能省掉来回切换的开销。
 *
 * :param noteId: 笔记标识。
 * :param historyId: 历史版本标识。
 * :return: 历史版本详情。
 */
async function fetchHistoryDetail(noteId: ApiId, historyId: ApiId): Promise<INoteHistory> {
  const cached = historyDetailCache.value[String(historyId)]
  if (cached) return cached
  const response = await noteApi.getHistoryDetail(noteId, historyId)
  historyDetailCache.value = { ...historyDetailCache.value, [String(response.data.id)]: response.data }
  return response.data
}

/**
 * 取「上一版」的正文，供对比档做基准。
 *
 * :param noteId: 笔记标识。
 * :param historyId: 当前选中的历史版本标识。
 * :param requestId: 本轮详情请求序号，用于丢弃过期响应。
 * :return: 无返回值。
 */
async function loadPreviousHistory(noteId: ApiId, historyId: ApiId, requestId: number): Promise<void> {
  const older = findOlderHistory(historyId)
  if (!older) return
  const cached = historyDetailCache.value[String(older.id)]
  if (cached) {
    previousHistory.value = cached
    return
  }
  previousHistoryLoading.value = true
  try {
    const detail = await fetchHistoryDetail(noteId, older.id)
    if (requestId !== historyDetailRequestId) return
    previousHistory.value = detail
  } catch {
    // 基准取不到时静默降级：抽屉会提示「无更早版本」，不该为一次对比基准弹错误。
  } finally {
    if (requestId === historyDetailRequestId) previousHistoryLoading.value = false
  }
}

/**
 * 加载选中的历史版本详情。
 *
 * :param historyId: 历史版本标识。
 * :return: 无返回值。
 */
async function selectHistory(historyId: ApiId): Promise<void> {
  const noteId = store.activeNote?.id
  if (noteId === undefined) return
  const requestId = ++historyDetailRequestId
  historyDetailLoading.value = true
  // 先清空，避免上一个版本的对比基准残留、被当成这一版的「上一版」。
  previousHistory.value = null
  previousHistoryLoading.value = false
  try {
    const detail = await fetchHistoryDetail(noteId, historyId)
    if (requestId !== historyDetailRequestId || String(store.activeNote?.id) !== String(noteId)) return
    selectedHistory.value = detail
    // 对比档要用「上一版」，顺手一起取：同一个接口，省一次来回切换的等待。
    await loadPreviousHistory(noteId, historyId, requestId)
  } catch {
    if (requestId === historyDetailRequestId) ElMessage.error('历史版本详情加载失败')
  } finally {
    if (requestId === historyDetailRequestId) historyDetailLoading.value = false
  }
}

/**
 * 确认并恢复选中的历史版本。
 *
 * :param historyId: 历史版本标识。
 * :return: 无返回值。
 */
async function restoreHistory(historyId: ApiId): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '恢复后当前内容仍会保留在历史版本中，是否继续？',
      '恢复历史版本',
      { type: 'warning', confirmButtonText: '恢复', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  historyRestoring.value = true
  const restored = await store.restoreHistory(historyId)
  historyRestoring.value = false
  if (!restored) {
    ElMessage.error(store.actionError || '历史版本恢复失败')
    return
  }
  ElMessage.success('已恢复历史版本，恢复前内容已自动留档')
  await openHistory()
}

/**
 * 确认并删除选中的单个历史版本。
 *
 * :param historyId: 历史版本标识。
 * :return: 无返回值。
 */
async function deleteHistoryVersion(historyId: ApiId): Promise<void> {
  const noteId = store.activeNote?.id
  if (noteId === undefined) return
  try {
    await ElMessageBox.confirm(
      '删除后无法恢复，但不会影响当前笔记内容，是否继续？',
      '删除历史版本',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  historyDeleting.value = true
  try {
    await noteApi.deleteHistory(noteId, historyId)
    ElMessage.success('历史版本已删除')
    await openHistory()
  } catch {
    ElMessage.error('历史版本删除失败')
  } finally {
    historyDeleting.value = false
  }
}

/**
 * 在异步数据更新后重新计算目录栏滚动指示条。
 *
 * :return: 无返回值。
 */
function updateWorkspaceScrollbars(): void {
  void nextTick(() => {
    sidebarScrollbarRef.value?.update()
  })
}

/**
 * 打开登录弹窗，引导访客登录后使用私人笔记。
 *
 * :return: 无返回值。
 */
function openLogin(): void {
  modalStore.setLoginFlag(true)
}

/**
 * 读取并校验桌面端浏览器登录状态参数。
 *
 * :return: 合法状态值；当前不是桌面端授权页面时返回空字符串。
 */
function getDesktopAuthState(): string {
  if (route.query.desktop_login !== '1') return ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  return /^[A-Za-z0-9_-]{32,128}$/.test(state) ? state : ''
}

/**
 * 清理桌面端授权完成后的临时查询参数，避免刷新页面重复触发授权弹窗。
 *
 * :return: 无返回值。
 */
function clearDesktopAuthQuery(): void {
  if (route.query.desktop_login !== '1' && route.query.state === undefined) return
  const query = { ...route.query }
  delete query.desktop_login
  delete query.state
  void router.replace({ path: route.path, query })
}

/**
 * 从当前路由中读取待打开的笔记标识。
 *
 * :return: 合法笔记标识；路由未指定笔记时返回 undefined。
 */
function getRouteNoteId(): ApiId | undefined {
  const noteId = route.params.noteId
  return typeof noteId === 'string' && noteId.trim() ? noteId : undefined
}

/**
 * 将当前笔记同步到浏览器地址栏，同时保留登录授权参数。
 *
 * :param noteId: 当前笔记标识。
 * :return: 无返回值。
 */
function replaceNoteRoute(noteId: ApiId): void {
  if (String(route.params.noteId || '') === String(noteId)) return
  void router.replace({
    name: 'notes',
    params: { noteId: String(noteId) },
    query: route.query
  })
}

/**
 * 为已登录用户签发一次性授权码并返回桌面应用。
 *
 * :return: 授权跳转完成后的 Promise。
 */
async function completeDesktopAuth(): Promise<void> {
  const state = getDesktopAuthState()
  if (!state || !user.value || desktopAuthRequested) return
  desktopAuthRequested = true
  try {
    const response = await userApi.createDesktopAuthCode({ state })
    const code = String(response.data?.code || '')
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(code)) throw new Error('服务未返回有效授权码')
    clearDesktopAuthQuery()
    window.location.assign(
      `xinyue-notes://auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
    )
  } catch (error) {
    desktopAuthRequested = false
    ElMessage.error(error instanceof Error ? error.message : '桌面端授权失败，请重试')
  }
}

/**
 * 启动已登录用户的笔记工作区与保存快捷键。
 *
 * :return: 无返回值。
 */
function activateWorkspace(): void {
  if (workspaceActive) return
  workspaceActive = true
  void store.loadWorkspace(getRouteNoteId())
  window.addEventListener('keydown', handleSaveShortcut)
  window.addEventListener('keydown', handleQuickOpenShortcut)
}

/**
 * 停止笔记工作区并释放请求、自动保存与快捷键资源。
 *
 * :return: 无返回值。
 */
function deactivateWorkspace(): void {
  if (!workspaceActive) return
  workspaceActive = false
  window.removeEventListener('keydown', handleSaveShortcut)
  window.removeEventListener('keydown', handleQuickOpenShortcut)
  store.dispose()
}

watch(
  [() => store.folders.length, () => store.tags.length, () => store.notes.length],
  updateWorkspaceScrollbars,
  { flush: 'post', immediate: true }
)

watch(user, (currentUser) => {
  if (unmounted) return
  if (currentUser) {
    activateWorkspace()
    void completeDesktopAuth()
  } else {
    deactivateWorkspace()
  }
})

watch(() => store.activeNote?.id, () => {
  historyVisible.value = false
  historyRequestId += 1
  historyDetailRequestId += 1
  const active = store.activeNote
  if (!active) return
  replaceNoteRoute(active.id)
  rememberTabTitle(active.id, active.title)
  // 刷新页面或直接打开分享链接时标签栏是空的，把当前这篇补成一个标签。
  if (!tabNoteIds.value.includes(String(active.id))) {
    tabNoteIds.value = [...tabNoteIds.value, String(active.id)]
  }
})

watch(() => route.fullPath, () => {
  const noteId = getRouteNoteId()
  if (
    !workspaceActive
    || !user.value
    || noteId === undefined
    || String(store.activeNote?.id || '') === String(noteId)
  ) return
  selectNote(noteId)
})

/**
 * 新建笔记成功后切换到编辑层。
 *
 * :param folderId: 新笔记所在的文件夹标识。
 * :return: 无返回值。
 */
function createNote(folderId: ApiId | null): void {
  void store.createNote(folderId).then((ok) => {
    if (ok) mobilePanel.value = 'editor'
  })
}

/**
 * 执行目录筛选操作成功后回到目录层。
 *
 * :param action: 列表操作。
 * :return: 无返回值。
 */
function showTree(action: () => Promise<boolean>): void {
  void action().then((ok) => {
    if (ok) mobilePanel.value = 'sidebar'
  })
}

/**
 * 确认并永久清空回收站中的全部内容。
 *
 * :return: 无返回值。
 */
async function clearRecycleBin(): Promise<void> {
  if (!store.navigationCounts.recycle && !store.folders.length) return
  try {
    await ElMessageBox.confirm(
      '回收站中的笔记、文件夹和历史版本都会永久删除，无法恢复，是否继续？',
      '清空回收站',
      { type: 'warning', confirmButtonText: '清空', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  const cleared = await store.clearRecycleBin()
  if (cleared) ElMessage.success('回收站已清空')
  else ElMessage.error(store.actionError || '回收站清空失败')
}

/**
 * 当前激活标签对应的笔记标识。
 *
 * :return: 字符串形式的笔记标识；没有激活笔记时返回 null。
 */
function currentTabNoteId(): string | null {
  return store.activeNote ? String(store.activeNote.id) : null
}

/**
 * 组装标签状态机的入参。
 *
 * :return: 标签状态。
 */
function tabState(): NoteTabsState {
  return { noteIds: tabNoteIds.value, activeNoteId: currentTabNoteId() }
}

/**
 * 记住标签标题，供标签栏展示（笔记不在当前筛选列表里时也还有名字）。
 *
 * :param noteId: 笔记标识。
 * :param title: 笔记标题。
 * :return: 无返回值。
 */
function rememberTabTitle(noteId: ApiId, title: string): void {
  tabTitles.value = { ...tabTitles.value, [String(noteId)]: String(title || '').trim() || '未命名笔记' }
}

/**
 * 收掉一个打不开的标签，避免留下点不动的入口。
 *
 * :param noteId: 笔记标识。
 * :return: 无返回值。
 */
function dropTab(noteId: string): void {
  tabNoteIds.value = closeNoteTab(tabState(), noteId).noteIds
  tabPinnedNoteIds.value = tabPinnedNoteIds.value.filter((id) => id !== noteId)
}

/**
 * 切换 store 中的当前笔记，成功后同步面板与标题快照。
 *
 * :param id: 笔记标识。
 * :return: 无返回值。
 */
function openNote(id: ApiId): void {
  void store.selectNote(id).then((ok) => {
    if (ok) {
      mobilePanel.value = 'editor'
      if (store.activeNote) rememberTabTitle(store.activeNote.id, store.activeNote.title)
      return
    }
    dropTab(String(id))
    if (store.activeNote) replaceNoteRoute(store.activeNote.id)
    ElMessage.error(store.actionError || '无法打开指定笔记')
  })
}

/**
 * 选择笔记并在当前标签中打开（已打开的笔记直接切换）。
 *
 * :param id: 笔记标识。
 * :return: 无返回值。
 */
function selectNote(id: ApiId): void {
  tabNoteIds.value = activateNoteInCurrentTab(
    tabState(),
    String(id),
    tabPinnedNoteIds.value
  ).noteIds
  openNote(id)
}

/**
 * 在新标签页中打开笔记。
 *
 * :param id: 笔记标识。
 * :return: 无返回值。
 */
function openNoteInNewTab(id: ApiId): void {
  tabNoteIds.value = activateNoteInNewTab(tabState(), String(id)).noteIds
  openNote(id)
}

/**
 * 处理编辑器深处（嵌入卡、正文里的笔记链接）发来的「打开笔记」请求。
 *
 * 口径与桌面端 `App.vue` 的 `handleOpenNoteEvent` 一致：`newTab` 决定新标签页
 * 还是原地切换；原地那条先清掉目录筛选（链接是跨库的，目标可能被当前筛选挡在
 * 可见列表之外 —— 与快捷打开同一理由），新标签那条不动筛选。
 *
 * 接管后必须 `preventDefault()`：派发方用「事件有没有被取消」判断请求是否落地，
 * 没人接管时它会退回路由跳转。
 *
 * :param event: window 上的「打开笔记」自定义事件。
 * :return: 无返回值。
 */
async function handleOpenNoteEvent(event: Event): Promise<void> {
  const detail = (event as CustomEvent<OpenNoteEventDetail>).detail
  const noteId = detail?.noteId
  if (!noteId) return
  event.preventDefault()
  if (detail.newTab) {
    openNoteInNewTab(noteId)
    return
  }
  await store.showAll()
  store.search('')
  selectNote(noteId)
}

/**
 * 关闭标签；关掉的正好是当前标签时，切到相邻标签。
 *
 * :param noteId: 标签对应的笔记标识。
 * :return: 无返回值。
 */
function closeTab(noteId: string): void {
  const next = closeNoteTab(tabState(), noteId)
  tabNoteIds.value = next.noteIds
  tabPinnedNoteIds.value = tabPinnedNoteIds.value.filter((id) => id !== noteId)
  if (next.activeNoteId && next.activeNoteId !== currentTabNoteId()) openNote(next.activeNoteId)
}

/**
 * 关闭除指定标签外的其他标签（固定标签不受影响）。
 *
 * :param noteId: 要保留的笔记标识。
 * :return: 无返回值。
 */
function closeOtherTabs(noteId: string): void {
  tabNoteIds.value = closeOtherNoteTabs(tabState(), noteId, tabPinnedNoteIds.value).noteIds
}

/**
 * 关闭指定标签右侧的所有标签。
 *
 * :param noteId: 边界标签对应的笔记标识。
 * :return: 无返回值。
 */
function closeTabsToRight(noteId: string): void {
  tabNoteIds.value = closeNoteTabsToRight(tabState(), noteId).noteIds
  if (!tabNoteIds.value.includes(String(store.activeNote?.id))) {
    const fallback = tabNoteIds.value.at(-1)
    if (fallback) openNote(fallback)
  }
}

/**
 * 固定 / 取消固定标签。
 *
 * :param noteId: 标签对应的笔记标识。
 * :return: 无返回值。
 */
function toggleTabPin(noteId: string): void {
  const next = togglePinnedNoteTab(
    { noteIds: tabNoteIds.value, pinnedNoteIds: tabPinnedNoteIds.value },
    noteId
  )
  tabNoteIds.value = next.noteIds
  tabPinnedNoteIds.value = next.pinnedNoteIds
}

/**
 * 拖动调整标签顺序（跨固定 / 普通分组无效）。
 *
 * :param sourceNoteId: 被拖动的笔记标识。
 * :param targetNoteId: 落点笔记标识。
 * :return: 无返回值。
 */
function reorderTabs(sourceNoteId: string, targetNoteId: string): void {
  tabNoteIds.value = reorderNoteTabs(
    { noteIds: tabNoteIds.value, pinnedNoteIds: tabPinnedNoteIds.value },
    sourceNoteId,
    targetNoteId
  ).noteIds
}

/**
 * 供快速打开使用的候选列表。
 *
 * 回收站态下 `store.notes` 装的是已删除笔记，快速打开是「打开可用笔记」入口，
 * 必须排除；其余情况下直接用全库列表（不受侧栏关键词筛选影响）。
 *
 * :return: 候选笔记列表。
 */
const quickOpenNotes = computed<INoteListItem[]>(() => (store.isRecycleBin ? [] : store.notes))

/**
 * 打开「移动到…」的文件夹选择弹窗。
 *
 * :param id: 笔记标识。
 * :param currentFolderId: 笔记当前所在文件夹（作为默认选中项）。
 * :return: 无返回值。
 */
function openMoveNotePicker(id: ApiId, currentFolderId: ApiId | null): void {
  openFolderPicker('move', id, currentFolderId)
}

/**
 * 打开「复制到…」的文件夹选择弹窗。
 *
 * :param id: 笔记标识。
 * :param currentFolderId: 笔记当前所在文件夹（作为默认选中项）。
 * :return: 无返回值。
 */
function openDuplicateNotePicker(id: ApiId, currentFolderId: ApiId | null): void {
  openFolderPicker('duplicate', id, currentFolderId)
}

/**
 * 打开文件夹选择弹窗，并记住本次操作的目标笔记与用途。
 *
 * :param mode: 移动还是复制。
 * :param id: 笔记标识。
 * :param currentFolderId: 笔记当前所在文件夹。
 * :return: 无返回值。
 */
function openFolderPicker(mode: 'move' | 'duplicate', id: ApiId, currentFolderId: ApiId | null): void {
  const note = store.notes.find((item) => String(item.id) === String(id))
  if (!note) return
  folderPickerMode.value = mode
  folderPickerNote.value = note
  folderPickerInitialFolderId.value = currentFolderId
  folderPickerVisible.value = true
}

/**
 * 执行文件夹选择弹窗确认的移动 / 复制。
 *
 * :param targetFolderId: 目标文件夹；空值表示未分类。
 * :return: 无返回值。
 */
async function applyFolderPicker(targetFolderId: ApiId | null): Promise<void> {
  const note = folderPickerNote.value
  if (!note) return
  const ok =
    folderPickerMode.value === 'move'
      ? await store.moveNote(note.id, targetFolderId)
      : await store.duplicateNote(note.id, targetFolderId)
  if (!ok) {
    ElMessage.error(store.actionError || (folderPickerMode.value === 'move' ? '移动失败' : '复制失败'))
    return
  }
  ElMessage.success(folderPickerMode.value === 'move' ? '已移动' : '已复制')
  folderPickerNote.value = null
}
/**
 * 打开快捷搜索选中的笔记。
 *
 * 与桌面端一致：跳转后清空目录筛选（快速打开是「跨全库」入口，不应被当前目录筛选
 * 挡在可见列表之外），并在当前标签中打开。
 *
 * :param note: 选中的笔记。
 * :return: 无返回值。
 */
async function openQuickOpenResult(note: INoteListItem): Promise<void> {
  await store.showAll()
  store.search('')
  selectNote(note.id)
}

/**
 * 立即提交笔记保存队列，并反馈保存结果。
 *
 * :return: 无返回值。
 */
async function saveActiveNote(): Promise<void> {
  const saved = await store.saveNow()
  if (unmounted) return
  if (saved) {
    ElMessage.success('保存成功')
  } else if (store.activeNote) {
    ElMessage.error('保存失败，请稍后重试')
  }
}

/**
 * 拦截系统保存快捷键并立即提交笔记保存队列。
 *
 * :param event: 键盘事件。
 * :return: 无返回值。
 */
async function handleSaveShortcut(event: KeyboardEvent): Promise<void> {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
  event.preventDefault()
  await saveActiveNote()
}

/**
 * 打开全库快速搜索面板。
 *
 * 用 `Cmd/Ctrl + K`（网页端无桌面菜单，键位选大众化的「命令面板」约定）；
 * 桌面端默认是 `Cmd/Ctrl + O`，但浏览器里 `Ctrl+O` 被「打开文件」占用，故网页端不沿用。
 *
 * :param event: 键盘事件。
 * :return: 无返回值。
 */
function handleQuickOpenShortcut(event: KeyboardEvent): void {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
  event.preventDefault()
  quickOpenVisible.value = true
}

onMounted(() => {
  unmounted = false
  commonStore.setShowFooter(false)
  // 嵌入卡与正文链接发来的「打开笔记」请求（见 utils/note-open-events）。
  window.addEventListener(OPEN_NOTE_EVENT, handleOpenNoteEvent)
  const desktopAuthState = getDesktopAuthState()
  if (user.value) {
    activateWorkspace()
    void completeDesktopAuth()
  } else if (desktopAuthState) {
    openLogin()
    ElMessage.info('请登录并授权心悦笔记，完成后会自动返回应用')
  } else if (getRouteNoteId()) {
    openLogin()
    ElMessage.info('登录后将自动打开链接中的笔记')
  }
})
onBeforeUnmount(() => {
  unmounted = true
  commonStore.setShowFooter(true)
  deactivateWorkspace()
  window.removeEventListener(OPEN_NOTE_EVENT, handleOpenNoteEvent)
})
</script>
<style src="@/assets/css/note.scss" lang="scss" />
