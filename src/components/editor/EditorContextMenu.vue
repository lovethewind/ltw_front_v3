<template>
  <Teleport to="body">
    <div v-if="visible" class="editor-context-menu-host" @pointerdown="emit('close')">
      <div
        ref="menuRef"
        class="editor-context-menu"
        role="menu"
        :style="menuStyle"
        @pointerdown.stop
        @click.stop
        @contextmenu.prevent
      >
        <template v-for="(group, gi) in groups" :key="gi">
          <div v-if="gi > 0 && hasEnabledItem(group)" class="editor-context-menu__divider"></div>
          <div
            v-for="item in group.items"
            v-show="!item.disabled"
            :key="item.action"
            class="editor-context-menu__row"
            :class="{ 'is-open': openSubmenuAction === item.action }"
            @pointerenter="onRowEnter(item, $event)"
          >
            <button
              type="button"
              role="menuitem"
              class="editor-context-menu__item"
              :class="{ danger: item.danger }"
              @click="onItemClick(item)"
            >
              <Icon v-if="item.icon" class="editor-context-menu__icon" :icon="item.icon" />
              <span class="editor-context-menu__label">{{ item.label }}</span>
              <Icon
                v-if="hasChildren(item)"
                class="editor-context-menu__chevron"
                icon="material-symbols:chevron-right-rounded"
              />
            </button>
            <!--
              ⚠️ 必须 Teleport 到 body：菜单容器是 `overflow-y: auto`，留在树内的绝对定位
              子菜单会被它**整个裁掉** —— 表现是「父项高亮了、子菜单却看不见」。
              挂到 body 后由 JS 算 fixed 坐标。
              ⚠️ `@pointerdown.stop` 同样必需：宿主在 document 上挂了 pointerdown 关闭菜单，
              不拦的话按下瞬间菜单就没了，点不到子项。
            -->
            <Teleport to="body">
              <div
                v-if="hasChildren(item) && openSubmenuAction === item.action"
                :ref="setSubmenuRef"
                class="editor-context-menu editor-context-menu--sub"
                :class="`is-${submenuSide}`"
                :style="submenuStyle"
                role="menu"
                @pointerdown.stop
                @click.stop
              >
                <button
                  v-for="child in item.children || []"
                  v-show="!child.disabled"
                  :key="child.action"
                  type="button"
                  role="menuitem"
                  class="editor-context-menu__item"
                  :class="{ danger: child.danger }"
                  @click="emit('command', child.action)"
                >
                  <Icon v-if="child.icon" class="editor-context-menu__icon" :icon="child.icon" />
                  <span class="editor-context-menu__label">{{ child.label }}</span>
                </button>
              </div>
            </Teleport>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

/**
 * 编辑器正文的右键菜单（浮层本体）。
 *
 * ## 与桌面端的关系
 *
 * 逐项移植桌面端 `EditorContextMenu.vue`：同一套分组数据、同一套「右侧/底部空间不足时
 * 向左/向上翻转」的定位算法。差别只在样式令牌 —— 桌面端复用应用侧栏的
 * `.resource-context-menu`，网页端没有那个类，配色按网页端编辑器语系自带一套（含暗色）。
 *
 * ## 为什么不直接用 Element Plus 的 `el-dropdown trigger="contextmenu"`
 *
 * 侧栏 / 标签栏的右键菜单确实是 `el-dropdown`，但它们的锚点是**列表项**；编辑器要的是
 * 「在正文任意坐标处弹在鼠标位置」，需要纯坐标定位 + 视口翻转，用自研浮层更直接，
 * 也便于把 `disabled` 项直接隐藏（不占位）。
 *
 * 组件本身**不含任何编辑器逻辑**：分组由调用方按当前选区/只读状态算好，
 * 点选后只回抛 `command(action)`。
 */
export interface EditorContextMenuItem {
  action: string
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  /**
   * 子项。有子项时本项变成「父项」：悬停 / 点击展开二级菜单，**自身不派发命令**。
   *
   * 用来收纳块类型这类「项数多、但用得少」的动作 —— 它们全平铺进主菜单会把菜单
   * 撑到半屏高（桌面端实测：8 项块类型就占了 586px 菜单里的一半以上）。
   */
  children?: EditorContextMenuItem[]
}

export interface EditorContextMenuGroup {
  items: EditorContextMenuItem[]
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    x: number
    y: number
    groups: EditorContextMenuGroup[]
  }>(),
  { x: 0, y: 0 }
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'command', action: string): void
}>()

