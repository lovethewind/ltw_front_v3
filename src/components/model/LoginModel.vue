<template>
  <el-dialog
    class="login-container"
    v-model="loginFlag"
    width="452"
    align-center
    @close="closeModal()"
  >
    <div class="login-wrapper">
      <div class="login-hero">
        <div class="login-hero__icon">
          <Icon icon="solar:login-3-bold-duotone" />
        </div>
        <div>
          <h3>{{ showRegister ? '完善账号信息' : '欢迎回来' }}</h3>
          <p>
            {{ showRegister ? '补充基础资料后即可完成登录' : '选择一种方式，继续你的浏览与创作' }}
          </p>
        </div>
      </div>
      <div v-if="!showRegister" class="login-tabs">
        <button
          type="button"
          :class="['login-tab', loginType === LoginType.WECHAT ? 'active' : 'in-active']"
          @click="changeLoginMethod(LoginType.WECHAT)"
        >
          <Icon icon="ri:wechat-fill" />
          <span>微信登录</span>
        </button>
        <button
          type="button"
          :class="['login-tab', loginType === LoginType.PASSWORD ? 'active' : 'in-active']"
          @click="changeLoginMethod(LoginType.PASSWORD)"
        >
          <Icon icon="material-symbols:lock-outline" />
          <span>密码登录</span>
        </button>
        <button
          type="button"
          :class="['login-tab', loginType === LoginType.MOBILE_CODE ? 'active' : 'in-active']"
          @click="changeLoginMethod(LoginType.MOBILE_CODE)"
        >
          <Icon icon="material-symbols:sms-outline" />
          <span>免密登录</span>
        </button>
      </div>
      <div v-if="!showRegister && loginType === LoginType.WECHAT">
        <div class="wechat-login">
          <el-image
            v-if="wechatLoginCode && !isExpired"
            class="wechat-loading"
            :src="wechatAppletImg"
            alt=""
          />
          <div v-if="!wechatLoginCode && !isExpired" class="wechat-loading">
            <Icon icon="eos-icons:loading" />
            <span>二维码加载中</span>
          </div>
          <div v-if="isExpired" class="wechat-loading cursor" @click="getWechatAppletCode">
            <Icon icon="material-symbols:refresh-rounded" />
            <span>二维码已过期，点击重新获取</span>
          </div>
          <div class="wechat-login__tip">请使用微信扫码登录</div>
        </div>
      </div>
      <el-form
        v-if="!showRegister && loginType !== LoginType.WECHAT"
        ref="loginFormRef"
        :model="postForm"
        :rules="rules"
        hide-required-asterisk
        class="login-form"
        label-position="top"
      >
        <el-form-item v-if="loginType === LoginType.PASSWORD" label="账号" prop="username">
          <!-- 用户名 -->
          <el-input
            v-model="postForm.username"
            label="账号"
            placeholder="请输入您的用户名/邮箱/手机号"
            clearable
          >
            <template #prefix>
              <Icon icon="line-md:account" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="loginType === LoginType.PASSWORD" label="密码" prop="password">
          <!-- 密码 -->
          <el-input
            v-model="postForm.password"
            label="密码"
            show-password
            placeholder="请输入您的密码"
            @keydown.enter="login"
          >
            <template #prefix>
              <Icon icon="material-symbols:lock-outline" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="loginType === LoginType.MOBILE_CODE" label="手机号" prop="mobile">
          <!-- 用户名 -->
          <el-input
            v-model="postForm.mobile"
            label="手机号"
            placeholder="未注册的手机号登录后将进行注册"
            clearable
          >
            <template #prefix>
              <Icon icon="mynaui:mobile" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="loginType === LoginType.MOBILE_CODE" label="验证码" prop="code">
          <div class="send-wrapper">
            <el-input
              v-model="postForm.code"
              :maxlength="6"
              label="验证码"
              placeholder="请输入6位验证码"
              class="code-input"
            >
              <template #prefix>
                <Icon icon="material-symbols:shield-outline" />
              </template>
            </el-input>
            <el-button
              class="send-code-btn"
              type="primary"
              :disabled="sendCodeBtnDisabled"
              @click="sendCode"
            >
              {{ codeMsg }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item v-if="!showRegister">
          <!-- 按钮 -->
          <el-button class="login-submit" type="success" :disabled="btnDisabled" @click="login()">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <!--第一次登录注册完善信息页面-->
      <el-form
        v-if="showRegister"
        ref="registerFormRef"
        :model="registerPostForm"
        :rules="rules"
        class="login-form"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <!-- 用户名 -->
          <el-input
            v-model="registerPostForm.username"
            label="账号"
            placeholder="用户名，注册完成后不可更改，可用于登录"
            clearable
          >
            <template #prefix>
              <Icon icon="line-md:account" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input
            v-model="registerPostForm.nickname"
            placeholder="昵称用来在各页面展示"
            clearable
          >
            <template #prefix>
              <Icon icon="line-md:account" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <!-- 密码 -->
          <el-input
            v-model="registerPostForm.password"
            label="密码"
            show-password
            placeholder="请输入您的密码"
          >
            <template #prefix>
              <Icon icon="material-symbols:lock-outline" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <!-- 按钮 -->
          <el-button
            class="login-submit"
            type="success"
            :disabled="btnDisabled"
            @click="codeRegister"
          >
            确认并登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    <!-- 注册和找回密码 -->
    <div class="login-tip">
      <span @click="openRegister" class="a-link">立即注册</span>
      <span @click="openForget" class="a-link">忘记密码?</span>
    </div>
  </el-dialog>
</template>

<style src="@/assets/css/modal.css" scoped />
<style scoped>
:global(.login-container) {
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(180deg, #f6faff 0%, #ffffff 34%);
  box-shadow: 0 18px 60px rgb(31 41 55 / 18%);
}

:global(.login-container .el-dialog__header) {
  padding: 0;
}

:global(.login-container .el-dialog__headerbtn) {
  top: 14px;
  right: 14px;
  z-index: 2;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

:global(.login-container .el-dialog__headerbtn:hover) {
  background: #ecf5ff;
}

:global(.login-container .el-dialog__body) {
  padding: 26px 28px 24px;
}

.login-wrapper {
  min-height: 412px;
}

.login-hero {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 20px;
}

.login-hero__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: #2f80ed;
  color: #fff;
  font-size: 25px;
  box-shadow: 0 10px 22px rgb(47 128 237 / 24%);
}

.login-hero h3 {
  margin: 0 0 5px;
  color: #20242a;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
}

.login-hero p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.login-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 5px;
  border: 1px solid #e5ecef;
  border-radius: 8px;
  background: #f3f8ff;
}

.login-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 40px;
  gap: 5px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #667085;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.login-tab svg {
  flex: 0 0 auto;
  font-size: 17px;
}

