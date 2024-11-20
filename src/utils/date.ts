function padZero(num: number) {
  return num < 10 ? '0' + num : num
}

/**
 * 转换注册时间
 * @param time
 * @returns {string}
 */
export function formatRegisterTime(time: number) {
  if (!time) {
    return 0 + '天'
  }
  // 转换为毫秒
  time *= time.toString().length === 10 ? 1000 : 1
  const d = new Date(time).getTime()
  const now = Date.now()
  const diff = (now - d) / 1000
  if (diff < 60 * 60 * 24) {
    return Math.ceil(diff / 3600) + '个小时'
  } else if (diff < 60 * 60 * 24 * 30) {
    return Math.ceil(diff / (3600 * 24)) + '天'
  } else if (diff < 60 * 60 * 24 * 30 * 12) {
    return Math.ceil(diff / (60 * 60 * 24 * 30)) + '个月'
  } else {
    const year = Math.ceil(diff / (60 * 60 * 24 * 30 * 12))
    const month = Math.ceil(diff % (60 * 60 * 24 * 30 * 12) / (60 * 60 * 24 * 30))
    return year + '年零' + month + '个月'
  }
}

export function formatTimeToSecond(time: number) {
  if (!time) {
    return 0 + '秒'
  }
  // 转换为毫秒
  time *= time.toString().length === 10 ? 1000 : 1
  const d = new Date(time).getTime()
  const now = Date.now()
  const diff = (now - d) / 1000
  if (diff < 60) {
    return diff + '秒'
  } else if (diff < 60 * 60) {
    return Math.ceil(diff / 60) + '分钟'
  } else if (diff < 60 * 60 * 24) {
    return Math.ceil(diff / 3600) + '个小时'
  } else if (diff < 60 * 60 * 24 * 30) {
    return Math.ceil(diff / (3600 * 24)) + '天'
  } else if (diff < 60 * 60 * 24 * 30 * 12) {
    return Math.ceil(diff / (60 * 60 * 24 * 30)) + '个月'
  } else {
    // 将时间差转换为天数
    const days = Math.floor(diff / (60 * 60 * 24))
    const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60))
    const minutes = Math.floor((diff % (60 * 60)) / 60)
    const seconds = Math.floor(diff % 60)

    // 计算年、月
    const years = Math.floor(days / 365)
    const months = Math.floor((days % 365) / 30)
    const remainingDays = days % 30

    // 格式化输出
    return `${years}年零${months}个月${remainingDays}天${hours}小时${minutes}分${seconds}秒`
  }
}

/**
 * 转为时间为字符串形式 如1秒前 10分钟前
 * @param time
 * @returns {string}
 */
export function covertTimeHowLongAgo(time: number | string) {
  if (typeof time === 'string') {
    time = new Date(time).getTime()
  }
  const formatTime = new Date(time)
  const nowTime = new Date()
  const howLong = (nowTime.getTime() - formatTime.getTime()) / 1000
  let ret = ''
  if (formatTime.getFullYear() < nowTime.getFullYear()) {
    // last year
    ret = formatTime.getFullYear() + '-' + (padZero(formatTime.getMonth() + 1)) + '-' + formatTime.getDate() + ' ' + padZero(formatTime.getHours()) + ':' + padZero(formatTime.getMinutes()) + ''
  } else if (howLong < 2) {
    ret = '刚刚'
  } else if (howLong < 60) {
    // less 1 minute
    ret = Math.ceil(howLong) + '秒前'
  } else if (howLong < 3600) {
    // less 1 hour
    ret = Math.ceil(howLong / 60) + '分钟前'
  } else if (howLong < 3600 * 24) {
    // less 24 hours
    ret = Math.ceil(howLong / 3600) + '小时前'
  } else if (howLong < (3600 * 24 * 30 + 1)) {
    // less a month
    ret = Math.ceil(howLong / 3600 / 24) + '天前'
  } else {
    // now year
    ret = (formatTime.getMonth() + 1) + '月' + formatTime.getDate() + '日 ' + padZero(formatTime.getHours()) + ':' + padZero(formatTime.getMinutes()) + ''
  }
  return ret
}

/**
 * 日期字符串比较
 * @param timeString1
 * @param timeString2
 */
export function dateStringDiff(timeString1: string, timeString2: string) {
  const diff = (new Date(timeString1) - new Date(timeString2)) / 1000
  return Math.abs(diff)
}

export function formatDateToMinute(timeString: string) {
  if (!timeString) return ''
  const time = new Date(timeString)
  const now = new Date()
  if (time.getFullYear() < now.getFullYear()) {
    return minute(timeString)
  }
  if (getDayOfYear(now) - getDayOfYear(time) === 1) {
    return '昨天 ' + getOnlyMinute(timeString)
  }
  if (getDayOfYear(now) > getDayOfYear(time)) {
    return getMonthMinute(timeString)
  }
  return getOnlyMinute(timeString)
}

function getDayOfYear(date: Date) {
  // 创建同一年1月1日的日期对象
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  // 计算两个日期之间的毫秒数差
  const diffInMilliseconds = date - startOfYear
  // 将毫秒数差转换成天数
  // 加1是因为从1月1日算起
  return Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24)) + 1
}

function getMonthMinute(timeString: string) {
  return timeString.slice(5, 16)
}

function getOnlyMinute(timeString: string) {
  return timeString.slice(11, 16)
}

/**
 * 日期字符串取到天
 * @param time
 */
export function date(time: string) {
  return time.slice(0, 10)
}

/**
 * 日期字符串取到分钟
 */
export function minute(time: string) {
  return time.slice(0, 16)
}

/**
 * 获取当前时间 yyyy-mm-dd hh:mm:ss
 */
export function getNow() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const second = now.getSeconds()
  return `${year}-${padZero(month)}-${padZero(day)} ${padZero(hour)}:${padZero(minute)}:${padZero(second)}`
}