<script setup>
import { RouterLink } from 'vue-router'
import StatusPill from './StatusPill.vue'
import FreshnessBadge from './FreshnessBadge.vue'
import { STATUS_META } from '../lib/sources.js'

const props = defineProps({
  signal: { type: Object, required: true },
  reportCount: { type: Number, default: 0 },
})
</script>

<template>
  <RouterLink
    :to="{ name: 'signal-detail', params: { id: signal.id } }"
    class="group relative block overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-4 pl-5 shadow-sm backdrop-blur transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99]"
  >
    <span
      class="absolute inset-y-0 left-0 w-1.5"
      :style="{ backgroundColor: (STATUS_META[signal.status] ?? STATUS_META.unconfirmed).dot }"
    ></span>

    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate text-[15px] font-bold text-slate-900">{{ signal.title }}</h3>
        <p class="mt-0.5 text-sm text-slate-500">
          {{ reportCount }} report{{ reportCount === 1 ? '' : 's' }}
        </p>
      </div>
      <StatusPill :status="signal.status" />
    </div>

    <div class="mt-3 flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <FreshnessBadge :timestamp="signal.last_updated" />
        <span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          <svg class="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="none">
            <path d="M10 2.5 18 16.5H2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
            <path d="M10 8v3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <circle cx="10" cy="14" r="0.9" fill="currentColor" />
          </svg>
          Apply caution
        </span>
      </div>
      <svg
        class="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-400"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
  </RouterLink>
</template>
