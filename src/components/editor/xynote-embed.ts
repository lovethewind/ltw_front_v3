/**
 * 笔记嵌入卡片 —— 网页端渲染
 *
 * 桌面端（心悦笔记）把嵌入卡片以标准 HTML 写进正文：
 *
 *   `<div data-xynote-embed="note:<本机uuid>" data-xynote-embed-server="<serverId>" title="..."></div>`
 *
 * - `data-xynote-embed` 是**桌面端本机**标识，网页端无对应字段与接口，**不要**用它取数；
 * - `data-xynote-embed-server` 是**跨端标识**（服务端主键），网页端只认它。
 *
 * 没有 `data-xynote-embed-server` 的两种情况（目标尚未同步、或卡片是桌面端旧版本插入的存量数据）
 * 一律渲染**占位提示**——改前的表现是 commonmark 的 htmlSchema 把这段 html 当纯文本显示
 * （`<span data-type="html">`），看起来像一段源码文本。
 *
 * 契约与设计见 ltw_notes_desktop/docs/specs/2026-10-12-note-embed-web-render.md；
 * 本文件与桌面端 `src/editor/xynote-embed.ts` 同构，改动请两端对齐。
 */
import type { Editor } from '@milkdown/kit/core'
import { $nodeSchema, $remark, $view } from '@milkdown/kit/utils'
import { h, render } from 'vue'
import NoteEmbedCard from '../note/NoteEmbedCard.vue'
import {
  EMBED_SERVER_TAG,
  EMBED_TAG,
  buildEmbedHtml,
  parseEmbedHtml,
  parseEmbedServerId,
  parseEmbedTitle
} from './embed-markup'

export const EMBED_MDAST_TYPE = 'xynoteEmbed'
// 标记的解析/生成在纯函数模块里（可单测），此处仅转出，保持调用方 import 路径稳定。
export { EMBED_SERVER_TAG, EMBED_TAG, buildEmbedHtml, parseEmbedHtml, parseEmbedServerId, parseEmbedTitle }

/**
 * 深度遍历 mdast 树。回调签名 (node, parent, index)：
 * - 对根节点调用时 parent=null、index=-1
 * - 递归进入子节点时，parent 为当前节点、index 为其在 parent.children 中的下标
 *
 * :param node: 当前节点。
 * :param fn: 访问回调。
 * :param parent: 父节点。
 * :param index: 在父节点 children 中的下标。
 * :return: 无返回值。
 */
function walkMdast(
  node: unknown,
  fn: (n: Record<string, unknown>, parent: Record<string, unknown> | null, index: number) => void,
  parent: Record<string, unknown> | null = null,
  index = -1
): void {
  const current = node as Record<string, unknown> | null
  if (!current) return
  fn(current, parent, index)
  const children = current.children
  if (Array.isArray(children)) {
    children.forEach((child, i) => walkMdast(child, fn, current, i))
  }
}

/**
 * remark 插件：把含 `data-xynote-embed` 的 html 节点改造成自定义 mdast type。
 *
 * ⚠️ 签名必须是三层箭头 `$remark(id, () => () => (tree) => void)`，与内置
 * remarkHtmlTransformer 一致；写成两层会被 unified 当插件直接以 processor 调用并抛
 * `Cannot read properties of undefined (reading 'type')`，导致**所有** markdown 解析失败。
 *
 * 执行时序：commonmark 先注册（内置先跑）→ 独立成块的 embed div 已被内置 transformer
 * 包成 `paragraph > html`。因此必须把「paragraph 内唯一的 embed html」提升回 root 级
 * block（嵌入卡是 block 节点，不能作 paragraph 子级）。
 *
 * :param _ctx: remark 上下文（未使用）。
 * :return: remark 插件工厂。
 */
export const embedRemarkTransformer = $remark(
  'remarkXynoteEmbedTransformer',
  () => () => (tree: unknown) => {
    walkMdast(tree, (node, parent, index) => {
      // 情况一：root 直接子级就是 embed html（本插件若先于内置执行时兜底）
      if (node.type === 'html') {
        const raw = String(node.value ?? '')
        const noteId = parseEmbedHtml(raw)
        if (noteId == null) return
        node.type = EMBED_MDAST_TYPE
        node.noteId = noteId
        node.serverId = parseEmbedServerId(raw)
        node.title = parseEmbedTitle(raw)
        return
      }
      // 情况二：embed html 已被内置 transformer 包进 paragraph（内置先执行的主路径）
      if (node.type === 'paragraph' && parent && index != null && Array.isArray(parent.children)) {
        const kids = node.children as Record<string, unknown>[] | undefined
        if (kids && kids.length === 1 && kids[0] && kids[0].type === 'html') {
          const raw = String(kids[0].value ?? '')
          const noteId = parseEmbedHtml(raw)
          if (noteId == null) return
          const embedNode = kids[0]
          embedNode.type = EMBED_MDAST_TYPE
          embedNode.noteId = noteId
          embedNode.serverId = parseEmbedServerId(raw)
          embedNode.title = parseEmbedTitle(raw)
          delete embedNode.value
          parent.children[index] = embedNode
        }
      }
    })
  }
)

