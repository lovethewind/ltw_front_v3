import Cookies from 'js-cookie'

const title = '心悦心享小站'

export function getPageTitle(pageTitle: string) {
  const realTitle = Cookies.get('title') || title
  if (pageTitle) {
    return `${pageTitle} - ${realTitle}`
  }
  return `${realTitle} - 每一天都是好心情`
}
