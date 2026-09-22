<script setup>
import { formatClock } from '../lib/time.js'

defineProps({
  items: { type: Array, default: () => [] },
  lastUpdated: { type: String, required: true },
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <h4 class="text-sm font-semibold text-slate-900 mb-2">Why this signal?</h4>
    <ul class="space-y-1.5">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="flex items-start gap-2 text-sm"
        :class="item.type === 'warning' ? 'text-amber-700' : 'text-slate-700'"
      >
        <span aria-hidden="true">{{ item.type === 'warning' ? '⚠' : '✓' }}</span>
        <span>{{ item.text }}</span>
      </li>
    </ul>
    <p class="mt-3 text-xs text-slate-500">Last updated: {{ formatClock(lastUpdated) }}</p>
  </div>
</template>
