import { DirectiveBinding } from 'vue'

const clickOutside = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const handler = (event: MouseEvent) => {
      if (!el.contains(event.target)) {
        binding.value(event)
      }
    }
    el.__clickOutside__ = handler
    document.addEventListener('click', handler)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', el.__clickOutside__)
    delete el.__clickOutside__
  }
}

export default clickOutside
