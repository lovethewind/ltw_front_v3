<template>
  <el-dialog
    v-model="visible"
    class="note-quick-open-dialog"
    width="min(680px, 94vw)"
    align-center
    :show-close="false"
    :close-on-click-modal="true"
    append-to-body
    @opened="focusInput"
  >
    <div class="note-quick-open" @click.self="visible = false">
      <div class="note-quick-open__search">
        <Icon icon="material-symbols:search-rounded" />
        <input
          ref="inputRef"
          v-model="keyword"
          type="text"
          placeholder="搜索标题、正文、标签或文件夹"
          autocomplete="off"
          aria-label="搜索笔记"
          @keydown="handleKeydown"
        />
        <button
          type="button"
          class="note-quick-open__filter-toggle"
          :class="{ 'is-active': hasFilters }"
          :aria-expanded="filtersVisible"
          aria-label="显示高级搜索筛选"
          @click="filtersVisible = !filtersVisible"
        >
          <Icon icon="material-symbols:tune-rounded" />
          <span>{{ hasFilters ? '筛选中' : '筛选' }}</span>
        </button>
        <kbd>Esc</kbd>
      </div>

      <div v-if="filtersVisible" class="note-quick-open__filters">
        <label class="note-quick-open__field">
          <span>文件夹</span>
          <el-select
            v-model="folderId"
            clearable
            filterable
            placeholder="全部文件夹"
            size="small"
            @change="resetActive"
          >
            <el-option
              v-for="option in folderSelectOptions"
              :key="String(option.id)"
              :label="option.label"
              :value="option.id"
            />
          </el-select>
        </label>

        <label class="note-quick-open__field">
          <span>标签</span>
          <el-select
            v-model="tagId"
            clearable
            filterable
            placeholder="全部标签"
            size="small"
            @change="resetActive"
          >
            <el-option v-for="tag in tags" :key="String(tag.id)" :label="tag.name" :value="tag.id" />
          </el-select>
        </label>

        <label class="note-quick-open__field">
          <span>更新时间</span>
          <el-select v-model="updatedWithin" size="small" @change="resetActive">
            <el-option v-for="option in updatedOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </label>

        <button
          type="button"
          class="note-quick-open__pinned"
          :class="{ 'is-active': pinnedOnly }"
          :aria-pressed="pinnedOnly"
          @click="togglePinnedOnly"
        >
          <Icon icon="material-symbols:keep-outline-rounded" />仅置顶
        </button>
        <button type="button" class="note-quick-open__filter-clear" :disabled="!hasFilters" @click="clearFilters">
          清除
        </button>
      </div>

      <div v-if="!keyword.trim() && !hasFilters && history.length" class="note-quick-open__history">
        <span class="note-quick-open__history-title">最近搜索</span>
        <div class="note-quick-open__history-list">
          <span v-for="item in history" :key="item" class="note-quick-open__history-item">
            <button type="button" :aria-label="`使用最近搜索 ${item}`" @click="applyHistory(item)">{{ item }}</button>
            <button
              type="button"
              class="note-quick-open__history-remove"
              :aria-label="`删除最近搜索 ${item}`"
              @click.stop="saveHistory(history.filter((value) => value !== item))"
            >
              <Icon icon="material-symbols:close-rounded" />
            </button>
          </span>
          <button type="button" class="note-quick-open__history-clear" aria-label="清空最近搜索" @click="saveHistory([])">
            清空
          </button>
        </div>
      </div>

      <div ref="resultsRef" class="note-quick-open__results" role="listbox" aria-label="笔记搜索结果">
        <button
          v-for="(result, index) in results"
          :key="String(result.note.id)"
          type="button"
          role="option"
          class="note-quick-open__result"
          :class="{ active: index === activeIndex }"
          :aria-selected="index === activeIndex"
          @mouseenter="activeIndex = index"
          @click="chooseResult(result)"
        >
          <Icon class="note-quick-open__result-icon" icon="material-symbols:description-outline-rounded" />
          <span class="note-quick-open__result-copy">
            <strong>{{ result.note.title || '无标题笔记' }}</strong>
            <small>{{ result.excerpt || '暂无正文内容' }}</small>
          </span>
          <em>{{ result.folderPath }}</em>
        </button>
        <div v-if="!results.length" class="note-quick-open__empty">
          <Icon icon="material-symbols:search-off-rounded" />
          没有找到匹配的笔记
        </div>
      </div>

      <footer class="note-quick-open__footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
        <span><kbd>Enter</kbd> 打开</span>
        <small v-if="!keyword.trim() && !hasFilters">最近更新的笔记</small>
        <small v-else-if="hasFilters">已应用高级筛选</small>
      </footer>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { ApiId, INoteFolder, INoteListItem, INoteTag } from '@/interface/note'
import {
  buildQuickOpenResults,
  type QuickOpenFilters,
  type QuickOpenResult,
  type QuickOpenUpdatedWithin
} from '@/utils/note-quick-open'

/**
 * 全库快速打开面板。
 *
 * ## 与桌面端的关系
 *
 * 交互与桌面端 `QuickOpenDialog.vue` 对齐（同一套「关键词 + 文件夹 / 标签 / 时间 /
 * 置顶」筛选、↑↓ Enter Esc 键位、最近搜索历史、条目权重打分），差别只在**数据源**：
 * 桌面端查本地 SQLite，网页端直接过滤已加载的全库列表（见 `@/utils/note-quick-open`）。
 * 候选与打分逻辑抽在纯函数模块里并有真行为测试，本组件只负责交互与展示。
 *
 * ## 快捷键
 *
 * 由父级（`NoteWorkspace`）注册 `Cmd/Ctrl + K`，本组件不自带全局监听，避免多处抢键。
 */
