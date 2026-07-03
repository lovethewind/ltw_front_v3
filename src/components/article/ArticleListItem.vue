<template>
  <el-card class="article-list-item-card">
    <router-link
      :to="'/article/' + article.id"
      class="article-cover-link"
      target="_blank"
      rel="noopener noreferrer"
    >
      <el-image
        class="on-hover cover-img"
        :src="article.coverThumb || article.cover"
        lazy
        fit="cover"
      />
    </router-link>
    <div class="article-wrapper">
      <router-link
        :to="'/article/' + article.id"
        class="article-main-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <h3 class="article-list-item-title">
          {{ article.title }}
        </h3>
        <div class="article-content">
          {{ article.content }}
        </div>
      </router-link>
      <div class="article-info">
        <div class="article-meta-row">
          <router-link
            :to="'/user/' + article.user.id"
            class="article-author-chip"
            target="_blank"
            rel="noopener noreferrer"
          >
            <el-avatar :src="article.user.avatar" size="small" />
            <span class="ms-1 a-link ellipsis username-info">{{ article.user.nickname }}</span>
          </router-link>
          <span class="article-date">
            <Icon icon="mingcute:time-line" class="font-14" />
            {{ covertTimeHowLongAgo(article.createTime) }}
          </span>
          <div class="article-taxonomy">
            <el-tag size="small" :type="article.isOriginal ? 'success' : 'warning'">
              {{ article.isOriginal ? '原创' : '转载' }}
            </el-tag>
            <span class="article-tags">
              <router-link
                v-for="tagId of article.tagList.slice(0, 1)"
                :key="'articleListItemTag' + article.id + tagId"
                :to="'/tag/' + tagId"
                target="_blank"
                rel="noopener noreferrer"
              >
                <el-tag size="small" class="article-tag-pill">
                  {{ tagMap[tagId] ? tagMap[tagId].name : '' }}</el-tag
                >
              </router-link>
            </span>
          </div>
          <div class="article-stats">
            <span>
              <Icon icon="ph:eye" class="font-14" />
              {{ covertNumberDisplay(article.viewCount) }}
            </span>
            <span>
              <Icon icon="iconamoon:comment-dots" class="font-14" />
              {{ covertNumberDisplay(article.commentCount) }}
            </span>
            <span>
              <Icon icon="tabler:thumb-up" class="font-14" />
              {{ covertNumberDisplay(article.likeCount) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { IArticle } from '@/interface'
import { covertNumberDisplay } from '@/utils/common'
import { covertTimeHowLongAgo } from '@/utils/date'

defineProps<{
  article: IArticle
  index: number
  categoryMap: Record<string, { name: string }>
  tagMap: Record<string, { name: string }>
}>()

defineEmits<{
  (event: 'category-click', categoryId: string): void
}>()
</script>

<style lang="scss" scoped>
:deep(.el-card__body) {
  display: flex;
  height: 100%;
  width: 100%;
  --el-card-padding: 0;
}

.article-list-item-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 26px rgba(31, 45, 61, 0.05);
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.article-list-item-card:hover {
  border-color: rgba(47, 128, 237, 0.2);
  box-shadow: 0 16px 34px rgba(31, 45, 61, 0.09);
  transform: translateY(-2px);
}

.article-cover-link {
  display: block;
  overflow: hidden;
  background: #e2e8f0;
}

.cover-img {
  width: 100%;
  height: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.article-wrapper {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  height: 100%;
  min-width: 0;
  padding: 0.9rem 1.1rem;
}

.article-main-link {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  color: inherit;
}

.article-main-link:hover {
  .article-list-item-title {
    color: #2f80ed;
  }
}

.article-author-chip {
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: 80px;
  max-width: 120px;
}

.username-info {
  min-width: 0;
  max-width: calc(100% - 30px);
}

.article-date {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;

  :deep(svg) {
    margin-right: 5px;
  }
}

.article-list-item-title {
  margin: 0 0 0.35rem;
  color: #1f2937;
  font-size: 1.18rem;
  font-weight: 700;
  line-height: 1.42;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  transition: color 0.18s ease;
}

.article-content {
  color: #4b5563;
  line-height: 1.65;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.article-info {
  display: flex;
  align-items: center;
  margin-top: auto;
  padding-top: 0.62rem;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.6;

  :deep(a) {
    color: #64748b;
  }

  :deep(svg) {
    margin-right: 5px;
  }
}

.article-meta-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  min-width: 0;
  color: #64748b;
  font-size: 0.82rem;
}

.article-taxonomy,
.article-stats,
.article-tags {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.article-taxonomy {
  flex: 1 1 auto;
  flex-wrap: nowrap;
  overflow: hidden;
}

.article-stats {
  margin-left: auto;
  flex-shrink: 0;
  gap: 0.48rem;

  span {
    display: inline-flex;
    align-items: center;
  }
}

.article-tag-pill {
  border-color: rgba(47, 128, 237, 0.16);
  background: rgba(47, 128, 237, 0.08);
  color: #2f6fcb;
  font-weight: 500;

  &:hover {
    border-color: rgba(47, 128, 237, 0.28);
    background: rgba(47, 128, 237, 0.13);
    color: #1d5fbf;
  }
}

@media (min-width: 760px) {
  .article-list-item-card {
    display: flex;
    height: 180px;
    width: 100%;
    margin-top: 0.75rem;
  }

  .article-cover-link {
    height: 100%;
    width: 30%;
    flex: 0 0 30%;
  }

  .on-hover {
    transition: all 0.6s;
  }

  .article-list-item-card:hover .on-hover {
    transform: scale(1.1);
  }

  .article-wrapper {
    width: 100%;
  }
}

@media (max-width: 759px) {
  :deep(.el-card__body) {
    display: block;
  }

  .article-list-item-title {
    font-size: 1.12rem;
  }

  .article-info {
    font-size: 12px;
    margin-top: 0;

    a {
      display: inline-flex;
    }
  }

  .article-list-item-card {
    margin-top: 0.75rem;
  }

  .article-cover-link {
    height: 190px;
    width: 100%;
  }

  .article-wrapper {
    padding: 0.85rem 1rem 1rem;
  }

  .article-meta-row {
    font-size: 0.78rem;
    flex-wrap: wrap;
  }

  .article-taxonomy {
    flex: 1 1 100%;
    flex-wrap: wrap;
    order: 3;
  }

  .article-stats {
    width: 100%;
    margin-left: 0;
    gap: 0.9rem;
    order: 2;
  }
}

html.dark {
  .article-list-item-card {
    border-color: #343941;
    background: rgba(31, 35, 41, 0.94);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24);

    &:hover {
      border-color: rgba(117, 167, 255, 0.38);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.34);
    }
  }

  .article-cover-link {
    background: #15181d;
  }

  .article-meta-row,
  .article-info,
  .article-info :deep(a) {
    color: #9ca8b8;
  }

  .article-list-item-title {
    color: #f5f7fb;
  }

  .article-main-link:hover .article-list-item-title {
    color: #8ab4ff;
  }

  .article-content {
    color: #c8d2df;
  }

  .article-info {
    border-top-color: #343941;
  }

  .article-tag-pill {
    border-color: rgba(117, 167, 255, 0.24);
    background: rgba(117, 167, 255, 0.12);
    color: #9ec0ff;

    &:hover {
      border-color: rgba(117, 167, 255, 0.38);
      background: rgba(117, 167, 255, 0.18);
      color: #c7dbff;
    }
  }
}
</style>
