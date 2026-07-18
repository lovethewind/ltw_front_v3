<template>
  <div
    ref="editorShellRef"
    class="milkdown-editor-shell"
    :class="{ 'has-outline': outlineOpen, 'is-preview': previewMode }"
  >
    <button
      v-if="previewMode"
      type="button"
      class="markdown-preview-exit"
      aria-label="退出预览并继续编辑"
      @click="togglePreview"
    >
      <Icon icon="material-symbols:edit-outline-rounded" />
      编辑
    </button>
    <div ref="editorScrollRef" class="milkdown-editor-scroll" @scroll.passive="updateActiveOutline">
      <div ref="editorRootRef" class="milkdown-editor-root" />
    </div>
    <aside
      v-if="outlineOpen"
      id="markdown-outline-panel"
      class="markdown-outline"
      aria-label="Markdown 大纲"
    >
      <header class="markdown-outline__header">
        <h2>大纲</h2>
        <button type="button" class="markdown-outline__close" aria-label="关闭大纲" @click="toggleOutline">
          <Icon icon="material-symbols:close-rounded" />
        </button>
      </header>
      <nav v-if="outlineItems.length" class="markdown-outline__list" aria-label="文档标题">
        <button
          v-for="item in outlineItems"
          :key="`${item.index}-${item.text}`"
          type="button"
          class="markdown-outline-item"
          :class="{ 'is-active': item.index === activeOutlineIndex }"
          :style="{ '--outline-level': item.level }"
          @click="scrollToOutline(item.index)"
        >
          {{ item.text }}
        </button>
      </nav>
      <p v-else class="markdown-outline__empty">暂无大纲</p>
    </aside>
  </div>
</template>

<script setup lang="ts">
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/classic.css'
import { Crepe } from '@milkdown/crepe'
import { replaceAll } from '@milkdown/kit/utils'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'

import ossApi from '@/api/oss-api'
import { UploadFileTypeEnum } from '@/enums'
import { extractMarkdownOutline, type MarkdownOutlineItem } from '@/utils/markdown-outline'
import { uploadFile } from '@/utils/oss-upload'

const emit = defineEmits<{
  (event: 'change', value: string): void
}>()

const editorRootRef = ref<HTMLDivElement | null>(null)
const editorShellRef = ref<HTMLDivElement | null>(null)
const editorScrollRef = ref<HTMLDivElement | null>(null)
const contentValue = ref('')
const outlineItems = ref<MarkdownOutlineItem[]>([])
const outlineOpen = ref(true)
const previewMode = ref(false)
const activeOutlineIndex = ref(0)
let editor: Crepe | null = null
let editorReady = false
let destroyed = false
let pendingContent: string | null = null
let suppressedMarkdown: string | null = null
const OUTLINE_STORAGE_KEY = 'markdown-outline-open'
const topBarLabels = [
  '加粗',
  '斜体',
  '删除线',
  '行内代码',
  '无序列表',
  '有序列表',
  '任务列表',
  '链接',
  '图片',
  '表格',
  '代码块',
  '公式',
  '引用',
  '分隔线'
]

/**
 * 根据 Markdown 内容刷新大纲。
 *
 * :param markdown: Markdown 原文。
 * :return: 无返回值。
 */
function updateOutline(markdown: string): void {
  outlineItems.value = extractMarkdownOutline(markdown)
  if (activeOutlineIndex.value >= outlineItems.value.length) activeOutlineIndex.value = 0
  void nextTick(updateActiveOutline)
}

/**
 * 根据正文滚动位置更新当前大纲项。
 *
 * :return: 无返回值。
 */
function updateActiveOutline(): void {
  const scrollContainer = editorScrollRef.value
  const headings = editorRootRef.value?.querySelectorAll<HTMLElement>(
    '.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6'
  )
  if (!scrollContainer || !headings?.length) return
  const threshold = scrollContainer.getBoundingClientRect().top + 86
  let nextIndex = 0
  headings.forEach((heading, index) => {
    if (heading.getBoundingClientRect().top <= threshold) nextIndex = index
  })
  activeOutlineIndex.value = nextIndex
}

