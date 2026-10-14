import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 读取源码文本。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

describe('快捷打开接线', () => {
  it('工作区挂载面板并绑定 Cmd/Ctrl + K', () => {
    const source = read('../../views/note/NoteWorkspace.vue')

    expect(source).toMatch(/<NoteQuickOpenDialog[\s\S]*?v-model:visible="quickOpenVisible"/)
    expect(source).toMatch(/import NoteQuickOpenDialog from '@\/components\/note\/NoteQuickOpenDialog\.vue'/)
    // 快捷键必须注册且成对解绑，否则离开页面后全局键位残留。
    expect(source).toMatch(/window\.addEventListener\('keydown', handleQuickOpenShortcut\)/)
    expect(source).toMatch(/window\.removeEventListener\('keydown', handleQuickOpenShortcut\)/)
    expect(source).toMatch(/event\.key\.toLowerCase\(\) !== 'k'/)
  })

  it('侧栏工具条暴露快速打开入口', () => {
    const source = read('./NoteSidebar.vue')

    expect(source).toMatch(/emit\('quick-open'\)/)
    expect(source).toMatch(/\(event: 'quick-open'\): void/)
  })

  it('候选列表排除回收站笔记', () => {
    const source = read('../../views/note/NoteWorkspace.vue')

    // 回收站态下 store.notes 是已删除笔记，必须挡在候选之外。
    expect(source).toMatch(/quickOpenNotes[\s\S]*?store\.isRecycleBin \? \[\] : store\.notes/)
  })
})
