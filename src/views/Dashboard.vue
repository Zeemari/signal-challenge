<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'
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
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Current signals</h1>
    <p class="text-sm text-slate-500 mt-1 mb-5">
      What's being reported near you, and how sure we are about it.
    </p>

    <div v-if="loading" class="text-sm text-slate-500">Loading signals…</div>
    <div v-else-if="error" class="text-sm text-red-600">Couldn't load signals: {{ error }}</div>
    <div v-else-if="signals.length === 0" class="text-sm text-slate-500">
      No active signals right now.
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
      class="mt-6 block text-center rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Ask SIGNAL about a location →
    </RouterLink>
  </div>
</template>
