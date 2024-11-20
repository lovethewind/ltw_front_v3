<template>
  <el-card v-if="user?.id === viewUser.id && loginUser" class="user-container">
    <el-form
      ref="formRef"
      :model="loginUser"
      label-width="80px"
      class="pt-4 pb-2"
    >
      <el-form-item label="头像" prop="avatar">
        <el-upload
          v-if="isEdit && !avatarPreviewUrl"
          ref="upload"
          accept="image/*"
          class="avatar-uploader"
          :show-file-list="false"
          action=""
          :before-upload="beforeAvatarUpload"
        >
          <el-avatar v-if="loginUser.avatar" :src="loginUser.avatar" class="imgAvatar" />
          <Icon v-else icon="ic:round-plus" />
        </el-upload>
        <el-avatar v-if="!isEdit && !avatarPreviewUrl" :src="loginUser.avatar" />
        <div v-if="avatarPreviewUrl">
          <el-avatar :src="avatarPreviewUrl" class="cover-img" />
          <div><a @click="handleAvatarRemove()">取消</a></div>
        </div>
      </el-form-item>
      <el-form-item label="用户名">
        {{ loginUser.username }}
      </el-form-item>
      <el-form-item label="昵称">
        <el-input v-if="isEdit" v-model="loginUser.nickname" maxlength="20" show-word-limit placeholder="请输入您的昵称"
        />
        <span v-else>{{ loginUser.nickname }}</span>
      </el-form-item>
      <el-form-item label="性别" prop="sex">
        <el-radio-group v-if="isEdit" v-model="loginUser.gender">
          <el-radio :value="0">保密</el-radio>
          <el-radio :value="1">男</el-radio>
          <el-radio :value="2">女</el-radio>
        </el-radio-group>
        <span v-else>{{ genderMap[loginUser.gender].name }}</span>
      </el-form-item>
      <el-form-item label="头衔">
        <el-input v-if="isEdit" v-model="loginUser.occupation" maxlength="20" show-word-limit placeholder="高级摸鱼师🐟"
        />
        <span v-else>{{ loginUser.occupation }}</span>
      </el-form-item>
      <el-form-item label="签名">
        <el-input
          v-if="isEdit"
          v-model="loginUser.summary"
          maxlength="100"
          show-word-limit

          placeholder="既然选择了远方，便要风雨兼程"
          clearable
        />
        <span v-else>{{ loginUser.summary }}</span>
      </el-form-item>
      <el-form-item label="邮箱">
        {{ loginUser.email }}
        <el-button type="primary" size="small" class="ms-2" @click="openEmailModel()">
          {{ loginUser.email ? '修改绑定' : '绑定邮箱' }}
        </el-button>
      </el-form-item>
      <el-form-item label="手机号">
        {{ loginUser.mobile }}
        <el-button type="primary" size="small" class="ms-2" @click="openMobileModel()">
          {{ loginUser.mobile ? '修改绑定' : '绑定手机号' }}
        </el-button>
      </el-form-item>
      <el-form-item label="微信号">
        {{ loginUser.wechat }}
        <el-button type="primary" size="small" class="ms-2" @click="openWeChatModel()">
          {{ loginUser.wechat ? '修改绑定' : '绑定微信号' }}
        </el-button>
      </el-form-item>
      <el-form-item>
        <el-button v-if="isEdit" type="success" :disabled="changDisabled" @click="update()">确认修改</el-button>
        <el-button v-if="isEdit" type="info" @click="cancelEdit()">取消</el-button>
        <el-button v-else type="success" @click="isEdit = !isEdit">修改</el-button>
      </el-form-item>
    </el-form>
    <!-- 更换邮箱 -->
    <el-dialog
      v-model="emailDialogVisible"
      :title="needValidOldEmail ? '验证绑定邮箱' : '更换邮箱'"
      width="460"
      @close="closeEmailDialog()">
      <div v-if="needValidOldEmail" class="info-card">
        <div class="text-center mt-4">验证您已绑定的邮箱: {{ loginUser.email }}</div>
        <div class="text-center mt-2 mb-2 color-red">{{ errMsg }}</div>
        <div class="valid-code-wrapper">
          <el-row align="middle" justify="center">
            <el-col :span="16">
              <el-input v-model="postForm.oldCode" :maxlength="6" :minlength="6" :disabled="inputDisabled">
                <template #prefix>
                  <Icon icon="material-symbols:shield-outline" />
                </template>
              </el-input>
            </el-col>
            <el-col :span="8" class="ps-2">
              <el-button
                type="primary"
                :disabled="sendBtnDisabled"
                @click="sendEmailMobileCode(SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL)"
                class="w-100"
              >
                {{ codeMsg }}
              </el-button>
            </el-col>
          </el-row>
          <el-row align="middle" justify="center" class="mt-2">
            <el-button
              type="success"
              :disabled="!postForm.oldCode"
              @click="validateOldCode(SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL)"
              class="w-100"
            >
              验证
            </el-button>
          </el-row>
        </div>
      </div>
      <div v-else class="info-card">
        <el-form ref="changeBindFormRef" :model="postForm" :rules="rules" label-position="top">
          <el-form-item label="邮箱" prop="email">
            <!-- 邮箱 -->
            <el-input v-model="postForm.email" placeholder="请输入您的新邮箱" clearable>
              <template #prefix>
                <Icon icon="ic:outline-email" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="验证码" prop="code">
            <el-row align="middle" justify="center">
              <el-col :span="16">
                <el-input v-model="postForm.code" :maxlength="6" :minlength="6" label="验证码"
                          placeholder="请输入6位验证码">
                  <template #prefix>
                    <Icon icon="material-symbols:shield-outline" />
                  </template>
                </el-input>
              </el-col>
              <el-col :span="8" class="ps-2">
                <el-button
                  type="primary"
                  :disabled="postForm.sendBtnDisabled"
                  @click="sendNewEmailMobileCode(SendNewBindCodeTypeEnum.BIND_EMAIL)"
                  class="w-100"
                >
                  {{ codeMsg }}
                </el-button>
              </el-col>
            </el-row>
          </el-form-item>
          <el-form-item>
            <el-button
              type="success"
              class="mt-4 w-100"
              :disabled="btnDisabled"
              @click="saveUserEmailMobile(SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL)"
            >
              绑定
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
    <!-- 更换手机号 -->
    <el-dialog
      v-model="mobileDialogVisible"
      :title="needValidOldMobile ? '验证绑定手机号' : '更换手机号'"
      width="460"
      @close="closeMobileDialog()">
      <div v-if="needValidOldMobile" class="info-card">
        <div class="text-center mt-4">验证您已绑定的手机号: {{ loginUser.mobile }}</div>
        <div class="text-center mt-2 mb-2 color-red">{{ errMsg }}</div>
        <div class="valid-code-wrapper">
          <el-row align="middle" justify="center">
            <el-col :span="16">
              <el-input v-model="postForm.oldCode" :maxlength="6" :minlength="6" :disabled="inputDisabled">
                <template #prefix>
                  <Icon icon="material-symbols:shield-outline" />
                </template>
              </el-input>
            </el-col>
            <el-col :span="8" class="ps-2">
              <el-button
                type="primary"
                class="w-100"
                :disabled="sendBtnDisabled"
                @click="sendEmailMobileCode(SendChangeCodeTypeEnum.CHANGE_BIND_MOBILE)"
              >
                {{ codeMsg }}
              </el-button>
            </el-col>
          </el-row>
          <el-row align="middle" justify="center" class="mt-2">
            <el-button
              type="success"
              :disabled="!postForm.oldCode"
              @click="validateOldCode(SendChangeCodeTypeEnum.CHANGE_BIND_MOBILE)"
              class="w-100"
            >
              验证
            </el-button>
          </el-row>
        </div>
      </div>
      <div v-else class="info-card">
        <el-form ref="changeBindFormRef" :model="postForm" :rules="rules" label-position="top">
          <el-form-item label="手机号" prop="mobile">
            <!-- 手机号 -->
            <el-input v-model="postForm.mobile" placeholder="请输入您的新手机号" clearable>
              <template #prefix>
                <Icon icon="mynaui:mobile" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="验证码" prop="code">
            <!-- 验证码 -->
            <el-input v-model="postForm.code" :maxlength="6" :minlength="6" label="验证码" placeholder="请输入6位验证码"
                      class="w-50">
              <template #prefix>
                <Icon icon="material-symbols:shield-outline" />
              </template>
            </el-input>
            <el-button
              type="primary"
              :disabled="postForm.sendBtnDisabled"
              @click="sendNewEmailMobileCode(SendNewBindCodeTypeEnum.BIND_MOBILE)"
              class="ms-2"
            >
              {{ codeMsg }}
            </el-button>
          </el-form-item>
          <el-form-item>
            <!-- 注册按钮 -->
            <el-button
              type="success"
              :disabled="btnDisabled"
              @click="saveUserEmailMobile(SendChangeCodeTypeEnum.CHANGE_BIND_MOBILE)"
              class="w-100"
            >
              绑定
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
    <!-- 更换微信号 -->
    <el-dialog
      v-model="wechatDialogVisible"
      :title="needValidOldWeChat ? '验证绑定微信号' : '更换微信绑定'"
      width="460"
      @close="closeWeChatDialog()">
      <div v-if="needValidOldWeChat" class="change-bind-container">
        <div class="wechat-login">
          <el-image v-if="wechatOldCode && !isExpired" class="wechat-loading" :src="wechatAppletImg" alt="" />
          <div v-if="!wechatOldCode && !isExpired" class="wechat-loading">加载中...</div>
          <div v-if="isExpired" class="wechat-loading cursor"
               @click="getWechatAppletCode(WechatAppletCodeTypeEnum.VALIDATE_OLD_WECHAT)">
            该二维码已过期，请点击重新获取
          </div>
          <div class="mt-3">请使用微信进行扫码验证</div>
        </div>
      </div>
      <div v-else class="change-bind-container">
        <div class="wechat-login">
          <el-image v-if="wechatCode && !isExpired" class="wechat-loading" :src="wechatAppletImg" alt="" />
          <div v-if="!wechatCode && !isExpired" class="wechat-loading">加载中...</div>
          <div v-if="isExpired" class="wechat-loading cursor"
               @click="getWechatAppletCode(WechatAppletCodeTypeEnum.BIND_NEW_WECHAT)">
            该二维码已过期，请点击重新获取
          </div>
          <div class="mt-3 color-red">请使用新微信进行扫码绑定</div>
        </div>
      </div>
    </el-dialog>
  </el-card>
  <el-card v-else>
    <div class="d-flex align-items-center justify-content-center font-18" style="min-height: 60vh">
      这里是【{{ viewUser?.nickname }}】的个人空间
    </div>
  </el-card>
