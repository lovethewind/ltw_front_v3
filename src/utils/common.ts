import lodash from 'lodash'
import { marked } from 'marked'
import hljs from 'highlight.js'
import { useUserStore } from '@/stores/user'
import { useModalStore } from '@/stores/modal'
import { ElMessage, ElMessageBox } from 'element-plus'
import { h } from 'vue'

/**
 * 生成uuid
 * @param simple 是否去除-
 * @returns {string}
 */
export function uuid(simple = true) {
  const ret = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
  if (simple) {
    return ret.replace(/-/g, '')
  }
  return ret
}

/**
 * 比较两个对象是否相等
 * @param a
 * @param b
 * @returns {boolean}
 */
export function isEqual(a: any, b: any) {
  return lodash.isEqual(a, b)
}

/**
 * 移除formData里和原row相同的值
 * @param formData
 * @param row
 * @returns 新formData
 */
export function removeSameValues(formData: any, row: any) {
  const newFormData: any = {}
  Object.keys(row).forEach(key => {
    if (key === 'id') {
      newFormData[key] = formData[key]
    } else if (!lodash.isEqual(formData[key], row[key])) {
      newFormData[key] = formData[key]
    }
  })
  return newFormData
}

/**
 * 移除对象中的空值
 * @param obj
 */
export function removeEmptyValues(obj: any) {
  const newObj: any = {}
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== '' && obj[key] !== null) {
      newObj[key] = obj[key]
    }
  })
  return newObj
}

/**
 * 获取对象key个数
 * @param obj
 * @returns {number}
 */
export function getObjKeyCount(obj: object) {
  return Object.keys(obj).length
}

/**
 * 将文件转为base64
 * @param file
 * @param callback
 */
export function getBase64(file: File, callback: CallableFunction) {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => callback(reader.result)
}

/**
 * 生成缩略图文件名，保留原始文件名主体并使用 WebP 后缀。
 *
 * :param fileName: 原始文件名。
 * :return: 缩略图文件名。
 */
export function getThumbFileName(fileName: string): string {
  const index = fileName.lastIndexOf('.')
  const name = index > -1 ? fileName.slice(0, index) : fileName
  return `${name}_thumb.webp`
}

/**
 * 在浏览器端压缩图片，优先生成适合列表展示的 WebP 缩略图。
 *
 * :param file: 原始图片文件。
 * :param maxWidth: 缩略图最大宽度。
 * :param quality: WebP 压缩质量。
 * :return: 压缩后的缩略图文件，压缩失败时返回原文件。
 */
export function compressImageFile(file: File, maxWidth = 640, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return Promise.resolve(file)
  }

  return new Promise(resolve => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width)
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(objectUrl)
        resolve(file)
        return
      }

      context.drawImage(image, 0, 0, width, height)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(objectUrl)
        if (!blob) {
          resolve(file)
          return
        }
        resolve(new File([blob], getThumbFileName(file.name), { type: 'image/webp' }))
      }, 'image/webp', quality)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }
    image.src = objectUrl
  })
}

/**
 * 传的组件参数如为数组则返回第一个
 * @param obj
 * @returns {*}
 */
export function getComponentSingle(obj: any) {
  return lodash.isArray(obj) ? obj[0] : obj
}

/**
 * 打乱数组
 * @param list
 */
export function randomSortList(list: any[]) {
  return lodash.shuffle(list)
}


/**
 * 优化展示数量，如1000为1k
 * @param {number} count
 * @returns {string}
 */
export function covertNumberDisplay(count: number) {
  // 异常处理
  if (count < 0) {
    // throw new Error('Invalid input: count cannot be negative') todo
    return count
  }

  let formattedCount
  if (count >= 1000000) {
    formattedCount = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2
    }).format(count / 1000000) + 'm'
  } else if (count >= 1000) {
    formattedCount = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2
    }).format(count / 1000) + 'k'
  } else {
    formattedCount = new Intl.NumberFormat('en-US').format(count)
  }

  return formattedCount
}


/**
 * 删除html标签
 * @param content
 * @returns {*}
 */
export function deleteHTMLTag(content: string) {
  return content
    .replace(/<\/?[^>]*>/g, '')
    .replace(/[|]*\n/, '')
    .replace(/&nbsp;/gi, '')
}