/**
 * 切换大纲面板并保存用户偏好。
 *
 * :return: 无返回值。
 */
function toggleOutline(): void {
  outlineOpen.value = !outlineOpen.value
  localStorage.setItem(OUTLINE_STORAGE_KEY, String(outlineOpen.value))
  syncOutlineToggle()
  if (outlineOpen.value) void nextTick(updateActiveOutline)
}

/**
 * 同步工具栏大纲开关的展开状态。
 *
 * :return: 无返回值。
 */
function syncOutlineToggle(): void {
  const button = editorRootRef.value?.querySelector<HTMLButtonElement>('.markdown-outline-toggle')
  if (!button) return
  button.setAttribute('aria-expanded', String(outlineOpen.value))
  button.textContent = outlineOpen.value ? '收起' : '大纲'
}

/**
 * 同步工具栏预览按钮的状态。
 *
 * :return: 无返回值。
 */
function syncPreviewToggle(): void {
  const button = editorRootRef.value?.querySelector<HTMLButtonElement>('.markdown-preview-toggle')
  if (!button) return
  button.setAttribute('aria-pressed', String(previewMode.value))
}

/**
 * 切换整篇文档的编辑和预览状态。
 *
 * :return: 无返回值。
 */
function togglePreview(): void {
  if (!editor || !editorReady) return
  previewMode.value = !previewMode.value
  editor.setReadonly(previewMode.value)
  if (previewMode.value) {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) activeElement.blur()
    window.getSelection()?.removeAllRanges()
  }
  syncPreviewToggle()
  void nextTick(updateActiveOutline)
}

/**
 * 滚动到指定标题。
 *
 * :param index: 标题在文档中的顺序。
 * :return: 无返回值。
 */
