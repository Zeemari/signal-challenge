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
  <div class="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
    <div class="flex items-center justify-between">
      <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Location Hierarchy (Nigeria)</label>
      <span v-if="loadingStates || loadingLgas || loadingLocations" class="text-xs text-brand-600 animate-pulse">Loading data…</span>
    </div>

    <!-- 1. State Selector -->
    <div>
      <label class="mb-1 block text-xs font-semibold text-slate-600">1. State</label>
      <select
        v-model="selectedStateId"
        :disabled="loadingStates"
        class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
      >
        <option value="" disabled>Select State…</option>
        <option v-for="st in states" :key="st.id" :value="st.id">{{ st.name }} ({{ st.code }})</option>
      </select>
    </div>

    <!-- 2. LGA Selector -->
    <div v-if="selectedStateId">
      <label class="mb-1 block text-xs font-semibold text-slate-600">2. Local Government Area (LGA)</label>
      <select
        v-model="selectedLgaId"
        :disabled="loadingLgas || !lgas.length"
        class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/20 disabled:bg-slate-100"
      >
        <option value="" disabled>{{ loadingLgas ? 'Loading LGAs…' : 'Select LGA…' }}</option>
        <option v-for="lga in lgas" :key="lga.id" :value="lga.id">{{ lga.name }}</option>
      </select>
    </div>

    <!-- 3. Location / Landmark Selector -->
    <div v-if="selectedLgaId">
      <label class="mb-1 block text-xs font-semibold text-slate-600">3. Specific Area / Landmark / Junction</label>
      <select
        v-model="selectedLocationId"
        :disabled="loadingLocations"
        class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
      >
        <option value="" disabled>Select known landmark or area…</option>
        <option v-for="loc in locations" :key="loc.id" :value="loc.id">
          {{ loc.name }} {{ loc.status === 'pending' ? '(Pending Approval)' : '' }}
        </option>
        <option value="__other__">📍 My area isn't listed (Suggest new area)</option>
      </select>
    </div>

    <!-- Custom Location Input -->
    <div v-if="isCustomLocation" class="pt-1">
      <label class="mb-1 block text-xs font-semibold text-amber-800">
        Suggest New Area / Landmark Name
      </label>
      <input
        v-model="customLocationName"
        type="text"
        placeholder="e.g. Firewood Market Junction"
        class="w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
      />
      <p class="mt-1.5 text-[11px] text-slate-500">
        ℹ️ Your suggested location will be attached to your report immediately. It will be reviewed by responders before becoming available to all users.
      </p>
    </div>
  </div>
</template>
