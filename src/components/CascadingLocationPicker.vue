<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { apiFetch } from '../lib/api.js'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue'])

const states = ref([])
const lgas = ref([])
const locations = ref([])

const selectedStateId = ref('')
const selectedLgaId = ref('')
const selectedLocationId = ref('')
const customLocationName = ref('')

const loadingStates = ref(true)
const loadingLgas = ref(false)
const loadingLocations = ref(false)
const error = ref(null)

// Initial fallback mock data if DB isn't seeded yet
const fallbackStates = [
  { id: 'state-lagos', name: 'Lagos', code: 'LA' },
  { id: 'state-fct', name: 'FCT (Abuja)', code: 'FC' },
  { id: 'state-kano', name: 'Kano', code: 'KN' },
  { id: 'state-rivers', name: 'Rivers', code: 'RI' },
  { id: 'state-oyo', name: 'Oyo', code: 'OY' },
]

const fallbackLgas = {
  'state-lagos': [
    { id: 'lga-ikeja', state_id: 'state-lagos', name: 'Ikeja' },
    { id: 'lga-eti-osa', state_id: 'state-lagos', name: 'Eti-Osa' },
    { id: 'lga-alimosho', state_id: 'state-lagos', name: 'Alimosho' },
  ],
  'state-fct': [
    { id: 'lga-amac', state_id: 'state-fct', name: 'Abuja Municipal' },
    { id: 'lga-bwari', state_id: 'state-fct', name: 'Bwari' },
  ],
}

const fallbackLocations = {
  'lga-ikeja': [
    { id: 'loc-northern-rd', name: 'Northern Road', status: 'approved' },
    { id: 'loc-market-rd', name: 'Market Road', status: 'approved' },
    { id: 'loc-riverside-jct', name: 'Riverside Junction', status: 'approved' },
  ],
}

async function fetchStates() {
  loadingStates.value = true
  error.value = null
  try {
    const data = await apiFetch('/api/locations')
    if (data.states && data.states.length) {
      states.value = data.states
    } else {
      states.value = fallbackStates
    }
  } catch (e) {
    console.warn('Using fallback states dataset:', e.message)
    states.value = fallbackStates
  } finally {
    loadingStates.value = false
  }
}

async function fetchLgas(stateId) {
  if (!stateId) {
    lgas.value = []
    return
  }
  loadingLgas.value = true
  try {
    const data = await apiFetch(`/api/locations?state_id=${stateId}`)
    if (data.lgas && data.lgas.length) {
      lgas.value = data.lgas
    } else {
      lgas.value = fallbackLgas[stateId] || []
    }
  } catch (e) {
    lgas.value = fallbackLgas[stateId] || []
  } finally {
    loadingLgas.value = false
  }
}

async function fetchLocations(lgaId) {
  if (!lgaId) {
    locations.value = []
    return
  }
  loadingLocations.value = true
  try {
    const data = await apiFetch(`/api/locations?lga_id=${lgaId}`)
    if (data.locations) {
      locations.value = data.locations
    } else {
      locations.value = fallbackLocations[lgaId] || []
    }
  } catch (e) {
    locations.value = fallbackLocations[lgaId] || []
  } finally {
    loadingLocations.value = false
  }
}

watch(selectedStateId, (newStateId) => {
  selectedLgaId.value = ''
  selectedLocationId.value = ''
  customLocationName.value = ''
  locations.value = []
  if (newStateId) {
    fetchLgas(newStateId)
  }
})

watch(selectedLgaId, (newLgaId) => {
  selectedLocationId.value = ''
  customLocationName.value = ''
  if (newLgaId) {
    fetchLocations(newLgaId)
  }
})

const currentStateObj = computed(() => states.value.find((s) => s.id === selectedStateId.value))
const currentLgaObj = computed(() => lgas.value.find((l) => l.id === selectedLgaId.value))
const currentLocationObj = computed(() => locations.value.find((loc) => loc.id === selectedLocationId.value))

