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
    <div ref="editorScrollRef" class="milkdown-editor-scroll" @scroll.passive="updateActiveOutline">
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
import { linkSchema, paragraphSchema } from '@milkdown/kit/preset/commonmark'
import { TextSelection } from '@milkdown/kit/prose/state'
import { replaceAll } from '@milkdown/kit/utils'
import { h, nextTick, onBeforeUnmount, onMounted, ref, render, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'

import ossApi from '@/api/oss-api'
import { UploadFileTypeEnum } from '@/enums'
import {
  DEFAULT_BODY_FONT_SIZE,
  FONT_SCALE_STEPS,
  isBlankText,
  isDefaultFontSize
} from '@/utils/inline-font-size'
import { extractMarkdownOutline, type MarkdownOutlineItem } from '@/utils/markdown-outline'
import { dispatchOpenNote, resolveNoteIdFromHref } from '@/utils/note-open-events'
import { uploadFile } from '@/utils/oss-upload'
import { installXynoteEmbedFeature } from './xynote-embed'
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
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  readonly: false,
  showToolbar: true,
  showOutline: true,
  title: ''
})

const router = useRouter()
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

  const requiresModifier = !props.readonly
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
  closeToolbarMenus()
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
      closeToolbarMenus()
    })
    // 见上方说明：pointerdown 被 preventDefault 后浏览器仍可能补一个 click，
    // 它冒泡到 document 会被 closeToolbarMenus 捕获，把刚关掉的面板状态打乱。
    option.addEventListener('click', (event) => event.stopPropagation())
    panel.append(option)
  })
  return panel
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
 * 切换当前选区的行内公式格式。
 *
 * :return: 无返回值。
 */
function toggleInlineFormula(): void {
  editor?.editor.action((ctx) => ctx.get(commandsCtx).call('ToggleLatex'))
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
        }
      },
      [Crepe.Feature.LinkTooltip]: {
        inputPlaceholder: '粘贴链接地址…'
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

onMounted(() => {
  outlineOpen.value = props.showOutline && localStorage.getItem(OUTLINE_STORAGE_KEY) !== 'false'
  editorRootRef.value?.addEventListener('click', handleEditorLinkClick, true)
  editorRootRef.value?.addEventListener('paste', handleEditorLinkPaste, true)
  void createEditor()
})

onBeforeUnmount(() => {
  destroyed = true
  editorRootRef.value?.removeEventListener('click', handleEditorLinkClick, true)
  editorRootRef.value?.removeEventListener('paste', handleEditorLinkPaste, true)
  if (toolbarEventsBound) {
    document.removeEventListener('click', closeToolbarMenus)
    document.removeEventListener('keydown', handleEditorDocumentKeydown)
    toolbarEventsBound = false
  }
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

.milkdown-editor-root .milkdown .ProseMirror {
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
</style>
