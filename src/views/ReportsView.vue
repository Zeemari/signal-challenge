<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { authState } from '../lib/auth.js'
import { apiFetch } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'
import ReportListItem from '../components/ReportListItem.vue'
import SubmitReport from './SubmitReport.vue'

const route = useRoute()

// Active tab: 'all', 'submit', 'my'
const activeTab = ref(route.query.tab || 'all')
const searchQuery = ref('')
const selectedSituation = ref('all')

const publicReports = ref([])
const myReports = ref([])
const loadingPublic = ref(true)
const loadingMy = ref(false)
const errorPublic = ref(null)
const errorMy = ref(null)

async function fetchPublicReports() {
  loadingPublic.value = true
  errorPublic.value = null
  try {
    const data = await apiFetch('/api/public-reports')
    publicReports.value = data?.reports || []
  } catch (err) {
    console.warn('API public-reports failed, falling back to client Supabase:', err)
    try {
      const { data: reportRows, error: sErr } = await supabase
        .from('reports')
        .select('id, content, location, source_type, perceived_situation, reported_at, created_at, ai_summary, ai_urgency, review_status, responder_notes, responder_name, signal_id')
        .order('created_at', { ascending: false })
        .limit(100)
      if (!sErr && reportRows) {
        publicReports.value = reportRows
        return
      }
    } catch {
      // ignore
    }
    errorPublic.value = err.message || 'Unable to load public reports'
  } finally {
    loadingPublic.value = false
  }
}

async function fetchMyReports() {
  if (!authState.user) return
  loadingMy.value = true
  errorMy.value = null
  try {
    const data = await apiFetch('/api/my-reports')
    myReports.value = data?.reports || []
  } catch (err) {
    errorMy.value = err.message
  } finally {
    loadingMy.value = false
  }
}

onMounted(() => {
  fetchPublicReports()
  if (authState.user) fetchMyReports()
})

const filteredPublicReports = computed(() => {
  let result = publicReports.value
  if (selectedSituation.value !== 'all') {
    result = result.filter((r) => r.perceived_situation === selectedSituation.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    result = result.filter(
      (r) =>
        r.content?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.ai_summary?.toLowerCase().includes(q)
    )
  }
  return result
})

function handleReportSubmitted() {
  fetchPublicReports()
  if (authState.user) fetchMyReports()
  activeTab.value = 'all'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header banner -->
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Community Reports
          </h1>
          <p class="mt-2 text-sm text-slate-600 sm:text-base">
            View live incident reports or submit a new observation to keep your community informed.
          </p>
        </div>
        <button
          @click="activeTab = 'submit'"
          class="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98]"
          style="background-color: var(--color-brand-600)"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          Submit a Report
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm font-medium">
        <button
          @click="activeTab = 'all'"
          class="flex items-center gap-2 rounded-xl px-4 py-2.5 transition-colors"
          :class="activeTab === 'all' ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'"
        >
          <span>All Reports</span>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-bold"
            :class="activeTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'"
          >
            {{ publicReports.length }}
          </span>
        </button>

        <button
          v-if="authState.user"
          @click="activeTab = 'my'"
          class="flex items-center gap-2 rounded-xl px-4 py-2.5 transition-colors"
          :class="activeTab === 'my' ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'"
        >
          <span>My Reports</span>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-bold"
            :class="activeTab === 'my' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'"
          >
            {{ myReports.length }}
          </span>
        </button>

        <button
          @click="activeTab = 'submit'"
          class="flex items-center gap-2 rounded-xl px-4 py-2.5 transition-colors"
          :class="activeTab === 'submit' ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
            <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <span>New Report</span>
        </button>
      </div>
    </div>

    <!-- Submit Tab -->
    <div v-if="activeTab === 'submit'">
      <SubmitReport @submitted="handleReportSubmitted" />
    </div>

    <!-- All Reports Tab -->
    <div v-else-if="activeTab === 'all'" class="space-y-4">
      <!-- Search & Filters -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative flex-1">
          <svg class="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="none">
            <path d="M14.5 14.5L18 18M16.5 9.5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search reports by location or keyword…"
            class="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <select
          v-model="selectedSituation"
          class="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All Situations</option>
          <option value="safe">🟢 Safe</option>
          <option value="cautious">🟡 Cautious</option>
          <option value="tense">🟠 Tense</option>
          <option value="dangerous">🔴 Dangerous</option>
        </select>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loadingPublic" class="space-y-3">
        <div v-for="i in 4" :key="i" class="skeleton h-24 rounded-2xl border border-slate-200" />
      </div>

      <!-- Error state -->
      <div v-else-if="errorPublic" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load reports: {{ errorPublic }}
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredPublicReports.length === 0" class="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <p class="text-base font-semibold text-slate-700">No reports found</p>
        <p class="mt-1 text-sm text-slate-500">
          {{ searchQuery ? 'Try adjusting your search terms or filters.' : 'Be the first to report something in your area!' }}
        </p>
        <button
          @click="activeTab = 'submit'"
          class="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white"
        >
          Submit a Report
        </button>
      </div>

      <!-- Report List -->
      <ul v-else class="space-y-3">
        <ReportListItem v-for="report in filteredPublicReports" :key="report.id" :report="report" />
      </ul>
    </div>

    <!-- My Reports Tab -->
    <div v-else-if="activeTab === 'my'" class="space-y-4">
      <div v-if="loadingMy" class="space-y-3">
        <div v-for="i in 3" :key="i" class="skeleton h-24 rounded-2xl border border-slate-200" />
      </div>

      <div v-else-if="errorMy" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load your reports: {{ errorMy }}
      </div>

      <div v-else-if="myReports.length === 0" class="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <p class="text-base font-semibold text-slate-700">You haven't submitted any reports yet</p>
        <p class="mt-1 text-sm text-slate-500">Reports you submit will appear here.</p>
        <button
          @click="activeTab = 'submit'"
          class="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white"
        >
          Submit your first report
        </button>
      </div>

      <ul v-else class="space-y-3">
        <ReportListItem v-for="report in myReports" :key="report.id" :report="report" />
      </ul>
    </div>
  </div>
</template>
