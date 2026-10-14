// @vitest-environment jsdom
import DOMPurify from 'dompurify'
import { describe, expect, it } from 'vitest'

import { buildEmbedHtml } from '../components/editor/embed-markup'
import { NOTE_EMBED_EXCERPT_LENGTH, renderNoteEmbeds } from './note-embed-preview'

const SERVER_ID = '2081338922006073344'
const LOCAL_ID = 'a1b2c3d4-local-uuid'

const META = {
  title: 'Django Web 四',
  folderName: '技术笔记',
  excerpt: '手摸手 带你快速搭建 Django 后台',
  date: '2026.07.26'
}

/** 桌面端插入一张卡片的原文（与生成侧同源，避免手写属性漏项）。 */
const card = (overrides: { serverId?: string | null; title?: string | null } = {}): string =>
  buildEmbedHtml({
    noteId: LOCAL_ID,
    serverId: overrides.serverId === undefined ? SERVER_ID : overrides.serverId,
    title: overrides.title === undefined ? '插入时的旧标题' : overrides.title
  })

describe('renderNoteEmbeds（预览档的嵌入卡）', () => {
  it('没有嵌入卡时原样返回，不白跑一遍正则', () => {
    const html = '<p>普通正文</p>\n<h2>标题</h2>'
    expect(renderNoteEmbeds(html)).toBe(html)
  })

  it('把空 div 换成信息完整的卡片：文件夹 / 标题 / 摘要 / 时间 / 打开箭头', () => {
    const html = renderNoteEmbeds(card(), { resolveEmbedMeta: () => META })

    expect(html).toContain('class="markdown-embed-placeholder"')
    expect(html).toContain(META.folderName)
    expect(html).toContain(META.excerpt)
    expect(html).toContain(META.date)
    // 三个图标都是内联 svg（死 HTML 挂不上 Vue 组件）。
    expect(html.match(/<svg/g)?.length).toBe(3)
    // 「可点」的语义与目标：预览层靠这个属性委托打开笔记，不能省。
    expect(html).toContain(`data-note-id="${SERVER_ID}"`)
    expect(html).toContain('role="button"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('title="打开笔记"')
    // 换成卡片后，原始占位 div 不该再出现。
    expect(html).not.toContain('data-xynote-embed="note:')
  })

  it('实时查到的标题覆盖占位 div 上的快照（快照只作兜底）', () => {
    const html = renderNoteEmbeds(card({ title: '改名前的旧标题' }), {
      resolveEmbedMeta: () => META
    })

    expect(html).toContain(META.title)
    expect(html).not.toContain('改名前的旧标题')
  })

  it('查不到 meta 时退回快照标题，不报错也不吞掉卡片', () => {
    const html = renderNoteEmbeds(card({ title: '快照标题' }), { resolveEmbedMeta: () => null })

    expect(html).toContain('快照标题')
    expect(html).toContain('class="markdown-embed-placeholder"')
    // 查不到 ≠ 未同步：跨端标识还在，卡片照样可点（打开失败由打开链路提示）。
    expect(html).toContain(`data-note-id="${SERVER_ID}"`)
  })

  it('既没有 meta 也没有快照时给「未命名笔记」，不出现空标题行', () => {
    const html = renderNoteEmbeds(card({ title: null }), { resolveEmbedMeta: () => null })

    expect(html).toContain('未命名笔记')
  })

  it('缺跨端标识的存量卡：给同款提示且不输出任何「能点」的暗示', () => {
    const html = renderNoteEmbeds(card({ serverId: null }))

    expect(html).toContain('此嵌入尚未同步到云端，同步后可在网页显示')
    expect(html).toContain('is-pending')
    expect(html).not.toContain('data-note-id')
    expect(html).not.toContain('role="button"')
    expect(html).not.toContain('__action')
  })

  it('标题里的 HTML 被转义 —— 卡片不能成为注入口', () => {
    const html = renderNoteEmbeds(card(), {
      resolveEmbedMeta: () => ({ ...META, title: '<img src=x onerror=alert(1)>' })
    })

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<img src=x')
  })

  it('卡片夹在段落之间时，前后正文不受影响', () => {
    const source = `前面的段落\n\n${card()}\n\n后面的段落`
    const html = renderNoteEmbeds(source, { resolveEmbedMeta: () => META })

    expect(html).toContain('前面的段落')
    expect(html).toContain('后面的段落')
    expect(html.match(/markdown-embed-placeholder"/g)?.length).toBe(1)
  })

  it('摘要上限与编辑态卡片同一口径（160 字）', () => {
    expect(NOTE_EMBED_EXCERPT_LENGTH).toBe(160)
  })

  it('过一遍真实的 DOMPurify 后，可点语义与图标都还在', () => {
    // 预览正文是 v-html 输出，必然经过清洗（main.ts 用的是 DOMPurify 默认配置）。
    // 这条钉住「清洗不会把卡片削成空壳」—— 属性被剥掉就等于卡片点了没反应。
    const cleaned = DOMPurify.sanitize(renderNoteEmbeds(card(), { resolveEmbedMeta: () => META }))

    expect(cleaned).toContain(`data-note-id="${SERVER_ID}"`)
    expect(cleaned).toContain('role="button"')
    expect(cleaned).toContain('tabindex="0"')
    expect(cleaned).toContain('title="打开笔记"')
    expect(cleaned.match(/<svg/g)?.length).toBe(3)
    expect(cleaned).toContain(META.folderName)
    // 反向：清洗仍然干活（不能因为加卡片就把 XSS 面放开）。
    expect(DOMPurify.sanitize('<img src=x onerror=alert(1)>')).not.toContain('onerror')
  })
})
