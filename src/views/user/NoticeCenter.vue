<template>
  <div v-if="user" class="notice-center-page">
    <section class="notice-hero">
      <div class="notice-hero-orbit orbit-a" />
      <div class="notice-hero-orbit orbit-b" />
      <div class="notice-hero-content">
        <div>
          <span class="notice-kicker">
            <Icon icon="solar:bell-bing-bold-duotone" />
            消息中心
          </span>
          <h1>看看又有谁与你互动啦</h1>
          <p>集中处理评论、点赞、收藏和系统提醒。</p>
        </div>
        <div class="notice-hero-panel">
          <span>当前栏目</span>
          <strong>{{ currentActiveMenu.name }}</strong>
          <small>{{ total }} 条消息 · {{ selectedCount }} 条已选</small>
        </div>
      </div>
    </section>

    <main class="notice-center-shell">
      <aside class="notice-type-nav" aria-label="消息分类">
        <button
          v-for="noticeType in NoticeTypeList"
          :key="'noticeTypeItem' + noticeType.value"
          type="button"
          class="notice-type-card"
          :class="{ active: currentActiveMenu.index === noticeType.index }"
          @click="selectNotice(noticeType)"
        >
          <span class="notice-type-icon">
            <Icon :icon="noticeType.icon" />
          </span>
          <span class="notice-type-text">
            <strong>{{ noticeType.name }}</strong>
            <small>{{ getNoticeTypeHint(noticeType.value) }}</small>
          </span>
          <span v-if="noticeUnreadCountMap[noticeType.value]" class="notice-type-badge">
            {{ noticeUnreadCountMap[noticeType.value] }}
          </span>
        </button>
      </aside>

      <section class="notice-main-panel">
        <div class="notice-panel-heading">
          <div>
            <span class="notice-section-label">
              <Icon :icon="currentActiveMenu.icon" />
              {{ currentActiveMenu.name }}
            </span>
            <h2>{{ currentActiveMenu.name }}列表</h2>
          </div>
          <div class="notice-toolbar">
            <el-checkbox v-model="hasSelectAll" @click="checkAllShow()">全选</el-checkbox>
            <button type="button" class="notice-tool-button danger" @click="deleteSelectNotice()">
              <Icon icon="material-symbols:delete-outline-rounded" />
              删除选中
            </button>
            <button
              type="button"
              class="notice-tool-button"
              @click="updateSelectNoticeReadStatus()"
            >
              <Icon icon="material-symbols:mark-email-read-outline-rounded" />
              标记已读
            </button>
            <button type="button" class="notice-tool-button ghost" @click="clearNotice()">
              <Icon icon="icon-park-outline:clear" />
              清空本类
            </button>
          </div>
        </div>

        <div class="notice-feed">
          <article
            v-for="notice in noticeDataList"
            :key="'notice_' + notice.id"
            class="notice-feed-item"
            :class="{ unread: !notice.isRead }"
            @click="updateNoticeReadStatus(notice)"
          >
            <el-checkbox-group v-model="checkList" class="notice-select-group">
              <el-checkbox :value="notice.id" @click.stop />
            </el-checkbox-group>

            <div class="notice-feed-card">
              <div v-if="notice.noticeType !== NoticeTypeEnum.SYSTEM" class="notice-sender">
                <a
                  class="notice-user-link"
                  :href="'/user/' + notice.detail.fromUser.id"
                  target="_blank"
                  @click.stop
                >
                  <el-avatar :src="notice.detail.fromUser.avatar" :size="28" />
                  <span>{{ notice.detail.fromUser.nickname }}</span>
                </a>
              </div>

              <h3>
                <span
                  v-if="notice.noticeType === NoticeTypeEnum.SYSTEM"
                  class="notice-official-badge"
                >
                  <Icon icon="solar:verified-check-bold" />
                  官方
                </span>
                {{ notice.title }}
              </h3>
              <div
                v-if="
                  [notice.detail?.objType, notice.detail?.commentType].includes(
                    ObjectTypeEnum.ARTICLE
                  )
                "
                class="notice-context-line"
              >
                <span class="notice-context-label">来自文章</span>
                <a
                  class="notice-context-source"
                  :href="'/article/' + notice.detail.objId"
                  target="_blank"
                  @click.stop
                  >@{{ notice.detail.objContent }}</a
                >
              </div>
              <p class="notice-content">{{ notice.content }}</p>

              <div
                v-if="
                  [notice.detail?.objType, notice.detail?.commentType].includes(
                    ObjectTypeEnum.PICTURE
                  ) || notice.detail?.commentId
                "
                class="notice-source-preview"
              >
                <div
                  v-if="
                    [notice.detail?.objType, notice.detail?.commentType].includes(
                      ObjectTypeEnum.PICTURE
                    )
                  "
                >
                  <span class="notice-source-tag picture">图片</span>
                  <el-image
                    :src="notice.detail.objContent"
                    class="notice-picture"
                    :preview-src-list="[notice.detail.objContent]"
                    @click.stop
                  />
                </div>
                <p v-if="notice.detail?.commentId" class="notice-origin-comment">
                  原评论：{{ notice.detail?.commentContent }}
                </p>
              </div>

              <div class="notice-card-actions">
                <div class="notice-card-meta">
                  <span class="notice-read-state">
                    <span v-if="!notice.isRead" class="notice-unread-dot" aria-hidden="true" />
                    {{ notice.isRead ? '已读' : '未读' }}
                  </span>
                  <time class="notice-card-time">
                    <Icon icon="mingcute:time-line" />
                    {{ covertTimeHowLongAgo(notice.createTime) }}
                  </time>
                </div>
                <button type="button" @click.stop="deleteNotice([notice.id])">
                  <Icon icon="material-symbols:delete-outline-rounded" />
                  删除
                </button>
              </div>
            </div>
          </article>
        </div>

        <LoadMore
          :total="total"
          :no-more="noMore"
          :loading-rows="20"
          :empty-height="420"
          @load="getNoticeList"
        />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import noticeApi from '@/api/notice'
