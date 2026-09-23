<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { authState, hasPermission, hasRole, signOut } from './lib/auth.js'
import { navLoading } from './lib/navLoading.js'
import SignalMark from './components/SignalMark.vue'
import NotificationBell from './components/NotificationBell.vue'
import NavIcon from './components/NavIcon.vue'
import FloatingActions from './components/FloatingActions.vue'

const route = useRoute()
const router = useRouter()
const canReview = computed(() => hasPermission('reports:read:all'))
const canManageUsers = computed(() => hasPermission('users:manage'))
const isAdmin = computed(() => hasRole('admin'))
const pageTitle = computed(() => route.meta.title || 'SIGNAL')

const adminNavItems = computed(() => [
  { to: '/', label: 'Signals', show: true, icon: 'grid' },
  { to: '/my-reports', label: 'Reports', show: !!authState.user, icon: 'doc' },
  { to: '/responder', label: 'Responder', show: canReview.value, icon: 'review' },
  { to: '/admin/locations', label: 'Locations', show: canManageUsers.value, icon: 'pin' },
  { to: '/admin/users', label: 'Users', show: canManageUsers.value, icon: 'users' },
])

const publicNavItems = computed(() => [
  { to: '/', label: 'Signals', show: true },
  { to: '/my-reports', label: 'Reports', show: !!authState.user },
  { to: '/responder', label: 'Responder', show: canReview.value },
])