</template>

<style src="@/assets/css/user-center.scss" scoped />

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, toRefs, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import userApi from '@/api/user'
import ossApi from '@/api/oss-api'
import commonApi from '@/api/common'
import { binaryStrToImgUrl, checkFileSize, getBase64, getObjKeyCount, removeSameValues } from '@/utils/common'
import { uploadFile } from '@/utils/oss-upload'
import { genderMap } from '@/utils/constant'
import { ElMessage, type FormInstance } from 'element-plus'
import {
  WechatScanResultEnum,
  SendChangeCodeTypeEnum,
  SendNewBindCodeTypeEnum, VerifyCodeTypeEnum,
  WechatAppletCodeTypeEnum, UploadFileTypeEnum
} from '@/enums'
import { Icon } from '@iconify/vue'
import { IUserDetail } from '@/interface'

const userStore = useUserStore()

const emit = defineEmits(['update-user-info'])

const props = defineProps<{
  viewUser: IUserDetail
}>()
const { viewUser } = toRefs(props)

const loginUser = ref<IUserDetail>(null)

const defaultPostForm = {
  email: '',
  mobile: '',
  oldCode: '',
  code: '',
  sendBtnDisabled: true
}

const validateEmail = (rule: any, value: any, callback: any) => {
  const reg = /^[A-Za-z0-9_\-.]+[a-zA-Z0-9]@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
  if (!reg.test(value)) {
    postForm.value.sendBtnDisabled = true
    callback(new Error('邮箱格式不正确'))
  } else {
    setTimeout(() => {
      commonApi.validAccountExists({ email: value }).then(res => {
        if (res.data === true) {
          postForm.value.sendBtnDisabled = true
          callback(new Error('该邮箱已存在'))
        } else {
          postForm.value.sendBtnDisabled = false
          callback()
        }
      })
    }, 1000)
  }
}

