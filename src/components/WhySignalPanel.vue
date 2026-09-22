<script setup>
import { formatClock } from '../lib/time.js'

defineProps({
  items: { type: Array, default: () => [] },
  lastUpdated: { type: String, required: true },
})
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-4">
    <h4 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
      <svg class="h-4 w-4 shrink-0" style="color: var(--color-brand-500)" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5" />
        <path d="M10 9v4.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="10" cy="6.7" r="0.9" fill="currentColor" />
      </svg>
      Why this signal?
    </h4>
    <ul class="space-y-2">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="flex items-start gap-2 text-sm"
        :class="item.type === 'warning' ? 'text-amber-700' : 'text-slate-700'"
      >
        <svg
          v-if="item.type === 'warning'"
          class="mt-0.5 h-4 w-4 shrink-0"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M10 2.5 18 16.5H2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
          <path d="M10 8v3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          <circle cx="10" cy="14" r="0.8" fill="currentColor" />
        </svg>
        <svg v-else class="mt-0.5 h-4 w-4 shrink-0" style="color: var(--color-fresh)" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.4" />
          <path d="M6.8 10.2l2.1 2.1 4.3-4.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ item.text }}</span>
      </li>
    </ul>
    <p class="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">Last updated: {{ formatClock(lastUpdated) }}</p>
  </div>
</template>
