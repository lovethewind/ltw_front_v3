<template>
  <div
    ref="editorShellRef"
    class="milkdown-editor-shell"
    :class="{
      'has-outline': props.showOutline && outlineOpen,
      'is-readonly': props.readonly,
      'is-toolbar-hidden': !props.showToolbar
    }"
  >
    <div ref="editorScrollRef" class="milkdown-editor-scroll" @scroll.passive="handleEditorScroll">
      <div ref="editorRootRef" class="milkdown-editor-root" />
    </div>
    <aside
      v-if="props.showOutline && outlineOpen"
      id="markdown-outline-panel"
      class="markdown-outline"
      aria-label="Markdown 大纲"
    >
      <header class="markdown-outline__header">
        <h2>大纲</h2>
        <button type="button" class="markdown-outline__close" aria-label="关闭大纲" @click="toggleOutline">
          <Icon icon="material-symbols:close-rounded" />
        </button>
      </header>
      <nav v-if="outlineItems.length" class="markdown-outline__list" aria-label="文档标题">
        <button
          v-for="item in outlineItems"
          :key="`${item.index}-${item.text}`"
          type="button"
          class="markdown-outline-item"
          :class="{ 'is-active': item.index === activeOutlineIndex }"
          :style="{ '--outline-level': item.level }"
          @click="scrollToOutline(item.index)"
        >
          {{ item.text }}
        </button>
      </nav>
      <p v-else class="markdown-outline__empty">暂无大纲</p>
    </aside>
    <EditorContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :groups="contextMenu.groups"
      @close="closeEditorContextMenu"
      @command="runEditorContextCommand"
    />
    <NotePickerDialog
      v-if="props.notePickerEnabled"
      v-model:visible="notePickerVisible"
      :notes="noteStore.notes"
      :folders="noteStore.folders"
      :title="notePickerMode === 'embed' ? '插入笔记嵌入' : '插入笔记链接'"
      :confirm-label="notePickerMode === 'embed' ? '嵌入' : '插入'"
      @select="insertPickedNote"
    />
    <LinkEditPopover
      v-if="linkEditState"
      :anchor="linkEditState.anchor"
      :title="linkEditState.title"
      :href="linkEditState.href"
      :can-remove="Boolean(linkEditState.mark)"
      @save="saveLinkEdit"
      @remove="removeLinkEdit"
      @close="closeLinkEditor"
    />
    <!--
      正文图片的悬停工具条 + 全屏查看器。委托挂在 `editorScrollRef`（编辑器滚动容器）上：
      富文本档的图片是 Crepe 的 nodeView，挂不上 Vue 事件，只能容器委托。
      对齐侧用 `left`：避让 Crepe 右上角自带的图注按钮。
    -->
    <PreviewImageBar
      v-if="previewImageTools.barVisible.value"
      :anchor="previewImageTools.barAnchor.value"
      :align="previewImageTools.barAlign.value"
      :can-open-external="previewImageTools.canOpenExternal.value"
      :notice="previewImageTools.notice.value"
      @keep="previewImageTools.keepBar()"
      @dismiss="previewImageTools.dismissBar()"
      @open="previewImageTools.openViewer()"
      @copy="previewImageTools.copyImageAddress()"
      @external="previewImageTools.openInBrowser()"
      @markdown="previewImageTools.copyImageMarkdown()"
    />
    <PreviewImageViewer
      v-if="previewImageTools.viewerVisible.value"
      :images="previewImageTools.viewerImages.value"
      :index="previewImageTools.viewerIndex.value"
      @close="previewImageTools.closeViewer()"
      @update:index="previewImageTools.setViewerIndex($event)"
    />
  </div>
</template>

<script setup lang="ts">
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/classic.css'
import { Compartment, EditorState, Prec, StateEffect } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { Crepe } from '@milkdown/crepe'
import { commandsCtx, editorViewCtx } from '@milkdown/kit/core'
import { redoCommand, undoCommand } from '@milkdown/kit/plugin/history'
import { linkTooltipAPI, linkTooltipState } from '@milkdown/kit/component/link-tooltip'
import { redoDepth, undoDepth } from '@milkdown/kit/prose/history'
// 「粘贴」要把剪贴板里的 HTML 解析成 Slice；「粘贴为 Markdown」用 markdownToSlice。
import { DOMParser as ProseMirrorDOMParser } from '@milkdown/kit/prose/model'
import {
  addBlockTypeCommand,
  blockquoteSchema,
  bulletListSchema,
  clearTextInCurrentBlockCommand,
  codeBlockSchema,
  headingSchema,
  linkSchema,
  orderedListSchema,
  paragraphSchema,
  setBlockTypeCommand,
  wrapInBlockTypeCommand
} from '@milkdown/kit/preset/commonmark'
import { AllSelection, NodeSelection, TextSelection } from '@milkdown/kit/prose/state'
import type { Mark as ProseMirrorMark } from '@milkdown/kit/prose/model'
import type { EditorView as ProseMirrorView } from '@milkdown/kit/prose/view'
import { markdownToSlice, replaceAll } from '@milkdown/kit/utils'
import { h, nextTick, onBeforeUnmount, onMounted, ref, render, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'

import ossApi from '@/api/oss-api'
import { UploadFileTypeEnum } from '@/enums'
import type { INoteListItem } from '@/interface/note'
import {
  DEFAULT_BODY_FONT_SIZE,
  FONT_SCALE_STEPS,
  isBlankText,
  isDefaultFontSize
} from '@/utils/inline-font-size'
import { extractMarkdownOutline, type MarkdownOutlineItem } from '@/utils/markdown-outline'
import { usePreviewImageTools } from '@/composables/usePreviewImageTools'
import { type LinkEditAnchor } from '@/utils/link-edit-popover'
import {
  EMBED_CARD_MENU_EVENT,
  dispatchOpenNote,
  resolveNoteIdFromHref,
  type EmbedCardMenuEventDetail
} from '@/utils/note-open-events'
import { uploadFile } from '@/utils/oss-upload'
import { useNoteStore } from '@/stores/note'
import NotePickerDialog from '@/components/note/NotePickerDialog.vue'
import EditorContextMenu from './EditorContextMenu.vue'
import type { EditorContextMenuGroup, EditorContextMenuItem } from './EditorContextMenu.vue'
import LinkEditPopover from './LinkEditPopover.vue'
import PreviewImageBar from './PreviewImageBar.vue'
import PreviewImageViewer from './PreviewImageViewer.vue'
import { buildEmbedHtml, installXynoteEmbedFeature } from './xynote-embed'
import { HARDBREAK_NODE_NAME, TABLE_CELL_NODE_NAMES, installHardbreakFeature } from './xynote-hardbreak'
import { FONT_SIZE_MARK_NAME, installFontSizeFeature } from './xynote-font-size'

const emit = defineEmits<{
  (event: 'change', value: string): void
}>()

interface Props {
  value?: string
  readonly?: boolean
  showToolbar?: boolean
  showOutline?: boolean
  /** 当前笔记标题：仅用于 `Toolbar` 内置的标题选择器与嵌入卡回查。 */
  title?: string
  /**
   * 是否启用笔记库专属能力（右键菜单里的「插入笔记链接 / 插入笔记嵌入」）。
   *
   * 这两项会把站内笔记地址与嵌入标记写进正文，只适合正文落库的笔记页；
   * 文章编辑页复用同一个编辑器，因此默认关闭。
   */
  notePickerEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  readonly: false,
  showToolbar: true,
  showOutline: true,
  title: '',
  notePickerEnabled: false
})

const router = useRouter()
const noteStore = useNoteStore()
const editorRootRef = ref<HTMLDivElement | null>(null)
const editorShellRef = ref<HTMLDivElement | null>(null)
const editorScrollRef = ref<HTMLDivElement | null>(null)
const contentValue = ref(props.value)
const outlineItems = ref<MarkdownOutlineItem[]>([])
const outlineOpen = ref(true)
const activeOutlineIndex = ref(0)
/**
 * 字号下拉触发器上显示的数值（px）。
 *
 * 它不是「整篇正文字号」，而是**跟随选区的当前格式**：有选区时是该选区起点的字号，
 * 无选区时是待用格式（`storedMarks`）的字号。因此选区一动就要重算，
 * 由 `refreshFontSizeMenu()` 在 `selectionUpdated` 里刷新。
 */
const fontSizeMenuValue = ref(DEFAULT_BODY_FONT_SIZE)
/** 正文右键菜单的浮层状态（位置 + 分组由当次右键时的选区/只读态算出）。 */
const contextMenu = ref({ visible: false, x: 0, y: 0, groups: [] as EditorContextMenuGroup[] })
/**
 * 嵌入卡片右键菜单的目标（弹出菜单时由卡片事件记录，命令执行时消费）。
 *
 * 与 `contextMenu` 分开存：菜单只带处理好的分组，执行命令时还需要节点位置与目标笔记信息。
 */
const embedContextTarget = ref<EmbedCardMenuEventDetail | null>(null)

/**
 * 正文图片交互：悬停工具条 + 点击全屏查看。
 *
 * 委托挂在**编辑器滚动容器**上（不是内容根）：图片块是 Crepe 的 nodeView，只能事件委托；
 * 滚动容器能覆盖整个正文区，且滚动时工具条按视口坐标自动收起。
 * 对齐侧固定 `left`，避让 Crepe 右上角自带的图注按钮。
 */
const previewImageTools = usePreviewImageTools(editorScrollRef, { align: () => 'left' })

/**
 * `[[` 补全的片段起点（文档位置）；null = 当前没有在补全。
 *
 * 与桌面端的 `linkSuggestStart` 同义：选中笔记后要把 `[start, 光标)` 整段
 * （`[[` + 用户继续敲的关键词）替换成真正的链接文本。
 */
const linkTriggerStart = ref<number | null>(null)
/** 笔记选择器（插入链接 / 插入嵌入）是否打开。 */
const notePickerVisible = ref(false)
/** 选择器这次是「插入链接」还是「插入嵌入」——决定插入结果与文案。 */
const notePickerMode = ref<'link' | 'embed'>('link')
let editor: Crepe | null = null
let editorReady = false
let destroyed = false
let pendingContent: string | null = null
let suppressedMarkdown: string | null = null
let readonlyObserver: MutationObserver | null = null
let toolbarEventsBound = false
const codeMirrorReadonlyCompartments = new WeakMap<EditorView, Compartment>()
const OUTLINE_STORAGE_KEY = 'markdown-outline-open'
const topBarLabels = [
  '加粗',
  '斜体',
  '删除线',
  '行内代码',
  '无序列表',
  '有序列表',
  '任务列表',
  '链接',
  '图片',
  '表格',
  '代码块',
  '公式',
  '引用',
  '分隔线'
]

/**
 * 链接气泡左侧那两个按钮（打开 / 复制）的图标。
 *
 * 背景：Crepe 的 LinkTooltip 只开放一个 `linkIcon` 槽位，而**这个槽位的点击写死是复制**
 * （`@milkdown/components` 的 `Icon` 组件用 `onPointerdown` 触发
 * `navigator.clipboard.writeText`），所以「打开」只能自己抢 —— 图标里塞两个带标记的 span，
 * 再由 `handleLinkTooltipPointerDown` 在**捕获阶段**接管。
 *
 * 「打开」带文字标签是有意的：气泡里的 URL 文本已经拿掉（它在编辑浮层里有专门的「地址」一行），
 * 只剩一排光秃秃的图标就看不出哪个是主操作了。
 *
 * ⚠️ 两个标记类名是「打开 / 复制」分流的唯一锚点，删掉任一 span 两处一起坏。
 * 图标本体走 Crepe 同款 viewBox，尺寸由本文件末尾的链接气泡覆写段统一到 19px。
 */
// slash「/」菜单里「嵌入笔记」项的图标（Material Symbols note_add，与右键菜单同语义）。
const EMBED_SLASH_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 3H6C4.9 3 4 3.9 4 5V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V9L14 3ZM16 17H13V20H11V17H8V15H11V12H13V15H16V17ZM13 10V4.5L18.5 10H13Z" />
  </svg>
`

const LINK_TOOLTIP_ACTIONS_ICON = `
  <span class="xynote-link-tooltip-actions">
    <span class="xynote-link-tooltip-open" aria-label="打开链接">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.4 19 5 17.6 15.6 7H8V5h13v13h-2V8.4L6.4 19Z" />
      </svg>
      <span class="xynote-link-tooltip-open-label">打开</span>
    </span>
    <span class="xynote-link-tooltip-copy" aria-label="复制链接">
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
        <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z" />
      </svg>
    </span>
  </span>
`

/**
 * 选中气泡里「字号」触发器的图标：大 A + 小 a（Material Symbols format_size）+ 下拉小箭头。
 *
 * 为什么要把两个 svg 包进一个 `span.xynote-fs-trigger`：Crepe 的 Toolbar 组件给每个项渲染的是
 * 属性写死的 `button.toolbar-item`（只有 `class` / `type`，挂不了自定义 class 或 data-*），
 * 而 `item.icon` 会被当作 HTML 塞进 `span.milkdown-icon`。所以这个 span 既是「在 DOM 里找回
 * 按钮」的锚点（`.closest('.toolbar-item')`），也是 CSS 里 `:has()` 放宽按钮宽度的钩子。
 *
 * ⚠️ 与桌面端 `MarkdownVisualEditor.vue` 的 `FONT_SIZE_TRIGGER_ICON` 同构，改一处两端一起改。
 */
const FONT_SIZE_TRIGGER_ICON = `
  <span class="xynote-fs-trigger">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 4v3h5v12h3V7h5V4H9zm-5 5v3h3v7h3v-7h3V9H4z" />
    </svg>
    <svg class="xynote-fs-caret" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 9.5 12 14.5 17 9.5l-1.3-1.3L12 11.9 8.3 8.2z" />
    </svg>
  </span>
