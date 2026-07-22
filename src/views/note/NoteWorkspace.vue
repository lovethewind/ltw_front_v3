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
          @select-folder="store.selectFolder"
          @select-tag="store.selectTag"
          @select-note="selectNote"
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
    </aside>
    <section class="note-workspace-editor">
      <button
        class="note-workspace-back"
        type="button"
        aria-label="返回笔记目录"
        @click="mobilePanel = 'sidebar'"
      >
        返回目录</button
      ><NoteEditor
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
      :loading="historyLoading"
      :detail-loading="historyDetailLoading"
      :restoring="historyRestoring"
      :deleting="historyDeleting"
      @select="selectHistory"
      @restore="restoreHistory"
      @delete="deleteHistoryVersion"
    />
  </main>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, ElScrollbar } from 'element-plus'
import type { ScrollbarInstance } from 'element-plus'
import { Icon } from '@iconify/vue'
import NoteEditor from '@/components/note/NoteEditor.vue'
import NoteHistoryDrawer from '@/components/note/NoteHistoryDrawer.vue'
import NoteSidebar from '@/components/note/NoteSidebar.vue'
import noteApi from '@/api/note'
import type { ApiId, INoteHistory, INoteHistoryListItem } from '@/interface/note'
import { useCommonStore } from '@/stores/common'
import { useModalStore } from '@/stores/modal'
import { useNoteStore } from '@/stores/note'
import { useUserStore } from '@/stores/user'
type MobilePanel = 'sidebar' | 'editor'

const store = useNoteStore()
const commonStore = useCommonStore()
const modalStore = useModalStore()
const userStore = useUserStore()
let unmounted = false
let workspaceActive = false
const user = computed(() => userStore.user)
const mobilePanel = ref<MobilePanel>('sidebar')
const sidebarScrollbarRef = ref<ScrollbarInstance | null>(null)
const historyVisible = ref(false)
const historyLoading = ref(false)
const historyDetailLoading = ref(false)
const historyRestoring = ref(false)
const historyDeleting = ref(false)
const histories = ref<INoteHistoryListItem[]>([])
const selectedHistory = ref<INoteHistory | null>(null)
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
  try {
    const response = await noteApi.getHistoryDetail(noteId, historyId)
    if (requestId === historyDetailRequestId && String(store.activeNote?.id) === String(noteId)) {
      selectedHistory.value = response.data
    }
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
 * 启动已登录用户的笔记工作区与保存快捷键。
 *
 * :return: 无返回值。
 */
function activateWorkspace(): void {
  if (workspaceActive) return
  workspaceActive = true
  void store.loadWorkspace()
  window.addEventListener('keydown', handleSaveShortcut)
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
  } else {
    deactivateWorkspace()
  }
})

watch(() => store.activeNote?.id, () => {
  historyVisible.value = false
  historyRequestId += 1
  historyDetailRequestId += 1
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
 * 选择笔记成功后切换到编辑层。
 *
 * :param id: 笔记标识。
 * :return: 无返回值。
 */
function selectNote(id: ApiId): void {
  void store.selectNote(id).then((ok) => {
    if (ok) mobilePanel.value = 'editor'
  })
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

onMounted(() => {
  unmounted = false
  commonStore.setShowFooter(false)
  if (user.value) activateWorkspace()
})
onBeforeUnmount(() => {
  unmounted = true
  commonStore.setShowFooter(true)
  deactivateWorkspace()
})
</script>
<style src="@/assets/css/note.scss" lang="scss" />