const menuRef = ref<HTMLDivElement | null>(null)
const menuSize = ref({ width: 220, height: 0 })

/** 当前展开的二级菜单属于哪个父项；null = 都没展开。 */
const openSubmenuAction = ref<string | null>(null)
/** 二级菜单往哪边展开：右侧放不下时翻到左侧（决定 chevron 朝向）。 */
const submenuSide = ref<'right' | 'left'>('right')
/** 二级菜单的固定宽度：算「往左还是往右」与水平夹取都用它。 */
const SUBMENU_WIDTH = 176
/** 二级菜单的定位（fixed 坐标，因为它挂在 body 上）。 */
const submenuStyle = ref({ left: '0px', top: '0px' })
const submenuRef = ref<HTMLElement | null>(null)

/** :param item: 菜单项。 :return: 是否带子项。 */
function hasChildren(item: EditorContextMenuItem): boolean {
  return Array.isArray(item.children) && item.children.length > 0
}

/**
 * 二级菜单的 DOM ref 收集（它在 `v-for` 里，用函数 ref 才能拿到单个元素）。
 *
 * :param el: 挂载的元素或 null。
 * :return: 无返回值。
 */
function setSubmenuRef(el: unknown): void {
  submenuRef.value = (el as HTMLElement | null) ?? null
}

/**
 * 悬停到某个父项上 → 展开它的二级菜单。
 *
 * :param item: 悬停到的菜单项。
 * :param event: 指针事件（取当前行的屏幕位置）。
 * :return: 无返回值。
 */
function onRowEnter(item: EditorContextMenuItem, event: PointerEvent): void {
  if (!hasChildren(item)) return
  const row = event.currentTarget
  if (!(row instanceof HTMLElement)) return
  const rect = row.getBoundingClientRect()
  // 父菜单本身会被 JS 翻转进视口，但它右侧未必还有空间放二级菜单 —— 这里单独判一次。
  const flipLeft = rect.right + SUBMENU_WIDTH > window.innerWidth - 8
  const left = flipLeft
    ? Math.max(8, rect.left - SUBMENU_WIDTH)
    : Math.min(rect.right + 2, window.innerWidth - 8 - SUBMENU_WIDTH)
  submenuSide.value = flipLeft ? 'left' : 'right'
  submenuStyle.value = { left: `${Math.round(left)}px`, top: `${Math.round(rect.top - 6)}px` }
  openSubmenuAction.value = item.action
  // 渲染后拿真实高度再夹一次纵向（子菜单比父项高，靠下边沿时会被视口切掉）。
  void nextTick().then(clampSubmenuVertically)
}

/**
 * 把二级菜单夹进视口纵向范围。
 *
 * :return: 无返回值。
 */
function clampSubmenuVertically(): void {
  const height = submenuRef.value?.offsetHeight ?? 0
  if (!height) return
  const top = Math.min(
    Number.parseFloat(submenuStyle.value.top),
    window.innerHeight - 8 - height
  )
  submenuStyle.value = { ...submenuStyle.value, top: `${Math.round(Math.max(8, top))}px` }
}

/**
 * 点击菜单项：父项只开合子菜单，叶子项才派发命令。
 *
 * :param item: 被点击的菜单项。
 * :return: 无返回值。
 */
function onItemClick(item: EditorContextMenuItem): void {
  if (hasChildren(item)) {
    // 点击也能开合：给没有 hover 的场景（触控板、键盘 Tab 到这里）留一个入口。
    openSubmenuAction.value = openSubmenuAction.value === item.action ? null : item.action
    return
  }
  emit('command', item.action)
}

/** :param group: 分组。 :return: 该组是否有至少一个可用项（决定前面的分隔线要不要画）。 */
function hasEnabledItem(group: EditorContextMenuGroup): boolean {
  return group.items.some((item) => !item.disabled)
}

/** 右侧/底部空间不足时向左/向上翻转，避免菜单溢出视口。 */
const menuStyle = computed(() => {
  const { width, height } = menuSize.value
  const viewW = window.innerWidth
  const viewH = window.innerHeight
  const left = props.x + width > viewW - 8 ? Math.max(8, props.x - width) : props.x
  const top = props.y + height > viewH - 8 ? Math.max(8, props.y - height) : props.y
  return { left: `${left}px`, top: `${top}px`, minWidth: `${width}px` }
})

/**
 * 测量菜单真实尺寸（供翻转计算）；数值未变则跳过，避免无谓重渲染。
 *
 * :return: 无返回值。
 */