const initials = computed(() => {
  const name = (authState.profile?.display_name || authState.user?.email || '').trim()
  if (!name) return '?'
  const parts = name.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

async function handleSignOut() {
  await signOut()
  router.push('/login')
}

const mobileMenuOpen = ref(false)
watch(() => route.fullPath, () => { mobileMenuOpen.value = false })
</script>

<template>
  <!-- ============ Bare shell: auth pages, no chrome ============ -->
  <RouterView v-if="route.meta.bare" />

  <!-- ============ Admin shell: sidebar ============ -->
  <div v-else-if="isAdmin" class="flex min-h-screen">
    <div v-show="navLoading" class="fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent">
      <div class="h-full w-1/3" style="background-color: var(--color-brand-500); animation: nav-loading-bar 0.9s ease-in-out infinite" />
    </div>

    <aside class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
      <RouterLink to="/" class="flex items-center gap-2.5 px-1">
        <SignalMark class="h-9 w-9" />
        <span class="flex flex-col leading-none">
          <span class="text-base font-extrabold tracking-tight text-slate-900">SIGNAL</span>
          <span class="text-[11px] font-medium text-slate-500">Administration</span>
        </span>
      </RouterLink>

      <p class="mb-2 mt-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Menu</p>
      <nav class="flex flex-1 flex-col gap-0.5 text-sm font-medium">
        <RouterLink
          v-for="item in adminNavItems.filter((i) => i.show)"
          :key="item.to"
          :to="item.to"
          data-nav
          class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <NavIcon :icon="item.icon" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="mt-3 border-t border-slate-100 pt-3">
        <div class="mb-1 flex items-center gap-2.5 rounded-xl px-2 py-2">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style="background-color: var(--color-brand-500)">
            {{ initials }}
          </span>
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold text-slate-800">{{ authState.profile?.display_name || authState.user?.email }}</p>
            <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{{ authState.profile?.role }}</p>
          </div>
        </div>
        <button type="button" @click="handleSignOut" class="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
          Sign out
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex min-w-0 items-center gap-2.5 lg:hidden">
          <RouterLink to="/" class="flex items-center gap-2">
            <SignalMark class="h-8 w-8" />
            <span class="text-base font-extrabold tracking-tight text-slate-900">SIGNAL</span>
          </RouterLink>
        </div>
        <h1 class="hidden truncate text-base font-bold text-slate-900 lg:block">{{ pageTitle }}</h1>
        <div class="flex shrink-0 items-center gap-1.5">
          <NotificationBell :can-review="canReview" />
          <button type="button" @click="mobileMenuOpen = true" class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 lg:hidden" aria-label="Open menu">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <div v-if="mobileMenuOpen" class="fixed inset-0 z-40 lg:hidden">
        <div class="absolute inset-0 bg-slate-900/40" @click="mobileMenuOpen = false" />
        <div class="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-white p-5 shadow-xl">
          <div class="mb-6 flex items-center justify-between">
            <RouterLink to="/" class="flex items-center gap-2.5" @click="mobileMenuOpen = false">
              <SignalMark class="h-8 w-8" />
              <span class="text-base font-extrabold tracking-tight text-slate-900">SIGNAL</span>
            </RouterLink>
            <button type="button" @click="mobileMenuOpen = false" class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="Close menu">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </button>
          </div>
          <nav class="flex flex-1 flex-col gap-0.5 text-sm font-medium">
            <RouterLink
              v-for="item in adminNavItems.filter((i) => i.show)"
              :key="item.to"
              :to="item.to"
              data-nav
              class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <NavIcon :icon="item.icon" />
              {{ item.label }}
            </RouterLink>
          </nav>
          <div class="border-t border-slate-100 pt-3">
            <button type="button" @click="handleSignOut" class="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              Sign out
            </button>
          </div>
        </div>
      </div>

      <main class="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <RouterView />
      </main>

      <footer class="px-4 pb-24 sm:px-6 lg:px-8">
        <p class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-500">
          SIGNAL organizes community reports and does not independently verify every report.
          Use trusted local authorities and your own judgment for urgent safety decisions.
        </p>
      </footer>
    </div>

    <FloatingActions />
  </div>

  <!-- ============ Public shell: citizen + responder, top nav, no sidebar ============ -->
  <div v-else class="flex min-h-screen flex-col">
    <div v-show="navLoading" class="fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent">
      <div class="h-full w-1/3" style="background-color: var(--color-brand-500); animation: nav-loading-bar 0.9s ease-in-out infinite" />
    </div>

    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div class="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <RouterLink to="/" class="flex shrink-0 items-center gap-2.5">
          <SignalMark class="h-9 w-9" />
          <span class="hidden flex-col leading-none sm:flex">
            <span class="text-base font-extrabold tracking-tight text-slate-900">SIGNAL</span>
            <span class="text-[11px] font-medium text-slate-500">Know what's known</span>
          </span>
        </RouterLink>

        <nav class="hidden items-center gap-1 text-sm font-medium sm:flex">
          <RouterLink
            v-for="item in publicNavItems.filter((i) => i.show)"
            :key="item.to"
            :to="item.to"
            data-nav
            class="rounded-full px-3.5 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="flex shrink-0 items-center gap-1.5">
          <NotificationBell :can-review="canReview" />
          <template v-if="authState.user">
            <span class="hidden h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white sm:flex" style="background-color: var(--color-brand-500)">
              {{ initials }}
            </span>
            <button type="button" @click="handleSignOut" class="rounded-full px-3.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
              Sign out
            </button>
          </template>
          <RouterLink v-else to="/login" class="rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
            Sign in
          </RouterLink>
          <button type="button" @click="mobileMenuOpen = true" class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 sm:hidden" aria-label="Open menu">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile nav drawer -->
    <div v-if="mobileMenuOpen" class="fixed inset-0 z-40 sm:hidden">
      <div class="absolute inset-0 bg-slate-900/40" @click="mobileMenuOpen = false" />
      <div class="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-white p-5 shadow-xl">
        <div class="mb-6 flex items-center justify-between">
          <RouterLink to="/" class="flex items-center gap-2.5" @click="mobileMenuOpen = false">
            <SignalMark class="h-8 w-8" />
            <span class="text-base font-extrabold tracking-tight text-slate-900">SIGNAL</span>
          </RouterLink>
          <button type="button" @click="mobileMenuOpen = false" class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="Close menu">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <nav class="flex flex-1 flex-col gap-0.5 text-sm font-medium">
          <RouterLink
            v-for="item in publicNavItems.filter((i) => i.show)"
            :key="item.to"
            :to="item.to"
            data-nav
            class="rounded-xl px-3 py-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
        <div class="border-t border-slate-100 pt-3">
          <RouterLink v-if="!authState.user" to="/login" class="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            Sign in
          </RouterLink>
          <button v-else type="button" @click="handleSignOut" class="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            Sign out
          </button>
        </div>
      </div>
    </div>

    <main class="w-full flex-1 px-4 py-6 sm:px-6 lg:px-10">
      <RouterView />
    </main>

    <footer class="px-4 pb-24 sm:px-6 lg:px-10">
      <p class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-500">
        SIGNAL organizes community reports and does not independently verify every report.
        Use trusted local authorities and your own judgment for urgent safety decisions.
      </p>
    </footer>

    <FloatingActions />
  </div>
</template>
