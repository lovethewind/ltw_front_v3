<script setup lang="ts">
/**
 * 笔记正文的**源码模式编辑器**（CodeMirror 6）。
 *
 * ## 为什么需要它
 *
 * Crepe（富文本）把正文解析成 AST 再重新序列化，有些写法会被它「顺平」：
 * 表格列宽被重排、行内 `*` 被转义、刻意对齐的空格被吃掉。网页端没有「外部 md 文件」，
 * 但笔记正文同样走这条往返链路 —— 手写或粘贴来的复杂 Markdown 需要一个
 * **逐字符保真**的编辑入口，这就是本组件：直接编辑原文，不做任何解析改写。
 *
 * ## 与桌面端的差异（有意为之，不是遗漏）
 *
 * 桌面端 `MarkdownSourceEditor.vue` 服务于**磁盘上的外部文件**，因此额外带了：
 * 磁盘路径、`xinyue-asset:` 本地图片协议解析、预览图片工具条 / 全屏查看器、
 * 嵌入卡片标题回查（`props.allNotes`）。这些在网页端都没有对应物，**不移植**。
 *
 * 桌面端的**大纲侧栏**也不移植：网页端富文本模式本来就有一套完整大纲
 * （`.markdown-outline`），源码模式的定位是「临时修正原文」，再挂一套是重复。
 *
 * 「源码 / 预览」的切换也**不在这里** —— 预览已上提为编辑器的顶层档位
 * （`NoteEditor.vue` 的「富文本 / 预览 / 源码」），渲染见 `NoteMarkdownPreview.vue`。
 * 本组件因此只负责一件事：编辑原文。
 *
 * ## 交互契约
 *
 * 组件自身不落库，只回传正文：`emit('change', value)`；父级链路见 `NoteEditor.vue`。
 */
import { Icon } from '@iconify/vue'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { Compartment, EditorState, StateEffect, StateField, Transaction } from '@codemirror/state'
import {
  Decoration,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  type Command
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  collectFindMatches,
  isTableRowLine,
  normalizeFindIndex,
  type SourceFindMatch,
  type SourceFindResult
} from '@/utils/note-source-find'

interface Props {
  /** Markdown 原文（与富文本模式共用同一份内容）。 */
  value?: string
  /** 只读视图（回收站 / 历史版本预览等场景）。 */
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), { value: '', readonly: false })
const emit = defineEmits<{
  (event: 'change', value: string): void
}>()

/** 一次查找的全部匹配与当前聚焦项。 */
interface FindMatches {
  matches: SourceFindMatch[]
  active: number
}

const container = ref<HTMLElement | null>(null)
let view: EditorView | null = null

/**
 * 只读 / 可编辑的插槽。
 *
 * ⚠️ 必须用 `Compartment` 承载：`EditorView.editable` 与 `EditorState.readOnly` 都是 Facet，
 * 想在运行时切换只能靠 compartment 重配置。直接重新创建 state 会连光标、选区、撤销栈一起丢掉。
 */
const editableCompartment = new Compartment()

/**
 * 只读相关的 facet 组合。
 *
 * :param readonly: 是否只读。
 * :return: 两个 facet 的数组（交给 compartment 装载 / 重配置）。
 */
function editableExtensions(readonly: boolean) {
  return [EditorState.readOnly.of(readonly), EditorView.editable.of(!readonly)]
}

const setFindMatches = StateEffect.define<FindMatches | null>()

/** 查找高亮：全部匹配用淡色，当前项用强调色。 */
const findField = StateField.define<FindMatches | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setFindMatches)) return effect.value
    }
    // 正文一变旧的位置就失效了，直接清空而不是留下错位的高亮。
    return transaction.docChanged ? null : value
  },
  provide: (field) =>
    EditorView.decorations.from(field, (value) => {
      if (!value?.matches.length) return Decoration.none
      return Decoration.set(
        value.matches.map((match, index) =>
          Decoration.mark({
            class: index === value.active ? 'cm-source-find-active' : 'cm-source-find'
          }).range(match.from, match.to)
        ),
        true
      )
    })
})

/**
 * 编辑器外观。颜色全部走 CSS 变量（定义在本组件根节点上），
 * 明暗主题由变量覆盖决定，组件因此不需要在主题切换时重建编辑器。
 */
const sourceTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--source-editor-bg)',
    color: 'var(--source-editor-text)',
    fontSize: '13px'
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
    lineHeight: '1.8'
  },
  '.cm-content': { padding: '18px 0 80px', caretColor: 'var(--source-editor-caret)' },
  '.cm-line': { padding: '0 22px' },
  '.cm-gutters': {
    border: '0',
    borderRight: '1px solid var(--source-editor-border)',
    backgroundColor: 'var(--source-editor-surface)',
    color: 'var(--source-editor-gutter-text)'
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 14px' },
  '.cm-activeLine': { backgroundColor: 'var(--source-editor-active-line)' },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--source-editor-active-line)',
    color: 'var(--source-editor-text)'
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--source-editor-caret)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    {
      backgroundColor: 'var(--source-editor-selection)'
    },
  '.cm-source-find': { backgroundColor: 'var(--source-editor-find)' },
  '.cm-source-find-active': { backgroundColor: 'var(--source-editor-find-active)' }
})

