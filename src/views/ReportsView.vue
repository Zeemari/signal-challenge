<script setup>
import { ref, onMounted } from 'vue'
import ReportListItem from '../components/ReportListItem.vue'
import SignalCard from '../components/SignalCard.vue'
import { apiFetch } from '../lib/api.js'
import { useSignalsFeed } from '../lib/useSignalsFeed.js'

const activeTab = ref('mine') // 'mine' | 'signals'

const reports = ref([])
const loadingReports = ref(true)
const reportsError = ref(null)

const { signals, reportCounts, loading: loadingSignals, error: signalsError, load: loadSignals } = useSignalsFeed()

onMounted(async () => {
  loadSignals()
  try {
    reports.value = (await apiFetch('/api/my-reports')).reports
  } catch (e) {
    reportsError.value = e.message
  } finally {
    loadingReports.value = false
  }
})
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-[28px] font-bold leading-tight tracking-tight text-slate-900">Reports</h1>
      <p class="mt-1.5 text-sm text-slate-500">What you've submitted, and everything currently active.</p>

      <div class="mt-4 flex gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          @click="activeTab = 'mine'"
          class="rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors"
          :class="activeTab === 'mine' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          My reports ({{ reports.length }})
        </button>
        <button
          type="button"
          @click="activeTab = 'signals'"
          class="rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors"
          :class="activeTab === 'signals' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          Current signals ({{ signals.length }})
        </button>
      </div>
    </div>

    <section v-if="activeTab === 'mine'">
      <div v-if="loadingReports" class="space-y-3">
        <div v-for="i in 3" :key="i" class="skeleton h-20 rounded-2xl border border-slate-200" />
      </div>
      <p v-else-if="reportsError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ reportsError }}</p>
      <div v-else-if="!reports.length" class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
        <p class="text-sm font-semibold text-slate-700">No reports yet</p>
        <RouterLink to="/report" class="mt-3 inline-block text-sm font-semibold" style="color: var(--color-brand-600)">Submit your first report</RouterLink>
      </div>
      <ul v-else class="space-y-3">
        <ReportListItem v-for="report in reports" :key="report.id" :report="report" />
      </ul>
    </section>

    <section v-else>
      <div v-if="loadingSignals" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="i in 6" :key="i" class="skeleton h-36 rounded-2xl border border-slate-200" />
      </div>
      <p v-else-if="signalsError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Couldn't load signals: {{ signalsError }}</p>
      <div v-else-if="!signals.length" class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
        <p class="text-sm font-semibold text-slate-700">No active signals right now</p>
        <p class="mt-1 text-sm text-slate-500">Reports will appear here as they come in.</p>
      </div>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SignalCard
          v-for="signal in signals"
          :key="signal.id"
          :signal="signal"
          :report-count="reportCounts[signal.id] ?? 0"
        />
      </div>
    </section>
  </div>
</template>
