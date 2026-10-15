import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取源码文本。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

/**
 * 笔记选择器（插入笔记链接 / 嵌入笔记）。
 *
 * 网页端没有桌面端那个由父级注入候选的 `NoteLinkPicker` —— 候选直接复用快速打开的
 * 打分逻辑。这里钉住「复用没被绕过」「键盘键位齐全」「配色不另起一套」三件事。
 */
describe('笔记选择器', () => {
  it('候选复用快速打开的打分与排序，不另写一套', () => {
    const source = read('./NotePickerDialog.vue')

    expect(source).toMatch(/import \{ buildQuickOpenResults \} from '@\/utils\/note-quick-open'/)
    expect(source).toMatch(/buildQuickOpenResults\(props\.notes, props\.folders, \{/)
  })

  it('键盘键位与快速打开一致：↑↓ 选择、Enter 选中、Esc 关闭', () => {
    const source = read('./NotePickerDialog.vue')

    expect(source).toMatch(/event\.key === 'ArrowDown'/)
    expect(source).toMatch(/event\.key === 'ArrowUp'/)
    expect(source).toMatch(/event\.key === 'Enter'/)
    expect(source).toMatch(/event\.key === 'Escape'/)
  })

  it('选中后关闭弹窗并回抛笔记对象', () => {
    const source = read('./NotePickerDialog.vue')

    expect(source).toMatch(/function choose\(row: \{ note: INoteListItem \}\): void \{\s*visible\.value = false\s*emit\('select', row\.note\)/)
  })

  it('每次打开重置关键词与高亮项', () => {
    const source = read('./NotePickerDialog.vue')

    expect(source).toMatch(/watch\(visible, \(isVisible\) => \{\s*if \(!isVisible\) return\s*keyword\.value = ''\s*activeIndex\.value = 0/)
  })

  it('配色不另起一套：根节点挂上快速打开的弹窗类', () => {
    const source = read('./NotePickerDialog.vue')
    const styles = read('../../assets/css/note.scss')

    // `--qo-*` 变量、圆角、投影、暗色分支都长在那个类上，挂上即可白拿。
    expect(source).toMatch(/class="note-quick-open-dialog note-picker-dialog"/)
    expect(styles).toMatch(/\.note-picker__result \{[^}]*?color: var\(--qo-text\);/)
    expect(styles).toMatch(/\.note-picker__result\.active \{[^}]*?background: var\(--qo-active\);/)
  })
})
