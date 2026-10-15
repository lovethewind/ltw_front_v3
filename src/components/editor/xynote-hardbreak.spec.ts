import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取源码文本。
 *
 * @param relativePath 相对本 spec 的路径。
 * @returns 源码字符串。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

/**
 * 富文本编辑器「内联 `<br>` 保真」扩展。
 *
 * 这是**数据正确性**护栏：网页端此前没装这个扩展，段落里与表格单元格里的 `<br>`
 * 会被 Crepe 的空行占位插件一并删掉 —— 现象是**静默丢内容**（保存后正文变了，页面不报错）。
 *
 * 与桌面端 `tests/rich-editor-hardbreak.test.cjs` 同源，每条断言对应一个已踩过的坑。
 */
describe('内联 <br> 保真扩展', () => {
  it('必须前置插入 remark 插件链 —— $remark 只能追加，救不回已被删的节点', () => {
    const source = read('./xynote-hardbreak.ts')

    // 内置 preserve 插件由 commonmark preset 注册、排在前面；追加到尾部时 <br> 早被删掉。
    expect(source).toMatch(/remarkPluginsCtx/)
    expect(source).toMatch(
      /ctx\.update\(remarkPluginsCtx,\s*\(list[^)]*\)\s*=>\s*\[entry,\s*\.\.\.list\]\)/
    )
    expect(source).toMatch(/await ctx\.wait\(InitReady\)/)
  })

  it('跳过块容器子级与段落唯一子级，保住空段落占位符语义', () => {
    const source = read('./xynote-hardbreak.ts')

    // Milkdown 把独立 `<br />` 当「空段落占位符」：解析时删、序列化空段落时写回。
    // 抢走它文档里会多出真实换行 —— 这两条跳过判断不能少。
    expect(source).toMatch(/BLOCK_CONTAINER_TYPES\s*=\s*\[[^\]]*'root'[^\]]*'blockquote'[^\]]*'listItem'[^\]]*\]/)
    expect(source).toMatch(/isBlockContainerChild/)
    expect(source).toMatch(/isSoleParagraphChild/)
  })

  it('walk 收到的必须是 children 的直接父节点（传错就等于没修）', () => {
    const source = read('./xynote-hardbreak.ts')

    // ⚠️ 把外层 parent 传进来会把「段落内 <br>」误判成「块容器子级」而跳过。
    expect(source).toMatch(/const walk = \(node: MdastNode\): void => \{/)
    expect(source).toMatch(/BLOCK_CONTAINER_TYPES\.includes\(String\(node\.type\)\)/)
  })

  it('parseDOM 优先级必须高于内置 hardbreak，否则粘贴链路会降级节点', () => {
    const source = read('./xynote-hardbreak.ts')

    // 粘贴链路是 parser(text) → DOMSerializer → parseSlice，节点要经 DOM 往返。
    // 内置 hardbreakSchema 有 `parseDOM: [{ tag: "br" }]`（默认 priority 50），
    // 不提高优先级就被它抢走 → 段落里变「`\` + 换行」、表格里被压成空格。
    const priority = source.match(/priority:\s*(\d+)/)
    expect(priority).not.toBeNull()
    expect(Number(priority![1])).toBeGreaterThan(50)
    expect(source).toMatch(/tag:\s*'br\[data-type="xynote-hardbreak"\]'/)
    expect(source).toMatch(/toDOM:\s*\(\)\s*=>\s*\['br',\s*\{\s*'data-type':\s*'xynote-hardbreak'\s*\}\]/)
  })

  it('toMarkdown 回写 html `<br>`，而非 break 节点', () => {
    const source = read('./xynote-hardbreak.ts')

    // 写回 `break` 节点时 remark-stringify 在表格里会把换行压成空格 —— 正是要修的 bug。
    expect(source).toMatch(/state\.addNode\('html',\s*undefined,\s*'<br>'\)/)
  })

  it('编辑器装上该 feature', () => {
    const editorSource = read('./MdEditor.vue')

    expect(editorSource).toMatch(/import \{[^}]*installHardbreakFeature[^}]*\} from '\.\/xynote-hardbreak'/)
    expect(editorSource).toMatch(/crepe\.addFeature\(installHardbreakFeature\)/)
  })

  it('表格单元格内 Shift+Enter 接管为自定义硬换行节点', () => {
    const editorSource = read('./MdEditor.vue')

    // 背景：内置 hardbreakFilterPlugin 读 hardbreakFilterNodes（默认含 table）→ 单元格内
    // Shift+Enter 静默失效。修复：抢在 keymap 之前改用 xynoteHardbreak 节点。
    expect(editorSource).toMatch(/function isSelectionInTableCell/)
    expect(editorSource).toMatch(/TABLE_CELL_NODE_NAMES\.includes\(\$from\.node\(depth\)\.type\.name\)/)
    expect(editorSource).toMatch(/function insertTableCellHardBreak/)
    expect(editorSource).toMatch(/event\.key !== 'Enter' \|\| !event\.shiftKey/)
    expect(editorSource).toMatch(/view\.state\.schema\.nodes\[HARDBREAK_NODE_NAME\]/)
    expect(editorSource).toMatch(/replaceSelectionWith\(type\.create\(\)\)/)
    // ⚠️ 必须挂在 handleKeyDown（ProseMirror 先问它、返回 true 才跳 keymap），
    // document 级 keydown 太晚 —— 内置 keymap 已经先跑过了。
    expect(editorSource).toMatch(
      /view\.setProps\(\{\s*\n\s*handleKeyDown: \(view_, event\) => insertTableCellHardBreak\(view_ as ProseMirrorView, event\)/
    )
  })
})

