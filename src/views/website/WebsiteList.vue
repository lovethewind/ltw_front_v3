<template>
  <!-- 链接列表 -->
  <el-card class="content-container">
    <div class="text-center mb-2">
      这里展示了自己觉得还不错的一些网站，欢迎大家投稿~🌹
    </div>
    <div v-for="row of websiteList" :key="row.id">
      <el-row>
        <el-col :span="24" class="website-title">
          <span>{{ row.name }}</span>
          <span class="float-right pe-2 pt-1 a-link" @click="onclick(row.id)">
            <Icon icon="mage:edit" />
          </span>
        </el-col>
      </el-row>
      <el-row class="link-container">
        <el-col
          v-for="item of row.websiteList"
          :key="item.id"
          class="link-wrapper cursor-pointer"
          :xs="24"
          :span="6"
          @click="toWeb(item.url)"
        >
          <el-tooltip placement="bottom" effect="light">
            <el-row>
              <el-col :span="8" class="d-flex align-items-center">
                <el-avatar :src="item.cover" shape="square" :size="65" class="website-avatar" />
              </el-col>
              <el-col :span="16" class="title-desc pe-2">
                <el-row>
                  <el-col :span="24">
                    <div class="link-name ellipsis">{{ item.name }}</div>
                  </el-col>
                  <el-col :span="24">
                    <div class="link-intro ellipsis-3l">{{ item.introduce }}</div>
                  </el-col>
                </el-row>
              </el-col>
            </el-row>
            <template #content>
              <div style="max-width: 400px">
                站名: {{ item.name }}<br />
                简介: {{ item.introduce }}<br />
                网址: {{ item.url }}
              </div>
            </template>
          </el-tooltip>
        </el-col>
      </el-row>
    </div>
    <el-empty v-if="websiteList.length === 0" />
    <!-- 说明 -->
    <div>
      <el-dialog width="40%" top="10vh" center title="投稿网站"
                 v-model="dialogFormVisible"
                 :close-on-click-modal="false"
                 @close="closeModal()">
        <span class="color-red">注:已经申请过的/正在审核的网站无法重复申请</span>
        <el-form ref="postFormRef" :rules="rules" :model="postForm" label-width="100" class="mt-4">
          <el-form-item label="网站名称" prop="name">
            <el-input v-model="postForm.name" placeholder="请输入网站名称" autocomplete="off" />
          </el-form-item>
          <el-form-item label="网站图标" prop="cover">
            <el-input v-model="postForm.cover" placeholder="这里贴上网站的图标链接" autocomplete="off" />
          </el-form-item>
          <el-form-item label="网站地址" prop="url">
            <el-input v-model.trim="postForm.url" placeholder="请输入网站地址，以http://或https://开头"
                      autocomplete="off" />
          </el-form-item>
          <el-form-item label="网站简介" prop="introduce">
            <el-input v-model="postForm.introduce" type="textarea" placeholder="可复制原网站介绍"
                      :autosize="{minRows: 6}" autocomplete="off" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="closeModal()">取 消</el-button>
          <el-button type="primary" :disabled="btnDisabled" @click="submit">确 定</el-button>
        </template>
      </el-dialog>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import websiteApi from '@/api/website'
import { checkIsLogin, toWeb } from '@/utils/common'
import { ElMessage, type FormInstance } from 'element-plus'
import { Icon } from '@iconify/vue'

const baseInfo = {
  url: null,
  name: null,
  cover: null,
  introduce: null,
  categoryId: ''
}

const postFormRef = ref<FormInstance | null>(null)
const websiteList = ref<any>([])
const dialogFormVisible = ref(false)
const btnDisabled = ref(false)
const postForm = ref(Object.assign({}, baseInfo))
const rules = {
  'name': [{ required: true, message: '网站名称不能为空', trigger: 'blur' },
    { max: 100, message: '网站名称不能超过100个字符', trigger: 'blur' }
  ],
  'introduce': [{ required: true, message: '简单介绍一下该网站吧', trigger: 'blur' }],
  'url': [
    { required: true, message: '网站地址不能为空', trigger: 'blur' },
    {
      pattern: /^((https|http|ftp|rtsp|mms)?(:\/\/)?)(www\.)?(([A-Za-z0-9-]+)\.)+([A-Za-z0-9])+([A-Za-z0-9-~.\/])+$/,
      message: '请填写正确的网址'
    }
  ],
  'cover': [{ required: true, message: '网站图标url不能为空', trigger: 'blur' }]
}

fetchData()

function fetchData() {
  websiteApi.getList().then(res => {
    websiteList.value = res.data
  })
}

function onclick(val: string) {
  if (!checkIsLogin()) return
  postForm.value.categoryId = val
  dialogFormVisible.value = true
}

function submit() {
  btnDisabled.value = true
  postFormRef.value?.validate((valid) => {
    if (valid) {
      websiteApi.save(postForm.value).then(() => {
        ElMessage({
          message: '申请成功,通过申请后将通过通知告知您',
          type: 'success',
          plain: true
        })
        dialogFormVisible.value = false
      }).finally(() => {
        btnDisabled.value = false
      })
    } else {
      btnDisabled.value = false
      ElMessage({
        message: '填写信息不正确，请确认',
        type: 'error',
        plain: true
      })
    }
  })
}

function closeModal() {
  postForm.value = Object.assign({}, baseInfo)
  postFormRef.value?.resetFields()
  btnDisabled.value = false
  dialogFormVisible.value = false
}
</script>

<style lang="scss" scoped>
.content-container {
  animation: main 1s;
  width: 60%;
  margin: 20px auto;
  padding: 10px;
  min-height: 70vh;
}

.website-title {
  text-align: center;
  background: rgb(141, 208, 107);
  color: #fafafa;
  font-size: 18px;
  font-weight: 500;
  border-radius: 5px;
}

.link-container {
  margin: 10px 10px 0;
}

.link-wrapper {
  position: relative;
  border-radius: 8px;
  margin: 10px 0;
}

.website-avatar {
  margin-left: 8px;
  transition: all 0.5s;
}

.link-name {
  padding-top: 5px;
  font-size: 1rem;
  font-weight: bold;
  height: 1.6rem;
}

.link-intro {
  font-size: 12px;
  color: #1f2d3d;
  width: 100%;
  height: 56px;
  line-height: 18px;
}

.title-desc {
  position: relative;
}

.link-wrapper {
  &:hover {
    color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 2px 20px #49b1f5;

    &:before {
      transform: scale(1);
    }

    .link-intro {
      color: rgba(255, 255, 255, 0.8);
    }
  }

  &:before {
    position: absolute;
    border-radius: 8px;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: #49b1f5;
    content: "";
    transition-timing-function: ease-in;
    transition-duration: 0s;
    transition-property: transform;
    transform: scale(0);
  }
}

.tip-div {
  border-top: 1px dashed orange;
  padding-top: 10px;
  margin: 20px 0 0 0;
}

html.dark {
  .link-intro {
    color: #fff;
  }

  .link-wrapper {
    &:before {
      background: #555353;
    }

    &:hover {
      box-shadow: 0 2px 20px #1a1d20;
    }
  }
}


@media (max-width: 759px) {
  .website-avatar {
    margin-left: 30px;
  }
  .content-container {
    width: 98%;
  }
}
</style>