/** Markdown 语法着色。`###`、`|` 这类标记用弱色，正文用主色。 */
const sourceHighlight = HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--source-editor-heading)', fontWeight: '700', fontSize: '1.3em' },
  { tag: tags.heading2, color: 'var(--source-editor-heading)', fontWeight: '700', fontSize: '1.18em' },
  { tag: tags.heading3, color: 'var(--source-editor-heading)', fontWeight: '700', fontSize: '1.08em' },
  {
    tag: [tags.heading4, tags.heading5, tags.heading6],
    color: 'var(--source-editor-heading)',
    fontWeight: '700'
  },
  { tag: tags.strong, fontWeight: '700', color: 'var(--source-editor-strong)' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: [tags.link, tags.url], color: 'var(--source-editor-link)' },
  { tag: tags.monospace, color: 'var(--source-editor-code)' },
  { tag: tags.quote, color: 'var(--source-editor-quote)' },
  { tag: tags.list, color: 'var(--source-editor-marker)' },
  // 标记符号（#、>、-、表格竖线、分隔线）统一弱化，避免与正文抢注意力。
  {
    tag: [tags.processingInstruction, tags.contentSeparator, tags.labelName],
    color: 'var(--source-editor-marker)'
  }
])

/** 正文统计（摆在桌面端模式条上「大纲开关」的位置）。 */
const lineCount = computed(() => props.value.split('\n').length)
const charCount = computed(() => props.value.length)

/**
 * 在光标处插入 `<br>`。
 *
 * 表格行按物理行切分，单元格内不存在「行尾」概念 —— 想在一格里换行，只有写 `<br>` 一条路
 * （行尾两空格、直接回车都会把表格拆成两行）。所以这一行里给 `Shift+Enter` 一个专用语义。
 *
 * 只在表格行内接管，其余位置返回 false 交回默认行为 —— 普通段落里 `Shift+Enter`
 * 仍是换行（CommonMark 里那也是硬换行，用户不会觉得别扭）。
 */
const insertHardBreak: Command = (target) => {
  const line = target.state.doc.lineAt(target.state.selection.main.head)
  if (!isTableRowLine(line.text)) return false
  const position = target.state.selection.main.head
  target.dispatch(
    target.state.update({
      changes: { from: position, insert: '<br>' },
      selection: { anchor: position + 4 },
      scrollIntoView: true,
      userEvent: 'input'
    })
  )
  return true
}

/**
 * 按正文内容创建一个全新的编辑器状态（含独立的撤销栈）。
 *
 * :param doc: 初始正文。
 * :return: 编辑器状态。
 */
function createState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      syntaxHighlighting(sourceHighlight),
      // 用 GFM 而非默认的 CommonMark：笔记里表格、任务列表、删除线很常见，
      // CommonMark 下它们不进语法树，表格会整段退化成纯文本、连竖线都不着色。
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      EditorState.tabSize.of(2),
      EditorView.contentAttributes.of({ 'aria-label': '笔记源码', spellcheck: 'false' }),
      editableCompartment.of(editableExtensions(props.readonly)),
      // 放在 defaultKeymap 之前：Shift+Enter 默认是换行，这里在表格行内抢先接管。
      keymap.of([
        { key: 'Shift-Enter', run: insertHardBreak },
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab
      ]),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return
        emit('change', update.state.doc.toString())
      }),
      findField,
      sourceTheme
    ]
  })
}

/**
 * 在正文中查找并选中指定匹配项。
 *
 * 供父级接入「笔记内查找」面板使用，能力集与桌面端 `defineExpose` 一致。
 *
 * :param keyword: 查找关键词。
 * :param requestedIndex: 希望定位的匹配索引，可超出范围以支持循环。
 * :return: 实际匹配数量和当前索引。
 */
function findText(keyword: string, requestedIndex: number): SourceFindResult {
  if (!view) return { count: 0, index: -1 }
  const matches = collectFindMatches(view.state.doc.toString(), keyword.trim())
  if (!matches.length) {
    view.dispatch({ effects: setFindMatches.of(null) })
    return { count: 0, index: -1 }
  }
  const index = normalizeFindIndex(requestedIndex, matches.length)
  const match = matches[index]
  view.dispatch({
    effects: setFindMatches.of({ matches, active: index }),
    selection: { anchor: match.from, head: match.to },
    scrollIntoView: true
  })
  return { count: matches.length, index }
}

/**
 * 清除查找高亮。
 *
 * :return: 无返回值。
 */