interface Props {
  /** 全库笔记（网页端即 `store.notes`，含回收站之外的完整列表）。 */
  notes: INoteListItem[]
  folders: INoteFolder[]
  tags: INoteTag[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'select', note: INoteListItem, contentMatched: boolean, keyword: string): void
}>()

const visible = defineModel<boolean>('visible', { required: true })

const HISTORY_STORAGE_KEY = 'notes-quick-open-history'
const HISTORY_LIMIT = 8

/** 时间范围下拉（与桌面端同款文案）。 */
const updatedOptions: Array<{ value: QuickOpenUpdatedWithin; label: string }> = [
  { value: 'all', label: '不限时间' },
  { value: '7', label: '最近 7 天' },
  { value: '30', label: '最近 30 天' },
  { value: '365', label: '最近一年' }
]

const keyword = ref('')
const filtersVisible = ref(false)
const folderId = ref<ApiId | null>(null)
const tagId = ref<ApiId | null>(null)
const updatedWithin = ref<QuickOpenUpdatedWithin>('all')
const pinnedOnly = ref(false)
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const resultsRef = ref<HTMLElement | null>(null)
const history = ref<string[]>(loadHistory())

const filters = computed<QuickOpenFilters>(() => ({
  keyword: keyword.value,
  folderId: folderId.value,
  tagId: tagId.value,
  updatedWithin: updatedWithin.value,
  pinnedOnly: pinnedOnly.value
}))
/** 是否启用了「关键词以外」的筛选项（用于按钮态与清空可用性）。 */
const hasFilters = computed(
  () => Boolean(folderId.value || tagId.value) || updatedWithin.value !== 'all' || pinnedOnly.value
)
const results = computed<QuickOpenResult[]>(() =>
  buildQuickOpenResults(props.notes, props.folders, filters.value)
)

/** 把文件夹树摊平成带缩进的下拉选项，便于在 select 里还原层级。 */
const folderSelectOptions = computed(() => {
  const options: Array<{ id: ApiId; label: string }> = []
  const visited = new Set<string>()

  const append = (parentId: ApiId | null, depth: number): void => {
    for (const folder of props.folders) {
      if (folder.isDeleted) continue
      const sameParent = (folder.parentId ?? null) === parentId
      if (!sameParent || visited.has(String(folder.id))) continue
      visited.add(String(folder.id))
      options.push({ id: folder.id, label: `${'　'.repeat(depth)}${folder.name}` })
      append(folder.id, depth + 1)
    }
  }

  append(null, 0)
  return options
})

/** 从本地存储读取最近搜索词。 */
function loadHistory(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(HISTORY_STORAGE_KEY) || '[]')
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, HISTORY_LIMIT)
      : []
  } catch {
    return []
  }
}

/**
 * 写回最近搜索词。
 *
 * :param nextHistory: 新的历史列表。
 * :return: 无返回值。
 */
function saveHistory(nextHistory: string[]): void {
  history.value = nextHistory.slice(0, HISTORY_LIMIT)
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.value))
  } catch {
    /* 隐私模式下写入失败不影响使用 */
  }
}

/**
 * 记录一次完成的搜索词并忽略大小写去重。
 *
 * :param value: 搜索词。
 * :return: 无返回值。
 */
function rememberKeyword(value: string): void {
  const normalized = value.trim()
  if (!normalized) return
  saveHistory([
    normalized,
    ...history.value.filter((item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase())
  ])
}

/** :return: 无返回值。 */
function resetActive(): void {
  activeIndex.value = 0
}

/** :return: 无返回值。 */
function focusInput(): void {
  void nextTick(() => inputRef.value?.focus())
}

/** :return: 无返回值。 */
function togglePinnedOnly(): void {
  pinnedOnly.value = !pinnedOnly.value
  resetActive()
}

/** :return: 无返回值。 */
function clearFilters(): void {
  folderId.value = null
  tagId.value = null
  updatedWithin.value = 'all'
  pinnedOnly.value = false
  resetActive()
}

/**
 * 套用一条最近搜索词。
 *
 * :param value: 搜索词。
 * :return: 无返回值。
 */
function applyHistory(value: string): void {
  keyword.value = value
  resetActive()
  focusInput()
}

/**
 * 选中一条结果：关闭面板、记录搜索词并交给父级跳转。
 *
 * :param result: 选中的结果项。
 * :return: 无返回值。
 */
function chooseResult(result: QuickOpenResult): void {
  const currentKeyword = keyword.value.trim()
  visible.value = false
  rememberKeyword(currentKeyword)
  emit('select', result.note, result.contentMatched, currentKeyword)
}

/** 把当前高亮项滚动到可视区内。 */
function scrollActiveIntoView(): void {
  void nextTick(() => {
    resultsRef.value
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  })
}

/**
 * 键盘导航：↑↓ 移动、Enter 打开、Esc 关闭。
 *
 * :param event: 键盘事件。
 * :return: 无返回值。
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, Math.max(results.value.length - 1, 0))
    scrollActiveIntoView()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    scrollActiveIntoView()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const result = results.value[activeIndex.value]
    if (result) chooseResult(result)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    if (filtersVisible.value && hasFilters.value) {
      clearFilters()
      return
    }
    visible.value = false
  }
}

watch(visible, (isVisible) => {
  if (!isVisible) return
  keyword.value = ''
  filtersVisible.value = false
  folderId.value = null
  tagId.value = null
  updatedWithin.value = 'all'
  pinnedOnly.value = false
  activeIndex.value = 0
})

watch(keyword, resetActive)
</script>
