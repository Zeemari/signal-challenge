<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { authState, hasPermission, signOut } from './lib/auth.js'
const canReview = computed(() => hasPermission('reports:read:all'))
const canManageUsers = computed(() => hasPermission('users:manage'))
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-3 z-10 px-3 sm:top-4 sm:px-4">
      <div class="mx-auto flex w-full max-w-2xl items-center justify-between rounded-2xl border border-white/60 bg-white/75 px-4 py-2.5 shadow-lg shadow-black/4 backdrop-blur-xl">
        <RouterLink to="/" class="flex items-center gap-2.5">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
            style="background: linear-gradient(135deg, var(--color-brand-600), var(--color-brand-800))"
          >
            <svg class="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none">
              <path d="M5.2 7.2a7.3 7.3 0 0 1 9.6 0" stroke="var(--color-brand-300)" stroke-width="1.4" stroke-linecap="round" opacity="0.6" />
              <path d="M7.1 9.2a4.4 4.4 0 0 1 5.8 0" stroke="var(--color-brand-400)" stroke-width="1.4" stroke-linecap="round" />
              <circle cx="10" cy="12" r="1.6" fill="var(--color-brand-50)" />
            </svg>
          </span>
          <span class="flex flex-col leading-none">
            <span class="text-base font-extrabold tracking-tight text-slate-900">SIGNAL</span>
            <span class="hidden text-[11px] font-medium text-slate-500 sm:inline">Know what's known</span>
          </span>
        </RouterLink>

        <nav class="flex flex-wrap items-center justify-end gap-1 text-sm font-medium">
          <RouterLink
            to="/"
            data-nav
            class="rounded-full px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
          >
            Signals
          </RouterLink>
          <RouterLink
            to="/ask"
            data-nav
            class="rounded-full px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
          >
            Ask SIGNAL
          </RouterLink>
          <RouterLink v-if="authState.user" to="/my-reports" class="hidden rounded-full px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 sm:inline-block">My reports</RouterLink>
          <RouterLink v-if="canReview" to="/responder" class="hidden rounded-full px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 sm:inline-block">Responder</RouterLink>
          <RouterLink v-if="canManageUsers" to="/admin/locations" class="hidden rounded-full px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 sm:inline-block">Locations</RouterLink>
          <RouterLink v-if="canManageUsers" to="/admin/users" class="hidden rounded-full px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 sm:inline-block">Users</RouterLink>
          <RouterLink v-if="!authState.user" to="/login" class="rounded-full px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900">Sign in</RouterLink>
          <button v-else type="button" @click="signOut" class="rounded-full px-2.5 py-1.5 text-slate-500 transition-colors hover:bg-white hover:text-slate-900">Sign out</button>
        </nav>
      </div>
      <nav v-if="authState.user" class="mx-auto mt-1.5 flex w-full max-w-2xl flex-wrap gap-1 px-1 text-xs font-medium sm:hidden">
        <RouterLink to="/my-reports" class="rounded-full bg-white/60 px-2.5 py-1 text-slate-600 backdrop-blur">My reports</RouterLink>
        <RouterLink v-if="canReview" to="/responder" class="rounded-full bg-white/60 px-2.5 py-1 text-slate-600 backdrop-blur">Responder</RouterLink>
        <RouterLink v-if="canManageUsers" to="/admin/locations" class="rounded-full bg-white/60 px-2.5 py-1 text-slate-600 backdrop-blur">Locations</RouterLink>
        <RouterLink v-if="canManageUsers" to="/admin/users" class="rounded-full bg-white/60 px-2.5 py-1 text-slate-600 backdrop-blur">Users</RouterLink>
      </nav>
    </header>

    <main class="w-full flex-1 px-4 py-6">
      <div class="mx-auto w-full max-w-2xl">
        <RouterView />
      </div>
    </main>

    <footer class="px-4 pb-6">
      <p class="mx-auto max-w-2xl rounded-2xl border border-white/60 bg-white/60 px-4 py-3.5 text-xs leading-relaxed text-slate-500 backdrop-blur">
        SIGNAL organizes community reports and does not independently verify every report.
        Use trusted local authorities and your own judgment for urgent safety decisions.
      </p>
    </footer>

    <RouterLink
      to="/report"
      class="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-xl shadow-brand-900/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style="background: linear-gradient(135deg, var(--color-brand-400), var(--color-brand-600))"
    >
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
        <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      Report Something
    </RouterLink>
  </div>
</template>
