import request from '@/utils/request'
import { VerifyCodeTypeEnum } from '@/enums'

const apiName = '/common'

interface IEmailCode {
  email?: string
  code?: string
  codeType: VerifyCodeTypeEnum
}

interface IMobileCode {
  mobile?: string
  code?: string
  codeType: VerifyCodeTypeEnum
}

export interface GithubCommitQuery {
  repo: string
  page?: number
  size?: number
}

export interface GithubCommit {
  message: string
  commit_time: string
  avatar_url: string | null
  html_url: string
  sha: string
  short_sha: string
}

export interface GithubCommitPage {
  repo: string
  branch: string
  page: number
  size: number
  has_next: boolean
  commits: GithubCommit[]
}

export default {
  getEmailCode(data: IEmailCode) {
    return request({
      url: `${apiName}/common/getEmailCode`,
      method: 'post',
      data
    })
  },

  getUserEmailCode(data: IEmailCode) {
    return request({
      url: `${apiName}/getEmailCode`,
      method: 'post',
      data
    })
  },

  getMobileCode(data: IMobileCode) {
    return request({
      url: `${apiName}/common/getMobileCode`,
      method: 'post',
      data
    })
  },

  getUserMobileCode(data: IMobileCode) {
    return request({
      url: `${apiName}/getMobileCode`,
      method: 'post',
      data
    })
  },

  validUserEmailCode(data: IEmailCode) {
    return request({
      url: `${apiName}/validEmailCode`,
      method: 'post',
      data
    })
  },

  validMobileCode(data: IMobileCode) {
    return request({
      url: `${apiName}/common/validMobileCode`,
      method: 'post',
      data
    })
  },

  validUserMobileCode(data: IMobileCode) {
    return request({
      url: `${apiName}/validMobileCode`,
      method: 'post',
      data
    })
  },

  validAccountExists(data: object) {
    return request({
      url: `${apiName}/common/validAccountExists`,
      method: 'post',
      data
    })
  },

  addFeedback(data: object) {
    return request({
      url: `${apiName}/common/addFeedback`,
      method: 'post',
      data
    })
  },
  getWebsiteViewCount() {
    return request({
      url: `${apiName}/common/getWebsiteViewCount`,
      method: 'get'
    })
  },
  addWebsiteViewCount() {
    return request({
      url: `${apiName}/common/addWebsiteViewCount`,
      method: 'get'
    })
  },

  /**
   * 分页获取 GitHub 提交动态。
   *
   * :param params: 仓库名和分页参数。
   * :return: GitHub 提交动态响应。
   */
  getGithubCommits(params: GithubCommitQuery) {
    return request({
      url: `${apiName}/common/getGithubCommits`,
      method: 'get',
      params
    })
  }
}