import { Icon } from '@iconify/vue'
import { NoticeTypeEnum, ObjectTypeEnum } from '@/enums'
import { NoticeTypeList } from '@/utils/constant'
import type { INotice } from '@/interface'
import { covertTimeHowLongAgo } from '@/utils/date'
import LoadMore from '@/components/base/LoadMore.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'

type NoticeMenu = (typeof NoticeTypeList)[number]

const route = useRoute()
const userStore = useUserStore()

const currentActiveMenu = ref<NoticeMenu>(NoticeTypeList[0])
const currentPage = ref(1)
const pageSize = ref(10)
const noticeDataList = ref<INotice[]>([])
const noticeUnreadCountMap = ref<Record<number, number>>({})
const total = ref(0)
const checkList = ref<string[]>([])
const hasSelectAll = ref(false)
const eventServer = EventServer.getInstance()

const user = computed(() => {
  return userStore.user
})
const noMore = computed(() => {
  return noticeDataList.value.length >= total.value
})
const selectedCount = computed(() => {
  return checkList.value.length
})

onMounted(() => {
  const noticeType = String(route.params.noticeType || NoticeTypeEnum.SYSTEM)
  currentActiveMenu.value =
    NoticeTypeList.find((item) => item.index === noticeType) || NoticeTypeList[0]
  getNoticeUnreadCount()
  getNoticeList()
})

/**
 * 获取各类型通知的未读数量，并同步顶部导航的未读角标。
 *
 * :return: 无返回值。
 */
function getNoticeUnreadCount(): void {
  eventServer.emit(EventName.FLUSH_NOTICE_UNREAD_COUNT)
  noticeApi.getUnreadCount().then((res) => {
    noticeUnreadCountMap.value = res.data
  })
}

/**
 * 拉取当前分类通知列表，并按分页追加到消息流。
 *
 * :return: 无返回值。
 */
