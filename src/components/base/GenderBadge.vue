<template>
  <span :class="['gender-badge', `gender-badge-${gender}`]" :title="genderConfig.name">
    <Icon :icon="genderConfig.icon" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { genderMap } from '@/utils/constant'
import { GenderEnum } from '@/enums'

interface GenderConfig {
  name: string
  icon: string
  color: string
}

const props = defineProps<{
  gender: GenderEnum
}>()

const genderConfig = computed(() => {
  return getGenderConfig(props.gender)
})

/**
 * 获取性别徽标配置。
 *
 * :param gender: 性别枚举值。
 * :return: 性别展示配置。
 */
function getGenderConfig(gender: GenderEnum): GenderConfig {
  return genderMap[gender] || genderMap[GenderEnum.SECRET]
}
</script>

<style scoped lang="scss">
@import "@/assets/css/variables";

.gender-badge {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  vertical-align: middle;

  svg {
    width: 13px;
    height: 13px;
  }
}

.gender-badge-0 {
  background: #eef2f6;
  color: #788594;
}

.gender-badge-1 {
  background: #e7f1ff;
  color: #2f80ed;
}

.gender-badge-2 {
  background: #ffeaf3;
  color: #e85d9e;
}

html.dark {
  .gender-badge-0 {
    background: rgba(156, 163, 175, 0.16);
    color: #b8c0cc;
  }

  .gender-badge-1 {
    background: rgba(47, 128, 237, 0.18);
    color: #7db3ff;
  }

  .gender-badge-2 {
    background: rgba(232, 93, 158, 0.18);
    color: #ff9cc9;
  }
}
</style>
