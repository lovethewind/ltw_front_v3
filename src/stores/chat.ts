import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ICurrentContact, IConversation, IOption } from '@/interface/ws'
import { ContactListTypeEnum } from '@/enums/ws'

export const useChatStore = defineStore('chat', () => {
  const editorContent = ref('')
  const currentNavbar = ref('message')
  const currentConversation = ref<IConversation>()
  const currentContact = ref<ICurrentContact>()
  const currentContactType = ref<ContactListTypeEnum>()
  const currentContactOperation = ref<IOption[]>([])
  const addConversationUserId = ref<string>()  // 点击私聊按钮

  function setEditorContent(val: string) {
    editorContent.value = val
  }

  function setCurrentNavbar(val: string) {
    currentNavbar.value = val
  }

  function setCurrentConversation(val: IConversation) {
    currentConversation.value = val
  }

  function setCurrentConversationDraftText(val: string) {
    if (currentConversation.value) {
      currentConversation.value.draftText = val
    }
  }

  function setAddConversationUserId(val: string) {
    addConversationUserId.value = val
  }

  /**
   * 设置通讯录右侧当前展示的联系人。
   *
   * :param val: 好友、申请、黑名单、群组或搜索结果联系人。
   * :return: 无返回值。
   */
  function setCurrentContact(val: ICurrentContact): void {
    currentContact.value = val
  }

  /**
   * 设置通讯录右侧当前联系人所属列表类型。
   *
   * :param val: 联系人列表类型；搜索结果没有固定列表类型时可为空。
   * :return: 无返回值。
   */
  function setCurrentContactType(val?: ContactListTypeEnum): void {
    currentContactType.value = val
  }

  function setCurrentContactOperation(val: IOption[]) {
    currentContactOperation.value = val
  }

  function resetCurrentContact() {
    currentContact.value = undefined
    currentContactType.value = undefined
    currentContactOperation.value = []
  }

  return {
    editorContent,
    currentNavbar,
    currentConversation,
    addConversationUserId,
    currentContact,
    currentContactType,
    currentContactOperation,
    setEditorContent,
    setCurrentNavbar,
    setCurrentConversation,
    setAddConversationUserId,
    setCurrentContact,
    setCurrentContactType,
    setCurrentContactOperation,
    setCurrentConversationDraftText,
    resetCurrentContact
  }
})