function getNoticeList(): void {
  noticeApi
    .getNoticeList(currentActiveMenu.value.value, currentPage.value, pageSize.value)
    .then((res) => {
      noticeDataList.value = [...noticeDataList.value, ...res.data.records]
      total.value = res.data.total
      if (res.data.records.length) {
        currentPage.value++
      }
    })
}

/**
 * 将单条通知标记为已读。
 *
 * :param notice: 需要标记已读的通知。
 * :return: 无返回值。
 */
function updateNoticeReadStatus(notice: INotice): void {
  if (notice.isRead) {
    return
  }
  noticeApi
    .updateNoticeReadStatus({
      ids: [notice.id]
    })
    .then(() => {
      notice.isRead = true
      getNoticeUnreadCount()
    })
}

/**
 * 将当前选中的未读通知批量标记为已读。
 *
 * :return: 无返回值。
 */
function updateSelectNoticeReadStatus(): void {
  if (!checkList.value.length) {
    ElMessage({
      message: '请选择要标记为已读的通知',
      type: 'warning',
      plain: true
    })
    return
  }
  ElMessageBox.confirm(`确定将当前选中的${checkList.value.length}条通知标记为已读吗?`, '提示').then(
    () => {
      const noticeIds = noticeDataList.value
        .filter((item) => !item.isRead && checkList.value.includes(item.id))
        .map((item) => {
          item.isRead = true
          return item.id
        })
      if (noticeIds.length === 0) {
        checkList.value = []
        hasSelectAll.value = false
        return
      }
      noticeApi
        .updateNoticeReadStatus({
          ids: noticeIds
        })
        .then(() => {
          checkList.value = []
          hasSelectAll.value = false
          getNoticeUnreadCount()
        })
    }
  )
}

/**
 * 删除指定通知，删除前会弹出二次确认。
 *
 * :param noticeIds: 需要删除的通知 ID 列表。
 * :return: 无返回值。
 */
function deleteNotice(noticeIds: string[]): void {
  ElMessageBox.confirm(`确定要删除${noticeIds.length}条通知吗?`, '提示').then(() => {
    noticeApi
      .deleteNotice({
        ids: noticeIds
      })
      .then(() => {
        noticeDataList.value = noticeDataList.value.filter((item) => !noticeIds.includes(item.id))
        checkList.value = []
        hasSelectAll.value = false
        getNoticeUnreadCount()
        if (noticeDataList.value.length === 0) {
          currentPage.value--
          getNoticeList()
        }
      })
  })
}

/**
 * 删除当前勾选的通知。
 *
 * :return: 无返回值。
 */
function deleteSelectNotice(): void {
  if (!checkList.value.length) {
    ElMessage({
      message: '请选择要删除的通知',
      type: 'warning',
      plain: true
    })
    return
  }
  deleteNotice(checkList.value)
}

/**
 * 清空当前分类下的所有通知。
 *
 * :return: 无返回值。
 */
function clearNotice(): void {
  if (noticeDataList.value.length === 0) {
    ElMessage({
      message: '当前没有通知',
      type: 'warning',
      plain: true
    })
    return
  }
  ElMessageBox.confirm(`确定要清空所有通知吗?`, '提示').then(() => {
    noticeApi.clearNotice(currentActiveMenu.value.value).then(() => {
      getNoticeUnreadCount()
      reset()
    })
  })
}

/**
 * 切换当前页通知的全选状态。
 *
 * :return: 无返回值。
 */
function checkAllShow(): void {
  checkList.value = hasSelectAll.value ? [] : noticeDataList.value.map((item) => item.id)
}

/**
 * 切换当前通知分类，并重置列表分页。
 *
 * :param noticeType: 目标通知分类配置。
 * :return: 无返回值。
 */
function selectNotice(noticeType: NoticeMenu): void {
  if (currentActiveMenu.value.index === noticeType.index) return
  currentActiveMenu.value =
    NoticeTypeList.find((item) => item.index === noticeType.index) || NoticeTypeList[0]
  reset()
}

