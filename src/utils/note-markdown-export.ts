/**
 * 笔记导出为「纯净 Markdown」的纯逻辑。
 *
 * ## 与桌面端的关系
 *
 * 本模块是桌面端 `electron/data-transfer.cjs` 里
 * `splitFencedCodeSegments` / `degradeApplicationMarkup` / `createCleanMarkdownDocument`
 * 三个函数的移植版，口径必须保持一致 —— 同一篇笔记在两端的导出结果应当可对照。
 *
 * ## 为什么只做「纯净」这一条通道
 *
 * 桌面端有两条通道：
 *   - `createMarkdownDocument` → **迁移 / 回读**（带 front matter，导回来不丢标题标签）；
 *   - `createCleanMarkdownDocument` → **对外分享**（任何 Markdown 软件都能正常显示）。
 *
 * 网页端**没有导入 Markdown 的功能**，带 front matter 的迁移格式在浏览器里回读不了，
 * 导出它只会让用户拿到一份多出一段元数据的文件。所以网页端只实现纯净通道。
 *
 * ## 降级规则（与桌面端一致）
 *
 *  - 嵌入卡片 → 一行引用（能拿到 `data-xynote-embed-server` 时带可点开的网页地址）；
 *  - 行内字号 `<span style="font-size:…">` → 去掉外壳只留文字；
 *  - 富文本保真用的 `<br />` → 真换行；
 *  - **围栏代码块内原样保留**（里面的 `<br />` 是用户要看的原文）。
 */

/** 笔记嵌入卡片在正文里的载体（与 `@/components/editor/xynote-embed.ts` 写入的形式一致）。 */
const EMBED_PLACEHOLDER_PATTERN =
  /<div[^>]*\bdata-xynote-embed=["']note:([^"']+)["'][^>]*>\s*<\/div>/gi

/**
 * 嵌入卡上的「线上标识」（服务端数字主键）。
 *
 * 有它才能在网页端拼出可点开的地址 —— 网页端只认数字主键，
 * `note:<本机 uuid>` 那部分是桌面端本地标识，对网页端无意义。
 */
const EMBED_SERVER_PATTERN = /\bdata-xynote-embed-server=["']([^"']*)["']/i

/**
 * 占位 div 上可能写着标题的属性。
 *
 * ⚠️ 前面的 `(?:^|\s)` 边界是必需的：不加会命中 `data-subtitle="…"` 里的 `title=`。
 */
const EMBED_TITLE_PATTERN = /(?:^|\s)title=["']([^"']*)["']/i

/** 行内字号 mark 序列化出来的 span（只含 font-size 一条声明的形式）。 */
const FONT_SIZE_SPAN_PATTERN = /<span[^>]*\bstyle=["'][^"']*font-size:[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi

/** 富文本为保真空行写下的硬换行。 */
const HARD_BREAK_PATTERN = /<br\s*\/?>/gi

/** 一段正文（普通段或代码段）。 */
export interface MarkdownSegment {
  /** 是否为围栏代码段。 */
  code: boolean
  /** 该段的原文。 */
  text: string
}

/** 待导出的笔记（只取导出用得到的字段）。 */
export interface ExportableNote {
  title?: string
  content?: string
}

/**
 * 把 HTML 属性里的文本反转义回可读字符。
 *
 * 属性值是富文本序列化时写进去的，`&quot;` 这类实体原样显示会很难看。
 *
 * :param value: 属性原文。
 * :return: 反转义后的文本。
 */
function decodeAttributeText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/**
 * 解析用于拼接站内地址的站点根。
 *
 * :param origin: 显式传入的站点根（测试用）。
 * :return: 末尾不带 `/` 的站点根；无法确定时返回空串。
 */
function resolveOrigin(origin?: string): string {
  const value = origin ?? (typeof window !== 'undefined' ? window.location?.origin : '')
  return String(value || '').replace(/\/+$/, '')
}

/**
 * 按 ``` / ~~~ 围栏把正文切成「代码段 / 普通段」。
 *
 * 降级替换只能作用在普通段上：代码块里出现的 `<br />`、`<span style="font-size:…">`
 * 是用户要看的原文，一起换掉就等于把导出的文件改坏了。
 *
 * :param markdown: Markdown 原文。
 * :return: 分段结果（按原文顺序）。
 */
export function splitFencedCodeSegments(markdown: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = []
  let buffer: string[] = []
  let openFence: string | null = null

  for (const line of String(markdown || '').split('\n')) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
    if (openFence === null) {
      if (fenceMatch) {
        if (buffer.length) segments.push({ code: false, text: buffer.join('\n') })
        buffer = [line]
        openFence = fenceMatch[1]
        continue
      }
      buffer.push(line)
      continue
    }
    buffer.push(line)
    // 闭合围栏必须同种字符且不短于开启的那个（CommonMark 的口径）。
    if (fenceMatch && fenceMatch[1][0] === openFence[0] && fenceMatch[1].length >= openFence.length) {
      segments.push({ code: true, text: buffer.join('\n') })
      buffer = []
      openFence = null
    }
  }
  // 没收上口的围栏按代码块处理，宁可少改也不要动到用户写的原文。
  if (buffer.length) segments.push({ code: openFence !== null, text: buffer.join('\n') })
  return segments
}

