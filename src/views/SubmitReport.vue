<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { SOURCE_TYPES } from '../lib/sources.js'

const router = useRouter()

const knownLocations = ['Northern Road', 'Market Road', 'Riverside Junction']

const content = ref('')
const location = ref(knownLocations[0])
const customLocation = ref('')
const sourceType = ref('direct_observation')
const category = ref('')
const timeInput = ref(new Date().toISOString().slice(0, 16))

const submitting = ref(false)
const error = ref(null)
const result = ref(null)

const effectiveLocation = computed(() =>
  location.value === '__other__' ? customLocation.value.trim() : location.value
)

const canSubmit = computed(() => content.value.trim().length > 0 && effectiveLocation.value.length > 0)

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  error.value = null
  try {
    const res = await fetch('/api/submit-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content.value.trim(),
        location: effectiveLocation.value,
        source_type: sourceType.value,
        category: category.value.trim() || undefined,
        reported_at: new Date(timeInput.value).toISOString(),
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Something went wrong submitting your report')
    }
    result.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-[28px] font-bold leading-tight tracking-tight text-slate-900">Report something</h1>
    <p class="mt-1.5 mb-6 text-sm text-slate-500">
      Share what you saw or heard. This joins SIGNAL's picture of the area — it isn't published as fact.
    </p>

    <form v-if="!result" @submit.prevent="submit" class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <label class="mb-1.5 block text-sm font-semibold text-slate-800">What did you observe?</label>
        <textarea
          v-model="content"
          rows="3"
          placeholder="e.g. I just saw people running near Northern Road."
          class="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2"
          style="--tw-ring-color: var(--color-brand-400)"
        ></textarea>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-semibold text-slate-800">Location</label>
        <select
          v-model="location"
          class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2"
          style="--tw-ring-color: var(--color-brand-400)"
        >
          <option v-for="loc in knownLocations" :key="loc" :value="loc">{{ loc }}</option>
          <option value="__other__">Other…</option>
        </select>
        <input
          v-if="location === '__other__'"
          v-model="customLocation"
          placeholder="Enter location"
          class="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2"
          style="--tw-ring-color: var(--color-brand-400)"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-semibold text-slate-800">Time</label>
        <input
          v-model="timeInput"
          type="datetime-local"
          class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2"
          style="--tw-ring-color: var(--color-brand-400)"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-semibold text-slate-800">Source type</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="s in SOURCE_TYPES"
            :key="s.value"
            type="button"
            @click="sourceType = s.value"
            class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
            :class="
              sourceType === s.value
                ? 'border-transparent text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
            "
            :style="sourceType === s.value ? { backgroundColor: 'var(--color-brand-500)' } : {}"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-semibold text-slate-800">
          Category <span class="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          v-model="category"
          placeholder="e.g. road_activity"
          class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2"
          style="--tw-ring-color: var(--color-brand-400)"
        />
      </div>

      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

      <button
        type="submit"
        :disabled="!canSubmit || submitting"
        class="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-sm shadow-brand-900/15 transition-all active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100"
        style="background-color: var(--color-brand-500)"
      >
        <svg v-if="submitting" class="h-4 w-4 animate-spin" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="2" opacity="0.25" />
          <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        {{ submitting ? 'Processing…' : 'Submit report' }}
      </button>
    </form>

    <div v-else class="space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 text-center">
        <span
          class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
          style="background-color: var(--color-brand-50)"
        >
          <svg class="h-5 w-5" style="color: var(--color-brand-600)" viewBox="0 0 20 20" fill="none">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <p class="text-sm font-semibold text-slate-900">Here's what we understood</p>
        <p class="mt-2 text-sm leading-relaxed text-slate-700">{{ result.report.ai_summary }}</p>
        <p class="mt-3 text-xs text-slate-500">
          This report has been added to the "{{ result.signal.title }}" signal.
        </p>
      </div>
      <button
        class="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm shadow-brand-900/15 transition-transform active:scale-[0.99]"
        style="background-color: var(--color-brand-500)"
        @click="router.push({ name: 'signal-detail', params: { id: result.signal.id } })"
      >
        View signal
      </button>
      <button
        class="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.99]"
        @click="router.push({ name: 'dashboard' })"
      >
        Back to dashboard
      </button>
    </div>
  </div>
</template>
