/**
 * 网页端「打开笔记」的跨组件事件（window CustomEvent 总线）。
 *
 * ## 与桌面端的关系
 *
 * 本模块是 `ltw_notes_desktop/src/utils/note-open-events.ts` 的移植版（只保留网页端
 * 需要的部分）。事件名与 payload 形状两端保持一致，改行为时两端应同步。
 *
 * ## 为什么要事件总线
 *
 * 编辑器深处的节点视图拿不到 `NoteWorkspace` 里的标签状态函数 —— `NoteEmbedCard`
 * 由 Crepe 的 nodeView 用 `render()` 挂成**独立** vnode tree，既不继承应用上下文，
 * 也不在 emit 链上。这里用一个命名 window 事件桥接：深居组件发起请求，由工作区
 * 统一路由到「新标签页打开」（`openNoteInNewTab`）或「原地切换」（`selectNote`）。
 *
 * 口径与桌面端一致：侧栏 / 标签栏点击是工作区内的翻页（原地），而**嵌入卡与正文
 * 里的笔记链接**一律在新标签页打开 —— 它们表达的是「去另一篇看看」，原地换页会把
 * 当前这篇顶掉，未保存的输入一起丢。
 */

/** 由工作区在挂载后监听、由嵌入卡与正文链接发起的「打开笔记」事件名。 */
export const OPEN_NOTE_EVENT = 'xynote:open-note'

/** 事件 payload：noteId 为目标笔记 ID；newTab 决定新标签页还是原地切换。 */
export interface OpenNoteEventDetail {
  noteId: string
  newTab: boolean
}

/**
 * 判断站内笔记链接并取出笔记 ID。
 *
 * 认两种写法：相对路径 `/notes/<id>`，以及桌面端写进正文的绝对地址
 * `https://<本站域名>/notes/<id>`（`new URL` 归一后同源）。外链与站内其他页面
 * 一律返回 null —— 调用方据此放手，让浏览器默认行为接管。
 *
 * :param href: 链接地址（允许相对写法）。
 * :param base: 解析相对地址与判定同源用的基准地址，默认当前页面地址。
 * :return: 笔记 ID；不是站内笔记链接时为 null。
 */
export function resolveNoteIdFromHref(href: string, base?: string): string | null {
  if (!href) return null
  const baseHref = base ?? window.location.href
  let target: URL
  let baseUrl: URL
  try {
    target = new URL(href, baseHref)
    baseUrl = new URL(baseHref)
  } catch {
    return null
  }
  if (target.origin !== baseUrl.origin) return null
  const matched = /^\/notes\/([^/]+)\/?$/.exec(target.pathname)
  if (!matched) return null
  try {
    return decodeURIComponent(matched[1])
  } catch {
    // 地址里混进了非法百分号编码：原样返回，交给后端查不到时报「笔记不存在」。
    return matched[1]
  }
}

/**
 * 派发「打开笔记」事件。
 *
 * 返回值承载「有没有人接管」的语义：工作区监听器接管后会 `preventDefault()`，
 * 据此可知请求已落地；返回 `false` 说明当前不在笔记工作区（例如文章编辑页里
 * 复用的同款编辑器），调用方应退回路由跳转，而不是什么都不做。
 *
 * :param noteId: 目标笔记 ID。
 * :param newTab: 为 true 时在新标签页打开，否则原地切换当前标签。
 * :return: 是否已被笔记工作区接管。
 */
export function dispatchOpenNote(noteId: string, newTab: boolean): boolean {
  if (!noteId) return false
  const handled = !window.dispatchEvent(
    new CustomEvent<OpenNoteEventDetail>(OPEN_NOTE_EVENT, {
      detail: { noteId, newTab },
      cancelable: true
    })
  )
  return handled
}
