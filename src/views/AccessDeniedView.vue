<script setup>
import { RouterLink } from 'vue-router'
import { authState } from '../lib/auth.js'
</script>

<template>
  <div class="mx-auto max-w-md py-12 text-center">
    <div class="rounded-3xl border border-red-200/80 bg-white p-8 shadow-sm">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>

      <h1 class="mt-5 text-2xl font-bold tracking-tight text-slate-900">Access denied</h1>
      <p class="mt-2.5 text-sm leading-relaxed text-slate-600">
        Public users do not have permission to access the administration page.
      </p>

      <div class="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <RouterLink
          v-if="!authState.user"
          to="/login"
          class="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
          style="background-color: var(--color-brand-600)"
        >
          Sign in
        </RouterLink>
        <RouterLink
          to="/"
          class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to signals
        </RouterLink>
      </div>
    </div>
  </div>
</template>
