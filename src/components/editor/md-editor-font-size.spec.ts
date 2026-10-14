import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取源码文本。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

/**
 * 行内字号在网页端是「四条链路 + 一个入口」，任一环断了都是**静默失效**
 * （编辑器照常能开，只是字号不往返、或下拉点了没反应），所以这里逐条钉住接线事实。
 * 纯逻辑行为另有 `src/utils/__tests__/inline-font-size.spec.ts` 用真实断言守住。
 */
describe('行内字号接线', () => {
  it('编辑器挂载了字号扩展', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/import \{ FONT_SIZE_MARK_NAME, installFontSizeFeature \} from '\.\/xynote-font-size'/)
    // 漏掉 addFeature 时 mark 不存在，prosemirror 侧会静默丢弃 selection 上的字号。
    expect(source).toMatch(/crepe\.addFeature\(installFontSizeFeature\)/)
  })

  it('字号下拉跟随选区刷新，且避开了 state.apply 内读旧 state 的坑', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/listener\.selectionUpdated\(/)
    // ⚠️ 回调在 ProseMirror 的 state.apply 内部同步触发，直接读 view.state 会慢一拍。
    expect(source).toMatch(/queueMicrotask\(\(\) => \{[\s\S]*?refreshFontSizeMenu\(\)/)
  })

  it('顶栏插入了字号下拉', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/function createFontSizeMenu\(\): HTMLDivElement/)
    expect(source).toMatch(/actions\.replaceChildren\(\s*\/\/[\s\S]*?createFontSizeMenu\(\),/)
  })

  it('设字号走「替换」语义而不是裸 addMark', () => {
    const source = read('./MdEditor.vue')

    // mark 声明了 excludes: ''，addToSet 是「叠加」，直接 addMark 会越改越嵌套。
    expect(source).toMatch(/tr\.removeMark\(range\.\$from\.pos, range\.\$to\.pos, markType\)/)
    expect(source).toMatch(/markType\.removeFromSet\(base\)/)
    // 默认档位只移除标记，不写 <span style="font-size:15px">。
    expect(source).toMatch(/tr\.setStoredMarks\(isDefault \? next : markType\.create\(\{ size: target \}\)\.addToSet\(next\)\)/)
  })

  it('字号选项用 pointerdown + preventDefault', () => {
    const source = read('./MdEditor.vue')

    // 无选区时改的是 storedMarks，焦点一跑就白设 —— 必须阻止焦点离开正文。
    expect(source).toMatch(/option\.addEventListener\('pointerdown', \(event\) => \{\s*event\.preventDefault\(\)/)
  })

  it('只读态禁用字号面板选项', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/\.markdown-font-size-menu__item'\)[\s\S]*?button\.disabled = isReadonly/)
  })
})
