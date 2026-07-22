<template>
  <el-drawer
    :model-value="modelValue"
    class="note-history-drawer"
    title="历史版本"
    size="min(760px, 94vw)"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="note-history-layout">
      <aside class="note-history-list" aria-label="历史版本列表">
        <button
          v-for="history in histories"
          :key="history.id"
          type="button"
          class="note-history-item"
          :class="{ active: String(history.id) === String(selected?.id) }"
          :aria-current="String(history.id) === String(selected?.id) ? 'true' : undefined"
          @click="emit('select', history.id)"
        >
          <time :datetime="history.createTime">{{ formatHistoryTime(history.createTime) }}</time>
          <strong>{{ history.title || '无标题笔记' }}</strong>
          <span>{{ formatHistoryPreview(history.contentPreview) }}</span>
        </button>
        <el-empty v-if="!loading && !histories.length" description="暂无历史版本" :image-size="72" />
      </aside>

      <section v-loading="detailLoading" class="note-history-preview" aria-label="历史版本预览">
        <template v-if="selected">
          <header>
            <div>
              <h3>{{ selected.title || '无标题笔记' }}</h3>
              <time :datetime="selected.createTime">{{ formatHistoryTime(selected.createTime) }}</time>
            </div>
            <div class="note-history-actions">
              <el-button
                type="danger"
                plain
                :loading="deleting"
                :disabled="restoring"
                @click="emit('delete', selected.id)"
              >
                <Icon icon="material-symbols:delete-outline-rounded" />
                删除此版本
              </el-button>
              <el-button
                type="primary"
                :loading="restoring"
                :disabled="deleting"
                @click="emit('restore', selected.id)"
              >
                <Icon icon="material-symbols:restore-rounded" />
                恢复此版本
              </el-button>
            </div>
          </header>
          <MdEditor
            :value="selected.content"
            class="note-history-viewer"
            readonly
            :show-toolbar="false"
            :show-outline="false"
          />
        </template>
        <el-empty v-else-if="!detailLoading" description="选择一个版本查看内容" :image-size="82" />
      </section>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import MdEditor from '@/components/editor/MdEditor.vue'
import type { ApiId, INoteHistory, INoteHistoryListItem } from '@/interface/note'

interface Props {
  modelValue: boolean
  histories: INoteHistoryListItem[]
  selected: INoteHistory | null
  loading?: boolean
  detailLoading?: boolean
  restoring?: boolean
  deleting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  detailLoading: false,
  restoring: false,
  deleting: false
})
const emit = defineEmits<{
  (event: 'update:modelValue', visible: boolean): void
  (event: 'select', historyId: ApiId): void
  (event: 'restore', historyId: ApiId): void
  (event: 'delete', historyId: ApiId): void
}>()
/**
 * 格式化历史版本保存时间。
 *
 * :param value: ISO 时间文本。
 * :return: 本地日期时间文本。
 */
function formatHistoryTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value))
}

/**
 * 将历史摘要中的标记转换为便于浏览的纯文本。
 *
 * :param value: 历史内容摘要。
 * :return: 清理后的纯文本摘要。
 */
function formatHistoryPreview(value: string): string {
  const preview = value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return preview || '空白内容'
}
</script>

<style scoped lang="scss">
:global(.note-history-drawer .el-drawer__header) {
  height: 64px;
  margin-bottom: 0;
  padding: 0 22px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:global(.note-history-drawer .el-drawer__title) {
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-weight: 700;
}

:global(.note-history-drawer .el-drawer__close-btn) {
  display: grid;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  color: var(--el-text-color-secondary);
  place-items: center;
  transition:
    color 0.18s ease,
    background-color 0.18s ease;
}

:global(.note-history-drawer .el-drawer__close-btn:hover) {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

:global(.note-history-drawer .el-drawer__body) {
  min-height: 0;
  padding: 18px 20px 20px;
  overflow: hidden;
}

.note-history-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  height: 100%;
  min-height: 360px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  overflow: hidden;
  background: var(--el-bg-color);
  box-shadow: 0 8px 28px rgb(31 56 88 / 6%);
}

.note-history-list {
  overflow-y: auto;
  padding: 10px;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-extra-light);
  scrollbar-color: var(--el-border-color) transparent;
  scrollbar-width: thin;
}

.note-history-list button {
  position: relative;
  display: grid;
  gap: 6px;
  width: 100%;
  min-height: 94px;
  margin-bottom: 8px;
  padding: 12px 13px 12px 15px;
  border: 1px solid transparent;
  border-radius: 11px;
  color: var(--el-text-color-primary);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.note-history-list button:hover {
  border-color: var(--el-border-color-lighter);
  background: var(--el-bg-color);
  box-shadow: 0 4px 14px rgb(31 56 88 / 5%);
}

.note-history-list button.active {
  border-color: var(--el-color-primary-light-7);
  background: var(--el-color-primary-light-9);
  box-shadow: 0 5px 16px rgb(64 158 255 / 10%);
}

.note-history-list button.active::before {
  position: absolute;
  top: 14px;
  bottom: 14px;
  left: 0;
  width: 3px;
  border-radius: 0 4px 4px 0;
  background: var(--el-color-primary);
  content: '';
}

.note-history-list time,
.note-history-list span,
.note-history-preview time {
  color: var(--el-text-color-secondary);
  font-size: 12.5px;
}

.note-history-list-meta,
.note-history-preview-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.note-history-preview-meta {
  justify-content: flex-start;
}

.note-history-list strong,
.note-history-list span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-history-list strong {
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 650;
}

.note-history-list button.active time,
.note-history-list button.active span {
  color: var(--el-text-color-regular);
}

.note-history-preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 18px 24px 0;
  overflow: hidden;
}

.note-history-preview header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.note-history-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.note-history-actions :deep(.el-button) {
  height: 36px;
  margin-left: 0;
  padding: 0 14px;
  border-radius: 9px;
  font-weight: 600;
}

.note-history-actions :deep(.el-button .iconify) {
  width: 17px;
  height: 17px;
  margin-right: 5px;
}

.note-history-actions :deep(.el-button--primary) {
  box-shadow: 0 5px 14px rgb(64 158 255 / 18%);
}

.note-history-preview h3 {
  margin: 0 0 7px;
  color: var(--el-text-color-primary);
  font-size: 20px;
  line-height: 1.35;
}

.note-history-viewer {
  flex: 1;
  min-height: 0;
  margin-top: 14px;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.note-history-viewer :deep(.milkdown-editor-scroll) {
  scrollbar-color: var(--el-border-color) transparent;
  scrollbar-width: thin;
}

.note-history-viewer :deep(.milkdown-editor-root .milkdown .ProseMirror) {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 4px 6px 24px 0;
}

.note-history-list::-webkit-scrollbar,
.note-history-viewer :deep(.milkdown-editor-scroll::-webkit-scrollbar) {
  width: 6px;
}

.note-history-list::-webkit-scrollbar-thumb,
.note-history-viewer :deep(.milkdown-editor-scroll::-webkit-scrollbar-thumb) {
  border-radius: 999px;
  background: var(--el-border-color);
}

@media (max-width: 640px) {
  .note-history-layout {
    grid-template-columns: 1fr;
  }

  .note-history-list {
    max-height: 190px;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .note-history-preview {
    padding: 12px 16px 0;
  }

  .note-history-preview header {
    align-items: stretch;
    flex-direction: column;
  }

  .note-history-actions {
    justify-content: flex-end;
  }
}

@media (prefers-reduced-motion: reduce) {
  :global(.note-history-drawer .el-drawer__close-btn),
  .note-history-list button {
    transition: none;
  }
}
</style>
