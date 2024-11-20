export enum MessageTypeEnum {
  NOTICE = 1,
  CHAT_MESSAGE = 2,
  SYSTEM_IN_TIME = 3,
  CHANGE_CURRENT_CONVERSATION = 4,
  FRIEND_APPLY = 5,
}


export enum MessageShowTypeEnum {
  NOTIFICATION = 1,
  MESSAGEBOX = 2
}

export enum ChatGroupTypeEnum {
  PRIVATE = 1,
  PUBLIC = 2
}

export enum ContactTypeEnum {
  USER = 1,
  GROUP = 2
}

export enum ChatMessageTypeEnum {
  SYSTEM = 1,
  TEXT = 2,
  IMAGE = 3,
  AUDIO = 4,
  VIDEO = 5,
  FILE = 6,
  REPLY = 7,
  AT = 8
}

export enum MessageSendStatusEnum {
  SENDING = 1,
  SUCCESS = 2,
  FAIL = 3,
  DELETE = 4
}

export enum ApplyStatusEnum {
  PENDING = 1,
  AGREE = 2,
  REFUSE = 3
}

export enum ContactListTypeEnum {
  FriendApplyList = 'friendApplyList',
  BlackList = 'blackList',
  GroupList = 'groupList',
  FriendList = 'friendList'
}