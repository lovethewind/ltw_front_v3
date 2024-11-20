<template>
  <!-- banner -->
  <div class="banner" :style="cover">
    <h1 class="banner-title">友链</h1>
  </div>
  <!-- 链接列表 -->
  <el-card class="blog-container">
    <div class="link-title mb-1">
      <Icon icon="noto:link" />
      大佬们 <span class="font-12 ms-4 float-right">本页为随机排序</span>
    </div>
    <el-row class="link-container" align="middle" justify="start">
      <el-col
        v-for="item of linkList"
        :key="item.id"
        class="link-wrapper cursor-pointer"
        :md="8"
        :span="24"
        @click="toWeb(item.url)"
      >
        <el-tooltip placement="bottom" effect="light">
          <el-row align="middle" justify="center">
            <el-col :span="8" class="d-flex align-items-center">
              <el-avatar :size="65" rounded :src="item.cover" class="link-avatar">
              </el-avatar>
            </el-col>
            <el-col :span="16" class="title-desc">
              <el-row align="middle" justify="center">
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
              站名: {{ item.name }}<br/>
              简介: {{ item.introduce }}<br/>
              网址: {{ item.url }}
            </div>
          </template>
        </el-tooltip>
      </el-col>
    </el-row>
    <!-- 说明 -->
    <div class="link-title mt-4 mb-4">
      <Icon icon="noto:cupcake" />
      本站信息
    </div>
    <blockquote>
      <div>网站名称：{{ websiteInfo.home }}
        <Icon icon="material-symbols:content-copy-outline" class="a-link font-16" @click="copy(websiteInfo.name)" />
      </div>
      <div>网站简介：{{ websiteInfo.metaInfo.meta[1].content }}
        <Icon icon="material-symbols:content-copy-outline" class="a-link font-16" @click="copy(websiteInfo.summary)" />
      </div>
      <div>网站地址：{{ websiteInfo.webUrl }}
        <Icon icon="material-symbols:content-copy-outline" class="a-link font-16" @click="copy(websiteInfo.webUrl)" />
      </div>
      <div>网站Logo：{{ websiteInfo.logo }}
        <Icon icon="material-symbols:content-copy-outline" class="a-link font-16" @click="copy(websiteInfo.logo)" />
      </div>
    </blockquote>
    <!-- 说明 -->
    <div class="link-title mt-4 mb-4">
      <Icon icon="emojione-v1:lower-left-pencil" />
      添加友链
    </div>
    <div class="mt-2 mb-2">
      需要添加友链的可点击<a style="color: #409eff" @click="onclick()">此处</a>😘<br>
      <span class="color-red">注:如果已经申请过需要修改信息 提交后需重新审核</span>
    </div>
    <div>
      <el-dialog width="35%" top="10vh"
                 center
                 title="申请友链"
                 v-model="dialogFormVisible"
                 :close-on-click-modal="false"
                 @close="closeModal()">
        <el-form ref="postFormRef" :rules="rules" :model="postForm" label-width="100">
          <el-form-item label="网站名称" prop="name">
            <el-input v-model="postForm.name" autocomplete="off" />
          </el-form-item>
          <el-form-item label="网站封面" prop="cover">
            <el-input v-model="postForm.cover" autocomplete="off" />
          </el-form-item>
          <el-form-item label="网站地址" prop="url">
            <el-input v-model="postForm.url" autocomplete="off" />
          </el-form-item>
          <el-form-item label="网站简介" prop="introduce">
            <el-input v-model="postForm.introduce" type="textarea" :autosize="{minRows: 6}" autocomplete="off" />
          </el-form-item>
          <el-form-item label="邮箱地址" prop="email">
            <el-input
              v-model="postForm.email"
              autocomplete="off"
              aria-placeholder="成功/有疑问时可通过此邮箱通知/联系"
            />
          </el-form-item>

        </el-form>
        <template #footer>
          <el-button @click="closeModal()">取 消</el-button>
          <el-button type="primary" :disabled="btnDisabled" @click="submit()">确 定</el-button>
        </template>
      </el-dialog>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCommonStore } from '@/stores/common'
import linkApi from '@/api/link'
import { checkIsLogin, randomSortList, toWeb, copy } from '@/utils/common'
import { ElMessage, type FormInstance } from 'element-plus'
import { Icon } from '@iconify/vue'

const commonStore = useCommonStore()

const baseInfo = {
  url: null,
  name: null,
  cover: null,
  introduce: null,
  email: null,
  type: 1
}

const postFormRef = ref<FormInstance | null>(null)
const linkList = ref<any>([])
const dialogFormVisible = ref(false)
const btnDisabled = ref(false)
const postForm = ref(Object.assign({}, baseInfo))
const rules = {
  'name': [{ required: true, message: '网站名称不能为空', trigger: 'blur' },
    { max: 100, message: '网站名称不能超过100个字符', trigger: 'blur' }
  ],
  'email': [
    { required: true, message: '请填写邮箱，不然无法通知到您', trigger: 'blur' },
    {
      pattern: /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((.[a-zA-Z0-9_-]{2,3}){1,2})$/,
      message: '请填写正确的邮箱'
    }
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

const websiteInfo = computed(() => {
  return commonStore.websiteInfo
})

const cover = computed(() => {
  return 'background: url(' + commonStore.pageCoverMap['link'].pageCover + ') center center / cover no-repeat'
})

fetchData()

function fetchData() {
  linkApi.getList().then(res => {
    linkList.value = randomSortList(res.data)
  })
}

function onclick() {
  dialogFormVisible.value = true
}

function submit() {
  btnDisabled.value = true
  postFormRef.value?.validate((valid) => {
    if (valid) {
      linkApi.save(postForm.value).then(() => {
        ElMessage({
          message: '申请成功,通过申请后将通过邮件告知您',
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

<style src="@/assets/css/about.scss" scoped />
<style lang="scss" scoped>
blockquote {
  line-height: 2;
  margin: 0;
  font-size: 15px;
  border-left: 0.2rem solid #49b1f5;
  padding: 10px 1rem;
  background-color: #ecf7fe;
  border-radius: 4px;

  div {
    display: flex;
    align-items: center;
  }
}

.link-title {
  color: #344c67;
  font-size: 21px;
  font-weight: bold;
  line-height: 2;
  display: flex;
  align-items: center;

  :deep(svg) {
    margin-right: 5px;
  }
}

.link-container {
  margin: 10px 10px 0;
}

.link-wrapper {
  position: relative;
  border-radius: 8px;
  margin: 10px 0;
}

.link-avatar {
  margin-left: 5px;
  transition: all 0.5s;
}

.link-name {
  padding-top: 5px;
  font-size: 1rem;
  font-weight: bold;
  height: 1.6rem;
}

.link-intro {
  padding-right: 5px;
  font-size: 12px;
  color: #1f2d3d;
  width: 100%;
  height: 52px;
}

.title-desc {
  position: relative;
}

.link-wrapper {
  &:hover {
    color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 2px 20px #49b1f5;

    .link-intro {
      color: rgba(255, 255, 255, 0.8);
    }

    &:before {
      transform: scale(1);
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

html.dark {

  .link-title {
    color: #71b4ff;
  }

  .link-intro {
    color: #fff;
  }

  blockquote {
    background: #252525;
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
  .link-avatar {
    margin-left: 30px;
  }
}
</style>
