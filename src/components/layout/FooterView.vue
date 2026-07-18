<template>
  <div v-if="websiteInfo.showFooter" class="footer-wrap" :style="websiteInfo.footerStyle">
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="footer-brand-dot" />
        <span>©2023 - {{ currentYear }} By {{ websiteInfo.author }}</span>
      </div>
      <div class="footer-actions">
        <nav class="footer-links" aria-label="页脚导航">
          <button class="footer-link" type="button" @click="openFeedback">联系我们</button>
          <button class="footer-link" type="button" @click="goPage('/about')">关于本站</button>
          <button class="footer-link" type="button" @click="goPage('/link')">友链</button>
        </nav>
        <div class="footer-meta">
          <a class="footer-record" href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
            {{ websiteInfo.recordNum }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useModalStore } from '@/stores/modal'


const router = useRouter()
const commonStore = useCommonStore()
const modalStore = useModalStore()

const websiteInfo = computed(() => {
  return commonStore.websiteInfo
})

const currentYear = computed((): number => {
  return new Date().getFullYear()
})

/**
 * 跳转到页脚导航对应页面。
 *
 * :param path: 目标页面路径。
 * :return: 无返回值。
 */
function goPage(path: string): void {
  router.push(path)
}

/**
 * 打开联系反馈弹窗。
 *
 * :return: 无返回值。
 */
function openFeedback(): void {
  modalStore.setFeedbackFlag(true)
}
</script>

<style lang="scss" scoped>
@import "@/assets/css/variables";

.footer-wrap {
  width: 100%;
  position: relative;
  overflow: hidden;
  padding: 34px 24px 32px;
  color: #fff;
  animation-duration: 22s !important;
}

.footer-wrap::before {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.12), rgba(15, 23, 42, 0.02)),
    linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0));
  content: "";
  pointer-events: none;
}

.footer-inner {
  position: relative;
  z-index: 1;
  display: flex;
  max-width: 1180px;
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.footer-brand,
.footer-actions,
.footer-links,
.footer-meta {
  display: flex;
  align-items: center;
}

.footer-brand {
  min-width: 0;
  gap: 9px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
}

.footer-brand-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.58);
}

.footer-links,
.footer-meta {
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.footer-actions {
  justify-content: flex-end;
  gap: 14px;
}

.footer-link {
  border: 0;
  padding: 0;
  color: #fff;
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.6;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.footer-link:hover {
  opacity: 1;
  transform: translateY(-1px);
}

.footer-meta {
  font-size: 14px;
  line-height: 1.6;
}

.footer-record {
  border-radius: 999px;
  padding: 4px 11px;
  color: #fff;
  background: rgba(15, 23, 42, 0.16);
  font-weight: 600;
}

.footer-record:hover {
  color: #fff;
  background: rgba(15, 23, 42, 0.22);
}


html.dark {
  .footer-wrap {
    background: linear-gradient(135deg, #111827, #1f2937) !important;
  }

  .footer-wrap::before {
    background: rgba(2, 6, 23, 0.3);
  }

  .footer-brand,
  .footer-link {
    color: #e5e7eb;
  }

  .footer-brand-dot {
    background: #5eead4;
    box-shadow: 0 0 18px rgba(94, 234, 212, 0.45);
  }

  .footer-record {
    color: #e5e7eb;
    background: rgba(30, 41, 59, 0.82);
  }
}

@media (max-width: 640px) {
  .footer-wrap {
    padding: 28px 16px 26px;
  }

  .footer-inner,
  .footer-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .footer-links,
  .footer-meta {
    justify-content: flex-start;
  }

  .footer-brand,
  .footer-link,
  .footer-meta {
    font-size: 13px;
  }
}
</style>
