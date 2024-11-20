<template>
  <div>
    <contact-friend-apply />
    <contact-blacklist />
    <contact-group-list />
    <contact-friend-list />
  </div>
</template>
<script setup lang="ts">
import ContactFriendApply from './contact-friend-apply/index.vue'
import ContactBlacklist from './contact-blacklist/index.vue'
import ContactGroupList from './contact-group-list/index.vue'
import ContactFriendList from './contact-friend-list/index.vue'
</script>

<style lang="scss" scoped src="./style/index.scss"></style>
