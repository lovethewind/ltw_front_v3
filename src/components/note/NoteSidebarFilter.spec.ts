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

  it('回收站显示清空入口并由工作区处理确认操作', () => {
    const sidebarSource = readFileSync(new URL('./NoteSidebar.vue', import.meta.url), 'utf8')
    const workspaceSource = readFileSync(new URL('../../views/note/NoteWorkspace.vue', import.meta.url), 'utf8')

    expect(sidebarSource).toContain('aria-label="清空回收站"')
    expect(sidebarSource).toContain('counts.recycle > 0 || folders.length > 0')
    expect(sidebarSource).toContain("emit('clear-recycle')")
    expect(workspaceSource).toContain('@clear-recycle="clearRecycleBin"')
    expect(workspaceSource).toContain("'回收站已清空'")
  })

  it('桌面端授权打开后清理临时 URL 参数', () => {
    const workspaceSource = readFileSync(new URL('../../views/note/NoteWorkspace.vue', import.meta.url), 'utf8')

    expect(workspaceSource).toContain('function clearDesktopAuthQuery()')
    expect(workspaceSource).toMatch(/delete query\.desktop_login/)
    expect(workspaceSource).toMatch(/delete query\.state/)
    expect(workspaceSource).toMatch(/clearDesktopAuthQuery\(\)[\s\S]*window\.location\.assign\(/)
  })
})
