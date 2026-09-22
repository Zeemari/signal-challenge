<script setup>
import { STATUS_META } from '../lib/sources.js'

const props = defineProps({
  status: { type: String, required: true },
})

const meta = STATUS_META[props.status] ?? STATUS_META.unconfirmed
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
    :style="{ backgroundColor: meta.bg, color: meta.text }"
  >
    <span class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: meta.dot }"></span>
    {{ meta.label }}
  </span>
</template>
