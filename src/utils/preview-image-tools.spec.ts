// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  PREVIEW_IMAGE_MAX_SCALE,
  PREVIEW_IMAGE_MIN_SCALE,
  PREVIEW_IMAGE_ZOOM_STEP,
  clampPreviewImageScale,
  collectPreviewImageItems,
  computePreviewImageFitScale,
  isRemoteImageSource,
  resolvePreviewImageElement,
  zoomPreviewImageAtPoint
} from './preview-image-tools'

/**
 * 读取源码文本。
 *
 * @param relativePath 相对本 spec 的路径。
 * @returns 源码字符串。
 */
function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

/**
 * 缩放数学 —— **真行为断言**。
 *
 * 与桌面端 `tests/preview-image-tools.test.cjs` 同口径。这块最容易算错的是
 * 「以光标为锚缩放」的位移公式，写错了肉眼看不出（图片还在，只是会漂）。
 */
describe('图片缩放数学', () => {
  it('缩放值被钳在区间内；非有限值按 1 处理', () => {
    expect(clampPreviewImageScale(0.0001)).toBe(PREVIEW_IMAGE_MIN_SCALE)
    expect(clampPreviewImageScale(999)).toBe(PREVIEW_IMAGE_MAX_SCALE)
    // ⚠️ NaN 传进来会把整层 transform 弄没（`scale(NaN)` 整条声明失效）；
    // Infinity 同属「非有限」，按实现口径一律回落到 1（与桌面端一致）。
    expect(clampPreviewImageScale(Number.NaN)).toBe(1)
    expect(clampPreviewImageScale(Number.POSITIVE_INFINITY)).toBe(1)
  })

  it('「适应窗口」不放大：尺寸取不到时按 1', () => {
    // 小图按 100% 开场，否则 16px 的图标会被拉满整屏、糊成一片
    expect(computePreviewImageFitScale(100, 100, 800, 600)).toBe(1)
    // 大图按比例缩小，整张可见
    expect(computePreviewImageFitScale(1600, 800, 800, 600)).toBe(0.5)
    // 尺寸取不到（图片还没 load）→ 1
    expect(computePreviewImageFitScale(0, 0, 800, 600)).toBe(1)
    expect(computePreviewImageFitScale(100, 100, 0, 0)).toBe(1)
  })

  it('以光标为锚缩放：光标下的点缩放后仍在原处', () => {
    const input = { scale: 1, offsetX: 0, offsetY: 0, pointX: 100, pointY: 50 }
    const zoomed = zoomPreviewImageAtPoint({ ...input, nextScale: 2 })
    // ⚠️ 往返调用必须**显式**带上缩放后的位移与同一个锚点：
    // 漏传 pointX/pointY 会变 undefined → NaN；用对象展开也会被后一个 spread 覆盖回去。
    const back = zoomPreviewImageAtPoint({
      scale: zoomed.scale,
      offsetX: zoomed.offsetX,
      offsetY: zoomed.offsetY,
      nextScale: 1,
      pointX: 100,
      pointY: 50
    })

    // 公式：offset' = P - (P - offset) * (scale' / scale)
    expect(zoomed.offsetX).toBeCloseTo(100 - (100 - 0) * 2, 6)
    expect(zoomed.offsetY).toBeCloseTo(50 - (50 - 0) * 2, 6)
    // 往返一次必须回到原点 —— 不成立就说明锚点算错了（缩放会绕图片中心漂）
    expect(back.offsetX).toBeCloseTo(0, 6)
    expect(back.offsetY).toBeCloseTo(0, 6)
    expect(back.scale).toBeCloseTo(1, 6)
  })

  it('以中心为锚（point 为 0）时位移不变', () => {
    const result = zoomPreviewImageAtPoint({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      nextScale: PREVIEW_IMAGE_ZOOM_STEP,
      pointX: 0,
      pointY: 0
    })

    expect(result.offsetX).toBe(0)
    expect(result.offsetY).toBe(0)
    expect(result.scale).toBeCloseTo(PREVIEW_IMAGE_ZOOM_STEP, 6)
  })

  it('只有网络图片才有「打开原图」的意义', () => {
    expect(isRemoteImageSource('https://cdn.example.com/a.png')).toBe(true)
    expect(isRemoteImageSource('http://cdn.example.com/a.png')).toBe(true)
    expect(isRemoteImageSource('xinyue-asset.local/abc')).toBe(false)
    expect(isRemoteImageSource('data:image/png;base64,AAA')).toBe(false)
    expect(isRemoteImageSource('')).toBe(false)
  })
})

/**
 * 图片解析（依赖 DOM，放 jsdom 里真跑）。
 */