const validateMobile = (rule: any, value: any, callback: any) => {
  const reg = /^1[345789][0-9]{9}$/
  if (!reg.test(value)) {
    postForm.value.sendBtnDisabled = true
    callback(new Error('手机号格式不正确'))
  } else {
    commonApi.validAccountExists({
      mobile: value
    }).then(res => {
      if (res.data) {
        postForm.value.sendBtnDisabled = true
        callback(new Error('该手机号已存在'))
      } else {
        postForm.value.sendBtnDisabled = false
        callback()
      }
    })
  }
}

const validateCode = (rule: any, value: any, callback: any) => {
  if (!value || value.length !== 6) {
    callback(new Error('验证码长度为6位'))
  } else {
    callback()
  }
}
const formRef = ref<FormInstance | null>(null)
const changeBindFormRef = ref<FormInstance | null>(null)
const currentRow = ref<any>(null)
const isEdit = ref(false)
const oldAvatar = ref('')
const avatarPreviewUrl = ref('')
const changDisabled = ref(false)
const btnDisabled = ref(false)
const emailDialogVisible = ref(false)
const mobileDialogVisible = ref(false)
const wechatDialogVisible = ref(false)
const codeMsg = ref('发送验证码')
const time = ref(60)
const errMsg = ref('请在下方输入获取的验证码')
const inputDisabled = ref(false)
const sendBtnDisabled = ref(false)
const needValidOldEmail = ref(true)
const needValidOldMobile = ref(true)
const needValidOldWeChat = ref(true)
const wechatOldCode = ref('')
const wechatCode = ref('')
const wechatAppletImg = ref('')
const codeTimer = ref<any>(null)
const isExpired = ref(false)
const postForm = ref(Object.assign({}, defaultPostForm))
const rules = ref({
  email: [
    { required: true, message: '邮箱不能为空', trigger: 'blur' },
    { validator: validateEmail, trigger: 'blur' }
  ],
  mobile: [
    { required: true, message: '手机号不能为空', trigger: 'blur' },
    {
      validator: validateMobile,
      trigger: 'blur'
    }
  ],
  code: [
    { validator: validateCode, trigger: 'blur' }
  ]
})

