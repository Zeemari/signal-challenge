import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import SubmitReport from './views/SubmitReport.vue'
import SignalDetailView from './views/SignalDetailView.vue'
import AskSignalView from './views/AskSignalView.vue'
import AuthView from './views/AuthView.vue'
import ReportsView from './views/ReportsView.vue'
import ResponderDashboard from './views/ResponderDashboard.vue'
import AdminUsersView from './views/AdminUsersView.vue'
import AdminLocationsView from './views/AdminLocationsView.vue'
import ForbiddenView from './views/ForbiddenView.vue'
import AccessDeniedView from './views/AccessDeniedView.vue'
import { ensureAuth, authState, hasPermission } from './lib/auth.js'
import { navLoading } from './lib/navLoading.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard, meta: { title: 'Signals', wide: true } },
    { path: '/reports', name: 'reports', component: ReportsView, meta: { title: 'Reports', wide: true } },
    { path: '/report', name: 'report', component: SubmitReport, meta: { title: 'Report something' } },
    { path: '/signal/:id', name: 'signal-detail', component: SignalDetailView, props: true, meta: { title: 'Signal' } },
    { path: '/ask', name: 'ask', component: AskSignalView, meta: { title: 'Ask SIGNAL' } },
    { path: '/login', name: 'login', component: AuthView, props: { mode: 'login' }, meta: { title: 'Account access', bare: true } },
    { path: '/signup', name: 'signup', component: AuthView, props: { mode: 'signup' }, meta: { title: 'Account access', bare: true } },
    { path: '/my-reports', name: 'my-reports', component: ReportsView, meta: { permission: 'reports:read:own', title: 'Reports' } },
    { path: '/responder', name: 'responder', component: ResponderDashboard, meta: { permission: 'reports:read:all', title: 'Responder workspace' } },
    { path: '/admin', redirect: '/admin/locations' },
    { path: '/admin/users', name: 'admin-users', component: AdminUsersView, meta: { permission: 'users:manage', title: 'Users' } },
    { path: '/admin/locations', name: 'admin-locations', component: AdminLocationsView, meta: { permission: 'users:manage', title: 'Locations' } },
    { path: '/access-denied', name: 'access-denied', component: AccessDeniedView, meta: { title: 'Access denied' } },
    { path: '/forbidden', name: 'forbidden', component: ForbiddenView, meta: { title: 'Forbidden' } },
  ],
})

router.beforeEach(async (to) => {
  navLoading.value = true
  await ensureAuth()
  if (to.path.startsWith('/admin') || to.meta.permission === 'users:manage') {
    if (!authState.user) return { name: 'login', query: { redirect: to.fullPath } }
    if (!hasPermission('users:manage')) {
      return { name: 'access-denied' }
    }
  }
  if (!to.meta.permission) return true
  if (!authState.user) return { name: 'login', query: { redirect: to.fullPath } }
  if (!hasPermission(to.meta.permission)) return { name: 'forbidden' }
  return true
})

router.afterEach(() => { navLoading.value = false })
router.onError(() => { navLoading.value = false })

export default router