/**
 * noteEmbed 块级节点。
 *
 * - attrs：noteId（桌面端本机 ID，占位文案用）、serverId（跨端主键，取数用）、title（快照标题兜底）
 * - markdown 表达与桌面端**逐字节一致**（属性顺序也是），否则网页端一编辑就会把卡片序列化走样
 */
export const noteEmbedNodeSchema = $nodeSchema('xynoteEmbed', () => ({
  group: 'block',
  atom: false,
  selectable: true,
  // ⚠️ 必须 false：prosemirror-view 会按此字段给卡片 DOM 加原生 draggable，
  // 而 nodeView 的 stopEvent 又让 PM 忽略卡片内事件 → 表现为「拖动整张卡片、正文无法选中」。
  draggable: false,
  attrs: {
    noteId: { default: '' },
    title: { default: null as string | null },
    serverId: { default: null as string | null }
  },
  parseDOM: [
    {
      tag: 'div[data-xynote-embed]',
      getAttrs: (dom: HTMLElement) => ({
        noteId: dom.getAttribute('data-xynote-embed')?.replace(/^note:/, '') ?? '',
        title: dom.getAttribute('title'),
        serverId: dom.getAttribute(EMBED_SERVER_TAG)
      })
    }
  ],
  toDOM: (node) => {
    const noteId = node.attrs.noteId as string
    const title = (node.attrs.title as string | null) ?? '笔记卡片'
    const attrs: Record<string, string> = { 'data-xynote-embed': `note:${noteId}` }
    const serverId = (node.attrs.serverId as string | null) ?? null
    if (serverId) attrs[EMBED_SERVER_TAG] = String(serverId)
    // ProseMirror 约定：toDOM 返回 DOMOutputSpec（数组描述），不可返回已创建的元素。
    return ['div', attrs, `[嵌入卡片] ${title} (note:${noteId})`]
  },
  parseMarkdown: {
    match: ({ type }) => type === EMBED_MDAST_TYPE,
    runner: (state, node, proseType) => {
      const embedNode = node as { noteId?: string; title?: string | null; serverId?: string | null }
      state.addNode(proseType, {
        noteId: embedNode.noteId ?? '',
        title: embedNode.title ?? null,
        serverId: embedNode.serverId ?? null
      })
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === 'xynoteEmbed',
    runner: (state, node) => {
      // 生成走纯函数模块，保证与桌面端序列化逐字节一致。
      state.addNode(
        'html',
        undefined,
        buildEmbedHtml({
          noteId: (node.attrs.noteId as string) ?? '',
          serverId: (node.attrs.serverId as string | null) ?? null,
          title: (node.attrs.title as string | null) ?? null
        })
      )
    }
  }
}))

/**
 * 卡片节点视图：把块节点渲染成只读卡片（取数、跳转都在 NoteEmbedCard 内）。
 *
 * :param node: 当前节点（NodeView 入参，随文档更新被替换）。
 * :return: NodeView 描述对象。
 */
export const noteEmbedView = $view(
  noteEmbedNodeSchema.node,
  () => (node: { attrs: Record<string, unknown>; type: unknown }) => {
    const container = document.createElement('div')
    container.className = 'xynote-embed-nodeview'
    // 卡片为只读展示块，自身不可编辑。
    container.setAttribute('contenteditable', 'false')

    const renderCard = (): void => {
      render(
        h(NoteEmbedCard, {
          noteId: (node.attrs.noteId as string) || '',
          serverId: (node.attrs.serverId as string | null) ?? null,
          title: (node.attrs.title as string | null) ?? null
        }),
        container
      )
    }
    renderCard()

    return {
      dom: container,
      update(nextNode: { attrs: Record<string, unknown>; type: unknown }): boolean {
        if (nextNode.type !== node.type) return false
        const changed = (['noteId', 'serverId', 'title'] as const).some(
          (key) => nextNode.attrs[key] !== node.attrs[key]
        )
        node = nextNode
        if (changed) renderCard()
        return true
      },
      destroy(): void {
        render(null, container)
      },
      // 卡片是原子展示块：拦截内部指针/键盘事件交给 Vue，避免 ProseMirror 介入光标/选择。
      stopEvent: (): boolean => true
    }
  }
)

/**
 * 组合成可在 createEditor 里经 `crepe.addFeature` 挂载的 feature。
 *
 * ⚠️ `$remark` 与 `$nodeSchema` 都是二元组，**每个元素都必须显式 use**，缺一即崩：
 * - `$remark`      ⇒ `.options`（注入 remark 插件的 options slice）+ `.plugin`
 * - `$nodeSchema`  ⇒ `.ctx`（注入 schema slice）+ `.node`
 * 漏 `.options` 抛 `Context "remarkXynoteEmbedTransformer" not found`；
 * 漏 `.ctx` 抛 `Context "xynoteEmbed" not found`，都会让编辑器整体起不来。
 *
 * :param editor: Crepe 实例。
 * :return: 无返回值。
 */
export function installXynoteEmbedFeature(editor: Editor): void {
  editor.use(embedRemarkTransformer.options)
  editor.use(embedRemarkTransformer.plugin)
  editor.use(noteEmbedNodeSchema.ctx)
  editor.use(noteEmbedNodeSchema.node)
  editor.use(noteEmbedView)
}
