<template>
  <div v-if="isNotNetwork" class="network">
    <i class="icon icon-error">!</i>
    <p class="network-content">
      网络异常，请您检查网络设置
    </p>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue'

const isNotNetwork = ref(false)

</script>

<style lang="scss" scoped src="../style/index.scss"></style>
