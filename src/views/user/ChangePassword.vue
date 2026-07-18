<template>
  <el-card class="password-panel user-container">
    <section class="password-hero">
      <div class="password-hero__liquid"></div>
      <div class="password-hero__content">
        <div class="password-hero__icon">
          <Icon icon="ph:keyhole" />
        </div>
        <div>
          <div class="password-hero__label">安全中心</div>
          <h3>修改登录密码</h3>
          <p>先完成身份验证，再设置一个更可靠的新密码。</p>
        </div>
      </div>
      <div class="password-hero__meta">
        <strong>{{ getVerifyTypeText(changePasswordForm.changePasswordVerifyType) }}</strong>
        <span>当前验证方式</span>
      </div>
    </section>

    <div class="password-step-list">
      <div class="password-step-item">
        <span>1</span>
        <strong>选择验证方式</strong>
      </div>
      <div class="password-step-item">
        <span>2</span>
        <strong>完成身份确认</strong>
      </div>
      <div class="password-step-item">
        <span>3</span>
        <strong>提交新密码</strong>
      </div>
    </div>

    <el-form ref="changePasswordFormRef" :model="changePasswordForm" :rules="changePasswordRules" class="password-form-card" label-position="top">
      <section class="password-field-card">
        <div class="password-field-card__title">
          <Icon icon="ph:shield-check" />
          <span>验证方式</span>
        </div>
        <div class="password-verify-tabs">
          <button
            class="password-verify-tab"
            :class="{ 'is-active': changePasswordForm.changePasswordVerifyType === ValidTypeEnum.ORIGINAL_PASSWORD }"
            type="button"
            @click="changePasswordForm.changePasswordVerifyType = ValidTypeEnum.ORIGINAL_PASSWORD"
          >
            <Icon icon="ph:lock-key" />
            原密码
          </button>
          <button
            v-if="user?.email"
            class="password-verify-tab"
            :class="{ 'is-active': changePasswordForm.changePasswordVerifyType === ValidTypeEnum.EMAIL }"
            type="button"
            @click="changePasswordForm.changePasswordVerifyType = ValidTypeEnum.EMAIL"
          >
            <Icon icon="ph:envelope-simple" />
            邮箱
          </button>
          <button
            v-if="user?.mobile"
            class="password-verify-tab"
            :class="{ 'is-active': changePasswordForm.changePasswordVerifyType === ValidTypeEnum.MOBILE }"
            type="button"
            @click="changePasswordForm.changePasswordVerifyType = ValidTypeEnum.MOBILE"
          >
            <Icon icon="ph:device-mobile" />
            手机
          </button>
          <button
            v-if="user?.wechat"
            class="password-verify-tab"
            :class="{ 'is-active': changePasswordForm.changePasswordVerifyType === ValidTypeEnum.WECHAT }"
            type="button"
            @click="changePasswordForm.changePasswordVerifyType = ValidTypeEnum.WECHAT"
          >
            <Icon icon="mdi:wechat" />
            微信
          </button>
        </div>
        <el-form-item v-if="changePasswordForm.changePasswordVerifyType === ValidTypeEnum.ORIGINAL_PASSWORD" label="原密码" prop="oldPassword">
          <el-input v-model="changePasswordForm.oldPassword" type="password" placeholder="请输入原密码" show-password>
            <template #prefix>
              <Icon icon="ph:lock-key" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="changePasswordForm.changePasswordVerifyType === ValidTypeEnum.EMAIL" label="邮箱验证码" prop="code">
          <div class="password-code-row">
            <el-input v-model="changePasswordForm.code" placeholder="请输入邮箱验证码">
              <template #prefix>
                <Icon icon="material-symbols:shield-outline" />
              </template>
            </el-input>
            <button
              class="password-code-button"
              type="button"
              :disabled="sendCodeBtnDisabled"
              @click="sendEmailMobileCode(SendChangeCodeTypeEnum.CHANGE_PASSWORD_EMAIL)"
            >
              {{ codeMsg }}
            </button>
          </div>
        </el-form-item>
        <el-form-item v-if="changePasswordForm.changePasswordVerifyType === ValidTypeEnum.MOBILE" label="手机验证码" prop="code">
          <div class="password-code-row">
            <el-input v-model="changePasswordForm.code" placeholder="请输入手机验证码">
              <template #prefix>
                <Icon icon="material-symbols:shield-outline" />
              </template>
            </el-input>
            <button
              class="password-code-button"
              type="button"
              :disabled="sendCodeBtnDisabled"
              @click="sendEmailMobileCode(SendChangeCodeTypeEnum.CHANGE_PASSWORD_MOBILE)"
            >
              {{ codeMsg }}
            </button>
          </div>
        </el-form-item>
        <el-form-item v-if="changePasswordForm.changePasswordVerifyType === ValidTypeEnum.WECHAT" prop="randomCodeVerifySuccess">
          <div class="password-wechat-panel">
            <div class="password-wechat-qr">
              <div
                v-if="!changePasswordForm.randomCodeVerifySuccess && changePasswordForm.randomCode && !isExpired"
                :class="['password-wechat-stage', { 'is-scanned': wechatScanned }]"
              >
                <el-image
                  :src="changePasswordForm.wechatAppletImg"
                  alt="微信身份验证二维码"
                />
                <Transition name="password-wechat-scan-state">
                  <div v-if="wechatScanned" class="password-wechat-scan-overlay" role="status" aria-live="polite">
                    <span class="password-wechat-scan-overlay__icon">
                      <Icon icon="material-symbols:check-rounded" />
                    </span>
                    <strong>已扫码</strong>
                    <span>请在手机上确认</span>
                  </div>
                </Transition>
              </div>
              <div v-if="!changePasswordForm.randomCodeVerifySuccess && !changePasswordForm.randomCode && !isExpired" class="password-wechat-state">
                加载中...
              </div>
              <div v-if="changePasswordForm.randomCodeVerifySuccess" class="password-wechat-state is-success">验证成功</div>
              <button
                v-if="isExpired"
                class="password-wechat-retry"
                type="button"
                @click="getWechatAppletCode(WechatAppletCodeTypeEnum.MODIFY_PASSWORD)"
              >
                二维码已过期，重新获取
              </button>
            </div>
            <p v-if="!changePasswordForm.randomCodeVerifySuccess">
              {{ wechatScanned ? '确认后将自动完成身份验证。' : '请使用微信扫码完成身份验证。' }}
            </p>
          </div>
        </el-form-item>
      </section>

      <section class="password-field-card">
        <div class="password-field-card__title">
          <Icon icon="ph:password" />
          <span>新密码</span>
        </div>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="changePasswordForm.password" type="password" placeholder="请输入新密码" show-password>
            <template #prefix>
              <Icon icon="ph:key" />
            </template>
          </el-input>
        </el-form-item>
        <div class="password-rule-list">
          <span><Icon icon="ph:check-circle" />6-30 位字符</span>
          <span><Icon icon="ph:check-circle" />不能全为字母或数字</span>
        </div>
      </section>

      <div class="password-actions">
        <button class="password-submit-button" type="button" :disabled="updateBtnDisabled" @click="changePassword()">
          <Icon icon="ph:check-circle" />
          确认修改
        </button>
        <button class="password-ghost-button" type="button" @click="cancelChangePassword()">取消</button>
      </div>
    </el-form>
  </el-card>
