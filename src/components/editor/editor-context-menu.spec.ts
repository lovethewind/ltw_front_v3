import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取源码文本。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

/**
 * 正文右键菜单：菜单浮层 + 编辑器侧接线。
 *
 * 这些断言守的是「接上了没有」——分组被漏掉、命令没分发、关闭路径没接，表现都是
 * **静默失效**（右键弹不出来 / 点了没反应 / 菜单收不掉），不会报错。
 *
 * ⚠️ 一律用 `[^}]*?` 限定在单个 `{}` 块内匹配，`[\s\S]*?` 会跨规则咬到别处同名声明，
 * 回退源码时不转红，等于假绿（本项目已有先例）。
 */
describe('右键菜单浮层（EditorContextMenu.vue）', () => {
  it('空间不足时向左 / 向上翻转，不溢出视口', () => {
    const source = read('./EditorContextMenu.vue')

    expect(source).toMatch(/props\.x \+ width > viewW - 8 \? Math\.max\(8, props\.x - width\) : props\.x/)
    expect(source).toMatch(/props\.y \+ height > viewH - 8 \? Math\.max\(8, props\.y - height\) : props\.y/)
    // ResizeObserver 兜住「图标延迟加载后菜单变高」的情况，否则翻转会按过期尺寸算。
    expect(source).toMatch(/new ResizeObserver\(\(\) => measure\(\)\)/)
  })

  it('不可用项直接不渲染（不占位），且分组间才画分隔线', () => {
    const source = read('./EditorContextMenu.vue')

    expect(source).toMatch(/v-show="!item\.disabled"/)
    expect(source).toMatch(/v-if="gi > 0 && hasEnabledItem\(group\)"/)
  })

  it('点击浮层以外任意处关闭', () => {
    const source = read('./EditorContextMenu.vue')

    expect(source).toMatch(/class="editor-context-menu-host"\s*@pointerdown="emit\('close'\)"/)
    // 菜单本体要吞掉事件，否则点菜单项会先被关闭层吃掉。
    expect(source).toMatch(/@pointerdown\.stop/)
  })
})

/**
 * 二级菜单（子菜单）。
 *
 * 块类型 8 项平铺进主菜单时，整条菜单高达 586px（项高 34px + padding，14 项可见），
 * 在 1080px 高的窗口里占掉过半 —— 而这 8 项顶栏工具栏本来就有按钮。
 * 收进二级菜单后主菜单降到 7 项（约 250px），功能一项不丢。
 */
