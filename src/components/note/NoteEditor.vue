<template>
  <section class="note-editor" aria-label="笔记编辑器" :aria-busy="locked" :inert="locked">
    <template v-if="note">
      <div v-if="hasRecoverySnapshot" class="note-editor-recovery" role="status" aria-live="polite">
        <div>
          <Icon icon="material-symbols:history-rounded" />
          <span>检测到未保存的本地草稿</span>
        </div>
        <div>
          <el-button size="small" type="primary" @click="emit('restore-recovery')">恢复</el-button>
          <el-button size="small" @click="emit('discard-recovery')">放弃</el-button>
        </div>
      </div>

      <header class="note-editor-header">
        <el-input
          :model-value="note.title"
          :disabled="locked"
          aria-label="笔记标题"
          placeholder="无标题笔记"
          maxlength="100"
          @input="updateTitle"
        />
        <el-tag
          class="note-editor-save-status"
          :class="`is-${saveStatus}`"
          :type="statusType"
          effect="light"
          round
          role="status"
          aria-live="polite"
        >
          {{ statusText }}
        </el-tag>
        <el-tooltip content="立即保存（⌘/Ctrl + S）" placement="bottom">
          <el-button
            class="note-editor-save-button"
            text
            :loading="saveStatus === 'saving'"
            :disabled="locked || saveStatus === 'saving'"
            aria-label="立即保存笔记"
            @click="emit('save-now')"
          >
            <Icon icon="tabler:device-floppy" />
            <span>保存</span>
          </el-button>
        </el-tooltip>
        <el-tooltip content="历史版本" placement="bottom">
          <el-button
            class="note-editor-history-button"
            text
            circle
            :disabled="locked"
            aria-label="查看历史版本"
            @click="emit('show-history')"
          >
            <Icon icon="material-symbols:history-rounded" />
          </el-button>
        </el-tooltip>
        <el-button
          v-if="saveStatus === 'failed' || saveStatus === 'offline'"
          size="small"
          type="primary"
          plain
          @click="emit('retry-save')"
        >
          重试保存
        </el-button>
      </header>

      <div class="note-editor-meta" aria-label="笔记属性">
        <div class="note-editor-property">
          <span class="note-editor-field__label">
            <Icon icon="material-symbols:folder-outline-rounded" />
            文件夹
          </span>
          <el-dropdown :disabled="locked" trigger="click" @command="updateFolder">
            <el-button class="note-editor-property-button" text :disabled="locked">
              <span>{{ folderName }}</span>
              <Icon icon="material-symbols:keyboard-arrow-down-rounded" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="">未分类</el-dropdown-item>
                <el-dropdown-item v-for="folder in folders" :key="folder.id" :command="folder.id">
                  {{ folder.name }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div class="note-editor-property note-editor-property--tags">
          <span class="note-editor-field__label">
            <Icon icon="material-symbols:tag-rounded" />
            标签
          </span>
          <el-popover :disabled="locked" placement="bottom-start" trigger="click" :width="260">
            <template #reference>
              <el-button class="note-editor-tags-trigger" text :disabled="locked">
                <template v-if="visibleTags.length">
                  <el-tag v-for="tag in visibleTags" :key="tag.id" size="small" effect="plain" round>
                    {{ tag.name }}
                  </el-tag>
                  <span v-if="hiddenTagCount" class="note-editor-tags-more">+{{ hiddenTagCount }}</span>
                  <span class="note-editor-tags-add" aria-label="添加标签">+</span>
                </template>
                <span v-else class="note-editor-tags-placeholder">添加标签</span>
              </el-button>
            </template>
            <el-checkbox-group
              v-if="tags.length"
              :model-value="selectedTagIds"
              class="note-editor-tag-options"
              @change="updateTags"
            >
              <el-checkbox v-for="tag in tags" :key="tag.id" :value="tag.id">
                {{ tag.name }}
              </el-checkbox>
            </el-checkbox-group>
            <el-empty v-else description="暂无可用标签" :image-size="48" />
          </el-popover>
        </div>
      </div>

      <MdEditor ref="editorRef" class="note-milkdown-editor" @change="updateContent" />
    </template>
    <el-empty v-else description="从列表中选择一篇笔记" :image-size="110" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import MdEditor from '@/components/editor/MdEditor.vue'
import type { ApiId, INote, INoteFolder, INoteTag } from '@/interface/note'
import type { NoteSaveStatus } from '@/utils/note-autosave'

interface EditorInstance {
  setContent(value: string): void
}

interface Props {
  note: INote | null
  folders: INoteFolder[]
  tags: INoteTag[]
  saveStatus: NoteSaveStatus
  hasRecoverySnapshot: boolean
  locked?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (
    event: 'update-note',
    changes: Partial<Pick<INote, 'title' | 'content' | 'folderId' | 'tagList'>>
  ): void
  (event: 'retry-save'): void
  (event: 'restore-recovery'): void
  (event: 'discard-recovery'): void
  (event: 'save-now'): void
  (event: 'show-history'): void
}>()

const editorRef = ref<EditorInstance | null>(null)
const lastSavedTime = ref('')
const statusText = computed(() => ({
  idle: '尚未编辑',
  saving: '正在保存',
  saved: lastSavedTime.value ? `已保存 ${lastSavedTime.value}` : '已保存',
  failed: '保存失败',
  offline: '离线草稿'
})[props.saveStatus])
const statusType = computed<'success' | 'warning' | 'danger' | 'info'>(() => ({
  idle: 'info' as const,
  saving: 'warning' as const,
  saved: 'success' as const,
  failed: 'danger' as const,
  offline: 'warning' as const
})[props.saveStatus])
/**
 * 获取当前文件夹名称。
 *
 * :return: 当前文件夹名称。
 */
function resolveFolderName(): string {
  if (props.note?.folderId === null || props.note?.folderId === undefined) return '未分类'
  return props.folders.find((folder) => String(folder.id) === String(props.note?.folderId))?.name ?? '未分类'
}

/**
 * 获取当前笔记的标签标识。
 *
 * :return: 标签标识列表。
 */
function resolveSelectedTagIds(): ApiId[] {
  return props.note?.tagList.map((tag) => tag.id) ?? []
}

/**
 * 获取属性栏中直接展示的标签。
 *
 * :return: 最多三个标签。
 */
function resolveVisibleTags(): INoteTag[] {
  return props.note?.tagList.slice(0, 3) ?? []
}

/**
 * 获取属性栏中折叠的标签数量。
 *
 * :return: 未直接展示的标签数量。
 */
function resolveHiddenTagCount(): number {
  return Math.max(0, (props.note?.tagList.length ?? 0) - 3)
}

const folderName = computed(resolveFolderName)
const selectedTagIds = computed(resolveSelectedTagIds)
const visibleTags = computed(resolveVisibleTags)
const hiddenTagCount = computed(resolveHiddenTagCount)

/**
 * 格式化最近保存时间。
 *
 * :param value: 保存完成时间。
 * :return: 二十四小时制的时分文本。
 */
function formatSavedTime(value: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(value)
}

/**
 * 将笔记内容同步到编辑器。
 *
 * :param content: Markdown 内容。
 * :return: 无返回值。
 */
function syncEditor(content: string | undefined): void {
  void nextTick(() => {
    editorRef.value?.setContent(content ?? '')
  })
}

watch(
  () => props.note?.id,
  () => {
    lastSavedTime.value = ''
    syncEditor(props.note?.content)
  },
  { immediate: true }
)
watch(() => props.note?.content, syncEditor)
watch(
  () => props.saveStatus,
  (status, previousStatus) => {
    if (status === 'saved' && previousStatus !== 'saved') {
      lastSavedTime.value = formatSavedTime(new Date())
    }
  }
)

/**
 * 更新笔记标题。
 *
 * :param title: 笔记标题。
 * :return: 无返回值。
 */
function updateTitle(title: string): void {
  emit('update-note', { title })
}

/**
 * 更新笔记正文。
 *
 * :param content: Markdown 内容。
 * :return: 无返回值。
 */
function updateContent(content: string): void {
  if (content !== props.note?.content) emit('update-note', { content })
}

/**
 * 更新笔记文件夹。
 *
 * :param folderId: 文件夹标识。
 * :return: 无返回值。
 */
function updateFolder(folderId: ApiId | ''): void {
  emit('update-note', { folderId: folderId === '' ? null : folderId })
}

/**
 * 更新笔记标签。
 *
 * :param ids: 标签标识列表。
 * :return: 无返回值。
 */
function updateTags(ids: ApiId[]): void {
  emit('update-note', {
    tagList: props.tags.filter((tag) => ids.some((id) => String(id) === String(tag.id)))
  })
}

</script>

<style scoped lang="scss">
.note-editor {
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;
  min-height: 0;
  padding: 8px 14px 14px;
  overflow: hidden;
}

.note-editor-recovery {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--note-primary) 28%, var(--note-border));
  border-radius: 10px;
  color: var(--note-primary);
  background: var(--note-surface-active);
}