/**
 * 把一张嵌入卡片降级成一行可读的引用。
 *
 * :param rawHtml: 原始占位 div（用于取出 `data-xynote-embed-server` 与 `title`）。
 * :param origin: 站点根，用于拼接可点开的地址。
 * :return: 一行引用文本。
 */
export function renderPortableEmbed(rawHtml: string, origin = ''): string {
  const serverId = (EMBED_SERVER_PATTERN.exec(rawHtml) || [])[1]?.trim() || ''
  const inlineTitle = decodeAttributeText((EMBED_TITLE_PATTERN.exec(rawHtml) || [])[1] || '').trim()
  const title = inlineTitle || '未命名笔记'
  const base = resolveOrigin(origin)
  const url = serverId && base ? `${base}/notes/${serverId}` : ''
  return url ? `> 嵌入的笔记：[${title}](${url})` : `> 嵌入的笔记：${title}`
}

/**
 * 把正文里的应用内部写法降级为通用 Markdown（代码块请先切段，本函数不识别围栏）。
 *
 * :param text: 一段正文。
 * :param origin: 站点根，用于拼接嵌入卡地址。
 * :return: 降级后的正文。
 */
export function degradeApplicationMarkup(text: string, origin = ''): string {
  return String(text)
    .replace(EMBED_PLACEHOLDER_PATTERN, (match) => renderPortableEmbed(match, origin))
    .replace(FONT_SIZE_SPAN_PATTERN, '$1')
    .replace(HARD_BREAK_PATTERN, '\n')
    // 硬换行变成真换行后，原本靠多个 <br /> 撑出的空行会堆成长串，收一下。
    .replace(/\n{3,}/g, '\n\n')
}

/**
 * 生成「给外部看」的纯净 Markdown：不含元数据、不含应用私有标签。
 *
 * 标题改用一级标题承载；正文首行已经是同名标题时不再重复加。
 *
 * :param note: 笔记数据。
 * :param options: 选项（`origin` 用于嵌入卡地址）。
 * :return: Markdown 文档（末尾带一个换行）。
 */
export function buildExportMarkdown(
  note: ExportableNote,
  options: { origin?: string } = {}
): string {
  const origin = resolveOrigin(options.origin)
  const body = splitFencedCodeSegments(note?.content ?? '')
    .map((segment) => (segment.code ? segment.text : degradeApplicationMarkup(segment.text, origin)))
    .join('\n')
    .trim()
  const title = String(note?.title ?? '').trim()
  const hasOwnHeading = body.split('\n', 1)[0].trim() === `# ${title}`
  const heading = title && !hasOwnHeading ? `# ${title}\n\n` : ''
  return `${heading}${body}\n`
}

/**
 * 将标题转换为可安全用于文件名的名称（与桌面端 `sanitizeFileName` 同口径）。
 *
 * :param value: 原始名称。
 * :return: 安全文件名（不含扩展名）。
 */
export function sanitizeExportFileName(value: string): string {
  const sanitized = String(value || '')
    .trim()
    .replace(/[/\\:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/^\.+/, '')
    .replace(/[.\s]+$/, '')
    .slice(0, 80)
  return sanitized || '未命名'
}

/**
 * 由标题得到导出文件名。
 *
 * :param title: 笔记标题。
 * :return: `标题.md`。
 */
export function buildExportFileName(title: string): string {
  return `${sanitizeExportFileName(title)}.md`
}

/**
 * 触发浏览器下载一个文本文件。
 *
 * :param fileName: 下载文件名。
 * :param content: 文件内容。
 * :return: 无返回值。
 */
export function downloadTextFile(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // 触发下载后立刻 revoke 会让部分浏览器拿不到内容，延后一拍再释放。
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
