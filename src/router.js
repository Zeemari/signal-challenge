import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import SubmitReport from './views/SubmitReport.vue'
import SignalDetailView from './views/SignalDetailView.vue'
import AskSignalView from './views/AskSignalView.vue'
import AuthView from './views/AuthView.vue'
import MyReportsView from './views/MyReportsView.vue'
import ResponderDashboard from './views/ResponderDashboard.vue'
import AdminUsersView from './views/AdminUsersView.vue'
import AdminLocationsView from './views/AdminLocationsView.vue'
import ForbiddenView from './views/ForbiddenView.vue'
import AccessDeniedView from './views/AccessDeniedView.vue'
import { ensureAuth, authState, hasPermission } from './lib/auth.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/report', name: 'report', component: SubmitReport },
    { path: '/signal/:id', name: 'signal-detail', component: SignalDetailView, props: true },
    { path: '/ask', name: 'ask', component: AskSignalView },
    { path: '/login', name: 'login', component: AuthView, props: { mode: 'login' } },
    { path: '/signup', name: 'signup', component: AuthView, props: { mode: 'signup' } },
    { path: '/my-reports', name: 'my-reports', component: MyReportsView, meta: { permission: 'reports:read:own' } },
    { path: '/responder', name: 'responder', component: ResponderDashboard, meta: { permission: 'reports:read:all' } },
    { path: '/admin', redirect: '/admin/locations' },
    { path: '/admin/users', name: 'admin-users', component: AdminUsersView, meta: { permission: 'users:manage' } },
    { path: '/admin/locations', name: 'admin-locations', component: AdminLocationsView, meta: { permission: 'users:manage' } },
    { path: '/access-denied', name: 'access-denied', component: AccessDeniedView },
    { path: '/forbidden', name: 'forbidden', component: ForbiddenView },
  ],
})

router.beforeEach(async (to) => {
  await ensureAuth()
  if (to.path.startsWith('/admin') || to.meta.permission === 'users:manage') {
    if (!authState.user || !hasPermission('users:manage')) {
      return { name: 'access-denied' }
    }
  }
  if (!to.meta.permission) return true
  if (!authState.user) return { name: 'login', query: { redirect: to.fullPath } }
  if (!hasPermission(to.meta.permission)) return { name: 'forbidden' }
  return true
})

export default router