</template>

<style src="@/assets/css/user-center.scss" scoped />

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  WechatScanResultEnum,
  SendChangeCodeTypeEnum,
  ValidTypeEnum,
  VerifyCodeTypeEnum,
  WechatAppletCodeTypeEnum
} from '@/enums'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import userApi from '@/api/user'
import { binaryStrToImgUrl, removeEmptyValues } from '@/utils/common'
import commonApi from '@/api/common'
import { Icon } from '@iconify/vue'

const userStore = useUserStore()

const defaultChangePasswordForm = {
  password: '',
  oldPassword: '',
  code: null,
  randomCode: null,
  wechatAppletImg: '',
  randomCodeVerifySuccess: false,
  changePasswordVerifyType: 1
}
const changePasswordForm = ref(Object.assign({}, defaultChangePasswordForm))
const changePasswordFormRef = ref<FormInstance>()
const changePasswordRules: FormRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      pattern: /^(?![0-9]*$|[a-zA-Z]*$)[0-9a-zA-Z!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]{6,30}$/,
      message: '密码长度为6-30位，不能全为字母或数字',
      trigger: 'blur'
    }
  ],
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  randomCodeVerifySuccess: [{
    validator: (_rule, value, callback) => value ? callback() : callback(new Error('请先使用微信扫码完成身份验证')),
    trigger: 'change'
  }]
}
const updateBtnDisabled = ref(false)
const sendCodeBtnDisabled = ref(false)
const isExpired = ref(false)
const wechatScanned = ref(false)
const codeMsg = ref('发送验证码')
const time = ref(60)
const codeTimer = ref<any>(null)

const user = computed(() => {
  return userStore.user
})

watch(() => changePasswordForm.value.changePasswordVerifyType, (val) => {
  changePasswordForm.value.wechatAppletImg = ''
  changePasswordForm.value.randomCode = null
  wechatScanned.value = false
  clearInterval(codeTimer.value)
  nextTick(() => changePasswordFormRef.value?.clearValidate())
  if (val === ValidTypeEnum.WECHAT) {
    getWechatAppletCode()
  }
})

onUnmounted(() => {
  codeTimer.value && clearInterval(codeTimer.value)
})

/**
 * 获取当前验证方式的展示文案。
 *
 * :param type: 验证方式枚举值。
 * :return: 验证方式展示文案。
 */
function getVerifyTypeText(type: ValidTypeEnum): string {
  const verifyTypeMap: Record<number, string> = {
    [ValidTypeEnum.ORIGINAL_PASSWORD]: '原密码',
    [ValidTypeEnum.EMAIL]: '邮箱',
    [ValidTypeEnum.MOBILE]: '手机',
    [ValidTypeEnum.WECHAT]: '微信'
  }

  return verifyTypeMap[type] || '验证'
}