describe('右键菜单的二级菜单', () => {
  it('菜单项类型支持子项，并提供统一判定', () => {
    const source = read('./EditorContextMenu.vue')

    expect(source).toMatch(/children\?: EditorContextMenuItem\[\]/)
    expect(source).toMatch(
      /function hasChildren\(item: EditorContextMenuItem\): boolean \{\s*\n\s*return Array\.isArray\(item\.children\) && item\.children\.length > 0/
    )
  })

  it('父项点击只开合子菜单、不派发命令', () => {
    const source = read('./EditorContextMenu.vue')

    // ⚠️ 父项的 action（blockType）没有对应实现，派发出去就是「点了没反应」。
    expect(source).toMatch(
      /function onItemClick\(item: EditorContextMenuItem\): void \{\s*\n\s*if \(hasChildren\(item\)\) \{[\s\S]*?openSubmenuAction\.value = openSubmenuAction\.value === item\.action \? null : item\.action\s*\n\s*return\s*\n\s*\}\s*\n\s*emit\('command', item\.action\)/
    )
  })

  it('悬停展开，并按右侧空间决定往哪边展开', () => {
    const source = read('./EditorContextMenu.vue')

    expect(source).toMatch(/@pointerenter="onRowEnter\(item, \$event\)"/)
    expect(source).toMatch(
      /const flipLeft = rect\.right \+ SUBMENU_WIDTH > window\.innerWidth - 8[\s\S]*?const left = flipLeft\s*\n\s*\? Math\.max\(8, rect\.left - SUBMENU_WIDTH\)\s*\n\s*: Math\.min\(rect\.right \+ 2, window\.innerWidth - 8 - SUBMENU_WIDTH\)/
    )
    expect(source).toMatch(/class="editor-context-menu editor-context-menu--sub"/)
    expect(source).toMatch(/:class="`is-\$\{submenuSide\}`"/)
    expect(source).toMatch(/:style="submenuStyle"/)
    // 往左展开时把父项 chevron 翻面，让人一眼看出往哪边开。
    expect(source).toMatch(
      /:has\(> \.editor-context-menu--sub\.is-left\) \.editor-context-menu__chevron \{\s*\n\s*transform: rotate\(180deg\);/
    )
  })

  it('子菜单必须 Teleport 到 body —— 留在树内会被容器的 overflow 裁掉', () => {
    const source = read('./EditorContextMenu.vue')

    // 🔴 本条来自一次真实回归：菜单容器是 `overflow-y: auto`，绝对定位的子菜单被祖先
    // 裁掉 → 现象是「父项高亮了、子菜单却看不见」。
    expect(source).toMatch(/<Teleport to="body">[\s\S]{0,400}?editor-context-menu--sub/)
    expect(source).toMatch(/\.editor-context-menu--sub \{\s*\n\s*position: fixed;/)
    expect(source).toMatch(/function clampSubmenuVertically\(\): void/)
    expect(source).toMatch(/window\.innerHeight - 8 - height/)
    // ⚠️ pointerdown 也必须拦：宿主在 document 上挂了 pointerdown 关闭菜单，
    // 不拦就是「按下瞬间菜单没了、子项点不到」。
    expect(source).toMatch(/@pointerdown\.stop\s*\n\s*@click\.stop/)
  })

  it('子菜单不塞进 button（否则浏览器重排导致菜单错位）', () => {
    const source = read('./EditorContextMenu.vue')

    expect(source).toMatch(
      /<\/button>\s*\n\s*<!--[\s\S]{0,400}?-->\s*\n\s*<Teleport to="body">/
    )
  })

  it('收起菜单时一并收掉展开态', () => {
    const source = read('./EditorContextMenu.vue')

    // 否则下次打开菜单，上次悬停过的那项会「莫名其妙已经展开」。
    expect(source).toMatch(
      /if \(!open\) \{[\s\S]{0,200}?openSubmenuAction\.value = null[\s\S]{0,120}?return/
    )
  })

  it('块类型 8 项收进「段落样式」二级菜单，子项不再各自判 disabled', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(
      /menuItem\('blockType', '段落样式', \{\s*\n\s*icon: 'material-symbols:format-align-left',\s*\n\s*disabled: !canEdit,\s*\n\s*children: \[/
    )
    for (const [action, label] of [
      ['paragraph', '正文'],
      ['h1', '一级标题'],
      ['h2', '二级标题'],
      ['h3', '三级标题'],
      ['quote', '引用'],
      ['bulletList', '无序列表'],
      ['orderedList', '有序列表'],
      ['codeBlock', '代码块']
    ]) {
      expect(source).toMatch(new RegExp(`menuItem\\('${action}', '${label}'`))
    }
    // 终止符只到 `]`：数组后面是 `\n]\n})`，多带 `\)` 会一路吞掉后面几万字符。
    const childrenBlock = /children: \[([\s\S]*?)\n\s*\]/.exec(source)
    expect(childrenBlock).not.toBeNull()
    expect(childrenBlock![1].length).toBeLessThan(1200)
    expect(childrenBlock![1]).not.toMatch(/disabled:/)
    // 菜单工厂要支持传子项。
    expect(source).toMatch(/children\?: EditorContextMenuItem\[\]/)
  })
})

describe('右键菜单接线（MdEditor.vue）', () => {
  it('编辑态弹自研菜单，只读态放行浏览器原生菜单', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/editorRootRef\.value\?\.addEventListener\('contextmenu', handleEditorContextMenu\)/)
    expect(source).toMatch(/function handleEditorContextMenu\(event: MouseEvent\): void \{[^}]*?if \(props\.readonly\) return/)
    expect(source).toMatch(/event\.preventDefault\(\)\s*event\.stopPropagation\(\)/)
  })

  it('分组齐全：撤销重做 / 剪贴板 / 块类型 / 笔记插入', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/menuItem\('undo', '撤销'/)
    expect(source).toMatch(/menuItem\('redo', '重做'/)
    for (const action of ['cut', 'copy', 'paste', 'pastePlain', 'pasteMarkdown', 'selectAll', 'delete']) {
      expect(source).toMatch(new RegExp(`menuItem\\('${action}',`))
    }
    for (const action of ['paragraph', 'h1', 'h2', 'h3', 'quote', 'bulletList', 'orderedList', 'codeBlock']) {
      expect(source).toMatch(new RegExp(`menuItem\\('${action}',`))
    }
    // 插入类只在笔记页出现（文章页复用同一个编辑器，不该往正文里写站内笔记标记）。
    expect(source).toMatch(/\.\.\.\(props\.notePickerEnabled\s*\?\s*\[/)
    expect(source).toMatch(/menuItem\('insertLink', '插入笔记链接'/)
    expect(source).toMatch(/menuItem\('insertEmbed', '插入笔记嵌入'/)
  })

  it('撤销/重做按 history 深度置灰 —— 读的是 ProseMirror 的 state', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/import \{ redoDepth, undoDepth \} from '@milkdown\/kit\/prose\/history'/)
    expect(source).toMatch(/const canUndo = canEdit && undoDepth\(view\.state\) > 0/)
    expect(source).toMatch(/const canRedo = canEdit && redoDepth\(view\.state\) > 0/)
  })

  it('剪贴板三条通道各自独立', () => {
    const source = read('./MdEditor.vue')

    // 富文本：读 text/html 解析成 Slice；拿不到 HTML 时退化为纯文本。
    expect(source).toMatch(/const items = await navigator\.clipboard\.read\(\)/)
    expect(source).toMatch(/ProseMirrorDOMParser\.fromSchema\(view\.state\.schema\)\.parseSlice/)
    expect(source).toMatch(/view\.dispatch\(view\.state\.tr\.insertText\(text\)\)/)
    // 纯文本：原样插入；Markdown：按语法解析。
    expect(source).toMatch(/view\.dispatch\(view\.state\.tr\.replaceSelection\(markdownToSlice\(text\)\(ctx\)\)\)/)
    // 被浏览器拒绝（非 HTTPS / 未授权）时必须提示，不能把异常冒出去。
    expect(source).toMatch(/catch \{\s*ElMessage\(\{ message: '剪贴板操作失败，请检查浏览器权限'/)
  })

  it('删除与全选走 ProseMirror 命令', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/new AllSelection\(view\.state\.doc\)/)
    expect(source).toMatch(/view\.dispatch\(view\.state\.tr\.deleteSelection\(\)\)/)
  })

  it('关闭路径接全：点空白、Esc、滚动、销毁', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/document\.addEventListener\('pointerdown', closeEditorContextMenu\)/)
    expect(source).toMatch(/removeEventListener\('pointerdown', closeEditorContextMenu\)/)
    expect(source).toMatch(/removeEventListener\('contextmenu', handleEditorContextMenu\)/)
    expect(source).toMatch(/function handleEditorDocumentKeydown[\s\S]{0,200}?closeEditorContextMenu\(\)/)
    expect(source).toMatch(/function handleEditorScroll\(\): void \{[^}]*?closeEditorContextMenu\(\)/)
  })
})

describe('右键菜单里的笔记插入（网页端口径）', () => {
  it('插入链接写当前站点绝对地址', () => {
    const source = read('./MdEditor.vue')

    // 与桌面端的 {webBaseUrl}/notes/{serverId} 同构，网页端按同源识别成站内笔记链接。
    expect(source).toMatch(/const href = `\$\{window\.location\.origin\}\/notes\/\$\{encodeURIComponent\(noteId\)\}`/)
    expect(source).toMatch(/view\.state\.tr\.replaceRangeWith\(from, to, linkNode\)/)
  })

  it('插入嵌入复用跨端标记：noteId 留空、serverId 写网页端笔记 id', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/const embedType = view\.state\.schema\.nodes\.xynoteEmbed/)
    expect(source).toMatch(/commands\.call\(clearTextInCurrentBlockCommand\.key\)/)
    // noteId 是桌面端的本机 uuid 槽位，网页端没有这个值 —— 写雪花 ID 进去会「借用」语义，
    // 留空后由桌面端按 serverId 回落取数（两端按「任一标识属性存在」识别卡片）。
    expect(source).toMatch(/attrs: \{ noteId: '', title, serverId: noteId \}/)
  })

  it('笔记页开着插入能力，文章页默认关闭', () => {
    expect(read('../note/NoteEditor.vue')).toMatch(/note-picker-enabled/)
    expect(read('./MdEditor.vue')).toMatch(/notePickerEnabled: false/)
  })
})

/**
 * 嵌入卡片的专属右键菜单（打开 / 复制引用 / 转换为链接 / 删除卡片）。
 *
 * 桌面端一直有这套菜单，网页端此前右键卡片弹的是**正文菜单**（撤销 / 粘贴 / 块类型），
 * 看起来「菜单没加」。这里守的是三段链路：卡片派发 → nodeView 补坐标与节点位置 →
 * 编辑器按卡片身份弹菜单并分发命令，任一段断掉都是静默失效。
 */
describe('嵌入卡片右键菜单', () => {
  it('卡片右键派发坐标与可用性，并吞掉冒泡（否则正文菜单会跟着弹）', () => {
    const source = read('../note/NoteEmbedCard.vue')

    expect(source).toMatch(/@contextmenu="onContextMenu"/)
    expect(source).toMatch(/event\.preventDefault\(\)\s*event\.stopPropagation\(\)/)
    expect(source).toMatch(
      /emit\('context-menu', \{\s*x: event\.clientX,\s*y: event\.clientY,\s*available: canOpen\.value && !failed\.value\s*\}\)/
    )
  })

  it('只读态放行浏览器原生菜单 —— 只吞不弹比原生菜单更糟', () => {
    const source = read('../note/NoteEmbedCard.vue')

    // 判据取自 ProseMirror 根元素的 contenteditable（Crepe 的 setReadonly 会置 false），
    // 且必须先判只读再 preventDefault，否则只读态右键「什么都没有」。
    expect(source).toMatch(
      /if \(root\?\.closest\('\.ProseMirror'\)\?\.getAttribute\('contenteditable'\) === 'false'\) return/
    )
    expect(source.indexOf("getAttribute('contenteditable') === 'false') return")).toBeLessThan(
      source.indexOf('event.preventDefault()\n  event.stopPropagation()')
    )
  })

  it('nodeView 补上节点位置，且事件从卡片 DOM 冒泡（不用 window 总线）', () => {
    const source = read('./xynote-embed.ts')

    // getPos 必须是**调用时现取**：文档一变位置就变，闭包捕获的旧值会指向别的节点。
    expect(source).toMatch(/getPos: \(\) => number \| undefined/)
    expect(source).toMatch(/pos: getPos\(\) \?\? -1/)
    // 事件从卡片 DOM 冒泡到宿主编辑器根元素 —— 网页端编辑器有三个宿主，
    // 挂 window 会让同时存在的实例一起弹菜单。
    expect(source).toMatch(/dispatchEmbedCardMenu\(container, \{/)
    expect(read('../../utils/note-open-events.ts')).toMatch(
      /\{ detail, bubbles: true \}/
    )
  })

  it('编辑器按卡片身份弹菜单，不再落进正文菜单', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(
      /editorRootRef\.value\?\.addEventListener\(EMBED_CARD_MENU_EVENT, handleEmbedCardMenu\)/
    )
    expect(source).toMatch(
      /editorRootRef\.value\?\.removeEventListener\(EMBED_CARD_MENU_EVENT, handleEmbedCardMenu\)/
    )
    // 兜底：卡片容器上不再走正文菜单（卡片自己 stopPropagation，防宿主结构变化时双弹）。
    expect(source).toMatch(/if \(target\?\.closest\('\.xynote-embed-nodeview'\)\) return/)
  })

  it('分组四项齐全，且按网页端能力置灰', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/menuItem\('embedOpen', '打开笔记'/)
    expect(source).toMatch(/menuItem\('embedCopyRef', '复制嵌入引用'/)
    expect(source).toMatch(/menuItem\('embedUnwrap', '转换为链接'/)
    expect(source).toMatch(/menuItem\('embedDelete', '删除卡片'/)
    // 网页端取数/跳转只认跨端标识，缺它（未同步 / 桌面端存量卡）时打开与转换都不可用。
    expect(source).toMatch(/const canOpen = Boolean\(serverId\) && Boolean\(target\?\.available\)/)
    expect(source).toMatch(/disabled: !canEdit \|\| !hasNode \|\| !serverId/)
    // 复制只要求「知道一个标识」，不能跟打开用同一条件。
    expect(source).toMatch(/disabled: !hasIdentity/)
    expect(source).toMatch(/const hasIdentity = Boolean\(serverId \|\| \(target\?\.noteId \?\? ''\)\)/)
  })

  it('四条命令都接上，且发派到独立的卡片命令函数', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(/action === 'embedOpen' \|\|/)
    expect(source).toMatch(/void runEmbedCardCommand\(action\)/)
    // 打开：只认跨端标识，新标签页（与点击卡片一致）。
    expect(source).toMatch(/if \(action === 'embedOpen'\) \{\s*if \(!serverId\) return\s*dispatchOpenNote\(serverId, true\)/)
    // 删除：删整块节点，不是只删文本。
    expect(source).toMatch(/view\.dispatch\(view\.state\.tr\.delete\(target\.pos, target\.pos \+ node\.nodeSize\)\)/)
    expect(source).toMatch(/type\.name !== 'xynoteEmbed'/)
  })

  it('复制嵌入引用与序列化同源：noteId 传空，不写出 `note:` 空值', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(
      /buildEmbedHtml\(\{\s*noteId: target\.noteId \?\? '',\s*serverId: serverId \|\| null,\s*title: target\.title \?\? null\s*\}\)/
    )
    // 剪贴板被拒（非 HTTPS / 未授权）要提示，不能把异常冒出去。
    expect(source).toMatch(/ElMessage\(\{ message: '复制失败，请检查浏览器权限'/)
  })

  it('转换为链接写当前站点地址（与插入链接同一口径）', () => {
    const source = read('./MdEditor.vue')

    expect(source).toMatch(
      /const href = `\$\{window\.location\.origin\}\/notes\/\$\{encodeURIComponent\(serverId\)\}`/
    )
    expect(source).toMatch(/schema\.nodes\.paragraph\.create\(null, textNode\)/)
    expect(source).toMatch(/tr\.replaceWith\(target\.pos, target\.pos \+ node\.nodeSize, paragraph\)/)
  })
})
