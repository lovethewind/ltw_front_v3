/**
 * 嵌入卡标记的解析与生成 —— **纯函数，无框架与 DOM 依赖**（便于单测）。
 *
 * 桌面端写进正文的形态：
 *
 *   `<div data-xynote-embed="note:<本机uuid>" data-xynote-embed-server="<serverId>" title="标题"></div>`
 *
 * - `data-xynote-embed`：桌面端本机标识，**网页端不用于取数**（网页端没有该字段与接口）；
 * - `data-xynote-embed-server`：跨端标识（服务端主键），网页端唯一可用的取数依据，缺省即降级占位。
 *
 * ⚠️ 生成顺序必须是「本机标识 → 跨端标识 → 标题」，与桌面端 `toMarkdown` 逐字节一致；
 * 否则网页端编辑一次就会把所有卡片的序列化形态改写一遍。
 */

/** 桌面端本机标识属性。 */
export const EMBED_TAG = 'data-xynote-embed'
/** 跨端标识属性（服务端主键）。 */
export const EMBED_SERVER_TAG = 'data-xynote-embed-server'

const EMBED_ID_PATTERN = /data-xynote-embed=["']note:([^"']+)["']/
const EMBED_SERVER_PATTERN = /data-xynote-embed-server=["']([^"']+)["']/
/**
 * 标题快照属性。要求属性前有空白边界，避免误匹配名字里含 title 的其它属性。
 * ⚠️ 少解析这一项不只是「显示成未命名笔记」——保存是整篇重新序列化，
 * title 为 null 时 `buildEmbedHtml` 不输出该属性，**用户编辑一次就把正文里的标题抹掉了**。
 */
const EMBED_TITLE_PATTERN = /(?:^|\s)title=["']([^"']*)["']/

/** 嵌入卡的三个字段（与桌面端节点 attrs 同名）。 */
export interface EmbedMarkupFields {
  /** 桌面端本机笔记 ID。 */
  noteId: string
  /** 服务端笔记主键；未同步 / 存量卡片为 null。 */
  serverId?: string | null
  /** 插入时的标题快照。 */
  title?: string | null
}

/**
 * 从 html 文本里解析出桌面端本机 ID。
 *
 * :param raw: 承载嵌入卡的 html 原文。
 * :return: 本机笔记 ID；不是嵌入卡时返回 null。
 */
export function parseEmbedHtml(raw: string): string | null {
  const m = EMBED_ID_PATTERN.exec(String(raw ?? ''))
  return m ? m[1] : null
}

/**
 * 从 html 文本里解析出跨端标识 serverId。
 *
 * ⚠️ 不能用 `data-xynote-embed` 的正则去匹配本属性：两者是独立属性，
 * 本属性取值**不含** `note:` 前缀。
 *
 * :param raw: 承载嵌入卡的 html 原文。
 * :return: 服务端笔记主键；无该属性时返回 null。
 */
export function parseEmbedServerId(raw: string): string | null {
  const m = EMBED_SERVER_PATTERN.exec(String(raw ?? ''))
  return m ? m[1] : null
}

/**
 * 从 html 文本里解析出**标题快照**（无该属性返回 null）。
 *
 * 标题只是插入那一刻的快照，笔记改名后即过期，两端都只当**兜底**用（实时取到的优先）。
 * 但**必须解析**：`buildEmbedHtml` 会按 title 决定是否输出该属性，漏解析等于在保存时把它删掉。
 *
 * 与生成侧对称，不做 HTML 转义 / 反转义（标题含半角双引号时本就写不出合法属性，属既有边界）。
 *
 * :param raw: 承载嵌入卡的 html 原文。
 * :return: 插入时的标题快照；卡片没有 title 属性时返回 null。
 */
export function parseEmbedTitle(raw: string): string | null {
  const m = EMBED_TITLE_PATTERN.exec(String(raw ?? ''))
  return m ? m[1] : null
}

/**
 * 生成嵌入卡的 html 表达（与桌面端序列化结果逐字节一致）。
 *
 * :param fields: 卡片字段。
 * :return: `<div data-xynote-embed …></div>` 文本；缺省字段不输出对应属性。
 */
export function buildEmbedHtml({ noteId, serverId = null, title = null }: EmbedMarkupFields): string {
  const serverAttr = serverId ? ` ${EMBED_SERVER_TAG}="${serverId}"` : ''
  const titleAttr = title ? ` title="${title}"` : ''
  return `<div ${EMBED_TAG}="note:${noteId}"${serverAttr}${titleAttr}></div>`
}
