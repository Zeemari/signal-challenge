import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router.js'

const app = createApp(App).use(router)

router.isReady().finally(() => {
  app.mount('#app')
  const preloader = document.getElementById('preloader')
  if (preloader) {
    preloader.classList.add('preloader-hide')
    preloader.addEventListener('transitionend', () => preloader.remove(), { once: true })
  }
})
