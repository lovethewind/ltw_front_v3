export type NoteNavigationKind = 'all' | 'pinned' | 'trash'

export interface NoteNavigationCounts {
  all: number
  pinned: number
  trash: number
}

/**
 * 将笔记更新时间格式化为简洁文本。
 *
 * :param value: ISO 时间或可被 Date 解析的时间文本。
 * :param now: 当前时间戳，测试时可传入固定值。
 * :return: 相对时间或月日文本。
 */
export function formatNoteUpdatedTime(value: string, now: number = Date.now()): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return ''
  const diff = Math.max(0, now - timestamp)
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(
    new Date(timestamp)
  )
}

/**
 * 将 Markdown 或 HTML 正文转换为一行列表摘要。
 *
 * :param content: 笔记正文。
 * :return: 去除标记并合并空白后的单行摘要。
 */
export function formatNoteExcerpt(content: string): string {
  return content
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 去掉 Markdown 记号，得到用于摘要的纯文本。
 *
 * ⚠️ 与 `formatNoteExcerpt` 的差别是**刻意的**：本函数口径对齐桌面端
 * `NoteEmbedCard.vue` 的 `stripMarkdown` —— 中文正文里的 `（…）` / `()` 常常是
 * 语义的一部分（如「后台四(admin搭建)」），全量剔除会把正文洗成病句。
 * 因此这里**只**去掉真正的 Markdown 记号，保留括号与连接号之外的分隔符。
 *
 * 嵌入卡与左侧栏各用一份，避免改一处理另一处跟着变（左侧栏用的是服务端
 * 预截断的 `contentPreview`，没有对齐桌面端的需求）。
 *
 * :param raw: 笔记正文原文（Markdown 或含 HTML）。
 * :return: 去记号并合并空白后的单行文本。
 */
export function stripNoteMarkdown(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // 图片 → alt 文本
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 → 文本
    .replace(/<[^>]+>/g, ' ') // 残留 HTML 标签（含 data-xynote-embed 容器）
    .replace(/[#>*_`~|-]{1,}/g, ' ') // Markdown 记号（不含括号）
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 把更新时间压成「2026.07.26」样式的短日期。
 *
 * 与桌面端 `NoteEmbedCard.vue` 的 `formatDate` 同口径（点分隔），两端嵌入卡
 * 显示一致；解析不出日期时返回空串，由调用方决定不渲染。
 *
 * :param value: ISO 时间或 `yyyy-MM-dd HH:mm:ss` 文本。
 * :return: `yyyy.MM.dd`，无法解析时为空串。
 */
export function formatNoteCompactDate(value: string): string {
  if (!value) return ''
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value)
  return match ? match[0].replace(/-/g, '.') : ''
}
