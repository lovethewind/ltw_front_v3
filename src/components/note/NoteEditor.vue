<template>
  <section
    class="note-editor"
    aria-label="笔记编辑器"
    :aria-busy="locked"
    :inert="locked"
    @click="closePropertyPickers"
  >
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
          <div class="note-editor-property-picker" @click.stop>
            <button
              class="note-editor-property-button"
              type="button"
              :disabled="locked"
              :aria-expanded="folderPickerVisible"
              @click="toggleFolderPicker"
            >
              <Icon icon="material-symbols:folder-outline-rounded" />
              <span>{{ folderName }}</span>
              <Icon icon="material-symbols:keyboard-arrow-down-rounded" />
            </button>
            <div v-if="folderPickerVisible" class="note-editor-property-popover is-folder">
              <div class="note-editor-popover-title">
                <span>移动到文件夹</span>
                <small>{{ folderOptions.length }} 个</small>
              </div>
              <button
                class="note-editor-folder-option"
                :class="{ 'is-selected': note.folderId === null }"
                type="button"
                @click="updateFolder('')"
              >
                <Icon icon="tabler:folder-question" />
                <span>未分类</span>
                <Icon v-if="note.folderId === null" icon="material-symbols:check-rounded" />
              </button>
              <div class="note-editor-popover-divider" />
              <div class="note-editor-popover-scroll">
                <button
                  v-for="folder in folderOptions"
                  :key="folder.id"
                  class="note-editor-folder-option"
                  :class="{ 'is-selected': String(note.folderId) === String(folder.id) }"
                  :style="{ paddingLeft: `${10 + folder.depth * 14}px` }"
                  type="button"
                  @click="updateFolder(folder.id)"
                >
                  <Icon icon="material-symbols:folder-outline-rounded" />
                  <span>{{ folder.name }}</span>
                  <Icon
                    v-if="String(note.folderId) === String(folder.id)"
                    icon="material-symbols:check-rounded"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="note-editor-property note-editor-property--tags">
          <span class="note-editor-field__label">
            <Icon icon="material-symbols:label-outline-rounded" />
            标签
          </span>
          <div class="note-editor-property-picker is-tags" @click.stop>
              <button
                class="note-editor-tags-trigger"
                type="button"
                :disabled="locked"
                :aria-expanded="tagPickerVisible"
                @click="toggleTagPicker"
              >
                <template v-if="visibleTags.length">
                  <span v-for="tag in visibleTags" :key="tag.id" class="note-editor-tag-chip">
                    {{ tag.name }}
                  </span>
                  <span v-if="hiddenTagCount" class="note-editor-tags-more">+{{ hiddenTagCount }}</span>
                  <span class="note-editor-tags-add" aria-label="添加标签">+</span>
                </template>
                <span v-else class="note-editor-tags-placeholder">添加标签</span>
              </button>
              <div v-if="tagPickerVisible" class="note-editor-property-popover is-tags">
                <div class="note-editor-popover-title">
                  <span>选择标签</span>
                  <small>{{ selectedTagIds.length }}/12</small>
                </div>
                <label class="note-editor-tag-search">
                  <Icon icon="material-symbols:search-rounded" />
                  <input v-model="tagSearchKeyword" autofocus placeholder="搜索标签" />
                </label>
                <div v-if="filteredTags.length" class="note-editor-tag-options">
                  <button
                    v-for="tag in filteredTags"
                    :key="tag.id"
                    type="button"
                    @click="toggleTag(tag.id)"
                  >
                    <span
                      class="note-editor-tag-check"
                      :class="{ 'is-checked': selectedTagIds.some((id) => String(id) === String(tag.id)) }"
                    >
                      <Icon
                        v-if="selectedTagIds.some((id) => String(id) === String(tag.id))"
                        icon="material-symbols:check-rounded"
                      />
                    </span>
                    <span>{{ tag.name }}</span>
                  </button>
                </div>
                <p v-else class="note-editor-tag-empty">没有匹配的标签</p>
              </div>
          </div>
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
  setContent(value: string, resetScroll?: boolean): void
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
const folderPickerVisible = ref(false)
const tagPickerVisible = ref(false)
const tagSearchKeyword = ref('')
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
const folderOptions = computed(() => {
  const options: Array<INoteFolder & { depth: number }> = []
  const visited = new Set<string>()

  /**
   * 按文件夹层级生成自定义选择器选项。
   *
   * :param parentId: 当前父文件夹标识。
   * :param depth: 当前层级深度。
   * :return: 无返回值。
   */
  function appendOptions(parentId: ApiId | null, depth: number): void {
    for (const folder of props.folders.filter((item) =>
      parentId === null ? item.parentId === null : String(item.parentId) === String(parentId)
    )) {
      if (visited.has(String(folder.id))) continue
      visited.add(String(folder.id))
      options.push({ ...folder, depth })
      appendOptions(folder.id, depth + 1)
    }
  }

  appendOptions(null, 0)
  return options
})
const filteredTags = computed(() => {
  const keyword = tagSearchKeyword.value.trim().toLocaleLowerCase()
  return props.tags.filter((tag) => !keyword || tag.name.toLocaleLowerCase().includes(keyword))
})

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
 * :param resetScroll: 是否重置编辑区滚动位置。
 * :return: 无返回值。
 */
function syncEditor(content: string | undefined, resetScroll: boolean): void {
  void nextTick(() => {
    editorRef.value?.setContent(content ?? '', resetScroll)
  })
}

