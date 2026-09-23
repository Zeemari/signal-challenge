<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { SOURCE_TYPES } from '../lib/sources.js'
import { apiFetch } from '../lib/api.js'
import { authState } from '../lib/auth.js'
import CascadingLocationPicker from '../components/CascadingLocationPicker.vue'

const router = useRouter()

const SITUATION_OPTIONS = [
  { value: 'safe', label: 'Safe', icon: '🟢', bgClass: 'bg-emerald-50 border-emerald-300 text-emerald-900', activeClass: 'ring-2 ring-emerald-500 border-emerald-500' },
  { value: 'cautious', label: 'Cautious', icon: '🟡', bgClass: 'bg-amber-50 border-amber-300 text-amber-900', activeClass: 'ring-2 ring-amber-500 border-amber-500' },
  { value: 'tense', label: 'Tense / Uneasy', icon: '🟠', bgClass: 'bg-orange-50 border-orange-300 text-orange-900', activeClass: 'ring-2 ring-orange-500 border-orange-500' },
  { value: 'dangerous', label: 'Dangerous', icon: '🔴', bgClass: 'bg-red-50 border-red-300 text-red-900', activeClass: 'ring-2 ring-red-500 border-red-500' },
  { value: 'not_sure', label: 'Not sure', icon: '⚪', bgClass: 'bg-slate-50 border-slate-300 text-slate-800', activeClass: 'ring-2 ring-slate-400 border-slate-400' },
]

const content = ref('')
const locationState = ref({
  state_id: '',
  lga_id: '',
  location_id: null,
  custom_location_name: null,
  location_text: '',
  isValid: false,
})
const sourceType = ref('direct_observation')
const perceivedSituation = ref('cautious')
const category = ref('')
const timeInput = ref(new Date().toISOString().slice(0, 16))

const submitting = ref(false)
const error = ref(null)
const result = ref(null)

const canSubmit = computed(() => content.value.trim().length > 0 && locationState.value.isValid)

const responderName = computed(() =>
  authState.profile?.display_name || authState.user?.email?.split('@')[0] || 'Responder'
)

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  error.value = null
  try {
    const resultBody = await apiFetch('/api/submit-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content.value.trim(),
        location: locationState.value.location_text,
        state_id: locationState.value.state_id,
        lga_id: locationState.value.lga_id,
        location_id: locationState.value.location_id,
        custom_location_name: locationState.value.custom_location_name,
        source_type: sourceType.value,
        perceived_situation: perceivedSituation.value,
        category: category.value.trim() || undefined,
        reported_at: new Date(timeInput.value).toISOString(),
      }),
    })
    result.value = resultBody
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
      Share what you observe nearby to keep the community informed.
    </p>

    <div
      v-if="authState.profile?.role === 'responder'"
      class="mb-5 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-medium text-teal-800"
    >
      <svg class="h-4 w-4 shrink-0 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
      </svg>
      <span>
        Submitting as official <strong>Responder ({{ responderName }})</strong><template v-if="authState.profile?.institution_name"> — {{ authState.profile.institution_name }}</template>.
        Your name{{ authState.profile?.institution_name ? ' and institution' : '' }} will be attached to this report.
      </span>
    </div>

    <form v-if="!result" @submit.prevent="submit" class="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <!-- Situation assessment -->
      <div>
        <label class="mb-2 block text-sm font-semibold text-slate-900">
          What is the situation in your area?
        </label>
        <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <button
            v-for="opt in SITUATION_OPTIONS"
            :key="opt.value"
            type="button"
            @click="perceivedSituation = opt.value"
            class="flex items-center gap-2 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all hover:scale-[1.01]"
            :class="[
              opt.bgClass,
              perceivedSituation === opt.value ? opt.activeClass : 'opacity-85 hover:opacity-100'
            ]"
          >
            <span class="text-base leading-none">{{ opt.icon }}</span>
            <span class="truncate">{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- What was observed -->
      <div>
        <label class="mb-1.5 block text-sm font-semibold text-slate-800">What did you observe?</label>
        <textarea
          v-model="content"
          rows="3"
          placeholder="Describe what you saw or heard (e.g. Traffic slowed near Northern Road after loud sound)."
          class="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2"
          style="--tw-ring-color: var(--color-brand-400)"
        ></textarea>
      </div>

      <!-- Cascading Location Picker -->
      <div>
        <label class="mb-1.5 block text-sm font-semibold text-slate-800">Location</label>
        <CascadingLocationPicker v-model="locationState" />
      </div>

      <!-- Source type -->
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
        <p v-if="result.report.responder_name" class="mt-2 text-xs font-semibold text-teal-700">
          Attached responder signature: {{ result.report.responder_name }}
        </p>
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
