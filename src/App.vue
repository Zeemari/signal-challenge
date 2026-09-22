<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div class="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="flex items-center gap-2.5">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg"
            style="background-color: var(--color-brand-700)"
          >
            <svg class="h-4.5 w-4.5" viewBox="0 0 20 20" fill="none">
              <path d="M5.2 7.2a7.3 7.3 0 0 1 9.6 0" stroke="var(--color-brand-300)" stroke-width="1.4" stroke-linecap="round" opacity="0.6" />
              <path d="M7.1 9.2a4.4 4.4 0 0 1 5.8 0" stroke="var(--color-brand-400)" stroke-width="1.4" stroke-linecap="round" />
              <circle cx="10" cy="12" r="1.6" fill="var(--color-brand-50)" />
            </svg>
          </span>
          <span class="flex flex-col leading-none">
            <span class="text-base font-bold tracking-tight text-slate-900">SIGNAL</span>
            <span class="hidden text-[11px] font-medium text-slate-400 sm:inline">Know what's known</span>
          </span>
        </RouterLink>

        <nav class="flex items-center gap-1 text-sm font-medium">
          <RouterLink
            to="/"
            data-nav
            class="rounded-lg px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Signals
          </RouterLink>
          <RouterLink
            to="/ask"
            data-nav
            class="rounded-lg px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Ask SIGNAL
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="w-full flex-1 px-4 py-6">
      <div class="mx-auto w-full max-w-2xl">
        <RouterView />
      </div>
    </main>

    <footer class="border-t border-slate-200 bg-white">
      <p class="mx-auto max-w-2xl px-4 py-4 text-xs leading-relaxed text-slate-500">
        SIGNAL organizes community reports and does not independently verify every report.
        Use trusted local authorities and your own judgment for urgent safety decisions.
      </p>
    </footer>

    <RouterLink
      to="/report"
      class="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-lg shadow-brand-900/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style="background-color: var(--color-brand-500)"
    >
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
        <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      Report Something
    </RouterLink>
  </div>
</template>