/**
 * 重置当前列表状态并重新拉取第一页数据。
 *
 * :return: 无返回值。
 */
function reset(): void {
  noticeDataList.value = []
  currentPage.value = 1
  hasSelectAll.value = false
  checkList.value = []
  total.value = 0
  eventServer.emit(EventName.FLUSH_NOTICE_UNREAD_COUNT)
  getNoticeList()
}

/**
 * 根据通知类型获取简短说明。
 *
 * :param noticeType: 通知类型值。
 * :return: 分类说明文案。
 */
function getNoticeTypeHint(noticeType: number): string {
  const unreadCount = noticeUnreadCountMap.value[noticeType] || 0
  if (unreadCount) {
    return `${unreadCount} 条未读`
  }
  return '暂无未读'
}
</script>

<style lang="scss" scoped>
.notice-center-page {
  min-height: 100vh;
  padding-bottom: 56px;
  background: radial-gradient(circle at 10% 6%, rgba(45, 212, 191, 0.16), transparent 30%),
    linear-gradient(180deg, #f8fbff 0%, #eef3f8 100%);
  color: #111827;
}

.notice-hero {
  position: relative;
  overflow: hidden;
  min-height: 300px;
  padding: 82px 24px 96px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(238, 247, 255, 0.82)),
    linear-gradient(120deg, rgba(59, 130, 246, 0.14), rgba(16, 185, 129, 0.18));
}

.notice-hero::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 78px;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0), #f8fbff);
}

.notice-hero-orbit {
  position: absolute;
  width: 260px;
  height: 260px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: 38% 62% 48% 52%;
  filter: blur(0.2px);
  animation: notice-liquid 9s ease-in-out infinite;
}

.orbit-a {
  top: 28px;
  left: 8%;
  background: rgba(45, 212, 191, 0.12);
}

.orbit-b {
  right: 12%;
  bottom: 18px;
  background: rgba(245, 158, 11, 0.12);
  animation-delay: -3s;
}

.notice-hero-content {
  position: relative;
  z-index: 1;
  width: min(1180px, 100%);
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
}

.notice-kicker,
.notice-section-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #2563eb;
  font-weight: 700;
}

.notice-kicker {
  color: #0f766e;
  font-size: 0.95rem;
}

.notice-hero h1 {
  margin: 14px 0 12px;
  font-size: 2.5rem;
  line-height: 1.15;
  letter-spacing: 0;
}

.notice-hero p {
  margin: 0;
  color: #61708a;
  font-size: 1.02rem;
  line-height: 1.8;
}

.notice-hero-panel {
  width: 240px;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}

.notice-hero-panel span,
.notice-hero-panel small {
  display: block;
  color: #64748b;
}

.notice-hero-panel strong {
  display: block;
  margin: 8px 0;
  color: #111827;
  font-size: 1.55rem;
}

.notice-center-shell {
  position: relative;
  z-index: 1;
  width: min(1180px, calc(100% - 32px));
  margin: -64px auto 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.notice-type-nav,
.notice-main-panel {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}

.notice-type-nav {
  position: sticky;
  top: 84px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notice-type-card {
  width: 100%;
  min-height: 58px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 9px 10px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  background: transparent;
  color: #475569;
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.notice-type-card:hover,
.notice-type-card.active {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.2);
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(236, 253, 245, 0.9));
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.08);
}

.notice-type-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eef6ff;
  color: #2563eb;
  font-size: 1.3rem;
}

.notice-type-text strong,
.notice-type-text small {
  display: block;
}

.notice-type-text strong {
  color: #1f2937;
  font-size: 0.96rem;
}

.notice-type-text small {
  margin-top: 4px;
  color: #7c8aa0;
}

.notice-type-badge {
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #ef4444;
  font-size: 0.78rem;
  font-weight: 700;
}

