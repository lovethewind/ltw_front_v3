/**
 * 源码模式（CodeMirror）查找的纯逻辑。
 *
 * 口径与桌面端 `ltw_notes_desktop/src/components/MarkdownSourceEditor.vue` 一致：
 * 大小写不敏感、按出现顺序返回**全量**匹配、索引支持循环取模、表格行按物理行判定。
 *
 * 抽成纯函数模块是因为「查得到几处、定位到第几处、这行算不算表格行」这类判断
 * 要用**真实行为断言**守住（项目约定见 `src/utils/note-tabs.ts`、`src/utils/inline-font-size.ts`），
 * 而不是对 `.vue` 源码做正则匹配。CodeMirror 的接线事实另由接线守卫覆盖。
 */

/** 一处匹配在文档里的字符区间（半开区间 `[from, to)`）。 */
export interface SourceFindMatch {
  from: number
  to: number
}

/** 一次查找的结果：总数 + 当前落在第几处（`-1` 表示无匹配）。 */
export interface SourceFindResult {
  count: number
  index: number
}

/**
 * 收集关键词在正文中的全部匹配位置。
 *
 * 大小写不敏感（与笔记内查找一致）。空关键词直接返回空数组 —— 调用方据此清空高亮；
 * 顺带也避免了空串 `indexOf` 恒为 0 导致的死循环。
 *
 * :param text: 正文全文。
 * :param keyword: 查找关键词（是否 trim 由调用方决定）。
 * :return: 按位置升序排列的匹配区间。
 */
export function collectFindMatches(text: string, keyword: string): SourceFindMatch[] {
  if (!keyword) return []
  const haystack = text.toLocaleLowerCase()
  const needle = keyword.toLocaleLowerCase()
  const matches: SourceFindMatch[] = []
  let offset = haystack.indexOf(needle)
  while (offset >= 0) {
    matches.push({ from: offset, to: offset + needle.length })
    offset = haystack.indexOf(needle, offset + needle.length)
  }
  return matches
}

/**
 * 把任意整数索引收进 `[0, length)`，用于「下一处 / 上一处」的循环定位。
 *
 * `((i % n) + n) % n` 而不是 `i % n`：后者在 `i` 为负时返回负数，
 * 「在第一处按上一处」会越过 index 0 直接失配。
 *
 * :param requestedIndex: 调用方希望的索引，可超出范围。
 * :param length: 匹配总数。
 * :return: 归一化后的索引；`length <= 0` 时返回 `-1`。
 */
export function normalizeFindIndex(requestedIndex: number, length: number): number {
  if (length <= 0) return -1
  return ((requestedIndex % length) + length) % length
}

/**
 * 该行是不是一行表格。
 *
 * 判据是「物理行以 `|` 开头」（允许前导空白）—— 源码模式下按行编辑，
 * 表格行里 `Shift+Enter` 要有专用语义（插入 `<br>`），见 `insertHardBreak`。
 *
 * :param lineText: 单行文本（不含换行符）。
 * :return: 是表格行返回 true。
 */
export function isTableRowLine(lineText: string): boolean {
  return lineText.trimStart().startsWith('|')
}
