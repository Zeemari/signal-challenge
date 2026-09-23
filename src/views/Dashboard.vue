<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import { freshnessOf } from '../lib/time.js'
import { hasRole } from '../lib/auth.js'
import { STATUS_META } from '../lib/sources.js'
import SignalCard from '../components/SignalCard.vue'
import SignalMark from '../components/SignalMark.vue'
import StatusPill from '../components/StatusPill.vue'
import SmsSubscribeModal from '../components/SmsSubscribeModal.vue'

const signals = ref([])
const reportCounts = ref({})
const loading = ref(true)
const error = ref(null)
const isResponder = computed(() => hasRole('responder'))
const showSmsModal = ref(false)

onMounted(async () => {
  try {
    const { data: signalRows, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .order('last_updated', { ascending: false })
    if (signalsError) throw signalsError
    signals.value = signalRows ?? []

    let reportRows = []
    try {
      const response = await fetch('/api/public-signals')
      const contentType = response.headers.get('content-type') || ''
      if (response.ok && contentType.includes('application/json')) {
        const publicData = await response.json()
        if (publicData?.signals) {
          reportRows = publicData.signals.flatMap((signal) =>
            Array.from({ length: signal.report_count }, () => ({ signal_id: signal.id }))
          )
        }
      } else {
        const { data: rData } = await supabase.from('reports').select('signal_id')
        reportRows = rData ?? []
      }
    } catch {
      const { data: rData } = await supabase.from('reports').select('signal_id')
      reportRows = rData ?? []
    }

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
const backedUpCount = computed(() => signals.value.filter((s) => s.status === 'corroborating').length)
const needsAttentionCount = computed(() => signals.value.filter((s) => s.status === 'conflicting').length)

const situationSummary = computed(() => {
  const total = signals.value.length
  if (!total) return null
  const newCount = signals.value.filter((s) => s.status === 'emerging').length
  const cautiousCount = signals.value.filter((s) => s.status === 'unconfirmed').length
  const parts = []
  if (needsAttentionCount.value) parts.push(`${needsAttentionCount.value} showing conflicting accounts`)
  if (backedUpCount.value) parts.push(`${backedUpCount.value} backed up by multiple reports`)
  if (newCount) parts.push(`${newCount} newly reported`)
  if (cautiousCount) parts.push(`${cautiousCount} still on a single unverified report`)
  const breakdown = parts.length ? ` ${parts.join(', ')}.` : ''
  const recent = recentCount.value ? ` ${recentCount.value} updated in the last 15 minutes.` : ''
  return `${total} active signal${total === 1 ? '' : 's'} being tracked.${breakdown}${recent}`
})

const priorityFeed = computed(() =>
  signals.value.filter((s) => s.status === 'conflicting' || s.status === 'unconfirmed').slice(0, 4)
)
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/60 bg-white/50 p-5 shadow-sm backdrop-blur sm:p-6">
      <div>
        <h1 class="text-3xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl">Current signals</h1>
        <p class="mt-2 text-sm text-slate-600 sm:text-[15px]">What's being reported nearby, and how sure we are about it.</p>
      </div>
      <button
        @click="showSmsModal = true"
        class="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-teal-700"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Get SMS Alerts
      </button>
    </div>

    <RouterLink
      v-if="isResponder"
      to="/ask"
      class="mb-6 flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.99]"
    >
      <span class="flex items-center gap-2.5">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style="background-color: var(--color-brand-50)">
          <svg class="h-4 w-4" style="color: var(--color-brand-600)" viewBox="0 0 20 20" fill="none">
            <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v5A2.5 2.5 0 0 1 14.5 13H9l-3.8 3.2A.6.6 0 0 1 4.2 15.7V13h-.7A2.5 2.5 0 0 1 1 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        Ask SIGNAL about a location
      </span>
      <svg class="h-4 w-4 shrink-0 text-slate-300" viewBox="0 0 20 20" fill="none">
        <path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </RouterLink>

    <section v-if="isResponder && !loading && !error && situationSummary" class="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div class="flex items-center gap-1.5">
        <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--color-brand-500)" viewBox="0 0 20 20" fill="none">
          <rect x="3.5" y="2.5" width="13" height="15" rx="1.5" stroke="currentColor" stroke-width="1.4" />
          <path d="M6.5 6.5h7M6.5 9.5h7M6.5 12.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500">Situation report</h2>
      </div>
      <p class="mt-2.5 text-[15px] leading-relaxed text-slate-800">{{ situationSummary }}</p>

      <div v-if="priorityFeed.length" class="mt-3 space-y-1 border-t border-slate-100 pt-3">
        <p class="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Needs a look</p>
        <RouterLink
          v-for="s in priorityFeed"
          :key="s.id"
          :to="{ name: 'signal-detail', params: { id: s.id } }"
          class="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-slate-50"
        >
          <span class="flex min-w-0 items-center gap-2">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full" :style="{ backgroundColor: (STATUS_META[s.status] ?? STATUS_META.unconfirmed).dot }" />
            <span class="truncate font-medium text-slate-800">{{ s.title }}</span>
          </span>
          <StatusPill :status="s.status" />
        </RouterLink>
      </div>
    </section>

    <div v-if="loading" class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="i in 4" :key="i" class="skeleton h-18 rounded-2xl border border-slate-200" />
    </div>
    <div v-else-if="!error && signals.length" class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SignalMark class="h-11 w-11 shrink-0 rounded-2xl" />
        <div>
          <p class="text-xl font-extrabold leading-none tracking-tight text-slate-900">{{ signals.length }}</p>
          <p class="mt-1 text-xs font-medium text-slate-500">Active</p>
        </div>
      </div>
      <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style="background-color: var(--color-fresh)">
          <svg class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" />
            <path d="M10 6v4.2l2.6 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <div>
          <p class="text-xl font-extrabold leading-none tracking-tight" style="color: var(--color-fresh)">{{ recentCount }}</p>
          <p class="mt-1 text-xs font-medium text-slate-500">Last 15 min</p>
        </div>
      </div>
      <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style="background-color: var(--color-status-corroborating)">
          <svg class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="none">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <div>
          <p class="text-xl font-extrabold leading-none tracking-tight text-slate-900">{{ backedUpCount }}</p>
          <p class="mt-1 text-xs font-medium text-slate-500">Backed up</p>
        </div>
      </div>
      <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style="background-color: var(--color-status-conflicting)">
          <svg class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="none">
            <path d="M10 2.5 18 16.5H2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
            <path d="M10 8v3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <circle cx="10" cy="14" r="0.9" fill="currentColor" />
          </svg>
        </span>
        <div>
          <p class="text-xl font-extrabold leading-none tracking-tight text-slate-900">{{ needsAttentionCount }}</p>
          <p class="mt-1 text-xs font-medium text-slate-500">Needs attention</p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="i in 6" :key="i" class="skeleton h-36 rounded-2xl border border-slate-200" />
    </div>

    <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      Couldn't load signals: {{ error }}
    </div>

    <div v-else-if="signals.length === 0" class="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center">
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

    <RouterLink
      to="/ask"
      class="mt-6 flex items-center justify-center gap-1.5 rounded-2xl border border-white/60 bg-white/70 py-3.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition-all hover:bg-white active:scale-[0.99]"
    >
      Ask SIGNAL about a location
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
        <path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </RouterLink>

    <SmsSubscribeModal
      v-if="showSmsModal"
      location-name="Your Area"
      @close="showSmsModal = false"
    />
  </div>
</template>
