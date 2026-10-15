import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  collectPreviewImageItems,
  isRemoteImageSource,
  resolvePreviewImageElement,
  type PreviewImageItem
} from '../utils/preview-image-tools'

/**
 * 图片交互：悬停工具条 + 点击全屏查看。
 *
 * 与桌面端 `ltw_notes_desDesktop/src/composables/usePreviewImageTools.ts` 同源。
 * 桌面端三处入口（两处预览 + 编辑器）共用这一份，网页端同理 ——
 * 预览档正文是 `v-html` 出来的死 HTML、编辑态图片是 Crepe 的 nodeView，两边都挂不上 Vue 事件，
 * 所以统一在**容器上做事件委托**。
 */

/** 鼠标离开图片后工具条再保留这么久 —— 够把指针从图片挪到工具条上。 */
const BAR_HIDE_DELAY = 240

/** 操作提示语停留时长。 */
const NOTICE_DURATION = 2200

/**
 * 按下到松开之间的位移超过这个值就当作拖拽，不算点击。
 *
 * 防御性判定：拖 `.image-resize-handle` 调高度时，只要松手仍落在图片区域内，浏览器就会照常
 * 派发一次 click —— 位移判定把这些「拖拽的尾巴」挡在全屏之外。
 */
const DRAG_SLOP = 5

/** 工具条贴着图片的哪一侧。 */
export type PreviewImageBarAlign = 'left' | 'right'

/** 工具条与全屏查看器需要的状态与动作。 */
export interface PreviewImageTools {
  barVisible: Ref<boolean>
  barAnchor: Ref<{ top: number, left: number, right: number }>
  barAlign: ComputedRef<PreviewImageBarAlign>
  canOpenExternal: Ref<boolean>
  notice: Ref<string>
  viewerVisible: Ref<boolean>
  viewerImages: Ref<PreviewImageItem[]>
  viewerIndex: Ref<number>
  keepBar: () => void
  dismissBar: () => void
  openViewer: () => void
  closeViewer: () => void
  stepViewer: (delta: number) => void
  setViewerIndex: (index: number) => void
  copyImageAddress: () => Promise<void>
  openInBrowser: () => Promise<void>
  copyImageMarkdown: () => Promise<void>
}

/**
 * 绑定图片交互。
 *
 * @param container 图片所在容器（正文层或编辑器滚动容器）；为 null 时监听自动摘掉。
 * @param options.align 工具条对齐侧；编辑态传 `left` 以避让 Crepe 右上角的图注按钮。
 * @return 工具条与全屏查看器的状态与动作。
 */
