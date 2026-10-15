import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取源码文本。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

/**
 * 选中气泡里的字号（Crepe `Feature.Toolbar` 扩展点 + portal 面板 + 两条捕获守卫）。
 *
 * 这条链的每一环断了都是**静默失效**：编辑器照常能开，只是气泡里少一个按钮、
 * 或者点开面板「按住才在、一松手就消失」。所以逐条钉住接线事实。
 *
 * ⚠️ 断言一律用 `[^}]*?` 限定在单个 `{}` 块内 —— 用 `[\s\S]*?` 会跨规则匹配到别处
 * 同名声明，回退源码时不转红，等于假绿（本项目已有先例）。
 */
describe('选中气泡字号接线', () => {
  it('气泡里追加了字号项，onRun 指向面板开合', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/\[Crepe\.Feature\.Toolbar\]: \{/)
    expect(source).toMatch(/builder\.getGroup\('formatting'\)\.addItem\('xynote-font-size'/)
    expect(source).toMatch(/onRun: \(\) => toggleBubbleFontSizePanel\(\)/)
    // 与 B/I/S 同一口径：选区起点带字号标记时点亮。
    expect(source).toMatch(/active: \(activeCtx\) => \{[^}]*?isInSet/)
  })

  it('触发器图标带标记 span —— 它同时是反查按钮的锚点与 CSS :has() 的钩子', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/const FONT_SIZE_TRIGGER_ICON = `[\s\S]*?class="xynote-fs-trigger"[\s\S]*?`/)
    expect(source).toMatch(/function findBubbleFontSizeTrigger\(\): HTMLElement \| null \{[^}]*?\.xynote-fs-trigger/)
    // 先回到整个按钮再反查标记：按钮被 :has() 放宽后，落在左右留白上时 target 是 button 本身。
    expect(source).toMatch(/closest<HTMLElement>\('\.toolbar-item'\) \?\? null/)
  })

  it('面板 portal 到 body 并用 is-portal-open 显形', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/document\.body\.append\(bubbleFontSizePanel\)/)
    expect(source).toMatch(/bubbleFontSizePanel\.classList\.add\('is-portal-open'\)/)
    // 宿主必须在编辑器根节点内，才能被 closeToolbarMenus() 的既有收合路径覆盖。
    expect(source).toMatch(/editorRootRef\.value\?\.append\(bubbleFontSizeHost\)/)
    expect(source).toMatch(/markdown-toolbar-menu markdown-font-size-menu__bubble-host/)
  })

  it('面板放不下时翻到按钮上方', () => {
    const source = read('./MdEditor.vue')

    // ⚠️ 贴下方 + clamp 会把面板顶回去盖住按钮 → 用户再也点不回去收起来。
    expect(source).toMatch(/const fitsBelow = rect\.bottom \+ gap \+ panelHeight <= window\.innerHeight - 12/)
    expect(source).toMatch(/const fitsAbove = rect\.top - gap - panelHeight >= 12/)
    expect(source).toMatch(/const top = fitsBelow \|\| !fitsAbove \? rect\.bottom \+ gap : rect\.top - gap - panelHeight/)
  })

  it('开关分处 pointerdown / click，判定只认「按下」的落点', () => {
    const source = read('./MdEditor.vue')

    // 只监听 pointerdown 的按钮 + document 上常驻的 click 关闭 = 面板刚开就被关。
    expect(source).toMatch(/const item = target\?\.closest\?\.<HTMLElement>\('\.milkdown-toolbar \.toolbar-item'\)/)
    expect(source).toMatch(/bubbleFontSizeArmed = Boolean\(item\?\.querySelector\('\.xynote-fs-trigger'\)\)/)
    // 只看按下时打的标记；必须注册在捕获阶段，早于冒泡阶段的关闭监听。
    expect(source).toMatch(/function guardBubbleFontSizeClick\(event: MouseEvent\): void \{\s*if \(!bubbleFontSizeArmed\) return/)
    expect(source).toMatch(/document\.addEventListener\('pointerdown', trackBubbleFontSizePointerDown, true\)/)
    expect(source).toMatch(/document\.addEventListener\('click', guardBubbleFontSizeClick, true\)/)
  })

  it('关闭路径接全：点空白、滚动、销毁', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/document\.addEventListener\('click', closeBubbleFontSizePanel\)/)
    expect(source).toMatch(/function handleEditorScroll\(\): void \{[^}]*?closeBubbleFontSizePanel\(\)/)
    expect(source).toMatch(/removeEventListener\('pointerdown', trackBubbleFontSizePointerDown, true\)/)
    expect(source).toMatch(/removeEventListener\('click', guardBubbleFontSizeClick, true\)/)
    // 面板在 body、宿主在编辑器内，销毁时两边都要摘干净。
    expect(source).toMatch(/bubbleFontSizeHost\?\.remove\(\)/)
    expect(source).toMatch(/bubbleFontSizePanel\?\.remove\(\)/)
  })

  it('点档位时顶栏下拉与气泡面板一起收', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/applyInlineFontSize\(size\)\s*closeFontSizeMenus\(\)/)
    expect(source).toMatch(/function closeFontSizeMenus\(\): void \{[^}]*?closeToolbarMenus\(\)[^}]*?closeBubbleFontSizePanel\(\)/)
  })
})

describe('选中气泡外观（对齐顶栏语系）', () => {
  it('气泡本体覆写成 12px 圆角 + 描边 + 抬到顶栏之上', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/\.milkdown-editor-root \.milkdown \.milkdown-toolbar \{[^}]*?z-index: 30;[^}]*?border-radius: 12px;/)
    // 顶栏是 sticky + z-index 20，气泡不抬就会被顶栏画在上面。
    expect(source).toMatch(/\.milkdown-top-bar \{\s*position: sticky;\s*z-index: 20;/)
  })

  it('字号触发器按钮放宽以装下小箭头', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/\.toolbar-item:has\(\.xynote-fs-trigger\) \{[^}]*?width: auto;/)
    expect(source).toMatch(/\.xynote-fs-trigger \{[^}]*?display: inline-flex;/)
    expect(source).toMatch(/svg\.xynote-fs-caret \{[^}]*?width: 13px;/)
  })

  it('portal 面板抬到 140，暗色单独给投影', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/\.markdown-font-size-menu__panel\.is-portal-open \{[^}]*?z-index: 140;/)
    expect(source).toMatch(/html\.dark \.milkdown-editor-root \.milkdown \.milkdown-toolbar \{[^}]*?box-shadow/)
  })
})