`

interface ToolbarActionItem {
  action: () => void | Promise<void>
  icon: string
  label: string
  /** 是否在只读态下仍然可点（如「大纲」这类只读无害的操作）。 */
  allowInReadonly?: boolean
}

interface ToolbarMenuOptions {
  className?: string
  icon: string
  key: string
  label: string
}

/**
 * 根据 Markdown 内容刷新大纲。
 *
 * :param markdown: Markdown 原文。
 * :return: 无返回值。
 */
function updateOutline(markdown: string): void {
  outlineItems.value = extractMarkdownOutline(markdown)
  if (activeOutlineIndex.value >= outlineItems.value.length) activeOutlineIndex.value = 0
  void nextTick(updateActiveOutline)
}

/**
 * 根据正文滚动位置更新当前大纲项。
 *
 * :return: 无返回值。
 */
function updateActiveOutline(): void {
  const scrollContainer = editorScrollRef.value
  const headings = editorRootRef.value?.querySelectorAll<HTMLElement>(
    '.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6'
  )
  if (!scrollContainer || !headings?.length) return
  const threshold = scrollContainer.getBoundingClientRect().top + 86
  let nextIndex = 0
  headings.forEach((heading, index) => {
    if (heading.getBoundingClientRect().top <= threshold) nextIndex = index
  })
  activeOutlineIndex.value = nextIndex
}

/**
 * 编辑区滚动时的统一处理：更新大纲高亮，并收起气泡字号面板。
 *
 * 气泡本体由 Crepe 自己在滚动时隐藏，但我们那个 portal 到 body 的面板不会跟着走 ——
 * 不收就会孤零零悬在原文位置。
 *
 * :return: 无返回值。
 */
function handleEditorScroll(): void {
  updateActiveOutline()
  closeBubbleFontSizePanel()
  closeEditorContextMenu()
}

/**
 * 将编辑区和大纲状态重置到文档顶部。
 *
 * :return: 无返回值。
 */
function resetEditorScroll(): void {
  const scrollContainer = editorScrollRef.value
  if (scrollContainer) scrollContainer.scrollTop = 0
  activeOutlineIndex.value = 0
  void nextTick(() => {
    if (editorScrollRef.value) editorScrollRef.value.scrollTop = 0
  })
}

/**
 * 切换大纲面板并保存用户偏好。
 *
 * :return: 无返回值。
 */
function toggleOutline(): void {
  outlineOpen.value = !outlineOpen.value
  localStorage.setItem(OUTLINE_STORAGE_KEY, String(outlineOpen.value))
  syncOutlineToggle()
  if (outlineOpen.value) void nextTick(updateActiveOutline)
}

/**
 * 同步工具栏大纲开关的展开状态。
 *
 * :return: 无返回值。
 */
function syncOutlineToggle(): void {
  const button = editorRootRef.value?.querySelector<HTMLButtonElement>('.markdown-outline-toggle')
  if (!button) return
  button.setAttribute('aria-expanded', String(outlineOpen.value))
  button.setAttribute('aria-label', outlineOpen.value ? '收起大纲' : '展开大纲')
  button.title = outlineOpen.value ? '收起大纲' : '展开大纲'
  button.dataset.label = '大纲'
  button.classList.toggle('active', outlineOpen.value)
}

/**
 * 同步代码块内部 CodeMirror 编辑器的只读状态。
 *
 * :param isReadonly: 是否处于只读状态。
 * :return: 无返回值。
 */
function syncCodeMirrorReadonly(isReadonly: boolean): void {
  editorRootRef.value?.querySelectorAll<HTMLElement>('.milkdown-code-block .cm-editor').forEach((element) => {
    const view = EditorView.findFromDOM(element)
    if (!view) return

    let compartment = codeMirrorReadonlyCompartments.get(view)
    if (!compartment) {
      compartment = new Compartment()
      codeMirrorReadonlyCompartments.set(view, compartment)
      view.dispatch({
        effects: StateEffect.appendConfig.of(
          compartment.of(Prec.highest(EditorState.readOnly.of(isReadonly)))
        )
      })
      return
    }

    view.dispatch({
      effects: compartment.reconfigure(Prec.highest(EditorState.readOnly.of(isReadonly)))
    })
  })
}

/**
 * 同步正文与代码编辑器节点的可编辑属性。
 *
 * :param isReadonly: 是否处于只读状态。
 * :return: 无返回值。
 */
function syncEditableElements(isReadonly: boolean): void {
  editorRootRef.value
    ?.querySelectorAll<HTMLElement>('.ProseMirror, .ProseMirror .cm-content')
    .forEach((element) => {
      element.setAttribute('contenteditable', String(!isReadonly))
      element.setAttribute('aria-readonly', String(isReadonly))
    })
  syncCodeMirrorReadonly(isReadonly)
}

/**
 * 在代码块懒加载后继续维持当前只读状态。
 *
 * :return: 无返回值。
 */
function maintainReadonlyElements(): void {
  if (props.readonly) syncEditableElements(true)
}

/**
 * 根据只读状态启动或停止嵌套编辑节点观察器。
 *
 * :param isReadonly: 是否处于只读状态。
 * :return: 无返回值。
 */
function syncReadonlyObserver(isReadonly: boolean): void {
  readonlyObserver?.disconnect()
  readonlyObserver = null
  if (!isReadonly || !editorRootRef.value) return
  readonlyObserver = new MutationObserver(maintainReadonlyElements)
  readonlyObserver.observe(editorRootRef.value, { childList: true, subtree: true })
}

/**
 * 同步正文区域的只读状态。
 *
 * :return: 无返回值。
 */
function syncReadonlyState(): void {
  const isReadonly = props.readonly
  if (editor && editor.readonly !== props.readonly) editor.setReadonly(props.readonly)
  syncEditableElements(isReadonly)
  syncReadonlyObserver(isReadonly)
  editorRootRef.value
    ?.querySelectorAll<HTMLButtonElement>('.top-bar-heading-selector button, .top-bar-actions .top-bar-item')
    .forEach((button) => {
      // 只读态下无害的动作（如「大纲」）用 `dataset.allowInReadonly` 声明，其余一律禁用。
      // 用 dataset 而不是类名白名单：新增这类按钮时只需在创建处声明，不必回头改选择器。
      const disabled = isReadonly && button.dataset.allowInReadonly !== 'true'
      button.disabled = disabled
      if (disabled) button.setAttribute('aria-disabled', 'true')
      else button.removeAttribute('aria-disabled')
    })
  // 字号面板的选项不是 `.top-bar-item`，类名也不同，单独同步一次。
  editorRootRef.value?.querySelectorAll<HTMLButtonElement>('.markdown-font-size-menu__item')
    .forEach((button) => {
      button.disabled = isReadonly
      if (isReadonly) button.setAttribute('aria-disabled', 'true')
      else button.removeAttribute('aria-disabled')
    })
  closeToolbarMenus()
}

/**
 * 链接气泡左侧「打开」按钮的按下动作接管。
 *
 * ⚠️ 必须挂在**捕获阶段**：Crepe 给整个 `.link-icon` 挂的是它自己的 `onPointerdown`（复制），
 * 与这里要拦的是**同一节点上下沉层次不同**的两颗监听 —— 冒泡阶段才动手已经晚了，
 * 复制早就跑完了（现象：点「打开」链接进了剪贴板却没跳转）。
 * 捕获阶段先于目标自身触发，`stopPropagation()` 一掐，Crepe 那颗处理器就不会执行。
 *
 * 接管后**直接触发气泡里那个 `<a>` 的点击**，内部笔记 / 外链的分流全部照旧
 * （`handleEditorLinkClick` 一并认它），不重复一份路由逻辑。
 *
 * :param event: 指针按下事件。
 * :return: 无返回值。
 */
function handleLinkTooltipPointerDown(event: PointerEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  if (!target.closest('.xynote-link-tooltip-open')) return
  event.preventDefault()
  event.stopPropagation()
  if (event.button !== 0) return
  target
    .closest('.milkdown-link-preview')
    ?.querySelector<HTMLAnchorElement>('a.link-display')
    ?.click()
}

/** 链接编辑浮层的当前目标；关闭时置空。 */
interface LinkEditState {
  from: number
  to: number
  /** 编辑已有链接时的原 mark：既用来摘掉旧链接，也用来沿用它的 `title` 属性。 */
  mark: ProseMirrorMark | null
  title: string
  href: string
  anchor: LinkEditAnchor
}

const linkEditState = ref<LinkEditState | null>(null)
/** 当前编辑器 view，供链接编辑浮层读写正文。 */
let linkEditEditorView: ProseMirrorView | null = null
/**
 * 切换 Crepe 链接气泡的模式。
 *
 * 置 `'edit'` 后 Crepe 自己会做两件事：预览气泡立刻隐藏、且悬停时不再把它弹回来
 * （`preview-configure` 里 `mode === 'edit'` 直接 return）。我们复用这条现成机制来表达
 * 「正在编辑这条链接」，不需要自己去抠那个浮层。
 */
let setLinkTooltipMode: ((mode: 'preview' | 'edit') => void) | null = null

/**
 * 量出链接在视口中的包围盒。
 *
 * ⚠️ 不用 `posToDOMRect`：它给的是整块包围盒（多行时会把浮层顶到段落中间去）。
 * `coordsAtPos` 取首尾两个端点的光标矩形，合并后才是链接自身那一段的包围盒。
 *
 * :param view: ProseMirror 视图。
 * :param from: 链接起点。
 * :param to: 链接终点（可与 from 相等，表示新建链接时的光标位）。
 * :return: 视口坐标包围盒；位置失效时返回 null。
 */
function measureLinkAnchor(view: ProseMirrorView, from: number, to: number): LinkEditAnchor | null {
  try {
    const start = view.coordsAtPos(from)
    const end = view.coordsAtPos(to)
    return {
      left: Math.min(start.left, end.left),
      right: Math.max(start.right, end.right),
      top: Math.min(start.top, end.top),
      bottom: Math.max(start.bottom, end.bottom)
    }
  } catch {
    return null
  }
}

/**
 * 打开链接编辑浮层。
 *
 * 由覆写后的 `linkTooltipAPI` 调用 —— 「编辑」按钮与选中气泡里的「链接」按钮走的都是它，
 * 所以两条入口在这里汇成一套界面。
 *
 * :param mark: 已有链接的 mark；新建链接时为 null。
 * :param from: 目标区间起点。
 * :param to: 目标区间终点。
 * :return: 无返回值。
 */
function openLinkEditor(mark: ProseMirrorMark | null, from: number, to: number): void {
  const view = linkEditEditorView
  if (!view) return
  const doc = view.state.doc
  if (from < 0 || to < from || to > doc.content.size) return
  const anchor = measureLinkAnchor(view, from, to)
  linkEditState.value = {
    from,
    to,
    mark,
    title: doc.textBetween(from, to, ''),
    href: typeof mark?.attrs.href === 'string' ? mark.attrs.href : '',
    anchor: anchor ?? { left: 0, right: 0, top: 0, bottom: 0 }
  }
  setLinkTooltipMode?.('edit')
  bindLinkEditTracking()
}

/** 关闭链接编辑浮层，并把焦点还给编辑器。 */
function closeLinkEditor(): void {
  if (!linkEditState.value) return
  linkEditState.value = null
  unbindLinkEditTracking()
  setLinkTooltipMode?.('preview')
  linkEditEditorView?.dom.focus({ preventScroll: true })
}

/** 浮层开着时正文可能滚动、窗口可能缩放，锚点跟着重算，浮层不脱离链接。 */
function refreshLinkEditAnchor(): void {
  const state = linkEditState.value
  const view = linkEditEditorView
  if (!state || !view) return
  const anchor = measureLinkAnchor(view, state.from, state.to)
  if (anchor) linkEditState.value = { ...state, anchor }
}

let linkEditTrackingBound = false

function bindLinkEditTracking(): void {
  if (linkEditTrackingBound) return
  linkEditTrackingBound = true
  // 捕获阶段收 scroll：容器的 scroll 事件不冒泡，只有捕获能拿到。
  window.addEventListener('scroll', refreshLinkEditAnchor, true)
  window.addEventListener('resize', refreshLinkEditAnchor)
}

function unbindLinkEditTracking(): void {
  if (!linkEditTrackingBound) return
  linkEditTrackingBound = false
  window.removeEventListener('scroll', refreshLinkEditAnchor, true)
  window.removeEventListener('resize', refreshLinkEditAnchor)
}

/**
 * 保存链接编辑结果。
 *
 * 「标题」写回链接文字、「地址」写回 href；地址被清空等同于「取消链接」（文字保留）。
 *
 * ⚠️ 附件链接把 mime / 大小存在 mark 的 `title` 属性里，重建 mark 时必须原样带上 ——
 * 丢了它附件就会退化成一条普通外链。
 *
 * :param payload: 浮层提交的标题与地址。
 * :return: 无返回值。
 */
function saveLinkEdit(payload: { title: string, href: string }): void {
  const state = linkEditState.value
  const view = linkEditEditorView
  if (!state || !view) {
    closeLinkEditor()
    return
  }
  const doc = view.state.doc
  const linkMarkType = view.state.schema.marks.link
  const href = payload.href.trim()
  if (!linkMarkType || state.to > doc.content.size) {
    closeLinkEditor()
    return
  }
  if (!href) {
    removeLinkEdit()
    return
  }
  const keptTitle = typeof state.mark?.attrs.title === 'string' ? state.mark.attrs.title : null
  const currentText = doc.textBetween(state.from, state.to, '')
  // 标题留空时：编辑态保留原文，新建态（区间为空）退回用地址当文字 —— 否则会插入一个空文本节点。
  const nextText = payload.title.trim() || (state.from === state.to ? href : currentText)
  const tr = view.state.tr
  if (state.mark) tr.removeMark(state.from, state.to, state.mark)
  if (nextText === currentText) {
    tr.addMark(state.from, state.to, linkMarkType.create({ href, title: keptTitle }))
  } else {
    tr.replaceWith(state.from, state.to, view.state.schema.text(nextText))
    tr.addMark(state.from, state.from + nextText.length, linkMarkType.create({ href, title: keptTitle }))
  }
  view.dispatch(tr)
  closeLinkEditor()
  ElMessage({ message: '链接已更新', type: 'success', plain: true })
}

/** 取消链接：摘掉链接标记、保留文字（与「地址清空后保存」同效）。 */
function removeLinkEdit(): void {
  const state = linkEditState.value
  const view = linkEditEditorView
  const linkMarkType = view?.state.schema.marks.link
  const hadLink = Boolean(state?.mark)
  if (state && view && linkMarkType && state.to <= view.state.doc.content.size) {
    view.dispatch(view.state.tr.removeMark(state.from, state.to, linkMarkType))
  }
  closeLinkEditor()
  if (hadLink) ElMessage({ message: '已取消链接', type: 'success', plain: true })
}

/**
 * 处理编辑器中的链接点击。
 *
 * 编辑模式仅允许按住 Command/Ctrl 后跳转，只读模式可直接跳转；
 * 站内笔记链接交给笔记工作区在**新标签页**打开（口径与桌面端一致）——
 * 编辑器里点链接时当前标签往往停在另一篇笔记的编辑态上，原地换页会把这篇顶掉。
 *
 * :param event: 编辑器链接点击事件。
 * :return: 无返回值。
 */
function handleEditorLinkClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const anchor = target.closest<HTMLAnchorElement>('a[href]')
  if (!anchor || !editorRootRef.value?.contains(anchor)) return

  // 链接气泡里的链接：点它**就是**「打开」（气泡本来就是为操作这条链接而弹出的），
  // 不再要求 ⌘/Ctrl。⚠️ 这里必须只放行 `.link-display` 那一个 `<a>` —— 气泡里的
  // 编辑 / 删除按钮不是 `<a>`，`closest('a[href]')` 本就返回 null，不受影响。
  const insideLinkTooltip = Boolean(anchor.closest('.milkdown-link-preview'))
  const requiresModifier = !props.readonly && !insideLinkTooltip
  if (requiresModifier && !event.metaKey && !event.ctrlKey) {
    event.preventDefault()
    return
  }

  const noteId = resolveNoteIdFromHref(anchor.href, window.location.href)
  if (!noteId) return
  event.preventDefault()
  // 工作区接管即在新标签页打开；当前不在笔记页（如文章编辑页复用同款编辑器）
  // 时没人监听，退回路由跳转，别让点击变成「什么都没发生」。
  if (!dispatchOpenNote(noteId, true)) {
    void router.push({ name: 'notes', params: { noteId } })
  }
}

/**
 * 解析剪贴板中的单个网页地址。
 *
 * :param value: 剪贴板纯文本。
 * :return: 有效的 HTTP/HTTPS 地址；其他内容返回 null。
 */
function parseStandaloneWebUrl(value: string): string | null {
  const candidate = value.trim()
  if (!candidate || /\s/.test(candidate)) return null
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? candidate : null
  } catch {
    return null
  }
}

/**
 * 将单独粘贴的网页地址插入为真正的 Markdown 链接节点。
 *
 * :param event: 编辑器粘贴事件。
 * :return: 无返回值。
 */
function handleEditorLinkPaste(event: ClipboardEvent): void {
  if (props.readonly || !editor || !event.clipboardData) return
  if (event.clipboardData.getData('text/html')) return
  const href = parseStandaloneWebUrl(event.clipboardData.getData('text/plain'))
  if (!href) return

  let inserted = false
  editor.editor.action((context) => {
    const view = context.get(editorViewCtx)
    if (view.state.selection.$from.parent.type.spec.code) return
    const mark = linkSchema.type(context).create({ href })
    view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.text(href, [mark]), false))
    inserted = true
  })
  if (!inserted) return
  event.preventDefault()
  event.stopPropagation()
}

/**
 * 滚动到指定标题。
 *
 * :param index: 标题在文档中的顺序。
 * :return: 无返回值。
 */
function scrollToOutline(index: number): void {
  const scrollContainer = editorScrollRef.value
  const heading = editorRootRef.value?.querySelectorAll<HTMLElement>(
    '.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6'
  )[index]
  if (!scrollContainer || !heading) return
  const top = heading.getBoundingClientRect().top
    - scrollContainer.getBoundingClientRect().top
    + scrollContainer.scrollTop
    - 78
  activeOutlineIndex.value = index
  scrollContainer.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

/**
 * 上传编辑器中的图片并返回访问地址。
 *
 * :param file: 待上传图片。
 * :return: 图片访问地址。
 */
async function uploadImage(file: File): Promise<string> {
  try {
    const response = await ossApi.getUploadSignatureUrl({
      dirType: UploadFileTypeEnum.IMAGE,
      fileName: file.name
    })
    const url = await uploadFile(response.data, file)
    ElMessage({
      message: '上传成功',
      type: 'success',
      plain: true
    })
    return url
  } catch (error) {
    ElMessage({
      message: '图片上传失败，请稍后重试',
      type: 'error',
      plain: true
    })
    throw error
  }
}

/**
 * 静默替换编辑器内容，避免外部回填被识别为用户编辑。
 *
 * :param value: Markdown 内容。
 * :param crepe: Milkdown 编辑器实例。
 * :return: 无返回值。
 */
function replaceContentSilently(value: string, crepe: Crepe): void {
  crepe.editor.action(replaceAll(value))
  suppressedMarkdown = crepe.getMarkdown()
}

/**
 * 关闭所有已展开的工具栏二级菜单。
 *
 * :return: 无返回值。
 */
function closeToolbarMenus(): void {
  editorRootRef.value?.querySelectorAll<HTMLElement>('.markdown-toolbar-menu.is-open').forEach((menu) => {
    menu.classList.remove('is-open')
    menu.querySelector<HTMLButtonElement>('.markdown-toolbar-menu__toggle')
      ?.setAttribute('aria-expanded', 'false')
  })
}

/**
 * 切换指定工具栏二级菜单。
 *
 * :param menu: 待切换的菜单容器。
 * :return: 无返回值。
 */
function toggleToolbarMenu(menu: HTMLElement): void {
  const shouldOpen = !menu.classList.contains('is-open')
  closeFontSizeMenus()
  menu.classList.toggle('is-open', shouldOpen)
  menu.querySelector<HTMLButtonElement>('.markdown-toolbar-menu__toggle')
    ?.setAttribute('aria-expanded', String(shouldOpen))
}

/**
 * 创建工具栏分隔线。
 *
 * :return: 工具栏分隔线节点。
 */
function createToolbarDivider(): HTMLDivElement {
  const divider = document.createElement('div')
  divider.className = 'top-bar-divider markdown-toolbar-divider'
  divider.setAttribute('aria-hidden', 'true')
  return divider
}

/**
 * 创建自定义的二级菜单操作按钮。
 *
 * :param item: 操作按钮配置。
 * :return: 操作按钮节点。
 */
function createToolbarActionButton(item: ToolbarActionItem): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'markdown-toolbar-menu__item'
  button.dataset.action = item.label
  button.dataset.label = item.label
  button.dataset.allowInReadonly = String(Boolean(item.allowInReadonly))
  button.title = item.label
  button.setAttribute('aria-label', item.label)
  render(h(Icon, { icon: item.icon, 'aria-hidden': 'true' }), button)
  button.addEventListener('click', () => {
    closeToolbarMenus()
    void item.action()
  })
  return button
}

/**
 * 创建直接展示在一级工具栏中的快捷操作按钮。
 *
 * :param item: 操作按钮配置。
 * :return: 一级工具栏操作按钮节点。
 */
function createTopBarActionButton(item: ToolbarActionItem): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'top-bar-item markdown-toolbar-direct-action'
  button.dataset.action = item.label
  button.dataset.label = item.label
  button.dataset.allowInReadonly = String(Boolean(item.allowInReadonly))
  button.title = item.label
  button.setAttribute('aria-label', item.label)
  render(h(Icon, { icon: item.icon, 'aria-hidden': 'true' }), button)
  button.addEventListener('click', () => {
    void item.action()
  })
  return button
}

/**
 * 创建包含原生按钮或自定义操作的工具栏二级菜单。
 *
 * :param options: 菜单显示配置。
 * :param items: 菜单操作按钮。
 * :return: 二级菜单容器。
 */
function createToolbarMenu(
  options: ToolbarMenuOptions,
  items: HTMLButtonElement[]
): HTMLDivElement {
  const menu = document.createElement('div')
  menu.className = ['markdown-toolbar-menu', options.className].filter(Boolean).join(' ')
  menu.dataset.menu = options.key

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'markdown-toolbar-menu__toggle top-bar-item'
  toggle.dataset.label = options.label
  toggle.title = options.label
  toggle.setAttribute('aria-label', `${options.label}菜单`)
  toggle.setAttribute('aria-haspopup', 'menu')
  toggle.setAttribute('aria-expanded', 'false')
  render(h(Icon, { icon: options.icon, 'aria-hidden': 'true' }), toggle)
  toggle.addEventListener('click', (event) => {
    event.stopPropagation()
    toggleToolbarMenu(menu)
  })

  const panel = document.createElement('div')
  panel.className = 'markdown-toolbar-menu__panel'
  panel.setAttribute('role', 'menu')
  panel.addEventListener('click', (event) => event.stopPropagation())
  items.forEach((button) => {
    // ⚠️ 搬进面板的按钮必须摘掉 `top-bar-item`（2026-10-16）：紧凑工具栏规则
    // `.milkdown-editor-shell … .top-bar-item`（5 层类名）特异性高于面板规则
    // `.milkdown-editor-root … .markdown-toolbar-menu__item`（4 层），不摘的话这批原生按钮
    // 会被它接管成 10px 字 / 18px 图标 / gap 0，而自研按钮（无 top-bar-item）吃面板规则
    // 的 13px 字 / 19px 图标 / gap 9px —— 同一个面板里两套观感（用户报「格格不入」）。
    button.classList.remove('top-bar-item')
    button.classList.add('markdown-toolbar-menu__item')
    button.setAttribute('role', 'menuitem')
    button.addEventListener('click', closeToolbarMenus)
    panel.append(button)
  })

  menu.append(toggle, panel)
  return menu
}

/**
 * 给当前选区（或「待用格式」）设置行内字号。
 *
 * ## 语义（与桌面端逐字一致）
 *
 * - **有选区**：给选中的文字单独设字号，写进正文源码，保存后依然在；
 * - **无选区**（或选区全是空白）：只改 `storedMarks`，即**只有后续新打的字**带这个字号，
 *   已有正文一个字都不动；**没有「整篇缩放」这一档**；
 * - 设回默认值（15px）时**移除标记**，而不是写一个 `<span style="font-size:15px">` ——
 *   后者与不写等价，却会污染源码。
 *
 * ## ⚠️ 必须用「替换」语义，不能用 `addMark` 裸调用
 *
 * mark schema 声明了 `excludes: ''`（为了能解析既有文档里的嵌套字号），代价是
 * `addToSet` 变成「叠加」而非「替换」—— 直接 `addMark` 会越改越嵌套。所以这里先
 * `removeMark` / `removeFromSet` 清一遍，再按需 add。详见 `./xynote-font-size.ts` 文件头「坑 1」。
 *
 * :param size: 目标字号（px），取自 `FONT_SCALE_STEPS`。
 * :return: 无返回值。
 */
function applyInlineFontSize(size: number): void {
  if (!editor || !editorReady || props.readonly) return
  const target = Number.isFinite(size) && size > 0 ? Math.round(size) : DEFAULT_BODY_FONT_SIZE
  const isDefault = isDefaultFontSize(target)
  editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const markType = view.state.schema.marks[FONT_SIZE_MARK_NAME]
    if (!markType) return
    const { state } = view
    const tr = state.tr
    // 空选区、或选区里全是空白（空行 / 缩进）都按「待用格式」处理：给空白加字号 span
    // 毫无意义，还会在源码里留下 `<span style="font-size:18px"> </span>` 这种垃圾。
    const selectedText = state.doc.textBetween(state.selection.from, state.selection.to, '\n', ' ')
    if (state.selection.empty || isBlankText(selectedText)) {
      // `storedMarks` 是「下一个输入字符将采用的标记集合」，null 表示跟随光标位置。
      const base = state.storedMarks ?? state.selection.$from.marks()
      const next = markType.removeFromSet(base)
      tr.setStoredMarks(isDefault ? next : markType.create({ size: target }).addToSet(next))
    } else {
      state.selection.ranges.forEach((range) => {
        tr.removeMark(range.$from.pos, range.$to.pos, markType)
        if (!isDefault) {
          tr.addMark(range.$from.pos, range.$to.pos, markType.create({ size: target }))
        }
      })
    }
    view.dispatch(tr)
    // 触发器与选项都走 pointerdown + preventDefault，焦点本就不该离开正文；
    // 这里再兜一次，保证「设完字号直接打字」时输入落在编辑器里
    // —— `storedMarks` 只在光标态有效，焦点跑了就白设。
    view.focus()
  })
  fontSizeMenuValue.value = target
  syncFontSizeMenu()
}

/**
 * 读出当前选区 / 光标处的字号，用于刷新下拉显示与打勾。
 *
 * - 有选区 → 取**选区起点**处的字号（与粗体按钮的 active 判定同一套口径）；
 * - 无选区 → 先看待用字号（`storedMarks`），其次看光标处字号；
 * - 都取不到 → 正文默认值。
 *
 * :return: 字号（px）。
 */
function readSelectionFontSize(): number {
  if (!editor || !editorReady) return DEFAULT_BODY_FONT_SIZE
  let size = DEFAULT_BODY_FONT_SIZE
  editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const markType = view.state.schema.marks[FONT_SIZE_MARK_NAME]
    if (!markType) return
    const { state } = view
    const parsed = Number(markType.isInSet(state.storedMarks ?? state.selection.$from.marks())?.attrs.size)
    if (Number.isFinite(parsed) && parsed > 0) size = parsed
  })
  return size
}

/**
 * 同步字号下拉的选中态与触发器文案。
 *
 * 触发器只显示数值（如「15」），与钉钉字号下拉一致；面板里当前档位打勾。
 *
 * :return: 无返回值。
 */
function syncFontSizeMenu(): void {
  const menu = editorRootRef.value?.querySelector<HTMLElement>('.markdown-font-size-menu')
  if (!menu) return
  const current = fontSizeMenuValue.value
  menu.querySelectorAll<HTMLButtonElement>('.markdown-font-size-menu__item').forEach((button) => {
    const isActive = Number(button.dataset.fontSize) === current
    button.classList.toggle('active', isActive)
    button.setAttribute('aria-checked', String(isActive))
  })
  const value = menu.querySelector<HTMLElement>('.markdown-font-size-menu__value')
  if (value) value.textContent = String(current)
}

/**
 * 按当前选区重读字号并刷新下拉（选区 / 文档变化时调用）。
 *
 * 语义是「跟随选区的格式」而非「整篇显示参数」，所以移动光标就要重算。
 *
 * :return: 无返回值。
 */
function refreshFontSizeMenu(): void {
  fontSizeMenuValue.value = readSelectionFontSize()
  syncFontSizeMenu()
}

/**
 * 创建字号选项面板。
 *
 * ## ⚠️ 选项必须用 pointerdown + preventDefault
 *
 * 无选区时「设字号」改的是 `storedMarks`（待用格式），而 `storedMarks` 一旦编辑器失焦
 * 就被清掉 —— 表现出来是「选了 20px，打出来还是 15px」，全程无报错。
 * 在 pointerdown 里 preventDefault 可让焦点始终留在正文里。
 *
 * :return: 面板节点。
 */
function createFontSizePanel(): HTMLDivElement {
  const panel = document.createElement('div')
  panel.className = 'markdown-font-size-menu__panel'
  panel.setAttribute('role', 'listbox')
  panel.setAttribute('aria-label', '字号')
  panel.addEventListener('pointerdown', (event) => event.stopPropagation())
  panel.addEventListener('click', (event) => event.stopPropagation())

  FONT_SCALE_STEPS.forEach((size) => {
    const option = document.createElement('button')
    option.type = 'button'
    option.className = 'markdown-font-size-menu__item'
    option.dataset.fontSize = String(size)
    option.setAttribute('role', 'option')
    option.setAttribute('aria-label', `${size}px`)
    // 用真实文本节点而非 ::after 伪元素 —— 伪元素内容不进 textContent，
    // 列表项对读屏与自动化都取不到文本。
    option.textContent = String(size)
    // 初始选中态在创建时就设好：顶栏下拉这一刻还没插进 DOM（调用方还要 replaceChildren），
    // 走 syncFontSizeMenu() 查询会落空，导致打开下拉时「一项都没打勾」。
    const isActive = size === fontSizeMenuValue.value
    option.classList.toggle('active', isActive)
    option.setAttribute('aria-checked', String(isActive))
    option.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      applyInlineFontSize(size)
      closeFontSizeMenus()
    })
    // 见上方说明：pointerdown 被 preventDefault 后浏览器仍可能补一个 click，
    // 它冒泡到 document 会被 closeToolbarMenus 捕获，把刚关掉的面板状态打乱。
    option.addEventListener('click', (event) => event.stopPropagation())
    panel.append(option)
  })
  return panel
}

/**
 * 关闭字号相关的全部浮层（顶栏下拉 + 选中气泡里的那份）。
 *
 * 顶栏下拉与气泡面板共用同一个 `createFontSizePanel()` 产物，点档位后两边都要收，
 * 所以这里包一层，别只关顶栏那一半。
 *
 * :return: 无返回值。
 */
function closeFontSizeMenus(): void {
  closeToolbarMenus()
  closeBubbleFontSizePanel()
}

/**
 * 创建字号下拉（挂在「块类型选择器」之后的一级工具栏最左端）。
 *
 * 触发器结构与 Crepe 的块类型按钮对齐（数值 + 箭头），点开是一列字号，当前档位打勾。
 *
 * ## ⚠️ 必须用 pointerdown 而不是 click
 *
 * 见 `createFontSizePanel()` 的说明（`storedMarks` 失焦即丢），顶栏与面板同款处理。
 *
 * 容器同时带 `markdown-toolbar-menu` 类，是为了复用既有的
 * `closeToolbarMenus()` / `toggleToolbarMenu()`（它们按这个类名收合），
 * 面板自己的样式由 `markdown-font-size-menu__panel` 独立控制。
 *
 * :return: 下拉容器。
 */
function createFontSizeMenu(): HTMLDivElement {
  const menu = document.createElement('div')
  menu.className = 'markdown-toolbar-menu markdown-font-size-menu'
  menu.dataset.menu = 'font-size'

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'markdown-toolbar-menu__toggle markdown-font-size-menu__toggle top-bar-item'
  toggle.dataset.label = '字号'
  toggle.title = '字号'
  toggle.setAttribute('aria-label', '字号')
  toggle.setAttribute('aria-haspopup', 'listbox')
  toggle.setAttribute('aria-expanded', 'false')

  const value = document.createElement('span')
  value.className = 'markdown-font-size-menu__value'
  value.textContent = String(fontSizeMenuValue.value)
  const chevron = document.createElement('span')
  chevron.className = 'markdown-font-size-menu__chevron'
  chevron.setAttribute('aria-hidden', 'true')
  render(h(Icon, { icon: 'material-symbols:keyboard-arrow-down-rounded', 'aria-hidden': 'true' }), chevron)
  toggle.append(value, chevron)

  const panel = createFontSizePanel()

  toggle.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    event.stopPropagation()
    toggleToolbarMenu(menu)
  })
  // 同理：刚打开的菜单不能被随后补上的 click 立刻关掉。
  toggle.addEventListener('click', (event) => event.stopPropagation())

  menu.append(toggle, panel)
  return menu
}

/* ── 选中气泡（Crepe 的 Feature.Toolbar）里的字号 ───────────────────────────────
   气泡是 Crepe 自带的浮层，只能从 `featureConfigs[Crepe.Feature.Toolbar].buildToolbar`
   追加项，且每次选区变化它都会整块重渲染 —— 所以面板不能往气泡里插，只能 portal 到
   body，再用一个隐藏宿主把关闭路径（滚动 / 点空白 / 切菜单）接回来。 */

/** 选中气泡里「字号」面板的宿主占位节点（不可见，挂在编辑器根节点内）。 */
let bubbleFontSizeHost: HTMLDivElement | null = null

/** portal 到 `document.body` 的字号面板本体（内容与顶栏那份同一套 `.markdown-font-size-menu__*`）。 */
let bubbleFontSizePanel: HTMLDivElement | null = null

/**
 * 在选中气泡里找回「字号」触发器按钮。
 *
 * Crepe 的 Toolbar 只给每个项渲染属性写死的 `button.toolbar-item`（挂不了自定义属性），
 * 所以拿图标里的标记 span 作为锚点反查（见 `FONT_SIZE_TRIGGER_ICON`）。
 *
 * :return: 触发器按钮；气泡尚未渲染时返回 null。
 */
function findBubbleFontSizeTrigger(): HTMLElement | null {
  const marker = editorRootRef.value?.querySelector<HTMLElement>('.milkdown-toolbar .xynote-fs-trigger')
  return marker?.closest<HTMLElement>('.toolbar-item') ?? null
}

/**
 * 按当前选区刷新气泡字号面板的打勾状态。
 *
 * 气泡只在有选区时出现，所以这里读到的必然是选区起点处的字号（与 B/I/S 的 active 同一口径）。
 *
 * :param panel: 字号面板。
 * :return: 无返回值。
 */
function syncBubbleFontSizePanel(panel: HTMLDivElement): void {
  const current = readSelectionFontSize()
  panel.querySelectorAll<HTMLButtonElement>('.markdown-font-size-menu__item').forEach((button) => {
    const isActive = Number(button.dataset.fontSize) === current
    button.classList.toggle('active', isActive)
    button.setAttribute('aria-checked', String(isActive))
  })
}

/**
 * 收起选中气泡里的字号面板。
 *
 * 面板在 body 上、宿主在编辑器内，两边的状态类要一起摘，否则下一次开面板时
 * 宿主还是 `is-open`，会把「刚打开」误判成「再点一次要收起」。
 *
 * :return: 无返回值。
 */
function closeBubbleFontSizePanel(): void {
  bubbleFontSizePanel?.classList.remove('is-portal-open')
  bubbleFontSizeHost?.classList.remove('is-open')
}

/**
 * 开合选中气泡内的字号面板（贴在「字号」按钮正下方，放不下则翻到上方）。
 *
 * 复用顶栏那套「portal 到 body + `is-portal-open` 固定定位」与
 * `markdown-toolbar-menu` 收合类，因此滚动、点空白、切菜单等既有路径都能把它一并收掉。
 *
 * :return: 无返回值。
 */
function toggleBubbleFontSizePanel(): void {
  const trigger = findBubbleFontSizeTrigger()
  if (!trigger) return

  const wasOpen = bubbleFontSizeHost?.classList.contains('is-open') ?? false
  closeFontSizeMenus()
  if (wasOpen) return

  if (!bubbleFontSizeHost || !bubbleFontSizePanel) {
    bubbleFontSizeHost = document.createElement('div')
    // 带 `markdown-toolbar-menu` 是为了复用 `closeToolbarMenus()` 的收合（它按这个类名查）。
    bubbleFontSizeHost.className = 'markdown-toolbar-menu markdown-font-size-menu__bubble-host'
    bubbleFontSizeHost.hidden = true
    bubbleFontSizePanel = createFontSizePanel()
  }
  editorRootRef.value?.append(bubbleFontSizeHost)

  syncBubbleFontSizePanel(bubbleFontSizePanel)
  bubbleFontSizeHost.classList.add('is-open')
  document.body.append(bubbleFontSizePanel)
  bubbleFontSizePanel.classList.add('is-portal-open')

  const rect = trigger.getBoundingClientRect()
  const panelWidth = bubbleFontSizePanel.offsetWidth
  const panelHeight = bubbleFontSizePanel.offsetHeight
  const left = Math.max(12, Math.min(rect.left + rect.width / 2 - panelWidth / 2, window.innerWidth - panelWidth - 12))
  bubbleFontSizePanel.style.left = `${left}px`
  // ⚠️ 默认贴在按钮**下方**，但面板有 17 档：按钮一旦落在窗口下半部，「贴下方 + clamp
  // 进窗口」会把面板顶回去**盖在按钮上**——用户再也没法点同一个按钮收起来，且松开鼠标时
  // 落点注定在面板里（见 trackBubbleFontSizePointerDown()）。所以下方放不下就翻到上方。
  const gap = 8
  const fitsBelow = rect.bottom + gap + panelHeight <= window.innerHeight - 12
  const fitsAbove = rect.top - gap - panelHeight >= 12
  const top = fitsBelow || !fitsAbove ? rect.bottom + gap : rect.top - gap - panelHeight
  bubbleFontSizePanel.style.top = `${Math.max(12, Math.min(top, window.innerHeight - panelHeight - 12))}px`
}

/** 「这次按下是否落在气泡的字号按钮上」—— 留给随后那次 click 判定用。 */
let bubbleFontSizeArmed = false

/**
 * 记录「这次 pointerdown 是否落在气泡的字号按钮上」。
 *
 * 面板的**打开**动作在 `pointerdown`（Crepe 的 Toolbar 只监听 pointerdown），而 **收起**动作在
 * `document` 上常驻的 `closeToolbarMenus` / `closeBubbleFontSizePanel`（监听 click）；
 * 不拦住紧随其后的 click，面板刚开就会被关。
 *
 * ## ⚠️ 判定必须用「按下」的落点，不能用「松开」的落点
 *
 * `click` 的 target 是 mousedown 与 mouseup 两点的**最近公共祖先**，而面板就贴在按钮下方
 * 8px 处展开 —— 真人松开时只要比按下时低 8px 以上，`mouseup` 就落进面板里，`click` 的
 * target 直接从 `BUTTON.toolbar-item` 变成 `BODY`，任何基于 `closest()` 的落点判定都会
 * **静默落空**。现象就是「按住时面板在，一松手就没了」。
 *
 * 而 `pointerdown` 发生在**面板打开之前**，落点还没被面板遮住 —— 与 Crepe 自己开合面板
 * 用的是同一个事件、同一个落点口径，天然不会跑偏。
 *
 * 标记 span（`.xynote-fs-trigger`）只是按钮内的锚点，所以先回到**整个按钮**再反查它：
 * 按钮被 `:has()` 放宽（给下拉箭头留位），落在左右留白上时 `event.target` 是 `button` 本身。
 *
 * :param event: 指针按下事件。
 * :return: 无返回值。
 */
function trackBubbleFontSizePointerDown(event: PointerEvent): void {
  const target = event.target as Element | null
  const item = target?.closest?.<HTMLElement>('.milkdown-toolbar .toolbar-item')
  bubbleFontSizeArmed = Boolean(item?.querySelector('.xynote-fs-trigger'))
}

/**
 * 放行「按下气泡字号按钮」之后补上的那次 click。
 *
 * 只看 `trackBubbleFontSizePointerDown()` 在**按下时**打的标记，不看这次 click 的落点
 * （原因见该函数）。必须注册在**捕获阶段**，早于 document 冒泡阶段注册的
 * `closeToolbarMenus` / `closeBubbleFontSizePanel`。
 *
 * :param event: 点击事件。
 * :return: 无返回值。
 */
function guardBubbleFontSizeClick(event: MouseEvent): void {
  if (!bubbleFontSizeArmed) return
  bubbleFontSizeArmed = false
  event.stopPropagation()
}

/* ── 正文右键菜单 ───────────────────────────────────────────────────────────────
   与桌面端 `MarkdownVisualEditor.vue` 的分组、置灰口径、命令实现一一对应，
   只有三处按浏览器环境改写：
   ① 剪贴板走 `navigator.clipboard`（桌面端富文本粘贴靠 Electron 的
      `window.notesDesktop.readClipboard()` 拿 text/html，浏览器改用 `clipboard.read()`）；
   ② 「插入笔记链接」写当前站点地址（桌面端写同步域名）；
   ③ 嵌入标记的 serverId 就是网页端自己的笔记 id。 */

/**
 * 关闭正文右键菜单。
 *
 * :return: 无返回值。
 */
function closeEditorContextMenu(): void {
  contextMenu.value.visible = false
}

/**
 * 便捷构造单个菜单项（默认可用）。
 *
 * :param action: 命令标识。
 * :param label: 展示文案。
 * :param opts: 图标 / 危险色 / 是否禁用。
 * :return: 菜单项。
 */
function menuItem(
  action: string,
  label: string,
  opts: { icon?: string; danger?: boolean; disabled?: boolean; children?: EditorContextMenuItem[] } = {}
): EditorContextMenuItem {
  return {
    action,
    label,
    icon: opts.icon,
    danger: opts.danger,
    disabled: opts.disabled,
    children: opts.children
  }
}

/**
 * 构造正文右键菜单分组：按当前选区与只读状态标记可用性（不可用的项直接不渲染）。
 *
 * :param view: 编辑器视图（读取选区与 history 深度）。
 * :return: 供 EditorContextMenu 渲染的分组数组。
 */
function buildEditorContextGroups(view: ProseMirrorView): EditorContextMenuGroup[] {
  const selection = view.state.selection
  const canEdit = !props.readonly
  const hasSelection = !selection.empty
  const canUndo = canEdit && undoDepth(view.state) > 0
  const canRedo = canEdit && redoDepth(view.state) > 0

  return [
    {
      items: [
        menuItem('undo', '撤销', { icon: 'material-symbols:undo-rounded', disabled: !canUndo }),
        menuItem('redo', '重做', { icon: 'material-symbols:redo-rounded', disabled: !canRedo })
      ]
    },
    {
      items: [
        menuItem('cut', '剪切', { icon: 'material-symbols:content-cut-rounded', disabled: !canEdit || !hasSelection }),
        menuItem('copy', '复制', { icon: 'material-symbols:content-copy-rounded', disabled: !hasSelection }),
        menuItem('paste', '粘贴', { icon: 'material-symbols:content-paste-rounded', disabled: !canEdit }),
        menuItem('pastePlain', '粘贴为纯文本', { icon: 'material-symbols:content-paste-off-rounded', disabled: !canEdit }),
        menuItem('pasteMarkdown', '粘贴为 Markdown', { icon: 'material-symbols:markdown-rounded', disabled: !canEdit }),
        menuItem('selectAll', '全选', { icon: 'material-symbols:select-all-rounded' }),
        menuItem('delete', '删除', { icon: 'material-symbols:delete-outline-rounded', disabled: !canEdit || !hasSelection })
      ]
    },
    {
      // 块类型 8 项收进二级菜单：平铺时它们独占整个菜单的一半高度，
      // 而顶栏工具栏本来就有全套按钮 —— 右键菜单没必要把工具栏再抄一遍。
      // 禁用判断挂在父项上：父项禁用即整组不出现，子项不再各自判断。
      items: [
        menuItem('blockType', '段落样式', {
          icon: 'material-symbols:format-align-left',
          disabled: !canEdit,
          children: [
            menuItem('paragraph', '正文', { icon: 'material-symbols:notes-rounded' }),
            menuItem('h1', '一级标题', { icon: 'material-symbols:title' }),
            menuItem('h2', '二级标题', { icon: 'material-symbols:title' }),
            menuItem('h3', '三级标题', { icon: 'material-symbols:title' }),
            menuItem('quote', '引用', { icon: 'material-symbols:format-quote-rounded' }),
            menuItem('bulletList', '无序列表', { icon: 'material-symbols:format-list-bulleted-rounded' }),
            menuItem('orderedList', '有序列表', { icon: 'material-symbols:format-list-numbered-rounded' }),
            menuItem('codeBlock', '代码块', { icon: 'material-symbols:code-rounded' })
          ]
        })
      ]
    },
    ...(props.notePickerEnabled
      ? [
          {
            items: [
              menuItem('insertLink', '插入笔记链接', { icon: 'tabler:link', disabled: !canEdit }),
              menuItem('insertEmbed', '插入笔记嵌入', { icon: 'material-symbols:note-add-rounded', disabled: !canEdit })
            ]
          }
        ]
      : [])
  ]
}

/**
 * 右键拦截：在编辑态弹出正文菜单，只读态放行浏览器原生菜单（文本仍可复制）。
 *
 * :param event: 原生 contextmenu 事件。
 * :return: 无返回值。
 */
function handleEditorContextMenu(event: MouseEvent): void {
  if (!editor || !editorReady) return
  if (props.readonly) return
  // 嵌入卡片的右键由卡片自己 `stopPropagation`（另有卡片专属菜单），这里按节点容器再兜底一次，
  // 防止宿主结构变化时「卡片菜单 + 正文菜单」双弹。
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('.xynote-embed-nodeview')) return
  event.preventDefault()
  event.stopPropagation()
  editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    contextMenu.value = {
      visible: true,
      x: Math.min(event.clientX, window.innerWidth - 16),
      y: Math.min(event.clientY, window.innerHeight - 16),
      groups: buildEditorContextGroups(view)
    }
  })
}

/**
 * 构造嵌入卡片右键菜单分组：打开 / 复制嵌入引用 + 转换为链接 / 删除卡片。
 *
 * 与桌面端 `MarkdownVisualEditor.vue` 的同名函数一一对应，置灰口径按网页端能力重算：
 * - 打开：网页端只认跨端标识，缺它（未同步 / 桌面端存量卡）一律禁用；
 * - 转换为链接：目标地址只能是 `{origin}/notes/{serverId}`，缺标识时同样禁用；
 * - 复制嵌入引用：只要求「至少知道一个标识」，因此单独判 `hasIdentity`。
 *
 * :return: 供 EditorContextMenu 渲染的分组数组。
 */
function buildEmbedCardMenuGroups(): EditorContextMenuGroup[] {
  const canEdit = !props.readonly
  const target = embedContextTarget.value
  const hasNode = !!target && target.pos >= 0
  const serverId = target?.serverId ? String(target.serverId) : ''
  const hasIdentity = Boolean(serverId || (target?.noteId ?? ''))
  const canOpen = Boolean(serverId) && Boolean(target?.available)
  return [
    {
      items: [
        menuItem('embedOpen', '打开笔记', {
          icon: 'material-symbols:open-in-new-rounded',
          disabled: !canOpen
        }),
        menuItem('embedCopyRef', '复制嵌入引用', {
          icon: 'material-symbols:content-copy-rounded',
          disabled: !hasIdentity
        })
      ]
    },
    {
      items: [
        menuItem('embedUnwrap', '转换为链接', {
          icon: 'tabler:link',
          disabled: !canEdit || !hasNode || !serverId
        }),
        menuItem('embedDelete', '删除卡片', {
          icon: 'material-symbols:delete-outline-rounded',
          danger: true,
          disabled: !canEdit || !hasNode
        })
      ]
    }
  ]
}

/**
 * 嵌入卡片右键（卡片事件冒泡到编辑器根元素）→ 复用同一个菜单浮层弹卡片专属操作项。
 *
 * :param event: 卡片派发的 CustomEvent（detail 见 EmbedCardMenuEventDetail）。
 * :return: 无返回值。
 */
function handleEmbedCardMenu(event: Event): void {
  const detail = (event as CustomEvent<EmbedCardMenuEventDetail>).detail
  if (!detail || !editor || !editorReady) return
  // 只读态没有卡片菜单（卡片已放行原生菜单，不会走到这里）；防御性保留与正文菜单同口径。
  if (props.readonly) return
  embedContextTarget.value = detail
  contextMenu.value = {
    visible: true,
    x: Math.min(detail.x, window.innerWidth - 16),
    y: Math.min(detail.y, window.innerHeight - 16),
    groups: buildEmbedCardMenuGroups()
  }
}

/**
 * 执行正文右键菜单命令（按 action 分发）。
 *
 * :param action: 菜单项 action 标识。
 * :return: 无返回值。
 */
function runEditorContextCommand(action: string): void {
  closeEditorContextMenu()
  if (!editor || !editorReady) return

  // 嵌入卡片菜单动作（目标来自 embedContextTarget，在弹出菜单时记录）
  if (
    action === 'embedOpen' ||
    action === 'embedCopyRef' ||
    action === 'embedUnwrap' ||
    action === 'embedDelete'
  ) {
    void runEmbedCardCommand(action)
    return
  }
  if (action === 'selectAll') {
    editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr.setSelection(new AllSelection(view.state.doc)))
      view.focus()
    })
    return
  }
  if (action === 'insertLink') {
    openNotePicker('link')
    return
  }
  if (action === 'insertEmbed') {
    openNotePicker('embed')
    return
  }
  if (action === 'undo' || action === 'redo' || action === 'delete') {
    editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const commands = ctx.get(commandsCtx)
      if (props.readonly) return
      if (action === 'undo') commands.call(undoCommand.key)
      else if (action === 'redo') commands.call(redoCommand.key)
      else if (!view.state.selection.empty) view.dispatch(view.state.tr.deleteSelection())
      view.focus()
    })
    return
  }
  if (
    action === 'paragraph' ||
    action === 'quote' ||
    action === 'bulletList' ||
    action === 'orderedList' ||
    action === 'codeBlock' ||
    /^h[1-6]$/.test(action)
  ) {
    editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const commands = ctx.get(commandsCtx)
      if (props.readonly) return
      // 光标落在嵌入卡片（自定义块节点）上时不转换，否则会把卡片整块换掉。
      if (view.state.selection.$from.parent.type.name === 'xynoteEmbed') return
      switch (action) {
        case 'paragraph':
          commands.call(setBlockTypeCommand.key, { nodeType: paragraphSchema.type(ctx) })
          break
        case 'quote':
          commands.call(wrapInBlockTypeCommand.key, { nodeType: blockquoteSchema.type(ctx) })
          break
        case 'bulletList':
          commands.call(clearTextInCurrentBlockCommand.key)
          commands.call(wrapInBlockTypeCommand.key, { nodeType: bulletListSchema.type(ctx) })
          break
        case 'orderedList':
          commands.call(clearTextInCurrentBlockCommand.key)
          commands.call(wrapInBlockTypeCommand.key, { nodeType: orderedListSchema.type(ctx) })
          break
        case 'codeBlock':
          commands.call(setBlockTypeCommand.key, { nodeType: codeBlockSchema.type(ctx) })
          break
        default: {
          const level = Number(action.slice(1))
          commands.call(setBlockTypeCommand.key, { nodeType: headingSchema.type(ctx), attrs: { level } })
          break
        }
      }
      view.focus()
    })
    return
  }
  if (action === 'copy' || action === 'cut' || action === 'paste' || action === 'pastePlain' || action === 'pasteMarkdown') {
    void runClipboardAction(action)
  }
}

/**
 * 执行嵌入卡片右键菜单命令。
 *
 * 与桌面端 `MarkdownVisualEditor.vue` 的同名函数一一对应，差别只在网页端没有本机 uuid：
 * 打开 / 转换都用跨端标识，复制也只写出网页端知道的属性（缺值属性一律不输出）。
 *
 * :param action: embedOpen / embedCopyRef / embedUnwrap / embedDelete。
 * :return: 异步完成后无返回值。
 */
async function runEmbedCardCommand(action: string): Promise<void> {
  const target = embedContextTarget.value
  embedContextTarget.value = null
  if (!target || !editor || !editorReady) return
  const serverId = target.serverId ? String(target.serverId) : ''

  // 打开笔记：新标签页打开目标（与点击卡片一致）——口径只认跨端标识。
  if (action === 'embedOpen') {
    if (!serverId) return
    dispatchOpenNote(serverId, true)
    return
  }
  // 复制嵌入引用：复制 markdown 源码，粘回任意笔记仍是嵌入卡片。
  if (action === 'embedCopyRef') {
    // 与序列化同源：属性顺序固定「本机标识 → 跨端标识 → 标题」，缺值的属性不输出。
    const ref = buildEmbedHtml({
      noteId: target.noteId ?? '',
      serverId: serverId || null,
      title: target.title ?? null
    })
    try {
      await navigator.clipboard.writeText(ref)
      ElMessage({ message: '已复制嵌入引用', type: 'success', plain: true })
    } catch {
      ElMessage({ message: '复制失败，请检查浏览器权限', type: 'error', plain: true })
    }
    return
  }
  if (props.readonly) return
  if (target.pos < 0) return

  // 删除卡片：删掉整个块节点
  if (action === 'embedDelete') {
    editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const node = view.state.doc.nodeAt(target.pos)
      if (!node || node.type.name !== 'xynoteEmbed') return
      view.dispatch(view.state.tr.delete(target.pos, target.pos + node.nodeSize))
    })
    return
  }

  // 转换为链接：块节点换成含笔记链接的段落（写当前站点地址，与插入链接同一口径）
  if (action === 'embedUnwrap') {
    if (!serverId) return
    const href = `${window.location.origin}/notes/${encodeURIComponent(serverId)}`
    const label = target.title || '笔记链接'
    editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const node = view.state.doc.nodeAt(target.pos)
      if (!node || node.type.name !== 'xynoteEmbed') return
      const { schema } = view.state
      const linkMark = schema.marks.link
      const textNode = schema.text(label, linkMark ? [linkMark.create({ href })] : [])
      const paragraph = schema.nodes.paragraph.create(null, textNode)
      view.dispatch(view.state.tr.replaceWith(target.pos, target.pos + node.nodeSize, paragraph))
    })
  }
}

/**
 * 剪贴板类动作（复制 / 剪切 / 三种粘贴）。
 *
 * 三种粘贴的区别：
 * - `paste`：**富文本**。读系统剪贴板的 `text/html` 表示解析成 Slice，保留标题 /
 *   列表 / 表格 / 加粗等结构；没有 HTML 表示（如从代码编辑器复制）时退化为纯文本。
 * - `pastePlain`：**纯文本**。原样插入，不做任何 Markdown 解析。
 * - `pasteMarkdown`：**按 Markdown 解析**成富文本节点。
 *
 * ⚠️ 浏览器读剪贴板需要用户手势 + 安全上下文（HTTPS）；被拒绝时统一提示权限问题，
 * 不能让异常冒出去（用户会以为「点了没反应」）。
 *
 * :param action: copy | cut | paste | pastePlain | pasteMarkdown。
 * :return: 异步完成后无返回值。
 */
async function runClipboardAction(action: string): Promise<void> {
  if (!editor) return
  await editor.editor.action(async (ctx) => {
    const view = ctx.get(editorViewCtx)
    const selection = view.state.selection
    try {
      if (action === 'copy' || action === 'cut') {
        if (selection.empty) {
          ElMessage({ message: '请先选中内容再复制', type: 'warning', plain: true })
          return
        }
        const text = view.state.doc.textBetween(selection.from, selection.to, '\n')
        await navigator.clipboard.writeText(text)
        if (action === 'cut') view.dispatch(view.state.tr.deleteSelection())
        ElMessage({ message: '已复制', type: 'success', plain: true })
        return
      }

      if (action === 'paste') {
        const items = await navigator.clipboard.read()
        let html = ''
        let text = ''
        for (const item of items) {
          if (!html && item.types.includes('text/html')) {
            html = await (await item.getType('text/html')).text()
          }
          if (!text && item.types.includes('text/plain')) {
            text = await (await item.getType('text/plain')).text()
          }
        }
        if (!html && !text) {
          ElMessage({ message: '剪贴板为空', type: 'warning', plain: true })
          return
        }
        if (html) {
          const template = document.createElement('template')
          template.innerHTML = html
          const slice = ProseMirrorDOMParser.fromSchema(view.state.schema).parseSlice(
            template.content.cloneNode(true)
          )
          view.dispatch(view.state.tr.replaceSelection(slice))
        } else {
          view.dispatch(view.state.tr.insertText(text))
        }
        view.focus()
        return
      }

      const text = await navigator.clipboard.readText()
      if (!text) {
        ElMessage({ message: '剪贴板为空', type: 'warning', plain: true })
        return
      }
      if (action === 'pastePlain') {
        view.dispatch(view.state.tr.insertText(text))
      } else if (action === 'pasteMarkdown') {
        view.dispatch(view.state.tr.replaceSelection(markdownToSlice(text)(ctx)))
      }
      view.focus()
    } catch {
      ElMessage({ message: '剪贴板操作失败，请检查浏览器权限', type: 'error', plain: true })
    }
  })
}

/**
 * 打开笔记选择器。
 *
 * :param mode: link = 插入链接，embed = 插入嵌入。
 * :return: 无返回值。
 */
function openNotePicker(mode: 'link' | 'embed'): void {
  if (props.readonly) {
    ElMessage({ message: '只读模式下无法插入笔记内容', type: 'warning', plain: true })
    return
  }
  notePickerMode.value = mode
  notePickerVisible.value = true
}

/**
 * 输入时检测 `[[` 并打开笔记选择器（Obsidian 式快捷插入）。
 *
 * ## 与桌面端的取舍
 *
 * 桌面端是**光标处内联浮层**（`LinkSuggestPopover`，另有一套定位/滚动/高亮逻辑）。
 * 网页端已有同款功能的笔记选择器（Cmd+K、右键「插入笔记链接」、slash 三条入口共用），
 * 这里**直接复用它**，不新造第二套浮层 —— 否则同一个「选一篇笔记」会���两种长相，
 * 且浮层的横向滚动条、`scrollIntoView` 带跑正文那些坑要重踩一遍。
 * 代价：`[[` 弹的是居中选择器而不是内联浮层。
 *
 * 片段本身**先不删**：选中后由 `insertPickedNote` 把 `[起点, 光标)` 整段替换成链接文本，
 * 中途取消则 `[[` 原样留在正文里（与桌面端取消时的表现一致）。
 *
 * @return 始终返回 false —— 只观察输入，不拦截。
 */
function handleLinkTriggerInput(): boolean {
  if (props.readonly || !editor || !editorReady) {
    linkTriggerStart.value = null
    return false
  }
  // 已经在补全中：后续按键都进选择器的搜索框了，别重复弹。
  if (linkTriggerStart.value !== null) return false
  // 文章页不写站内笔记标记，与右键/slash 插入项同一道门。
  if (!props.notePickerEnabled) return false

  let detected = false
  editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const from = view.state.selection.from
    const before = view.state.doc.textBetween(Math.max(0, from - 2), from)
    if (before !== '[[') return
    linkTriggerStart.value = from - 2
    detected = true
  })
  if (detected) openNotePicker('link')
  return false
}

/**
 * 把选择器里选中的笔记写进正文：链接或嵌入卡片。
 *
 * 链接写当前站点的绝对地址 `{origin}/notes/{id}` —— 与桌面端插入的
 * `{webBaseUrl}/notes/{serverId}` 同构，网页端 `resolveNoteIdFromHref` 按同源判定，
 * 两端写出来的链接都能被识别成站内笔记链接。
 *
 * 嵌入卡片只写**跨端标识** `data-xynote-embed-server`（网页端 id 就是服务端主键）：
 * `data-xynote-embed` 是桌面端的**本机 uuid** 槽位，网页端没有这个值 —— 留空不写，
 * 桌面端解析时按 serverId 回落取数。两端都按「两个标识属性任一存在」识别卡片
 * （见 `components/editor/xynote-embed.ts` 的 `isEmbedHtml`）。
 *
 * :param note: 选中的笔记。
 * :return: 无返回值。
 */
function insertPickedNote(note: INoteListItem): void {
  if (!editor || !editorReady || props.readonly) return
  const noteId = String(note.id)
  const title = note.title || '无标题笔记'
  const mode = notePickerMode.value
  // `[[` 补全进来时要把「[[ + 已敲的关键词」整段替换掉，而不是只插到光标处。
  const triggerStart = linkTriggerStart.value
  linkTriggerStart.value = null

  try {
    editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      // 有 `[[` 起点就用它（替换掉 `[[` + 关键词），否则用当前选区。
      const from = triggerStart ?? view.state.selection.from
      // 🔴 终点在有 `[[` 起点时必须取**当前光标**（= `[[` 之后的位置），
      // 不能也取起点 —— 那样 from === to，替换区间为空，只在原地插入链接文字，
      // 表现为「选完一篇笔记，`[[` 还在」（10-15 用户报障）。
      const to = triggerStart == null ? view.state.selection.to : view.state.selection.from
      if (mode === 'link') {
        const linkMark = view.state.schema.marks.link
        if (!linkMark) throw new Error('编辑器链接能力不可用')
        const href = `${window.location.origin}/notes/${encodeURIComponent(noteId)}`
        const linkNode = view.state.schema.text(title, [linkMark.create({ href })])
        view.dispatch(view.state.tr.replaceRangeWith(from, to, linkNode).scrollIntoView())
        view.focus()
        return
      }
      const commands = ctx.get(commandsCtx)
      const embedType = view.state.schema.nodes.xynoteEmbed
      if (!embedType) throw new Error('笔记嵌入能力不可用')
      // 与 Crepe 内置 image / table 同套路：先清空当前块文本，再由命令层换块类型。
      commands.call(clearTextInCurrentBlockCommand.key)
      commands.call(addBlockTypeCommand.key, {
        nodeType: embedType,
        // noteId 留空：网页端没有桌面端的本机 uuid，跨端取数只认 serverId。
        attrs: { noteId: '', title, serverId: noteId }
      })
      view.focus()
    })
  } catch (error) {
    ElMessage({
      message: error instanceof Error ? error.message : '插入失败',
      type: 'error',
      plain: true
    })
  }
}

/**
 * 执行编辑器撤销命令。
 *
 * :return: 无返回值。
 */
function undoEditor(): void {
  editor?.editor.action((ctx) => ctx.get(commandsCtx).call(undoCommand.key))
}

/**
 * 执行编辑器重做命令。
 *
 * :return: 无返回值。
 */
function redoEditor(): void {
  editor?.editor.action((ctx) => ctx.get(commandsCtx).call(redoCommand.key))
}

/**
 * 判断当前选区里是否已经存在行内公式节点。
 *
 * 用来区分这次点「行内公式」是**包上**还是**拆掉**：选中的本来就是公式节点时，
 * 即使 `textBetween` 是空串也必须放行（它是原子节点，取不到文字）。
 *
 * :param view: ProseMirror 视图。
 * :return: 选区覆盖到 `math_inline` 节点时返回 true。
 */
function selectionHasInlineFormula(view: ProseMirrorView): boolean {
  const mathType = view.state.schema.nodes.math_inline
  if (!mathType) return false
  const { from, to } = view.state.selection
  let found = false
  view.state.doc.nodesBetween(from, to, (node) => {
    if (node.type === mathType) found = true
    return true
  })
  return found
}

/**
 * 切换当前选区的行内公式格式。
 *
 * ## ⚠️ 无选区时**绝不能**直接调 Crepe 的 `ToggleLatex`（2026-10-16 用户报的坑）
 *
 * 该命令把 `doc.textBetween(from, to)` 当作公式内容，选区为空时取到空串 →
 * 插进来一个**空公式节点**：屏幕上零宽、看不见（用户以为「点了没反应」），
 * 序列化成 Markdown 却是一个孤零零的 `$$` —— 这行若落在行首/独占一行，重新打开笔记时
 * remark 会把它当作**块级公式**的开头，把后面所有正文一口吞进公式里（数据损坏，
 * 得手动改源码才能救回）。
 * 选区落在图片 / 嵌入卡这类原子节点上时 `textBetween` 同样是空串，会直接把卡片换掉。
 *
 * 所以先判定「选区里有可包的文字」或「选中的本来就是公式节点（这次是拆掉）」，
 * 两者都不满足就只给提示，一个字都不动。
 *
 * :return: 无返回值。
 */
function toggleInlineFormula(): void {
  if (!editor || !editorReady || props.readonly) return
  const applied = editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { doc, selection } = view.state
    const hasFormula = selectionHasInlineFormula(view)
    if (!hasFormula && doc.textBetween(selection.from, selection.to, '\n').trim() === '') return false
    ctx.get(commandsCtx).call('ToggleLatex')
    // 命令执行后选区落在公式节点上却已失焦（点击落点被工具栏按钮抢走）；
    // 把焦点交还编辑器，公式编辑气泡才会展开。
    view.focus()
    return true
  })
  if (!applied) {
    ElMessage({ message: '请先选中要转成公式的文字', type: 'warning', plain: true })
  }
}

/**
 * 让「行内公式」编辑气泡的**确认按钮（勾）**顺手把气泡收起。
 *
 * ## ⚠️ 点勾为什么关不掉气泡（2026-10-16 用户报的坑）
 *
 * Crepe 的 `LatexInlineTooltip` 只给那个按钮挂了 `pointerdown → updateValue`
 * （把输入框里的文字写回 `math_inline` 节点的 `value`），**一个字都不动选区** ——
 * 而气泡的显隐判据是 `selection instanceof NodeSelection && node.type.name === math_inline`，
 * 光标还赖在公式节点上，判据继续成立，于是值写完了气泡还杵在原地。
 *
 * 这里补一刀：确认后把光标挪到公式节点**后面**，气泡自然收起
 * （实测 `data-show` 由 `true` 转 `false`、`display` 转 `none`）。
 * 想再改就再点一次公式 —— Crepe 会自动重新展开气泡。
 *
 * ⚠️ 必须注册在**冒泡**阶段：Crepe 的 handler 挂在那个 button 上，
 * 冒泡阶段注册的监听一定排在它后面，读到的 `selection` 才是更新后的。
 *
 * :param event: 文档上的 pointerdown（事件委托，气泡每次显隐都复用同一个 DOM）。
 * :return: 无返回值。
 */
function handleLatexBubbleConfirm(event: PointerEvent): void {
  const target = event.target as HTMLElement | null
  if (!target?.closest?.('.milkdown-latex-inline-edit button')) return
  if (!editor || !editorReady || props.readonly) return
  editor.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { state } = view
    if (!(state.selection instanceof NodeSelection)) return
    // 光标落到公式节点之后（`near` 会自动夹到最近的合法文本位置，公式在段末也安全）。
    const pos = Math.min(state.selection.to, state.doc.content.size)
    view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos), 1)))
    view.focus()
  })
}

/**
 * 判断当前选区是否落在表格单元格内。
 *
 * :param view: ProseMirror 视图。
 * :return: 在表头或表体单元格内返回 true。
 */
function isSelectionInTableCell(view: ProseMirrorView): boolean {
  const { $from } = view.state.selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (TABLE_CELL_NODE_NAMES.includes($from.node(depth).type.name)) return true
  }
  return false
}

/**
 * 在表格单元格内用 `Shift+Enter` 插入硬换行（`<br>`）。
 *
 * ## 为什么需要这个 handler
 *
 * Crepe 的 commonmark preset 注册了 `hardbreakFilterPlugin`，它读取 `hardbreakFilterNodes`
 * ctx（默认值 `["table", "code_block"]`）并**拒绝**在表格内插入 hardbreak ——
 * 所以内置 `Shift+Enter` 在单元格里**静默失效**（按键后既不换行也不报错）。
 *
 * 这里改用本项目的 `xynoteHardbreak` 内联节点，它不经该插件（插件只拦带 hardbreak meta 的事务），
 * 且序列化时回写 html `<br>`，在表格单元格内逐字节保真。
 *
 * :param view: ProseMirror 视图。
 * :param event: 键盘事件。
 * :return: 已处理时返回 true；非表格内一律返回 false，交回默认行为。
 */
function insertTableCellHardBreak(view: ProseMirrorView, event: KeyboardEvent): boolean {
  if (props.readonly) return false
  if (event.key !== 'Enter' || !event.shiftKey) return false
  if (!isSelectionInTableCell(view)) return false
  const type = view.state.schema.nodes[HARDBREAK_NODE_NAME]
  if (!type) return false
  event.preventDefault()
  view.dispatch(
    view.state.tr
      .replaceSelectionWith(type.create())
      .scrollIntoView()
  )
  return true
}

/**
 * 在文档首个代码块前插入空段落。
 *
 * :param event: 代码编辑器键盘事件。
 * :return: 成功插入段落时返回 true。
 */
function insertParagraphBeforeLeadingCodeBlock(event: KeyboardEvent): boolean {
  if (
    (event.key !== 'ArrowUp' && event.key !== 'Backspace')
    || event.altKey
    || event.ctrlKey
    || event.metaKey
    || event.shiftKey
    || props.readonly
  ) return false
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  const codeMirrorElement = target.closest<HTMLElement>('.cm-editor')
  if (!codeMirrorElement) return false
  const codeMirrorView = EditorView.findFromDOM(codeMirrorElement)
  const selection = codeMirrorView?.state.selection.main
  if (!selection || !selection.empty || selection.head !== 0) return false

  let inserted = false
  editor?.editor.action((context) => {
    const view = context.get(editorViewCtx)
    const { state } = view
    if (state.doc.firstChild?.type.name !== 'code_block') return
    const paragraph = paragraphSchema.type(context).create()
    let transaction = state.tr.insert(0, paragraph)
    transaction = transaction.setSelection(TextSelection.create(transaction.doc, 1))
    view.dispatch(transaction.scrollIntoView())
    view.focus()
    inserted = true
  })
  if (inserted) {
    event.preventDefault()
    event.stopPropagation()
  }
  return inserted
}

/**
 * 处理编辑器级键盘操作。
 *
 * :param event: 键盘事件。
 * :return: 无返回值。
 */
function handleEditorDocumentKeydown(event: KeyboardEvent): void {
  if (insertParagraphBeforeLeadingCodeBlock(event)) return
  if (event.key !== 'Escape') return
  closeToolbarMenus()
  closeEditorContextMenu()
}

/**
 * 将原生工具栏按钮重新组织为紧凑的一级入口和二级菜单。
 *
 * :param actions: 原生工具栏操作区。
 * :return: 无返回值。
 */
function groupTopBarActions(actions: HTMLElement): void {
  if (actions.querySelector('.markdown-toolbar-menu')) return
  const buttons = Array.from(actions.querySelectorAll<HTMLButtonElement>('.top-bar-item'))
  const buttonMap = new Map(buttons.map((button) => [button.dataset.label, button]))
  const pickButtons = (labels: string[]): HTMLButtonElement[] => (
    labels.map((label) => buttonMap.get(label)).filter((button): button is HTMLButtonElement => Boolean(button))
  )

  const listMenu = createToolbarMenu({
    key: 'list',
    label: '列表',
    icon: 'material-symbols:format-list-bulleted-rounded'
  }, pickButtons(['无序列表', '有序列表', '任务列表']))
  const inlineFormulaButton = createToolbarActionButton({
    label: '行内公式',
    icon: 'material-symbols:functions-rounded',
    action: toggleInlineFormula
  })
  const insertMenu = createToolbarMenu({
    key: 'insert',
    label: '插入',
    icon: 'material-symbols:add-box-outline-rounded'
  }, [
    ...pickButtons(['表格', '公式', '引用', '分隔线']),
    inlineFormulaButton
  ])
  const undoButton = createTopBarActionButton({
    label: '撤销',
    icon: 'material-symbols:undo-rounded',
    action: undoEditor
  })
  const redoButton = createTopBarActionButton({
    label: '重做',
    icon: 'material-symbols:redo-rounded',
    action: redoEditor
  })
  const formattingButtons = pickButtons(['加粗', '斜体', '删除线', '行内代码'])
  const directInsertButtons = pickButtons(['链接', '图片', '代码块'])
  actions.replaceChildren(
    // 字号下拉紧跟块类型选择器 —— 两者都作用于选中内容的排版格式，放一起比埋进「更多」里少一次点击。
    createFontSizeMenu(),
    createToolbarDivider(),
    undoButton,
    redoButton,
    createToolbarDivider(),
    ...formattingButtons,
    createToolbarDivider(),
    listMenu,
    createToolbarDivider(),
    ...directInsertButtons,
    createToolbarDivider(),
    insertMenu
  )
}

/**
 * 为 Milkdown 工具栏补充中文标题和无障碍名称。
 *
 * :param root: 编辑器根元素。
 * :return: 无返回值。
 */
function localizeTopBar(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>('.top-bar-item').forEach((button, index) => {
    const label = topBarLabels[index]
    if (!label) return
    button.title = label
    button.dataset.label = label
    button.setAttribute('aria-label', label)
  })

  const inner = root.querySelector<HTMLElement>('.top-bar-inner')
  const heading = inner?.querySelector<HTMLElement>('.top-bar-heading-selector')
  if (!inner || !heading) return
  let actions = inner.querySelector<HTMLElement>('.top-bar-actions')
  if (!actions) {
    const createdActions = document.createElement('div')
    createdActions.className = 'top-bar-actions'
    Array.from(inner.children).forEach((child) => {
      if (child !== heading) createdActions.append(child)
    })
    inner.append(createdActions)
    actions = createdActions
  }
  groupTopBarActions(actions)
  const showTrailingActions = props.showOutline || !props.readonly
  if (showTrailingActions && !actions.querySelector('.markdown-toolbar-trailing-divider')) {
    const divider = createToolbarDivider()
    divider.classList.add('markdown-toolbar-trailing-divider')
    actions.append(divider)
  }
  if (props.showOutline && !actions.querySelector('.markdown-outline-toggle')) {
    const outlineToggle = document.createElement('button')
    outlineToggle.type = 'button'
    outlineToggle.className = 'markdown-outline-toggle top-bar-item'
    // 只读态下大纲仍可切换（看结构不需要写权限）。
    outlineToggle.dataset.allowInReadonly = 'true'
    outlineToggle.setAttribute('aria-controls', 'markdown-outline-panel')
    render(h(Icon, { icon: 'material-symbols:toc-rounded', 'aria-hidden': 'true' }), outlineToggle)
    outlineToggle.addEventListener('click', toggleOutline)
    actions.append(outlineToggle)
  }
  if (!toolbarEventsBound) {
    document.addEventListener('click', closeToolbarMenus)
    document.addEventListener('keydown', handleEditorDocumentKeydown)
    // 气泡字号的开关分处 pointerdown / click，两条必须配套（判定只看「按下」的落点，
    // 原因见 trackBubbleFontSizePointerDown()）。捕获阶段注册，早于上面那条冒泡关闭。
    document.addEventListener('pointerdown', trackBubbleFontSizePointerDown, true)
    document.addEventListener('click', guardBubbleFontSizeClick, true)
    document.addEventListener('click', closeBubbleFontSizePanel)
    // 正文右键菜单：点别处收起来（在编辑器里再次右键时，pointerdown 先收旧的、
    // 随后的 contextmenu 再开新的，顺序天然正确）。
    document.addEventListener('pointerdown', closeEditorContextMenu)
    // 行内公式气泡的确认按钮：Crepe 只管把值写回节点、不管收气泡，这里补一刀
    // （原因见 handleLatexBubbleConfirm()）。走冒泡，才能排在 Crepe 挂在 button 上的 handler 之后。
    document.addEventListener('pointerdown', handleLatexBubbleConfirm)
    toolbarEventsBound = true
  }
  syncOutlineToggle()
}

/**
 * 创建 Milkdown 编辑器并注册内容更新监听。
 *
 * :return: 无返回值。
 */
async function createEditor(): Promise<void> {
  if (!editorRootRef.value) return

  const crepe = new Crepe({
    root: editorRootRef.value,
    defaultValue: contentValue.value,
    features: {
      [Crepe.Feature.TopBar]: true
    },
    featureConfigs: {
      [Crepe.Feature.BlockEdit]: {
        // 块手柄（block handle）横向偏移：桌面端用 5px 让它离正文边缘更远一点。
        blockHandle: { getOffset: () => 5 },
        textGroup: {
          label: '文本',
          text: { label: '正文' },
          h1: { label: '一级标题' },
          h2: { label: '二级标题' },
          h3: { label: '三级标题' },
          h4: { label: '四级标题' },
          h5: { label: '五级标题' },
          h6: { label: '六级标题' },
          quote: { label: '引用' },
          divider: { label: '分隔线' }
        },
        listGroup: {
          label: '列表',
          bulletList: { label: '无序列表' },
          orderedList: { label: '有序列表' },
          taskList: { label: '任务列表' }
        },
        advancedGroup: {
          label: '高级',
          image: { label: '图片' },
          codeBlock: { label: '代码块' },
          table: { label: '表格' },
          math: { label: '公式' }
        },
        // 在 slash「/」命令菜单里追加「嵌入笔记」项（选择器复用既有 NotePickerDialog）。
        // ⚠️ 文章页复用同一个编辑器，不能往正文里写站内笔记标记 —— 故用 notePickerEnabled 把门。
        buildMenu: (builder) => {
          if (!props.notePickerEnabled) return
          builder.getGroup('advanced')?.addItem('xynote-embed', {
            label: '嵌入笔记',
            icon: EMBED_SLASH_ICON,
            onRun: () => {
              if (props.readonly) {
                ElMessage({ message: '只读模式下无法插入笔记嵌入', type: 'warning', plain: true })
                return
              }
              // 只弹出笔记选择器，不动编辑器文本（保留 `/xxx`）；选完由 insertPickedNote
              // 清块后插入卡片，中途取消则 `/xxx` 原样保留。
              openNotePicker('embed')
            }
          })
        }
      },
      [Crepe.Feature.LinkTooltip]: {
        inputPlaceholder: '粘贴链接地址…',
        // 左槽位改造成「打开 / 复制」两个按钮（Crepe 原本只给一个复制按钮、且点了没有任何提示）。
        linkIcon: LINK_TOOLTIP_ACTIONS_ICON,
        onCopyLink: () => {
          ElMessage({ message: '链接已复制', type: 'success', plain: true })
        }
      },
      // 选中气泡（选区上方浮出的 B/I/S 工具条）里追加「字号」下拉。
      // Crepe 的 Toolbar 只给每项渲染一个写死属性的 icon 按钮，没有下拉能力，
      // 所以这里只挂一个触发器，面板由 toggleBubbleFontSizePanel() 自己开。
      [Crepe.Feature.Toolbar]: {
        buildToolbar: (builder) => {
          builder.getGroup('formatting').addItem('xynote-font-size', {
            icon: FONT_SIZE_TRIGGER_ICON,
            // 与 B/I/S 同一口径：选区起点带行内字号标记时点亮。
            active: (activeCtx) => {
              const markType = activeCtx.get(editorViewCtx).state.schema.marks[FONT_SIZE_MARK_NAME]
              return Boolean(markType?.isInSet(activeCtx.get(editorViewCtx).state.selection.$from.marks()))
            },
            onRun: () => toggleBubbleFontSizePanel()
          })
        }
      },
      [Crepe.Feature.CodeMirror]: {
        searchPlaceholder: '搜索代码语言',
        noResultText: '没有匹配结果',
        copyText: '复制',
        onCopy: () => {
          ElMessage({
            message: '复制成功',
            type: 'success',
            plain: true
          })
        },
        previewToggleText: (previewOnlyMode: boolean) => previewOnlyMode ? '编辑' : '隐藏'
      },
      [Crepe.Feature.TopBar]: {
        headingOptions: [
          { label: '正文', level: null },
          { label: '一级标题', level: 1 },
          { label: '二级标题', level: 2 },
          { label: '三级标题', level: 3 },
          { label: '四级标题', level: 4 },
          { label: '五级标题', level: 5 },
          { label: '六级标题', level: 6 }
        ]
      },
      [Crepe.Feature.Placeholder]: {
        text: '输入 / 可插入标题、列表、图片等内容',
        mode: 'block'
      },
      [Crepe.Feature.ImageBlock]: {
        onUpload: uploadImage,
        inlineOnUpload: uploadImage,
        blockOnUpload: uploadImage,
        inlineUploadButton: '上传图片',
        inlineUploadPlaceholderText: '或粘贴图片地址',
        blockUploadButton: '上传图片',
        blockConfirmButton: '确认',
        blockCaptionPlaceholderText: '填写图片说明',
        blockUploadPlaceholderText: '或粘贴图片地址'
      }
    }
  })

  editor = crepe
  // 笔记嵌入卡片：桌面端写进正文的 <div data-xynote-embed …> 默认会被 commonmark 的
  // htmlSchema 当纯文本显示（看起来是一段源码）。注册自定义块节点后按跨端标识渲染成卡片，
  // 没有跨端标识（目标未同步 / 存量卡片）时显示占位提示。见 ./xynote-embed.ts
  crepe.addFeature(installXynoteEmbedFeature)
  // 行内字号：把正文里的 <span style="font-size:…"> 往返成可编辑的 mark。
  // 见 ./xynote-font-size.ts 与 @/utils/inline-font-size.ts
  crepe.addFeature(installFontSizeFeature)
  // 内联 <br> 保真：commonmark 的空行占位插件会把正文里真实的 <br> 一并删掉
  // （段落里 `前<br>后` 变 `前后`、表格单元格里直接消失）。见 ./xynote-hardbreak.ts
  crepe.addFeature(installHardbreakFeature)
  crepe.on((listener) => {
    // 字号下拉要跟随选区：移动光标 / 拖选后必须重算，否则触发器上的数值会停在旧位置
    // （`storedMarks` 只在光标态有效，所以这里只能靠选区事件，不能靠文档更新事件）。
    listener.selectionUpdated(() => {
      if (!editorReady) return
      // ⚠️ 这个回调是在 ProseMirror 的 `state.apply` **内部**同步触发的，
      // 此刻 `view.state` 仍是**上一个** state —— 直接读会永远慢一拍
      // （下拉数值停在移动光标之前）。推到微任务里读，此时 dispatch 已返回。
      queueMicrotask(() => {
        if (!editorReady) return
        refreshFontSizeMenu()
      })
    })
    listener.markdownUpdated((_ctx, markdown) => {
      updateOutline(markdown)
      if (suppressedMarkdown === markdown) {
        suppressedMarkdown = null
        return
      }
      suppressedMarkdown = null
      if (!editorReady && pendingContent !== null) return
      contentValue.value = markdown
      if (props.readonly) return
      emit('change', markdown)
    })
  })

  await crepe.create()
  if (destroyed) {
    await crepe.destroy()
    if (editor === crepe) editor = null
    return
  }

  localizeTopBar(editorRootRef.value)
  syncReadonlyState()
  // 链接编辑：接管 Crepe 自带的编辑气泡（一行光秃秃的输入框），换成自研的表单浮层。
  // ⚠️「编辑」按钮与选中气泡里的「链接」按钮走的是**同一个 API**（editLink / addLink），
  // 覆写一次两条入口一起改。覆写在 create() 之后，所以能盖掉插件安装时写入的实现。
  crepe.editor.action((context) => {
    const view = context.get(editorViewCtx)
    // 表格单元格内的 Shift+Enter：抢在 Crepe 内置 keymap 之前接管
    // （内置 keymap 会被 hardbreakFilterPlugin 拦掉，表现为「按了没反应」）。
    // ProseMirror 先问 handleKeyDown、返回 true 才跳 keymap，所以这里天然优先。
    view.setProps({
      handleKeyDown: (view_, event) => insertTableCellHardBreak(view_ as ProseMirrorView, event),
      // `[[` 触发笔记选择器。只观察不拦截（恒返回 false），编辑器自身的输入处理照旧。
      handleDOMEvents: { input: handleLinkTriggerInput }
    })
    linkEditEditorView = view
    context.update(linkTooltipAPI.key, (api) => ({
      ...api,
      addLink: (from, to) => openLinkEditor(null, from, to),
      editLink: (mark, from, to) => openLinkEditor(mark, from, to)
    }))
    setLinkTooltipMode = (mode) => {
      context.update(linkTooltipState.key, (state) => ({ ...state, mode }))
    }
  })
  // 接管链接气泡左侧「打开」按钮（必须捕获阶段，见该函数注释）。
  editorRootRef.value?.addEventListener('pointerdown', handleLinkTooltipPointerDown, true)

  const targetContent = pendingContent ?? contentValue.value
  pendingContent = null
  editorReady = true
  if (crepe.getMarkdown() !== targetContent) {
    replaceContentSilently(targetContent, crepe)
  }
  // 首次渲染后补一次，避免「打开一篇带字号的笔记，下拉却停在 15」。
  refreshFontSizeMenu()
}

/**
 * 设置编辑器 Markdown 内容。
 *
 * :param value: Markdown 内容。
 * :param resetScroll: 是否重置编辑区滚动位置。
 * :return: 无返回值。
 */
function setContent(value: string, resetScroll = false): void {
  const contentChanged = contentValue.value !== value
  contentValue.value = value
  if (contentChanged) updateOutline(value)
  if (!editor || !editorReady) {
    pendingContent = value
    if (resetScroll) resetEditorScroll()
    return
  }
  if (contentChanged) replaceContentSilently(value, editor)
  if (resetScroll) resetEditorScroll()
}

/**
 * 获取当前 Markdown 内容长度。
 *
 * :return: Markdown 字符数。
 */
function getContentLength(): number {
  return contentValue.value.length
}

watch(() => props.value, (value) => setContent(value, false))
watch(() => props.readonly, () => syncReadonlyState())
// 选择器关闭但没选中时，`[[` 片段要留在正文里（与桌面端取消时的表现一致），
// 此时清掉起点，避免下次输入被判成「仍在补全中」而不再弹选择器。
watch(notePickerVisible, (visible) => {
  if (!visible) linkTriggerStart.value = null
})

onMounted(() => {
  outlineOpen.value = props.showOutline && localStorage.getItem(OUTLINE_STORAGE_KEY) !== 'false'
  editorRootRef.value?.addEventListener('click', handleEditorLinkClick, true)
  editorRootRef.value?.addEventListener('paste', handleEditorLinkPaste, true)
  editorRootRef.value?.addEventListener('contextmenu', handleEditorContextMenu)
  // 嵌入卡片的卡片菜单：事件由卡片 DOM 冒泡上来，只落到本实例（不用 window 总线）。
  editorRootRef.value?.addEventListener(EMBED_CARD_MENU_EVENT, handleEmbedCardMenu)
  void createEditor()
})

onBeforeUnmount(() => {
  destroyed = true
  editorRootRef.value?.removeEventListener('click', handleEditorLinkClick, true)
  editorRootRef.value?.removeEventListener('paste', handleEditorLinkPaste, true)
  editorRootRef.value?.removeEventListener('contextmenu', handleEditorContextMenu)
  editorRootRef.value?.removeEventListener(EMBED_CARD_MENU_EVENT, handleEmbedCardMenu)
  editorRootRef.value?.removeEventListener('pointerdown', handleLinkTooltipPointerDown, true)
  unbindLinkEditTracking()
  linkEditState.value = null
  linkEditEditorView = null
  setLinkTooltipMode = null
  if (toolbarEventsBound) {
    document.removeEventListener('click', closeToolbarMenus)
    document.removeEventListener('keydown', handleEditorDocumentKeydown)
    document.removeEventListener('pointerdown', trackBubbleFontSizePointerDown, true)
    document.removeEventListener('click', guardBubbleFontSizeClick, true)
    document.removeEventListener('click', closeBubbleFontSizePanel)
    document.removeEventListener('pointerdown', closeEditorContextMenu)
    document.removeEventListener('pointerdown', handleLatexBubbleConfirm)
    toolbarEventsBound = false
  }
  // 气泡字号面板是 portal 到 body 的，宿主在编辑器内 —— 组件销毁时两边都要摘干净。
  closeBubbleFontSizePanel()
  bubbleFontSizeHost?.remove()
  bubbleFontSizePanel?.remove()
  bubbleFontSizeHost = null
  bubbleFontSizePanel = null
  bubbleFontSizeArmed = false
  readonlyObserver?.disconnect()
  readonlyObserver = null
  pendingContent = null
  suppressedMarkdown = null
  const currentEditor = editor
  editor = null
  if (currentEditor && editorReady) void currentEditor.destroy()
  editorReady = false
})

defineExpose({
  setContent,
  getContentLength
})
</script>

<style lang="scss">
.milkdown-editor-shell {
  --markdown-content-width: 920px;
  /* 正文字号基数，标题与表格字号都由它等比换算（与桌面端 --markdown-body-font-size 同值，
     改一处两端一起变）。注意 Crepe 给 `p` 硬编码了 16px，所以它并不等于段落的实际字号。 */
  --markdown-body-font-size: 15px;
  --markdown-outline-width: 240px;
  --markdown-outline-background: #fff;
  --markdown-outline-border: #d7dfec;
  --markdown-outline-hover: #edf5ff;
  --markdown-outline-primary: #2f80ed;
  --markdown-outline-text: #667085;

  position: relative;
  height: 100%;
  min-height: 0;
  color: #243047;
  background: #fff;
  border: 1px solid #e5eaf3;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 14px 34px rgb(15 23 42 / 5%);
}

.milkdown-editor-scroll {
  height: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.milkdown-editor-root,
.milkdown-editor-root .milkdown {
  min-height: 100%;
}

.milkdown-editor-root .milkdown {
  --crepe-color-background: #fff;
  --crepe-color-on-background: #243047;
  --crepe-color-surface: #f8faff;
  --crepe-color-surface-low: #eef4ff;
  --crepe-color-on-surface: #243047;
  --crepe-color-on-surface-variant: #526079;
  --crepe-color-outline: #64748b;
  --crepe-color-primary: #2f80ed;
  --crepe-color-secondary: #dbeafe;
  --crepe-color-on-secondary: #174ea6;
  --crepe-color-hover: #edf5ff;
  --crepe-color-selected: #dbeafe;
  --crepe-color-inline-area: #eef2f7;
  --milkdown-structure-border: #b8c3d3;
  --milkdown-toolbar-divider: #c8d1df;
  --milkdown-toolbar-icon: #526079;
  --crepe-font-title: inherit;
  --crepe-font-default: inherit;
}

/*
  ⚠️ 必须用**直接子代** `>` 选中主编辑器。

  编辑器里不止一个 `.ProseMirror`：Crepe 的行内公式编辑气泡会内嵌**第二个 EditorView**
  （`.milkdown > .milkdown-latex-inline-edit > .container > div > .ProseMirror`）。主编辑器确实是
  `.milkdown` 的直接子元素 —— DOM 由 `@milkdown/core` 的 `createViewContainer()` 组装
  （`div.milkdown` → `appendChild(view.dom)`）。
  写成后代选择器会把这套「视口级」尺寸也套到那个一行的输入框上：实测（2026-10-16，用户截图
  标定后 221×503）气泡被这里的 `min-height: 500px` 撑成一个大空框，窄窗口下还有
  `@media (max-width: 767px)` 里的 `calc(100vh - 310px)`。样式表末尾另有一条兜底规则。
*/
.milkdown-editor-root .milkdown > .ProseMirror {
  box-sizing: border-box;
  width: min(100%, var(--markdown-content-width));
  min-height: 500px;
  margin-right: auto;
  margin-left: auto;
  padding: 18px clamp(28px, 4.5vw, 64px) 72px;
  font-size: var(--markdown-body-font-size);
  line-height: 1.8;
  outline: none;
}

/* 标题体系对齐桌面端（桌面端 src/style.css 同名规则）：Crepe 默认是 42/36/32/28/24/18px
   + 字重 400，在编辑器里一个 `# 标题` 能占掉半屏，层级落差也过大。
   这里收紧为 24/20/17/15.5/15/14px（= 正文 × 1.6/1.333/1.133/1.033/1/0.933）并统一加粗，
   字号全部由 --markdown-body-font-size 派生，与桌面端共用同一套比例。
   颜色不写死：标题继承正文色，暗色主题下自动跟随。 */
.milkdown-editor-root .milkdown .ProseMirror :is(h1, h2, h3, h4, h5, h6) {
  font-weight: 700;
  line-height: 1.4;
}

.milkdown-editor-root .milkdown .ProseMirror h1 {
  margin-top: 26px;
  font-size: calc(var(--markdown-body-font-size) * 1.6);
}

.milkdown-editor-root .milkdown .ProseMirror h2 {
  margin-top: 22px;
  font-size: calc(var(--markdown-body-font-size) * 1.333);
}

.milkdown-editor-root .milkdown .ProseMirror h3 {
  margin-top: 18px;
  font-size: calc(var(--markdown-body-font-size) * 1.133);
}

.milkdown-editor-root .milkdown .ProseMirror h4 {
  margin-top: 16px;
  font-size: calc(var(--markdown-body-font-size) * 1.033);
}

.milkdown-editor-root .milkdown .ProseMirror h5 {
  margin-top: 14px;
  font-size: var(--markdown-body-font-size);
}

.milkdown-editor-root .milkdown .ProseMirror h6 {
  margin-top: 14px;
  font-size: calc(var(--markdown-body-font-size) * 0.933);
}

/* 标题内的行内代码不跟随标题字号撑大（与桌面端一致，保持正文节奏）。 */
.milkdown-editor-root .milkdown .ProseMirror :is(h1, h2, h3, h4, h5, h6) code {
  font-size: 0.88em;
}

/* 大纲是绝对定位浮层，正文得自己让位。要点是**不能只写 margin-right**：
   基础规则里的 margin-left: auto 会把剩余空间全部吃掉，正文被顶到大纲左边，
   窗口越宽偏得越远（1920px 下右移 232px，且右缘仍被大纲压住 12px）。
   这里先按「容器宽 - 大纲占位」算出可用区，再让正文在其中居中。 */
.milkdown-editor-shell.has-outline .milkdown-editor-root .milkdown .ProseMirror {
  --md-available-width: calc(100% - var(--markdown-outline-width) - 40px);
  --md-body-width: min(var(--md-available-width), var(--markdown-content-width));
  width: var(--md-body-width);
  /* 左侧 = 可用区内的居中留白；右侧 = 同样的留白 + 大纲宽度 + 20px 呼吸间隙 */
  margin-left: max(0px, calc((var(--md-available-width) - var(--md-body-width)) / 2));
  margin-right: max(
    0px,
    calc(
      (var(--md-available-width) - var(--md-body-width)) / 2 + var(--markdown-outline-width) + 40px
    )
  );
}

.milkdown-editor-root .milkdown .milkdown-top-bar {
  position: sticky;
  z-index: 20;
  top: 0;
  min-height: 62px;
  border-bottom: 1px solid var(--milkdown-toolbar-divider);
  background: rgb(255 255 255 / 94%);
  backdrop-filter: blur(14px);
}

.milkdown-editor-root .milkdown .milkdown-link-preview,
.milkdown-editor-root .milkdown .milkdown-link-edit {
  z-index: 30;
  max-width: calc(100% - 24px);
}

.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview,
.milkdown-editor-root .milkdown .milkdown-link-edit > .link-edit {
  box-sizing: border-box;
  max-width: 100%;
}

.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-display {
  min-width: 0;
}

/* ── 链接气泡美化覆写（与桌面端 style.css「链接气泡」那一段对齐）─────────────
   气泡不是自研组件：DOM、图标、以及「左侧槽位点下去就是复制」这件事全在 Crepe 里。
   项目只有三个窄口子能进去：这里的样式覆写、`featureConfigs[LinkTooltip]` 的配置项、
   以及把 `linkTooltipAPI`（addLink / editLink）覆写成自研的编辑浮层。

   三条实现约束：
   ① 「打开 / 复制」是**一个槽位里塞了两个按钮**（Crepe 只给一个 `linkIcon`），
      所以 `.link-icon` 自身必须退化成透明容器，hover 底色只落在里面两个按钮上 ——
      否则整块一起亮，分不清按的是哪个。标记类名的来源见 `LINK_TOOLTIP_ACTIONS_ICON`。
   ② 中间的 URL 文本整条收起（`display: none`）：地址在编辑浮层里有专门的「地址」一行，
      气泡里再挂一条长 URL 既挤又读不全。⚠️ 只隐藏、**不许从 DOM 里删掉** ——
      「打开」按钮靠 `a.link-display.click()` 复用正文链接的分流逻辑。
   ③ `z-index: 30` 是**兜底**：顶栏被项目抬到了 20，而 Crepe 只给气泡 10 —— 链接正好落在
      顶栏下沿一个气泡高之内时，floating-ui 会把气泡放进顶栏那一条带里。

   配色全走变量（暗色块里都已重新赋过值 → 一份规则服务两套主题），**只有投影需要暗色分支**。
   ⚠️ 选择器都带上 `> .link-preview >` 这一整条链：Crepe 自带的同款规则是 4 个类，
   只加 `.milkdown-editor-root` 前缀会打平，得靠这条链多出的一层类稳赢。

   ℹ️ Crepe 自带的编辑气泡（`.milkdown-link-edit`）**已被接管、不会再出现**，这里不再有它的覆写。 */
.milkdown-editor-root .milkdown .milkdown-link-preview { z-index: 30; }
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview {
  height: auto;
  gap: 2px;
  padding: 4px 5px;
  border: 1px solid var(--milkdown-toolbar-divider);
  border-radius: 12px;
  background: var(--crepe-color-surface);
  box-shadow: 0 12px 34px rgb(29 52 83 / 18%), 0 2px 6px rgb(29 52 83 / 8%);
  cursor: default;
}
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon { width: auto; padding: 0; gap: 2px; background: transparent; }
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon:hover { background: transparent; }
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon > .xynote-link-tooltip-actions { display: inline-flex; align-items: center; gap: 2px; }
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon .xynote-link-tooltip-open,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon .xynote-link-tooltip-copy,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-edit-button,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-remove-button {
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 12px;
  cursor: pointer;
  transition: color .16s ease, background .16s ease;
}
/* 「复制 / 编辑 / 删除」是 30px 方块；「打开」带文字标签，宽度自适应。 */
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon .xynote-link-tooltip-copy,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-edit-button,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-remove-button { width: 30px; }
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon .xynote-link-tooltip-open { width: auto; gap: 5px; padding: 0 9px; color: var(--milkdown-toolbar-icon); }
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon .xynote-link-tooltip-open-label { font-size: 13px; font-style: normal; line-height: 1; white-space: nowrap; }
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon svg,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-edit-button > svg,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-remove-button > svg {
  width: 19px;
  height: 19px;
  color: var(--milkdown-toolbar-icon);
  fill: var(--milkdown-toolbar-icon);
}
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon .xynote-link-tooltip-open:hover,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon .xynote-link-tooltip-copy:hover,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-edit-button:hover,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-remove-button:hover {
  background: var(--crepe-color-hover);
  color: var(--crepe-color-primary);
}
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon .xynote-link-tooltip-open:hover svg,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-icon .xynote-link-tooltip-copy:hover svg,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-edit-button:hover > svg,
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-remove-button:hover > svg {
  color: var(--crepe-color-primary);
  fill: var(--crepe-color-primary);
}
/* URL 文本收起：地址改由编辑浮层的「地址」一行承担。
   ⚠️ 只是隐藏，DOM 必须留着 —— 「打开」按钮靠 `a.link-display.click()` 复用分流逻辑。 */
.milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview > .link-display { display: none; }

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-divider {
  background: var(--milkdown-toolbar-divider);
}

.milkdown-editor-root .milkdown .milkdown-table-block th,
.milkdown-editor-root .milkdown .milkdown-table-block td {
  border-color: var(--milkdown-structure-border);
}

.milkdown-editor-root .milkdown .ProseMirror hr {
  background-color: var(--milkdown-structure-border);
}

.milkdown-editor-root .milkdown .milkdown-code-block .cm-activeLineGutter {
  color: inherit;
  background: transparent;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit {
  box-sizing: border-box;
  min-height: 76px;
  margin: 12px 0;
  padding: 12px 16px;
  gap: 12px;
  border: 1px dashed color-mix(in srgb, var(--crepe-color-outline) 42%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--crepe-color-surface) 72%, var(--crepe-color-background));
  transition: border-color 0.18s ease, background 0.18s ease;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit:hover,
.milkdown-editor-root .milkdown .milkdown-image-block .image-edit:focus-within {
  border-color: color-mix(in srgb, var(--crepe-color-primary) 68%, transparent);
  background: color-mix(in srgb, var(--crepe-color-primary) 5%, var(--crepe-color-background));
}

.milkdown-editor-root .milkdown .milkdown-image-block.selected > .image-edit:not(:has(input:focus))::before {
  display: none;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .image-icon {
  display: inline-flex;
  flex: 0 0 38px;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  color: var(--crepe-color-primary);
  background: var(--crepe-color-secondary);
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .image-icon svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 40px;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder {
  gap: 10px;
  background: transparent;
  box-shadow: none;
  user-select: none;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder::before,
.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder::after {
  display: none;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder,
.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder * {
  -webkit-tap-highlight-color: transparent;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder::selection,
.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder *::selection {
  color: inherit;
  background: transparent;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder .uploader {
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--crepe-color-primary);
  background: var(--crepe-color-secondary);
  font-size: 14px;
  font-weight: 650;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer.focus .placeholder .uploader,
.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder .uploader:hover {
  color: var(--crepe-color-on-secondary);
  background: color-mix(in srgb, var(--crepe-color-secondary) 76%, var(--crepe-color-primary));
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder .text {
  margin-left: 0;
  color: color-mix(in srgb, var(--crepe-color-on-background) 48%, transparent);
  background: transparent;
  font-size: 14px;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .link-input-area {
  height: 40px;
  padding: 0 4px;
  background: transparent;
  box-shadow: none;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-outline-toggle {
  flex: 0 0 52px;
}

.markdown-outline-toggle:hover,
.markdown-outline-toggle.active {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
}

.milkdown-editor-shell.is-readonly .milkdown-top-bar .top-bar-heading-selector button:disabled,
.milkdown-editor-shell.is-readonly .milkdown-top-bar .top-bar-item:disabled {
  color: var(--milkdown-toolbar-icon);
  background: transparent;
  box-shadow: none;
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
  transform: none;
}

.milkdown-editor-shell.is-readonly .milkdown-top-bar .top-bar-item:disabled svg {
  color: var(--milkdown-toolbar-icon);
  fill: var(--milkdown-toolbar-icon);
  transform: none;
}

.milkdown-editor-shell.is-toolbar-hidden .markdown-outline {
  top: 0;
}

.milkdown-editor-shell.is-toolbar-hidden .milkdown-top-bar {
  display: none;
}

.milkdown-editor-shell.is-readonly .milkdown-editor-root .milkdown .ProseMirror {
  caret-color: transparent;
}

.milkdown-editor-shell.is-readonly .milkdown-block-handle,
.milkdown-editor-shell.is-readonly .milkdown-table-block .handle,
.milkdown-editor-shell.is-readonly .milkdown-table-block .cell-handle,
.milkdown-editor-shell.is-readonly .milkdown-table-block .line-handle,
.milkdown-editor-shell.is-readonly .milkdown-image-block .image-resize-handle,
.milkdown-editor-shell.is-readonly .milkdown-image-block .operation,
.milkdown-editor-shell.is-readonly .milkdown-image-block .image-edit {
  display: none !important;
}

.milkdown-editor-shell.is-readonly .ProseMirror-selectednode,
.milkdown-editor-shell.is-readonly .milkdown-code-block.selected,
.milkdown-editor-shell.is-readonly .milkdown-image-block.selected {
  outline: none !important;
}

.markdown-outline {
  position: absolute;
  z-index: 5;
  top: 63px;
  right: 15px;
  bottom: 0;
  width: var(--markdown-outline-width);
  padding: 0 16px 24px;
  overflow-y: auto;
  color: var(--markdown-outline-text);
  background: var(--markdown-outline-background);
  border-left: 1px solid var(--markdown-outline-border);
}

.markdown-outline__header {
  position: sticky;
  z-index: 1;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 58px;
  background: var(--markdown-outline-background);
  border-bottom: 1px solid var(--markdown-outline-border);
}

.markdown-outline__header::after {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 42px;
  height: 2px;
  background: var(--markdown-outline-primary);
  content: '';
}

.markdown-outline__header h2 {
  margin: 0;
  color: var(--markdown-outline-primary);
  font-size: 16px;
  font-weight: 700;
}

.markdown-outline__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: var(--markdown-outline-text);
  background: transparent;
  cursor: pointer;
}

.markdown-outline__close:hover {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
}

.markdown-outline__empty {
  margin: 28px 0;
  color: var(--markdown-outline-text);
  font-size: 13px;
  text-align: center;
}

.markdown-outline__list {
  display: grid;
  gap: 3px;
  padding-top: 18px;
}

.markdown-outline-item {
  width: 100%;
  padding: 7px 8px 7px calc(8px + (var(--outline-level) - 1) * 14px);
  overflow: hidden;
  border: 0;
  border-radius: 6px;
  color: var(--markdown-outline-text);
  background: transparent;
  font: inherit;
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.markdown-outline-item:hover {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
}

.markdown-outline-item.is-active {
  color: var(--markdown-outline-primary);
  font-weight: 650;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-inner {
  flex-wrap: nowrap;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-selector {
  flex: 0 0 92px;
  width: 92px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-button {
  width: 80px;
  padding-right: 4px;
  padding-left: 6px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-label {
  flex: 0 0 56px;
  width: 56px;
  min-width: 0;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-button .top-bar-chevron {
  width: 14px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-dropdown {
  width: 120px;
  min-width: 120px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-option {
  width: 112px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-actions {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: visible;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item {
  flex-direction: column;
  gap: 2px;
  width: 52px;
  height: 56px;
  margin: 3px 1px;
  padding: 4px 3px;
  color: var(--milkdown-toolbar-icon);
  font-size: 11px;
  line-height: 14px;
  white-space: nowrap;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item::after {
  content: attr(data-label);
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu {
  position: relative;
  flex: 0 0 52px;
  width: 52px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu__toggle {
  width: 50px;
}

/* ↓ 正文字号下拉。容器同时带 `markdown-toolbar-menu` 类（复用收合逻辑），但外观要独立：
   它是横向的「数值 + 箭头」，与竖排的通用 `.top-bar-item` 不同。
   ⚠️ 下面这一组全部带 `.milkdown-editor-shell` 前缀，是为了压过文件末尾那批
   「紧凑工具栏」规则（`.milkdown-editor-shell … .top-bar-item`，同为高特异性且声明更靠后），
   否则会被还原成竖排 + 各档内边距。 */
.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .markdown-font-size-menu {
  position: relative;
  flex: 0 0 auto;
  width: auto;
  margin-right: 3px;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .markdown-font-size-menu > .markdown-font-size-menu__toggle {
  flex: 0 0 auto;
  flex-direction: row;
  gap: 2px;
  width: auto;
  min-width: 50px;
  height: 34px;
  padding: 0 5px 0 9px;
  color: var(--milkdown-toolbar-icon);
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .markdown-font-size-menu > .markdown-font-size-menu__toggle::after {
  content: none;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .markdown-font-size-menu > .markdown-font-size-menu__toggle .markdown-font-size-menu__value {
  min-width: 18px;
  color: inherit;
  font-size: 12px;
  font-weight: 650;
  line-height: 1;
  text-align: center;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .markdown-font-size-menu > .markdown-font-size-menu__toggle .markdown-font-size-menu__chevron {
  display: inline-flex;
  flex: 0 0 15px;
  width: 15px;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .markdown-font-size-menu > .markdown-font-size-menu__toggle .markdown-font-size-menu__chevron svg {
  width: 15px;
  height: 15px;
  color: currentColor;
  fill: currentColor;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .markdown-font-size-menu.is-open > .markdown-font-size-menu__toggle {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
}

.markdown-font-size-menu__panel {
  position: absolute;
  z-index: 30;
  top: calc(100% + 5px);
  left: 0;
  display: none;
  gap: 3px;
  min-width: 88px;
  max-height: min(320px, 56vh);
  padding: 6px;
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--markdown-outline-border) 86%, transparent);
  border-radius: 11px;
  background: color-mix(in srgb, var(--markdown-outline-background) 96%, transparent);
  box-shadow: 0 18px 44px rgb(15 23 42 / 16%);
  backdrop-filter: blur(16px);
}

.markdown-font-size-menu.is-open .markdown-font-size-menu__panel {
  display: grid;
}

/* 选中气泡里那份字号面板：气泡每次选区变化都重渲染，面板插不进去，只能 portal 到 body。
   定位（left/top）由 toggleBubbleFontSizePanel() 写成内联样式，这里只负责「显形 + 抬层」。 */
.markdown-font-size-menu__panel.is-portal-open {
  position: fixed;
  z-index: 140;
  display: grid;
  gap: 3px;
}

/* ── 选中气泡（Crepe 的 Feature.Toolbar，不是自研组件）─────────────────────────────
   Crepe 默认给的是 8px 圆角 + 32px 方块按钮 + 24px 图标 + 24px 高分隔线，跟本应用的
   顶栏（11px 圆角菜单、34px 控件、21px 图标）不在一个语系里。这里整体对齐顶栏：
   12px 圆角、1px 描边、分层投影、19px 图标、hover / active 走强调色。

   配色全走变量，**只有投影需要暗色分支**：--crepe-color-hover / -selected / -primary
   与 --milkdown-toolbar-divider 在 html.dark 块里都已重新赋过值，会自动跟随。

   ⚠️ `z-index: 30` 是**兜底**：顶栏是 sticky 且 z-index 20（同文件上方），而 Crepe 给
   气泡的只有 10 → 气泡会被顶栏画在上面。气泡自己那份字号下拉是 140
   （见上方 .is-portal-open），气泡本体跟着抬到同一量级才自洽。 */
.milkdown-editor-root .milkdown .milkdown-toolbar {
  z-index: 30;
  padding: 4px 5px;
  border: 1px solid var(--milkdown-toolbar-divider);
  border-radius: 12px;
  background: var(--crepe-color-surface);
  box-shadow: 0 12px 32px rgb(15 23 42 / 16%), 0 2px 6px rgb(15 23 42 / 8%);
}

.milkdown-editor-root .milkdown .milkdown-toolbar .toolbar-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin: 3px;
  padding: 0;
  border-radius: 8px;
  transition: color 0.16s ease, background 0.16s ease;
}

.milkdown-editor-root .milkdown .milkdown-toolbar .toolbar-item svg {
  width: 19px;
  height: 19px;
}

.milkdown-editor-root .milkdown .milkdown-toolbar .toolbar-item:hover {
  background: var(--crepe-color-hover);
}

.milkdown-editor-root .milkdown .milkdown-toolbar .toolbar-item:hover svg {
  color: var(--crepe-color-primary);
  fill: var(--crepe-color-primary);
}

.milkdown-editor-root .milkdown .milkdown-toolbar .toolbar-item.active {
  background: var(--crepe-color-selected);
}

.milkdown-editor-root .milkdown .milkdown-toolbar .toolbar-item.active svg {
  color: var(--crepe-color-primary);
  fill: var(--crepe-color-primary);
}

.milkdown-editor-root .milkdown .milkdown-toolbar .divider {
  height: 18px;
  margin: 0 5px;
  background: var(--milkdown-toolbar-divider);
}

/* 气泡里「字号」触发器是图标 + 小箭头两个 svg。Crepe 的 Toolbar 组件给每个项渲染的是
   属性写死的 button.toolbar-item（挂不了 class），所以靠图标里的标记 span 用 :has()
   反选到按钮本身，把固定 30px 宽度放开到装得下箭头。
   ⚠️ 这个 span 同时是 JS 里反查按钮的锚点（见 findBubbleFontSizeTrigger()），删掉两处一起坏。 */
.milkdown-editor-root .milkdown .milkdown-toolbar .toolbar-item:has(.xynote-fs-trigger) {
  width: auto;
  min-width: 30px;
  padding: 0 4px 0 6px;
}

.milkdown-editor-root .milkdown .milkdown-toolbar .xynote-fs-trigger {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.milkdown-editor-root .milkdown .milkdown-toolbar .toolbar-item svg.xynote-fs-caret {
  width: 13px;
  height: 13px;
}

html.dark .milkdown-editor-root .milkdown .milkdown-toolbar {
  box-shadow: 0 12px 34px rgb(0 0 0 / 46%), 0 2px 6px rgb(0 0 0 / 28%);
}

.markdown-font-size-menu__item {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 30px;
  padding: 0 26px 0 11px;
  border: 0;
  border-radius: 8px;
  color: var(--milkdown-toolbar-icon);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.16s ease, background 0.16s ease;
}

.markdown-font-size-menu__item:hover,
.markdown-font-size-menu__item:focus-visible {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
}

.markdown-font-size-menu__item.active {
  color: var(--markdown-outline-primary);
  background: color-mix(in srgb, var(--markdown-outline-primary) 12%, transparent);
}

/* 选中项右侧打勾，与钉钉字号下拉一致。 */
.markdown-font-size-menu__item.active::after {
  position: absolute;
  right: 9px;
  font-size: 12px;
  font-weight: 700;
  content: '✓';
}

.markdown-font-size-menu__item:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu__panel {
  position: absolute;
  z-index: 30;
  top: calc(100% - 2px);
  left: 0;
  display: none;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 300px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--markdown-outline-border) 86%, transparent);
  border-radius: 11px;
  background: color-mix(in srgb, var(--markdown-outline-background) 96%, transparent);
  box-shadow: 0 18px 44px rgb(15 23 42 / 16%);
  backdrop-filter: blur(16px);
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu.is-open .markdown-toolbar-menu__panel {
  display: grid;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu.is-open .markdown-toolbar-menu__toggle {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu__item {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  gap: 9px;
  align-items: center;
  justify-content: flex-start;
  width: 136px;
  height: 40px;
  margin: 0;
  padding: 0 11px;
  border: 0;
  border-radius: 8px;
  color: var(--milkdown-toolbar-icon);
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu__item::after {
  content: attr(data-label);
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu__item svg {
  flex: 0 0 19px;
  width: 19px;
  height: 19px;
  color: currentColor;
  fill: currentColor;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu__item:hover,
.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu__item:focus-visible,
.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu__item.active {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
  transform: translateY(-1px);
}

.milkdown-editor-root .milkdown .milkdown-top-bar .markdown-toolbar-menu__item:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  transform: none;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item svg {
  width: 21px;
  height: 21px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item svg,
.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-chevron svg {
  color: var(--milkdown-toolbar-icon);
  fill: var(--milkdown-toolbar-icon);
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item:hover svg,
.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item.active svg {
  color: var(--crepe-color-primary);
  fill: var(--crepe-color-primary);
}

/* 夜间配色的**唯一真源**（本组件样式非 scoped，笔记页与文章页共用）。
 *
 * 页面底一律 $dark-main-color（#1d1e1f），编辑器作为抬升表面用 $dark-surface-color
 * （#24262b），比它再高一层/选中态用 $dark-hover-color（#2e2e2e）—— 与顶栏、卡片、
 * 页脚同一套中性灰。原先这里是海军蓝一族（壳 #171b2d / surface #20263a /
 * secondary #263f68 …），与页面框架的中性灰撞色，整站两套色系。
 *
 * 蓝只保留在**强调色**上：--crepe-color-primary、--markdown-outline-primary、
 * --crepe-color-selected（以及 paired 的 secondary），那是链接 / 选中文字 / 图标的
 * 语义色，不是背景。
 *
 * ⚠️ 「中性灰」只管**面**（页面底 / 卡片 / 壳 / 输入区），交互反馈态不在此列：
 * ① --crepe-color-selected 必须是与背景拉得开的强调色。Crepe 拿它同时做正文
 *    ::selection 底色（reset.css）+ 气泡按钮 :active + 表格行列选中 + 顶栏与块选中；
 *    一旦并入 #2e2e2e，选区相对壳底 #24262b 的对比度只剩 1.11:1，肉眼看不出选中
 *    范围（桌面端同变量为 #294c72，1.82:1）。
 * ② --crepe-color-hover 不许等于 --crepe-color-surface，否则气泡 / 链接气泡 / 表格行 /
 *    代码块语言选择器的 hover 全无反馈。
 *
 * ⚠️ 文章编辑页不要再写一套覆盖去压这里 —— 两端要的就是同一套灰。 */
html.dark .milkdown-editor-shell {
  --markdown-outline-background: #24262b;
  --markdown-outline-border: #2e2e2e;
  --markdown-outline-hover: #2e2e2e;
  --markdown-outline-primary: #8ab8ff;
  --markdown-outline-text: #b2bdd6;

  color: #e7ebf5;
  background: #24262b;
  border-color: #2e2e2e;
  box-shadow: none;
}

html.dark .milkdown-editor-root .milkdown {
  --crepe-color-background: #24262b;
  --crepe-color-on-background: #e7ebf5;
  --crepe-color-surface: #2e2e2e;
  --crepe-color-surface-low: #2e2e2e;
  --crepe-color-on-surface: #e7ebf5;
  --crepe-color-on-surface-variant: #b2bdd6;
  --crepe-color-outline: #94a3b8;
  --crepe-color-primary: #8ab8ff;
  --crepe-color-secondary: #263f68;
  --crepe-color-on-secondary: #dbeafe;
  --crepe-color-hover: #454545;
  --crepe-color-selected: #30456f;
  --crepe-color-inline-area: #2e2e2e;
  --milkdown-structure-border: #63708c;
  --milkdown-toolbar-divider: #526079;
  --milkdown-toolbar-icon: #c4cce0;
}

/* 链接气泡在暗色下只需重写投影（其余配色由上面重新赋过值的变量自动跟随）。 */
html.dark .milkdown-editor-root .milkdown .milkdown-link-preview > .link-preview {
  box-shadow: 0 14px 38px rgb(0 0 0 / 46%), 0 2px 6px rgb(0 0 0 / 3%);
}

@media (max-width: 1399px) {
  /* 正文让位的规则统一在 has-outline 那处处理（原先这里的覆盖会让窄屏退回
     「正文居中 + 被大纲压住」——1280px 下压住 99px），这里只留大纲的浮层投影。 */
  .markdown-outline {
    box-shadow: -16px 0 32px rgb(15 23 42 / 12%);
  }
}

@media (max-width: 767px) {
  .milkdown-editor-shell {
    min-height: calc(100vh - 250px);
    border-radius: 10px;
  }

  .milkdown-editor-root .milkdown .ProseMirror {
    width: 100%;
    min-height: calc(100vh - 310px);
    padding: 22px 18px 56px;
  }

  .markdown-outline {
    top: 63px;
    width: min(280px, calc(100% - 28px));
  }
}

/* 大纲面板顶部跟随工具栏高度：工具栏已统一为 48px（见下方顶部栏规则），
   两种页面共用同一 top，避免文章页工具栏变矮后面板顶上留缝。 */
.milkdown-editor-shell .markdown-outline {
  top: 48px;
}

/* ↓ 以下为**笔记页专属**外观（shell 去边框、大纲面板透明），文章页不适用。 */
.note-milkdown-editor.milkdown-editor-shell {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.note-milkdown-editor .milkdown {
  background: transparent;
}

.note-milkdown-editor .markdown-outline {
  background: transparent;
  border-left: 0;
  box-shadow: none;
}

.note-milkdown-editor .markdown-outline__header {
  background: transparent;
}

/* ⚠️ 紧凑工具栏：以下规则**两种页面共用**（笔记页 / 文章页），故用 `.milkdown-editor-shell`
   前缀而不是 `.note-milkdown-editor` 专属前缀 —— 文章页原先吃默认工具栏样式
   （按钮 56px、gap 2px、无圆角），观感比笔记页松一大圈。数值以笔记页为准。 */
.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar {
  height: 48px;
  min-height: 48px;
  border-color: color-mix(in srgb, var(--milkdown-toolbar-divider) 72%, transparent);
  background: color-mix(in srgb, var(--markdown-outline-background) 95%, transparent);
  box-shadow: 0 5px 16px rgb(15 23 42 / 3%);
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-inner {
  height: 47px;
  padding: 0 3px;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-actions {
  scrollbar-width: none;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-actions::-webkit-scrollbar {
  display: none;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item {
  gap: 0;
  height: 42px;
  margin: 2px 1px;
  padding: 2px 3px;
  border-radius: 7px;
  font-size: 10px;
  line-height: 12px;
  transition: color 0.16s ease, background 0.16s ease, box-shadow 0.18s ease,
    transform 0.18s ease;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item svg {
  width: 18px;
  height: 18px;
  transition: color 0.16s ease, fill 0.16s ease, transform 0.18s ease;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item:hover,
.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item:focus-visible,
.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item.active {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
  box-shadow: 0 4px 12px rgb(47 128 237 / 8%);
  transform: translateY(-1px);
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item:hover svg,
.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item:focus-visible svg,
.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item.active svg {
  transform: scale(1.05);
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-button {
  height: 34px;
  border-radius: 7px;
  transition: color 0.16s ease, background 0.16s ease;
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-button:hover,
.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-button:focus-visible {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
}

.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-divider {
  height: 22px;
  margin: 0 3px;
  opacity: 0.68;
}

.note-milkdown-editor .markdown-outline {
  padding: 0 14px 22px;
  scrollbar-color: color-mix(in srgb, var(--markdown-outline-text) 28%, transparent) transparent;
  scrollbar-width: thin;
}

.note-milkdown-editor .markdown-outline__header {
  height: 48px;
  background: color-mix(in srgb, var(--markdown-outline-background) 95%, transparent);
  backdrop-filter: blur(12px);
}

.note-milkdown-editor .markdown-outline__header::after {
  width: 34px;
  height: 2px;
  border-radius: 2px;
}

.note-milkdown-editor .markdown-outline__close {
  border-radius: 7px;
  background: color-mix(in srgb, var(--markdown-outline-text) 5%, transparent);
  transition: color 0.16s ease, background 0.16s ease, transform 0.18s ease;
}

.note-milkdown-editor .markdown-outline__close:hover,
.note-milkdown-editor .markdown-outline__close:focus-visible {
  transform: rotate(90deg);
}

.note-milkdown-editor .markdown-outline__list {
  gap: 4px;
  padding-top: 12px;
}

.note-milkdown-editor .markdown-outline-item {
  position: relative;
  min-height: 34px;
  border-radius: 7px;
  transition: color 0.16s ease, background 0.16s ease, box-shadow 0.18s ease;
}

.note-milkdown-editor .markdown-outline-item:hover,
.note-milkdown-editor .markdown-outline-item:focus-visible {
  box-shadow: 0 4px 12px rgb(47 128 237 / 7%);
}

.note-milkdown-editor .markdown-outline-item.is-active {
  background: color-mix(in srgb, var(--markdown-outline-primary) 9%, transparent);
}

.note-milkdown-editor .markdown-outline-item.is-active::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--markdown-outline-primary);
  content: '';
}

.note-milkdown-editor .milkdown-editor-root .milkdown .ProseMirror {
  padding-top: 10px;
}

@media (prefers-reduced-motion: reduce) {
  .note-milkdown-editor *,
  .note-milkdown-editor *::before,
  .note-milkdown-editor *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/*
  兜底：Crepe 行内公式编辑气泡里的**内层编辑器**复位成「普通一行输入框」。

  上面主编辑器那几条规则是「视口级」尺寸，气泡内嵌的是**第二个 EditorView**，
  一旦漏进去就是一个 221×503 的大空框（见文件上半部分 `>` 那条注释）。
  这里不逐个把主编辑器规则改成 `>`，而是用一条更高特异性的规则压住：
  ⚠️ 写成 **5 层类名**且**放在样式表最末** —— `.milkdown-editor-shell.has-outline …`（同为 5 层）
  与 `.note-milkdown-editor …`（4 层）都会漏进内层，靠「层数不低于它 + 更靠后」压住；
  将来再加主编辑器规则也不用回头改。桌面端 `src/style.css` 有同款兜底（4 层）。
*/
.milkdown-editor-shell .milkdown-editor-root .milkdown .milkdown-latex-inline-edit .ProseMirror {
  width: auto;
  min-height: 0;
  margin: 0;
  padding: 0;
}

/*
  行内公式气泡要和顶栏**同一层比高下**。

  顶栏（`.milkdown-top-bar`）是 sticky + `z-index: 20` + 95% 白底 + `blur()`（见文件上半部分），
  而 Crepe 没给行内公式气泡任何 z-index（`auto`）→ 公式落在页面靠上时，floating-ui 会把气泡
  放进顶栏那一条带里，气泡被顶栏糊住，看上去就是「弹窗和顶栏左侧的按钮叠在一起」。
  链接气泡、选中气泡早就有同款兜底（`.milkdown-link-preview` / `.milkdown-toolbar` 都是 30），
  这里补齐最后一块 —— 三者同在 `div.milkdown` 这个 stacking context 里，30 > 20 必然置顶。
*/
.milkdown-editor-root .milkdown .milkdown-latex-inline-edit {
  z-index: 30;
}

/*
  气泡打开时块手柄让位。

  窄窗口下正文左内边距只有 18px（`@media (max-width: 767px)`），而块手柄本身就有 66px 宽
  （两个 32px 按钮 + 2px 间隙），两者都往正文左侧挤 —— 叠在一起分不清谁是谁。
  编辑公式时也用不到块手柄，直接隐掉；`opacity + pointer-events` 与 Crepe 自己收起手柄时的
  `[data-show='false']` 写法一致，不触发重排。
*/
.milkdown-editor-shell .milkdown-editor-root .milkdown:has(.milkdown-latex-inline-edit[data-show='true']) .milkdown-block-handle {
  opacity: 0;
  pointer-events: none;
}
</style>
