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
    <h1 class="text-xl font-semibold text-slate-900 mb-1">Report something</h1>
    <p class="text-sm text-slate-500 mb-5">
      Share what you saw or heard. This joins SIGNAL's picture of the area — it isn't published as fact.
    </p>

    <form v-if="!result" @submit.prevent="submit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">What did you observe?</label>
        <textarea
          v-model="content"
          rows="3"
          placeholder="e.g. I just saw people running near Northern Road."
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style="--tw-ring-color: var(--color-brand-400)"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Location</label>
        <select v-model="location" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option v-for="loc in knownLocations" :key="loc" :value="loc">{{ loc }}</option>
          <option value="__other__">Other…</option>
        </select>
        <input
          v-if="location === '__other__'"
          v-model="customLocation"
          placeholder="Enter location"
          class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Time</label>
        <input
          v-model="timeInput"
          type="datetime-local"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Source type</label>
        <select v-model="sourceType" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option v-for="s in SOURCE_TYPES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Category <span class="text-slate-400">(optional)</span></label>
        <input
          v-model="category"
          placeholder="e.g. road_activity"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <button
        type="submit"
        :disabled="!canSubmit || submitting"
        class="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
        style="background-color: var(--color-brand-500)"
      >
        {{ submitting ? 'Processing…' : 'Submit report' }}
      </button>
    </form>

    <div v-else class="space-y-4">
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-sm font-medium text-slate-900 mb-1">Here's what we understood:</p>
        <p class="text-sm text-slate-700">{{ result.report.ai_summary }}</p>
        <p class="text-xs text-slate-500 mt-2">
          This report has been added to the "{{ result.signal.title }}" signal.
        </p>
      </div>
      <button
        class="w-full rounded-lg py-3 text-sm font-semibold text-white"
        style="background-color: var(--color-brand-500)"
        @click="router.push({ name: 'signal-detail', params: { id: result.signal.id } })"
      >
        View signal
      </button>
      <button
        class="w-full rounded-lg py-3 text-sm font-medium text-slate-600 border border-slate-200"
        @click="router.push({ name: 'dashboard' })"
      >
        Back to dashboard
      </button>
    </div>
  </div>
</template>