/**
 * 清洗首页文章摘要，移除 Markdown、HTML 和多余空白。
 *
 * :param content: 原始文章内容。
 * :return: 适合列表展示的纯文本摘要。
 */
export function sanitizeArticleSummary(content: string): string {
  const decodedContent = (content || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

  return deleteHTMLTag(decodedContent)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^[\s>]*#{1,6}\s*/gm, '')
    .replace(/^[\s>*+-]+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * highlight.js渲染<pre>代码块
 * @param el
 */
export function highlightCode(el: HTMLElement | null) {
  if (!el) return
  const blocks = el.querySelectorAll('pre code')
  Array.prototype.forEach.call(blocks, (block) => {
    const codeIndex = uuid()
    const str = block.innerHTML
    block.parentElement.className = block.parentElement.className.replace('none', '')
    let lang = ''
    if (block.parentElement.className.lastIndexOf('language-') > -1) {
      lang = block.parentElement.className.slice(block.parentElement.className.lastIndexOf('-') + 1)
    }
    if (!lang && block.className.lastIndexOf('language-') > -1) {
      lang = block.className.slice(block.className.lastIndexOf('-') + 1)
    }
    if (!lang || lang === 'auto') {
      const autoHighlightResult = hljs.highlightAuto(block.innerText)
      lang = autoHighlightResult.language || ''
    }
    block.setAttribute('class', 'language-' + lang)
    // 判断是不是已经是highlight.js的样式了
    const hasStyle = block.hasAttribute('style')
    if (!hasStyle) {
      hljs.highlightElement(block)
    }
    const linesLength = str.replace(/\s+$/g, '').split(/\n/).length
    // 生成行号
    let linesNum = ''
    for (let index = 1; index <= linesLength; index++) {
      linesNum += '<span>' + index + '</span>'
    }
    const copySpan = document.createElement('span')
    copySpan.setAttribute('class', 'copy-btn-span')
    // 复制功能主要使用的是 clipboard.js
    const button = document.createElement('button')
    // button.setAttribute('class', 'copy-btn')
    button.setAttribute('type', 'button')
    button.setAttribute('class', 'copy-btn')
    button.setAttribute('data-clipboard-action', 'copy')
    button.setAttribute('data-clipboard-target', `#copy${codeIndex}`)
    button.innerText = '复制'
    const b = document.createElement('b')
    b.setAttribute('class', 'language-name')
    b.innerText = lang
    copySpan.appendChild(b)
    copySpan.appendChild(button)
    block.parentElement.prepend(copySpan)
    const span = document.createElement('span')
    span.setAttribute('aria-hidden', 'true')
    span.setAttribute('class', 'line-numbers')
    span.innerHTML = linesNum
    block.parentElement.appendChild(span)
    // 将代码包裹在 textarea 中，由于防止textarea渲染出现问题
    const textarea = document.createElement('textarea')
    textarea.setAttribute('style', 'position: absolute;top: -9999px;left: -9999px;z-index: -9999;')
    textarea.setAttribute('id', `copy${codeIndex}`)
    textarea.innerHTML = deleteHTMLTag(str)
    block.parentElement.parentElement.appendChild(textarea)
  })
}

export function markdownToHtml(data: string): string | Promise<string> {
  return marked.parse(data)
}

export function genRandomColor(hslLength = 1) {
  /**
   * HSL颜色值转换为RGB
   * H，S，L 设定在 [0, 1] 之间
   * R，G，B 返回在 [0, 255] 之间
   *
   * @param H 色相
   * @param S 饱和度
   * @param L 亮度
   * @returns Array RGB色值
   */
  function hslToRgb(H: number, S: number, L: number) {
    let R, G, B
    if (+S === 0) {
      R = G = B = L // 饱和度为0 为灰色
    } else {
      const hue2Rgb = function (p: number, q: number, t: number) {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }
      const Q = L < 0.5 ? L * (1 + S) : L + S - L * S
      const P = 2 * L - Q
      R = hue2Rgb(P, Q, H + 1 / 3)
      G = hue2Rgb(P, Q, H)
      B = hue2Rgb(P, Q, H - 1 / 3)
    }
    return [Math.round(R * 255), Math.round(G * 255), Math.round(B * 255)].toString()
  }

  // 获取随机HSL
  function randomHsl() {
    const H = Math.random()
    const S = Math.random()
    const L = Math.random()
    return [H, S, L]
  }

  // 获取HSL数组
  function getHslArray() {
    const HSL = []
    for (let i = 0; i < hslLength; i++) {
      let ret = randomHsl()

      // 颜色相邻颜色差异须大于 0.25
      if (i > 0 && Math.abs(ret[0] - HSL[i - 1][0]) < 0.25) {
        i--
        continue // 重新获取随机色
      }
      ret[1] = 0.7 + (ret[1] * 0.2) // [0.7 - 0.9] 排除过灰颜色
      ret[2] = 0.4 + (ret[2] * 0.4) // [0.4 - 0.8] 排除过亮过暗色

      // 数据转化到小数点后两位
      ret = ret.map(function(item) {
        return parseFloat(item.toFixed(2))
      })

      HSL.push(ret)
    }
    return HSL
  }

  const res: string[] = []
  getHslArray().map(item => {
    res.push(hslToRgb(item[0], item[1], item[2]))
  })
  return res
}

/**
 * 二进制转图片url
 * @param binaryStr
 */
export function binaryStrToImgUrl(binaryStr: string) {
  // 将字符串数据解析为二进制数据
  const binaryData = atob(binaryStr) // 使用 atob 函数将 base64 编码的字符串转换为二进制数据

  // 创建一个 Uint8Array 对象
  const uint8Array = new Uint8Array(binaryData.length)
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i)
  }

  // 创建一个 Blob 对象
  const blob = new Blob([uint8Array], { type: 'image/png' }) // 根据实际数据类型设置 MIME 类型

  // 创建一个包含 Blob 对象的 URL
  return URL.createObjectURL(blob)
}

/**
 * 转换显示文件大小
 * @param size
 * @returns {string}
 */
export function transformSize(size: number) {
  if (size < 1024) { // 如果小于1KB转化成B
    return size.toFixed(2) + 'B'
  } else if (size < 1024 * 1024) { // 如果小于1MB转化成KB
    return (size / 1024).toFixed(2) + 'KB'
  } else if (size < 1024 * 1024 * 1024) { // 如果小于1GB转化成MB
    return (size / (1024 * 1024)).toFixed(2) + 'MB'
  } else { // 其他转化成GB
    return (size / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
  }
}

export function checkIsLogin() {
  const userStore = useUserStore()
  const modalStore = useModalStore()
  if (!userStore.user) {
    modalStore.setLoginFlag(true)
    return false
  }
  return true
}

/**
 * 判断是否是移动端
 */
export function isMobile() {
  const userAgent = navigator.userAgent.toLowerCase()
  const mobileAgents = ['iphone', 'ipad', 'android', 'mobile', 'blackberry', 'webos', 'windows phone', 'phone', 'browser']
  return mobileAgents.some(agent => userAgent.includes(agent))
}

export function toWeb(val: string) {
  ElMessageBox.confirm(
    h('span', [
      '确定要跳转至该网站(',
      h('span', { style: { color: 'red',  whiteSpace: 'pre-wrap', wordBreak: 'break-all'  } }, val),
      ')吗？请注意辨识网站内容是否安全'
    ]),
    '提示', {}).then(() => {
    window.open(val)
  })
}

export function copy(val: string) {
  navigator.clipboard.writeText(val).then(() => {
  })
  ElMessage({
    message: '复制成功',
    type: 'success',
    plain: true
  })
}

/**
 * 检查文件大小
 * @param file File
 * @param size 大小(MB)
 * @param type 类型描述
 */
export function checkFileSize(file: File, size: number, type: string = '图片') {
  // 验证文件类型和大小
  const isLt = file.size / 1024 / 1024 < size
  if (!isLt) {
    ElMessage({
      message: `上传的${type}大小不能超过${size}M`,
      type: 'error',
      plain: true
    })
    return false
  }
  return true
}

export function toWait() {
  ElMessage({
    message: '该功能正在开发中,敬请期待(*^▽^*)',
    type: 'warning',
    plain: true
  })
}

/**
 * 下载文件
 * @param url
 */
export function downloadFile(url: string) {
  ElMessage({
    message: '正在下载，请稍后',
    type: 'info',
    plain: true
  })
  const a = document.createElement('a')
  a.href = url
  // 触发点击事件
  document.body.appendChild(a)
  a.click()
  // 移除元素
  document.body.removeChild(a)
}
