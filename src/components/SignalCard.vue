<script setup>
import { RouterLink } from 'vue-router'
import StatusPill from './StatusPill.vue'
import FreshnessBadge from './FreshnessBadge.vue'

defineProps({
  signal: { type: Object, required: true },
  reportCount: { type: Number, default: 0 },
})
</script>

<template>
  <RouterLink
    :to="{ name: 'signal-detail', params: { id: signal.id } }"
    class="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="font-semibold text-slate-900">{{ signal.title }}</h3>
        <p class="text-sm text-slate-500 mt-0.5">
          {{ reportCount }} report{{ reportCount === 1 ? '' : 's' }}
        </p>
      </div>
      <StatusPill :status="signal.status" />
    </div>
    <div class="mt-3">
      <FreshnessBadge :timestamp="signal.last_updated" />
    </div>
  </RouterLink>
</template>
