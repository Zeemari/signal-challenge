<script setup>
import { freshnessOf, formatRelative } from '../lib/time.js'

const props = defineProps({
  timestamp: { type: String, required: true },
})

const fresh = freshnessOf(props.timestamp)
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-xs font-medium" :style="{ color: fresh.color }">
    <span class="relative inline-flex h-2 w-2 shrink-0">
      <span
        v-if="fresh.level === 'recent'"
        class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
        :style="{ backgroundColor: fresh.color }"
      ></span>
      <span class="relative inline-flex h-2 w-2 rounded-full" :style="{ backgroundColor: fresh.color }"></span>
    </span>
    <span>{{ fresh.label }} · {{ formatRelative(props.timestamp) }}</span>
  </span>
</template>
