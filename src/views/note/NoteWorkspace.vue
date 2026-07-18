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
        @restore-recovery="store.restoreRecoverySnapshot"
        @discard-recovery="store.discardRecoverySnapshot"
      />
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElScrollbar } from 'element-plus'
import type { ScrollbarInstance } from 'element-plus'
import { Icon } from '@iconify/vue'
import NoteEditor from '@/components/note/NoteEditor.vue'
import NoteSidebar from '@/components/note/NoteSidebar.vue'
import type { ApiId } from '@/interface/note'
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
 * 拦截系统保存快捷键并立即提交笔记保存队列。
 *
 * :param event: 键盘事件。
 * :return: 无返回值。
 */
async function handleSaveShortcut(event: KeyboardEvent): Promise<void> {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
  event.preventDefault()
  const saved = await store.saveNow()
  if (unmounted) return
  if (saved) {
    ElMessage.success('保存成功')
  } else if (store.activeNote) {
    ElMessage.error('保存失败，请稍后重试')
  }
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
