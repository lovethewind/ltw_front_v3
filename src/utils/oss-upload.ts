/**
 * OSS上传
 * @type {string}
 */
import axios from 'axios'
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios'

declare interface UploadSignatureResp {
  uploadUrl: string
  url: string
  contentType: string
  contentDisposition: string
}

/**
 * 上传文件到 OSS。
 *
 * :param resp: 后端返回的 OSS 上传签名信息。
 * :param file: 待上传文件。
 * :param onProgress: 上传进度回调。
 * :return: 上传后用于保存或展示的完整文件地址。
 */
export async function uploadFile(
  resp: UploadSignatureResp,
  file: File,
  onProgress?: (progressEvent: AxiosProgressEvent) => void
) {
  const requestConfig: AxiosRequestConfig = {
    headers: {
      'Content-Type': resp.contentType,
      'x-oss-forbid-overwrite': 'true',
      'Content-Disposition': resp.contentDisposition
    }
  }
  if (onProgress) {
    requestConfig.onUploadProgress = onProgress
  }
  await axios.put(resp.uploadUrl, file, requestConfig)
  return resp.url
}
