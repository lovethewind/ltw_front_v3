export enum ErrorCode {
  SUCCESS = 200,
  ERROR = 500,
  NOT_LOGIN = 401,
  NOT_PERMISSION = 403,
  DATA_NOT_EXISTS = 10009
}

export enum GenderEnum {
  SECRET = 0,
  MALE = 1,
  FEMALE = 2
}

export enum ArticleStatusEnum {
  DRAFT = 1,
  PUBLISHED = 2,
  CHECKING = 3,
  DELETED = 4
}

export enum OrderTypeEnum {
  NEWEST = 1,
  HOT = 2,
  RECOMMEND = 3
}

export enum AlbumCategoryTypeEnum {
  ALL = 1,
  MY = 2
}

export enum AlbumTypeEnum {
  PUBLIC = 1,
  PRIVATE = 2
}

export enum ShareTypeEnum {
  NOTE = 1,
  LIFE = 2,
  EXPERIENCE = 3,
  MUSIC = 4,
  VIDEO = 5,
  RESOURCE = 6,
  OTHER = 7
}

export enum ShareSearchContentTypeEnum {
  CONTENT = 1,
  TAG = 2
}

export enum WechatScanResultEnum {
  // 0:未扫码 1: 未绑定 2: 已绑定且是登录用户本人 3: 已过期
  NOT_SCAN = 0,
  NOT_BIND = 1,
  HAS_BIND = 2,
  EXPIRED = 3
}

export enum ValidTypeEnum {
  ORIGINAL_PASSWORD = 1,
  EMAIL = 2,
  MOBILE = 3,
  WECHAT = 4
}

export enum WechatAppletCodeTypeEnum {
  // 1:登录 2:换绑旧验证 3:新绑定 4:修改密码
  LOGIN = 1,
  VALIDATE_OLD_WECHAT = 2,
  BIND_NEW_WECHAT = 3,
  MODIFY_PASSWORD = 4
}

export enum SendChangeCodeTypeEnum {
  CHANGE_BIND_EMAIL = 1,
  CHANGE_BIND_MOBILE = 2,
  CHANGE_PASSWORD_EMAIL = 3,
  CHANGE_PASSWORD_MOBILE = 4
}

export enum SendNewBindCodeTypeEnum {
  BIND_EMAIL = 1,
  BIND_MOBILE = 2
}

export enum UserSettingMenuTypeEnum {
  BASE_INFO = '1',
  ARTICLE = '2',
  FOLLOW = '3',
  COLLECT = '4',
  CHANGE_PASSWORD = '5',
  SETTINGS = '6'
}

export enum ActionTypeEnum {
  // 动作类型 1:点赞/喜欢 2:收藏 3:关注 4:访问 5:黑名单
  LIKE = 1,
  COLLECT = 2,
  FOLLOW = 3,
  VIEW = 4,
  BLACKLIST = 5
}

export enum ObjectTypeEnum {
  // 对象类型 1:文章 2:评论 3:用户 4:分享 5:图片
  ARTICLE = 1,
  COMMENT = 2,
  USER = 3,
  SHARE = 4,
  PICTURE = 5,
}

export enum VerifyCodeTypeEnum {
  REGISTER = 'register',
  FIND_PASSWORD = 'find_password',
  CHANGE_BIND = 'change_bind',
  LOGIN = 'login',
  CHANGE_PASSWORD = 'change_password'
}

export enum NoticeTypeEnum {
  // 1: 系统 2: 评论 3:回复(评论) 4: @我 5: 点赞 6: 收藏 7: 关注
  SYSTEM = 1,
  COMMENT = 2,
  REPLY = 3,
  AT_ME = 4,
  LIKE = 5,
  COLLECT = 6,
  FOLLOW = 7
}

export enum UserSettingsCategoryEnum {
  PRIVACY = 1,
  NOTICE = 2
}

export enum UserSettingsEnum {
  ALLOW_VIEW_MY_COLLECT = 'allowViewMyCollect',
  ALLOW_VIEW_MY_FOLLOW = 'allowViewMyFollow',
  ALLOW_VIEW_MY_ARTICLE = 'allowViewMyArticle',
  WHEN_COMMENT_MY_CONTENT = 'whenCommentMyContent',
  WHEN_REPLY_MY_COMMENT = 'whenReplyMyComment',
  WHEN_LIKE_MY_CONTENT = 'whenLikeMyContent',
  WHEN_COLLECT_MY_CONTENT = 'whenCollectMyContent',
  WHEN_FOLLOW_ME = 'whenFollowMe'
}

export enum SearchTypeEnum {
  ARTICLE = 1,
  USER = 2
}

export enum UploadFileTypeEnum {
  AVATAR = 'avatar',
  BACKGROUND = 'background',
  COVER = 'cover',
  EMOJI = 'emoji',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  ATTACH = 'attach',
  OTHER = 'other'
}

export enum FileUploadStatusEnum {
  READY = 1,
  UPLOADING = 2,
  SUCCESS = 3,
  ERROR = 4
}