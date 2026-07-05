import type { IChatMessage, IMessage } from '@/interface/ws'
import { ChatMessageTypeEnum, ContactTypeEnum } from '@/enums/ws'
import type { INotice } from '@/interface'
import { NoticeTypeEnum, ObjectTypeEnum } from '@/enums'

type NoticeContentType = 'article' | 'picture' | 'user' | 'content' | 'originComment' | 'likeComment'

/**
 * 获取聊天消息的列表/通知预览文案。
 *
 * :param message: 聊天消息对象。
 * :return: 消息预览文案。
 */
export function dealChatMessageContent(message: IChatMessage): string {
  if (!message) return ''
  if (message.messageType === ChatMessageTypeEnum.IMAGE) {
    return '[图片]'
  }
  if (message.messageType === ChatMessageTypeEnum.FILE) {
    return '[文件]'
  }
  if (message.messageType === ChatMessageTypeEnum.AUDIO) {
    return '[语音]'
  }
  if (message.messageType === ChatMessageTypeEnum.VIDEO) {
    return '[视频]'
  }
  return message.content
}

/**
 * 生成右上角 IM 消息弹窗的 HTML 内容。
 *
 * :param message: WebSocket 推送的聊天消息。
 * :return: IM 消息弹窗 HTML 字符串。
 */
export function dealChatNotificationContent(message: IChatMessage): string {
  const isGroup = message.contactType === ContactTypeEnum.GROUP || !!message.groupProfile
  const avatar = isGroup ? message.groupProfile?.avatar : message.userProfile?.avatar
  const name = (isGroup ? message.groupProfile?.name : message.userProfile?.nickname) || '新消息'
  const badgeText = isGroup ? '群聊' : '私信'
  const preview = dealChatMessageContent(message)

  return `<div class="ws-chat-card"><img class="ws-chat-avatar" src="${avatar || ''}" alt="" /><div class="ws-chat-main"><div class="ws-chat-header"><span class="ws-chat-name">${name}</span><span class="ws-chat-badge">${badgeText}</span></div><div class="ws-chat-preview ellipsis-2l">${preview || '收到一条新消息'}</div></div></div>`
}

/**
 * 生成右上角通知弹窗的 HTML 内容。
 *
 * :param message: WebSocket 推送的通知消息。
 * :return: 通知弹窗 HTML 字符串。
 */
export function dealNoticeMessageContent(message: IMessage<INotice>): string {
  const windowOpenUrl = window.location.origin + '/user-notice/' + message.message.noticeType
  let content = `<div class="notification-div" onclick="window.open('${windowOpenUrl}', '_blank')"><div class="ws-notice-card">`
  if (message.message.noticeType !== NoticeTypeEnum.SYSTEM) {
    content += getNoticeTypeContent(message, 'user')
  }
  content += getNoticeTypeContent(message, 'content')
  if (message.message.noticeType !== NoticeTypeEnum.SYSTEM) {
    if (message.message.noticeType === NoticeTypeEnum.REPLY) {
      content += getNoticeTypeContent(message, 'originComment')
    }
    if (message.message.noticeType === NoticeTypeEnum.LIKE && message.message.detail.objType === ObjectTypeEnum.COMMENT) {
      content += getNoticeTypeContent(message, 'likeComment')
      if (message.message.detail.commentType === ObjectTypeEnum.ARTICLE) {
        content += getNoticeTypeContent(message, 'article')
      } else if (message.message.detail.commentType === ObjectTypeEnum.PICTURE) {
        content += getNoticeTypeContent(message, 'picture')
      }
    } else { // 其他操作以及点赞的是其他内容
      if (message.message.detail.objType === ObjectTypeEnum.ARTICLE) {
        content += getNoticeTypeContent(message, 'article')
      } else if (message.message.detail.objType === ObjectTypeEnum.PICTURE) {
        content += getNoticeTypeContent(message, 'picture')
      }
    }
  }
  content += '</div></div>'
  return content
}

/**
 * 根据通知对象类型生成通知摘要内容。
 *
 * :param message: 通知消息对象。
 * :param type: 内容类型。
 * :return: 通知摘要 HTML。
 */
function getNoticeTypeContent(message: IMessage<INotice>, type: NoticeContentType): string {
  if (type === 'article') {
    return `<div class="ws-notice-context"><span>来自文章</span><a class="ws-notice-source" href="/article/${message.message.detail.objId}" target="_blank" onclick="event.stopPropagation()">@${message.message.detail.objContent}</a></div>`
  } else if (type === 'picture') {
    return `<div class="ws-notice-picture"><span>来自图片</span><img class="ws-notice-picture-img" src="${message.message.detail.objContent}" alt="" /></div>`
  } else if (type === 'user') {
    return `<div class="ws-notice-sender"><a href="/user/${message.message.detail.fromUser.id}" target="_blank" onclick="event.stopPropagation()"><img class="ws-notice-avatar" src="${message.message.detail.fromUser.avatar}" alt="" /><span class="ws-notice-name">${message.message.detail.fromUser.nickname}</span><span class="ws-notice-type">${message.message.title}</span></a></div>`
  } else if (type === 'content') {
    if (!message.message.content) {
      return ''
    }
    if (message.message.noticeType === NoticeTypeEnum.SYSTEM) {
      return `<div class="ws-notice-system"><span class="ws-notice-type">官方</span><div class="ws-notice-body ellipsis-3l">${message.message.content}</div></div>`
    }
    return `<div class="ws-notice-body ellipsis-3l">${message.message.content}</div>`
  } else if (type === 'originComment') {
    return `<div class="ws-notice-quote ellipsis-2l"><span>原评论：</span>${message.message.detail.commentContent}</div>`
  } else if (type === 'likeComment') {
    return `<div class="ws-notice-quote ellipsis-2l"><span>评论：</span>${message.message.detail.commentContent}</div>`
  } else {
    return ''
  }
}
