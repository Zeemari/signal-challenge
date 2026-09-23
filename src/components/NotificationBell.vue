<script setup>
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { apiFetch } from '../lib/api.js'

const props = defineProps({
  canReview: { type: Boolean, default: false },
})

const open = ref(false)
const pending = ref([])
const loading = ref(false)

async function refresh() {
  if (!props.canReview) {
    pending.value = []
    return
  }
  loading.value = true
  try {
    const data = await apiFetch('/api/admin-locations')
    pending.value = data.pending || []
  } catch {
    pending.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.canReview, refresh, { immediate: true })

function toggle() {
  open.value = !open.value
  if (open.value) refresh()
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      @click="toggle"
      class="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
      aria-label="Notifications"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M5 8a5 5 0 0 1 10 0c0 3.2 1 4.4 1.5 5H3.5C4 12.4 5 11.2 5 8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
        <path d="M8.2 15.5a1.9 1.9 0 0 0 3.6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <span
        v-if="canReview && pending.length"
        class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
        style="background-color: var(--color-status-conflicting)"
      />
    </button>

    <div v-if="open" class="fixed inset-0 z-30" @click="open = false" />
    <div
      v-show="open"
      class="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <div class="border-b border-slate-100 px-4 py-3">
        <p class="text-sm font-bold text-slate-900">Notifications</p>
      </div>
      <div v-if="!canReview || (!loading && !pending.length)" class="px-4 py-8 text-center text-sm text-slate-500">
        You're all caught up.
      </div>
      <div v-else-if="loading" class="px-4 py-8 text-center text-sm text-slate-400">
        Checking…
      </div>
      <RouterLink
        v-else
        to="/responder"
        class="flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50"
        @click="open = false"
      >
        <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
            <path d="M10 18s6-5.1 6-9.7A6 6 0 0 0 4 8.3C4 12.9 10 18 10 18Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
            <circle cx="10" cy="8.3" r="2" stroke="currentColor" stroke-width="1.4" />
          </svg>
        </span>
        <span>
          <span class="block font-semibold text-slate-900">{{ pending.length }} location{{ pending.length === 1 ? '' : 's' }} awaiting review</span>
          <span class="mt-0.5 block text-xs text-slate-500">Community-submitted locations need approval.</span>
        </span>
      </RouterLink>
    </div>
  </div>
</template>