.note-editor-recovery > div {
  display: flex;
  align-items: center;
  gap: 7px;
}

.note-editor-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.note-editor-header .el-input {
  flex: 1;
}

.note-editor-header :deep(.el-input__wrapper) {
  min-height: 40px;
  padding: 0 2px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.note-editor-header :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 -2px 0 var(--note-primary) inset;
}

.note-editor-header :deep(.el-input__inner) {
  color: var(--note-text);
  font-size: 24px;
  font-weight: 700;
}

.note-editor-header :deep(.el-input__inner:focus-visible) {
  outline: none;
}

.note-editor-save-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  height: 26px;
  padding: 0 9px;
  border-color: color-mix(in srgb, currentColor 16%, transparent);
  background: color-mix(in srgb, currentColor 7%, var(--note-surface));
  box-shadow: 0 4px 12px rgb(15 23 42 / 4%);
  font-size: 12px;
  font-weight: 650;
}

.note-editor-save-status::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  content: '';
}

.note-editor-save-status.is-saving::before {
  animation: note-save-pulse 1.2s ease-in-out infinite;
}

.note-editor-save-status.is-failed,
.note-editor-save-status.is-offline {
  box-shadow: 0 4px 12px color-mix(in srgb, currentColor 12%, transparent);
}

.note-editor-save-button {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 9px;
  border-radius: 8px;
  color: var(--note-text-muted);
  background: var(--note-surface-subtle);
  transition: color 0.16s ease, background 0.16s ease, box-shadow 0.18s ease,
    transform 0.18s ease;
}