.notice-main-panel {
  padding: 18px;
}

.notice-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.notice-panel-heading h2 {
  margin: 5px 0 0;
  color: #111827;
  font-size: 1.2rem;
  line-height: 1.35;
}

.notice-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.notice-tool-button {
  height: 34px;
  border: 1px solid #dbe5f0;
  border-radius: 999px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #475569;
  background: #fff;
  font-size: 0.86rem;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    background 160ms ease;
}

.notice-tool-button:hover {
  transform: translateY(-1px);
  border-color: #93c5fd;
  color: #2563eb;
  background: #eff6ff;
}

.notice-tool-button.danger:hover {
  border-color: #fecaca;
  color: #dc2626;
  background: #fff1f2;
}

.notice-tool-button.ghost {
  color: #0f766e;
  background: #eefdf8;
  border-color: #c7f2e2;
}

.notice-feed {
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notice-feed-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  align-items: flex-start;
}

.notice-select-group {
  padding-top: 12px;
  display: flex;
  justify-content: center;
}

.notice-feed-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  padding: 12px 14px;
  background: #fff;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.notice-feed-item.unread .notice-feed-card {
  border-color: rgba(37, 99, 235, 0.24);
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.08);
}

.notice-feed-card:hover {
  transform: translateY(-2px);
  border-color: rgba(20, 184, 166, 0.28);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.09);
}

.notice-card-actions,
.notice-card-meta,
.notice-card-time,
.notice-read-state,
.notice-sender,
.notice-user-link {
  display: flex;
  align-items: center;
}

.notice-unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12);
}

.notice-source-tag {
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 0.76rem;
  font-weight: 700;
}

.notice-sender {
  min-width: 0;
  margin-bottom: 8px;
}

.notice-user-link {
  min-width: 0;
  gap: 7px;
  color: #1f2937;
  font-size: 0.9rem;
  font-weight: 700;
}

