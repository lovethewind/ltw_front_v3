<template>
  <el-dialog
    v-model="visible"
    class="note-quick-open-dialog note-picker-dialog"
    width="min(620px, 92vw)"
    align-center
    :show-close="false"
    append-to-body
    @opened="focusInput"
  >
    <div class="note-picker" @click.self="visible = false">
      <div class="note-picker__search">
        <Icon icon="material-symbols:search-rounded" />
        <input
          ref="inputRef"
          v-model="keyword"
          type="text"
          :placeholder="props.placeholder"
          autocomplete="off"
          aria-label="搜索笔记"
          @keydown="handleKeydown"
        />
        <kbd>Esc</kbd>
      </div>

      <div ref="resultsRef" class="note-picker__results" role="listbox" :aria-label="props.title">
        <button
          v-for="(row, index) in results"
          :key="String(row.note.id)"
          type="button"
          role="option"
          class="note-picker__result"
          :class="{ active: index === activeIndex }"
          :aria-selected="index === activeIndex"
          @mouseenter="activeIndex = index"
          @click="choose(row)"
        >
          <Icon class="note-picker__result-icon" icon="material-symbols:description-outline-rounded" />
          <span class="note-picker__result-copy">
            <strong>{{ row.note.title || '无标题笔记' }}</strong>
            <small>{{ row.excerpt || '暂无正文内容' }}</small>
          </span>
          <em>{{ row.folderPath }}</em>
        </button>
        <div v-if="!results.length" class="note-picker__empty">
          <Icon icon="material-symbols:search-off-rounded" />
          没有找到匹配的笔记
        </div>
      </div>

      <footer class="note-picker__footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
        <span><kbd>Enter</kbd> {{ props.confirmLabel }}</span>
        <small>{{ results.length }} 篇</small>
      </footer>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { INoteFolder, INoteListItem } from '@/interface/note'
import { buildQuickOpenResults } from '@/utils/note-quick-open'

/**
 * 笔记选择器：从全库挑一篇笔记，供「插入笔记链接 / 插入笔记嵌入」使用。
 *
 * ## 与桌面端的关系
 *
 * 桌面端 `NoteLinkPicker.vue` 由 `MarkdownVisualEditor.vue` 以 props 注入候选
 * （数据来自本地 SQLite 的工作区）。网页端没有本地库，但目录树本来就把全部笔记
 * 拉进了 `store.notes`，所以这里同样**只做本地过滤**：候选与打分直接复用
 * `@/utils/note-quick-open` 的 `buildQuickOpenResults` —— 与 Cmd+K 快速打开
 * **同一套排序与打分**，用户在两处搜同一关键词得到同一个顺序。
 *
 * ## 视觉为什么挂 quick-open 的类
 *
 * 根节点同时带 `note-quick-open-dialog`：那个类持有 `--qo-*` 配色变量（浅 / 暗两套）
 * 与圆角投影，内部再按 `note-picker__*` 铺结构。这样两个弹窗天然同色，且暗色主题
 * 只需在 note.scss 里维护一处。
 *
 * 组件本身不取数、不跳转 —— 选中后把笔记原样交给父级，由调用方决定写链接还是写嵌入。
 */
interface Props {
  /** 全库笔记（网页端即 `store.notes`）。 */
  notes: INoteListItem[]
  folders: INoteFolder[]
  /** 弹窗标题，同时作为列表的 aria-label。 */
  title?: string
  /** 底部键位提示里的动词（插入 / 嵌入）。 */
  confirmLabel?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '插入笔记链接',
  confirmLabel: '插入',
  placeholder: '搜索笔记标题…'
})

const emit = defineEmits<{
  (event: 'select', note: INoteListItem): void
}>()

const visible = defineModel<boolean>('visible', { required: true })

const keyword = ref('')
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const resultsRef = ref<HTMLElement | null>(null)

/**
 * 候选列表：与快速打开共用打分与排序（标题 > 标签 > 路径 > 正文，同分按更新时间倒序）。
 *
 * 关键词为空时 `buildQuickOpenResults` 的 score 恒为 0，于是结果就是「最近更新的
 * 若干篇」—— 正好是选择器最想要的默认视图，不必另写一套排序。
 */
const results = computed(() =>
  buildQuickOpenResults(props.notes, props.folders, {
    keyword: keyword.value,
    folderId: null,
    tagId: null,
    updatedWithin: 'all',
    pinnedOnly: false
  })
)

/** :return: 无返回值。 */
function focusInput(): void {
  void nextTick(() => inputRef.value?.focus())
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
 * 选中一条结果：关闭弹窗并把笔记交给父级。
 *
 * :param row: 选中的结果项。
 * :return: 无返回值。
 */
function choose(row: { note: INoteListItem }): void {
  visible.value = false
  emit('select', row.note)
}

/**
 * 键盘导航：↑↓ 移动、Enter 选中、Esc 关闭。
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
    const row = results.value[activeIndex.value]
    if (row) choose(row)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    visible.value = false
  }
}

watch(visible, (isVisible) => {
  if (!isVisible) return
  keyword.value = ''
  activeIndex.value = 0
})

watch(keyword, () => {
  activeIndex.value = 0
})
</script>