.note-editor-save-button :deep(.el-icon) {
  display: none;
}

.note-editor-save-button svg {
  width: 16px;
  height: 16px;
}

.note-editor-save-button span {
  margin-left: 5px;
  font-size: 12px;
  font-weight: 650;
}

.note-editor-save-button:hover:not(.is-disabled),
.note-editor-save-button:focus-visible:not(.is-disabled) {
  color: var(--note-primary);
  background: var(--note-surface-active);
  box-shadow: 0 6px 16px rgb(47 128 237 / 10%);
  transform: translateY(-1px);
}

@keyframes note-save-pulse {
  0%,
  100% {
    opacity: 0.42;
    transform: scale(0.82);
  }
  50% {
    opacity: 1;
    transform: scale(1.12);
  }
}

.note-editor-history-button {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--note-text-muted);
  background: var(--note-surface-subtle);
  transition: color 0.16s ease, background 0.16s ease, box-shadow 0.18s ease,
    transform 0.18s ease;
}

.note-editor-history-button:hover,
.note-editor-history-button:focus-visible {
  color: var(--note-primary);
  background: var(--note-surface-active);
  box-shadow: 0 6px 16px rgb(47 128 237 / 10%);
  transform: translateY(-1px);
}

.note-editor-history-button svg {
  width: 19px;
  height: 19px;
}

.note-editor-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  padding: 1px 4px 4px;
  border-bottom: 1px solid var(--note-border);
  background: transparent;
}

.note-editor-property {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.note-editor-property--tags {
  flex: 1;
  padding-left: 14px;
  border-left: 1px solid var(--note-border);
}

.note-editor-field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--note-text-muted);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.note-editor-field__label svg {
  box-sizing: content-box;
  width: 15px;
  height: 15px;
  padding: 3px;
  border-radius: 6px;
  color: var(--note-primary);
  background: color-mix(in srgb, var(--note-primary) 9%, transparent);
}

.note-editor-property-button,
.note-editor-tags-trigger {
  min-width: 0;
  height: 28px;
  margin: 0;
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  color: var(--note-text);
  background: transparent;
  transition: color 0.16s ease, background 0.16s ease, box-shadow 0.18s ease;
}

.note-editor-property-button:hover,
.note-editor-tags-trigger:hover,
.note-editor-property-button:focus-visible,
.note-editor-tags-trigger:focus-visible {
  color: var(--note-primary);
  background: var(--note-surface-active);
  box-shadow: 0 4px 12px rgb(47 128 237 / 8%);
}

.note-editor-property-button :deep(> span),
.note-editor-tags-trigger :deep(> span) {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.note-editor-property-button span {
  overflow: hidden;
  max-width: 180px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-editor-tags-trigger {
  justify-content: flex-start;
  max-width: 100%;
}

.note-editor-tags-trigger :deep(.el-tag) {
  border-color: color-mix(in srgb, var(--note-primary) 25%, transparent);
  color: var(--note-primary);
  background: color-mix(in srgb, var(--note-primary) 7%, var(--note-surface));
}

.note-editor-tags-more,
.note-editor-tags-placeholder,
.note-editor-tags-add {
  color: var(--note-text-muted);
  font-size: 12px;
}

.note-editor-tags-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--note-surface-subtle);
  transition: color 0.16s ease, background 0.16s ease, transform 0.18s ease;
}

.note-editor-tags-trigger:hover .note-editor-tags-add {
  color: var(--note-primary);
  background: color-mix(in srgb, var(--note-primary) 12%, transparent);
  transform: rotate(90deg);
}

.note-editor-tag-options {
  display: grid;
  max-height: 260px;
  overflow-y: auto;
}

.note-editor-tag-options .el-checkbox {
  margin-right: 0;
}

.note-milkdown-editor {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

@media (prefers-reduced-motion: reduce) {
  .note-editor *,
  .note-editor *::before,
  .note-editor *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

@media (max-width: 560px) {
  .note-editor {
    padding: 8px 14px 14px;
  }

  .note-editor-header,
  .note-editor-recovery {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .note-editor-header .el-input {
    flex-basis: 100%;
  }

  .note-editor-save-status {
    margin-right: auto;
  }

  .note-editor-meta {
    align-items: stretch;
    flex-direction: column;
    gap: 4px;
  }

  .note-editor-property--tags {
    padding-top: 4px;
    padding-left: 0;
    border-top: 1px solid var(--note-border);
    border-left: 0;
  }
}
</style>