export function usePreviewImageTools(
  container: Ref<HTMLElement | null>,
  options: { align?: () => PreviewImageBarAlign } = {}
): PreviewImageTools {
  const hoveredImage = ref<HTMLImageElement | null>(null)
  // 锚点保持非空（初值 0），显示与否只由 barVisible 决定 —— 免去模板里的空值判断。
  const barAnchor = ref({ top: 0, left: 0, right: 0 })
  const notice = ref('')
  const viewerVisible = ref(false)
  const viewerImages = ref<PreviewImageItem[]>([])
  const viewerIndex = ref(0)

  let hideTimer = 0
  let noticeTimer = 0
  let bound: HTMLElement | null = null
  let pressed = false
  let pressX = 0
  let pressY = 0

  const barVisible = computed(() => hoveredImage.value !== null)
  const barAlign = computed<PreviewImageBarAlign>(() => options.align?.() ?? 'right')
  const activeSrc = computed(() => {
    const image = hoveredImage.value
    if (!image) return ''
    return image.currentSrc || image.src || image.getAttribute('src') || ''
  })
  const canOpenExternal = computed(() => isRemoteImageSource(activeSrc.value))

  function showNotice(message: string): void {
    notice.value = message
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = window.setTimeout(() => {
      notice.value = ''
    }, NOTICE_DURATION)
  }

  function cancelHide(): void {
    if (!hideTimer) return
    clearTimeout(hideTimer)
    hideTimer = 0
  }

  function dismissBar(): void {
    cancelHide()
    hoveredImage.value = null
  }

  function keepBar(): void {
    cancelHide()
  }

  function scheduleHide(): void {
    cancelHide()
    hideTimer = window.setTimeout(dismissBar, BAR_HIDE_DELAY)
  }

  /**
   * 悬停到某张图片上。
   *
   * 锚点用的是**视口坐标**而不是文档坐标：工具条整条 `position: fixed` 传送到 body，
   * 这样既不会被正文的 `overflow` 裁掉，也不会随容器滚动错位（滚动时直接收起）。
   *
   * @param image 命中的图片元素。
   * @return 无返回值。
   */
  function hoverImage(image: HTMLImageElement): void {
    cancelHide()
    if (hoveredImage.value === image) return
    const rect = image.getBoundingClientRect()
    hoveredImage.value = image
    barAnchor.value = { top: rect.top, left: rect.left, right: rect.right }
  }

  function handlePointerOver(event: MouseEvent): void {
    const image = resolvePreviewImageElement(event.target)
    if (image) {
      hoverImage(image)
      return
    }
    // 指针仍在容器里、但已经离开图片（移到空白或正文上）→ 给一点缓冲再收起。
    if (hoveredImage.value) scheduleHide()
  }

  function handlePointerLeave(): void {
    scheduleHide()
  }

  function handlePointerDown(event: MouseEvent): void {
    if (event.button !== 0) return
    pressed = true
    pressX = event.clientX
    pressY = event.clientY
  }

  function openViewerFor(image: HTMLImageElement | null): void {
    if (!image) return
    const src = image.currentSrc || image.src || ''
    const items = collectPreviewImageItems(bound)
    const index = items.findIndex((item) => item.src === src)
    if (index < 0) return
    dismissBar()
    viewerImages.value = items
    viewerIndex.value = index
    viewerVisible.value = true
  }

  /** 工具条上的「全屏查看」按钮：作用对象是当前悬停的图片。 */
  function openViewer(): void {
    openViewerFor(hoveredImage.value)
  }

  function handleClick(event: MouseEvent): void {
    const image = resolvePreviewImageElement(event.target)
    if (!image) return
    // 拖拽（拖缩放手柄改高度、拖选文字）松手时同样会派发 click，位移超阈值就忽略。
    const moved = pressed ? Math.hypot(event.clientX - pressX, event.clientY - pressY) : 0
    pressed = false
    if (moved > DRAG_SLOP) return
    // 编辑器里点图片块会走 ProseMirror 的选中逻辑，这里拦下来只做全屏。
    event.preventDefault()
    event.stopPropagation()
    openViewerFor(image)
  }

  function closeViewer(): void {
    viewerVisible.value = false
    viewerImages.value = []
    viewerIndex.value = 0
  }

  function stepViewer(delta: number): void {
    const total = viewerImages.value.length
    if (total < 2) return
    viewerIndex.value = (viewerIndex.value + delta + total) % total
  }

  function setViewerIndex(index: number): void {
    const total = viewerImages.value.length
    if (index < 0 || index >= total) return
    viewerIndex.value = index
  }

  /**
   * 写剪贴板（统一入口：三个动作都要它，失败提示也统一）。
   *
   * @param text 要写入的文本。
   * @param successMessage 成功提示。
   * @return 无返回值。
   */
  async function writeClipboard(text: string, successMessage: string): Promise<void> {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showNotice(successMessage)
    } catch {
      // 非 HTTPS / 未授权时会被拒，必须提示，不能让异常冒出去。
      showNotice('复制失败，请检查浏览器权限')
    }
  }

  /** 复制图片地址（桌面端是复制位图，浏览器端受 CORS 限制只能给地址）。 */
  async function copyImageAddress(): Promise<void> {
    await writeClipboard(activeSrc.value, '已复制图片地址')
  }

  /** 复制 Markdown 图片语法，粘到别处直接可用。 */
  async function copyImageMarkdown(): Promise<void> {
    await writeClipboard(`![](${activeSrc.value})`, '已复制 Markdown')
  }

  /**
   * 在新标签页打开原图（用户可在那里右键另存为）。
   *
   * 跨域 `<a download>` 会被浏览器忽略，所以网页端不做「另存为」对话框。
   */
  async function openInBrowser(): Promise<void> {
    const src = activeSrc.value
    if (!isRemoteImageSource(src)) return
    const opened = window.open(src, '_blank', 'noopener,noreferrer')
    if (!opened) showNotice('打开被浏览器拦截，请允许弹出新标签页')
  }

  function handleWindowScroll(): void {
    dismissBar()
  }

  function unbind(): void {
    if (!bound) return
    bound.removeEventListener('mouseover', handlePointerOver)
    bound.removeEventListener('mouseleave', handlePointerLeave)
    bound.removeEventListener('mousedown', handlePointerDown, true)
    bound.removeEventListener('click', handleClick, true)
    bound = null
    window.removeEventListener('scroll', handleWindowScroll, true)
  }

  function bind(element: HTMLElement | null): void {
    if (bound === element) return
    unbind()
    dismissBar()
    if (element) {
      bound = element
      element.addEventListener('mouseover', handlePointerOver)
      element.addEventListener('mouseleave', handlePointerLeave)
      // ⚠️ 这两个必须走**捕获**阶段：Crepe 的缩放手柄在自己的 `pointerdown` 里
      // `stopPropagation()`，冒泡阶段根本收不到，press 坐标就永远是旧的、位移判定失效。
      // 记下按下点，供 click 判断这是不是一次拖拽。
      element.addEventListener('mousedown', handlePointerDown, true)
      // 点图片进全屏：正文是死 HTML、编辑态是 nodeView，只能在容器上委托。
      element.addEventListener('click', handleClick, true)
      // 滚动会让「视口坐标」的锚点失效，直接收起（capture 才能收到内部滚动容器的事件）。
      window.addEventListener('scroll', handleWindowScroll, true)
    }
  }

  // container 是模板 ref：容器一出现一消失，监听随之挂上摘下。
  // flush: 'post' 保证在 DOM 更新之后才拿到元素。
  watch(container, bind, { immediate: true, flush: 'post' })

  onBeforeUnmount(() => {
    unbind()
    cancelHide()
    if (noticeTimer) clearTimeout(noticeTimer)
  })

  return {
    barVisible,
    barAnchor,
    barAlign,
    canOpenExternal,
    notice,
    viewerVisible,
    viewerImages,
    viewerIndex,
    keepBar,
    dismissBar,
    openViewer,
    closeViewer,
    stepViewer,
    setViewerIndex,
    copyImageAddress,
    openInBrowser,
    copyImageMarkdown
  }
}
