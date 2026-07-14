/**
 * 从响应头中获取前端版本标识。
 *
 * :param headers: 首页请求的响应头。
 * :return: 优先返回 ETag，没有时返回 Last-Modified，均不存在时返回 null。
 */
export function getVersionTagFromHeaders(headers: Headers): string | null {
  return headers.get('etag') || headers.get('last-modified')
}

/**
 * 判断前端版本是否发生变化。
 *
 * :param lastVersionTag: 上一次记录的版本标识。
 * :param currentVersionTag: 当前请求得到的版本标识。
 * :return: 两个有效版本标识不同时返回 true，否则返回 false。
 */
export function isVersionChanged(
  lastVersionTag: string,
  currentVersionTag: string | null
): boolean {
  return Boolean(lastVersionTag && currentVersionTag && lastVersionTag !== currentVersionTag)
}
