<script setup>
defineProps({
  icon: { type: String, required: true },
})
</script>

<template>
  <svg v-if="icon === 'grid'" class="h-4.5 w-4.5 shrink-0" viewBox="0 0 20 20" fill="none">
    <rect x="3" y="3" width="6" height="6" rx="1.3" stroke="currentColor" stroke-width="1.5" />
    <rect x="11" y="3" width="6" height="6" rx="1.3" stroke="currentColor" stroke-width="1.5" />
    <rect x="3" y="11" width="6" height="6" rx="1.3" stroke="currentColor" stroke-width="1.5" />
    <rect x="11" y="11" width="6" height="6" rx="1.3" stroke="currentColor" stroke-width="1.5" />
  </svg>
  <svg v-else-if="icon === 'doc'" class="h-4.5 w-4.5 shrink-0" viewBox="0 0 20 20" fill="none">
    <rect x="4" y="2.5" width="12" height="15" rx="1.5" stroke="currentColor" stroke-width="1.5" />
    <path d="M7 7h6M7 10.2h6M7 13.4h3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
  <svg v-else-if="icon === 'review'" class="h-4.5 w-4.5 shrink-0" viewBox="0 0 20 20" fill="none">
    <rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.5" />
    <path d="M7 8.2l1.8 1.8L11 7.5M7 13h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <svg v-else-if="icon === 'pin'" class="h-4.5 w-4.5 shrink-0" viewBox="0 0 20 20" fill="none">
    <path d="M10 18s6-5.1 6-9.7A6 6 0 0 0 4 8.3C4 12.9 10 18 10 18Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <circle cx="10" cy="8.3" r="2" stroke="currentColor" stroke-width="1.5" />
  </svg>
  <svg v-else-if="icon === 'users'" class="h-4.5 w-4.5 shrink-0" viewBox="0 0 20 20" fill="none">
    <circle cx="7.2" cy="6.8" r="2.4" stroke="currentColor" stroke-width="1.5" />
    <circle cx="14.3" cy="8.3" r="1.9" stroke="currentColor" stroke-width="1.5" />
    <path d="M2.5 16c.4-3 2.3-4.6 4.7-4.6s4.3 1.6 4.7 4.6M12.7 16c.3-2.1 1.5-3.5 3.1-3.5s2.6 1.4 2.7 3.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
