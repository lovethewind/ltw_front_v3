<template>
  <div class="tui-contact">
    <div class="tui-contact-left">
      <ContactSearch />
      <ContactList class="tui-contact-left-list" />
    </div>
    <div class="tui-contact-right">
      <ContactInfo />
    </div>
  </div>
</template>
<script lang="ts" setup>
import ContactSearch from './contact-search/index.vue'
import ContactList from './contact-list'
import ContactInfo from './contact-info/ContactInfoIndex.vue'


</script>
<style lang="scss" scoped>
@import "../../assets/styles/common";
@import "@/assets/css/variables";

.tui-contact {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  overflow: hidden;
  background: #eef3f7;

  &-left {
    min-width: 310px;
    flex: 0 0 310px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    background: #f9fafb;
  }

  &-right {
    border-left: 1px solid #e8edf2;
    flex: 1;
    overflow: hidden;
    background: #eef3f7;
  }
}

html.dark {
  .tui-contact {
    background: #18191a;

    &-left {
      background: $dark-main-color;
    }

    &-right {
      border-left: 1px solid $dark-border-color;
      background: #18191a;
    }
  }
}
</style>