const user = computed(() => {
  return userStore.user
})

onMounted(() => {
  currentRow.value = Object.assign({}, user.value)
  if (viewUser.value.id === user.value?.id) {
    loginUser.value = Object.assign({}, user.value)
  }
})

onUnmounted(() => {
  codeTimer.value && clearInterval(codeTimer.value)
})

async function update() {
  changDisabled.value = true
  const newData = removeSameValues(loginUser.value, currentRow.value)
  if (getObjKeyCount(newData) <= 1) {
    ElMessage({
      message: '没有更改的用户信息',
      type: 'warning',
      plain: true
    })
    changDisabled.value = false
    return
  }
  if (typeof newData.avatar === 'object') {
    // 上传图片
    const res = await ossApi.getUploadSignatureUrl({
      dirType: UploadFileTypeEnum.AVATAR,
      fileName: newData.avatar.name
    })
    newData.avatar = await uploadFile(res.data, newData.avatar)
  }
  userApi.update(newData).then(async () => {
    ElMessage({
      message: '修改成功',
      type: 'success',
      plain: true
    })
    isEdit.value = false
    await userStore.getInfo()
    currentRow.value = Object.assign({}, user.value)
    avatarPreviewUrl.value = ''
    emit('update-user-info')
  }).finally(() => {
    changDisabled.value = false
  })
}

