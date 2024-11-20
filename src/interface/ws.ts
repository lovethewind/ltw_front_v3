import {
  ApplyStatusEnum,
  ChatGroupTypeEnum,
  ChatMessageTypeEnum,
  ContactTypeEnum, MessageSendStatusEnum,
  MessageShowTypeEnum,
  MessageTypeEnum
} from '@/enums/ws'
import { ObjectTypeEnum } from '@/enums'

export interface ExtensionInfo {
  weight: number;
  text: string;
  icon: string;
  data: Record<string, any>;
  listener: {
    onClicked?: CallableFunction;
    onLongPressed?: CallableFunction;
    onTouched?: CallableFunction;
    onSwiped?: CallableFunction;
  };
}


interface IAttach {
  url: string
  name: string
  size: number
  type: string
}

export interface IOption {
  key: string
  style: 'text' | 'button'
  type: string
  label: string
  icon: string
  onClick: () => void
}

export interface IMessage<T> {
  messageType: MessageTypeEnum
  showType: MessageShowTypeEnum
  message: T
}

export type ReceiveMessage = IChatMessage & ISystemMessage & IChangeCurrentConversationMessage & FriendApplyMessage

export interface IUserProfile {
  id: string
  avatar: string
  nickname: string
}

export interface IGroupProfile {
  id: string
  avatar: string
  name: string
  groupType: ChatGroupTypeEnum
}

export interface IGroupInfo {
  id: string
  avatar: string
  name: string
  description: string
  notice: string
  groupType: ChatGroupTypeEnum
}

export interface IConversation {
  contactId: string
  contactType: ContactTypeEnum
  conversationId: string
  isMuted: boolean
  isPinned: boolean
  unreadCount: number
  lastMessage?: IChatMessage
  userProfile?: IUserProfile
  groupProfile?: IGroupProfile
  draftText?: string
  online: boolean
}

export interface IFriend {
  id: string
  contactId: string
  contactType: ContactTypeEnum
  userProfile: IUserProfile
  createTime: string
}

export interface IBlackListItem {
  id: string
  objId: string
  objType: ObjectTypeEnum
  userProfile: IUserProfile
  updateTime: string
}

export interface IFriendApplyItem {
  id: string
  userId: string
  contactId: string
  userProfile: IUserProfile
  content: string
  createTime: string
  updateTime: string
  status: ApplyStatusEnum
}

export type IContactListType = IFriend & IFriendApplyItem & IBlackListItem & IGroupInfo

export interface IChatSendMessage {
  userId: string
  contactId: string
  contactType: ContactTypeEnum
  conversationId: string
  messageType: ChatMessageTypeEnum
  content: string
  attach?: IAttach[]
  status: MessageSendStatusEnum
  tempId: string
  createTime: string
  progress?: number
}

export export interface IChatUpdateMessage {
  tempId: string
  progress?: number
}

export interface IChatMessage {
  id: string
  userId: string
  contactId: string
  contactType: ContactTypeEnum
  conversationId: string
  userProfile?: IUserProfile
  groupProfile?: IGroupProfile
  messageType: ChatMessageTypeEnum
  content: string
  attach: IAttach[]
  isRead: boolean
  createTime: string
  tempId: string
  status: MessageSendStatusEnum
  progress?: number
}

export interface ISystemMessage {
  title: string
  content: string
}

export interface IChangeCurrentConversationMessage {
  conversationId: string
}

export interface FriendApplyMessage {
  userId: string
  status: ApplyStatusEnum
  userProfile: IUserProfile
}