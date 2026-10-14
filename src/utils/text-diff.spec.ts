import { describe, expect, it } from 'vitest'

import { diffTextLines, splitDiffLines, type TextDiffResult } from './text-diff'

/** 取某行某一侧的纯文本（用于快速比对）。 */
function textAt(result: TextDiffResult, index: number, side: 'left' | 'right'): string | null {
  return result.rows[index][side]?.text ?? null
}

/** 取某行某一侧的状态。 */
function statusAt(result: TextDiffResult, index: number, side: 'left' | 'right'): string | null {
  return result.rows[index][side]?.status ?? null
}

/**
 * 差异算法的真实行为测试。
 *
 * 与「读源码做正则匹配」那类守卫不同，这里直接调用模块、断言输出的行对齐结构：
 * 差异算法一旦错位（少一行、行号串位、把相同行标成变更），历史版本对比就会给出
 * 误导性的结论 —— 用户据此判断「这一版改了什么」就会得到相反答案，所以必须用真数据守住。
 *
 * 与桌面端 `ltw_notes_desktop/tests/text-diff.test.cjs` 同源；两端算法共用一份实现，
 * 用例也要一起演进。
 */
describe('diffTextLines（历史版本对比的差异算法）', () => {
  it('两侧完全一致时没有差异', () => {
    const result = diffTextLines('# 日报\n\n第一条\n第二条', '# 日报\n\n第一条\n第二条')
    expect(result.rows).toHaveLength(4)
    expect(result.hunkCount).toBe(0)
    expect(result.changedLineCount).toBe(0)
    expect(result.hunkStartIndexes).toEqual([])
    expect(result.rows.every((row) => row.left!.status === 'same' && row.right!.status === 'same')).toBe(true)
    // 行号必须从 1 起、逐行递增。
    expect(result.rows.map((row) => row.left!.lineNo)).toEqual([1, 2, 3, 4])
  })

  it('末尾换行与 CRLF 不算差异', () => {
    const trailing = diffTextLines('甲\n乙\n', '甲\n乙')
    expect(trailing.hunkCount).toBe(0)

    const crlf = diffTextLines('甲\r\n乙\r\n', '甲\n乙')
    expect(crlf.hunkCount).toBe(0)
    expect(crlf.rows).toHaveLength(2)
  })

  it('左侧独有的一行：左侧标 removed、右侧留空占位', () => {
    const result = diffTextLines('甲\n只有左边有\n乙', '甲\n乙')
    expect(result.hunkCount).toBe(1)
    expect(result.changedLineCount).toBe(1)
    expect(result.rows).toHaveLength(3)
    expect(statusAt(result, 1, 'left')).toBe('removed')
    expect(textAt(result, 1, 'left')).toBe('只有左边有')
    expect(result.rows[1].right).toBeNull()
    // 关键：留空之后第二行仍然左右对齐，行号没有串位。
    expect(textAt(result, 2, 'left')).toBe('乙')
    expect(textAt(result, 2, 'right')).toBe('乙')
    expect(result.rows[2].left!.lineNo).toBe(3)
    expect(result.rows[2].right!.lineNo).toBe(2)
  })

  it('右侧独有的一行：右侧标 added、左侧留空占位', () => {
    const result = diffTextLines('甲\n乙', '甲\n只有右边有\n乙')
    expect(result.hunkCount).toBe(1)
    expect(result.rows).toHaveLength(3)
    expect(result.rows[1].left).toBeNull()
    expect(statusAt(result, 1, 'right')).toBe('added')
    expect(textAt(result, 1, 'right')).toBe('只有右边有')
    expect(result.rows[2].left!.lineNo).toBe(2)
    expect(result.rows[2].right!.lineNo).toBe(3)
  })

  it('同一位置的改写会并排成一行，并给出行内变更片段', () => {
    const result = diffTextLines('1.#91757 仓库禁启用', '1.#91757 仓库禁启用状态')
    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]
    expect(row.left!.status).toBe('removed')
    expect(row.right!.status).toBe('added')
    expect(row.left!.segments).toBeTruthy()

    // 只有追加的「状态」两字属于变更，前面完全相同的一段必须保持未变更。
    const changedOf = (segments: { text: string; changed: boolean }[] | null) =>
      (segments ?? []).filter((segment) => segment.changed).map((segment) => segment.text).join('')
    expect(changedOf(row.left!.segments)).toBe('')
    expect(changedOf(row.right!.segments)).toBe('状态')
    // 片段拼接必须无损还原原文。
    expect((row.left!.segments ?? []).map((segment) => segment.text).join('')).toBe('1.#91757 仓库禁启用')
    expect((row.right!.segments ?? []).map((segment) => segment.text).join('')).toBe('1.#91757 仓库禁启用状态')
  })

  it('改动落在行中间时只标中间那段', () => {
    const result = diffTextLines('前置内容【旧版】后置内容', '前置内容【新版】后置内容')
    const row = result.rows[0]
    const changedOf = (side: 'left' | 'right') =>
      (row[side]!.segments ?? []).filter((segment) => segment.changed).map((segment) => segment.text)
    expect(changedOf('left')).toEqual(['旧'])
    expect(changedOf('right')).toEqual(['新'])
  })

  it('两行几乎不相同时不做行内细分（整行变色更好读）', () => {
    const result = diffTextLines('完全不同的第一版内容', 'This is a totally different line.')
    const row = result.rows[0]
    expect(row.left!.status).toBe('removed')
    expect(row.left!.segments).toBeNull()
    expect(row.right!.segments).toBeNull()
  })

  it('左右变更行数不等时：多出来的一侧各自占一行', () => {
    const result = diffTextLines('头\n左一\n左二\n尾', '头\n右一\n尾')
    expect(result.hunkCount).toBe(1)
    // 头、尾 + 并排 1 行 + 左侧多出的 1 行
    expect(result.rows).toHaveLength(4)
    expect(textAt(result, 1, 'left')).toBe('左一')
    expect(textAt(result, 1, 'right')).toBe('右一')
    expect(textAt(result, 2, 'left')).toBe('左二')
    expect(result.rows[2].right).toBeNull()
    expect(textAt(result, 3, 'left')).toBe('尾')
  })

  it('相隔的两处差异算两处，且记录起始行下标', () => {
    const result = diffTextLines('A\n改我\nB\nC\n再改我', 'A\n改过\nB\nC\n再改过')
    expect(result.hunkCount).toBe(2)
    expect(result.changedLineCount).toBe(2)
    expect(result.hunkStartIndexes).toEqual([1, 4])
  })

  it('重复行不会让对齐错乱', () => {
    const result = diffTextLines('重复\n甲\n重复\n乙', '重复\n重复\n乙')
    expect(result.rows).toHaveLength(4)
    expect(statusAt(result, 1, 'left')).toBe('removed')
    expect(textAt(result, 1, 'left')).toBe('甲')
    expect(result.rows[1].right).toBeNull()
    expect(textAt(result, 2, 'left')).toBe('重复')
    expect(textAt(result, 2, 'right')).toBe('重复')
  })

  it('空正文的各种组合都不炸', () => {
    const both = diffTextLines('', '')
    expect(both.rows).toEqual([])
    expect(both.hunkCount).toBe(0)

    const emptyLeft = diffTextLines('', '甲\n乙')
    expect(emptyLeft.rows).toHaveLength(2)
    expect(emptyLeft.rows[0].left).toBeNull()
    expect(statusAt(emptyLeft, 0, 'right')).toBe('added')
    expect(emptyLeft.hunkCount).toBe(1)

    const emptyRight = diffTextLines('甲\n乙', '')
    expect(emptyRight.rows).toHaveLength(2)
    expect(emptyRight.rows[0].right).toBeNull()
    expect(statusAt(emptyRight, 0, 'left')).toBe('removed')
  })

  it('超长文本走降级分支：不抛错、两侧内容一字不少', () => {
    const size = 2200
    const left = Array.from({ length: size }, (_, index) => `左侧第 ${index} 行`)
    const right = Array.from({ length: size }, (_, index) => `右侧第 ${index} 行`)
    const result = diffTextLines(left.join('\n'), right.join('\n'))
    // 超阈值后不再跑全表 DP（会吃掉几十 MB 内存），改为「左侧整段 + 右侧整段」顺序输出；
    // 但无论走哪条分支，两侧的内容都不能少一行 —— 漏行等于让用户在对比里看不到自己写的东西。
    const leftRows = result.rows.filter((row) => row.left)
    const rightRows = result.rows.filter((row) => row.right)
    expect(leftRows).toHaveLength(size)
    expect(rightRows).toHaveLength(size)
    expect(leftRows[0].left!.text).toBe('左侧第 0 行')
    expect(leftRows[size - 1].left!.text).toBe(`左侧第 ${size - 1} 行`)
    expect(rightRows[0].right!.text).toBe('右侧第 0 行')
    expect(rightRows[size - 1].right!.text).toBe(`右侧第 ${size - 1} 行`)
    // 行号也要连续，否则界面上的行号会出现空洞。
    expect(leftRows.map((row) => row.left!.lineNo)).toEqual(
      Array.from({ length: size }, (_, index) => index + 1)
    )
  })

  it('真实样本：能定位到「上一版多了一条编号」', () => {
    const shared = [
      '日报',
      '',
      '2026-10-08',
      '',
      '1.#91757 【中山BE-迭代二】仓库禁启用状态也根据领猫更新',
      '2.#91755 【中山BE-迭代二】二次工艺外发单节点数没有统计到外发加工单列表',
      '3.#91763 【中山BE-迭代二】最新裁剪数SS端没显示'
    ]
    const left = [...shared, '4.#91793 【中山BE-迭代三】单价取工序表实际单价实际维护值，不用处理小数位', '', '2026-09-24', '1.#91712 更新生产节点后，发现节点还是有领猫不存在的节点']
    const right = [...shared, '', '2026-09-24', '1.#91712 更新生产节点后，发现节点还是有领猫不存在的节点']

    const result = diffTextLines(left.join('\n'), right.join('\n'))
    expect(result.hunkCount).toBe(1)
    const removed = result.rows.filter((row) => row.left && row.right === null)
    expect(removed).toHaveLength(1)
    expect(removed[0].left!.text).toMatch(/#91793/)
    expect(removed[0].left!.lineNo).toBe(8)
    // 两侧共有部分必须逐行对齐，不能因为中间插了一行就整体错位。
    const sharedRow = result.rows.find((row) => row.left?.text === '2026-09-24')
    expect(sharedRow).toBeTruthy()
    expect(sharedRow!.left!.status).toBe('same')
    expect(sharedRow!.right!.status).toBe('same')
  })
})

describe('splitDiffLines（切物理行）', () => {
  it('空正文切出零行', () => {
    expect(splitDiffLines('')).toEqual([])
  })

  it('末尾换行不额外产生一行', () => {
    expect(splitDiffLines('甲\n乙\n')).toEqual(['甲', '乙'])
  })

  it('CRLF 统一成 LF', () => {
    expect(splitDiffLines('甲\r\n乙')).toEqual(['甲', '乙'])
  })
})
