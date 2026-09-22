<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div class="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <RouterLink to="/" class="flex items-baseline gap-2">
          <span class="text-lg font-semibold text-brand-700" style="color: var(--color-brand-700)">SIGNAL</span>
          <span class="hidden sm:inline text-xs text-slate-500">Know what's known. See what's fresh.</span>
        </RouterLink>
        <nav class="flex items-center gap-4 text-sm font-medium text-slate-600">
          <RouterLink to="/ask" class="hover:text-slate-900">Ask SIGNAL</RouterLink>
        </nav>
      </div>
    </header>

    <main class="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
      <RouterView />
    </main>

    <footer class="border-t border-slate-200 bg-white">
      <p class="max-w-2xl mx-auto px-4 py-4 text-xs text-slate-500 leading-relaxed">
        SIGNAL organizes community reports and does not independently verify every report.
        Use trusted local authorities and your own judgment for urgent safety decisions.
      </p>
    </footer>

    <RouterLink
      to="/report"
      class="fixed bottom-5 right-5 rounded-full px-5 py-3 text-white text-sm font-semibold shadow-lg"
      style="background-color: var(--color-brand-500)"
    >
      Report Something
    </RouterLink>
  </div>
</template>
