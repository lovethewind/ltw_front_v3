// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

/**
 * 嵌入卡片的右键行为 —— **真组件 + 真 DOM**。
 *
 * 这里守的是 `editor-context-menu.spec.ts` 那类源码正则**测不到**的两件事
 * （本项目单测以读源码做正则为主，凡是「运行时才知道对错」的行为必须落到这里）：
 *
 * 1. 编辑态右键必须 `preventDefault` + `stopPropagation` —— 少一个就会「卡片菜单 + 正文菜单」双弹；
 * 2. 只读态必须**放行**原生菜单（不吞、不 emit）—— 吞掉又不弹比留着原生菜单更糟。
 *
 * 只读判据取自祖先 `.ProseMirror` 的 `contenteditable`（Crepe 的 setReadonly 会置 false），
 * 所以这里靠**真实 DOM 结构**构造两种宿主，而不是 mock 掉判据本身。
 */
vi.mock('@/api/note', () => ({
  default: {
    // 默认成功：只有「取数失败」那条用例会覆盖成 reject。
    getDetail: vi.fn(async () => ({
      data: { id: '128', title: '接口文档', content: '正文内容', folderId: null, updateTime: '' }
    }))
  }
}))
vi.mock('@/stores/note', () => ({
  useNoteStore: () => ({ folders: [] })
}))

import noteApi from '@/api/note'
import NoteEmbedCard from './NoteEmbedCard.vue'

/**
 * 把卡片挂进指定只读态的 ProseMirror 宿主里。
 *
 * :param readonly: 是否构造只读宿主（`contenteditable="false"`）。
 * :return: 挂载后的 wrapper 与宿主元素。
 */
function mountInEditor(readonly: boolean) {
  const host = document.createElement('div')
  host.className = 'ProseMirror'
  host.setAttribute('contenteditable', readonly ? 'false' : 'true')
  document.body.appendChild(host)
  const wrapper = mount(NoteEmbedCard, {
    attachTo: host,
    props: { noteId: '', serverId: '128', title: '接口文档' }
  })
  return { wrapper, host }
}

/**
 * 在卡片上派发一次可取消的右键事件。
 *
 * :param element: 卡片根元素。
 * :return: 派发出去的事件对象（供断言 defaultPrevented）。
 */
function dispatchContextMenu(element: Element): MouseEvent {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 120,
    clientY: 64
  })
  element.dispatchEvent(event)
  return event
}

afterEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

describe('嵌入卡片右键：编辑态', () => {
  it('吞掉原生菜单与冒泡，并上抛坐标与可用性', async () => {
    const { wrapper, host } = mountInEditor(false)
    await flushPromises()

    // 宿主上的监听代表「编辑器根元素的原生 contextmenu 监听」：必须收不到冒泡。
    const bubbled = vi.fn()
    host.addEventListener('contextmenu', bubbled)

    const event = dispatchContextMenu(wrapper.element)

    expect(event.defaultPrevented).toBe(true)
    expect(bubbled).not.toHaveBeenCalled()
    expect(wrapper.emitted('context-menu')?.[0]?.[0]).toEqual({
      x: 120,
      y: 64,
      available: true
    })
  })

  it('取数失败时 available=false（菜单据此禁用打开类操作）', async () => {
    const getDetail = noteApi.getDetail as unknown as ReturnType<typeof vi.fn>
    getDetail.mockRejectedValueOnce(new Error('404'))

    const { wrapper } = mountInEditor(false)
    await flushPromises()
    dispatchContextMenu(wrapper.element)

    expect(wrapper.emitted('context-menu')?.[0]?.[0]).toMatchObject({ available: false })
  })

  it('取数未完成时不弹菜单（此时还没有可执行的操作）', () => {
    const { wrapper } = mountInEditor(false)

    // 挂载后立刻右键：loadNote 尚在 await 中，loading 为 true。
    const event = dispatchContextMenu(wrapper.element)

    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.emitted('context-menu')).toBeUndefined()
  })
})

describe('嵌入卡片右键：只读态', () => {
  it('放行浏览器原生菜单 —— 既不吞事件也不上抛', async () => {
    const { wrapper, host } = mountInEditor(true)
    await flushPromises()

    const bubbled = vi.fn()
    host.addEventListener('contextmenu', bubbled)

    const event = dispatchContextMenu(wrapper.element)

    expect(event.defaultPrevented).toBe(false)
    expect(bubbled).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('context-menu')).toBeUndefined()
  })
})
