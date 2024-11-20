<template>
  <div class="tag-div">
    <!-- banner -->
    <div class="banner" :style="cover">
      <h1 class="banner-title">标签</h1>
    </div>
    <!-- 标签列表 -->
    <el-card class="blog-container">
      <div class="tag-cloud-title">标签 - {{ tagList.length }}</div>
      <div class="tag-cloud">
        <router-link
          v-for="(item, index) of tagList"
          :key="item.id"
          :style="{ 'font-size': Math.floor(Math.random() * 10) + 18 + 'px', 'color': colors[index] }"
          :to="'/tag/' + item.id"
        >
          {{ item.name }}
        </router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCommonStore } from '@/stores/common'

const commonStore = useCommonStore()

const colors = ref<any>({})

const cover = computed(() => {
  return 'background: url(' + commonStore.pageCoverMap['tag'].pageCover + ') center center / cover no-repeat'
})

const tagList = computed(() => {
  return commonStore.choiceTagList
})

const count = computed(() => {
  return commonStore.choiceTagList.length
})

onMounted(() => {
  changeColors(count.value)
})

function changeColors(n: number) { // 随机变色
  for (let i = 0; i < n; i++) {
    const r = Math.floor(Math.random() * 255)
    const g = Math.floor(Math.random() * 255)
    const b = Math.floor(Math.random() * 255)
    colors.value[i] = 'rgb(' + r + ',' + g + ',' + b + ')'
  }
}

</script>

<style src="@/assets/css/about.scss" scoped />

<style lang="scss" scoped>

.tag-cloud-title {
  line-height: 2;
  font-size: 36px;
  text-align: center;
}

@media (max-width: 759px) {
  .tag-cloud-title {
    font-size: 25px;
  }
}

.tag-cloud {
  text-align: center;

  a {
    color: #616161;
    display: inline-block;
    text-decoration: none;
    padding: 0 8px;
    line-height: 2;
    transition: all 0.3s;

    &:hover {
      color: #03a9f4 !important;
      transform: scale(1.1);
    }
  }
}


</style>
