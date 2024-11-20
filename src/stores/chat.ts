import { ref } from 'vue'
import { defineStore } from 'pinia'
import { IContactListType, IConversation, IOption } from '@/interface/ws'
import { ContactListTypeEnum } from '@/enums/ws'

export const useChatStore = defineStore('chat', () => {
  const editorContent = ref('')
  const currentNavbar = ref('message')
  const currentConversation = ref<IConversation>()
  const currentContact = ref<IContactListType>()
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

  function setCurrentContact(val: IContactListType) {
    currentContact.value = val
  }

  function setCurrentContactType(val: ContactListTypeEnum) {
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