function beforeAvatarUpload(file) {
  if (!checkFileSize(file, 5, '头像')) return
  oldAvatar.value = loginUser.value.avatar
  getBase64(file, url => {
    nextTick(() => {
      avatarPreviewUrl.value = url
      loginUser.value.avatar = file
    })
  })
  return false
}

function handleAvatarRemove() {
  avatarPreviewUrl.value = ''
  loginUser.value.avatar = oldAvatar.value
}

function openEmailModel() {
  emailDialogVisible.value = true
  needValidOldEmail.value = !!loginUser.value.email
}

function openMobileModel() {
  mobileDialogVisible.value = true
  needValidOldMobile.value = !!loginUser.value.mobile
}

async function openWeChatModel() {
  wechatDialogVisible.value = true
  needValidOldWeChat.value = !!loginUser.value.wechat
  if (needValidOldWeChat.value) {
    await getWechatAppletCode(2)
  } else {
    await bindNewWeChat()
  }
}

async function getWechatAppletCode(type: WechatAppletCodeTypeEnum) {
  // type 2: 验证旧微信 3: 绑定新微信 4: 修改密码
  const res = await userApi.getWechatAppletCode(type)
  isExpired.value = false
  if (type === WechatAppletCodeTypeEnum.VALIDATE_OLD_WECHAT) {
    wechatOldCode.value = res.data.code
    wechatAppletImg.value = binaryStrToImgUrl(res.data.img)
    codeTimer.value = setInterval(() => {
      userApi.checkOldScan({
        code: wechatOldCode.value
      }).then(res => {
        // res.data.status 0:未扫码 1: 未绑定 2: 已绑定且是登录用户本人 3: 已过期
        if (res.data.status === WechatScanResultEnum.HAS_BIND) {
          clearInterval(codeTimer.value)
          ElMessage({
            message: '验证成功',
            type: 'success',
            plain: true
          })
          needValidOldWeChat.value = false
          bindNewWeChat()
        } else if (res.data.status === WechatScanResultEnum.EXPIRED) {
          clearInterval(codeTimer.value)
          isExpired.value = true
          wechatOldCode.value = ''
          wechatAppletImg.value = ''
          ElMessage({
            message: '二维码已过期，请点击重新获取',
            type: 'warning',
            plain: true
          })
        }
      })
    }, 1500)
  }
  if (type === WechatAppletCodeTypeEnum.BIND_NEW_WECHAT) {
    wechatCode.value = res.data.code
    wechatAppletImg.value = binaryStrToImgUrl(res.data.img)
    codeTimer.value = setInterval(() => {
      userApi.checkScan({
        code: wechatCode.value
      }).then(res => {
        // res.data.status 0:未扫码 1: 未绑定 2: 已绑定 3: 已过期
        if (res.data.status === WechatScanResultEnum.NOT_BIND) { // 未绑定
          clearInterval(codeTimer.value)
          userApi.bindWeChat({
            oldCode: wechatOldCode.value,
            code: wechatCode.value
          }).then(async () => {
            ElMessage({
              message: '绑定成功',
              type: 'success',
              plain: true
            })
            wechatDialogVisible.value = false
            await userStore.getInfo()
            loginUser.value = Object.assign({}, user.value)
          })
        } else if (res.data.status === WechatScanResultEnum.HAS_BIND) { // 已绑定
          clearInterval(codeTimer.value)
          ElMessage({
            message: '该微信已绑定其他账号',
            type: 'warning',
            plain: true
          })
          getWechatAppletCode(WechatAppletCodeTypeEnum.BIND_NEW_WECHAT)
        } else if (res.data.status === WechatScanResultEnum.EXPIRED) {
          clearInterval(codeTimer.value)
          isExpired.value = true
          wechatOldCode.value = ''
          wechatAppletImg.value = ''
          ElMessage({
            message: '二维码已过期，请点击重新获取',
            type: 'warning',
            plain: true
          })
        }
      })
    }, 1500)
  }
}

async function bindNewWeChat() {
  await getWechatAppletCode(WechatAppletCodeTypeEnum.BIND_NEW_WECHAT)
}