function measure(): void {
  const el = menuRef.value
  if (!el) return
  const width = el.offsetWidth
  const height = el.offsetHeight
  if (width === menuSize.value.width && height === menuSize.value.height) return
  menuSize.value = { width, height }
}

/** 监听菜单尺寸变化（图标延迟加载、分组切换都会改变高度），否则翻转位置会基于过期尺寸算错。 */
let resizeObserver: ResizeObserver | null = null

/** 每次打开后测量实际宽高用于翻转计算；等下一帧避免布局抖动。 */
watch(
  () => props.visible,
  async (open) => {
    if (!open) {
      // 收起时一并收掉二级菜单，否则下次打开会看到上一次悬停的那项已经展开。
      openSubmenuAction.value = null
      resizeObserver?.disconnect()
      resizeObserver = null
      return
    }
    await nextTick()
    await nextTick()
    measure()
    const el = menuRef.value
    if (el && typeof ResizeObserver !== 'undefined') {
      resizeObserver?.disconnect()
      resizeObserver = new ResizeObserver(() => measure())
      resizeObserver.observe(el)
    }
  }
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<style lang="scss">
/* 全屏透明点击层：点击菜单以外任意处即关闭。z-index 低于菜单自身。 */
.editor-context-menu-host {
  position: fixed;
  z-index: 90;
  inset: 0;
}

.editor-context-menu {
  position: fixed;
  z-index: 91;
  min-width: 200px;
  max-height: calc(100vh - 16px);
  padding: 6px;
  overflow-y: auto;
  border: 1px solid #e1e7f0;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 16px 45px rgb(29 52 83 / 18%);
  /* 配合 JS 翻转：纵向可用满视口（上下各留 8px），保证菜单永远完整落在窗口内 */
  overscroll-behavior: contain;
}

.editor-context-menu__item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  color: #526079;
  background: transparent;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.editor-context-menu__item svg {
  flex: 0 0 auto;
  width: 17px;
  height: 17px;
  color: #2f80ed;
}

.editor-context-menu__item:hover,
.editor-context-menu__item:focus-visible {
  color: #2f80ed;
  background: #edf5ff;
}

.editor-context-menu__item.danger {
  color: #d64545;
}

.editor-context-menu__item.danger svg {
  color: currentcolor;
}

/*
 * 二级菜单的宿主行：子菜单相对它绝对定位。
 * ⚠️ 指针从父项移进子菜单不会触发 pointerleave（子菜单是它的后代），
 * 所以不需要额外的「延迟关闭」定时器，也不会出现移过去就关的抖动。
 */
.editor-context-menu__row {
  position: relative;
}

.editor-context-menu__label {
  flex: 0 1 auto;
}

/* 右侧留白由 chevron 顶开，父项与叶子项的左缘因此仍然对齐。 */
.editor-context-menu__chevron {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin-left: auto;
  color: #94a3b8;
}

.editor-context-menu__row.is-open > .editor-context-menu__item {
  color: #2f80ed;
  background: #edf5ff;
}

/*
 * 二级菜单本体。
 * ⚠️ 它 Teleport 到 body、坐标由 JS 算（`submenuStyle`）—— 留在菜单树内会被容器的
 * `overflow-y: auto` 裁掉。`width` 写死而不是 min-width：JS 算水平位置时用的就是这个值。
 */
.editor-context-menu--sub {
  position: fixed;
  z-index: 92;
  width: 168px;
  max-height: calc(100vh - 16px);
  animation: none;
}

/* 往左展开时把父项的 chevron 翻个面，让「往哪边开」一眼可见。 */
.editor-context-menu__row:has(> .editor-context-menu--sub.is-left) .editor-context-menu__chevron {
  transform: rotate(180deg);
}

.editor-context-menu__divider {
  height: 1px;
  margin: 5px 6px;
  background: #e5ebf3;
}

html.dark .editor-context-menu {
  border-color: #3a3d44;
  background: #2e2e2e;
  box-shadow: 0 16px 45px rgb(0 0 0 / 46%);
}

html.dark .editor-context-menu__item {
  color: #b2bdd6;
}

html.dark .editor-context-menu__item svg {
  color: #8ab8ff;
}

html.dark .editor-context-menu__item:hover,
html.dark .editor-context-menu__item:focus-visible {
  color: #8ab8ff;
  background: #454545;
}

html.dark .editor-context-menu__item.danger {
  color: #ff9a9a;
}

html.dark .editor-context-menu__divider {
  background: #3a3d44;
}
</style>
