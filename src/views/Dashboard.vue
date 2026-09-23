<script setup>
import { ref, computed, onMounted } from 'vue'
import { freshnessOf } from '../lib/time.js'
import { hasRole } from '../lib/auth.js'
import { STATUS_META } from '../lib/sources.js'
import { useSignalsFeed } from '../lib/useSignalsFeed.js'
import SignalCard from '../components/SignalCard.vue'
import SignalMark from '../components/SignalMark.vue'
import StatusPill from '../components/StatusPill.vue'
import SmsSubscribeModal from '../components/SmsSubscribeModal.vue'

const { signals, reportCounts, loading, error, load } = useSignalsFeed()
const isResponder = computed(() => hasRole('responder'))
const showSmsModal = ref(false)

onMounted(load)

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
    <!-- Hero -->
    <section class="relative mb-8 overflow-hidden rounded-3xl px-6 py-12 text-white sm:px-10 sm:py-16" style="background-color: var(--color-brand-700)">
      <div class="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full" style="background-color: var(--color-brand-600)" />
      <div class="pointer-events-none absolute -bottom-28 -left-10 h-80 w-80 rounded-full" style="background-color: var(--color-brand-800)" />

      <div class="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-2xl">
          <h1 class="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Know your location's security report.</h1>
          <p class="mt-4 text-base leading-relaxed text-white/75 sm:text-lg">
            What's being reported nearby, and how sure we are about it, organized transparently from community reports,
            updated as new information comes in.
          </p>
        </div>
        <div class="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          <RouterLink
            to="/report"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
            style="color: var(--color-brand-700)"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
              <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            Report Something
          </RouterLink>
          <RouterLink
            to="/ask"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Ask SIGNAL about a location
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </RouterLink>
          <button
            type="button"
            @click="showSmsModal = true"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Get SMS Alerts
          </button>
        </div>
      </div>
    </section>

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

    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <div v-for="i in 8" :key="i" class="skeleton h-36 rounded-2xl border border-slate-200" />
    </div>

    <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      Couldn't load signals: {{ error }}
    </div>

    <div v-else-if="signals.length === 0" class="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center">
      <p class="text-sm font-semibold text-slate-700">No active signals right now</p>
      <p class="mt-1 text-sm text-slate-500">Reports will appear here as they come in.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <SignalCard
        v-for="signal in signals"
        :key="signal.id"
        :signal="signal"
        :report-count="reportCounts[signal.id] ?? 0"
      />
    </div>

    <SmsSubscribeModal
      v-if="showSmsModal"
      location-name="Your Area"
      @close="showSmsModal = false"
    />
  </div>
</template>
