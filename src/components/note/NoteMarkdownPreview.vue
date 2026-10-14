<script setup lang="ts">
/**
 * 笔记正文的**只读预览**（编辑器顶层「富文本 / 预览 / 源码」里的「预览」档）。
 *
 * ## 职责
 *
 * 把 Markdown 原文渲染成 HTML 展示，**不做任何修改**：唯一的输入是 `props.value`，
 * 渲染结果不回流到保存链路（没有 emit）。
 *
 * ## 为什么用 marked 而不是 Crepe
 *
 * 预览要回答的是「这篇笔记最终长什么样」。走 marked（与文章页同一套）可以**完整渲染**
 * 那些富文本编辑器往返会「顺平」的写法（表格列宽、行内 `*`、刻意的空行），
 * 与源码档看到的是同一份原文。走 Crepe 反而会把它们改写掉。
 *
 * ## 安全
 *
 * 正文允许写任意 HTML，因此渲染结果**必须**经 `v-dompurify-html` 清洗 —— 不清洗就是 XSS 入口。
 *
 * 这段渲染原本长在 `NoteSourceEditor.vue` 里（源码 / 预览双模式），后上提为独立档位，
 * 源码编辑器因此只负责编辑原文。
 */
import { marked } from 'marked'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useNoteStore } from '@/stores/note'
import {
  NOTE_EMBED_EXCERPT_LENGTH,
  renderNoteEmbeds,
  type PreviewEmbedMeta
} from '@/utils/note-embed-preview'
import { dispatchOpenNote, resolveNoteIdFromHref } from '@/utils/note-open-events'
import { formatNoteCompactDate } from './note-navigation'

interface Props {
  /** Markdown 原文。 */
  value?: string
}

const props = withDefaults(defineProps<Props>(), { value: '' })
const router = useRouter()
const store = useNoteStore()

/**
 * 解析嵌入卡要展示的信息（标题 / 文件夹 / 摘要 / 时间）。
 *
 * 数据来自 note store 的**已加载列表**（`notes` 里的 `contentPreview` 是服务端预截断的
 * 纯文本），所以整条链是**同步**的 —— 预览正文是 v-html 出来的死 HTML，等不了异步回调。
 *
 * ⚠️ 摘要是「列表里的纯文本预览」，与编辑态卡片（异步取详情再截断）同口径但**不保证逐字
 * 相同**；标题 / 文件夹 / 时间是精确的。查不到返回 null，渲染层据此只留标题快照。
 *
 * :param serverId: 被嵌入笔记的跨端标识。
 * :return: 卡片展示信息；列表里没有这篇时返回 null。
 */
function resolveEmbedMeta(serverId: string): PreviewEmbedMeta | null {
  const note = store.notes.find((item) => String(item.id) === serverId)
  if (!note) return null
  return {
    title: note.title,
    folderName:
      store.folders.find((folder) => String(folder.id) === String(note.folderId))?.name ?? '',
    excerpt: (note.contentPreview || '').slice(0, NOTE_EMBED_EXCERPT_LENGTH),
    date: formatNoteCompactDate(note.updateTime)
  }
}

/**
 * 渲染后的 HTML。
 *
 * 分两步：marked 把原文渲成 HTML，再把里面的嵌入卡空 div 换成可读卡片
 * （见 `utils/note-embed-preview.ts`，口径与桌面端预览一致）。
 *
 * :return: 清洗前的 HTML 字符串（由 `v-dompurify-html` 负责清洗）。
 */
const previewHtml = computed(() => {
  const parsed = marked.parse(props.value, { async: false }) as string
  return renderNoteEmbeds(parsed, { resolveEmbedMeta })
})

/**
 * 预览里的「打开另一篇笔记」统一走这里：优先交给笔记工作区**在新标签页打开**。
 *
 * 预览档本身只读，但它常是用户在编辑另一篇笔记时顺手切过来看的，原地换页会把当前这篇
 * 带走。留路由兜底，免得这段将来被复用到工作区之外时点了没反应。
 *
 * :param serverId: 目标笔记的服务端标识。
 * :return: 无返回值。
 */
