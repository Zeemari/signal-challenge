<script setup>
import { freshnessOf, formatRelative } from '../lib/time.js'

const props = defineProps({
  timestamp: { type: String, required: true },
})

const fresh = freshnessOf(props.timestamp)
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-xs font-medium" :style="{ color: fresh.color }">
    <span aria-hidden="true">{{ fresh.dot }}</span>
    <span>{{ fresh.label }} · {{ formatRelative(props.timestamp) }}</span>
  </span>
</template>
