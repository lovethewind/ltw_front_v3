import { UserSettingsCategoryEnum } from '@/enums'

export const needLoginUrl = ['/article/add/', '/article/edit/']

export const genderMap: any = {
  0: {
    name: '保密',
    icon: 'mdi:eye-off-outline',
    color: 'gray'
  },
  1: {
    name: '男',
    icon: 'ph:gender-male',
    color: 'dodgerblue'
  },
  2: {
    name: '女',
    icon: 'ph:gender-female',
    color: 'pink'
  }

}

export const articleStatusMap = {
  1: '草稿',
  2: '已发布',
  3: '审核中',
  4: '回收站'
}

export const articleStatusTypeMap = {
  1: 'warning',
  2: 'success',
  3: 'danger',
  4: ''
}

// 分享类别 1.笔记 2.生活 3.经验 4.音乐 5.视频 6.资源 7.其他
export const shareTypeList = [
  {
    value: 1,
    name: '笔记',
    icon: 'mdi:notebook',
    color: '#2196f3'
  },
  {
    value: 2,
    name: '生活',
    icon: 'mdi:lifebuoy',
    color: '#4caf50'
  },
  {
    value: 3,
    name: '经验',
    icon: 'mdi:lightbulb-on',
    color: '#ff9800'
  },
  {
    value: 4,
    name: '音乐',
    icon: 'mdi:music',
    color: '#9c27b0'
  },
  {
    value: 5,
    name: '视频',
    icon: 'mdi:video',
    color: '#f44336'
  },
  {
    value: 6,
    name: '资源',
    icon: 'mdi:zip-box',
    color: '#607d8b'
  },
  {
    value: 7,
    name: '其他',
    icon: 'mdi:robot',
    color: '#795548'
  }
]

export const shareTypeMap = {
  1: '笔记',
  2: '生活',
  3: '经验',
  4: '音乐',
  5: '视频',
  6: '资源',
  7: '其他'
}

export const NoticeTypeList = [
  // 1: 系统 2: 评论 3:回复(评论) 4: @我 5: 点赞 6: 收藏 7: 关注
  {
    index: '1',
    value: 1,
    name: '系统通知',
    icon: 'uil:setting'
  },
  {
    index: '2',
    value: 2,
    name: '评论',
    icon: 'mdi:comment-text'
  },
  {
    index: '3',
    value: 3,
    name: '回复',
    icon: 'mdi:comment-text'
  },
  // {
  //   index: '4',
  //   value: 4,
  //   name: '@我',
  //   icon: 'mdi:at'
  // },
  {
    index: '5',
    value: 5,
    name: '点赞',
    icon: 'mdi:thumb-up'
  },
  {
    index: '6',
    value: 6,
    name: '收藏',
    icon: 'mdi:star'
  },
  {
    index: '7',
    value: 7,
    name: '关注',
    icon: 'mdi:account-group'
  }
]

export const userSettingsList = [
  {
    name: '允许查看我的收藏',
    key: 'allowViewMyCollect',
    default: true,
    category: UserSettingsCategoryEnum.PRIVACY
  },
  {
    name: '允许查看我的关注/粉丝',
    key: 'allowViewMyFollow',
    default: true,
    category: UserSettingsCategoryEnum.PRIVACY
  },
  {
    name: '允许查看我的文章(个人中心)',
    key: 'allowViewMyArticle',
    default: true,
    category: UserSettingsCategoryEnum.PRIVACY
  },
  {
    name: '评论我的内容时',
    key: 'whenCommentMyContent',
    default: true,
    category: UserSettingsCategoryEnum.NOTICE
  },
  {
    name: '回复我的评论时',
    key: 'whenReplyMyComment',
    default: true,
    category: UserSettingsCategoryEnum.NOTICE
  },
  {
    name: '点赞我的内容时',
    key: 'whenLikeMyContent',
    default: true,
    category: UserSettingsCategoryEnum.NOTICE
  },
  {
    name: '收藏我的文章时',
    key: 'whenCollectMyContent',
    default: true,
    category: UserSettingsCategoryEnum.NOTICE
  },
  {
    name: '关注我时',
    key: 'whenFollowMe',
    default: true,
    category: UserSettingsCategoryEnum.NOTICE
  }
]