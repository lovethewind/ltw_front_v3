<template>
  <el-card class="settings-panel user-container">
    <section class="settings-hero">
      <div class="settings-hero__liquid"></div>
      <div class="settings-hero__content">
        <div class="settings-hero__icon">
          <Icon icon="ph:shield-check" />
        </div>
        <div>
          <div class="settings-hero__label">设置中心</div>
          <h3>账号偏好与消息边界</h3>
          <p>把公开范围和通知提醒收拢在这里，保持刚刚好的可见与安静。</p>
        </div>
      </div>
      <div class="settings-overview-grid">
        <div class="settings-overview-item">
          <strong>{{ privacySettingsList.length }}</strong>
          <span>隐私项</span>
        </div>
        <div class="settings-overview-item">
          <strong>{{ noticeSettingsList.length }}</strong>
          <span>提醒项</span>
        </div>
      </div>
    </section>

    <el-form class="user-settings-form" label-position="top">
      <section class="settings-section is-privacy">
        <div class="settings-section__title">
          <span><Icon icon="ph:lock-key" /></span>
          <div>
            <h4>隐私设置</h4>
            <p>控制他人在你的主页能看到哪些内容。</p>
          </div>
        </div>
        <div class="settings-grid">
          <div v-for="settingItem in privacySettingsList" :key="'userSettings_' + settingItem.key" class="settings-item">
            <div class="settings-item__main">
              <div class="settings-item__name">{{ settingItem.name }}</div>
              <p>{{ getSettingDescription(settingItem.key) }}</p>
            </div>
            <div class="settings-item__control">
              <span class="settings-item__state">
                {{ getSettingStateText(settingsForm[settingItem.key], savingSettingKey === settingItem.key) }}
              </span>
              <el-switch
                v-model="settingsForm[settingItem.key]"
                :loading="savingSettingKey === settingItem.key"
                @change="update(settingItem.key)"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section is-notice">
        <div class="settings-section__title">
          <span><Icon icon="ph:bell-ringing" /></span>
          <div>
            <h4>通知设置</h4>
            <p>选择哪些互动需要第一时间提醒你。</p>
          </div>
        </div>
        <div class="settings-grid">
          <div v-for="settingItem in noticeSettingsList" :key="'userSettings_' + settingItem.key" class="settings-item">
            <div class="settings-item__main">
              <div class="settings-item__name">{{ settingItem.name }}</div>
              <p>{{ getSettingDescription(settingItem.key) }}</p>
            </div>
            <div class="settings-item__control">
              <span class="settings-item__state">
                {{ getSettingStateText(settingsForm[settingItem.key], savingSettingKey === settingItem.key) }}
              </span>
              <el-switch
                v-model="settingsForm[settingItem.key]"
                :loading="savingSettingKey === settingItem.key"
                @change="update(settingItem.key)"
              />
            </div>
          </div>
        </div>
      </section>
    </el-form>
  </el-card>
</template>

<style src="@/assets/css/user-center.scss" scoped />

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import userApi from '@/api/user'
import { userSettingsList } from '@/utils/constant'
import { UserSettingsCategoryEnum } from '@/enums'

const userStore = useUserStore()

const defaultSettingsForm: any = {}
userSettingsList.map(item => {
  defaultSettingsForm[item.key] = item.default
})
const settingsForm = ref<any>(Object.assign({}, defaultSettingsForm))
const savingSettingKey = ref('')

const user = computed(() => {
  return userStore.user
})
const privacySettingsList = computed(() => {
  return userSettingsList.filter(item => item.category === UserSettingsCategoryEnum.PRIVACY)
})
const noticeSettingsList = computed(() => {
  return userSettingsList.filter(item => item.category === UserSettingsCategoryEnum.NOTICE)
})

onMounted(() => {
  settingsForm.value = Object.assign(settingsForm.value, (user.value as any)?.userSettings || {})
})

/**
 * 获取设置项的辅助说明。
 *
 * :param key: 设置项键名。
 * :return: 设置项展示说明。
 */
function getSettingDescription(key: string): string {
  const descriptionMap: Record<string, string> = {
    allowViewMyCollect: '关闭后，其他人无法进入你的收藏书架。',
    allowViewMyFollow: '关闭后，关注与粉丝列表只对自己可见。',
    allowViewMyArticle: '关闭后，个人中心文章列表将不向访客展示。',
    whenCommentMyContent: '有人评论你的文章或内容时发送提醒。',
    whenReplyMyComment: '有人回复你的评论时发送提醒。',
    whenLikeMyContent: '有人点赞你的内容时发送提醒。',
    whenCollectMyContent: '有人收藏你的文章时发送提醒。',
    whenFollowMe: '有人关注你时发送提醒。'
  }

  return descriptionMap[key] || '按你的使用习惯调整这个开关。'
}

/**
 * 获取设置开关状态文案。
 *
 * :param isEnabled: 当前开关是否开启。
 * :param isSaving: 当前开关是否正在保存。
 * :return: 状态展示文案。
 */
function getSettingStateText(isEnabled: boolean, isSaving: boolean): string {
  if (isSaving) {
    return '保存中'
  }

  return isEnabled ? '已开启' : '已关闭'
}

/**
 * 保存用户设置。
 *
 * :param settingKey: 当前触发保存的设置项键名。
 * :return: 无返回值。
 */
function update(settingKey: string): void {
  savingSettingKey.value = settingKey
  userApi.saveUserSettings(settingsForm.value).then(() => {
    ElMessage({
      message: '设置已保存',
      type: 'success',
      plain: true
    })
  }).finally(() => {
    savingSettingKey.value = ''
  })
}
</script>
