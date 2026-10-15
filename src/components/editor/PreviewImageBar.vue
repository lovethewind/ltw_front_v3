<template>
  <Teleport to="body">
    <div
      ref="barRef"
      class="preview-image-bar"
      role="toolbar"
      aria-label="图片操作"
      :style="barStyle"
      @mouseenter="emit('keep')"
      @mouseleave="emit('dismiss')"
    >
      <button
        type="button"
        class="preview-image-bar__button"
        title="全屏查看"
        aria-label="全屏查看"
        @click="emit('open')"
      >
        <Icon icon="tabler:maximize" />
      </button>
      <button
        type="button"
        class="preview-image-bar__button"
        title="复制图片地址"
        aria-label="复制图片地址"
        @click="emit('copy')"
      >
        <Icon icon="material-symbols:content-copy-outline-rounded" />
      </button>
      <button
        type="button"
        class="preview-image-bar__button"
        :disabled="!canOpenExternal"
        :title="canOpenExternal ? '打开原图' : '仅网络图片可打开原图'"
        aria-label="打开原图"
        @click="emit('external')"
      >
        <Icon icon="tabler:external-link" />
      </button>
      <button
        type="button"
        class="preview-image-bar__button"
        title="复制 Markdown"
        aria-label="复制 Markdown"
        @click="emit('markdown')"
      >
        <Icon icon="material-symbols:markdown-rounded" />
      </button>
      <Transition name="preview-image-notice">
        <span v-if="notice" class="preview-image-bar__notice" role="status">{{ notice }}</span>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'

/**
 * 预览图片的悬停工具条。
 *
 * 与桌面端 `ltw_notes_desktop/src/components/PreviewImageBar.vue` 同源，**四个动作按网页端
 * 能力改写**（桌面端走 Electron IPC，浏览器没有对应能力）：
 *
 * | 桌面端 | 网页端 | 原因 |
 * |---|---|---|
 * | 全屏查看 | 全屏查看 | 一致 |
 * | 复制图片（把图片**位图**写进剪贴板） | **复制图片地址** | 写位图要 `ClipboardItem` + 图片源开 CORS，OSS 未必开 → 只能给地址 |
 * | 另存为…（系统保存对话框） | **打开原图**（新标签页，右键可另存为） | 跨域 `<a download>` 会被浏览器忽略 |
 * | 在浏览器打开 | **复制 Markdown** | 与上一行重复；`![](src)` 才是网页端更常用的诉求 |
 *
 * 整条 `position: fixed` 传送到 body：挂在正文容器里会被 `overflow: auto` 裁掉，
 * 还会随滚动错位。定位用「图片边缘 + 工具条实测宽度」反推，不写死宽度。
 */
const props = defineProps<{
  /** 目标图片的视口坐标（左/右边缘与上边缘）。 */
  anchor: { top: number, left: number, right: number }
  /** 贴着图片哪一侧：编辑态用 `left` 避让 Crepe 右上角的图注按钮。 */
  align?: 'left' | 'right'
  /** 当前图片是否是网络图片（决定「打开原图」可用）。 */
  canOpenExternal: boolean
  /** 操作结果提示，空串表示不显示。 */
  notice: string
}>()

const emit = defineEmits<{
  (event: 'keep'): void
  (event: 'dismiss'): void
  (event: 'open'): void
  (event: 'copy'): void
  (event: 'external'): void
  (event: 'markdown'): void
}>()

/** 首个渲染帧还没量到宽度，用一个接近实际值的估计，避免先闪一下再纠正。 */
const ESTIMATED_BAR_WIDTH = 138

const barRef = ref<HTMLElement | null>(null)
const barWidth = ref(0)

const barStyle = computed(() => {
  const width = barWidth.value || ESTIMATED_BAR_WIDTH
  // 图片比工具条还窄时（很常见的小图标），工具条会伸到图片外面 —— 只保证它不出视口。
  const maxLeft = window.innerWidth - width - 8
  const left = props.align === 'left'
    ? Math.min(Math.max(8, props.anchor.left + 8), maxLeft)
    : Math.max(8, Math.min(props.anchor.right - width - 8, maxLeft))
  return {
    top: `${Math.max(8, props.anchor.top + 8)}px`,
    left: `${left}px`
  }
})

onMounted(() => {
  barWidth.value = barRef.value?.offsetWidth ?? 0
})
</script>

<!--
  用 scoped：整条虽传送到 body，但这些元素是**本组件自己渲染的**，Vue 仍会给它们打上
  scope id，样式照常生效，且不会外溢到别的组件。
-->
<style lang="scss" scoped>
.preview-image-bar {
  position: fixed;
  /* 要盖过 Element Plus 的弹层（默认 2000 档），故取 2100 */
  z-index: 2100;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--el-border-color);
  border-radius: 9px;
  background: var(--el-bg-color);
  box-shadow: 0 8px 22px rgb(18 45 80 / 16%);
}

.preview-image-bar__button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-secondary);
  font-size: 16px;
  cursor: pointer;
}

.preview-image-bar__button:hover:not(:disabled) {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.preview-image-bar__button:disabled {
  color: var(--el-text-color-placeholder);
  cursor: not-allowed;
}

.preview-image-bar__notice {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  padding: 4px 9px;
  border-radius: 6px;
  background: rgb(24 45 74 / 92%);
  color: #f2f7ff;
  font-size: 12px;
  white-space: nowrap;
}

.preview-image-notice-enter-active,
.preview-image-notice-leave-active {
  transition: opacity 0.18s ease;
}

.preview-image-notice-enter-from,
.preview-image-notice-leave-to {
  opacity: 0;
}
</style>
