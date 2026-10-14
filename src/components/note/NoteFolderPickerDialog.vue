<template>
  <el-dialog
    v-model="visible"
    class="note-folder-picker-dialog"
    :title="title"
    width="min(420px, 92vw)"
    align-center
    append-to-body
    @opened="expandAll"
  >
    <p class="note-folder-picker-dialog__hint">{{ hint }}</p>
    <el-tree-select
      ref="treeRef"
      v-model="selectedFolderId"
      class="note-folder-picker-dialog__select"
      :data="treeData"
      check-strictly
      default-expand-all
      filterable
      clearable
      :render-after-expand="false"
      :placeholder="placeholder"
      :empty-text="folders.length ? '没有匹配的文件夹' : '暂无文件夹'"
    />
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="confirm">{{ confirmText }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ApiId, INoteFolder } from '@/interface/note'

/**
 * 目标文件夹选择弹窗。
 *
 * 桌面端用自研 `FolderPickerPopover`，网页端直接用 Element Plus 的树形选择器
 * —— 交互等价（可展开、可搜索、可清空为「未分类」），但少维护一套浮层定位代码。
 *
 * 选中值为 `null` 表示未分类（与 `store.selectFolder` 的语义一致）。
 */
interface Props {
  folders: INoteFolder[]
  title?: string
  hint?: string
  confirmText?: string
  placeholder?: string
  /** 初始选中的文件夹。 */
  initialFolderId?: ApiId | null
}

const props = withDefaults(defineProps<Props>(), {
  title: '选择文件夹',
  hint: '',
  confirmText: '确定',
  placeholder: '未分类',
  initialFolderId: null
})

const emit = defineEmits<{
  (event: 'confirm', folderId: ApiId | null): void
}>()

const visible = defineModel<boolean>('visible', { required: true })

const treeRef = ref<{ filter: (value: string) => void } | null>(null)
const selectedFolderId = ref<ApiId | null>(null)

/** 把扁平文件夹列表拼成 `el-tree-select` 需要的树。 */
const treeData = computed(() => {
  const nodes = new Map<
    string,
    { value: ApiId; label: string; children: Array<{ value: ApiId; label: string; children: unknown[] }> }
  >()
  const roots: Array<{ value: ApiId; label: string; children: unknown[] }> = []

  for (const folder of props.folders) {
    if (folder.isDeleted) continue
    nodes.set(String(folder.id), { value: folder.id, label: folder.name, children: [] })
  }
  for (const folder of props.folders) {
    if (folder.isDeleted) continue
    const node = nodes.get(String(folder.id))
    if (!node) continue
    const parentId = folder.parentId === null || folder.parentId === undefined ? null : String(folder.parentId)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
})

/** :return: 无返回值。 */
function expandAll(): void {
  void nextTick(() => treeRef.value?.filter(''))
}

/** :return: 无返回值。 */
function confirm(): void {
  visible.value = false
  emit('confirm', selectedFolderId.value ?? null)
}

watch(visible, (isVisible) => {
  if (!isVisible) return
  selectedFolderId.value = props.initialFolderId ?? null
})
</script>
