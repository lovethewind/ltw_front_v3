import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { buildEmbedHtml, isEmbedHtml, parseEmbedHtml, parseEmbedServerId, parseEmbedTitle } from './embed-markup'

describe('嵌入卡标记解析', () => {
  it('从桌面端写入的 html 里读出本机 ID 与跨端标识', () => {
    const raw =
      '<div data-xynote-embed="note:9f1c-local" data-xynote-embed-server="128" title="接口文档"></div>'

    expect(parseEmbedHtml(raw)).toBe('9f1c-local')
    expect(parseEmbedServerId(raw)).toBe('128')
  })

  it('存量卡片没有跨端标识时返回 null（据此降级成占位）', () => {
    const raw = '<div data-xynote-embed="note:9f1c-local" title="接口文档"></div>'

    expect(parseEmbedHtml(raw)).toBe('9f1c-local')
    expect(parseEmbedServerId(raw)).toBeNull()
  })

  it('两个标识各自独立解析，不串味', () => {
    // 只有跨端标识时本机 ID 必须是 null（卡片是否成立由 isEmbedHtml 判定，见下一条）。
    expect(parseEmbedHtml('<div data-xynote-embed-server="128"></div>')).toBeNull()
    // 只有本机标识 → 跨端标识必须是 null，不能把 note: 前缀的内容当主键。
    expect(parseEmbedServerId('<div data-xynote-embed="note:9f1c-local"></div>')).toBeNull()
  })

  it('isEmbedHtml：两个标识属性任一存在即算嵌入卡', () => {
    // 网页端插入的卡片只有跨端标识 —— 只认 data-xynote-embed 会让它退化成源码文本。
    expect(isEmbedHtml('<div data-xynote-embed-server="128"></div>')).toBe(true)
    expect(isEmbedHtml('<div data-xynote-embed="note:9f1c-local"></div>')).toBe(true)
    expect(isEmbedHtml('<div data-xynote-embed="note:a" data-xynote-embed-server="1"></div>')).toBe(true)
    expect(isEmbedHtml('<div class="x"></div>')).toBe(false)
    expect(isEmbedHtml('普通段落')).toBe(false)
  })

  it('兼容单引号写法，且不匹配普通正文', () => {
    expect(parseEmbedServerId("<div data-xynote-embed='note:a' data-xynote-embed-server='7'></div>")).toBe('7')
    expect(parseEmbedHtml('普通段落，没有卡片')).toBeNull()
    expect(parseEmbedServerId('')).toBeNull()
  })

  it('读出标题快照；没有该属性时返回 null', () => {
    // 不解析 title 不只是「显示成未命名笔记」：保存是整篇重新序列化，
    // title 为 null 时生成侧不输出该属性 → 用户编辑一次就把正文里的标题抹掉。
    expect(parseEmbedTitle('<div data-xynote-embed="note:a" title="接口文档"></div>')).toBe('接口文档')
    expect(parseEmbedTitle("<div data-xynote-embed='note:a' title='接口文档'></div>")).toBe('接口文档')
    expect(parseEmbedTitle('<div data-xynote-embed="note:a"></div>')).toBeNull()
    expect(parseEmbedTitle('')).toBeNull()
  })

  it('标题属性必须有空白边界，不被名字里带 title 的其它属性误命中', () => {
    expect(parseEmbedTitle('<div data-xynote-embed="note:a" data-subtitle="nope"></div>')).toBeNull()
    expect(parseEmbedTitle('<div data-xynote-embed="note:a" title="A" data-title2="B"></div>')).toBe('A')
  })
})

describe('嵌入卡标记生成', () => {
  it('没有跨端标识时不输出该属性（未同步目标不能写出空属性）', () => {
    expect(buildEmbedHtml({ noteId: 'a' })).toBe('<div data-xynote-embed="note:a"></div>')
  })

  it('属性顺序为「本机标识 → 跨端标识 → 标题」，与桌面端序列化一致', () => {
    expect(buildEmbedHtml({ noteId: 'a', serverId: '128', title: '接口文档' })).toBe(
      '<div data-xynote-embed="note:a" data-xynote-embed-server="128" title="接口文档"></div>'
    )
  })

  it('本机 ID 为空（网页端插入）时不输出该属性，只留跨端标识', () => {
    // 写出 `note:` 空值只会污染正文，也会让「属性有无」这种判定失效。
    expect(buildEmbedHtml({ noteId: '', serverId: '128', title: '接口文档' })).toBe(
      '<div data-xynote-embed-server="128" title="接口文档"></div>'
    )
    expect(isEmbedHtml(buildEmbedHtml({ noteId: '', serverId: '128' }))).toBe(true)
  })

  it('两个标识都缺时退化成空 div，不会被误认成嵌入卡', () => {
    expect(buildEmbedHtml({ noteId: '' })).toBe('<div></div>')
    expect(isEmbedHtml('<div></div>')).toBe(false)
  })

  it('生成后再解析能原样读回（两端往返一致）', () => {
    const html = buildEmbedHtml({ noteId: 'a', serverId: '128', title: '接口文档' })

    expect(parseEmbedHtml(html)).toBe('a')
    expect(parseEmbedServerId(html)).toBe('128')
    // 读不回来就等于在保存时把标题删掉（生成侧按 title 有无决定是否输出）。
    expect(parseEmbedTitle(html)).toBe('接口文档')
  })
})

