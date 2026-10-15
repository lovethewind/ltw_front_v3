import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileStyle, parse } from '@vue/compiler-sfc'

// ⚠️ 必须指到 `<repo>/src`（不是仓库根）：`<style src="@/assets/css/modal.css">`
// 里的 `@` 别名解析到这个目录，少一层就会解析不到外引文件（第一版踩了，
// 靠 `includes('/src/')` 过滤碰巧蒙对，改结构后立刻暴露）。
const SRC = new URL('../', import.meta.url).pathname
const STYLE_EXT = new Set(['.vue', '.scss', '.css', '.sass', '.less'])

/**
 * 递归收集源码目录下所有样式宿主文件。
 *
 * @param dir 目录。
 * @returns 绝对路径数组。
 */
function collectStyleFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectStyleFiles(full))
    } else if (STYLE_EXT.has(extname(full))) {
      out.push(full)
    }
  }
  return out
}

/**
 * 真编译一段样式，返回最终 CSS。
 *
 * @param content 样式源码。
 * @param scoped 是否 scoped。
 * @returns 编译后的 CSS。
 */
function compileCss(content: string, scoped: boolean): string {
  return compileStyle({ filename: 'x.vue', source: content, id: 'data-v-probe', scoped }).code
}

/**
 * 收集「实际会带 scoped 处理」的样式集合。
 *
 * 🔴 坑：`modal.css` / `header.scss` 自身**没有** `scoped` 属性，
 * 但它们通过 `<style src="@/assets/css/modal.css" scoped />` 引入 ——
 * **scoped 是引用方的属性**。第一版守卫只读文件自身的 `style.scoped`，
 * 于是把这两个文件跳过了，漏掉了 `modal.css` 里同样的一整块坏规则
 * （`color:#b9c0cc` / `background:#121821` 等，实测污染到全页 html）。
 *
 * @returns 待检查的 { file, content, scoped, via } 列表。
 */
function collectScopedStyles(): Array<{ file: string; content: string; scoped: boolean; via: string }> {
  const out: Array<{ file: string; content: string; scoped: boolean; via: string }> = []
  const sources = collectStyleFiles(SRC)

  for (const file of sources) {
    if (extname(file) !== '.vue') {
      // 非 .vue 文件的 scoped 取决于引用方，单独在下面按引用关系收集。
      continue
    }
    const raw = readFileSync(file, 'utf8')
    const { descriptor } = parse(raw, { filename: file })

    // ① 内联 style 块：scoped 属性就在块上。
    for (const style of descriptor.styles) {
      if (style.src) continue
      out.push({ file, content: style.content, scoped: !!style.scoped, via: 'inline' })
    }

    // ② 外引 style 块（`<style src="…" scoped />`）：**scoped 写在引用方**。
    for (const style of descriptor.styles) {
      if (!style.src) continue
      // src 形如 `@/assets/css/modal.css`（别名 `@` → src）。
      const rel = style.src.replace(/^@/, '').replace(/^~/, '')
      const resolved = join(SRC, rel)
      let content = ''
      try {
        content = readFileSync(resolved, 'utf8')
      } catch {
        continue // 解析不到就跳过，不让守卫因为路径写法而误报
      }
      out.push({ file: resolved, content, scoped: !!style.scoped, via: file.replace(SRC, 'src/') })
    }
  }
  return out
}

