/**
 * OSS上传
 * @type {string}
 */
import axios from 'axios'

declare interface UploadSignatureResp {
  uploadUrl: string
  url: string
  contentType: string
  contentDisposition: string
}

export async function uploadFile(resp: UploadSignatureResp, file: File, onProgress: CallableFunction) {
  const requestConfig = {
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
