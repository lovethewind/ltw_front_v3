<template>
  <div
    class="note-embed-card"
    :class="stateClass"
    role="button"
    tabindex="0"
    :title="canOpen ? '打开笔记' : undefined"
    @click="open"
    @keydown.enter.prevent="open"
    @keydown.space.prevent="open"
    @contextmenu="onContextMenu"
  >
    <div class="note-embed-card__body">
      <span v-if="folderName" class="note-embed-card__meta">
        <Icon icon="material-symbols:folder-outline-rounded" />{{ folderName }}
      </span>
      <span class="note-embed-card__title">{{ displayTitle }}</span>
      <span v-if="excerpt" class="note-embed-card__excerpt">{{ excerpt }}</span>
      <span v-else-if="hint" class="note-embed-card__hint">{{ hint }}</span>
      <span v-if="updatedAt" class="note-embed-card__meta note-embed-card__meta--time">
        <Icon icon="material-symbols:schedule-rounded" />{{ updatedAt }}
      </span>
    </div>
    <Icon v-if="canOpen" class="note-embed-card__arrow" icon="material-symbols:arrow-forward-rounded" />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import noteApi from '@/api/note'
import type { INote, INoteFolder } from '@/interface/note'
import { useNoteStore } from '@/stores/note'
import { dispatchOpenNote } from '@/utils/note-open-events'
import { formatNoteCompactDate, stripNoteMarkdown } from './note-navigation'

/**
 * 网页端的笔记嵌入卡片（只读）。
 *
 * 取数只走跨端标识 `serverId`（`noteApi.getDetail`）——桌面端写进正文的
 * `note:<本机uuid>` 在网页端没有对应字段与接口，**不能**拿来查询。
 *
 * 视觉与信息结构对齐桌面端 `ltw_notes_desktop/src/components/NoteEmbedCard.vue`
 * （文件夹徽标 + 标题 + 两行摘要 + 更新时间），差异只在交互：网页端为只读，
 * 点卡片直接打开笔记（桌面端是「点卡片展开全文、点箭头打开」）。
 *
 * 四态：
 * - `pending`：没有 `serverId`（目标未同步，或卡片是桌面端旧版本插入的存量数据）→ 占位提示；
 * - `loading`：取数中；
 * - 正常：文件夹 + 标题 + 摘要 + 时间；
 * - `failed`：目标不存在 / 已删除 / 请求失败。
 *
 * 契约见 ltw_notes_desktop/docs/specs/2026-10-12-note-embed-web-render.md。
 */
const props = withDefaults(
  defineProps<{
    /** 桌面端本机 ID；网页端不用于取数，仅在缺标题时作为占位线索。 */
    noteId?: string
    /** 跨端标识（服务端主键）；为 null 时整张卡片降级成占位。 */
    serverId?: string | null
    /** 插入时的标题快照（可能过期，仅作兜底）。 */
    title?: string | null
  }>(),
  { noteId: '', serverId: null, title: null }
)

/**
 * 卡片向宿主（nodeView）上抛的交互事件。
 *
 * `context-menu`：右键卡片，由宿主补上节点位置后转交编辑器弹卡片专属菜单；
 * `available` 表示目标笔记是否可正常打开（未同步 / 取数失败为 false，菜单据此禁用打开类操作）。
 */
const emit = defineEmits<{
  (event: 'context-menu', payload: { x: number; y: number; available: boolean }): void
}>()

/**
 * 文件夹名要查 store（笔记详情只给 `folderId`）。
 *
 * ⚠️ 卡片由 Crepe 的 nodeView 用 `render()` 挂载，是**独立** vnode tree，没有继承
 * 应用上下文；`useNoteStore()` 依赖全局 active pinia（`app.use(createPinia())` 时设置）。
 * 万一取不到就降级成「不显示文件夹徽标」，**不能**让整张卡片渲染失败。
 *
 * :return: 文件夹列表；不可用时为空数组。
 */
function readFolders(): INoteFolder[] {
  try {
    return useNoteStore().folders
  } catch {
    return []
  }
}

const note = ref<INote | null>(null)
const loading = ref(false)
const failed = ref(false)

