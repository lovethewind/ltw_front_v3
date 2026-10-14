import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const read = (relativePath: string) => readFileSync(resolve(__dirname, relativePath), 'utf8')

const drawer = read('NoteHistoryDrawer.vue')
const viewer = read('NoteDiffViewer.vue')
const workspace = read('../../views/note/NoteWorkspace.vue')
const styles = read('../../assets/css/note.scss')

/**
 * 历史版本「对比改动」的接线守卫。
 *
 * 差异算法本身由 `src/utils/text-diff.spec.ts` 用真实数据守住；这里只钉接线，
 * 因为有两件事**不会报任何错**、错了也只是「看起来没改动」：
 *
 * 1. 「上一版」取错方向（取成更新的一条）—— 差异整体反过来，用户据此判断
 *    「这一版加了什么」会得到相反结论；
 * 2. 基准正文没到手就渲染 —— 未加载的一侧是空串，界面显示成「整篇都是新增」，
 *    与真的新增无法区分。
 */
describe('历史版本抽屉：预览 / 对比改动 双档', () => {
  it('有两个档位，默认落在对比档', () => {
    expect(drawer).toMatch(/const viewMode = ref<'preview' \| 'diff'>\('diff'\)/)
    expect(drawer).toMatch(/<el-radio-button value="preview">预览<\/el-radio-button>/)
    expect(drawer).toMatch(/<el-radio-button value="diff">对比改动<\/el-radio-button>/)
    expect(drawer).toMatch(/class="note-history-mode"[\s\S]*?aria-label="历史版本查看方式"/)
  })

  it('预览档保留原来的只读编辑器', () => {
    expect(drawer).toMatch(/<MdEditor\s+v-if="viewMode === 'preview'"/)
  })

  it('对比档复用 NoteDiffViewer，左=上一版、右=选中版本', () => {
    expect(drawer).toMatch(/import NoteDiffViewer from '@\/components\/note\/NoteDiffViewer\.vue'/)
    expect(drawer).toContain(':left-content="previousHistory?.content ?? \'\'"')
    expect(drawer).toContain(':right-content="selected.content"')
    expect(drawer).toContain(':left-label="previousHistory ? \'上一版\' : \'无更早版本\'"')
    expect(drawer).toContain('right-label="此版本"')
  })

  it('基准正文没到手之前不渲染差异（否则整篇被误读成新增）', () => {
    expect(drawer).toMatch(/<p v-if="previousLoading" class="note-history-hint">正在读取版本内容…<\/p>/)
    expect(drawer).toMatch(/previousLoading\?: boolean/)
  })

  it('最旧的一版没有更早版本可比时给出提示，而不是静默留一片新增色', () => {
    expect(drawer).toMatch(/<p v-if="!previousHistory" class="note-history-hint is-inline">/)
  })
})

describe('历史版本抽屉：数据层取「上一版」', () => {
  it('「上一版」取列表中更旧的那一条（下标 +1）', () => {
    // 列表按时间倒序，所以「更旧」在下标更大的方向。
    expect(workspace).toMatch(/return index >= 0 \? \(histories\.value\[index \+ 1\] \?\? null\) : null/)
    expect(workspace).toMatch(/function findOlderHistory\(historyId: ApiId\): INoteHistoryListItem \| null/)
  })

  it('选中版本时把「上一版」的正文一起取回（同一个接口，带缓存）', () => {
    expect(workspace).toMatch(/await fetchHistoryDetail\(noteId, historyId\)[\s\S]*?await loadPreviousHistory\(noteId, historyId, requestId\)/)
    expect(workspace).toMatch(/const cached = historyDetailCache\.value\[String\(historyId\)\]/)
  })

  it('切换版本时先清空基准，避免上一个版本的「上一版」残留', () => {
    expect(workspace).toMatch(
      /async function selectHistory[\s\S]*?previousHistory\.value = null[\s\S]*?await fetchHistoryDetail/
    )
  })

  it('缓存跟着笔记走（换笔记后旧版本正文作废）', () => {
    expect(workspace).toMatch(/historyDetailCache\.value = \{\}/)
  })

  it('抽屉拿到基准与加载态', () => {
    expect(workspace).toMatch(/:previous-history="previousHistory"/)
    expect(workspace).toMatch(/:previous-loading="previousHistoryLoading"/)
  })
})

