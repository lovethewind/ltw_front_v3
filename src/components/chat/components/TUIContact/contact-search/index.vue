<template>
  <div class="tui-contact-search">
    <div v-if="!isSearching"
         class="tui-contact-search-header"
         @click="changeContactSearchingStatus(true)"
    >
      <div class="tui-contact-search-header-title" @click="changeContactSearchingStatus(!isSearching)">
        <Icon icon="mdi:search" />
        添加好友
      </div>
    </div>
    <div v-if="isSearching" class="tui-contact-search-main">
      <input
        v-model="searchValue"
        class="tui-contact-search-main-input"
        type="text"
        :placeholder="searchingPlaceholder"
        enterkeyhint="search"
        @keyup.enter="search"
        @blur="search"
        @confirm="search"
      >
      <div class="tui-contact-search-main-cancel" @click="changeContactSearchingStatus(!isSearching)">
        取消
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { IUserDetail } from '@/interface'
import type { IContactSearchItem, ICurrentContact, IOption } from '@/interface/ws'
import userApi from '@/api/user'
import chatApi from '@/api/chat'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ContactTypeEnum } from '@/enums/ws'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'

const userStore = useUserStore()
const chatStore = useChatStore()
const eventServer = EventServer.getInstance()

const searchingPlaceholder = '输入用户uid'
const isSearching = ref<boolean>(false)
const searchValue = ref<string>('')

const user = computed(() => {
  return userStore.user
})

/**
 * 切换添加好友搜索框展开状态。
 *
 * :param status: 是否展开搜索框。
 * :return: 无返回值。
 */
function changeContactSearchingStatus(status: boolean): void {
  isSearching.value = status
  if (!status) {
    searchValue.value = ''
    if (isContactSearchItem(chatStore.currentContact)) {
      chatStore.resetCurrentContact()
    }
  }
}

/**
 * 根据 uid 搜索用户，并在通讯录右侧展示搜索结果。
 *
 * :return: 无返回值。
 */
function search(): void {
  if (!searchValue.value) {
    return
  }
  userApi.getUserByUid(searchValue.value).then((res) => {
    showSearchResult(res.data)
  })
}

/**
 * 将搜索结果展示到通讯录右侧详情面板。
 *
 * :param result: 搜索接口返回的用户详情。
 * :return: 无返回值。
 */
function showSearchResult(result: IUserDetail): void {
  const searchContact: IContactSearchItem = {
    id: `search_${result.id}`,
    contactId: result.id,
    contactType: ContactTypeEnum.USER,
    userProfile: {
      id: result.id,
      avatar: result.avatar,
      nickname: result.nickname
    },
    searchUserDetail: result
  }
  chatStore.setCurrentContact(searchContact)
  chatStore.setCurrentContactType(undefined)
  chatStore.setCurrentContactOperation(buildSearchResultOperation(result))
}

/**
 * 构建搜索结果在右侧详情中的操作项。
 *
 * :param result: 搜索接口返回的用户详情。
 * :return: 右侧详情操作项列表。
 */
function buildSearchResultOperation(result: IUserDetail): IOption[] {
  if (user.value?.id === result.id) {
    return [{
      key: 'search_self',
      style: 'text',
      type: 'info',
      label: '这是你自己',
      icon: '',
      onClick: () => {}
    }]
  }
  if (result.isBlocked) {
    return [{
      key: 'search_blocked',
      style: 'text',
      type: 'info',
      label: '已拉黑该用户',
      icon: '',
      onClick: () => {}
    }]
  }
  if (result.isFriend) {
    return [{
      key: 'search_friend',
      style: 'text',
      type: 'info',
      label: '已是好友',
      icon: '',
      onClick: () => {}
    }]
  }
  return [{
    key: 'search_add_friend',
    style: 'button',
    type: 'primary',
    label: '添加好友',
    icon: 'ant-design:user-add-outlined',
    onClick: () => {
      addFriend(result)
    }
  }]
}

/**
 * 发送好友申请。
 *
 * :param result: 搜索接口返回的用户详情。
 * :return: 无返回值。
 */
function addFriend(result: IUserDetail): void {
  ElMessageBox.prompt('请输入申请信息', '添加好友', {
    inputValue: '我是' + (user.value?.nickname || '')
  }).then(({ value }) => {
    chatApi.postContactApply({
      contactId: result.id,
      contactType: ContactTypeEnum.USER,
      content: value
    }).then(() => {
      ElMessage({
        message: '发送好友申请成功',
        type: 'success',
        plain: true
      })
      eventServer.emit(EventName.FLUSH_FRIEND_APPLY_LIST)
    })
  }).catch(() => {
  })
}

/**
 * 判断当前右侧联系人是否为添加好友搜索结果。
 *
 * :param contact: 当前右侧联系人。
 * :return: 是搜索结果时返回 true。
 */
function isContactSearchItem(contact?: ICurrentContact): contact is IContactSearchItem {
  return !!contact && 'searchUserDetail' in contact
}
</script>
<style lang="scss" scoped>
@import "@/assets/css/variables";

.tui-contact-search {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 14px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
  border-bottom: 1px solid #e8edf2;
  flex-direction: column;

  &-header,
  &-main {
    width: 100%;
    min-height: 38px;
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  &-header {
    user-select: none;
    cursor: pointer;

    &-title {
      flex: 1;
      height: 38px;
      padding: 0 12px;
      border: 1px solid #dfe7ee;
      border-radius: 8px;
      background: #fff;
      color: #60707f;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border-color 160ms ease, box-shadow 160ms ease, color 160ms ease;

      &:hover {
        border-color: #8bc5bb;
        box-shadow: 0 8px 18px rgba(31, 41, 51, 0.06);
        color: #2f8f83;
      }
    }
  }

  &-main {
    display: flex;
    flex-direction: row;
    flex: 1;
    justify-content: center;
    align-items: center;
    width: 100%;

    &-input {
      flex: 1;
      font-size: 14px;
      height: 38px;
      border-radius: 8px;
      padding: 0 12px;
      border: 1px solid #dfe7ee;
      background: #fff;
      color: #1f2933;
    }

    &-input:focus {
      outline: none;
      border: 1px solid #8bc5bb;
      box-shadow: 0 0 0 3px rgba(47, 143, 131, 0.12);
    }

    &-cancel {
      padding-left: 10px;
      user-select: none;
      cursor: pointer;
      color: #60707f;
      font-size: 14px;
    }
  }

  &-result {
    width: 100%;
    min-height: 60px;
    margin-top: 10px;
    padding: 10px;
    border: 1px solid #dfe7ee;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(31, 41, 51, 0.06);
    font-size: 12px;

    .user-detail-div {
      .el-row {
        padding-bottom: 2px;

        .el-col {
          display: flex;
          align-items: center;

          svg {
            margin-right: 5px;
          }
        }
      }
    }
  }
}

html.dark {
  .tui-contact-search {
    background: $dark-main-color;
    border-bottom: 1px solid $dark-border-color;

    &-header {
      &-title {
        background: #232425;
        border-color: $dark-border-color;
        color: #d1d5db;

        &:hover {
          border-color: #37D18C;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22);
          color: #37D18C;
        }
      }
    }

    &-main {
      &-input {
        background: #232425;
        border-color: $dark-border-color;
        color: #e5e7eb;

        &:focus {
          border-color: #37D18C;
          box-shadow: 0 0 0 3px rgba(55, 209, 140, 0.14);
        }
      }

      &-cancel {
        color: #9ca3af;
      }
    }

    &-result {
      background: #232425;
      border-color: $dark-border-color;
      color: #e5e7eb;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
    }
  }
}
</style>