.notice-user-link span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-feed-card h3 {
  margin: 0 0 5px;
  color: #111827;
  font-size: 1rem;
  line-height: 1.35;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.notice-official-badge {
  flex: 0 0 auto;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #dc2626;
  background: #fff1f2;
  font-size: 0.76rem;
  font-weight: 700;
}

.notice-context-line {
  min-width: 0;
  margin: -1px 0 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #7c8aa0;
  font-size: 0.88rem;
  line-height: 1.45;
}

.notice-context-label {
  flex: 0 0 auto;
  color: #94a3b8;
  font-weight: 600;
}

.notice-context-source {
  min-width: 0;
  color: #2563eb;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-context-source:hover {
  color: #0f766e;
}

.notice-content {
  margin: 0;
  color: #526174;
  line-height: 1.55;
  word-break: break-word;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notice-source-preview {
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
}

.notice-source-preview > div {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.notice-source-preview a {
  color: #334155;
  font-weight: 600;
  line-height: 1.45;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.notice-source-tag.article {
  color: #b45309;
  background: #fffbeb;
}

.notice-source-tag.picture {
  color: #0369a1;
  background: #e0f2fe;
}

.notice-picture {
  width: 72px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
}

.notice-origin-comment {
  margin: 6px 0 0;
  color: #7c8aa0;
  line-height: 1.45;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.notice-card-actions {
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  color: #7c8aa0;
  font-size: 0.82rem;
}

.notice-card-meta {
  gap: 10px;
}

.notice-read-state {
  gap: 6px;
}

.notice-card-time {
  gap: 4px;
  color: #7c8aa0;
}

.notice-card-actions button {
  border: 0;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
  background: transparent;
  cursor: pointer;
}

.notice-card-actions button:hover {
  color: #dc2626;
}

@keyframes notice-liquid {
  0%,
  100% {
    border-radius: 38% 62% 48% 52%;
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  50% {
    border-radius: 58% 42% 36% 64%;
    transform: translate3d(18px, -10px, 0) rotate(7deg);
  }
}

:global(html.dark .notice-center-page) {
  background: radial-gradient(circle at 12% 8%, rgba(45, 212, 191, 0.14), transparent 32%),
    linear-gradient(180deg, #101827 0%, #0b1120 100%);
  color: #e5e7eb;
}

:global(html.dark .notice-hero) {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(17, 24, 39, 0.86)),
    linear-gradient(120deg, rgba(37, 99, 235, 0.16), rgba(20, 184, 166, 0.14));
}

:global(html.dark .notice-hero::after) {
  background: linear-gradient(180deg, rgba(16, 24, 39, 0), #101827);
}

:global(html.dark .notice-hero-panel),
:global(html.dark .notice-type-nav),
:global(html.dark .notice-main-panel),
:global(html.dark .notice-feed-card) {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.86);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.24);
}

:global(html.dark .notice-hero h1),
:global(html.dark .notice-hero-panel strong),
:global(html.dark .notice-type-text strong),
:global(html.dark .notice-panel-heading h2),
:global(html.dark .notice-feed-card h3),
:global(html.dark .notice-user-link) {
  color: #f8fafc;
}

:global(html.dark .notice-hero p),
:global(html.dark .notice-hero-panel span),
:global(html.dark .notice-hero-panel small),
:global(html.dark .notice-type-text small),
:global(html.dark .notice-content),
:global(html.dark .notice-card-time),
:global(html.dark .notice-card-actions),
:global(html.dark .notice-origin-comment) {
  color: #94a3b8;
}

:global(html.dark .notice-type-card) {
  color: #cbd5e1;
}

:global(html.dark .notice-type-card:hover),
:global(html.dark .notice-type-card.active) {
  border-color: rgba(45, 212, 191, 0.26);
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(15, 118, 110, 0.18));
}

:global(html.dark .notice-type-icon) {
  color: #93c5fd;
  background: rgba(37, 99, 235, 0.18);
}

:global(html.dark .notice-tool-button) {
  border-color: rgba(148, 163, 184, 0.22);
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.72);
}

:global(html.dark .notice-tool-button:hover) {
  color: #93c5fd;
  background: rgba(37, 99, 235, 0.14);
}

:global(html.dark .notice-tool-button.ghost) {
  color: #5eead4;
  background: rgba(20, 184, 166, 0.12);
  border-color: rgba(45, 212, 191, 0.2);
}

:global(html.dark .notice-source-preview) {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.72);
}

:global(html.dark .notice-source-preview a) {
  color: #dbeafe;
}

:global(html.dark .notice-context-line),
:global(html.dark .notice-context-label) {
  color: #94a3b8;
}

:global(html.dark .notice-context-source) {
  color: #93c5fd;
}

:global(html.dark .notice-official-badge) {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.14);
}

@media (max-width: 920px) {
  .notice-hero {
    padding: 72px 18px 88px;
  }

  .notice-hero-content {
    align-items: flex-start;
    flex-direction: column;
  }

  .notice-hero-panel {
    width: min(100%, 320px);
  }

  .notice-center-shell {
    grid-template-columns: 1fr;
    width: min(100% - 24px, 680px);
  }

  .notice-type-nav {
    position: static;
    overflow-x: auto;
    flex-direction: row;
    padding: 10px;
  }

  .notice-type-card {
    width: 220px;
    flex: 0 0 220px;
  }

  .notice-panel-heading {
    flex-direction: column;
  }

  .notice-toolbar {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .notice-hero h1 {
    font-size: 2rem;
  }

  .notice-center-shell {
    width: calc(100% - 20px);
  }

  .notice-main-panel {
    padding: 16px;
  }

  .notice-feed-item {
    grid-template-columns: 1fr;
  }

  .notice-select-group {
    justify-content: flex-start;
    padding-top: 0;
  }

  .notice-toolbar {
    gap: 8px;
  }

  .notice-tool-button {
    flex: 1 1 calc(50% - 8px);
    justify-content: center;
  }
}
</style>
