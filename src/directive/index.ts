import type { DirectiveBinding } from 'vue'

type ClickOutsideElement = HTMLElement & {
  __clickOutside__?: (event: MouseEvent) => void
}

const clickOutside = {
  mounted(el: ClickOutsideElement, binding: DirectiveBinding) {
    const handler = (event: MouseEvent) => {
      if (!el.contains(event.target as Node | null)) {
        binding.value(event)
      }
    }
    el.__clickOutside__ = handler
    document.addEventListener('click', handler)
  },
  unmounted(el: ClickOutsideElement) {
    if (el.__clickOutside__) {
      document.removeEventListener('click', el.__clickOutside__)
    }
    delete el.__clickOutside__
  }
}

export default clickOutside
