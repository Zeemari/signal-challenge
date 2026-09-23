<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import StatusPill from '../components/StatusPill.vue'
import FreshnessBadge from '../components/FreshnessBadge.vue'
import WhySignalPanel from '../components/WhySignalPanel.vue'
import ReportListItem from '../components/ReportListItem.vue'
import { sourceLabel, isFirsthand, STATUS_META } from '../lib/sources.js'

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

    let reportRows = []
    try {
      const publicResponse = await fetch(`/api/public-signal?id=${encodeURIComponent(route.params.id)}`)
      const contentType = publicResponse.headers.get('content-type') || ''
      if (publicResponse.ok && contentType.includes('application/json')) {
        const publicData = await publicResponse.json()
        reportRows = publicData.reports || []
      } else {
        const { data: rData } = await supabase.from('reports').select('*').eq('signal_id', route.params.id)
        reportRows = rData || []
      }
    } catch {
      const { data: rData } = await supabase.from('reports').select('*').eq('signal_id', route.params.id)
      reportRows = rData || []
    }

    for (const report of reportRows) report.content = report.content || report.ai_summary || 'Community report received.'
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
    <RouterLink to="/" class="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
        <path d="M12.5 5l-5 5 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      Back to signals
    </RouterLink>

    <div v-if="loading" class="mt-4 space-y-3">
      <div class="h-7 w-2/3 animate-pulse rounded-lg bg-white border border-slate-200" />
      <div class="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div class="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
    <div v-else-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      Couldn't load this signal: {{ error }}
    </div>

    <template v-else-if="signal">
      <div class="mt-4 flex items-start justify-between gap-3">
        <h1 class="text-xl font-bold tracking-tight text-slate-900">{{ signal.title }}</h1>
        <StatusPill :status="signal.status" />
      </div>
      <div class="mt-2">
        <FreshnessBadge :timestamp="signal.last_updated" />
      </div>

      <section class="relative mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pl-5">
        <span
          class="absolute inset-y-0 left-0 w-1"
          :style="{ backgroundColor: (STATUS_META[signal.status] ?? STATUS_META.unconfirmed).dot }"
        ></span>
        <h2 class="mb-1.5 text-sm font-semibold text-slate-900">Current picture</h2>
        <p class="text-sm leading-relaxed text-slate-700">{{ signal.summary }}</p>
      </section>

      <section v-if="signal.status === 'conflicting'" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p class="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none">
            <path d="M10 2.5 18 16.5H2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
            <path d="M10 8v3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            <circle cx="10" cy="14" r="0.8" fill="currentColor" />
          </svg>
          Conflicting reports
        </p>
        <p class="mt-1 text-sm text-amber-700">
          Recent reports give different accounts of the current situation. Further verification is needed.
        </p>
      </section>

      <section class="mt-5">
        <h2 class="mb-2 text-sm font-semibold text-slate-900">
          Evidence · {{ firsthandCount }} direct / {{ reports.length - firsthandCount }} other
        </h2>
        <div class="mb-3 flex flex-wrap gap-2">
          <span
            v-for="b in sourceBreakdown"
            :key="b.type"
            class="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
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

      <section class="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <h2 class="mb-1 text-sm font-semibold text-slate-900">What's not known</h2>
        <p class="text-sm leading-relaxed text-slate-500">
          The nature of the activity has not been independently confirmed. Treat this as unverified community reporting.
        </p>
      </section>
    </template>
  </div>
</template>
