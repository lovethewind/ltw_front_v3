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
    <div v-if="searchResult" class="tui-contact-search-result">
      <div class="user-detail-div">
        <el-row align="middle" justify="start">
          <el-col :span="5">
            <el-avatar shape="square" :size="40" :src="searchResult.avatar" />
          </el-col>
          <el-col :span="19" class="username-info">
            <el-row align="middle" justify="start">
              <el-col :span="24">
                {{ searchResult.nickname }}
                <Icon :icon="genderMap[searchResult.gender].icon" :color="genderMap[searchResult.gender].color" />
              </el-col>
              <el-col :span="24" class="font-12">
                {{ searchResult.summary }}
              </el-col>
            </el-row>
          </el-col>
        </el-row>
        <el-row align="middle" justify="start">
          <el-col :span="16">
            <span class="me-2 d-flex align-items-center">
              <Icon icon="mdi:id-card" color="skyblue" />{{ searchResult.uid }}
            </span>
            <span class="d-flex align-items-center">
              <Icon icon="tdesign:location" color="red" />{{ searchResult.address }}
            </span>
          </el-col>
          <el-col :span="8">
            <el-button v-if="!searchResult.isFriend && user.id !== searchResult.id && !searchResult.isBlocked"
                       type="primary" size="small" @click="addFriend">添加好友
            </el-button>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { IUserDetail } from '@/interface'
import { genderMap } from '@/utils/constant'
import userApi from '@/api/user'
import chatApi from '@/api/chat'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ContactTypeEnum } from '@/enums/ws'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'

const userStore = useUserStore()
const eventServer = EventServer.getInstance()

const searchingPlaceholder = '输入用户uid'
const isSearching = ref<boolean>(false)
const searchValue = ref<string>('')
const searchResult = ref<IUserDetail>()

const user = computed(() => {
  return userStore.user
})

function changeContactSearchingStatus(status: boolean) {
  isSearching.value = status
  if (!status) {
    searchValue.value = ''
    searchResult.value = undefined
  }
}

function search() {
  if (!searchValue.value) {
    return
  }
  userApi.getUserByUid(searchValue.value).then((res) => {
    searchResult.value = res.data
  })
}

function addFriend() {
  ElMessageBox.prompt('请输入申请信息', '添加好友', {
    inputValue: '我是' + user.value.nickname
  }).then(({ value }) => {
    chatApi.postContactApply({
      contactId: searchResult.value?.id,
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
</script>
<style lang="scss" scoped>
@import "@/assets/css/variables";

.tui-contact-search {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #f4f5f9;
  flex-direction: column;

  &-header,
  &-main {
    width: 100%;
    height: 24px;
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  &-header {
    user-select: none;
    cursor: pointer;

    &-title {
      flex: 1;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: end;
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
      border-radius: 5px;
      padding: 7px;
      border: 1px solid #ddd;
    }

    &-input:focus {
      outline: none;
      border: 1px solid #006eff;
    }

    &-cancel {
      padding-left: 10px;
      user-select: none;
      cursor: pointer;
    }
  }

  &-result {
    width: 100%;
    min-height: 60px;
    margin-top: 5px;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 5px;
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
  }
}
</style>