/**
 * 获取微信小程序验证二维码并轮询扫码状态。
 *
 * :param _type: 微信二维码业务类型。
 * :return: 无返回值。
 */
async function getWechatAppletCode(_type?: WechatAppletCodeTypeEnum): Promise<void> {
  const res = await userApi.getWechatAppletCode(WechatAppletCodeTypeEnum.MODIFY_PASSWORD)
  isExpired.value = false
  wechatScanned.value = false
  changePasswordForm.value.randomCode = res.data.code
  changePasswordForm.value.wechatAppletImg = binaryStrToImgUrl(res.data.img)
  codeTimer.value = setInterval(() => {
    userApi.checkChangePasswordScan({
      code: changePasswordForm.value.randomCode
    }).then(res => {
      // 0:未扫码 1: 未绑定 2: 已绑定 3: 已过期
      if (res.data.status === WechatScanResultEnum.SCANNED) {
        wechatScanned.value = true
      } else if (res.data.status === WechatScanResultEnum.NOT_BIND) { // 未绑定
        clearInterval(codeTimer.value)
        ElMessage({
          message: '该微信号未绑定该用户',
          type: 'error',
          plain: true
        })
        getWechatAppletCode(WechatAppletCodeTypeEnum.MODIFY_PASSWORD)
      } else if (res.data.status === WechatScanResultEnum.HAS_BIND) { // 已绑定
        clearInterval(codeTimer.value)
        ElMessage({
          message: '验证成功',
          type: 'success',
          plain: true
        })
        changePasswordForm.value.randomCodeVerifySuccess = true
        changePasswordForm.value.wechatAppletImg = ''
      } else if (res.data.status === WechatScanResultEnum.EXPIRED) {
        clearInterval(codeTimer.value)
        isExpired.value = true
        wechatScanned.value = false
        changePasswordForm.value.wechatAppletImg = ''
        ElMessage({
          message: '二维码已过期，请点击重新获取',
          type: 'warning',
          plain: true
        })
      }
    })
  }, 1500)
}

/**
 * 发送邮箱或手机修改密码验证码。
 *
 * :param type: 验证码发送类型。
 * :return: 无返回值。
 */
function sendEmailMobileCode(type: SendChangeCodeTypeEnum): void {
  // 发送邮件
  countDown()
  let func: ((params: any) => Promise<any>) | undefined
  let tipMsg = ''
  if (type === SendChangeCodeTypeEnum.CHANGE_PASSWORD_EMAIL) {
    func = commonApi.getUserEmailCode
    tipMsg = '验证码发送成功，请进入邮箱获取验证码'
  } else if (type === SendChangeCodeTypeEnum.CHANGE_PASSWORD_MOBILE) {
    func = commonApi.getUserMobileCode
    tipMsg = '验证码发送成功，请查看短信获取验证码'
  }
  func?.({
    codeType: VerifyCodeTypeEnum.CHANGE_PASSWORD
  }).then(() => {
    ElMessage({
      message: tipMsg,
      type: 'success',
      plain: true
    })
  }).catch(err => {
    console.log('send code fail:', err)
    ElMessage({
      message: '验证码发送失败，请重新尝试',
      type: 'error',
      plain: true
    })
  })
}

/**
 * 启动验证码发送按钮倒计时。
 *
 * :return: 无返回值。
 */
function countDown(): void {
  sendCodeBtnDisabled.value = true
  codeTimer.value = setInterval(() => {
    time.value--
    codeMsg.value = time.value + 's'
    if (time.value <= 0) {
      clearInterval(codeTimer.value)
      codeMsg.value = '发送验证码'
      time.value = 60
      sendCodeBtnDisabled.value = false
    }
  }, 1000)
}

/**
 * 校验并提交修改密码表单。
 *
 * :return: 无返回值。
 */
async function changePassword(): Promise<void> {
  if (!changePasswordFormRef.value) return
  const valid = await changePasswordFormRef.value.validate().catch(() => false)
  if (!valid) return

  updateBtnDisabled.value = true
  const sendData = {
    password: changePasswordForm.value.password,
    code: changePasswordForm.value.code,
    oldPassword: changePasswordForm.value.oldPassword,
    randomCode: changePasswordForm.value.randomCode,
    changeType: changePasswordForm.value.changePasswordVerifyType
  }
  userApi.changePasswordByLogin(removeEmptyValues(sendData)).then(() => {
    ElMessage({
      message: '修改密码成功',
      type: 'success',
      plain: true
    })
    cancelChangePassword()
  }).finally(() => {
    updateBtnDisabled.value = false
  })
}


/**
 * 重置修改密码表单。
 *
 * :return: 无返回值。
 */
function cancelChangePassword(): void {
  changePasswordForm.value = Object.assign({}, defaultChangePasswordForm)
  updateBtnDisabled.value = false
  wechatScanned.value = false
  nextTick(() => changePasswordFormRef.value?.clearValidate())
}
</script>
