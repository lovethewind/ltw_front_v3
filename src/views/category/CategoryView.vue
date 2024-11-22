<template>
  <div>
    <!-- banner -->
    <div class="banner" :style="cover">
      <h1 class="banner-title">分类</h1>
    </div>
    <!-- 分类列表 -->
    <el-card class="blog-container">
      <div class="category-title">分类 - {{ count || 0 }}</div>
      <ul class="category-list">
        <li
          v-for="item of categoryList"
          :key="item.id"
          class="category-list-item"
        >
          <router-link :to="'/category/' + item.id">
            {{ item.name }}
            <span class="category-count">({{ item.articleCount || 0 }})</span>
          </router-link>
        </li>
      </ul>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommonStore } from '@/stores/common'

const commonStore = useCommonStore()


const cover = computed(() => {
  return 'background: url(' + commonStore.pageCoverMap['category'].pageCover + ') center center / cover no-repeat'
})

const categoryList = computed(() => {
  return commonStore.categoryList
})

const count = computed(() => {
  return commonStore.categoryList.length
})

</script>

<style src="@/assets/css/about.scss" scoped/>

<style lang="scss" scoped>
.category-title {
  text-align: center;
  font-size: 36px;
  line-height: 2;
}

@media (max-width: 759px) {
  .category-title {
    font-size: 28px;
  }
}

.category-list {
  margin: 0 1.8rem;
  list-style: none;
}

.category-list-item {
  padding: 8px 1.8rem 8px 0;

  &:before {
    display: inline-block;
    position: relative;
    left: -0.75rem;
    width: 12px;
    height: 12px;
    border: 0.2rem solid #49b1f5;
    border-radius: 50%;
    background: #fff;
    content: "";
    transition-duration: 0.3s;
  }

  &:hover:before {
    border: 0.2rem solid #ff7242;
  }

  a:not(:hover) {
    transition: all 0.3s;
  }
}


.category-count {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: #858585;
}
</style>
