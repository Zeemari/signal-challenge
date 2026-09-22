<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import { freshnessOf } from '../lib/time.js'
import SignalCard from '../components/SignalCard.vue'

const signals = ref([])
const reportCounts = ref({})
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const { data: signalRows, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .order('last_updated', { ascending: false })
    if (signalsError) throw signalsError
    signals.value = signalRows ?? []

    const { data: reportRows, error: reportsError } = await supabase
      .from('reports')
      .select('signal_id')
    if (reportsError) throw reportsError

    const counts = {}
    for (const r of reportRows ?? []) {
      if (!r.signal_id) continue
      counts[r.signal_id] = (counts[r.signal_id] ?? 0) + 1
    }
    reportCounts.value = counts
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const recentCount = computed(
  () => signals.value.filter((s) => freshnessOf(s.last_updated).level === 'recent').length
)
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-[28px] font-bold leading-tight tracking-tight text-slate-900">Current signals</h1>
      <p class="mt-1.5 text-sm text-slate-500">What's being reported nearby, and how sure we are about it.</p>
    </div>

    <div v-if="!loading && !error && signals.length" class="mb-5 grid grid-cols-2 gap-3">
      <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style="background-color: var(--color-brand-50)">
          <svg class="h-4.5 w-4.5" style="color: var(--color-brand-600)" viewBox="0 0 20 20" fill="none">
            <path d="M5.2 8a6.5 6.5 0 0 1 9.6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
            <path d="M7 10.1a3.7 3.7 0 0 1 6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="10" cy="13" r="1.4" fill="currentColor" />
          </svg>
        </span>
        <div>
          <p class="text-xl font-bold leading-none tracking-tight text-slate-900">{{ signals.length }}</p>
          <p class="mt-1 text-xs font-medium text-slate-500">Active signal{{ signals.length === 1 ? '' : 's' }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style="background-color: color-mix(in srgb, var(--color-fresh) 14%, white)">
          <svg class="h-4.5 w-4.5" style="color: var(--color-fresh)" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" />
            <path d="M10 6v4.2l2.6 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <div>
          <p class="text-xl font-bold leading-none tracking-tight" style="color: var(--color-fresh)">{{ recentCount }}</p>
          <p class="mt-1 text-xs font-medium text-slate-500">Updated in last 15 min</p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-23 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      Couldn't load signals: {{ error }}
    </div>

    <div v-else-if="signals.length === 0" class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
      <p class="text-sm font-semibold text-slate-700">No active signals right now</p>
      <p class="mt-1 text-sm text-slate-500">Reports will appear here as they come in.</p>
    </div>

    <div v-else class="space-y-3">
      <SignalCard
        v-for="signal in signals"
        :key="signal.id"
        :signal="signal"
        :report-count="reportCounts[signal.id] ?? 0"
      />
    </div>

    <RouterLink
      to="/ask"
      class="mt-6 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
    >
      Ask SIGNAL about a location
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
        <path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </RouterLink>
  </div>
</template>
