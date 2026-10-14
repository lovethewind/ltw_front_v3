/**
 * 预览档里「嵌入的笔记」占位卡的渲染 —— **纯函数，不碰框架、不发起请求**（便于单测）。
 *
 * ## 为什么需要它
 *
 * 正文里的嵌入卡在 Markdown 原文里就是一个**空 div**：
 *
 *   `<div data-xynote-embed="note:<id>" data-xynote-embed-server="<serverId>" title="标题"></div>`
 *
 * 走 marked 渲染时它被原样输出，页面上是个零高度的空块 —— 这就是「预览档看不到卡片」。
 * 这里在渲染结果上把这层空 div 换成可读卡片（文件夹 / 标题 / 摘要 / 时间 + 打开箭头）。
 *
 * ## 口径与桌面端一致
 *
 * 桌面端同一件事由 `ltw_notes_desktop/src/utils/markdown-preview.ts` 的
 * `renderEmbedPlaceholder` 负责：信息层级（文件夹 → 标题 → 摘要 → 底行时间）、三个
 * material-symbols 内联图标、可点语义（`data-note-id` + `role` + `tabindex` + `title`）、
 * 降级顺序，全部照它来 —— 两端的预览必须长得一样。
 *
 * ⚠️ 图标必须内联 SVG：预览正文是 `v-html` 出来的**死 HTML**，挂不上 Vue 的 `<Icon>` 组件。
 * `fill="currentColor"` 让图形跟随文字颜色，换主题不用另写样式。
 *
 * ## 与桌面端唯一的差异：键是 serverId
 *
 * 桌面端认 `data-xynote-embed`（本机 uuid）；网页端没有本机 id 这回事，唯一能取数的是
 * 跨端属性 `data-xynote-embed-server`。缺这个属性的卡片属于「桌面端插入但还没同步」的
 * 存量 → 信息一个都查不到，降级成**不可点**的提示卡（与编辑态 `NoteEmbedCard.vue` 同文案）。
 */

/** 卡片摘要长度上限，与编辑态卡片 `NoteEmbedCard.vue` 同一口径。 */
export const NOTE_EMBED_EXCERPT_LENGTH = 160

/** 嵌入卡要展示的信息。字段都可缺省 —— 缺什么就不渲染什么。 */
export interface PreviewEmbedMeta {
  /** 实时查到的标题；缺省时退回占位 div 上的 `title` 快照，再退回「未命名笔记」。 */
  title?: string | null
  /** 所在文件夹名。空则不渲染这一行。 */
  folderName?: string | null
  /** 纯文本摘要（调用方已去记号并截断）。空则不渲染。 */
  excerpt?: string | null
  /** 已格式化的短日期（`yyyy.MM.dd`）。空则不渲染底行。 */
  date?: string | null
}

/** 预览渲染需要的外部信息。 */
export interface PreviewEmbedOptions {
  /**
   * 按**跨端标识**解析卡片的展示信息；查不到返回 null。
   *
   * 本模块不认识笔记库：标题 / 文件夹 / 摘要 / 时间一律由调用方（预览组件）注入 ——
   * 渲染是纯函数，只认这一份**同步**给到的数据（异步取详情会破坏纯函数契约，
   * 而死 HTML 也没法等回调回来再更新）。
   */
  resolveEmbedMeta?: (serverId: string) => PreviewEmbedMeta | null
}

/** 预览卡上的三个图标（material-symbols，与编辑态 `NoteEmbedCard.vue` 同源同图）。 */
const EMBED_ICON_FOLDER =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h5.175q.4 0 .763.15t.637.425L12 6h8q.825 0 1.413.588T22 8v10q0 .825-.587 1.413T20 20zm0-2h16V8h-8.825l-2-2H4zm0 0V6z"/></svg>'
const EMBED_ICON_CLOCK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 11.6V8q0-.425-.288-.712T12 7t-.712.288T11 8v3.975q0 .2.075.388t.225.337l3.3 3.3q.275.275.7.275T16 16t.275-.7t-.275-.7zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/></svg>'
const EMBED_ICON_ARROW =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.175 13H5q-.425 0-.712-.288T4 12t.288-.712T5 11h11.175l-4.9-4.9q-.3-.3-.288-.7t.313-.7q.3-.275.7-.288t.7.288l6.6 6.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-6.6 6.6q-.275.275-.687.275T11.3 19.3q-.3-.3-.3-.712t.3-.713z"/></svg>'

/**
 * 匹配渲染结果里的嵌入卡空 div，捕获组是本机 ID。
 *
 * ⚠️ 正则口径必须与 `components/editor/embed-markup.ts` 的生成侧（`buildEmbedHtml`）
 * 对得上；这条契约不靠对比正则字面来守，而是靠单测里「生成 → 渲染」走一遍（见 spec）。
 */