function cancelEdit() {
  loginUser.value = Object.assign({}, user.value)
  currentRow.value = Object.assign({}, user.value)
  isEdit.value = !isEdit.value
}

function sendEmailMobileCode(type) {
  // 发送邮件
  countDown()
  let func, tipMsg
  if (type === SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL) {
    func = commonApi.getUserEmailCode
    tipMsg = '验证码发送成功，请进入邮箱获取验证码'
  } else if (type === SendChangeCodeTypeEnum.CHANGE_BIND_MOBILE) {
    func = commonApi.getUserMobileCode
    tipMsg = '验证码发送成功，请查看短信获取验证码'
  }
  func({
    codeType: VerifyCodeTypeEnum.CHANGE_BIND
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

function validateOldCode(type) {
  inputDisabled.value = true
  let func
  if (type === SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL) {
    func = commonApi.validUserEmailCode
  } else {
    func = commonApi.validUserMobileCode
  }
  func({
    code: postForm.value.oldCode,
    codeType: VerifyCodeTypeEnum.CHANGE_BIND
  }).then(res => {
    if (!res.data) {
      errMsg.value = '验证码不正确'
    } else {
      if (type === SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL) {
        needValidOldEmail.value = false
      } else {
        needValidOldMobile.value = false
      }
    }
  }).finally(() => {
    inputDisabled.value = false
  })
}

function sendNewEmailMobileCode(type) {
  if (!postForm.value.email && !postForm.value.mobile) {
    return
  }
  let func
  let tipMsg
  const sendData = {
    codeType: VerifyCodeTypeEnum.CHANGE_BIND
  }
  if (type === 1) {
    func = commonApi.getUserEmailCode
    tipMsg = '验证码发送成功，请进入邮箱获取验证码'
    sendData.email = postForm.value.email
  } else {
    func = commonApi.getUserMobileCode
    tipMsg = '验证码发送成功，请查看短信获取验证码'
    sendData.mobile = postForm.value.mobile
  }
  // 发送邮件
  countDown()
  func(sendData).then(() => {
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

function countDown() {
  sendBtnDisabled.value = true
  postForm.value.sendBtnDisabled = true
  codeTimer.value = setInterval(() => {
    time.value--
    codeMsg.value = time.value + 's'
    if (time.value <= 0) {
      clearInterval(codeTimer.value)
      codeMsg.value = '发送验证码'
      time.value = 60
      sendBtnDisabled.value = false
      postForm.value.sendBtnDisabled = false
    }
  }, 1000)
}

function saveUserEmailMobile(type) {
  changeBindFormRef.value?.validate(valid => {
    if (valid) {
      btnDisabled.value = true
      const user = {
        code: postForm.value.code,
        oldCode: postForm.value.oldCode
      }
      let func
      if (type === SendChangeCodeTypeEnum.CHANGE_BIND_EMAIL) {
        user.email = postForm.value.email
        func = userApi.changeEmailBind
      } else {
        user.mobile = postForm.value.mobile
        func = userApi.changeMobileBind
      }
      func(user).then(async () => {
        closeEmailDialog()
        closeMobileDialog()
        await userStore.getInfo()
        ElMessage({
          message: '修改绑定成功',
          type: 'success',
          plain: true
        })
      }).finally(() => {
        btnDisabled.value = false
      })
    } else {
      ElMessage({
        message: '信息填写不正确',
        type: 'error',
        plain: true
      })
    }
  })
}

function closeEmailDialog() {
  postForm.value = Object.assign({}, defaultPostForm)
  errMsg.value = '请在下方输入获取的验证码'
  emailDialogVisible.value = false
}

function closeMobileDialog() {
  postForm.value = Object.assign({}, defaultPostForm)
  errMsg.value = '请在下方输入获取的验证码'
  mobileDialogVisible.value = false
}

function closeWeChatDialog() {
  wechatDialogVisible.value = false
  wechatAppletImg.value = ''
  wechatCode.value = ''
  wechatOldCode.value = ''
  clearInterval(codeTimer.value)
}
</script>
