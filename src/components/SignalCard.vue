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
    class="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pl-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
  >
    <span
      class="absolute inset-y-0 left-0 w-1"
      :style="{ backgroundColor: (STATUS_META[signal.status] ?? STATUS_META.unconfirmed).dot }"
    ></span>

    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate font-semibold text-slate-900">{{ signal.title }}</h3>
        <p class="mt-0.5 text-sm text-slate-500">
          {{ reportCount }} report{{ reportCount === 1 ? '' : 's' }}
        </p>
      </div>
      <StatusPill :status="signal.status" />
    </div>

    <div class="mt-3 flex items-center justify-between">
      <FreshnessBadge :timestamp="signal.last_updated" />
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
