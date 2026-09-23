<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../lib/api.js'
import StatusPill from '../components/StatusPill.vue'
import { STATUS_META } from '../lib/sources.js'

const activeTab = ref('locations') // 'locations' | 'signals'
const signals = ref([])
const pendingLocations = ref([])
const loading = ref(true)
const error = ref(null)
const busy = ref(null)
const statusOptions = Object.keys(STATUS_META)

async function load() {
  error.value = null
  try {
    const [responderData, adminLocData] = await Promise.all([
      apiFetch('/api/responder-reports').catch(() => ({ signals: [] })),
      apiFetch('/api/admin-locations').catch(() => ({ pending: [] })),
    ])
    signals.value = responderData.signals || []
    pendingLocations.value = adminLocData.pending || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function reviewLocation(loc, action) {
  busy.value = loc.id
  error.value = null
  try {
    await apiFetch('/api/review-location', {
      method: 'POST',
      body: JSON.stringify({ location_id: loc.id, action }),
    })
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = null
  }
}

async function updateSignal(signal, status) {
  busy.value = signal.id
  error.value = null
  try {
    await apiFetch('/api/update-signal', {
      method: 'PATCH',
      body: JSON.stringify({
        signal_id: signal.id,
        status,
        review_status: signal.review_status,
        notes: signal.responder_notes || '',
      }),
    })
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = null
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--color-brand-600)">Responder workspace</p>
      <h1 class="mt-2 text-[28px] font-bold leading-tight tracking-tight text-slate-900">Review queue</h1>
      <p class="mt-1.5 text-sm text-slate-500">Review location suggestions and set signal status.</p>

      <!-- Navigation Tabs -->
      <div class="mt-4 flex gap-2 border-b border-slate-200 pb-2">
        <button
          @click="activeTab = 'locations'"
          class="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors"
          :class="activeTab === 'locations' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          <span>Pending Locations</span>
          <span
            v-if="pendingLocations.length"
            class="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white"
          >
            {{ pendingLocations.length }}
          </span>
        </button>
        <button
          @click="activeTab = 'signals'"
          class="rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors"
          :class="activeTab === 'signals' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          Signal Status ({{ signals.length }})
        </button>
      </div>
    </div>

    <p v-if="error" class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>
    
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="skeleton h-28 rounded-2xl border border-slate-200" />
    </div>

    <template v-else>
      <!-- TAB: PENDING LOCATIONS REVIEW QUEUE -->
      <section v-if="activeTab === 'locations'">
        <div v-if="!pendingLocations.length" class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No pending community-submitted locations to review.
        </div>
        <ul v-else class="space-y-3">
          <li v-for="loc in pendingLocations" :key="loc.id" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-bold text-slate-900">{{ loc.name }}</h3>
                  <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    Community Suggested
                  </span>
                </div>
                <p class="mt-1 text-xs text-slate-600">
                  LGA: <strong>{{ loc.lga?.name }}</strong> · State: <strong>{{ loc.lga?.state?.name }}</strong>
                </p>
                <p class="mt-1 text-xs text-slate-500">
                  Submitted: {{ new Date(loc.created_at).toLocaleString() }} · Reports linked: <strong>{{ loc.report_count }}</strong>
                </p>
              </div>

              <div class="flex gap-2">
                <button
                  :disabled="busy === loc.id"
                  @click="reviewLocation(loc, 'approve')"
                  class="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  Approve
                </button>
                <button
                  :disabled="busy === loc.id"
                  @click="reviewLocation(loc, 'reject')"
                  class="flex items-center gap-1 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
                  Reject
                </button>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- TAB 3: SIGNALS STATUS -->
      <section v-if="activeTab === 'signals'">
        <div v-if="!signals.length" class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No signals yet.
        </div>
        <ul v-else class="space-y-3">
          <li v-for="signal in signals" :key="signal.id" class="rounded-2xl border border-slate-200 bg-white p-4">
            <div class="flex items-start justify-between gap-3">
              <p class="font-semibold text-slate-900">{{ signal.title }}</p>
              <StatusPill :status="signal.status" />
            </div>
            <p class="mt-1.5 text-xs text-slate-500">{{ signal.review_status }}</p>
            <div class="mt-3 flex flex-wrap gap-1.5">
              <button
                v-for="status in statusOptions"
                :key="status"
                type="button"
                :disabled="busy === signal.id"
                @click="updateSignal(signal, status)"
                class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                :class="signal.status === status ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'"
                :style="signal.status === status ? { backgroundColor: STATUS_META[status].dot } : {}"
              >
                {{ STATUS_META[status].label }}
              </button>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