function openNoteFromPreview(serverId: string): void {
  if (!serverId) return
  if (!dispatchOpenNote(serverId, true)) {
    void router.push({ name: 'notes', params: { noteId: serverId } })
  }
}

/**
 * 预览正文的点击委托，接住两类可点目标。
 *
 * 用容器委托而不是给渲染结果挂 `@click` —— `v-html` 出来的是死 HTML，挂不上 Vue 事件；
 * 也正因为如此，卡片上「可点」的语义只能靠 `data-note-id` + `role` + `tabindex` 承载。
 *
 * :param event: 预览容器的点击事件。
 * :return: 无返回值。
 */
function handlePreviewClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const card = target.closest<HTMLElement>('.markdown-embed-placeholder[data-note-id]')
  if (card) {
    openNoteFromPreview(card.dataset.noteId ?? '')
    return
  }
  const anchor = target.closest<HTMLAnchorElement>('a[href]')
  if (!anchor) return
  const noteId = resolveNoteIdFromHref(anchor.href, window.location.href)
  if (!noteId) return
  event.preventDefault()
  openNoteFromPreview(noteId)
}

/**
 * 卡片是 `div[role="button"]`，浏览器不会在回车 / 空格时自动派发 click —— 键盘可达要自己接。
 *
 * :param event: 预览容器的键盘事件。
 * :return: 无返回值。
 */
function handlePreviewKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const target = event.target
  if (!(target instanceof Element)) return
  const card = target.closest<HTMLElement>('.markdown-embed-placeholder[data-note-id]')
  if (!card) return
  event.preventDefault()
  openNoteFromPreview(card.dataset.noteId ?? '')
}
</script>

<template>
  <div class="note-markdown-preview">
    <div
      class="note-markdown-preview__body"
      v-dompurify-html="previewHtml"
      @click="handlePreviewClick"
      @keydown="handlePreviewKeydown"
    ></div>
  </div>
</template>

