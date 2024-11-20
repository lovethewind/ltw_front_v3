import Cookies from 'js-cookie'

export const TokenKey = 'ltw_web_tk'

export const SendTokenKey = 'web_token'

export function getToken(): string | undefined {
  return Cookies.get(TokenKey)
}

export function setToken(token: string) {
  return Cookies.set(TokenKey, token)
}

export function removeToken() {
  Cookies.remove(TokenKey)
}