describe('网页端接线', () => {
  it('编辑器注册了嵌入卡片 feature，否则卡片仍会显示成源码文本', () => {
    const source = readFileSync(new URL('./MdEditor.vue', import.meta.url), 'utf8')

    // 该模块同时供出标记解析/生成（右键菜单的「复制嵌入引用」也用），因此只要求
    // import 名单里包含 feature 本身，不锁死名单顺序。
    expect(source).toMatch(/import \{[^}]*installXynoteEmbedFeature[^}]*\} from '\.\/xynote-embed'/)
    expect(source).toMatch(/crepe\.addFeature\(installXynoteEmbedFeature\)/)
    // 必须在 create() 之前挂上，否则首屏内容按默认 schema 解析。
    expect(source.indexOf('crepe.addFeature(installXynoteEmbedFeature)')).toBeLessThan(
      source.indexOf('await crepe.create()')
    )
  })

  it('解析链两处都带上 title，否则保存时会把正文里的标题抹掉', () => {
    const source = readFileSync(new URL('./xynote-embed.ts', import.meta.url), 'utf8')

    // 两处 transformer 分支（root 级 html / paragraph 提升）缺一不可：
    // 漏一处，网页端一编辑保存，被漏掉那条路径上的 `title="..."` 就没了。
    expect(source).toMatch(/node\.title = parseEmbedTitle\(raw\)/)
    expect(source).toMatch(/embedNode\.title = parseEmbedTitle\(raw\)/)
  })

  it('插入卡片时 noteId 留空、只写跨端标识（网页端没有本机 uuid）', () => {
    const source = readFileSync(new URL('./MdEditor.vue', import.meta.url), 'utf8')

    // 写雪花 ID 进 data-xynote-embed 是「借用桌面端本机 uuid 的槽位」，
    // 留空后两端都按「两个标识属性任一存在」识别，桌面端按 serverId 回落取数。
    expect(source).toMatch(/attrs: \{ noteId: '', title, serverId: noteId \}/)
  })

  it('卡片只用跨端标识取数，且缺标识时给占位提示', () => {
    const source = readFileSync(new URL('../note/NoteEmbedCard.vue', import.meta.url), 'utf8')

    // 取数只认 serverId（桌面端本机 ID 在网页端查不到）。
    expect(source).toMatch(/noteApi\.getDetail\(props\.serverId\)/)
    expect(source).not.toMatch(/getDetail\(props\.noteId\)/)
    // 缺跨端标识 → 占位提示，而不是把原始 html 显示出来。
    expect(source).toMatch(/此嵌入尚未同步到云端，同步后可在网页显示/)
    // 标题兜底链：实时取到的 → 插入时的快照 → 占位文案（快照过期也比「未命名笔记」好）。
    expect(source).toMatch(/note\.value\?\.title \|\| props\.title \|\| '未命名笔记'/)
    // 没有标识时不可点。
    expect(source).toMatch(/if \(!props\.serverId\) return/)
  })

  it('卡片信息结构对齐桌面端：文件夹徽标 + 两行摘要（160 字）+ 更新时间', () => {
    const source = readFileSync(new URL('../note/NoteEmbedCard.vue', import.meta.url), 'utf8')

    // 文件夹名要按 note.folderId 从 store 反查（详情接口只给 id）。
    expect(source).toMatch(/material-symbols:folder-outline-rounded/)
    expect(source).toMatch(/useNoteStore\(\)\.folders/)
    // 摘要用嵌入卡自己的口径：共享的 formatNoteExcerpt 会把中文括号洗掉。
    expect(source).toMatch(/stripNoteMarkdown\(note\.value\.content \|\| ''\)\.slice\(0, 160\)/)
    expect(source).not.toMatch(/formatNoteExcerpt/)
    // 桌面端是两行截断，硬切会断在半句。
    expect(source).toMatch(/-webkit-line-clamp:\s*2/)
    // 更新时间（点分隔短日期）。
    expect(source).toMatch(/material-symbols:schedule-rounded/)
    expect(source).toMatch(/formatNoteCompactDate\(note\.value\?\.updateTime/)
  })
})
