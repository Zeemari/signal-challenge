<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { authState, hasPermission, hasRole, signOut } from './lib/auth.js'
import { navLoading } from './lib/navLoading.js'
import SignalMark from './components/SignalMark.vue'
import AskSignalChat from './components/AskSignalChat.vue'
import NotificationBell from './components/NotificationBell.vue'

const route = useRoute()
const canReview = computed(() => hasPermission('reports:read:all'))
const canManageUsers = computed(() => hasPermission('users:manage'))
const isResponder = computed(() => hasRole('responder'))
const pageTitle = computed(() => route.meta.title || 'SIGNAL')
const contentWidthClass = computed(() => (route.meta.wide ? 'max-w-6xl' : 'max-w-2xl'))

const navItems = computed(() => [
  { to: '/', label: 'Signals', show: true },
  { to: '/my-reports', label: 'My reports', show: !!authState.user },
  { to: '/responder', label: 'Responder', show: canReview.value },
  { to: '/admin/locations', label: 'Locations', show: canManageUsers.value },
  { to: '/admin/users', label: 'Users', show: canManageUsers.value },
])

const responderTabs = [
  { to: '/', label: 'Home' },
  { to: '/responder', label: 'Review' },
  { to: '/report', label: 'Report' },
]

const mobileMenuOpen = ref(false)
const askOpen = ref(false)
watch(() => route.fullPath, () => { mobileMenuOpen.value = false })
</script>

