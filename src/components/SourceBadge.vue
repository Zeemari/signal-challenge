<script setup>
import { sourceLabel, isFirsthand } from '../lib/sources.js'

const props = defineProps({
  sourceType: { type: String, required: true },
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
    :class="isFirsthand(props.sourceType)
      ? 'border-brand-200 bg-brand-50 text-brand-700'
      : 'border-slate-200 bg-slate-50 text-slate-600'"
    :style="isFirsthand(props.sourceType)
      ? { borderColor: 'var(--color-brand-100)', backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }
      : {}"
  >
    {{ sourceLabel(props.sourceType) }}
  </span>
</template>
