<script setup>
import { ref } from 'vue'
import AskSignalChat from './AskSignalChat.vue'

const askOpen = ref(false)
</script>

<template>
  <!-- Ask SIGNAL chat launcher -->
  <div class="fixed bottom-5 right-5 z-20">
    <span
      v-if="!askOpen"
      class="absolute inset-0 rounded-full animate-ping"
      style="background-color: var(--color-brand-400); opacity: 0.55"
    />
    <button
      type="button"
      @click="askOpen = !askOpen"
      class="relative flex h-14 items-center gap-2 rounded-full text-white shadow-xl shadow-brand-900/30 transition-transform hover:-translate-y-0.5 hover:scale-105 active:translate-y-0"
      :class="askOpen ? 'w-14 justify-center' : 'pl-4 pr-5'"
      style="background-color: var(--color-brand-500)"
      :aria-label="askOpen ? 'Close Ask SIGNAL chat' : 'Open Ask SIGNAL chat'"
    >
      <template v-if="!askOpen">
        <svg class="h-6 w-6 shrink-0" viewBox="0 0 20 20" fill="none">
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v5A2.5 2.5 0 0 1 14.5 13H9l-3.8 3.2A.6.6 0 0 1 4.2 15.7V13h-.7A2.5 2.5 0 0 1 1 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="text-sm font-semibold">Ask SIGNAL</span>
      </template>
      <svg v-else class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
    </button>
  </div>

  <div
    v-show="askOpen"
    class="fixed bottom-22 right-5 z-20 flex h-[min(32rem,70vh)] w-[min(24rem,88vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
  >
    <AskSignalChat variant="panel" @close="askOpen = false" />
  </div>
</template>
