import { ref } from 'vue'
import { defineStore } from 'pinia'


// 创建 Pinia 存储模块
export const useModalStore = defineStore('modal', () => {
  const searchFlag = ref(false)
  const loginFlag = ref(false)
  const registerFlag = ref(false)
  const forgetFlag = ref(false)
  const feedbackFlag = ref(false)
  const drawer = ref(false)
  const chatFlag = ref(false)

  function resetState() {
    searchFlag.value = false
    loginFlag.value = false
    registerFlag.value = false
    forgetFlag.value = false
    feedbackFlag.value = false
    drawer.value = false
    chatFlag.value = false
  }

  function setSearchFlag(val: boolean) {
    searchFlag.value = val
  }

  function setLoginFlag(val: boolean) {
    loginFlag.value = val
  }

  function setRegisterFlag(val: boolean) {
    registerFlag.value = val
  }

  function setForgetFlag(val: boolean) {
    forgetFlag.value = val
  }

  function setDrawer(val: boolean) {
    drawer.value = val
  }

  function setFeedbackFlag(val: boolean) {
    feedbackFlag.value = val
  }

  function setChatFlag(val: boolean) {
    chatFlag.value = val
  }

  return {
    searchFlag,
    loginFlag,
    registerFlag,
    forgetFlag,
    feedbackFlag,
    drawer,
    chatFlag,
    resetState,
    setSearchFlag,
    setLoginFlag,
    setRegisterFlag,
    setForgetFlag,
    setDrawer,
    setFeedbackFlag,
    setChatFlag
  }
})
