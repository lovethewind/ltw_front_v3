<template>
  <div class="editor-div">
    <Toolbar
      ref="toolbarRef"
      :editor="editorRef"
      :defaultConfig="toolbarConfig"
      :mode="mode"
      class="editor-toolbar"
    />
    <Editor
      ref="contentRef"
      v-model="contentValue"
      :defaultConfig="editorConfig"
      :mode="mode"
      @onCreated="handleCreated"
      @onChange="handleChange"
      class="editor-content"
    />
  </div>
</template>

<script setup lang="ts">
import '@wangeditor/editor/dist/css/style.css'
import { onMounted, shallowRef, onBeforeUnmount, ref } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor } from '@wangeditor/core/dist/core/src/editor/interface'
import { uploadFile } from '@/utils/oss-upload'
import ossApi from '@/api/oss-api'
import { ElMessage } from 'element-plus'
import { UploadFileTypeEnum } from '@/enums'

const emit = defineEmits(['change'])

const editorRef = shallowRef<IDomEditor>()
const toolbarRef = ref<InstanceType<typeof Toolbar> | null>(null)
const contentRef = ref<InstanceType<typeof Editor> | null>(null)
const contentValue = ref('')
const mode = ref('default')
const toolbarConfig = {
  excludeKeys: [
    'fullScreen'
  ]
}
const editorConfig = {
  placeholder: '请输入内容...',
  scroll: false,
  MENU_CONF: {
    uploadImage: {
      // 自定义上传
      async customUpload(file: File, insertFn: InsertFnType) {  // TS 语法
        ossApi.getUploadSignatureUrl({
          dirType: UploadFileTypeEnum.IMAGE,
          fileName: file.name
        }).then(res => {
          uploadFile(res.data, file).then(url => {
            ElMessage({
              message: '上传成功',
              type: 'success',
              plain: true
            })
            // URL.revokeObjectURL(this.option.img)
            // 将显示图片地址清空，防止重复显示
            insertFn(url, file.name, url)
          })
        })
      }
    },
    uploadVideo: {
      // 自定义上传
      async customUpload(file: File, insertFn: InsertFnType) {  // TS 语法
        ossApi.getUploadSignatureUrl({
          dirType: UploadFileTypeEnum.VIDEO,
          fileName: file.name
        }).then(res => {
          uploadFile(res.data, file).then(url => {
            ElMessage({
              message: '上传成功',
              type: 'success',
              plain: true
            })
            insertFn(url)
          })
        })
      }
    }
  }
}

onMounted(() => {
  setContentMarginTop()
  window.addEventListener('resize', setContentMarginTop)
})

onBeforeUnmount(() => {
  const editor = editorRef.value
  editor && editor.destroy()
  window.removeEventListener('resize', setContentMarginTop)
})

function setContentMarginTop() {
  if (!toolbarRef.value || !contentRef.value) return
  const height = toolbarRef.value.$el.offsetHeight
  contentRef.value.$el.style.marginTop = (height < 40 ? 40 : height) + 5 + 'px'
}

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor // 记录 editor 实例，重要！
}

function handleChange(editor: IDomEditor) {
  emit('change', editor.getHtml())
}

function setContent(value: string) {
  editorRef.value?.focus(true)
  contentValue.value = value
}

function getContentLength() {
  return editorRef.value?.getText().length
}

defineExpose({
  setContent,
  getContentLength
})

</script>

<style>
.w-e-modal .btn-close svg {
  height: 0;
}
</style>

<style lang="scss" scoped>
@import "@/assets/css/variables";

.editor-div {
  border-radius: 5px;
  margin: 0 auto;
}

.editor-toolbar {
  border-bottom: 1px solid #ccc;
  position: fixed;
  top: 60px;
  width: 100%;
  display: flex;
  justify-content: center;
  z-index: 1;
}

.editor-content {
  border: 1px solid #ccc;
  margin: 0 auto;
  width: 980px;
  border-radius: 5px;
  min-height: 70vh;
  background: #fff;
}

html.dark {
  .editor-content {
    background: $dark-main-color;
  }
}
</style>