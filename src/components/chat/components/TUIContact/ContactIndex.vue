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

  &-left {
    min-width: 285px;
    flex: 0 0 24%;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  &-right {
    border-left: 1px solid #f4f5f9;
    flex: 1;
    overflow: hidden;
  }
}

html.dark {
  .tui-contact {
    &-right {
      border-left: 1px solid $dark-border-color;
    }
  }
}
</style>