/**
 * slash「/」菜单与块手柄。
 */
describe('slash 菜单与块手柄', () => {
  const source = read('./MdEditor.vue')

  it('slash 菜单里有「嵌入笔记」，复用既有选择器', () => {
    expect(source).toMatch(/buildMenu: \(builder\) => \{/)
    expect(source).toMatch(/addItem\('xynote-embed', \{/)
    expect(source).toMatch(/label: '嵌入笔记'/)
    // 只弹选择器、不动编辑器文本（保留 `/xxx`），选完由 insertPickedNote 清块后插入卡片。
    expect(source).toMatch(/openNotePicker\('embed'\)/)
    expect(source).toMatch(/const EMBED_SLASH_ICON = `/)
  })

  it('文章页不出现「嵌入笔记」（不能往正文写站内笔记标记）', () => {
    // 与右键菜单的插入项同一道门：notePickerEnabled 只有笔记页传 true。
    expect(source).toMatch(/buildMenu: \(builder\) => \{\s*\n\s*if \(!props\.notePickerEnabled\) return/)
    expect(source).toMatch(/if \(props\.readonly\) \{\s*\n\s*ElMessage\(\{ message: '只读模式下无法插入笔记嵌入'/)
  })

  it('块手柄偏移与桌面端一致', () => {
    expect(source).toMatch(/blockHandle: \{ getOffset: \(\) => 5 \}/)
  })
})

/**
 * `[[` 补全。
 *
 * ⚠️ 与桌面端的取舍：桌面端是光标处的内联浮层（`LinkSuggestPopover`），
 * 网页端**复用已有的笔记选择器**（Cmd+K / 右键插入链接 / slash 三条入口共用同一套），
 * 不新造第二套浮层。代价是弹居中选择器而不是内联浮层。
 */
describe('[[ 补全', () => {
  const source = read('./MdEditor.vue')

  it('输入时检测光标前的 [[ 并打开选择器（只观察、不拦截）', () => {
    expect(source).toMatch(/function handleLinkTriggerInput\(\): boolean \{/)
    expect(source).toMatch(/const before = view\.state\.doc\.textBetween\(Math\.max\(0, from - 2\), from\)/)
    expect(source).toMatch(/if \(before !== '\[\['\) return/)
    expect(source).toMatch(/linkTriggerStart\.value = from - 2/)
    expect(source).toMatch(/if \(detected\) openNotePicker\('link'\)/)
    // 恒返回 false：只观察输入，编辑器自身的处理照旧
    expect(source).toMatch(/handleDOMEvents: \{ input: handleLinkTriggerInput \}/)
  })

  it('文章页与只读态不触发 —— 不能往正文写站内笔记标记', () => {
    // 按函数体切片断言，不靠「两处关键字相距多少字符」的脆弱窗口
    const start = source.indexOf('function handleLinkTriggerInput')
    expect(start).toBeGreaterThan(-1)
    const body = source.slice(start, source.indexOf('\n}\n', start))
    expect(body).toMatch(/if \(props\.readonly \|\| !editor \|\| !editorReady\)/)
    expect(body).toMatch(/if \(!props\.notePickerEnabled\) return false/)
  })

  it('补全中不重复弹（后续按键都进选择器的搜索框了）', () => {
    expect(source).toMatch(/if \(linkTriggerStart\.value !== null\) return false/)
  })

  it('选中后把「[[ + 关键词」整段替换成链接文本（区间不能是空的）', () => {
    expect(source).toMatch(/const triggerStart = linkTriggerStart\.value\s*\n\s*linkTriggerStart\.value = null/)
    expect(source).toMatch(/const from = triggerStart \?\? view\.state\.selection\.from/)
    // 🔴 终点在有起点时必须取「当前光标」，不能也取起点 ——
    // 写成 `triggerStart ?? selection.to` 会让 from === to，替换区间为空，
    // 表现为「选完一篇笔记，`[[` 还在」（10-15 用户报障）。
    expect(source).toMatch(
      /const to = triggerStart == null \? view\.state\.selection\.to : view\.state\.selection\.from/
    )
    expect(source).not.toMatch(/const to = triggerStart \?\? view\.state\.selection\.to/)
    expect(source).toMatch(/replaceRangeWith\(from, to, linkNode\)/)
  })

  it('选择器取消时清起点，否则「[[」会留在正文里且再也弹不出来', () => {
    expect(source).toMatch(
      /watch\(notePickerVisible, \(visible\) => \{\s*\n\s*if \(!visible\) linkTriggerStart\.value = null/
    )
  })
})