/**
 * 🔴 全项目守卫：`:global(X) Y` 前缀式写法会被 SFC 编译器丢弃后半截选择器。
 *
 * 10-15 排查「版本更新弹窗夜间不可读」时顺带全项目扫出来的两处同类事故：
 * `LoginModel.vue` 与 `assets/css/modal.css` 各有一整块
 * `:global(html.dark) .xxx-tab { … }`，编译后全部塌成裸 `html.dark { … }`
 * —— 既没约束到任何元素（暗色失效），又把 `background` / `color` / `border-color`
 * 写到了 `<html>` 上，实测把整个页面的 html 背景从 `#1d1e1f` 改成 `#121821`。
 *
 * 两处都**曾经修过一次**（都存在写对了的孪生兄弟规则），但**没删掉坏的那份**。
 *
 * 所以这里**必须断言编译产物**，而不是 grep 源码 —— 源码完全看不出问题。
 *
 * ⚠️ 判定口径要区分「合法的裸 `html.dark`」与「真污染」：
 * Element Plus 暗色主题本身就是 `html.dark { --el-*: … }`（只含自定义属性），
 * 文章编辑器有 `html.dark { --w-e-*: … }` 同理 —— 这些**必须放过**。
 * 真正的污染是裸 `html.dark` 块里出现 background / color / border 等真实样式属性。
 */
describe('SFC 样式：global 暗色写法守卫（全项目）', () => {
  it('源码里能扫到候选文件（守卫本身没空跑）', () => {
    expect(collectScopedStyles().length).toBeGreaterThan(20)
  })

  it('外引样式（style src + scoped）也在检查范围内', () => {
    const files = collectScopedStyles().map((s) => s.file)
    // ⚠️ 这条守护的是「别只读文件自身的 scoped 属性」那个盲区。
    expect(files.some((f) => f.endsWith('modal.css'))).toBe(true)
    expect(files.some((f) => f.endsWith('header.scss'))).toBe(true)
  })

  it('产物里不存在塌成裸 `html.dark` 的规则写法', () => {
    const offenders: string[] = []

    for (const style of collectScopedStyles()) {
      if (!style.scoped) continue // 只有 scoped 才会发生这种塌缩
      // 源码层先拦一道：前缀式写法本身就是错误写法，直接点名报告。
      // ⚠️ 必须先剥注释 —— 本文件与被守的组件都**故意引用了那个错误写法**做示例，
      // 不剥的话 `CheckUpdates.vue` 的说明注释会把自己绊倒（项目里已栽过两次）。
      const code = style.content.replace(/\/\*[\s\S]*?\*\//g, '')
      const hits = code.match(/:global\(html\.dark\)\s+[.:]/g)
      if (hits) {
        offenders.push(`${style.file.replace(SRC, 'src/')} → 前缀式写法 ${hits.length} 处`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('产物里裸 html.dark 不携带会污染页面的真实样式属性', () => {
    const offenders: string[] = []

    for (const style of collectScopedStyles()) {
      if (!style.scoped) continue
      const css = compileCss(style.content, true)
      // 🔴 判定口径必须是「`html.dark` 之后**直接就是声明**」才算塌缩。
      // SCSS 嵌套编译出来是 `html.dark { .child[data-v-x] { … } }` ——
      // 选择器里还带子选择器，是**正常**写法（第一版没区分，误报 8 个文件）。
      // 塌缩的形态是 `html.dark { background: … }`：大括号内第一件事就是 `prop:`。
      const collapsed = /(^|[},])[^{}]*?\bhtml\.dark\s*\{\s*[-a-z]+\s*:/g
      let m: RegExpExecArray | null
      while ((m = collapsed.exec(css)) !== null) {
        const open = m.index + m[0].lastIndexOf('{')
        const close = css.indexOf('}', open)
        if (close < 0) break
        const body = css.slice(open + 1, close)
        // 只含自定义属性（--xxx）的声明是合法的全局主题变量（EP 暗色主题本身），
        // 它们必须挂在这个选择器上，放过。
        const declarations = body
          .split(';')
          .map((d) => d.trim())
          .filter((d) => d && !d.startsWith('--'))
        if (declarations.length > 0) {
          offenders.push(`${style.file.replace(SRC, 'src/')} → ${declarations.join(' | ').slice(0, 90)}`)
        }
        collapsed.lastIndex = close
      }
    }

    expect(offenders).toEqual([])
  })
})