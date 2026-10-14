<template>
  <div v-if="noteIds.length > 1" class="note-tabs-bar" role="tablist" aria-label="已打开的标签">
    <div ref="listRef" class="note-tabs-list">
      <el-dropdown
        v-for="id in visibleNoteIds"
        :key="id"
        class="note-tab-dropdown"
        popper-class="note-tab-popper"
        trigger="contextmenu"
        @command="(command: string) => handleTabCommand(command, id)"
      >
        <div
          class="note-tab"
          :class="{
            'is-active': id === activeNoteId,
            'is-pinned': pinnedNoteIds.includes(id)
          }"
          :draggable="true"
          role="tab"
          :aria-selected="id === activeNoteId"
          :title="titleOf(id)"
          @click="emit('activate', id)"
          @dragstart="startDrag(id)"
          @dragover.prevent
          @drop="dropOn(id)"
        >
          <Icon
            v-if="pinnedNoteIds.includes(id)"
            class="note-tab__pin"
            icon="material-symbols:keep-rounded"
          />
          <span class="note-tab__title">{{ titleOf(id) }}</span>
          <button
            type="button"
            class="note-tab__close"
            :aria-label="`关闭 ${titleOf(id)}`"
            @click.stop="emit('close', id)"
          >
            <Icon icon="material-symbols:close-rounded" />
          </button>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="pin">
              <Icon
                :icon="pinnedNoteIds.includes(id)
                  ? 'material-symbols:keep-off-outline-rounded'
                  : 'material-symbols:keep-outline-rounded'"
              />
              {{ pinnedNoteIds.includes(id) ? '取消固定标签' : '固定标签' }}
            </el-dropdown-item>
            <el-dropdown-item command="close" divided>
              <Icon icon="material-symbols:close-rounded" />
              关闭标签
            </el-dropdown-item>
            <el-dropdown-item command="close-others">
              <Icon icon="material-symbols:tab-close-rounded" />
              关闭其他标签
            </el-dropdown-item>
            <el-dropdown-item command="close-right">
              <Icon icon="material-symbols:tab-close-right-rounded" />
              关闭右侧标签
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown
        v-if="overflowNoteIds.length"
        class="note-tab-dropdown"
        popper-class="note-tab-popper"
        trigger="click"
        @command="(command: string) => emit('activate', String(command))"
      >
        <button
          type="button"
          class="note-tabs-overflow"
          :aria-label="`还有 ${overflowNoteIds.length} 个已打开标签`"
          :title="`还有 ${overflowNoteIds.length} 个已打开标签`"
        >
          <Icon icon="material-symbols:keyboard-arrow-down-rounded" />
          <span>{{ overflowNoteIds.length }}</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="id in overflowNoteIds" :key="id" :command="id">
              <Icon
                :icon="pinnedNoteIds.includes(id)
                  ? 'material-symbols:keep-rounded'
                  : 'material-symbols:description-outline-rounded'"
              />
              {{ titleOf(id) }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'

import { partitionNoteTabs } from '@/utils/note-tabs'

/**
 * 笔记多标签栏。
 *
 * 逻辑全部来自 `@/utils/note-tabs`（与桌面端同源），本组件只负责呈现与转发交互：
 * 标签宽度固定，超出可用宽度的那部分收进右侧下拉，保证当前标签始终可见。
 */

interface Props {
  /** 已打开的笔记 ID（按显示顺序）。 */
  noteIds: string[]
  /** 当前激活的笔记 ID。 */
  activeNoteId: string | null
  /** 固定标签 ID。 */
  pinnedNoteIds: string[]
  /** 笔记 ID → 标题，用于展示。 */
  titles: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'activate', noteId: string): void
  (event: 'close', noteId: string): void
  (event: 'close-others', noteId: string): void
  (event: 'close-right', noteId: string): void
  (event: 'toggle-pin', noteId: string): void
  (event: 'reorder', sourceNoteId: string, targetNoteId: string): void
}>()

/** 单个标签占用的宽度（含间距），用于把可用宽度换算成可放下的标签数。 */
const TAB_SLOT_WIDTH = 152
/** 右侧溢出入口占用的宽度。 */
const OVERFLOW_SLOT_WIDTH = 72

const listRef = ref<HTMLDivElement | null>(null)
const maxVisible = ref(8)
let resizeObserver: ResizeObserver | null = null
let draggingNoteId = ''

const partition = computed(() =>
  partitionNoteTabs(props.noteIds, props.activeNoteId, maxVisible.value)
)
const visibleNoteIds = computed(() => partition.value.visibleNoteIds)
const overflowNoteIds = computed(() => partition.value.overflowNoteIds)

/**
 * 读取标题，缺失时给出兜底。
 *
 * :param noteId: 笔记 ID。
 * :return: 展示用标题。
 */
function titleOf(noteId: string): string {
  return props.titles[noteId] || '未命名笔记'
}

/**
 * 按容器宽度换算可同时显示的标签数。
 *
 * :return: 无返回值。
 */
function measure(): void {
  const width = listRef.value?.clientWidth ?? 0
  if (!width) return
  const next = Math.max(
    2,
    Math.floor((width - OVERFLOW_SLOT_WIDTH) / TAB_SLOT_WIDTH)
  )
  if (next !== maxVisible.value) maxVisible.value = next
}

/**
 * 记录被拖动的标签。
 *
 * :param noteId: 被拖动的笔记 ID。
 * :return: 无返回值。
 */
function startDrag(noteId: string): void {
  draggingNoteId = noteId
}

/**
 * 把被拖动的标签落到目标位置。
 *
 * :param targetNoteId: 落点笔记 ID。
 * :return: 无返回值。
 */
function dropOn(targetNoteId: string): void {
  const sourceNoteId = draggingNoteId
  draggingNoteId = ''
  if (!sourceNoteId || sourceNoteId === targetNoteId) return
  emit('reorder', sourceNoteId, targetNoteId)
}

/**
 * 转发标签右键菜单命令。
 *
 * :param command: 菜单命令。
 * :param noteId: 目标笔记 ID。
 * :return: 无返回值。
 */
function handleTabCommand(command: string, noteId: string): void {
  if (command === 'pin') emit('toggle-pin', noteId)
  else if (command === 'close') emit('close', noteId)
  else if (command === 'close-others') emit('close-others', noteId)
  else if (command === 'close-right') emit('close-right', noteId)
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver === 'undefined' || !listRef.value) return
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(listRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<style scoped lang="scss">
.note-tabs-bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  min-width: 0;
  padding: 6px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--note-surface, var(--el-bg-color));
}

.note-tabs-list {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.note-tab-dropdown {
  flex: 0 0 auto;
  min-width: 0;
}

.note-tab {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 146px;
  height: 30px;
  padding: 0 6px 0 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--el-text-color-regular);
  background: transparent;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.note-tab:hover {
  background: var(--el-fill-color-light);
}

.note-tab.is-active {
  border-color: var(--el-border-color);
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
  box-shadow: 0 1px 3px rgb(0 0 0 / 6%);
}

.note-tab__pin {
  flex: 0 0 auto;
  font-size: 14px;
  color: var(--note-primary, var(--el-color-primary));
}

.note-tab__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-tab__close {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 5px;
  color: var(--el-text-color-secondary);
  background: transparent;
  font-size: 13px;
  cursor: pointer;
}

.note-tab__close:hover {
  color: var(--el-text-color-primary);
  background: var(--el-fill-color);
}

.note-tabs-overflow {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 2px;
  align-items: center;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  color: var(--el-text-color-regular);
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}

.note-tabs-overflow:hover {
  background: var(--el-fill-color-light);
}
</style>