.login-tab:hover {
  color: #2f80ed;
  transform: translateY(-1px);
}

.login-tab.active {
  background: #fff;
  color: #1f6fd8;
  box-shadow: 0 8px 18px rgb(31 41 55 / 8%);
}

.login-form {
  margin-top: 24px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.login-form :deep(.el-form-item__label) {
  margin-bottom: 6px;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.login-form :deep(.el-input__wrapper) {
  min-height: 42px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #d7dde8 inset;
  transition:
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #9ec5fe inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px #2f80ed inset,
    0 0 0 3px rgb(47 128 237 / 12%);
}

.login-form :deep(.el-input__prefix) {
  color: #7b8a9b;
  font-size: 17px;
}

.send-wrapper {
  display: flex;
  width: 100%;
  gap: 10px;
}

.code-input {
  flex: 1 1 auto;
  min-width: 0;
}

.send-code-btn {
  flex: 0 0 94px;
  height: 42px;
  border-radius: 8px;
  font-weight: 700;
}

.login-submit {
  width: 100%;
  height: 44px;
  margin-top: 10px;
  border: 0;
  border-radius: 8px;
  background: #2f80ed;
  font-weight: 800;
  letter-spacing: 0;
  box-shadow: 0 12px 24px rgb(47 128 237 / 22%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.login-submit:hover,
.login-submit:focus {
  background: #1f6fd8;
  box-shadow: 0 14px 28px rgb(47 128 237 / 28%);
  transform: translateY(-1px);
}

.wechat-login {
  margin-top: 18px;
  padding: 18px 16px 8px;
  text-align: center;
}

.wechat-login .wechat-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  width: min(238px, 78%);
  min-height: 238px;
  margin: 0 auto 16px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f6faff;
  color: #2f80ed;
  font-weight: 700;
  box-shadow: 0 12px 28px rgb(31 41 55 / 8%);
}

.wechat-login :deep(.el-image.wechat-loading) {
  padding: 12px;
  background: #fff;
}

.wechat-login .wechat-loading svg {
  font-size: 25px;
}

.wechat-login__tip {
  color: #475467;
  font-size: 13px;
  line-height: 1.5;
}

.login-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #edf0f5;
  font-size: 13px;
}

.login-tip .a-link {
  color: #2f80ed;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s ease;
}

.login-tip .a-link:hover {
  color: #1f6fd8;
}

:global(html.dark .login-container) {
  background: linear-gradient(180deg, #1f2633 0%, #181b20 38%);
  box-shadow: 0 18px 60px rgb(0 0 0 / 36%);
}

:global(html.dark .login-container .el-dialog__headerbtn:hover) {
  background: #202b3d;
}

:global(html.dark .login-container .el-dialog__close) {
  color: #9aa4b2;
}

:global(html.dark) .login-hero h3 {
  color: #f5f7fb;
}

:global(html.dark) .login-hero p,
:global(html.dark) .wechat-login__tip {
  color: #b9c0cc;
}

:global(html.dark) .login-tabs {
  border-color: #2f3b4f;
  background: #202631;
}

:global(html.dark) .login-tab {
  color: #9aa4b2;
}

:global(html.dark) .login-tab:hover {
  color: #79bbff;
}

:global(html.dark) .login-tab.active {
  background: #121821;
  color: #79bbff;
  box-shadow: 0 8px 18px rgb(0 0 0 / 22%);
}

:global(html.dark) .login-form :deep(.el-form-item__label) {
  color: #d6dbe5;
}

:global(html.dark) .login-form :deep(.el-input__wrapper) {
  background: #121821;
  box-shadow: 0 0 0 1px #2f3b4f inset;
}

:global(html.dark) .login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #4d6f9f inset;
}

:global(html.dark) .login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px #2f80ed inset,
    0 0 0 3px rgb(47 128 237 / 18%);
}

:global(html.dark) .login-form :deep(.el-input__inner) {
  color: #f5f7fb;
}

:global(html.dark) .login-form :deep(.el-input__prefix) {
  color: #8e98a8;
}

:global(html.dark) .wechat-login .wechat-loading {
  border-color: #2f3b4f;
  background: #121821;
  color: #79bbff;
  box-shadow: 0 12px 28px rgb(0 0 0 / 24%);
}

:global(html.dark) .wechat-login :deep(.el-image.wechat-loading) {
  background: #10151d;
}

:global(html.dark) .login-tip {
  border-color: #2f3b4f;
}

:global(html.dark .login-container .login-hero h3) {
  color: #f5f7fb;
}

:global(html.dark .login-container .login-hero p),
:global(html.dark .login-container .wechat-login__tip) {
  color: #b9c0cc;
}

:global(html.dark .login-container .login-tabs) {
  border-color: #2f3b4f;
  background: #202631;
}

:global(html.dark .login-container .login-tab) {
  color: #9aa4b2;
}

:global(html.dark .login-container .login-tab:hover) {
  color: #79bbff;
}

:global(html.dark .login-container .login-tab.active) {
  background: #121821;
  color: #79bbff;
  box-shadow: 0 8px 18px rgb(0 0 0 / 22%);
}

:global(html.dark .login-container .login-form .el-form-item__label) {
  color: #d6dbe5;
}

:global(html.dark .login-container .login-form .el-input__wrapper) {
  background: #121821;
  box-shadow: 0 0 0 1px #2f3b4f inset;
}

:global(html.dark .login-container .login-form .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #4d6f9f inset;
}

:global(html.dark .login-container .login-form .el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px #2f80ed inset,
    0 0 0 3px rgb(47 128 237 / 18%);
}

:global(html.dark .login-container .login-form .el-input__inner) {
  color: #f5f7fb;
}

:global(html.dark .login-container .login-form .el-input__prefix) {
  color: #8e98a8;
}

:global(html.dark .login-container .login-tip) {
  border-color: #2f3b4f;
}

@media screen and (max-width: 759px) {
  :global(.login-container) {
    width: calc(100vw - 28px) !important;
    max-width: 452px;
    margin: 0 auto;
  }

  :global(.login-container .el-dialog__body) {
    padding: 22px 18px 20px;
  }

  .login-wrapper {
    min-height: auto;
  }

  .login-hero {
    margin-bottom: 16px;
  }

  .login-hero h3 {
    font-size: 20px;
  }

  .login-tabs {
    gap: 4px;
  }

  .login-tab {
    height: 38px;
    gap: 3px;
    font-size: 12px;
  }

  .login-tab svg {
    font-size: 15px;
  }

  .wechat-login .wechat-loading {
    width: min(214px, 86%);
    min-height: 214px;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import commonApi from '@/api/common'
import userApi from '@/api/user'
import { binaryStrToImgUrl, isMobile } from '@/utils/common'
import { useModalStore } from '@/stores/modal'
import { useUserStore } from '@/stores/user'
import { ElMessage, type FormInstance } from 'element-plus'
import { WechatScanResultEnum, VerifyCodeTypeEnum, WechatAppletCodeTypeEnum } from '@/enums'
import { Icon } from '@iconify/vue'

const modalStore = useModalStore()
const userStore = useUserStore()

const baseInfo = {
  username: '',
  nickname: '',
  password: '',
  mobile: '',
  code: ''
}

// 登录方式 1.账号密码 2.手机验证码 3.微信
enum LoginType {
  PASSWORD = 1,
  MOBILE_CODE = 2,
  WECHAT = 3
}

const validateCode = (rule: any, value: string, callback: any) => {
  const reg = /^1[345789][0-9]{9}$/
  if (!reg.test(postForm.value.mobile)) {
    callback()
  } else if (!value || value.length !== 6) {
    callback(new Error('验证码长度为6位'))
  } else {
    callback()
  }
}

const validateMobile = (rule: any, value: string, callback: any) => {
  const reg = /^1[345789][0-9]{9}$/
  if (!reg.test(value)) {
    btnDisabled.value = true
    callback(new Error('手机号格式不正确'))
  } else {
    commonApi.validAccountExists({
      mobile: value
    }).then(res => {
      firstNeedRegister.value = !res.data
    }).finally(() => {
      btnDisabled.value = false
      callback()
    })
  }
}

const validateUsername = (rule: any, value: string, callback: any) => {
  if (!showRegister.value) {
    callback()
    return
  }
  const regex = /^(?![0-9]+$)[a-zA-Z0-9_-]+$/
  if (!regex.test(value)) {
    callback(new Error('用户名只能包含字母数字_-且不能全为数字'))
  } else if (value.length < 3) {
    callback(new Error('用户名长度不能小于3个字符'))
  } else {
    setTimeout(() => {
      commonApi.validAccountExists({ username: value }).then(res => {
        if (res.data) {
          callback(new Error('该用户名已存在'))
        } else {
          callback()
        }
      })
    }, 500)
  }
}

const validatePassword = (rule: any, value: string, callback: any) => {
  if (!showRegister.value) {
    callback()
  } else {
    const reg = /^(?![0-9]*$|[a-zA-Z]*$)[0-9a-zA-Z!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]{6,30}$/
    if (!reg.test(value)) {
      callback(new Error('密码长度为6-30位，不能全为字母或数字'))
    } else {
      callback()
    }
  }
}


const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()

const postForm = ref(Object.assign({}, baseInfo))
const registerPostForm = ref(Object.assign({}, baseInfo))
const loginType = ref<LoginType>(LoginType.PASSWORD) // 登录方式 1.账号密码 2.手机验证码 3.微信
const firstNeedRegister = ref(false)
const showRegister = ref(false)
const btnDisabled = ref(false)
const sendCodeBtnDisabled = ref(false)
const codeMsg = ref('发送')
const timer = ref<any>(null)
const time = ref(60)
const wechatLoginCode = ref('')
const wechatAppletImg = ref('')
const isExpired = ref(false)
const checkTimer = ref<any>(null)
const rules = ref({
  username: [
    { required: true, message: '用户名不能为空', trigger: 'blur' },
    { validator: validateUsername, trigger: 'blur' }
  ],
  nickname: [
    { required: true, message: '内容不能为空', trigger: 'blur' },
    { min: 3, message: '昵称长度不能小于3个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { validator: validatePassword, trigger: 'blur' }
  ],
  code: [
    { validator: validateCode, trigger: 'blur' }
  ],
  mobile: [
    { validator: validateMobile, trigger: 'blur' }
  ]
})

const loginFlag = computed(() => {
  return modalStore.loginFlag
})

watch(loginFlag, (newValue) => {
  if (newValue) {
    loginType.value == LoginType.WECHAT && !checkTimer.value && getWechatAppletCode()
  } else {
    closeWeChatLogin()
  }
})

onMounted(() => {
  if (isMobile()) {
    loginType.value = LoginType.PASSWORD
  }
})

onUnmounted(() => {
  timer.value && clearInterval(timer.value)
  checkTimer.value && clearInterval(checkTimer.value)
})

function openRegister() {
  modalStore.setLoginFlag(false)
  modalStore.setRegisterFlag(true)
}

function openForget() {
  modalStore.setLoginFlag(false)
  modalStore.setForgetFlag(true)
}

function login() {
  loginFormRef.value?.validate(valid => {
    if (valid) {
      btnDisabled.value = true
      if (loginType.value !== LoginType.PASSWORD && firstNeedRegister.value) {
        // 手机第一次验证码登录需填写注册信息
        commonApi.validMobileCode({
          mobile: postForm.value.mobile,
          code: postForm.value.code,
          codeType: VerifyCodeTypeEnum.REGISTER
        }).then(res => {
          if (res.data) {
            showRegister.value = true
            ElMessage({
              message: '首次手机账号登录请完善注册信息',
              type: 'success',
              plain: true
            })
          } else {
            ElMessage({
              message: '验证码错误',
              type: 'error',
              plain: true
            })
          }
        }).finally(() => {
          btnDisabled.value = false
        })
        return
      }
      const payload: any = {}
      if (loginType.value === LoginType.MOBILE_CODE) {
        payload.code = postForm.value.code
        payload.mobile = postForm.value.mobile
      } else {
        payload.password = postForm.value.password
        const usernameReg = /^(?![0-9]+$)[a-zA-Z0-9_-]+$/
        const emailReg = /^[A-Za-z0-9_\-.]+[a-zA-Z0-9]@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
        if (usernameReg.test(postForm.value.username)) {
          payload.username = postForm.value.username
        } else if (emailReg.test(postForm.value.username)) {
          payload.email = postForm.value.username
        } else {
          payload.mobile = postForm.value.username
        }
      }
      // 发送登录请求
      userStore.login(payload).then(() => {
        userStore.getInfo()
        postForm.value = Object.assign({}, baseInfo)
        modalStore.setLoginFlag(false)
        ElMessage({
          message: '登录成功',
          type: 'success',
          plain: true
        })
      }).finally(() => {
        btnDisabled.value = false
      })
    } else {
      ElMessage({
        message: '账号信息填写不正确',
        type: 'error',
        plain: true
      })
    }
  })
}

function codeRegister() {
  registerFormRef.value?.validate(valid => {
    if (valid) {
      btnDisabled.value = true
      const user: any = {
        username: registerPostForm.value.username,
        nickname: registerPostForm.value.nickname,
        password: registerPostForm.value.password
      }
      let func
      if (loginType.value === LoginType.MOBILE_CODE) { // 手机验证码注册
        user.mobile = registerPostForm.value.mobile
        user.code = registerPostForm.value.code
        func = userApi.mobileRegister
      } else if (loginType.value === LoginType.WECHAT) { // 微信注册
        user.code = wechatLoginCode.value
        func = userApi.wechatRegister
      } else {
        ElMessage({
          message: '注册错误',
          type: 'error',
          plain: true
        })
        return
      }
      func(user).then(res => {
        userStore.setUserToken(res.data.token)
        userStore.getInfo()
        registerPostForm.value = Object.assign({}, baseInfo)
        modalStore.setLoginFlag(false)
        ElMessage({
          message: '注册成功',
          type: 'success',
          plain: true
        })
      }).finally(() => {
        btnDisabled.value = false
      })
    } else {
      ElMessage({
        message: '账号信息填写不正确',
        type: 'error',
        plain: true
      })
    }
  })
}

function sendCode() {
  if (!postForm.value.mobile) {
    return
  }
  // 发送邮件
  countDown()
  const sendData = {
    mobile: postForm.value.mobile,
    codeType: firstNeedRegister.value ? VerifyCodeTypeEnum.REGISTER : VerifyCodeTypeEnum.LOGIN
  }
  commonApi.getMobileCode(sendData).then(() => {
    ElMessage({
      message: '验证码发送成功，请查看短信取验证码',
      type: 'success',
      plain: true
    })
  }).catch(err => {
    console.log('send email fail:', err)
    ElMessage({
      message: '验证码发送失败',
      type: 'error',
      plain: true
    })
  })
}

function countDown() {
  sendCodeBtnDisabled.value = true
  timer.value = setInterval(() => {
    time.value--
    codeMsg.value = time.value + 's'
    if (time.value <= 0) {
      clearInterval(timer.value)
      codeMsg.value = '发送'
      time.value = 60
      sendCodeBtnDisabled.value = false
    }
  }, 1000)
}

function changeLoginMethod(val: LoginType) {
  if (val === LoginType.WECHAT) {
    getWechatAppletCode()
  } else {
    closeWeChatLogin()
  }
  loginFormRef.value?.resetFields()
  firstNeedRegister.value = false
  postForm.value = Object.assign({}, baseInfo)
  loginType.value = val
}

function getWechatAppletCode() {
  userApi.getWechatAppletCode(WechatAppletCodeTypeEnum.LOGIN).then(res => {
    isExpired.value = false
    wechatAppletImg.value = binaryStrToImgUrl(res.data.img)
    wechatLoginCode.value = res.data.code
    checkTimer.value = setInterval(() => {
      if (!loginFlag.value) {
        closeWeChatLogin()
        return
      }
      userApi.checkScan({
        code: wechatLoginCode.value
      }).then(res => {
        if (res.data.status === WechatScanResultEnum.HAS_BIND) {
          clearInterval(checkTimer.value)
          userStore.setUserToken(res.data.token)
          userStore.getInfo()
          ElMessage({
            message: '登录成功',
            type: 'success',
            plain: true
          })
          closeWeChatLogin()
          modalStore.setLoginFlag(false)
        } else if (res.data.status === WechatScanResultEnum.NOT_BIND) {
          clearInterval(checkTimer.value)
          firstNeedRegister.value = true
          showRegister.value = true
          ElMessage({
            message: '该微信号尚未绑定用户，请先进行注册绑定',
            type: 'warning',
            plain: true
          })
        } else if (res.data.status === WechatScanResultEnum.EXPIRED) {
          clearInterval(checkTimer.value)
          isExpired.value = true
          wechatLoginCode.value = ''
          wechatAppletImg.value = ''
          ElMessage({
            message: '二维码已过期，请点击重新获取',
            type: 'warning',
            plain: true
          })
        }
      })
    }, 1500)
  })
}

function closeWeChatLogin() {
  wechatLoginCode.value = ''
  postForm.value = Object.assign({}, baseInfo)
  wechatAppletImg.value = ''
  isExpired.value = false
  firstNeedRegister.value = false
  showRegister.value = false
  btnDisabled.value = false
  sendCodeBtnDisabled.value = false
  clearInterval(checkTimer.value)
  clearInterval(timer.value)
  checkTimer.value = null
  timer.value = null
}

function closeModal() {
  modalStore.setLoginFlag(false)
  loginFormRef.value?.resetFields()
}
</script>
