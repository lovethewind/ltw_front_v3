import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'
import { getToken, SendTokenKey } from '@/utils/auth'
import router from '@/router'
import { ErrorCode } from '@/enums'
import { ElMessage } from 'element-plus'


// 创建一个 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 0 // 请求超时时间
})

// 请求拦截器
service.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 在发送请求之前做一些事情
    const token = getToken()
    if (token) {
      // 让每个请求携带 token
      // ['X-Token'] 是自定义 header 的 key
      // 请根据实际情况修改
      config.headers[SendTokenKey] = token
    }
    return config
  },
  (error: any) => {
    // 处理请求错误
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<any>) => {
    const res = response.data
    // 如果自定义状态码不是 200，则认为是错误
    if (res.code !== 200) {
      if (res.code === ErrorCode.DATA_NOT_EXISTS) {
        router.push('/404').then(() => {
        })
      }
      ElMessage({
        message: res.message || res.code,
        type: 'error',
        plain: true
      })
      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      return res
    }
  },
  (error: any) => {
    console.log('err' + error) // 用于调试
    if (error.response && error.response.status === 404) {
      router.push('/404').then(() => {
      })
    }
    return Promise.reject(error)
  }
)

export default service