function clearFindHighlight(): void {
  view?.dispatch({ effects: setFindMatches.of(null) })
}

/**
 * 当前可见区域的滚动位置，供「切换标签时记住阅读位置」类逻辑复用。
 *
 * :return: 滚动位置（px）。
 */
function getScrollTop(): number {
  return view?.scrollDOM.scrollTop ?? 0
}

/**
 * 把焦点交回编辑器（切换模式后接管键盘）。
 *
 * :return: 无返回值。
 */
function focus(): void {
  view?.focus()
}

defineExpose({ findText, clearFindHighlight, getScrollTop, focus })

onMounted(() => {
  if (!container.value) return
  view = new EditorView({ state: createState(props.value), parent: container.value })
})

onBeforeUnmount(() => {
  if (view) {
    // 每次输入都已经回传，这里只是兜底：万一有尚未上抛的字，切换时不能丢。
    const latest = view.state.doc.toString()
    if (latest !== props.value) emit('change', latest)
    view.destroy()
    view = null
  }
})

watch(
  () => props.value,
  (value) => {
    if (!view) return
    const current = view.state.doc.toString()
    if (value === current) return
    // 外部替换正文（切换笔记、富文本模式改过）不进撤销栈，
    // 否则用户按撤销会跳回另一份内容。
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      annotations: Transaction.addToHistory.of(false)
    })
  }
)

watch(
  () => props.readonly,
  (readonly) => {
    // 走 compartment 重配置，保住光标、选区与撤销栈。
    view?.dispatch({ effects: editableCompartment.reconfigure(editableExtensions(readonly)) })
  }
)
</script>

<template>
  <section class="note-source-editor">
    <header class="note-source-editor__bar">
      <Icon icon="material-symbols:code" />
      <span class="note-source-editor__mode">源码模式</span>
      <span class="note-source-editor__hint">直接编辑原文，保存时原样写回</span>
      <span class="note-source-editor__stats">{{ lineCount }} 行 · {{ charCount }} 字</span>
    </header>
    <div class="note-source-editor__body">
      <!--
        编辑器常驻、不随模式卸载：销毁会连光标、选区与撤销栈一起丢掉。
        「预览」不在这里 —— 它已上提为编辑器的顶层档位，见 NoteEditor.vue / NoteMarkdownPreview.vue。
      -->
      <div ref="container" class="note-source-editor__code"></div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.note-source-editor {
  --source-editor-bg: transparent;
  --source-editor-surface: rgb(15 23 42 / 3%);
  --source-editor-border: var(--markdown-outline-border, #e2e8f2);
  --source-editor-text: #253952;
  --source-editor-muted: #6b7d99;
  --source-editor-faint: #9aa8bd;
  --source-editor-caret: var(--markdown-outline-primary, #2f80ed);
  --source-editor-active-line: rgb(47 128 237 / 6%);
  --source-editor-selection: rgb(47 128 237 / 18%);
  --source-editor-heading: #1f2d3d;
  --source-editor-strong: #1f2d3d;
  --source-editor-link: #2f80ed;
  --source-editor-code: #b15928;
  --source-editor-quote: #6b7d99;
  --source-editor-marker: #9aa8bd;
  --source-editor-find: rgb(255 196 0 / 32%);
  --source-editor-find-active: rgb(255 140 0 / 46%);

  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background: var(--source-editor-bg);
}

.note-source-editor__bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 12px;
  border-bottom: 1px solid var(--source-editor-border);
  color: var(--source-editor-muted);

  svg {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
  }
}

.note-source-editor__mode {
  flex: 0 0 auto;
  color: var(--source-editor-text);
  font-size: 12px;
  font-weight: 650;
}

.note-source-editor__hint {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-source-editor__stats {
  flex: 0 0 auto;
  color: var(--source-editor-faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.note-source-editor__body {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
}

.note-source-editor__code {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

/* 预览排版已随组件搬到 NoteMarkdownPreview.vue（顶层「预览」档）。 */

/*
  暗色主题：只覆盖 CSS 变量即可 —— 上面的 CodeMirror 主题与预览排版全部走变量，
  所以这里不需要第二份规则（这也是把它们写成变量的原因）。
*/
html.dark .note-source-editor {
  --source-editor-surface: rgb(255 255 255 / 6%);
  --source-editor-text: #d9e5f5;
  --source-editor-muted: #92a4ba;
  --source-editor-faint: #6b7d99;
  --source-editor-caret: #79aff3;
  --source-editor-active-line: rgb(121 175 243 / 10%);
  --source-editor-selection: rgb(121 175 243 / 22%);
  --source-editor-heading: #eef5ff;
  --source-editor-strong: #eef5ff;
  --source-editor-link: #79aff3;
  --source-editor-code: #e0a06a;
  --source-editor-quote: #92a4ba;
  --source-editor-marker: #6b7d99;
}
</style>
