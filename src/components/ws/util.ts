import type { IChatMessage, IMessage } from '@/interface/ws'
import { ChatMessageTypeEnum } from '@/enums/ws'
import type { INotice } from '@/interface'
import { NoticeTypeEnum, ObjectTypeEnum } from '@/enums'

export function dealChatMessageContent(message: IChatMessage) {
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

export function dealNoticeMessageContent(message: IMessage<INotice>) {
  const windowOpenUrl = window.location.origin + '/user-notice/' + message.message.noticeType
  let content = `<div class="notification-div" onclick="window.open('${windowOpenUrl}', '_blank')">`
  if (message.message.noticeType !== NoticeTypeEnum.SYSTEM) {
    content += getNoticeTypeContent(message, 'user')
  }
  content += getNoticeTypeContent(message, 'content')
  if (message.message.noticeType !== NoticeTypeEnum.SYSTEM) {
    if (message.message.noticeType === NoticeTypeEnum.REPLY) {
      // 回复评论，显示原评论内容
      content += `<div class="ellipsis-3l origin-comment"><span>${message.message.detail.commentContent}</span></div>`
    }
    if (message.message.noticeType === NoticeTypeEnum.LIKE && message.message.detail.objType === ObjectTypeEnum.COMMENT) {
      // 点赞的是评论
      content += `<div class="like-comment ellipsis-3l">${message.message.detail.commentContent}</div>`
      // 显示评论原对象
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
  content += '</div>'
  return content
}

/**
 * 根据通知对象类型生成通知摘要内容。
 *
 * :param message: 通知消息对象。
 * :param type: 内容类型。
 * :return: 通知摘要 HTML。
 */
function getNoticeTypeContent(message: IMessage<INotice>, type: string): string {
  if (type === 'article') {
    return `<div class="origin-article"><a class="tag-a article">文章</a><a href="/article/${message.message.detail.objId}" target="_blank">${message.message.detail.objContent}</a></div>`
  } else if (type === 'picture') {
    return `<div class="picture-content"><a class="tag-a picture">图片</a><img src="${message.message.detail.objContent}" alt="" /><div>`
  } else if (type === 'user') {
    return `<div class="user-content"><a href="/user/${message.message.detail.fromUser.id}" target="_blank"><img src="${message.message.detail.fromUser.avatar}" alt="" /> ${message.message.detail.fromUser.nickname}</a></div>`
  } else if (type === 'content') {
    if (!message.message.content) {
      return ''
    }
    if (message.message.noticeType === NoticeTypeEnum.SYSTEM) {
      return `<div class="notice-content ellipsis-3l"><a class="tag-a system">系统</a>${message.message.content}</div>`
    }
    return `<div class="notice-content ellipsis-3l">${message.message.content}</div>`
  } else {
    return ''
  }
}
