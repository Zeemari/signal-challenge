<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../lib/api.js'
import { INSTITUTION_TYPES } from '../lib/sources.js'

const users = ref([])
const loading = ref(true)
const error = ref(null)
const busy = ref(null)

async function load() {
  try {
    users.value = (await apiFetch('/api/admin-users')).users
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function update(user, field, value) {
  busy.value = user.id
  try {
    const data = { user_id: user.id }
    data[field] = value
    await apiFetch('/api/admin-users', { method: 'PATCH', body: JSON.stringify(data) })
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = null
  }
}

function updateRole(user, value) { return update(user, 'role', value) }
function toggleActive(user) { return update(user, 'is_active', !user.is_active) }
function toggleSms(user) { return update(user, 'sms_alerts_enabled', !user.sms_alerts_enabled) }
function updatePhone(user, value) { return update(user, 'phone', value) }
function updateInstitutionName(user, value) { return update(user, 'institution_name', value) }
function updateInstitutionType(user, value) { return update(user, 'institution_type', value) }

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--color-brand-600)">Administration</p>
      <h1 class="mt-2 text-[28px] font-bold leading-tight tracking-tight text-slate-900">Users</h1>
      <p class="mt-1.5 text-sm text-slate-500">Manage access without exposing role decisions to the browser.</p>
    </div>

    <p v-if="error" class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>

    <ul v-else class="space-y-3">
      <li v-for="user in users" :key="user.id" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-900">{{ user.email || user.display_name || 'Signal user' }}</p>
            <p class="mt-0.5 truncate text-xs text-slate-400">{{ user.id }}</p>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
          >
            {{ user.is_active ? 'Active' : 'Inactive' }}
          </span>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <select
            :value="user.role"
            :disabled="busy === user.id"
            @change="updateRole(user, $event.target.value)"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
          >
            <option value="citizen">Citizen</option>
            <option value="responder">Responder</option>
            <option value="admin">Admin</option>
          </select>
          <button
            :disabled="busy === user.id"
            @click="toggleActive(user)"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {{ user.is_active ? 'Deactivate' : 'Activate' }}
          </button>
        </div>

        <div v-if="user.role !== 'citizen'" class="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
          <div class="flex flex-wrap items-center gap-2">
            <input
              :value="user.phone"
              :disabled="busy === user.id"
              type="tel"
              placeholder="+234... (for danger alert SMS)"
              class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
              @change="updatePhone(user, $event.target.value)"
            />
            <button
              :disabled="busy === user.id"
              @click="toggleSms(user)"
              class="shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              :class="user.sms_alerts_enabled ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-500'"
            >
              SMS alerts {{ user.sms_alerts_enabled ? 'on' : 'off' }}
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              :value="user.institution_name"
              :disabled="busy === user.id"
              type="text"
              placeholder="Institution (e.g. Mopol Station, Enugu)"
              class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
              @change="updateInstitutionName(user, $event.target.value)"
            />
            <select
              :value="user.institution_type || ''"
              :disabled="busy === user.id"
              @change="updateInstitutionType(user, $event.target.value)"
              class="shrink-0 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 disabled:opacity-50"
            >
              <option value="">No institution type</option>
              <option v-for="t in INSTITUTION_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <p v-if="user.institution_name" class="text-xs text-slate-400">
            Reports they submit will be attributed to "{{ user.institution_name }}".
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>
