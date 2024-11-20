import {
  ArticleStatusEnum, FileUploadStatusEnum,
  GenderEnum,
  NoticeTypeEnum,
  ObjectTypeEnum
} from '@/enums'
import { IBaseUser } from '@/interface'

export interface IBaseUser {
  id: number
  nickname: string
  avatar: string
  address: string
}

export interface IUserDetail {
  id: string
  uid: number
  nickname: string
  avatar: string
  background: string
  gender: GenderEnum
  occupation: string
  summary: string
  address: string
  articleCount: number
  viewCount: number
  commentCount: number
  fansCount: number
  articleLikeMeCount: number
  articleCollectCount: number
  articleCommentCount: number
  articleViewCount: number
  registerTimestamp: number
  isMyFans: boolean
  isFollowed: boolean
  isFriend: boolean
  isBlocked: boolean
}

export interface IUserRestriction {
  commentForbidden: boolean
  userForbidden: boolean
}

export interface IUserSelfInfo {
  id: string
  uid: number
  nickname: string
  avatar: string
  background: string
  gender: GenderEnum
  occupation: string
  summary: string
  address: string
  mobile: string
  email: string
  wechat: string
  articleLikeSet: string[]
  articleCollectSet: string[]
  commentLikeSet: string[]
  userRestriction: IUserRestriction
}

export interface IReply {
  content: string,
  touristComment: {
    nickname: string,
    email: string,
    avatar: string
  },
  replyComment: string
}

export interface IReplyComment {
  objId: string,
  objType: ObjectTypeEnum,
  replyUserId: string,
  parentId: string,
  firstLevelId: string,
  index: number,
  originContent: string,
  replyUser: IBaseUser,
  componentIndex: number
}

export interface IBaseArticle {
  id: string
  title: string
  userId: string
  cover: string
  createTime: string
}

export interface ISearchArticle {
  id: string
  useId: string
  title: string
  content: string
  categoryId: string
  tagList: string[]
  cover: string
  isOriginal: boolean
  status?: ArticleStatusEnum
  createTime: string
  updateTime: string
  collectCount: number
  commentCount: number
  likeCount: number
  viewCount: number
  user: IBaseUser
}

export interface IAttach {
  uid: string
  url: string
  name: string
  size: number
  status?: FileUploadStatusEnum
  progress?: number
  file?: File
}

export interface ITag {
  id: string
  name: string
}


export interface IArticle {
  id: string
  userId: string
  title: string
  content: string
  categoryId: string
  tagList: string[]
  cover: string
  attachList: IAttach[]
  isMarkdown: boolean
  isOriginal: boolean
  status?: ArticleStatusEnum
  createTime: string
  updateTime: string
  editTime: string
  collectCount: number
  commentCount: number
  likeCount: number
  viewCount: number
  user: IBaseUser
  lastArticle?: IBaseArticle
  nextArticle?: IBaseArticle
  newestArticleList: IBaseArticle[]
}

export interface INoticeDetail {
  fromUserId: string
  fromUser: IBaseUser
  objId: string
  objContent: string
  objType: ObjectTypeEnum
  commentId: string
  commentType: ObjectTypeEnum
  commentContent: string
}

export interface INotice {
  id: string
  userId: string
  noticeType: NoticeTypeEnum
  title: string
  content: string
  createTime: string
  isRead: boolean
  detail: INoticeDetail
}

export interface IEmojiChar {
  char: string
  name: string
}

export interface IEmojiCollect {
  id: string
  url: string
}