function scrollToOutline(index: number): void {
  const scrollContainer = editorScrollRef.value
  const heading = editorRootRef.value?.querySelectorAll<HTMLElement>(
    '.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6'
  )[index]
  if (!scrollContainer || !heading) return
  const top = heading.getBoundingClientRect().top
    - scrollContainer.getBoundingClientRect().top
    + scrollContainer.scrollTop
    - 78
  activeOutlineIndex.value = index
  scrollContainer.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

/**
 * 上传编辑器中的图片并返回访问地址。
 *
 * :param file: 待上传图片。
 * :return: 图片访问地址。
 */
async function uploadImage(file: File): Promise<string> {
  try {
    const response = await ossApi.getUploadSignatureUrl({
      dirType: UploadFileTypeEnum.IMAGE,
      fileName: file.name
    })
    const url = await uploadFile(response.data, file)
    ElMessage({
      message: '上传成功',
      type: 'success',
      plain: true
    })
    return url
  } catch (error) {
    ElMessage({
      message: '图片上传失败，请稍后重试',
      type: 'error',
      plain: true
    })
    throw error
  }
}

/**
 * 静默替换编辑器内容，避免外部回填被识别为用户编辑。
 *
 * :param value: Markdown 内容。
 * :param crepe: Milkdown 编辑器实例。
 * :return: 无返回值。
 */
function replaceContentSilently(value: string, crepe: Crepe): void {
  crepe.editor.action(replaceAll(value))
  suppressedMarkdown = crepe.getMarkdown()
}

/**
 * 为 Milkdown 工具栏补充中文标题和无障碍名称。
 *
 * :param root: 编辑器根元素。
 * :return: 无返回值。
 */
function localizeTopBar(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>('.top-bar-item').forEach((button, index) => {
    const label = topBarLabels[index]
    if (!label) return
    button.title = label
    button.dataset.label = label
    button.setAttribute('aria-label', label)
  })

  const inner = root.querySelector<HTMLElement>('.top-bar-inner')
  const heading = inner?.querySelector<HTMLElement>('.top-bar-heading-selector')
  if (!inner || !heading) return
  if (!inner.querySelector('.top-bar-actions')) {
    const actions = document.createElement('div')
    actions.className = 'top-bar-actions'
    Array.from(inner.children).forEach((child) => {
      if (child !== heading) actions.append(child)
    })
    inner.append(actions)
  }
  if (!inner.querySelector('.markdown-outline-toggle')) {
    const outlineToggle = document.createElement('button')
    outlineToggle.type = 'button'
    outlineToggle.className = 'markdown-outline-toggle'
    outlineToggle.setAttribute('aria-controls', 'markdown-outline-panel')
    outlineToggle.addEventListener('click', toggleOutline)
    inner.append(outlineToggle)
  }
  if (!inner.querySelector('.markdown-preview-toggle')) {
    const previewToggle = document.createElement('button')
    previewToggle.type = 'button'
    previewToggle.className = 'markdown-preview-toggle'
    previewToggle.textContent = '预览'
    previewToggle.setAttribute('aria-label', '预览文档')
    previewToggle.addEventListener('click', togglePreview)
    inner.append(previewToggle)
  }
  syncOutlineToggle()
  syncPreviewToggle()
}

/**
 * 创建 Milkdown 编辑器并注册内容更新监听。
 *
 * :return: 无返回值。
 */
async function createEditor(): Promise<void> {
  if (!editorRootRef.value) return

  const crepe = new Crepe({
    root: editorRootRef.value,
    defaultValue: contentValue.value,
    features: {
      [Crepe.Feature.TopBar]: true
    },
    featureConfigs: {
      [Crepe.Feature.BlockEdit]: {
        textGroup: {
          label: '文本',
          text: { label: '正文' },
          h1: { label: '一级标题' },
          h2: { label: '二级标题' },
          h3: { label: '三级标题' },
          h4: { label: '四级标题' },
          h5: { label: '五级标题' },
          h6: { label: '六级标题' },
          quote: { label: '引用' },
          divider: { label: '分隔线' }
        },
        listGroup: {
          label: '列表',
          bulletList: { label: '无序列表' },
          orderedList: { label: '有序列表' },
          taskList: { label: '任务列表' }
        },
        advancedGroup: {
          label: '高级',
          image: { label: '图片' },
          codeBlock: { label: '代码块' },
          table: { label: '表格' },
          math: { label: '公式' }
        }
      },
      [Crepe.Feature.LinkTooltip]: {
        inputPlaceholder: '粘贴链接地址…'
      },
      [Crepe.Feature.CodeMirror]: {
        searchPlaceholder: '搜索代码语言',
        noResultText: '没有匹配结果',
        copyText: '复制',
        onCopy: () => {
          ElMessage({
            message: '复制成功',
            type: 'success',
            plain: true
          })
        },
        previewToggleText: (previewOnlyMode: boolean) => previewOnlyMode ? '编辑' : '隐藏'
      },
      [Crepe.Feature.TopBar]: {
        headingOptions: [
          { label: '正文', level: null },
          { label: '一级标题', level: 1 },
          { label: '二级标题', level: 2 },
          { label: '三级标题', level: 3 },
          { label: '四级标题', level: 4 },
          { label: '五级标题', level: 5 },
          { label: '六级标题', level: 6 }
        ]
      },
      [Crepe.Feature.Placeholder]: {
        text: '输入 / 可插入标题、列表、图片等内容',
        mode: 'block'
      },
      [Crepe.Feature.ImageBlock]: {
        onUpload: uploadImage,
        inlineOnUpload: uploadImage,
        blockOnUpload: uploadImage,
        inlineUploadButton: '上传图片',
        inlineUploadPlaceholderText: '或粘贴图片地址',
        blockUploadButton: '上传图片',
        blockConfirmButton: '确认',
        blockCaptionPlaceholderText: '填写图片说明',
        blockUploadPlaceholderText: '或粘贴图片地址'
      }
    }
  })

  editor = crepe
  crepe.on((listener) => {
    listener.markdownUpdated((_ctx, markdown) => {
      updateOutline(markdown)
      if (suppressedMarkdown === markdown) {
        suppressedMarkdown = null
        return
      }
      suppressedMarkdown = null
      if (!editorReady && pendingContent !== null) return
      contentValue.value = markdown
      emit('change', markdown)
    })
  })

  await crepe.create()
  if (destroyed) {
    await crepe.destroy()
    if (editor === crepe) editor = null
    return
  }

  localizeTopBar(editorRootRef.value)

  const targetContent = pendingContent ?? contentValue.value
  pendingContent = null
  editorReady = true
  if (crepe.getMarkdown() !== targetContent) {
    replaceContentSilently(targetContent, crepe)
  }
}

/**
 * 设置编辑器 Markdown 内容。
 *
 * :param value: Markdown 内容。
 * :return: 无返回值。
 */
function setContent(value: string): void {
  contentValue.value = value
  updateOutline(value)
  if (!editor || !editorReady) {
    pendingContent = value
    return
  }
  if (editor.getMarkdown() === value) return
  replaceContentSilently(value, editor)
}

/**
 * 获取当前 Markdown 内容长度。
 *
 * :return: Markdown 字符数。
 */
function getContentLength(): number {
  return contentValue.value.length
}

onMounted(() => {
  outlineOpen.value = localStorage.getItem(OUTLINE_STORAGE_KEY) !== 'false'
  void createEditor()
})

onBeforeUnmount(() => {
  destroyed = true
  pendingContent = null
  suppressedMarkdown = null
  const currentEditor = editor
  editor = null
  if (currentEditor && editorReady) void currentEditor.destroy()
  editorReady = false
})

defineExpose({
  setContent,
  getContentLength
})
</script>

<style lang="scss">
.milkdown-editor-shell {
  --markdown-content-width: 920px;
  --markdown-outline-width: 240px;
  --markdown-outline-background: #fff;
  --markdown-outline-border: #d7dfec;
  --markdown-outline-hover: #edf5ff;
  --markdown-outline-primary: #2f80ed;
  --markdown-outline-text: #667085;

  position: relative;
  height: 100%;
  min-height: 0;
  color: #243047;
  background: #fff;
  border: 1px solid #e5eaf3;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 14px 34px rgb(15 23 42 / 5%);
}

.milkdown-editor-scroll {
  height: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.milkdown-editor-root,
.milkdown-editor-root .milkdown {
  min-height: 100%;
}

.milkdown-editor-root .milkdown {
  --crepe-color-background: #fff;
  --crepe-color-on-background: #243047;
  --crepe-color-surface: #f8faff;
  --crepe-color-surface-low: #eef4ff;
  --crepe-color-on-surface: #243047;
  --crepe-color-on-surface-variant: #526079;
  --crepe-color-outline: #64748b;
  --crepe-color-primary: #2f80ed;
  --crepe-color-secondary: #dbeafe;
  --crepe-color-on-secondary: #174ea6;
  --crepe-color-hover: #edf5ff;
  --crepe-color-selected: #dbeafe;
  --crepe-color-inline-area: #eef2f7;
  --milkdown-structure-border: #b8c3d3;
  --milkdown-toolbar-divider: #c8d1df;
  --milkdown-toolbar-icon: #526079;
  --crepe-font-title: inherit;
  --crepe-font-default: inherit;
}

.milkdown-editor-root .milkdown .ProseMirror {
  box-sizing: border-box;
  width: min(100%, var(--markdown-content-width));
  min-height: 500px;
  margin-right: auto;
  margin-left: auto;
  padding: 16px clamp(22px, 4vw, 56px) 72px;
  font-size: 16px;
  line-height: 1.8;
  outline: none;
}

.milkdown-editor-shell.has-outline .milkdown-editor-root .milkdown .ProseMirror {
  width: min(calc(100% - var(--markdown-outline-width) - 40px), var(--markdown-content-width));
  margin-right: calc(var(--markdown-outline-width) + 20px);
}

.milkdown-editor-root .milkdown .milkdown-top-bar {
  position: sticky;
  z-index: 4;
  top: 0;
  min-height: 62px;
  border-bottom: 1px solid var(--milkdown-toolbar-divider);
  background: rgb(255 255 255 / 94%);
  backdrop-filter: blur(14px);
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-divider {
  background: var(--milkdown-toolbar-divider);
}

.milkdown-editor-root .milkdown .milkdown-table-block th,
.milkdown-editor-root .milkdown .milkdown-table-block td {
  border-color: var(--milkdown-structure-border);
}

.milkdown-editor-root .milkdown .ProseMirror hr {
  background-color: var(--milkdown-structure-border);
}

.milkdown-editor-root .milkdown .milkdown-code-block .cm-activeLineGutter {
  color: inherit;
  background: transparent;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit {
  box-sizing: border-box;
  min-height: 76px;
  margin: 12px 0;
  padding: 12px 16px;
  gap: 12px;
  border: 1px dashed color-mix(in srgb, var(--crepe-color-outline) 42%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--crepe-color-surface) 72%, var(--crepe-color-background));
  transition: border-color 0.18s ease, background 0.18s ease;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit:hover,
.milkdown-editor-root .milkdown .milkdown-image-block .image-edit:focus-within {
  border-color: color-mix(in srgb, var(--crepe-color-primary) 68%, transparent);
  background: color-mix(in srgb, var(--crepe-color-primary) 5%, var(--crepe-color-background));
}

.milkdown-editor-root .milkdown .milkdown-image-block.selected > .image-edit:not(:has(input:focus))::before {
  display: none;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .image-icon {
  display: inline-flex;
  flex: 0 0 38px;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  color: var(--crepe-color-primary);
  background: var(--crepe-color-secondary);
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .image-icon svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 40px;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder {
  gap: 10px;
  background: transparent;
  box-shadow: none;
  user-select: none;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder::before,
.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder::after {
  display: none;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder,
.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder * {
  -webkit-tap-highlight-color: transparent;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder::selection,
.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder *::selection {
  color: inherit;
  background: transparent;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder .uploader {
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--crepe-color-primary);
  background: var(--crepe-color-secondary);
  font-size: 14px;
  font-weight: 650;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer.focus .placeholder .uploader,
.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder .uploader:hover {
  color: var(--crepe-color-on-secondary);
  background: color-mix(in srgb, var(--crepe-color-secondary) 76%, var(--crepe-color-primary));
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .placeholder .text {
  margin-left: 0;
  color: color-mix(in srgb, var(--crepe-color-on-background) 48%, transparent);
  background: transparent;
  font-size: 14px;
}

.milkdown-editor-root .milkdown .milkdown-image-block .image-edit .link-importer .link-input-area {
  height: 40px;
  padding: 0 4px;
  background: transparent;
  box-shadow: none;
}

.markdown-outline-toggle,
.markdown-preview-toggle {
  flex: 0 0 auto;
  height: 36px;
  margin: 0 8px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  color: var(--milkdown-toolbar-icon);
  background: var(--markdown-outline-background);
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}

.markdown-preview-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 0;
}

.markdown-preview-toggle:hover,
.markdown-outline-toggle:hover {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
}

.markdown-preview-exit {
  position: absolute;
  z-index: 8;
  top: 12px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 13px;
  border: 1px solid color-mix(in srgb, var(--markdown-outline-primary) 32%, transparent);
  border-radius: 8px;
  color: var(--markdown-outline-primary);
  background: color-mix(in srgb, var(--markdown-outline-background) 92%, transparent);
  box-shadow: 0 8px 20px rgb(15 23 42 / 8%);
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.milkdown-editor-shell.has-outline .markdown-preview-exit {
  right: calc(var(--markdown-outline-width) + 34px);
}

.markdown-preview-exit:hover {
  background: var(--markdown-outline-hover);
}

.markdown-preview-exit svg {
  width: 17px;
  height: 17px;
}

.milkdown-editor-shell.is-preview .markdown-outline {
  top: 0;
}

.milkdown-editor-shell.is-preview .milkdown-editor-root .milkdown .ProseMirror {
  padding-top: 58px;
  caret-color: transparent;
}

.milkdown-editor-shell.is-preview .milkdown-block-handle,
.milkdown-editor-shell.is-preview .milkdown-table-block .handle,
.milkdown-editor-shell.is-preview .milkdown-table-block .cell-handle,
.milkdown-editor-shell.is-preview .milkdown-table-block .line-handle,
.milkdown-editor-shell.is-preview .milkdown-image-block .image-resize-handle,
.milkdown-editor-shell.is-preview .milkdown-image-block .operation,
.milkdown-editor-shell.is-preview .milkdown-image-block .image-edit {
  display: none !important;
}

.milkdown-editor-shell.is-preview .ProseMirror-selectednode,
.milkdown-editor-shell.is-preview .milkdown-code-block.selected,
.milkdown-editor-shell.is-preview .milkdown-image-block.selected {
  outline: none !important;
}

.markdown-outline {
  position: absolute;
  z-index: 5;
  top: 63px;
  right: 15px;
  bottom: 0;
  width: var(--markdown-outline-width);
  padding: 0 16px 24px;
  overflow-y: auto;
  color: var(--markdown-outline-text);
  background: var(--markdown-outline-background);
  border-left: 1px solid var(--markdown-outline-border);
}

.markdown-outline__header {
  position: sticky;
  z-index: 1;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 58px;
  background: var(--markdown-outline-background);
  border-bottom: 1px solid var(--markdown-outline-border);
}

.markdown-outline__header::after {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 42px;
  height: 2px;
  background: var(--markdown-outline-primary);
  content: '';
}

.markdown-outline__header h2 {
  margin: 0;
  color: var(--markdown-outline-primary);
  font-size: 16px;
  font-weight: 700;
}

.markdown-outline__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: var(--markdown-outline-text);
  background: transparent;
  cursor: pointer;
}

.markdown-outline__close:hover {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
}

.markdown-outline__empty {
  margin: 28px 0;
  color: var(--markdown-outline-text);
  font-size: 13px;
  text-align: center;
}

.markdown-outline__list {
  display: grid;
  gap: 3px;
  padding-top: 18px;
}

.markdown-outline-item {
  width: 100%;
  padding: 7px 8px 7px calc(8px + (var(--outline-level) - 1) * 14px);
  overflow: hidden;
  border: 0;
  border-radius: 6px;
  color: var(--markdown-outline-text);
  background: transparent;
  font: inherit;
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.markdown-outline-item:hover {
  color: var(--markdown-outline-primary);
  background: var(--markdown-outline-hover);
}

.markdown-outline-item.is-active {
  color: var(--markdown-outline-primary);
  font-weight: 650;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-inner {
  flex-wrap: nowrap;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-selector {
  flex: 0 0 92px;
  width: 92px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-button {
  width: 80px;
  padding-right: 4px;
  padding-left: 6px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-label {
  flex: 0 0 56px;
  width: 56px;
  min-width: 0;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-button .top-bar-chevron {
  width: 14px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-dropdown {
  width: 120px;
  min-width: 120px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-heading-option {
  width: 112px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-actions {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item {
  flex-direction: column;
  gap: 2px;
  width: 52px;
  height: 56px;
  margin: 3px 1px;
  padding: 4px 3px;
  color: var(--milkdown-toolbar-icon);
  font-size: 11px;
  line-height: 14px;
  white-space: nowrap;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item::after {
  content: attr(data-label);
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item svg {
  width: 21px;
  height: 21px;
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item svg,
.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-chevron svg {
  color: var(--milkdown-toolbar-icon);
  fill: var(--milkdown-toolbar-icon);
}

.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item:hover svg,
.milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item.active svg {
  color: var(--crepe-color-primary);
  fill: var(--crepe-color-primary);
}

html.dark .milkdown-editor-shell {
  --markdown-outline-background: #171b2d;
  --markdown-outline-border: #3d4867;
  --markdown-outline-hover: #252e45;
  --markdown-outline-primary: #8ab8ff;
  --markdown-outline-text: #b2bdd6;

  color: #e7ebf5;
  background: #171b2d;
  border-color: #303958;
  box-shadow: none;
}

html.dark .milkdown-editor-root .milkdown {
  --crepe-color-background: #171b2d;
  --crepe-color-on-background: #e7ebf5;
  --crepe-color-surface: #20263a;
  --crepe-color-surface-low: #28314a;
  --crepe-color-on-surface: #e7ebf5;
  --crepe-color-on-surface-variant: #b2bdd6;
  --crepe-color-outline: #94a3b8;
  --crepe-color-primary: #8ab8ff;
  --crepe-color-secondary: #263f68;
  --crepe-color-on-secondary: #dbeafe;
  --crepe-color-hover: #252e45;
  --crepe-color-selected: #30456f;
  --crepe-color-inline-area: #252c42;
  --milkdown-structure-border: #63708c;
  --milkdown-toolbar-divider: #526079;
  --milkdown-toolbar-icon: #c4cce0;
}

html.dark .milkdown-editor-root .milkdown .milkdown-top-bar {
  border-color: var(--milkdown-toolbar-divider);
  background: rgb(23 27 45 / 94%);
}

@media (max-width: 1399px) {
  .milkdown-editor-shell.has-outline .milkdown-editor-root .milkdown .ProseMirror {
    width: min(100%, var(--markdown-content-width));
    margin-right: auto;
  }

  .markdown-outline {
    box-shadow: -16px 0 32px rgb(15 23 42 / 12%);
  }
}

@media (max-width: 767px) {
  .milkdown-editor-shell {
    min-height: calc(100vh - 250px);
    border-radius: 10px;
  }

  .milkdown-editor-root .milkdown .ProseMirror {
    width: 100%;
    min-height: calc(100vh - 310px);
    padding: 22px 18px 56px;
  }

  .markdown-outline {
    top: 63px;
    width: min(280px, calc(100% - 28px));
  }
}

.note-milkdown-editor.milkdown-editor-shell {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.note-milkdown-editor .milkdown {
  background: transparent;
}

.note-milkdown-editor .markdown-outline {
  background: transparent;
  border-left: 0;
  box-shadow: none;
}

.note-milkdown-editor .markdown-outline__header {
  background: transparent;
}

.note-milkdown-editor .milkdown-editor-root .milkdown .milkdown-top-bar {
  height: 52px;
  min-height: 52px;
}

.note-milkdown-editor .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-inner {
  height: 51px;
}

.note-milkdown-editor .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-actions {
  scrollbar-width: none;
}

.note-milkdown-editor .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-actions::-webkit-scrollbar {
  display: none;
}

.note-milkdown-editor .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item {
  gap: 0;
  height: 46px;
  margin: 2px 1px;
  padding: 2px 3px;
  font-size: 10px;
  line-height: 12px;
}

.note-milkdown-editor .milkdown-editor-root .milkdown .milkdown-top-bar .top-bar-item svg {
  width: 19px;
  height: 19px;
}

.note-milkdown-editor .markdown-outline {
  top: 52px;
}

.note-milkdown-editor .milkdown-editor-root .milkdown .ProseMirror {
  padding-top: 10px;
}
</style>
