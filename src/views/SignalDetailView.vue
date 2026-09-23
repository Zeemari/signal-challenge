<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { apiFetch } from '../lib/api.js'
import { hasPermission } from '../lib/auth.js'
import StatusPill from '../components/StatusPill.vue'
import FreshnessBadge from '../components/FreshnessBadge.vue'
import WhySignalPanel from '../components/WhySignalPanel.vue'
import ReportListItem from '../components/ReportListItem.vue'
import SmsSubscribeModal from '../components/SmsSubscribeModal.vue'
import { sourceLabel, isFirsthand, STATUS_META } from '../lib/sources.js'
import { formatClock } from '../lib/time.js'

const route = useRoute()
const signal = ref(null)
const reports = ref([])
const loading = ref(true)
const error = ref(null)
const canUpdate = computed(() => hasPermission('incidents:update'))
const statusOptions = Object.keys(STATUS_META)
const notes = ref('')
const updating = ref(false)
const updateError = ref(null)
const updateSaved = ref(false)
const showSmsModal = ref(false)

onMounted(async () => {
  try {
    const { data: signalRow, error: signalError } = await supabase
      .from('signals')
      .select('*')
      .eq('id', route.params.id)
      .single()
    if (signalError) throw signalError
    signal.value = signalRow
    notes.value = signalRow.responder_notes || ''

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

async function setStatus(status) {
  if (updating.value || !signal.value) return
  updating.value = true
  updateError.value = null
  updateSaved.value = false
  try {
    const { signal: updated } = await apiFetch('/api/update-signal', {
      method: 'PATCH',
      body: JSON.stringify({ signal_id: signal.value.id, status, notes: notes.value }),
    })
    signal.value = { ...signal.value, ...updated }
    updateSaved.value = true
  } catch (e) {
    updateError.value = e.message
  } finally {
    updating.value = false
  }
}
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
      <div class="skeleton h-7 w-2/3 rounded-lg border border-slate-200" />
      <div class="skeleton h-24 rounded-2xl border border-slate-200" />
      <div class="skeleton h-32 rounded-2xl border border-slate-200" />
    </div>
    <div v-else-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      Couldn't load this signal: {{ error }}
    </div>

    <template v-else-if="signal">
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold tracking-tight text-slate-900">{{ signal.title }}</h1>
          <StatusPill :status="signal.status" />
        </div>

        <button
          @click="showSmsModal = true"
          class="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-teal-700"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Get SMS Alerts
        </button>
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <FreshnessBadge :timestamp="signal.last_updated" />
        <span class="text-slate-300">·</span>
        <span class="text-xs font-medium text-slate-500">{{ reports.length }} report{{ reports.length === 1 ? '' : 's' }}</span>
      </div>

      <section class="relative mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <span
          class="absolute inset-y-0 left-0 w-1"
          :style="{ backgroundColor: (STATUS_META[signal.status] ?? STATUS_META.unconfirmed).dot }"
        ></span>
        <div class="p-4 pl-5 sm:p-5 sm:pl-6">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--color-brand-500)" viewBox="0 0 20 20" fill="none">
                <rect x="3.5" y="2.5" width="13" height="15" rx="1.5" stroke="currentColor" stroke-width="1.4" />
                <path d="M6.5 6.5h7M6.5 9.5h7M6.5 12.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
              </svg>
              <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500">Situation Report</h2>
            </div>
            <span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              <svg class="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="none">
                <path d="M10 2.5 18 16.5H2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                <path d="M10 8v3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                <circle cx="10" cy="14" r="0.9" fill="currentColor" />
              </svg>
              Apply with caution
            </span>
          </div>

          <p class="mt-2.5 text-[15px] leading-relaxed text-slate-800">{{ signal.summary }}</p>
          <p class="mt-2.5 text-xs text-slate-400">
            Updated {{ formatClock(signal.last_updated) }} · not independently verified
          </p>

          <div class="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
            <div>
              <p class="text-lg font-bold leading-none text-slate-900">{{ reports.length }}</p>
              <p class="mt-1 text-[11px] font-medium text-slate-500">Report{{ reports.length === 1 ? '' : 's' }}</p>
            </div>
            <div>
              <p class="text-lg font-bold leading-none" style="color: var(--color-brand-600)">{{ firsthandCount }}</p>
              <p class="mt-1 text-[11px] font-medium text-slate-500">Direct</p>
            </div>
            <div>
              <p class="text-lg font-bold leading-none text-slate-900">{{ sourceBreakdown.length }}</p>
              <p class="mt-1 text-[11px] font-medium text-slate-500">Source type{{ sourceBreakdown.length === 1 ? '' : 's' }}</p>
            </div>
          </div>
        </div>
      </section>

      <section v-if="canUpdate" class="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500">Responder actions</h2>
        <p class="mt-1 text-sm text-slate-500">Update this signal's status as new information comes in.</p>

        <div class="mt-3 flex flex-wrap gap-1.5">
          <button
            v-for="status in statusOptions"
            :key="status"
            type="button"
            :disabled="updating"
            @click="setStatus(status)"
            class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            :class="signal.status === status ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'"
            :style="signal.status === status ? { backgroundColor: STATUS_META[status].dot } : {}"
          >
            {{ STATUS_META[status].label }}
          </button>
        </div>

        <textarea
          v-model="notes"
          rows="2"
          placeholder="Optional responder note"
          class="mt-3 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2"
          style="--tw-ring-color: var(--color-brand-400)"
        />

        <p v-if="updateError" class="mt-2 text-xs text-red-600">{{ updateError }}</p>
        <p v-else-if="updateSaved" class="mt-2 text-xs font-medium" style="color: var(--color-fresh)">Saved.</p>
      </section>

      <section v-if="signal.status === 'conflicting'" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p class="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none">
            <path d="M10 2.5 18 16.5H2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
            <path d="M10 8v3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            <circle cx="10" cy="14" r="0.8" fill="currentColor" />
          </svg>
          Mixed reports
        </p>
        <p class="mt-1 text-sm text-amber-700">
          Recent reports give different accounts of the current situation. Apply extra caution.
        </p>
      </section>

      <section class="mt-5">
        <h2 class="mb-2 text-sm font-semibold text-slate-900">Evidence</h2>
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

      <!-- SMS Alert Subscription Modal -->
      <SmsSubscribeModal
        v-if="showSmsModal"
        :location-name="signal.location || signal.title"
        :location-id="signal.location_id"
        :lga-id="signal.lga_id"
        @close="showSmsModal = false"
      />
    </template>
  </div>
</template>
