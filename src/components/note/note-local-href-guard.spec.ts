// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import vueDompurifyHTMLPlugin from 'vue-dompurify-html'

/**
 * 预览态点击兜底 —— **真组件 + 真 DOM + 真清洗管线**。
 *
 * 这里守的是源码正则测不到的那件事：`NoteMarkdownPreview` 渲染出来的 `<a>` 没有 `target`
 * 兜底（`marked` 不加、也没有后处理），所以**桌面端本机地址一旦漏判，点击就是当前标签页
 * 跳到不存在的域名** —— 读者正在看的笔记一起丢。断言 `defaultPrevented` 才是真证据。
 *
 * 用真 `vue-dompurify-html` 而不是桩：顺带钉住「`https://xinyue-note.local/…` 能活过默认
 * URI 白名单」这个前提 —— 前提没了，点击兜底也就无从触发。
 */
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: pushMock }) }))
vi.mock('@/stores/note', () => ({ useNoteStore: () => ({ notes: [], folders: [] }) }))
vi.mock('element-plus', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    // jsdom 里让 ElMessage 真跑一遍会挂不上浮层，这里只关心「有没有人喊一声」。
    ElMessage: vi.fn()
  }
})

import NoteMarkdownPreview from './NoteMarkdownPreview.vue'

const LOCAL_HREF = 'https://xinyue-note.local/6f1a2b3c-0000-4000-8000-000000000000'

/**
 * 挂载预览组件（带真清洗插件）。
 *
 * :param markdown: 正文原文。
 * :return: 挂载后的 wrapper。
 */
function mountPreview(markdown: string): VueWrapper {
  return mount(NoteMarkdownPreview, {
    props: { value: markdown },
    global: { plugins: [vueDompurifyHTMLPlugin] },
    attachTo: document.body
  })
}

/**
 * 在正文容器里点一下某个 `<a>`，返回派发出去的事件。
 *
 * 用原生 `dispatchEvent` 而不是 `trigger` —— 要的正是「浏览器会不会跟着导航」这条默认行为，
 * 只有可取消的原生事件能给出 `defaultPrevented`。
 *
 * :param wrapper: 挂载后的 wrapper。
 * :param href: 目标链接的 href（用于定位）。
 * :return: 派发出去的事件对象。
 */
function clickAnchorOf(wrapper: VueWrapper, href: string): MouseEvent {
  const anchor = (wrapper.element as HTMLElement).querySelector(`a[href="${href}"]`)
  expect(anchor, `正文里没渲染出 ${href} 这个链接`).not.toBeNull()
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  anchor!.dispatchEvent(event)
  return event
}

afterEach(() => {
  pushMock.mockClear()
  document.body.innerHTML = ''
})

describe('预览态点击：桌面端本机地址', () => {
  it('地址能活过清洗（前提：否则下面几条测的就不是这条分支了）', () => {
    const wrapper = mountPreview(`[跨端链接](${LOCAL_HREF})`)
    expect(wrapper.element.querySelector(`a[href="${LOCAL_HREF}"]`)).not.toBeNull()
  })

  it('拦住默认行为 —— 不拦就是当前标签页跳到不存在的域名', () => {
    const wrapper = mountPreview(`[跨端链接](${LOCAL_HREF})`)
    const event = clickAnchorOf(wrapper, LOCAL_HREF)

    expect(event.defaultPrevented).toBe(true)
    // 也不能被误当成站内链接去跳路由。
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('带旧格式协议时同样不导航（清洗会剥掉 href，兜底断言保持一致）', () => {
    const wrapper = mountPreview('[老链接](xinyue-notes://note/abc123)')
    const anchor = wrapper.element.querySelector('a')
    // 自定义协议不在 DOMPurify 的默认 URI 白名单里 → href 被剥掉，浏览器无从跳转。
    expect(anchor?.getAttribute('href')).toBeNull()
  })
})

describe('预览态点击：其它链接行为不变', () => {
  it('站内笔记链接照旧交给工作区（没有监听时退回路由）', () => {
    const wrapper = mountPreview('[站内](/notes/abc123)')
    const event = clickAnchorOf(wrapper, '/notes/abc123')

    expect(event.defaultPrevented).toBe(true)
    expect(pushMock).toHaveBeenCalledWith({ name: 'notes', params: { noteId: 'abc123' } })
  })

  it('外链放手，交给浏览器默认行为', () => {
    const wrapper = mountPreview('[外链](https://example.com/notes/abc)')
    const event = clickAnchorOf(wrapper, 'https://example.com/notes/abc')

    expect(event.defaultPrevented).toBe(false)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('「以它开头」的正常域名不受影响（不是本机地址）', () => {
    const href = 'https://xinyue-note.local.example.com/abc'
    const wrapper = mountPreview(`[长得像](${href})`)
    const event = clickAnchorOf(wrapper, href)

    expect(event.defaultPrevented).toBe(false)
  })
})
