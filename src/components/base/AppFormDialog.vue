<template>
  <el-dialog v-model="visible" class="app-form-dialog">
    <div v-if="heroTitle || heroDescription || heroIcon" class="app-dialog-hero">
      <div v-if="heroIcon" class="app-dialog-hero__icon">
        <Icon :icon="heroIcon" />
      </div>
      <div class="app-dialog-hero__content">
        <h3 v-if="heroTitle">{{ heroTitle }}</h3>
        <p v-if="heroDescription">{{ heroDescription }}</p>
      </div>
    </div>
    <div v-if="tip" class="app-dialog-tip">
      <Icon :icon="tipIcon" />
      {{ tip }}
    </div>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface AppFormDialogProps {
  heroIcon?: string
  heroTitle?: string
  heroDescription?: string
  tip?: string
  tipIcon?: string
}

withDefaults(defineProps<AppFormDialogProps>(), {
  heroIcon: '',
  heroTitle: '',
  heroDescription: '',
  tip: '',
  tipIcon: 'mage:alert-circle'
})

const visible = defineModel<boolean>({ required: true })
</script>
