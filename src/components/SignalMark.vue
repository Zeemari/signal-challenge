<script setup>
defineProps({
  light: { type: Boolean, default: false },
})
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center rounded-xl"
    :style="{ backgroundColor: light ? 'rgba(255,255,255,0.16)' : 'var(--color-brand-600)' }"
  >
    <svg viewBox="0 0 24 24" fill="none" class="h-[55%] w-[55%]">
      <path
        d="M3 13h3.2l1.8-7 3.6 11 2-6.5 1.4 2.5h3.8"
        stroke="#eef4f2"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </span>
</template>