/** 有跨端标识才可能打开，否则整张卡片不可点。 */
const canOpen = computed(() => Boolean(props.serverId))
const stateClass = computed(() => ({
  'is-pending': !props.serverId,
  'is-loading': loading.value,
  'is-failed': failed.value
}))
/** 标题优先用实时取到的（插入时的快照会过期），再退回快照与占位文案。 */
const displayTitle = computed(() => note.value?.title || props.title || '未命名笔记')
/** 摘要固定截前 160 字（与桌面端一致），多余部分交给 CSS 两行省略号。 */
const excerpt = computed(() =>
  note.value ? stripNoteMarkdown(note.value.content || '').slice(0, 160) : ''
)
const folderName = computed(() => {
  const folderId = note.value?.folderId
  if (folderId === null || folderId === undefined) return ''
  return readFolders().find((folder) => String(folder.id) === String(folderId))?.name ?? ''
})
const updatedAt = computed(() => formatNoteCompactDate(note.value?.updateTime ?? ''))
const hint = computed(() => {
  if (!props.serverId) return '此嵌入尚未同步到云端，同步后可在网页显示'
  if (loading.value) return '正在加载嵌入的笔记…'
  if (failed.value) return '笔记不存在或已被删除'
  return ''
})

/**
 * 按跨端标识拉取被嵌入笔记的标题与正文。
 *
 * :return: 无返回值。
 */
async function loadNote(): Promise<void> {
  if (!props.serverId) return
  loading.value = true
  failed.value = false
  try {
    const response = await noteApi.getDetail(props.serverId)
    note.value = response.data
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 在笔记工作区的**新标签页**打开被嵌入的笔记（口径与桌面端一致）。
 *
 * ⚠️ 不是原地换页：卡片嵌在正文里，点它的时候当前标签几乎总是停在另一篇笔记
 * （经常是编辑态）上——原地跳转会把这篇顶掉，未保存的输入也跟着没。
 *
 * 卡片由 Crepe 的 nodeView 挂成独立 vnode tree，拿不到工作区的标签状态函数，
 * 所以经 `dispatchOpenNote` 事件桥接，由 `NoteWorkspace` 接管。
 *
 * :return: 无返回值。
 */
function open(): void {
  if (!props.serverId) return
  dispatchOpenNote(String(props.serverId), true)
}

/**
 * 右键卡片：拦住浏览器原生菜单，把坐标上抛给宿主 nodeView（由其补节点位置后转交编辑器）。
 *
 * ⚠️ 只读态**直接放行原生菜单**：编辑器在只读态不弹卡片菜单，此时若吞掉右键就成了
 * 「右键什么都没有」，比留着原生的复制 / 查看菜单更糟。判据取自 ProseMirror 根元素的
 * `contenteditable`（Crepe 的 setReadonly 会把它置为 false），避免为此新增一条跨层 prop。
 *
 * 关键：必须 `stopPropagation`。nodeView 的 `stopEvent` 只让 ProseMirror 自己忽略事件，
 * 管不住挂在编辑器根元素上的原生 contextmenu 监听；不拦冒泡就会「卡片菜单 + 正文菜单」双弹。
 *
 * :param event: 原生 contextmenu 事件。
 * :return: 无返回值。
 */
function onContextMenu(event: MouseEvent): void {
  const root = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  if (root?.closest('.ProseMirror')?.getAttribute('contenteditable') === 'false') return
  event.preventDefault()
  event.stopPropagation()
  // 加载中尚未确定目标，不弹菜单（坐标已拿到，只是此时没有可做的操作）。
  if (loading.value) return
  emit('context-menu', {
    x: event.clientX,
    y: event.clientY,
    available: canOpen.value && !failed.value
  })
}

onMounted(() => {
  void loadNote()
})
</script>
<style scoped lang="scss">
/*
 * 样式对齐桌面端同名组件：整圈细边框 + 白底 + 圆角 12，信息自上而下为
 * 文件夹 / 标题 / 摘要 / 时间，右侧一个打开箭头。
 */
.note-embed-card {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-bg-color);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 4px 16px rgb(47 128 237 / 10%);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  /* 未同步 / 取数失败时不提供跳转，去掉可点暗示。 */
  &.is-pending,
  &.is-failed {
    cursor: default;

    &:hover {
      border-color: var(--el-border-color);
      box-shadow: none;
    }
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  &__meta {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--el-text-color-secondary);
    font-size: 11px;
    line-height: 16px;

    svg {
      width: 12px;
      height: 12px;
    }
  }

  &__meta--time {
    margin-top: 2px;
  }

  &__title {
    color: var(--el-text-color-primary);
    font-size: 14px;
    font-weight: 680;
    line-height: 20px;
    overflow-wrap: anywhere;
  }

  &__excerpt,
  &__hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
    overflow-wrap: anywhere;
  }

  /* 摘要固定两行，多出的部分由省略号收尾（与桌面端一致，避免硬切在半句）。 */
  &__excerpt {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  &__arrow {
    flex-shrink: 0;
    font-size: 18px;
    color: var(--el-text-color-secondary);
    transition:
      color 0.15s ease,
      transform 0.15s ease;
  }

  &:hover &__arrow {
    color: var(--el-color-primary);
    transform: translateX(2px);
  }
}
</style>