describe('图片解析（jsdom）', () => {
  /** 造一个「编辑器里的图片块」结构：wrapper 盖在 img 之上。 */
  function buildImageBlock(): HTMLImageElement {
    const root = document.createElement('div')
    root.innerHTML = `
      <div class="milkdown-image-block">
        <div class="image-wrapper">
          <img src="https://cdn.example.com/a.png" alt="示例">
          <span class="operation">caption</span>
          <span class="image-resize-handle"></span>
        </div>
      </div>
    `
    document.body.appendChild(root)
    return root.querySelector('img')!
  }

  it('命中 img 本身', () => {
    const img = buildImageBlock()

    expect(resolvePreviewImageElement(img)).toBe(img)
  })

  it('命中 wrapper（wrapper 盖在 img 之上，会截获指针事件）', () => {
    const img = buildImageBlock()
    const wrapper = img.parentElement!

    // 🔴 只写 `closest('img')` 必然漏判 —— 命中链里 target 往往是 wrapper
    expect(resolvePreviewImageElement(wrapper)).toBe(img)
  })

  it('wrapper 内的图注按钮与缩放手柄不算「点了图片」', () => {
    const img = buildImageBlock()

    expect(resolvePreviewImageElement(img.parentElement!.querySelector('.operation'))).toBeNull()
    expect(resolvePreviewImageElement(img.parentElement!.querySelector('.image-resize-handle'))).toBeNull()
  })

  it('非图片目标返回 null', () => {
    const p = document.createElement('p')

    expect(resolvePreviewImageElement(p)).toBeNull()
    expect(resolvePreviewImageElement(null)).toBeNull()
  })

  it('收集图片清单按 DOM 顺序，跳过取不到地址的项', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <img src="https://cdn.example.com/1.png" alt="一">
      <img alt="没有地址">
      <img src="https://cdn.example.com/2.png">
    `
    document.body.appendChild(root)

    const items = collectPreviewImageItems(root)

    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ src: 'https://cdn.example.com/1.png', alt: '一' })
    expect(items[1].alt).toBe('')
    expect(collectPreviewImageItems(null)).toEqual([])
  })
})

/**
 * 接线守卫 —— 这些断言守的是「接上了没有」，断掉都是静默失效（图片点了没反应）。
 */
describe('图片交互接线', () => {
  const composable = read('../composables/usePreviewImageTools.ts')
  const bar = read('../components/editor/PreviewImageBar.vue')
  const viewer = read('../components/editor/PreviewImageViewer.vue')

  it('mousedown / click 必须走捕获阶段', () => {
    // Crepe 的缩放手柄在自己的 pointerdown 里 stopPropagation，冒泡阶段收不到 →
    // press 坐标永远是旧的 → 位移判定失效 → 拖完就误开全屏。
    expect(composable).toMatch(/addEventListener\('mousedown', handlePointerDown, true\)/)
    expect(composable).toMatch(/addEventListener\('click', handleClick, true\)/)
  })

  it('点图片被拦下只做全屏，不让 ProseMirror 选中图片块', () => {
    expect(composable).toMatch(
      /function handleClick[\s\S]*?event\.preventDefault\(\)\s*\n\s*event\.stopPropagation\(\)/
    )
  })

  it('工具条与查看器都传送到 body —— 挂在正文容器里会被 overflow 裁掉', () => {
    expect(bar).toMatch(/<Teleport to="body">/)
    expect(viewer).toMatch(/<Teleport to="body">/)
  })

  it('查看器默认「适应窗口」，缩放以光标为锚', () => {
    expect(viewer).toMatch(/@load="fitToWindow"/)
    expect(viewer).toMatch(/zoomPreviewImageAtPoint\(\{/)
    expect(viewer).toMatch(/Math\.exp\(-event\.deltaY \* 0\.0015\)/)
  })

  it('查看器支持键盘：Esc 关闭、左右切图', () => {
    expect(viewer).toMatch(/if \(event\.key === 'Escape'\) \{[\s\S]*?emit\('close'\)/)
    expect(viewer).toMatch(/if \(event\.key === 'ArrowLeft'\) step\(-1\)/)
    expect(viewer).toMatch(/if \(event\.key === 'ArrowRight'\) step\(1\)/)
  })

  it('拖动过之后松手不算「点空白关闭」', () => {
    expect(viewer).toMatch(/function handleStageClick[\s\S]*?if \(dragMoved\) return/)
  })

  it('网页端三个动作走浏览器能力，不依赖 Electron IPC', () => {
    // 复制位图要 ClipboardItem + 图片源开 CORS，OSS 未必开 → 只给地址
    expect(composable).toMatch(/navigator\.clipboard\.writeText/)
    // 跨域 <a download> 会被浏览器忽略 → 改开新标签让用户右键另存
    expect(composable).toMatch(/window\.open\(src, '_blank', 'noopener,noreferrer'\)/)
    expect(composable).toMatch(/复制失败，请检查浏览器权限/)
    expect(composable).not.toMatch(/window\.notesDesktop/)
  })

  it('富文本档与预览档都挂上了容器委托', () => {
    const editor = read('../components/editor/MdEditor.vue')
    const preview = read('../components/note/NoteMarkdownPreview.vue')

    // 编辑态贴左侧，避让 Crepe 右上角自带的图注按钮
    expect(editor).toMatch(/usePreviewImageTools\(editorScrollRef, \{ align: \(\) => 'left' \}\)/)
    // 预览档是死 HTML，只能在正文容器上委托
    expect(preview).toMatch(/usePreviewImageTools\(previewBodyRef\)/)
    for (const source of [editor, preview]) {
      expect(source).toMatch(/<PreviewImageBar/)
      expect(source).toMatch(/<PreviewImageViewer/)
      expect(source).toMatch(/@update:index="previewImageTools\.setViewerIndex\(\$event\)"/)
    }
  })
})
