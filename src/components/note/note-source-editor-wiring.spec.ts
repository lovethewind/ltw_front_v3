// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import DOMPurify from 'dompurify'
import { describe, expect, it } from 'vitest'

/**
 * 读取源码文本。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

/**
 * 源码模式是「绕过 Crepe 往返、逐字符保真」的唯一入口，接线断一环就退回富文本的保真度
 * （用户看不出报错，只觉得「表格又被重排了」），所以这里逐条钉住。
 * 查找 / 表格行判定等纯逻辑另有 `src/utils/__tests__/note-source-find.spec.ts` 用真实断言守住。
 */
describe('源码模式接线', () => {
  it('笔记编辑器挂载源码编辑器，并与富文本共用同一条内容链路', () => {
    const source = read('./NoteEditor.vue')

    expect(source).toMatch(
      /import NoteSourceEditor from '@\/components\/note\/NoteSourceEditor\.vue'/
    )
    expect(source).toMatch(
      /<NoteSourceEditor[\s\S]*?:value="note\?\.content \?\? ''"[\s\S]*?@change="updateContent"/
    )
  })

  it('富文本用 v-show 保住 Crepe 实例，源码用 v-if 避开隐藏容器初始化', () => {
    const source = read('./NoteEditor.vue')

    // Crepe 创建成本高（数百毫秒），切模式重建会很卡 —— 必须 v-show。
    expect(source).toMatch(/<MdEditor\s+v-show="editorMode === 'rich'"/)
    // CodeMirror 在 display:none 里初始化量不到尺寸 —— 必须 v-if。
    expect(source).toMatch(/<NoteSourceEditor\s+v-if="editorMode === 'source'"/)
  })

  it('从源码切回富文本时补一次内容同步', () => {
    const source = read('./NoteEditor.vue')

    expect(source).toMatch(
      /watch\(editorMode, \(mode\) => \{\s*if \(mode !== 'rich'\) return[\s\S]*?setContent\(props\.note\?\.content \?\? '', false\)/
    )
  })

  it('源码编辑器用 GFM 语法', () => {
    const source = read('./NoteSourceEditor.vue')

    // CommonMark 下表格不进语法树，整段退化成纯文本、连竖线都不着色。
    expect(source).toMatch(/markdown\(\{ base: markdownLanguage \}\)/)
  })

  it('Shift+Enter 在表格行内接管，且排在 defaultKeymap 之前', () => {
    const source = read('./NoteSourceEditor.vue')

    expect(source).toMatch(/function isInsideTableRow|isTableRowLine\(line\.text\)/)
    // 顺序错了会被 defaultKeymap 的「换行」先吃掉，永远插不进 <br>。
    expect(source).toMatch(/\{ key: 'Shift-Enter', run: insertHardBreak \},\s*\.\.\.defaultKeymap/)
  })

  it('「预览」档由 NoteMarkdownPreview 承担：marked 渲染 + DOMPurify 清洗', () => {
    const preview = read('./NoteMarkdownPreview.vue')

    expect(preview).toMatch(/marked\.parse\(props\.value, \{ async: false \}\)/)
    // 正文允许写任意 HTML，不清洗就是 XSS 入口。
    expect(preview).toMatch(/v-dompurify-html="previewHtml"/)
  })

  it('模式切换在编辑器顶层：富文本 / 预览 / 源码', () => {
    const source = read('./NoteEditor.vue')

    expect(source).toMatch(/type EditorMode = 'rich' \| 'preview' \| 'source'/)
    expect(source).toMatch(/<el-radio-button value="rich">富文本<\/el-radio-button>/)
    expect(source).toMatch(/<el-radio-button value="preview">预览<\/el-radio-button>/)
    expect(source).toMatch(/<el-radio-button value="source">源码<\/el-radio-button>/)
    expect(source).toMatch(/<NoteMarkdownPreview\s+v-if="editorMode === 'preview'"/)
  })

  it('源码编辑器不再自带源码 / 预览小切换（预览已上提为顶层档位）', () => {
    const source = read('./NoteSourceEditor.vue')

    expect(source).not.toMatch(/__mode-button/)
    expect(source).not.toMatch(/switchMode/)
    expect(source).not.toMatch(/\bmode\.value\b/)
  })

  it('只读切换走 compartment 重配置，不重建 state', () => {
    const source = read('./NoteSourceEditor.vue')

    expect(source).toMatch(/editableCompartment\.of\(editableExtensions\(props\.readonly\)\)/)
    expect(source).toMatch(/editableCompartment\.reconfigure\(editableExtensions\(readonly\)\)/)
    // 重新创建 state 会丢掉光标、选区与撤销栈。
    expect(source).not.toMatch(/EditorView\.editable\.reconfigure/)
  })

  it('正文变化实时上抛，卸载前兜底一次', () => {
    const source = read('./NoteSourceEditor.vue')

    expect(source).toMatch(/EditorView\.updateListener\.of\(\(update\) => \{[\s\S]*?emit\('change', update\.state\.doc\.toString\(\)\)/)
    expect(source).toMatch(/onBeforeUnmount\(\(\) => \{[\s\S]*?if \(latest !== props\.value\) emit\('change', latest\)/)
  })

  it('暴露查找 / 滚动位置能力（与桌面端 defineExpose 同集）', () => {
    const source = read('./NoteSourceEditor.vue')

    expect(source).toMatch(/defineExpose\(\{ findText, clearFindHighlight, getScrollTop, focus \}\)/)
  })
})

describe('源码模式预览的清洗口径', () => {
  it('保留 font-size span —— 否则行内字号在预览里会消失', () => {
    // 这里用的是 DOMPurify 默认配置，与 main.ts 里 `app.use(vueDompurifyHTMLPlugin)` 一致。
    const html = DOMPurify.sanitize('<span style="font-size:18px">大</span>')
    expect(html).toContain('font-size:18px')
  })

  it('保留表格、任务列表等 GFM 产物', () => {
    const html = DOMPurify.sanitize('<table><tbody><tr><td>a</td></tr></tbody></table>')
    expect(html).toContain('<table>')
  })

  it('剥掉脚本与事件处理器（XSS 防线）', () => {
    const html = DOMPurify.sanitize('<img src="x" onerror="alert(1)"><script>alert(1)</script>')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<script')
  })
})
