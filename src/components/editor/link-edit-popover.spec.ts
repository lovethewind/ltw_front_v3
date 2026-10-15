import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  LINK_EDIT_POPOVER_GAP,
  LINK_EDIT_POPOVER_MARGIN,
  LINK_EDIT_POPOVER_MIN_WIDTH,
  LINK_EDIT_POPOVER_WIDTH,
  computeLinkEditPopoverPosition
} from '../../utils/link-edit-popover'

/**
 * 读取源码文本。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

/**
 * 构造一个链接包围盒。
 */
function anchor(left: number, top: number, width: number, height = 20) {
  return { left, right: left + width, top, bottom: top + height }
}

/**
 * 取 MdEditor.vue 样式里链接气泡覆写那一段。
 *
 * ⚠️ 返回前**剥掉注释**：这段开头为了交代来历会引用 `.milkdown-link-edit`、
 * 十六进制色这类已废弃的名字，不剥的话 `doesNotMatch` 会被自己的注释绊倒。
 */
function readLinkTooltipStyleBlock(): string {
  const css = read('./MdEditor.vue')
  const start = css.indexOf('/* ── 链接气泡美化覆写')
  const end = css.indexOf('.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-divider', start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * 链接编辑浮层的定位数学 —— **真行为断言**。
 *
 * 这块最典型的静默失效是「浮层跑到屏幕外」：链接贴着编辑区右缘、或窗口很矮时才发生，
 * 字符串级断言完全看不出来（与桌面端 tests/link-edit-popover.test.cjs 同口径）。
 */
describe('链接编辑浮层定位（真行为）', () => {
  it('默认摆在链接上方，左缘与链接对齐', () => {
    const result = computeLinkEditPopoverPosition(anchor(300, 500, 80), { width: 1200, height: 900 }, 186)

    expect(result.placement).toBe('above')
    expect(result.left).toBe(300)
    expect(result.top).toBe(500 - 186 - LINK_EDIT_POPOVER_GAP)
    expect(result.width).toBe(LINK_EDIT_POPOVER_WIDTH)
  })

  it('上方空间不足时翻到下方（不遮住刚点的那条链接）', () => {
    const result = computeLinkEditPopoverPosition(anchor(300, 100, 80), { width: 1200, height: 900 }, 186)

    expect(result.placement).toBe('below')
    expect(result.top).toBe(120 + LINK_EDIT_POPOVER_GAP)
  })

  it('链接贴着视口右缘时，浮层被推回视口内', () => {
    const result = computeLinkEditPopoverPosition(anchor(1100, 500, 80), { width: 1200, height: 900 }, 186)

    expect(result.left).toBe(1200 - LINK_EDIT_POPOVER_WIDTH - LINK_EDIT_POPOVER_MARGIN)
    expect(result.left + result.width).toBeLessThanOrEqual(1200)
  })

  it('窄窗口下宽度压缩，但不小于下限、也不横向溢出', () => {
    const narrow = computeLinkEditPopoverPosition(anchor(20, 500, 60), { width: 300, height: 900 }, 186)

    expect(narrow.width).toBe(300 - LINK_EDIT_POPOVER_MARGIN * 2)
    expect(narrow.left).toBe(LINK_EDIT_POPOVER_MARGIN)

    // 比下限还窄：宁可溢出也要能读（两行「标题 / 地址」摆不下就没法用了）。
    const tiny = computeLinkEditPopoverPosition(anchor(10, 500, 40), { width: 200, height: 900 }, 186)
    expect(tiny.width).toBe(LINK_EDIT_POPOVER_MIN_WIDTH)
  })

  it('上下都放不下（窗口极矮）时仍夹在视口内', () => {
    const result = computeLinkEditPopoverPosition(anchor(60, 30, 40), { width: 800, height: 150 }, 186)

    expect(result.top).toBeGreaterThanOrEqual(LINK_EDIT_POPOVER_MARGIN)
    expect(result.top + Math.min(186, 150 - LINK_EDIT_POPOVER_MARGIN * 2)).toBeLessThanOrEqual(150)
  })
})

/**
 * 浮层组件本身的接线。
 */
describe('链接编辑浮层组件', () => {
  const source = read('./LinkEditPopover.vue')

  it('挂在 body 上并带自己的层级（要盖过编辑器顶栏）', () => {
    expect(source).toMatch(/<Teleport to="body">/)
    expect(source).toMatch(/position: fixed;/)
    expect(source).toMatch(/z-index: 240;/)
  })

  it('字段与底部两个出口', () => {
    expect(source).toMatch(/<span class="link-edit-popover__label">标题<\/span>/)
    expect(source).toMatch(/<span class="link-edit-popover__label">地址<\/span>/)
    // 「取消链接」应只在已有链接时出现
    expect(source).toMatch(/v-if="props\.canRemove"/)
    expect(source).toMatch(/link-edit-popover__save/)
    // 两个输入框都双向绑定到本地 ref（父级用 v-if 装卸，不需要 watch）
    expect(source).toMatch(/const title = ref\(props\.title\)/)
    expect(source).toMatch(/const href = ref\(props\.href\)/)
  })

  it('键盘口径：Esc 关闭、Enter 保存，且不能被输入法组词误触', () => {
    expect(source).toMatch(/if \(event\.key === 'Escape'\)[\s\S]*?emit\('close'\)/)
    // ⚠️ 中文输入时按 Enter 是「上屏候选词」，不判 isComposing 会在选字瞬间把弹窗关掉
    expect(source).toMatch(/if \(event\.key === 'Enter' && !event\.isComposing\)/)
  })

  it('点浮层外部即关闭，且监听在卸载时收走', () => {
    expect(source).toMatch(/addEventListener\('pointerdown', handleOutsidePointerDown, true\)/)
    expect(source).toMatch(/removeEventListener\('pointerdown', handleOutsidePointerDown, true\)/)
    expect(source).toMatch(/popoverRef\.value\?\.contains\(target\)/)
  })

  it('焦点落在需要填的那个输入框上', () => {
    expect(source).toMatch(
      /const focusTarget = href\.value\.trim\(\) \? titleInputRef\.value : hrefInputRef\.value/
    )
  })

  it('配色走 Element Plus 变量，不许用只在 .milkdown 作用域里定义的 --crepe-color-*', () => {
    // ⚠️ 浮层 Teleport 到 body，早已在 `.milkdown-editor-root .milkdown` 之外 ——
    // `--crepe-color-*` 是定义在那个作用域里的，这里取不到值（会整块变透明/继承成黑）。
    expect(source).not.toMatch(/crepe-color-/)
    for (const variable of [
      'var(--el-border-color',
      'var(--el-bg-color',
      'var(--el-text-color-primary',
      'var(--el-color-primary'
    ]) {
      expect(source).toContain(variable)
    }
    // 暗色只需重写投影（其余随 html.dark 自动切换）。
    expect(source).toMatch(/html\.dark \.link-edit-popover \{[\s\S]*?box-shadow:/)
  })
})

/**
 * 编辑器侧接线。
 *
 * 这些断言守的是「接上了没有」——任一段断掉都是**静默失效**（点编辑还是 Crepe 那个
 * 一行输入框、点打开没反应、复制把剪贴板覆盖了），不会报错。
 */
describe('链接编辑接线（MdEditor.vue）', () => {
  const source = read('./MdEditor.vue')

  it('浮层接进模板并挂上三个出口', () => {
    expect(source).toMatch(
      /<LinkEditPopover\s*\n\s*v-if="linkEditState"[\s\S]*?@save="saveLinkEdit"[\s\S]*?@remove="removeLinkEdit"[\s\S]*?@close="closeLinkEditor"[\s\S]*?\/>/
    )
    // 新建链接时没有可取消的链接，按钮要隐藏
    expect(source).toMatch(/:can-remove="Boolean\(linkEditState\.mark\)"/)
  })

  it('Crepe 的链接编辑气泡被接管：addLink / editLink 都转给自研浮层', () => {
    expect(source).toMatch(
      /context\.update\(linkTooltipAPI\.key, \(api\) => \(\{[\s\S]*?addLink: \(from, to\) => openLinkEditor\(null, from, to\)[\s\S]*?editLink: \(mark, from, to\) => openLinkEditor\(mark, from, to\)[\s\S]*?\}\)\)/
    )
    // 用 Crepe 自己的 mode='edit' 机制：它会顺手隐藏预览气泡并禁止悬停再弹回来
    expect(source).toMatch(
      /setLinkTooltipMode = \(mode\) => \{\s*\n\s*context\.update\(linkTooltipState\.key, \(state\) => \(\{ \.\.\.state, mode \}\)\)\s*\n\s*\}/
    )
    // ⚠️ 覆写必须在 create() 之后，否则会被插件安装时写入的实现盖回去
    const createAt = source.indexOf('await crepe.create()')
    const overrideAt = source.indexOf('context.update(linkTooltipAPI.key')
    expect(createAt).toBeGreaterThan(-1)
    expect(overrideAt).toBeGreaterThan(createAt)
  })

  it('保存 / 取消链接的口径写死在源码里', () => {
    // 标题改写链接文字；地址清空 = 摘链接
    expect(source).toMatch(/const href = payload\.href\.trim\(\)/)
    expect(source).toMatch(/if \(!href\) \{\s*\n\s*removeLinkEdit\(\)\s*\n\s*return\s*\n\s*\}/)
    // ⚠️ 附件链接的 title 属性要原样沿用（丢了附件就退化成普通外链）
    expect(source).toMatch(
      /const keptTitle = typeof state\.mark\?\.attrs\.title === 'string' \? state\.mark\.attrs\.title : null/
    )
    expect(source).toMatch(/title: keptTitle \}\)/)
    expect(source).toMatch(/message: '链接已更新'/)
    expect(source).toMatch(/message: '已取消链接'/)
  })

  it('气泡左槽位换成「打开（带文字）/ 复制」两个按钮', () => {
    expect(source).toMatch(
      /const LINK_TOOLTIP_ACTIONS_ICON = `[\s\S]*?xynote-link-tooltip-open[\s\S]*?xynote-link-tooltip-copy[\s\S]*?`/
    )
    // URL 文本已拿掉，只剩图标看不出主操作，所以「打开」必须带文字标签
    expect(source).toMatch(
      /xynote-link-tooltip-open[\s\S]{0,400}?xynote-link-tooltip-open-label">打开</
    )
    // 图标常量必须真的接进 LinkTooltip 配置
    expect(source).toMatch(
      /\[Crepe\.Feature\.LinkTooltip\]: \{[\s\S]*?linkIcon: LINK_TOOLTIP_ACTIONS_ICON[\s\S]*?\}/
    )
    // 复制要给反馈 —— Crepe 默认的 onCopyLink 是空函数，点了没有任何提示
    expect(source).toMatch(/onCopyLink: \(\) => \{\s*\n\s*ElMessage\(\{ message: '链接已复制'/)
  })

  it('「打开」按钮必须走捕获阶段抢在 Crepe 的复制之前', () => {
    expect(source).toMatch(/addEventListener\('pointerdown', handleLinkTooltipPointerDown, true\)/)
    expect(source).toMatch(/removeEventListener\('pointerdown', handleLinkTooltipPointerDown, true\)/)
    // 先掐传播再触发：反过来就是「打开 + 静默复制」两份副作用
    expect(source).toMatch(
      /function handleLinkTooltipPointerDown\(event: PointerEvent\): void \{[\s\S]*?closest\('\.xynote-link-tooltip-open'\)[\s\S]*?event\.preventDefault\(\)\s*\n\s*event\.stopPropagation\(\)[\s\S]*?a\.link-display'\)\s*\n?\s*\?\.click\(\)/
    )
  })

  it('气泡内的链接点击一律视为打开（不要求修饰键）', () => {
    expect(source).toMatch(
      /const insideLinkTooltip = Boolean\(anchor\.closest\('\.milkdown-link-preview'\)\)/
    )
    // ⚠️ 判据只能是 `closest('a[href]')`：编辑 / 删除按钮不是 <a>，天然不受影响
    expect(source).toMatch(/target\.closest<HTMLAnchorElement>\('a\[href\]'\)/)
    expect(source).toMatch(
      /const requiresModifier = !props\.readonly && !insideLinkTooltip/
    )
  })

  it('URL 只隐藏、不删节点（「打开」按钮靠它复用正文链接的分流）', () => {
    const block = readLinkTooltipStyleBlock()

    expect(block).toMatch(/\.link-preview > \.link-display \{ display: none; \}/)
    expect(block).not.toMatch(/\.link-display \{[\s\S]{0,120}?width: 220px;/)
    expect(source).toMatch(/\?\.querySelector<HTMLAnchorElement>\('a\.link-display'\)/)
  })

  it('气泡美化覆写：只走变量、特异性够、层级兜底', () => {
    const block = readLinkTooltipStyleBlock()

    // 层级兜底：顶栏被项目抬到 20，Crepe 只给气泡 10
    expect(block).toMatch(/\.milkdown-link-preview \{ z-index: 30; \}/)
    expect(block).toMatch(/border-radius: 12px;/)
    expect(block).toMatch(/border: 1px solid var\(--milkdown-toolbar-divider\);/)
    expect(block).toMatch(/background: var\(--crepe-color-surface\);/)
    // 特异性：Crepe 自带的同款规则是 4 个类，必须靠整条链多一层
    expect(block).toMatch(
      /\.milkdown-editor-root \.milkdown \.milkdown-link-preview > \.link-preview > \.link-display \{/
    )
    // 左槽位退化成透明容器：hover 底色只落在里面两个按钮上
    expect(block).toMatch(
      /\.link-preview > \.link-icon \{ width: auto; padding: 0; gap: 2px; background: transparent; \}/
    )
    expect(block).toMatch(/\.link-preview > \.link-icon:hover \{ background: transparent; \}/)
    // 方块按钮 30px、图标 19px
    expect(block).toMatch(/width: 30px;/)
    expect(block).toMatch(/height: 30px;/)
    expect(block).toMatch(/width: 19px;\s*\n\s*height: 19px;/)
    expect(block).toMatch(
      /\.xynote-link-tooltip-open \{ width: auto; gap: 5px; padding: 0 9px; color: var\(--milkdown-toolbar-icon\); \}/
    )
    expect(block).toMatch(/\.xynote-link-tooltip-open-label \{ font-size: 13px; font-style: normal;/)
    // 配色只允许走 var()（否则暗色主题下会白底白字）
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    // Crepe 自带编辑气泡已被接管 → 它的覆写规则属于死代码，不许回来
    expect(block).not.toMatch(/\.milkdown-link-edit/)
    expect(block).not.toMatch(/\.link-edit > \.input-area/)
    expect(block).not.toMatch(/\.confirm/)
  })

  it('暗色主题只需重写投影', () => {
    expect(source).toMatch(
      /html\.dark \.milkdown-editor-root \.milkdown \.milkdown-link-preview > \.link-preview \{\s*\n\s*box-shadow:/
    )
  })

  it('卸载编辑器时一并收走浮层状态与滚动 / 缩放监听', () => {
    expect(source).toMatch(
      /unbindLinkEditTracking\(\)\s*\n\s*linkEditState\.value = null\s*\n\s*linkEditEditorView = null\s*\n\s*setLinkTooltipMode = null/
    )
  })
})