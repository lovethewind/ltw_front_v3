import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 接线守卫：网页端「打开笔记」走的是工作区的标签页（与桌面端同口径），
 * 不是浏览器新标签页，也不是编辑器内部的原地换页。
 *
 * 这些是组件内的粘连代码（Crepe nodeView、事件委托、组件生命周期），
 * 行为断言拿不到，只能钉源码形状 —— 与 note-tabs-wiring.spec.ts 同一路数。
 */
describe('网页版「打开笔记」接线（对齐桌面端口径）', () => {
  const workspace = readFileSync(new URL('../../views/note/NoteWorkspace.vue', import.meta.url), 'utf8')
  const embedCard = readFileSync(new URL('./NoteEmbedCard.vue', import.meta.url), 'utf8')
  const preview = readFileSync(new URL('./NoteMarkdownPreview.vue', import.meta.url), 'utf8')
  const mdEditor = readFileSync(new URL('../editor/MdEditor.vue', import.meta.url), 'utf8')

  it('工作区监听并注销「打开笔记」事件，newTab 走新标签、否则原地', () => {
    expect(workspace).toMatch(/import \{ OPEN_NOTE_EVENT, type OpenNoteEventDetail \}/)
    expect(workspace).toMatch(/window\.addEventListener\(OPEN_NOTE_EVENT, handleOpenNoteEvent\)/)
    expect(workspace).toMatch(/window\.removeEventListener\(OPEN_NOTE_EVENT, handleOpenNoteEvent\)/)
    expect(workspace).toMatch(/if \(detail\.newTab\) \{\s*\n\s*openNoteInNewTab\(noteId\)/)
    expect(workspace).toMatch(/selectNote\(noteId\)/)
    // 接管信号：派发方靠 preventDefault 判断请求有没有落地。
    expect(workspace).toMatch(/event\.preventDefault\(\)/)
  })

  it('嵌入卡点击走事件总线开新标签，不再自己 router.push 顶掉当前笔记', () => {
    expect(embedCard).toMatch(/dispatchOpenNote\(String\(props\.serverId\), true\)/)
    expect(embedCard).not.toMatch(/router\.push/)
  })

  it('预览档的嵌入卡与站内笔记链接都经容器委托交出去', () => {
    // 嵌入卡先把空 div 换成人能看的卡片（见 utils/note-embed-preview.ts）。
    expect(preview).toMatch(/marked\.parse\(props\.value, \{ async: false \}\)[\s\S]*renderNoteEmbeds\(parsed, \{ resolveEmbedMeta \}\)/)
    // 卡片是死 HTML，可点语义只能挂 data-note-id；点击与回车都要靠容器委托接。
    expect(preview).toMatch(/closest<HTMLElement>\('\.markdown-embed-placeholder\[data-note-id\]'\)/)
    expect(preview).toMatch(/@click="handlePreviewClick"/)
    expect(preview).toMatch(/@keydown="handlePreviewKeydown"/)
    expect(preview).toMatch(/resolveNoteIdFromHref\(anchor\.href, window\.location\.href\)/)
  })

  it('预览档的卡片信息来自 note store 的已加载列表（同步解析，死 HTML 等不了异步）', () => {
    expect(preview).toMatch(/store\.notes\.find\(\(item\) => String\(item\.id\) === serverId\)/)
    expect(preview).toMatch(/store\.folders\.find/)
    expect(preview).toMatch(/formatNoteCompactDate\(note\.updateTime\)/)
  })

  it('编辑器正文里的笔记链接同样交给工作区，且保留「不在笔记页时退回路由」的兜底', () => {
    expect(mdEditor).toMatch(/resolveNoteIdFromHref\(anchor\.href, window\.location\.href\)/)
    expect(mdEditor).toMatch(/if \(!dispatchOpenNote\(noteId, true\)\) \{/)
    expect(mdEditor).toMatch(/void router\.push\(\{ name: 'notes', params: \{ noteId \} \}\)/)
  })

  it('两处点击都先拦桌面端本机地址 —— 不拦就是当前标签页跳到不存在的域名', () => {
    for (const source of [preview, mdEditor]) {
      // 必须用原始属性判断（anchor.href 会被浏览器归一，自定义协议下不可靠）。
      expect(source).toMatch(/isLocalNoteHref\(anchor\.getAttribute\('href'\) \?\? ''\)/)
      expect(source).toMatch(/event\.preventDefault\(\)/)
      expect(source).toMatch(/LOCAL_NOTE_HREF_HINT/)
    }
    // 顺序：先判本机地址，再判站内链接。反过来的话本机地址会先落到「不是站内 → 放手」那条路。
    expect(preview).toMatch(
      /isLocalNoteHref\(anchor\.getAttribute\('href'\) \?\? ''\)[\s\S]*?resolveNoteIdFromHref\(anchor\.href, window\.location\.href\)/
    )
    expect(mdEditor).toMatch(
      /isLocalNoteHref\(anchor\.getAttribute\('href'\) \?\? ''\)[\s\S]*?resolveNoteIdFromHref\(anchor\.href, window\.location\.href\)/
    )
  })

  it('预览档不导航还不够：这类链接在观感上也不能像正常外链', () => {
    // 正文是 v-html 的死 HTML，不改 HTML，用属性选择器弱化。
    expect(preview).toMatch(/a\[href\^='https:\/\/xinyue-note\.local\/'\]/)
    expect(preview).toMatch(/cursor: default/)
  })
})