const EMBED_PLACEHOLDER_PATTERN =
  /<div[^>]*\bdata-xynote-embed=["']note:([^"']+)["'][^>]*>\s*<\/div>/gi

/** 从占位 div 里取插入时写在 `title` 属性上的标题快照（可能没有）。 */
const EMBED_TITLE_PATTERN = /\btitle=["']([^"']*)["']/i

/**
 * 从占位 div 里取跨端标识（`data-xynote-embed-server`）。
 *
 * ⚠️ 不能拿 `data-xynote-embed` 的正则来匹配它：两者是各自独立的属性，本属性取值不含
 * `note:` 前缀。与 `components/editor/embed-markup.ts` 的 `parseEmbedServerId` 同口径。
 *
 * :param raw: 占位 div 原文。
 * :return: 服务端主键；无该属性时返回 null（桌面端插入但未同步的存量卡）。
 */
function parseServerId(raw: string): string | null {
  const matched = /data-xynote-embed-server=["']([^"']+)["']/.exec(raw)
  return matched ? matched[1] : null
}

/**
 * HTML 文本转义（文本节点足够；属性值另行处理引号）。
 *
 * :param value: 待转义文本。
 * :return: 可安全拼进 HTML 的文本。
 */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * 渲染一张嵌入卡。
 *
 * 有跨端标识 → 可点卡片（`data-note-id` 承载目标，预览层事件委托据此打开笔记）；
 * 没有 → 不可点的提示卡，不输出任何「能点」的暗示。
 *
 * :param rawHtml: 原始占位 div（用于取标题快照与跨端标识）。
 * :param options: 渲染选项。
 * :return: 卡片 HTML。
 */
function renderEmbedCard(rawHtml: string, options?: PreviewEmbedOptions): string {
  const serverId = parseServerId(rawHtml)
  const inlineTitle = EMBED_TITLE_PATTERN.exec(rawHtml)?.[1]?.trim() ?? ''
  const meta = serverId ? options?.resolveEmbedMeta?.(serverId) ?? null : null
  // 实时查到的标题优先：占位 div 上的 `title` 是插入那一刻的快照，笔记改名后就过期了。
  const resolved = meta?.title?.trim() || inlineTitle
  const title = escapeHtml(resolved || '未命名笔记')
  const folderName = meta?.folderName?.trim() ?? ''
  const excerpt = meta?.excerpt?.trim() ?? ''
  const date = meta?.date?.trim() ?? ''

  const rows: string[] = []
  if (folderName) {
    rows.push(
      `<span class="markdown-embed-placeholder__folder">${EMBED_ICON_FOLDER}${escapeHtml(folderName)}</span>`
    )
  }
  rows.push(`<span class="markdown-embed-placeholder__title">${title}</span>`)
  if (excerpt) {
    rows.push(`<span class="markdown-embed-placeholder__excerpt">${escapeHtml(excerpt)}</span>`)
  } else if (!serverId) {
    // 提示与编辑态卡片同文案：这张卡是桌面端插入的、目标还没同步到云端。
    rows.push(
      '<span class="markdown-embed-placeholder__excerpt">此嵌入尚未同步到云端，同步后可在网页显示</span>'
    )
  }
  // 底行只剩时间（原先恒挂的「嵌入的笔记」标签在补齐文件夹/标题/摘要后已纯属冗余）。
  // ⚠️ 没有时间就整行不渲染，别留一个零高度的空壳。
  if (date) {
    rows.push(
      `<span class="markdown-embed-placeholder__foot"><span class="markdown-embed-placeholder__date">${EMBED_ICON_CLOCK}${escapeHtml(date)}</span></span>`
    )
  }

  const arrow = serverId
    ? `<span class="markdown-embed-placeholder__action" aria-hidden="true">${EMBED_ICON_ARROW}</span>`
    : ''
  const rootAttrs = serverId
    ? ` data-note-id="${escapeHtml(serverId).replace(/"/g, '&quot;')}" role="button" tabindex="0" title="打开笔记"`
    : ''
  const stateClass = serverId ? '' : ' is-pending'

  return [
    `<div class="markdown-embed-placeholder${stateClass}"${rootAttrs}>`,
    `<span class="markdown-embed-placeholder__body">${rows.join('')}</span>`,
    arrow,
    '</div>'
  ].join('')
}

/**
 * 把渲染结果里的嵌入卡空 div 替换成可读卡片。
 *
 * :param html: marked 渲染出的 HTML（未清洗）。
 * :param options: 渲染选项（嵌入卡展示信息解析）。
 * :return: 替换后的 HTML。
 */
export function renderNoteEmbeds(html: string, options?: PreviewEmbedOptions): string {
  // 绝大多数笔记没有嵌入卡，先做一次廉价的包含判断，不白跑一遍正则。
  if (!html.includes('data-xynote-embed')) return html
  return html.replace(EMBED_PLACEHOLDER_PATTERN, (match: string) =>
    renderEmbedCard(match, options)
  )
}