<style lang="scss" scoped>
/*
  排版与富文本编辑区对齐：同宽（920px 上限、居中）、同内边距、同字号分层。
  颜色全部走这里的局部变量，明暗主题靠一组变量覆盖 —— 所以不需要第二份规则。
*/
.note-markdown-preview {
  --note-preview-content-width: 920px;
  --note-preview-surface: rgb(15 23 42 / 3%);
  --note-preview-border: var(--markdown-outline-border, #e2e8f2);
  --note-preview-text: #253952;
  --note-preview-heading: #1f2d3d;
  --note-preview-link: #2f80ed;
  --note-preview-code: #b15928;
  --note-preview-code-bg: rgb(15 23 42 / 6%);
  --note-preview-pre-bg: rgb(15 23 42 / 5%);
  --note-preview-quote: #6b7d99;

  height: 100%;
  min-height: 0;
  overflow-y: auto;
  background: transparent;
}

.note-markdown-preview__body {
  box-sizing: border-box;
  width: min(100%, var(--note-preview-content-width));
  margin: 0 auto;
  padding: 18px clamp(28px, 4.5vw, 64px) 80px;
  color: var(--note-preview-text);
  font-size: 15px;
  line-height: 1.8;
  overflow-wrap: break-word;

  :deep(> :first-child) {
    margin-top: 0;
  }

  /* 字号分层与富文本模式一致（Crepe 默认值在窄窗口里太大）。 */
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin: 1.4em 0 0.6em;
    color: var(--note-preview-heading);
    font-weight: 700;
    line-height: 1.4;
  }

  :deep(h1) {
    font-size: 24px;
  }

  :deep(h2) {
    font-size: 20px;
  }

  :deep(h3) {
    font-size: 17px;
  }

  :deep(h4) {
    font-size: 15.5px;
  }

  :deep(h5) {
    font-size: 15px;
  }

  :deep(h6) {
    font-size: 14px;
  }

  :deep(p) {
    margin: 0.7em 0;
  }

  :deep(a) {
    color: var(--note-preview-link);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(code) {
    border-radius: 4px;
    padding: 0.1em 0.35em;
    background: var(--note-preview-code-bg);
    color: var(--note-preview-code);
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.9em;
  }

  :deep(pre) {
    margin: 0.9em 0;
    padding: 12px 14px;
    overflow-x: auto;
    border-radius: 10px;
    background: var(--note-preview-pre-bg);

    code {
      padding: 0;
      background: transparent;
    }
  }

  :deep(blockquote) {
    margin: 0.9em 0;
    border-left: 3px solid var(--note-preview-border);
    padding: 0.2em 0 0.2em 14px;
    color: var(--note-preview-quote);
  }

  :deep(ul),
  :deep(ol) {
    margin: 0.7em 0;
    padding-left: 1.5em;
  }

  :deep(li) {
    margin: 0.25em 0;
  }

  :deep(table) {
    width: 100%;
    margin: 0.9em 0;
    border-collapse: collapse;
    font-size: 0.933em;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid var(--note-preview-border);
    padding: 6px 10px;
    text-align: left;
  }

  :deep(thead th) {
    background: var(--note-preview-surface);
    color: var(--note-preview-heading);
    font-weight: 650;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  :deep(hr) {
    margin: 1.4em 0;
    border: 0;
    border-top: 1px solid var(--note-preview-border);
  }

  /*
    嵌入卡：观感对齐编辑态卡片（NoteEmbedCard.vue）—— 整圈细边框 + 圆角 12，
    信息自上而下为 文件夹 / 标题 / 摘要 / 时间，右侧一个打开箭头。
    ⚠️ 卡片是 v-html 出来的死 HTML，没有 scoped 的 data-v 属性，必须走 :deep()。
  */
  :deep(.markdown-embed-placeholder) {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0.9em 0;
    padding: 12px 14px;
    border: 1px solid var(--note-preview-border);
    border-radius: 12px;
    background: var(--note-preview-surface);
    color: var(--note-preview-text);
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      border-color: var(--note-preview-link);
      box-shadow: 0 4px 16px rgb(47 128 237 / 10%);
    }

    &:focus-visible {
      outline: 2px solid var(--note-preview-link);
      outline-offset: 2px;
    }
  }

  /* 目标未同步（没有跨端标识）：查不到任何信息，也就没有可点的去处。 */
  :deep(.markdown-embed-placeholder.is-pending) {
    cursor: default;

    &:hover {
      border-color: var(--note-preview-border);
      box-shadow: none;
    }
  }

  :deep(.markdown-embed-placeholder__body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  :deep(.markdown-embed-placeholder__folder),
  :deep(.markdown-embed-placeholder__date) {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--note-preview-quote);
    font-size: 11px;
    line-height: 16px;

    svg {
      flex: 0 0 auto;
    }
  }

  :deep(.markdown-embed-placeholder__title) {
    color: var(--note-preview-heading);
    font-size: 14px;
    font-weight: 680;
    line-height: 20px;
    overflow-wrap: anywhere;
  }

  /* 摘要固定两行，多出的部分由省略号收尾（与编辑态一致，避免硬切在半句）。 */
  :deep(.markdown-embed-placeholder__excerpt) {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    color: var(--note-preview-quote);
    font-size: 12px;
    line-height: 18px;
    overflow-wrap: anywhere;
  }

  :deep(.markdown-embed-placeholder__foot) {
    margin-top: 2px;
  }

  :deep(.markdown-embed-placeholder__action) {
    display: inline-flex;
    flex: 0 0 auto;
    color: var(--note-preview-quote);
    transition:
      color 0.15s ease,
      transform 0.15s ease;
  }

  :deep(.markdown-embed-placeholder:hover .markdown-embed-placeholder__action) {
    color: var(--note-preview-link);
    transform: translateX(2px);
  }
}

html.dark .note-markdown-preview {
  --note-preview-surface: rgb(255 255 255 / 6%);
  --note-preview-text: #d9e5f5;
  --note-preview-heading: #eef5ff;
  --note-preview-link: #79aff3;
  --note-preview-code: #e0a06a;
  --note-preview-code-bg: rgb(255 255 255 / 8%);
  --note-preview-pre-bg: rgb(255 255 255 / 6%);
  --note-preview-quote: #92a4ba;
}
</style>
