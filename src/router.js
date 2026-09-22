import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import SubmitReport from './views/SubmitReport.vue'
import SignalDetailView from './views/SignalDetailView.vue'
import AskSignalView from './views/AskSignalView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/report', name: 'report', component: SubmitReport },
    { path: '/signal/:id', name: 'signal-detail', component: SignalDetailView, props: true },
    { path: '/ask', name: 'ask', component: AskSignalView },
  ],
})

export default router