const isCustomLocation = computed(() => selectedLocationId.value === '__other__')

const effectiveLocationText = computed(() => {
  if (!currentStateObj.value || !currentLgaObj.value) return ''
  let locName = ''
  if (isCustomLocation.value) {
    locName = customLocationName.value.trim()
  } else if (currentLocationObj.value) {
    locName = currentLocationObj.value.name
  }
  if (!locName) return ''
  return `${locName}, ${currentLgaObj.value.name}, ${currentStateObj.value.name}`
})

const isValid = computed(() => {
  if (!selectedStateId.value || !selectedLgaId.value) return false
  if (isCustomLocation.value) return customLocationName.value.trim().length > 0
  return !!selectedLocationId.value
})

watch([selectedStateId, selectedLgaId, selectedLocationId, customLocationName, effectiveLocationText, isValid], () => {
  emit('update:modelValue', {
    state_id: selectedStateId.value,
    lga_id: selectedLgaId.value,
    location_id: isCustomLocation.value ? null : selectedLocationId.value,
    custom_location_name: isCustomLocation.value ? customLocationName.value.trim() : null,
    location_text: effectiveLocationText.value,
    isValid: isValid.value,
  })
})

onMounted(() => {
  fetchStates()
})
</script>

<template>
  <div class="space-y-3">
    <div v-if="loadingStates || loadingLgas || loadingLocations" class="flex items-center gap-1.5 text-xs font-medium" style="color: var(--color-brand-600)">
      <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="2" opacity="0.25" />
        <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      Loading location data…
    </div>

    <!-- State Selector -->
    <div>
      <label class="mb-1.5 block text-sm font-semibold text-slate-800">State</label>
      <select
        v-model="selectedStateId"
        :disabled="loadingStates"
        class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 disabled:bg-slate-50"
        style="--tw-ring-color: var(--color-brand-400)"
      >
        <option value="" disabled>Select state…</option>
        <option v-for="st in states" :key="st.id" :value="st.id">{{ st.name }} ({{ st.code }})</option>
      </select>
    </div>

    <!-- LGA Selector -->
    <div v-if="selectedStateId">
      <label class="mb-1.5 block text-sm font-semibold text-slate-800">Local Government Area</label>
      <select
        v-model="selectedLgaId"
        :disabled="loadingLgas || !lgas.length"
        class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 disabled:bg-slate-50"
        style="--tw-ring-color: var(--color-brand-400)"
      >
        <option value="" disabled>{{ loadingLgas ? 'Loading LGAs…' : 'Select LGA…' }}</option>
        <option v-for="lga in lgas" :key="lga.id" :value="lga.id">{{ lga.name }}</option>
      </select>
    </div>

    <!-- Location / Landmark Selector -->
    <div v-if="selectedLgaId">
      <label class="mb-1.5 block text-sm font-semibold text-slate-800">Area / Landmark / Junction</label>
      <select
        v-model="selectedLocationId"
        :disabled="loadingLocations"
        class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2"
        style="--tw-ring-color: var(--color-brand-400)"
      >
        <option value="" disabled>Select known landmark or area…</option>
        <option v-for="loc in locations" :key="loc.id" :value="loc.id">
          {{ loc.name }} {{ loc.status === 'pending' ? '(Pending Approval)' : '' }}
        </option>
        <option value="__other__">My area isn't listed (suggest new area)</option>
      </select>
    </div>

    <!-- Custom Location Input -->
    <div v-if="isCustomLocation" class="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
      <label class="mb-1.5 block text-sm font-semibold text-amber-900">
        Suggest new area / landmark name
      </label>
      <input
        v-model="customLocationName"
        type="text"
        placeholder="e.g. Firewood Market Junction"
        class="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <p class="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
        <svg class="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.4" />
          <path d="M10 9v4.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          <circle cx="10" cy="6.7" r="0.9" fill="currentColor" />
        </svg>
        Attached to your report immediately, and reviewed by responders before it's available to everyone.
      </p>
    </div>
  </div>
</template>
