import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('网页版多标签页接线', () => {
  const workspace = readFileSync(new URL('../../views/note/NoteWorkspace.vue', import.meta.url), 'utf8')
  const sidebar = readFileSync(new URL('./NoteSidebar.vue', import.meta.url), 'utf8')
  const tabsBar = readFileSync(new URL('./NoteTabsBar.vue', import.meta.url), 'utf8')
  const noteStyle = readFileSync(new URL('../../assets/css/note.scss', import.meta.url), 'utf8')

  it('工作区接入标签栏并绑定全部标签操作', () => {
    expect(workspace).toMatch(/import NoteTabsBar from '@\/components\/note\/NoteTabsBar.vue'/)
    expect(workspace).toMatch(/<NoteTabsBar/)
    expect(workspace).toMatch(/@activate="selectNote"/)
    expect(workspace).toMatch(/@close="closeTab"/)
    expect(workspace).toMatch(/@close-others="closeOtherTabs"/)
    expect(workspace).toMatch(/@close-right="closeTabsToRight"/)
    expect(workspace).toMatch(/@toggle-pin="toggleTabPin"/)
    expect(workspace).toMatch(/@reorder="reorderTabs"/)
  })

  it('标签状态机全部来自与桌面端同源的纯逻辑模块', () => {
    expect(workspace).toMatch(/from '@\/utils\/note-tabs'/)
    for (const fn of [
      'activateNoteInCurrentTab',
      'activateNoteInNewTab',
      'closeNoteTab',
      'closeNoteTabsToRight',
      'closeOtherNoteTabs',
      'reorderNoteTabs',
      'togglePinnedNoteTab'
    ]) {
      expect(workspace).toMatch(new RegExp(`\\b${fn}\\b`))
    }
  })

  it('刷新或直接打开链接时把当前笔记补成一个标签', () => {
    expect(workspace).toMatch(/if \(!tabNoteIds\.value\.includes\(String\(active\.id\)\)\)/)
  })

  it('侧栏笔记右键菜单提供在新标签页打开', () => {
    expect(sidebar).toMatch(/\(event: 'open-in-new-tab', id: ApiId\): void/)
    expect(sidebar).toMatch(/command="open-new-tab"/)
    expect(sidebar).toMatch(/>\s*在新标签页打开\s*</)
    expect(sidebar).toMatch(/emit\('open-in-new-tab', node\.note\.id\)/)
  })

  it('标签栏按可用宽度把多余标签收进下拉', () => {
    expect(tabsBar).toMatch(/import \{ partitionNoteTabs \} from '@\/utils\/note-tabs'/)
    expect(tabsBar).toMatch(/partitionNoteTabs\(props\.noteIds, props\.activeNoteId, maxVisible\.value\)/)
    expect(tabsBar).toMatch(/new ResizeObserver\(measure\)/)
    expect(tabsBar).toMatch(/aria-label="已打开的标签"/)
  })

  it('编辑区改为纵向 flex，编辑器吃掉标签栏之外的剩余高度', () => {
    expect(noteStyle).toMatch(
      /\.note-workspace-editor \{\s*\n\s*display: flex;\s*\n\s*flex-direction: column;/
    )
    expect(noteStyle).toMatch(/\.note-workspace > \.note-workspace-editor > \.note-editor \{\s*\n\s*flex: 1;/)
  })
})