<template>
  <!-- ============ Responder shell: mobile-first, bottom tab nav, no sidebar ============ -->
  <div v-if="isResponder" class="flex min-h-screen flex-col">
    <div v-show="navLoading" class="fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent">
      <div class="h-full w-1/3" style="background-color: var(--color-brand-500); animation: nav-loading-bar 0.9s ease-in-out infinite" />
    </div>

    <header class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <RouterLink to="/" class="flex items-center gap-2">
        <SignalMark class="h-8 w-8" />
        <span class="flex flex-col leading-none">
          <span class="text-base font-extrabold tracking-tight text-slate-900">SIGNAL</span>
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Responder</span>
        </span>
      </RouterLink>
      <div class="flex items-center gap-1.5">
        <NotificationBell :can-review="true" />
        <button
          type="button"
          @click="signOut"
          class="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Sign out"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
            <path d="M8 4.5H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M13 13.5l3.5-3.5-3.5-3.5M16 10H7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </header>

    <main class="w-full flex-1 px-4 pb-28 pt-5">
      <div class="mx-auto w-full max-w-2xl">
        <RouterView />
      </div>
    </main>

    <!-- Bottom tab bar -->
    <nav class="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <RouterLink
        v-for="tab in responderTabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors"
        :class="route.path === tab.to ? '' : 'text-slate-400'"
        :style="route.path === tab.to ? 'color: var(--color-brand-600)' : ''"
      >
        <svg v-if="tab.label === 'Home'" class="h-5 w-5" viewBox="0 0 20 20" fill="none">
          <path d="M3 9l7-6 7 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4.5 8v7a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else-if="tab.label === 'Review'" class="h-5 w-5" viewBox="0 0 20 20" fill="none">
          <rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.6" />
          <path d="M7 8.2l1.8 1.8L11 7.5M7 13h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else class="h-5 w-5" viewBox="0 0 20 20" fill="none">
          <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        {{ tab.label }}
      </RouterLink>
    </nav>

    <!-- Floating: AI chat bot (primary spot) -->
    <button
      type="button"
      @click="askOpen = !askOpen"
      class="fixed bottom-24 right-5 z-20 flex h-13 w-13 items-center justify-center rounded-full text-white shadow-xl shadow-brand-900/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style="background-color: var(--color-brand-600)"
      :aria-label="askOpen ? 'Close Ask SIGNAL chat' : 'Open Ask SIGNAL chat'"
    >
      <svg v-if="!askOpen" class="h-5.5 w-5.5" viewBox="0 0 20 20" fill="none">
        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v5A2.5 2.5 0 0 1 14.5 13H9l-3.8 3.2A.6.6 0 0 1 4.2 15.7V13h-.7A2.5 2.5 0 0 1 1 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg v-else class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
    </button>
    <div
      v-show="askOpen"
      class="fixed bottom-40 right-5 z-20 flex h-[min(28rem,60vh)] w-[min(24rem,88vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
    >
      <AskSignalChat variant="panel" @close="askOpen = false" />
    </div>
  </div>

  <!-- ============ Default shell (citizen / admin): sidebar ============ -->
  <div v-else class="flex min-h-screen">
    <div v-show="navLoading" class="fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent">
      <div class="h-full w-1/3" style="background-color: var(--color-brand-500); animation: nav-loading-bar 0.9s ease-in-out infinite" />
    </div>

    <!-- Desktop sidebar -->
    <aside class="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
      <RouterLink to="/" class="flex items-center gap-2.5 px-1">
        <SignalMark class="h-9 w-9" />
        <span class="flex flex-col leading-none">
          <span class="text-base font-extrabold tracking-tight text-slate-900">SIGNAL</span>
          <span class="text-[11px] font-medium text-slate-500">Know what's known</span>
        </span>
      </RouterLink>

      <nav class="mt-7 flex flex-1 flex-col gap-1 text-sm font-medium">
        <RouterLink
          v-for="item in navItems.filter((i) => i.show)"
          :key="item.to"
          :to="item.to"
          data-nav
          class="rounded-xl px-3 py-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="border-t border-slate-100 pt-3">
        <RouterLink v-if="!authState.user" to="/login" class="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
          Sign in
        </RouterLink>
        <button v-else type="button" @click="signOut" class="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
          Sign out
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Header (all breakpoints) -->
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
          <button
            type="button"
            @click="mobileMenuOpen = true"
            class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Mobile drawer -->
      <div v-if="mobileMenuOpen" class="fixed inset-0 z-40 lg:hidden">
        <div class="absolute inset-0 bg-slate-900/40" @click="mobileMenuOpen = false" />
        <div class="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-white p-5 shadow-xl">
          <div class="mb-6 flex items-center justify-between">
            <RouterLink to="/" class="flex items-center gap-2.5" @click="mobileMenuOpen = false">
              <SignalMark class="h-8 w-8" />
              <span class="text-base font-extrabold tracking-tight text-slate-900">SIGNAL</span>
            </RouterLink>
            <button
              type="button"
              @click="mobileMenuOpen = false"
              class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close menu"
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <nav class="flex flex-1 flex-col gap-1 text-sm font-medium">
            <RouterLink
              v-for="item in navItems.filter((i) => i.show)"
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
            <button v-else type="button" @click="signOut" class="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              Sign out
            </button>
          </div>
        </div>
      </div>

      <main class="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full transition-[max-width]" :class="contentWidthClass">
          <RouterView />
        </div>
      </main>

      <footer class="px-4 pb-6 sm:px-6 lg:px-8">
        <p class="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-500">
          SIGNAL organizes community reports and does not independently verify every report.
          Use trusted local authorities and your own judgment for urgent safety decisions.
        </p>
      </footer>
    </div>

    <!-- Floating: AI chat bot (primary spot, bottom-right) -->
    <button
      type="button"
      @click="askOpen = !askOpen"
      class="fixed bottom-5 right-5 z-20 flex h-13 w-13 items-center justify-center rounded-full text-white shadow-xl shadow-brand-900/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style="background-color: var(--color-brand-600)"
      :aria-label="askOpen ? 'Close Ask SIGNAL chat' : 'Open Ask SIGNAL chat'"
    >
      <svg v-if="!askOpen" class="h-5.5 w-5.5" viewBox="0 0 20 20" fill="none">
        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v5A2.5 2.5 0 0 1 14.5 13H9l-3.8 3.2A.6.6 0 0 1 4.2 15.7V13h-.7A2.5 2.5 0 0 1 1 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg v-else class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
    </button>

    <!-- Floating: report something (stacked above the chat bot) -->
    <RouterLink
      to="/report"
      class="fixed bottom-24 right-5 z-20 flex items-center gap-2 rounded-full py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-xl shadow-brand-900/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style="background-color: var(--color-brand-500)"
    >
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
        <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      Report Something
    </RouterLink>

    <div
      v-show="askOpen"
      class="fixed bottom-22 right-5 z-20 flex h-[min(32rem,70vh)] w-[min(24rem,88vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
    >
      <AskSignalChat variant="panel" @close="askOpen = false" />
    </div>
  </div>
</template>
