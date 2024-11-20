<template>
  <el-dialog class="login-container" v-model="loginFlag" width="452" @close="closeModal()">
    <div class="login-wrapper">
      <el-row type="flex" justify="center" align="middle">
        <el-col :xs="12" :sm="8" class="text-center">
          <a :class="loginType === LoginType.WECHAT ? 'active': 'in-active'"
             @click="changeLoginMethod(LoginType.WECHAT)">微信登录</a>
        </el-col>
        <el-col :xs="12" :sm="8" class="text-center">
          <a :class="loginType === LoginType.PASSWORD ? 'active': 'in-active'"
             @click="changeLoginMethod(LoginType.PASSWORD)">密码登录</a>
        </el-col>
        <el-col :xs="12" :sm="8" class="text-center">
          <a :class="loginType === LoginType.MOBILE_CODE ? 'active': 'in-active'"
             @click="changeLoginMethod(LoginType.MOBILE_CODE)">免密登录</a>
        </el-col>
      </el-row>
      <div v-if="!showRegister && loginType === LoginType.WECHAT">
        <div class="wechat-login">
          <el-image v-if="wechatLoginCode && !isExpired" class="wechat-loading" :src="wechatAppletImg" alt="" />
          <div v-if="!wechatLoginCode && !isExpired" class="wechat-loading">加载中...</div>
          <div v-if="isExpired" class="wechat-loading cursor" @click="getWechatAppletCode">
            该二维码已过期，请点击重新获取
          </div>
          <div class="mt-3">请使用微信进行扫码登录</div>
        </div>
      </div>
      <el-form v-if="!showRegister && loginType !== LoginType.WECHAT"
               ref="loginFormRef"
               :model="postForm"
               :rules="rules"
               hide-required-asterisk
               class="login-form"
               label-position="top">
        <el-form-item v-if="loginType === LoginType.PASSWORD" label="账号" prop="username">
          <!-- 用户名 -->
          <el-input v-model="postForm.username" label="账号" placeholder="请输入您的用户名/邮箱/手机号" clearable>
            <template #prefix>
              <Icon icon="line-md:account" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="loginType === LoginType.PASSWORD" label="密码" prop="password">
          <!-- 密码 -->
          <el-input v-model="postForm.password" label="密码" show-password placeholder="请输入您的密码"
                    @keydown.enter="login">
            <template #prefix>
              <Icon icon="material-symbols:lock-outline" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="loginType === LoginType.MOBILE_CODE" label="手机号" prop="mobile">
          <!-- 用户名 -->
          <el-input v-model="postForm.mobile" label="手机号" placeholder="未注册的手机号登录后将进行注册" clearable>
            <template #prefix>
              <Icon icon="mynaui:mobile" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="loginType === LoginType.MOBILE_CODE" label="验证码" prop="code">
          <div class="send-wrapper" />
          <el-input v-model="postForm.code" :maxlength="6" label="验证码" placeholder="请输入6位验证码"
                    class="me-2 w-50">
            <template #prefix>
              <Icon icon="material-symbols:shield-outline" />
            </template>
          </el-input>
          <el-button type="primary" small :disabled="sendCodeBtnDisabled" @click="sendCode">
            {{ codeMsg }}
          </el-button>
        </el-form-item>
        <el-form-item v-if="!showRegister">
          <!-- 按钮 -->
          <el-button class="mt-5 vw-100" type="success" :disabled="btnDisabled" @click="login()">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <!--第一次登录注册完善信息页面-->
      <el-form v-if="showRegister" ref="registerFormRef" :model="registerPostForm" :rules="rules" class="login-form" label-position="top">
        <el-form-item label="用户名" prop="username">
          <!-- 用户名 -->
          <el-input v-model="registerPostForm.username" label="账号" placeholder="用户名，注册完成后不可更改，可用于登录"
                    clearable>
            <template #prefix>
              <Icon icon="line-md:account" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="registerPostForm.nickname" placeholder="昵称用来在各页面展示" clearable>
            <template #prefix>
              <Icon icon="line-md:account" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <!-- 密码 -->
          <el-input v-model="registerPostForm.password" label="密码" show-password placeholder="请输入您的密码">
            <template #prefix>
              <Icon icon="material-symbols:lock-outline" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <!-- 按钮 -->
          <el-button class="mt-5 w-100" type="success" :disabled="btnDisabled" @click="codeRegister">
            确认并登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    <!-- 注册和找回密码 -->
    <div class="login-tip" :style="{marginTop: (loginType === LoginType.WECHAT ? 53 : 80) + 'px' }">
      <el-row>
        <el-col :span="12">
          <span @click="openRegister" class="a-link">立即注册</span>
        </el-col>
        <el-col class="text-end" :span="12">
          <span @click="openForget" class="a-link">忘记密码?</span>
        </el-col>
      </el-row>
    </div>
  </el-dialog>
</template>

<style src="@/assets/css/modal.css" scoped />

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import commonApi from '@/api/common'
import userApi from '@/api/user'
import { binaryStrToImgUrl, isMobile } from '@/utils/common'
import { useModalStore } from '@/stores/modal'
import { useUserStore } from '@/stores/user'
import { ElMessage, FormInstance } from 'element-plus'
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