<script setup>
import SourceBadge from './SourceBadge.vue'
import FreshnessBadge from './FreshnessBadge.vue'

defineProps({
  report: { type: Object, required: true },
})
</script>

<template>
  <li class="rounded-lg border border-slate-200 bg-white p-3">
    <p class="text-sm text-slate-800">{{ report.content }}</p>
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <SourceBadge :source-type="report.source_type" />
      <FreshnessBadge :timestamp="report.reported_at" />
    </div>
  </li>
</template>
