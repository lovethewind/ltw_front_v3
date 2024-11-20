import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import vueDompurifyHTMLPlugin from 'vue-dompurify-html'
import clickOutside from '@/directive'

import App from './App.vue'
import router from './router'

import '@/permission'
import '@/assets/css/main.scss'

const app = createApp(App)

app.use(ElementPlus, {
  locale: zhCn
})
app.use(createPinia())
app.use(router)
app.use(vueDompurifyHTMLPlugin)

app.directive('click-outside', clickOutside)
app.mount('#app')