describe('NoteDiffViewer：结构与差异渲染', () => {
  it('左右两列共用同一个滚动容器（同步滚动的前提）', () => {
    const template = viewer.slice(viewer.indexOf('<template>'))
    const scrollIndex = template.indexOf('class="note-diff__scroll"')
    const rowsIndex = template.indexOf('class="note-diff__row"')
    expect(scrollIndex).toBeGreaterThan(-1)
    expect(rowsIndex).toBeGreaterThan(scrollIndex)
  })

  it('两列用同一套网格列，保证同行等高、行号对齐', () => {
    expect(styles).toMatch(/\.note-diff__columns,\s*\n\s*\.note-diff__row \{\s*\n\s*display: grid;\s*\n\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  })

  it('差异行、填充行与行内高亮都有对应实现', () => {
    expect(viewer).toContain("'is-removed': cell.status === 'removed'")
    expect(viewer).toContain("'is-added': cell.status === 'added'")
    expect(viewer).toContain("'is-void': true")
    expect(viewer).toMatch(/<mark v-if="segment\.changed"/)
    expect(styles).toMatch(/\.note-diff__cell\.is-void \{/)
  })

  it('差异算法只有一个真源（视图层不自己再算一遍）', () => {
    expect(viewer).toMatch(/import \{ diffTextLines, type DiffCell, type DiffRow \} from '@\/utils\/text-diff'/)
  })

  it('换版本后重置跳转位置', () => {
    expect(viewer).toMatch(/currentHunk\.value = -1/)
    expect(viewer).toMatch(/scroller\.value\?\.scrollTo\(\{ top: 0 \}\)/)
  })

  it('暗色主题给差异配色单独覆盖（否则浅底浅字）', () => {
    expect(styles).toMatch(/html\.dark \.note-diff \{/)
    expect(styles).toMatch(/html\.dark \.note-diff__text \{ color: #e7ebf5; \}/)
    expect(styles).toMatch(/html\.dark \.note-diff__row\.is-diff \.note-diff__cell\.is-removed \{ background: rgb\(190 123 25 \/ 13%\); \}/)
    expect(styles).toMatch(/html\.dark \.note-diff__row\.is-diff \.note-diff__cell\.is-added \{ background: rgb\(65 126 191 \/ 16%\); \}/)
  })
})

/**
 * 版式守卫：抽屉宽度、档位高度、对比行高与底部留白。
 *
 * 这几条都属于「改了也不会报错、只是变得难用」的项：
 * 宽度写死会在宽窗口里把两列压窄（长引用链接成片折行），
 * 行高与底部留白少一点肉眼很难指认，但读起来挤、卡片贴着抽屉底沿。
 */
describe('历史版本抽屉：版式呼吸感', () => {
  it('宽度随视口走：窄窗口不缩到 760px 以下、宽窗口不封死在上限', () => {
    expect(drawer).toMatch(/size="min\(1120px, 94vw, max\(760px, 66vw\)\)"/)
  })

  it('档位切换的高度是显式给的（垂直 padding 归零会把控件压塌）', () => {
    // 🔴 EP 的 .el-radio-button__inner 靠 line-height:1 + padding:8px 15px 撑高度。
    // 只写 `padding: 0 16px` 会把 30px 的控件压成 ~16px 的一条小标签 —— 这正是
    // 「预览 / 对比改动 看着比旁边按钮矮一大截」的根因，所以 height 必须显式钉住。
    expect(drawer).toMatch(/<el-radio-group v-model="viewMode">/)
    expect(drawer).toMatch(
      /\.note-history-mode :deep\(\.el-radio-button__inner\) \{[\s\S]*?height: 30px;[\s\S]*?line-height: 28px;/
    )
  })

  it('档位按钮的文字比正文小一档（与桌面端 history-view-switch 的 12px 对齐）', () => {
    expect(drawer).toMatch(
      /\.note-history-mode :deep\(\.el-radio-button__inner\) \{[\s\S]*?font-size: 12px;/
    )
  })

  it('对比面板与档位行之间留出间距（卡片不能贴在档位下沿）', () => {
    // 对比面板自带边框 + 圆角 + 投影，是一张独立卡片；顶沿贴住档位会被读成
    // 「档位是卡片的一部分」。预览档的 .note-history-viewer 本就有 margin-top。
    expect(drawer).toMatch(/\.note-history-preview :deep\(\.note-diff\) \{\s*\n\s*margin-top: 14px;/)
  })

  it('对比行的行高：单元格上下各留 3px，正文 12px / 1.8', () => {
    expect(styles).toMatch(/\.note-diff__cell \{[\s\S]*?padding: 3px 8px 3px 0;/)
    expect(styles).toMatch(/\.note-diff__text \{[\s\S]*?font-size: 12px;\s*\n\s*line-height: 1\.8;/)
  })

  it('底部留白：抽屉 body 与预览区各让出一段', () => {
    // 卡片是 flex:1，两层都要有 —— 只靠 body 的 padding 在内容超高时会被 overflow 截掉。
    expect(drawer).toMatch(/padding: 18px 20px 26px;/)
    expect(drawer).toMatch(/padding: 18px 24px 10px;/)
  })
})