watch(
  () => [props.note?.id, props.note?.content] as const,
  ([noteId, content], previous) => {
    const documentChanged = noteId !== previous?.[0]
    if (documentChanged) lastSavedTime.value = ''
    syncEditor(content, documentChanged)
  },
  { immediate: true }
)
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
  folderPickerVisible.value = false
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

/**
 * 切换文件夹选择弹窗。
 *
 * :return: 无返回值。
 */
function toggleFolderPicker(): void {
  folderPickerVisible.value = !folderPickerVisible.value
  tagPickerVisible.value = false
}

/**
 * 切换标签选择弹窗。
 *
 * :return: 无返回值。
 */
function toggleTagPicker(): void {
  tagPickerVisible.value = !tagPickerVisible.value
  folderPickerVisible.value = false
  if (!tagPickerVisible.value) tagSearchKeyword.value = ''
}

/**
 * 关闭笔记属性选择弹窗。
 *
 * :return: 无返回值。
 */
function closePropertyPickers(): void {
  folderPickerVisible.value = false
  tagPickerVisible.value = false
  tagSearchKeyword.value = ''
}

/**
 * 切换单个标签选中状态。
 *
 * :param tagId: 标签标识。
 * :return: 无返回值。
 */
function toggleTag(tagId: ApiId): void {
  const ids = selectedTagIds.value
  const selected = ids.some((id) => String(id) === String(tagId))
  updateTags(selected
    ? ids.filter((id) => String(id) !== String(tagId))
    : [...ids, tagId].slice(0, 12))
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
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 28px;
  margin: 0;
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  color: var(--note-text);
  background: transparent;
  cursor: pointer;
  font: inherit;
  transition: color 0.16s ease, background 0.16s ease, box-shadow 0.18s ease;
}

.note-editor-property-button {
  min-width: 120px;
  height: 28px;
  border: 1px solid var(--note-border);
  border-radius: 9px;
  background: linear-gradient(
    180deg,
    var(--note-surface),
    color-mix(in srgb, var(--note-surface) 92%, var(--note-primary))
  );
  font-size: 13px;
  font-weight: 500;
}

.note-editor-property-button > svg:first-child {
  flex: 0 0 auto;
  color: var(--note-text-muted);
  font-size: 15px;
}

.note-editor-property-button > svg:last-child {
  margin-left: auto;
}

.note-editor-property-button:hover,
.note-editor-tags-trigger:hover,
.note-editor-property-button:focus-visible,
.note-editor-tags-trigger:focus-visible {
  color: var(--note-primary);
  background: var(--note-surface-active);
  box-shadow: 0 4px 12px rgb(47 128 237 / 8%);
}

.note-editor-property-button span {
  overflow: hidden;
  max-width: 180px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-editor-tags-trigger {
  justify-content: flex-start;
  width: 100%;
  max-width: 100%;
}

.note-editor-tag-chip {
  overflow: hidden;
  max-width: 88px;
  border: 1px solid color-mix(in srgb, var(--note-primary) 25%, transparent);
  border-radius: 999px;
  padding: 2px 7px;
  border-color: color-mix(in srgb, var(--note-primary) 25%, transparent);
  color: var(--note-primary);
  background: color-mix(in srgb, var(--note-primary) 7%, var(--note-surface));
  font-size: 11px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.note-editor-property-picker {
  position: relative;
  min-width: 0;
}

.note-editor-property-picker.is-tags {
  flex: 1;
  min-width: 180px;
}

.note-editor-property-popover {
  position: absolute;
  z-index: 90;
  top: calc(100% + 8px);
  left: 0;
  width: 270px;
  padding: 8px;
  border: 1px solid var(--note-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--note-surface) 96%, transparent);
  box-shadow: 0 20px 55px rgb(15 23 42 / 18%);
  backdrop-filter: blur(20px);
}

.note-editor-property-popover.is-tags {
  width: min(310px, calc(100vw - 48px));
}

.note-editor-popover-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 8px;
  color: var(--note-text);
  font-size: 12px;
  font-weight: 800;
}

.note-editor-popover-title small {
  color: var(--note-text-muted);
  font-size: 10px;
  font-weight: 650;
}

.note-editor-popover-divider {
  height: 1px;
  margin: 5px 4px;
  background: var(--note-border);
}

.note-editor-popover-scroll,
.note-editor-tag-options {
  display: grid;
  max-height: 240px;
  gap: 2px;
  overflow-y: auto;
}

.note-editor-folder-option,
.note-editor-tag-options button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 0;
  border-radius: 9px;
  padding: 0 10px;
  color: var(--note-text-muted);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  text-align: left;
}

.note-editor-folder-option:hover,
.note-editor-tag-options button:hover,
.note-editor-folder-option.is-selected {
  color: var(--note-primary);
  background: var(--note-surface-active);
}

.note-editor-folder-option > span,
.note-editor-tag-options button > span:last-child {
  overflow: hidden;
  flex: 1;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-editor-folder-option > svg {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
}

.note-editor-tag-search {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  margin: 3px 3px 7px;
  border: 1px solid var(--note-border);
  border-radius: 9px;
  padding: 0 9px;
  color: var(--note-text-muted);
  background: var(--note-surface-subtle);
}

.note-editor-tag-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--note-text);
  background: transparent;
  font: inherit;
  font-size: 11px;
}

.note-editor-tag-check {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 17px;
  height: 17px;
  border: 1px solid var(--note-border);
  border-radius: 5px;
  color: white;
  background: var(--note-surface);
}

.note-editor-tag-check.is-checked {
  border-color: var(--note-primary);
  background: var(--note-primary);
}

.note-editor-tag-empty {
  margin: 16px 0;
  color: var(--note-text-muted);
  font-size: 11px;
  text-align: center;
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
