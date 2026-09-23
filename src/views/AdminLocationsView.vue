<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiFetch } from '../lib/api.js'

const states = ref([])
const lgas = ref([])
const approvedLocations = ref([])
const loading = ref(true)
const error = ref(null)

const selectedStateId = ref('')
const selectedLgaId = ref('')
const newLocationName = ref('')
const adding = ref(false)
const addSuccess = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await apiFetch('/api/admin-locations')
    if (data.hierarchy) {
      states.value = data.hierarchy.states || []
      lgas.value = data.hierarchy.lgas || []
      approvedLocations.value = data.hierarchy.approved_locations || []
      if (states.value.length && !selectedStateId.value) {
        selectedStateId.value = states.value[0].id
      }
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const filteredLgas = computed(() => {
  if (!selectedStateId.value) return []
  return lgas.value.filter((l) => l.state_id === selectedStateId.value)
})

watchSelectedState()
function watchSelectedState() {
  if (filteredLgas.value.length) {
    selectedLgaId.value = filteredLgas.value[0].id
  } else {
    selectedLgaId.value = ''
  }
}

const currentLocations = computed(() => {
  if (!selectedLgaId.value) return []
  return approvedLocations.value.filter((loc) => loc.lga_id === selectedLgaId.value)
})

async function addAdminLocation() {
  if (!selectedLgaId.value || !newLocationName.value.trim() || adding.value) return
  adding.value = true
  error.value = null
  addSuccess.value = null
  try {
    const res = await apiFetch('/api/admin-locations', {
      method: 'POST',
      body: JSON.stringify({
        lga_id: selectedLgaId.value,
        name: newLocationName.value.trim(),
      }),
    })
    addSuccess.value = `Location "${res.location.name}" added successfully as Admin Approved.`
    newLocationName.value = ''
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    adding.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--color-brand-600)">Administration</p>
      <h1 class="mt-2 text-[28px] font-bold leading-tight tracking-tight text-slate-900">Location Hierarchy</h1>
      <p class="mt-1.5 text-sm text-slate-500">Browse official Nigerian states, LGAs, and active approved landmarks. Admins can directly seed trusted areas.</p>
    </div>

    <p v-if="error" class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>
    <p v-if="addSuccess" class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ addSuccess }}</p>

    <div v-if="loading" class="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />

    <template v-else>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Column 1: States Selector (Read-only static data) -->
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">1. States ({{ states.length }})</h2>
          <div class="max-h-[420px] overflow-y-auto space-y-1 pr-1">
            <button
              v-for="st in states"
              :key="st.id"
              @click="selectedStateId = st.id; watchSelectedState()"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors"
              :class="selectedStateId === st.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'"
            >
              <span>{{ st.name }}</span>
              <span class="rounded bg-slate-200/50 px-1.5 py-0.5 text-[10px]" :class="selectedStateId === st.id ? 'text-slate-900' : 'text-slate-500'">{{ st.code }}</span>
            </button>
          </div>
        </div>

        <!-- Column 2: LGAs Selector (Read-only static data) -->
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">
            2. LGAs ({{ filteredLgas.length }})
          </h2>
          <div v-if="!filteredLgas.length" class="text-xs text-slate-400 py-8 text-center">Select a state first</div>
          <div v-else class="max-h-[420px] overflow-y-auto space-y-1 pr-1">
            <button
              v-for="lga in filteredLgas"
              :key="lga.id"
              @click="selectedLgaId = lga.id"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors"
              :class="selectedLgaId === lga.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'"
            >
              <span>{{ lga.name }}</span>
            </button>
          </div>
        </div>

        <!-- Column 3: Approved Locations & Add Trusted Location Form -->
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h2 class="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">
              3. Approved Locations ({{ currentLocations.length }})
            </h2>
            <div v-if="!selectedLgaId" class="text-xs text-slate-400 py-8 text-center">Select an LGA to view locations</div>
            <div v-else-if="!currentLocations.length" class="text-xs text-slate-500 py-8 text-center">
              No approved locations yet for this LGA. Add one below.
            </div>
            <ul v-else class="max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
              <li
                v-for="loc in currentLocations"
                :key="loc.id"
                class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800"
              >
                <span>📍 {{ loc.name }}</span>
                <span
                  class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  :class="loc.source === 'admin' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'"
                >
                  {{ loc.source === 'admin' ? 'Admin Trusted' : 'Community Approved' }}
                </span>
              </li>
            </ul>
          </div>

          <!-- Add Admin Location Form -->
          <div v-if="selectedLgaId" class="mt-4 pt-4 border-t border-slate-200">
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Directly Add Trusted Area / Landmark</label>
            <div class="flex gap-2">
              <input
                v-model="newLocationName"
                type="text"
                placeholder="Landmark name..."
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                :disabled="!newLocationName.trim() || adding"
                @click="addAdminLocation"
                class="shrink-0 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                style="background-color: var(--color-brand-600)"
              >
                {{ adding ? 'Adding…' : '+ Add' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
