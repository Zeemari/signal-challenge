<script setup>
import { ref } from 'vue'
import { authState, signOut } from '../lib/auth.js'
import { useRouter } from 'vue-router'

defineProps({
  initials: { type: String, required: true },
})

const router = useRouter()
const open = ref(false)

async function handleSignOut() {
  open.value = false
  await signOut()
  router.push('/login')
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      @click="open = !open"
      class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white transition-transform hover:scale-105"
      style="background-color: var(--color-brand-500)"
      aria-label="Account menu"
    >
      {{ initials }}
    </button>

    <div v-if="open" class="fixed inset-0 z-30" @click="open = false" />
    <div
      v-show="open"
      class="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <div class="border-b border-slate-100 px-4 py-3">
        <p class="truncate text-sm font-semibold text-slate-900">{{ authState.profile?.display_name || authState.user?.email }}</p>
        <p class="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{{ authState.profile?.role }}</p>
      </div>
      <button
        type="button"
        @click="handleSignOut"
        class="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        Sign out
      </button>
    </div>
  </div>
</template>
