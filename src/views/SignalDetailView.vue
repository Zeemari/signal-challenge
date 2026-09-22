<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import StatusPill from '../components/StatusPill.vue'
import FreshnessBadge from '../components/FreshnessBadge.vue'
import WhySignalPanel from '../components/WhySignalPanel.vue'
import ReportListItem from '../components/ReportListItem.vue'
import { sourceLabel, isFirsthand } from '../lib/sources.js'

const route = useRoute()
const signal = ref(null)
const reports = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const { data: signalRow, error: signalError } = await supabase
      .from('signals')
      .select('*')
      .eq('id', route.params.id)
      .single()
    if (signalError) throw signalError
    signal.value = signalRow

    const { data: reportRows, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('signal_id', route.params.id)
      .order('reported_at', { ascending: false })
    if (reportsError) throw reportsError
    reports.value = reportRows ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const sourceBreakdown = computed(() => {
  const counts = {}
  for (const r of reports.value) {
    counts[r.source_type] = (counts[r.source_type] ?? 0) + 1
  }
  return Object.entries(counts).map(([type, count]) => ({ type, count }))
})

const firsthandCount = computed(() =>
  reports.value.filter((r) => isFirsthand(r.source_type)).length
)
</script>

<template>
  <div>
    <RouterLink to="/" class="text-sm text-slate-500 hover:text-slate-700">← Back to signals</RouterLink>

    <div v-if="loading" class="mt-4 text-sm text-slate-500">Loading…</div>
    <div v-else-if="error" class="mt-4 text-sm text-red-600">Couldn't load this signal: {{ error }}</div>

    <template v-else-if="signal">
      <div class="mt-3 flex items-start justify-between gap-3">
        <h1 class="text-xl font-semibold text-slate-900">{{ signal.title }}</h1>
        <StatusPill :status="signal.status" />
      </div>
      <div class="mt-2">
        <FreshnessBadge :timestamp="signal.last_updated" />
      </div>

      <section class="mt-5">
        <h2 class="text-sm font-semibold text-slate-900 mb-1">Current picture</h2>
        <p class="text-sm text-slate-700 leading-relaxed">{{ signal.summary }}</p>
      </section>

      <section v-if="signal.status === 'conflicting'" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p class="text-sm font-medium text-amber-800">⚠ Conflicting reports</p>
        <p class="text-sm text-amber-700 mt-1">
          Recent reports give different accounts of the current situation. Further verification is needed.
        </p>
      </section>

      <section class="mt-5">
        <h2 class="text-sm font-semibold text-slate-900 mb-2">
          Evidence · {{ firsthandCount }} direct / {{ reports.length - firsthandCount }} other
        </h2>
        <div class="flex flex-wrap gap-2 mb-3">
          <span
            v-for="b in sourceBreakdown"
            :key="b.type"
            class="text-xs rounded-md bg-slate-100 text-slate-600 px-2 py-1"
          >
            {{ b.count }} × {{ sourceLabel(b.type) }}
          </span>
        </div>
        <ul class="space-y-2">
          <ReportListItem v-for="r in reports" :key="r.id" :report="r" />
        </ul>
      </section>

      <section class="mt-5">
        <WhySignalPanel :items="signal.why_explanation" :last-updated="signal.last_updated" />
      </section>

      <section class="mt-5 text-sm text-slate-500">
        <h2 class="text-sm font-semibold text-slate-900 mb-1">What's not known</h2>
        <p>The nature of the activity has not been independently confirmed. Treat this as unverified community reporting.</p>
      </section>
    </template>
  </div>
</template>
