import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('网页版笔记侧栏筛选', () => {
  it('搜索关键词存在时裁掉没有匹配笔记的文件夹', () => {
    const source = readFileSync(new URL('./NoteSidebar.vue', import.meta.url), 'utf8')

    expect(source).toMatch(/isFilteredView:[\s\S]*Boolean\(props\.filter\.keyword\?\.trim\(\)\)/)
  })

  it('在标签下方固定展示桌面版下载入口', () => {
    const sidebarSource = readFileSync(new URL('./NoteSidebar.vue', import.meta.url), 'utf8')
    const workspaceSource = readFileSync(new URL('../../views/note/NoteWorkspace.vue', import.meta.url), 'utf8')
    const scrollbarEndIndex = workspaceSource.indexOf('</ElScrollbar>')
    const desktopEntryIndex = workspaceSource.indexOf('class="note-sidebar-desktop-download"')

    expect(sidebarSource).not.toContain('class="note-sidebar-desktop-download"')
    expect(workspaceSource).toContain('下载笔记桌面版')
    expect(workspaceSource).toContain('https://github.com/lovethewind/ltw_notes_desktop/releases')
    expect(workspaceSource).toMatch(/target="_blank"/)
    expect(workspaceSource).toMatch(/rel="noopener noreferrer"/)
    expect(desktopEntryIndex).toBeGreaterThan(scrollbarEndIndex)
  })
})
