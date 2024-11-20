<template>
  <el-dialog width="40%" title="意见反馈" v-model="feedbackFlag" @close="closeModal()">
    <el-form ref="feedbackFormRef" :rules="rules" label-position="left" :model="postForm"
             :label-width="formLabelWidth">
      <el-form-item label="反馈类型" prop="feedbackType">
        <el-radio v-model="postForm.feedbackType" :label="1">提交需求</el-radio>
        <el-radio v-model="postForm.feedbackType" :label="2">反馈bug</el-radio>
      </el-form-item>
      <el-form-item label="联系邮箱" prop="email">
        <el-input v-model="postForm.email" placeholder="请填写您的联系邮箱" />
      </el-form-item>
      <el-form-item label="需求" prop="title">
        <el-input v-model="postForm.title" placeholder="请用一句话描述你的需求" />
      </el-form-item>
      <div class="contentInput">
        <el-form-item label="需求简述" prop="content">
          <el-input v-model="postForm.content" placeholder="请在此详细描述你的需求" :rows="6" type="textarea" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="closeModal()">取 消</el-button>
      <el-button type="primary" :disabled="feedbackDisabled" @click="submit">确 定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, FormInstance } from 'element-plus'
import commonApi from '@/api/common.js'
import { useModalStore } from '@/stores/modal'

const modalStore = useModalStore()

const feedbackFormRef = ref<FormInstance>()
const formLabelWidth = ref('80px')
const postForm = ref({
  feedbackType: 1,
  email: null,
  title: null,
  content: null
})
const feedbackDisabled = ref(false)
const rules = ref({
  feedbackType: [
    { required: true, message: '请选择反馈类型，方便处理', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请填写联系邮箱，以方便与你回应', trigger: 'blur' },
    { pattern: /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((.[a-zA-Z0-9_-]{2,3}){1,2})$/, message: '填写正确的邮箱' }
  ],
  title: [
    { required: true, message: '请简短描述一下', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '反馈内容不能为空', trigger: 'blur' }
  ]
})

const feedbackFlag = computed(() => {
  return modalStore.feedbackFlag
})

function closeModal() {
  postForm.value.type = 1
  postForm.value.email = null
  postForm.value.title = null
  postForm.value.content = null
  feedbackFormRef.value?.resetFields()
  modalStore.setFeedbackFlag(false)
}

function submit() {
  feedbackDisabled.value = true
  feedbackFormRef.value?.validate((valid) => {
    if (valid) {
      commonApi.addFeedback(postForm.value).then(() => {
        ElMessage({
          message: '提交反馈成功',
          type: 'success',
          plain: true
        })
        closeModal()
      }).catch(() => {
        ElMessage({
          message: '提交反馈失败',
          type: 'error',
          plain: true
        })
      }).finally(() => {
        feedbackDisabled.value = false
      })
    } else {
      ElMessage({
        message: '填写信息不正确，请检查',
        type: 'error',
        plain: true
      })
      feedbackDisabled.value = false
    }
  })
}
</script>
