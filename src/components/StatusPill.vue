<script setup>
import { STATUS_META } from '../lib/sources.js'

const props = defineProps({
  status: { type: String, required: true },
})

const meta = STATUS_META[props.status] ?? STATUS_META.unconfirmed
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white"
    :style="{ backgroundColor: meta.color }"
  >
    {{ meta.label }}
  </span>
</template>
