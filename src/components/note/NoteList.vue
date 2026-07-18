<template>
  <section class="note-list" aria-label="笔记列表">
    <div class="note-list-toolbar">
      <el-button class="note-list-nav" plain @click="emit('open-navigation')">
        <Icon icon="material-symbols:menu-rounded" />
        导航
      </el-button>
      <el-input
        :model-value="keyword"
        aria-label="搜索笔记标题"
        placeholder="搜索笔记"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <Icon icon="material-symbols:search-rounded" />
        </template>
      </el-input>
    </div>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon>
      <template #default>
        <el-button size="small" @click="emit('retry')">重新加载</el-button>
      </template>
    </el-alert>
    <el-skeleton v-else-if="loading" :rows="5" animated class="note-list-loading" />
    <el-empty v-else-if="!notes.length" description="暂无笔记" :image-size="84" />
    <ul v-else>
      <li
        v-for="note in notes"
        :key="note.id"
        :class="{
          'is-active': String(activeId) === String(note.id),
          'is-recycle': isRecycleBin
        }"
      >
        <el-button
          class="note-list-item__main"
          text
          :aria-current="String(activeId) === String(note.id) ? 'true' : undefined"
          :aria-label="`打开笔记 ${note.title}`"
          @click="emit('select-note', note.id)"
        >
          <span class="note-list-item__title">{{ note.title || '无标题笔记' }}</span>
          <span v-if="note.isPinned" class="note-list-item__pin">
            <Icon icon="material-symbols:keep-rounded" />
          </span>
        </el-button>
        <div
          class="note-list-item__actions"
          :class="{ 'note-list-item__actions--recycle': isRecycleBin }"
        >
          <el-button
            v-if="!isRecycleBin"
            text
            circle
            :aria-label="note.isPinned ? '取消置顶' : '置顶'"
            @click="emit('toggle-pin', note.id, !note.isPinned)"
          >
            <Icon :icon="note.isPinned ? 'material-symbols:keep-off-outline-rounded' : 'material-symbols:keep-outline-rounded'" />
          </el-button>
          <el-button
            v-if="!isRecycleBin"
            text
            circle
            type="danger"
            aria-label="删除笔记"
            @click="confirmRemove(note.id)"
          >
            <Icon icon="material-symbols:delete-outline-rounded" />
          </el-button>
          <el-button v-if="isRecycleBin" text aria-label="恢复笔记" @click="emit('restore', note.id)">
            恢复
          </el-button>
          <el-button
            v-if="isRecycleBin"
            text
            type="danger"
            aria-label="永久删除笔记"
            @click="permanentDelete(note.id)"
          >
            彻底删除
          </el-button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import type { ApiId, INoteListItem } from '@/interface/note'

interface Props {
  notes: INoteListItem[]
  activeId?: ApiId
  keyword: string
  loading: boolean
  error: string
  isRecycleBin: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  (event: 'search', value: string): void
  (event: 'open-navigation'): void
  (event: 'retry'): void
  (event: 'select-note', id: ApiId): void
  (event: 'toggle-pin', id: ApiId, pinned: boolean): void
  (event: 'remove', id: ApiId): void
  (event: 'restore', id: ApiId): void
  (event: 'permanent-delete', id: ApiId): void
}>()

/**
 * 提交搜索关键词。
 *
 * :param value: 搜索关键词。
 * :return: 无返回值。
 */
function handleSearch(value: string): void {
  emit('search', value)
}

/**
 * 确认后将笔记移入回收站。
 *
 * :param noteId: 笔记标识。
 * :return: 无返回值。
 */
async function confirmRemove(noteId: ApiId): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后可从回收站找回该笔记，是否继续？', '删除笔记', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    emit('remove', noteId)
  } catch {
    // 用户取消时不移动笔记。
  }
}

/**
 * 确认后永久删除笔记。
 *
 * :param noteId: 笔记标识。
 * :return: 无返回值。
 */
async function permanentDelete(noteId: ApiId): Promise<void> {
  try {
    await ElMessageBox.confirm('永久删除后无法恢复，是否继续？', '彻底删除笔记', {
      confirmButtonText: '彻底删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    emit('permanent-delete', noteId)
  } catch {
    // 用户取消时不执行删除。
  }
}
</script>

<style scoped lang="scss">
.note-list {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 18px 14px;
}

.note-list-toolbar {
  position: sticky;
  z-index: 3;
  top: 0;
  display: flex;
  align-self: start;
  gap: 8px;
  margin: -18px -14px 0;
  padding: 18px 14px 8px;
  background: var(--note-surface);
}

.note-list :deep(.el-input__wrapper) {
  min-height: 40px;
  border-radius: 10px;
  box-shadow: 0 0 0 1px var(--note-border) inset;
}

.note-list-loading {
  padding: 8px;
}

.note-list ul {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.note-list li {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 48px;
  border: 1px solid transparent;
  border-radius: 11px;
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 180ms ease;
}

.note-list li:hover,
.note-list li:focus-within {
  border-color: var(--note-border);
  background: var(--note-surface-subtle);
  box-shadow: var(--note-shadow);
}

.note-list li.is-active {
  border-color: color-mix(in srgb, var(--note-primary) 22%, var(--note-border));
  background: var(--note-surface-active);
}

.note-list-item__main {
  justify-content: flex-start;
  width: 100%;
  min-width: 0;
  height: 46px;
  margin: 0;
  padding: 0 72px 0 12px;
  color: var(--note-text);
}

.note-list-item__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-list-item__pin {
  display: inline-flex;
  flex: none;
  color: var(--note-primary);
}

.note-list-item__actions {
  position: absolute;
  right: 7px;
  display: flex;
  opacity: 0;
  transition: opacity 160ms ease;
}

.note-list li:hover .note-list-item__actions,
.note-list li:focus-within .note-list-item__actions,
.note-list li.is-active .note-list-item__actions {
  opacity: 1;
}

.note-list-item__actions .el-button {
  width: 30px;
  height: 30px;
  margin: 0;
  padding: 0;
}

.note-list li.is-recycle .note-list-item__main {
  padding-right: 116px;
}

.note-list-item__actions--recycle {
  gap: 2px;
  opacity: 1;
}

.note-list-item__actions--recycle .el-button {
  width: auto;
  min-width: 0;
  padding: 0 6px;
  white-space: nowrap;
}

.note-list-nav {
  display: none;
  margin: 0;
}

@media (max-width: 1199px) {
  .note-list-nav {
    display: inline-flex;
  }
}
</style>
