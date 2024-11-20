<template>
  <div class="chat-header">
    <div class="chat-header-container">
      <span>{{ currentConversation?.userProfile?.nickname || currentConversation?.groupProfile?.name }}</span>
    </div>
    <div class="chat-header-setting">
      <el-popover trigger="click" width="280">
        <template #default>
          <div v-if="userDetail" class="more-info">
            <div class="user-detail-div">
              <el-row align="middle" justify="start">
                <el-col :span="8">
                  <el-avatar :size="80" :src="userDetail.avatar" />
                </el-col>
                <el-col :span="16" class="username-info">
                  <el-row align="middle" justify="start">
                    <el-col :span="24">
                      {{ userDetail.nickname }}
                      <Icon :icon="genderMap[userDetail.gender].icon" :color="genderMap[userDetail.gender].color" />
                    </el-col>
                    <el-col :span="24" class="font-12">
                      {{ userDetail.summary }}
                    </el-col>
                  </el-row>
                </el-col>
              </el-row>
              <el-row align="middle" justify="start">
                <el-col :span="24">
                  <Icon icon="mdi:id-card" color="skyblue" />
                  uid: {{ userDetail.uid }}
                </el-col>
              </el-row>
              <el-row align="middle" justify="start">
                <el-col :span="24">
                  <Icon icon="mdi:leaf" color="green" />
                  站龄: {{ formatRegisterTime(userDetail.registerTimestamp) }}
                </el-col>
              </el-row>
              <el-row align="middle" justify="start">
                <el-col>
                  <Icon icon="tdesign:location" color="red" />
                  IP属地: {{ userDetail.address }}
                </el-col>
              </el-row>
              <el-row align="middle" justify="start">
                <el-col>
                  <Icon icon="mdi:crown" color="gold" />
                  头衔: {{ userDetail.occupation }}
                </el-col>
              </el-row>
              <el-row align="middle" justify="center">
                <el-col :span="6" class="col-all-center">
                  <el-statistic :value="userDetail.articleCount" />
                </el-col>
                <el-col :span="6" class="col-all-center">
                  <el-statistic :value="userDetail.commentCount" />
                </el-col>
                <el-col :span="6" class="col-all-center">
                  <el-statistic :value="userDetail.fansCount" />
                </el-col>
                <el-col :span="6" class="col-all-center">
                  <el-statistic :value="userDetail.viewCount" />
                </el-col>
              </el-row>
              <el-row align="middle" justify="center">
                <el-col :span="6" class="col-all-center"> 文章</el-col>
                <el-col :span="6" class="col-all-center"> 评论</el-col>
                <el-col :span="6" class="col-all-center"> 粉丝</el-col>
                <el-col :span="6" class="col-all-center"> 访问量</el-col>
              </el-row>
              <el-row align="middle" justify="center" class="mt-4">
                <el-col :span="24" class="col-all-center">
                  <el-button v-if="!userDetail.isFriend && !userDetail.isBlocked" type="primary" size="small"
                             @click="addFriend">
                    <Icon icon="tdesign:user-add" />
                    添加好友
                  </el-button>
                  <el-button type="info" size="small" @click="blockUser">
                    <Icon icon="ic:baseline-block" />
                    {{ userDetail?.isBlocked ? '取消拉黑' : '拉黑' }}
                  </el-button>
                </el-col>
              </el-row>
            </div>
          </div>
        </template>
        <template #reference>
          <Icon icon="ri:more-fill" @click="getUserDetail" />
        </template>
      </el-popover>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import userApi from '@/api/user'
import chatApi from '@/api/chat'
import actionApi from '@/api/action'
import { IUserDetail } from '@/interface'
import { genderMap } from '@/utils/constant'
import { formatRegisterTime } from '@/utils/date'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ContactTypeEnum } from '@/enums/ws'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'

const chatStore = useChatStore()
const userStore = useUserStore()
const userDetail = ref<IUserDetail>()

const currentConversation = computed(() => {
  return chatStore.currentConversation
})
const user = computed(() => {
  return userStore.user
})

function getUserDetail() {
  if (currentConversation.value?.userProfile) {
    userApi.getUserById(currentConversation.value.userProfile.id).then(res => {
      userDetail.value = res.data
    })
  }
}

function addFriend() {
  if (currentConversation.value?.userProfile) {
    ElMessageBox.prompt('请输入申请信息', '添加好友', {
      inputValue: '我是' + user.value.nickname
    }).then(({ value }) => {
      chatApi.postContactApply({
        contactId: userDetail.value?.id,
        contactType: ContactTypeEnum.USER,
        content: value
      }).then(() => {
        ElMessage({
          message: '发送好友申请成功',
          type: 'success',
          plain: true
        })
      })
    }).catch(() => {
    })
  }
}

function blockUser() {
  if (currentConversation.value?.userProfile) {
    ElMessageBox.confirm('确定要' + (userDetail.value?.isBlocked ? '取消' : '') + '拉黑该用户吗？', '提示').then(() => {
      actionApi.addOrUpdate({
        objId: userDetail.value?.id,
        objType: ObjectTypeEnum.USER,
        actionType: ActionTypeEnum.BLACKLIST
      }).then((res) => {
        ElMessage({
          message: '操作成功',
          type: 'success',
          plain: true
        })
        userDetail.value.isBlocked = res.data
      })
    }).catch(() => {
    })
  }
}

</script>
<style lang="scss" scoped>
@import "@/assets/css/variables";

.more-info {

  .user-detail-div {
    font-size: 14px;

    .col-all-center {
      justify-content: center;
    }

    .el-row {
      padding-bottom: 5px;

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

.chat-header {
  display: flex;
  min-width: 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e6e6e6;

  &-container {
    display: inline-flex;
    justify-content: flex-start;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
  }

  &-content {
    margin-right: 20px;
    flex: 1;
    font-size: 16px;
    line-height: 30px;
    font-family: PingFangSC-Medium, serif;
    font-weight: 500;
    color: #000;
    letter-spacing: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &-back,
  &-setting {
    width: 27px;
    height: 27px;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }
}

html.dark {
  .chat-header {
    border-bottom: 1px solid $dark-border-color;
  }
}
</style>
