export function getScrollInfo(id: string): { scrollHeight: number, scrollTop: number, clientHeight: number } {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`Element with id ${id} not found`)
  }
  return {
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
    clientHeight: element.clientHeight
  }
}

export function getBoundingClientRect(id: string): DOMRect {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`Element with id ${id} not found`)
  }
  return element.getBoundingClientRect()
}
