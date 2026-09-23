<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../lib/api.js'
import { INSTITUTION_TYPES } from '../lib/sources.js'

const users = ref([])
const loading = ref(true)
const error = ref(null)
const busy = ref(null)

const showAddModal = ref(false)
const adding = ref(false)
const addError = ref(null)
const newEmail = ref('')
const newDisplayName = ref('')
const newRole = ref('citizen')
const newPassword = ref('')
const createdCredential = ref(null) // { email, temp_password }

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
  newPassword.value = out + '!1'
}

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
function toggleVerifiedCorrespondent(user) { return update(user, 'is_verified_correspondent', !user.is_verified_correspondent) }
function toggleSms(user) { return update(user, 'sms_alerts_enabled', !user.sms_alerts_enabled) }
function updatePhone(user, value) { return update(user, 'phone', value) }
function updateInstitutionName(user, value) { return update(user, 'institution_name', value) }
function updateInstitutionType(user, value) { return update(user, 'institution_type', value) }

function openAddModal() {
  newEmail.value = ''
  newDisplayName.value = ''
  newRole.value = 'citizen'
  newPassword.value = ''
  addError.value = null
  showAddModal.value = true
}

async function submitAddUser() {
  if (!newEmail.value.trim() || newPassword.value.length < 8 || adding.value) return
  adding.value = true
  addError.value = null
  try {
    const res = await apiFetch('/api/admin-users', {
      method: 'POST',
      body: JSON.stringify({
        email: newEmail.value.trim(),
        display_name: newDisplayName.value.trim() || undefined,
        role: newRole.value,
        password: newPassword.value,
      }),
    })
    showAddModal.value = false
    createdCredential.value = { email: res.user.email, password: newPassword.value }
    await load()
  } catch (e) {
    addError.value = e.message
  } finally {
    adding.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--color-brand-600)">Administration</p>
        <h1 class="mt-2 text-[28px] font-bold leading-tight tracking-tight text-slate-900">Users</h1>
        <p class="mt-1.5 text-sm text-slate-500">Manage access and see what each role can see.</p>
      </div>
      <button
        type="button"
        @click="openAddModal"
        class="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
        style="background-color: var(--color-brand-500)"
      >
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
          <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        Add user
      </button>
    </div>

    <div v-if="createdCredential" class="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p class="text-sm font-semibold text-emerald-800">
        Account created for {{ createdCredential.email }}
      </p>
      <p class="mt-1 text-sm text-emerald-700">
        Password: <code class="rounded bg-white px-1.5 py-0.5 font-mono text-[13px]">{{ createdCredential.password }}</code>
      </p>
      <p class="mt-1 text-xs text-emerald-600">Share this with them securely — it won't be shown again. They should change it after signing in.</p>
      <button type="button" @click="createdCredential = null" class="mt-2 text-xs font-semibold text-emerald-700 underline">Dismiss</button>
    </div>

    <p v-if="error" class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>

    <div v-if="loading" class="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <div v-for="i in 4" :key="i" class="skeleton h-24 rounded-2xl border border-slate-200" />
    </div>

    <div v-else-if="!users.length" class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center">
      <p class="text-sm font-semibold text-slate-700">No users yet</p>
      <p class="mt-1 text-sm text-slate-500">Add one to get started.</p>
    </div>

    <ul v-else class="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <li v-for="user in users" :key="user.id" class="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
          <button
            :disabled="busy === user.id"
            @click="toggleVerifiedCorrespondent(user)"
            class="shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
            :class="user.is_verified_correspondent ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-500'"
          >
            Verified Correspondent {{ user.is_verified_correspondent ? '✓' : 'off' }}
          </button>
        </div>
        <p class="mt-1.5 text-[11px] text-slate-400">
          Set to Responder to see the responder workspace (locations &amp; signal status); Admin also unlocks Users and Locations.
        </p>

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

    <!-- Add user modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40" @click="showAddModal = false" />
      <div class="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900">Add user</h2>
          <button type="button" @click="showAddModal = false" class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="submitAddUser" class="mt-4 space-y-3">
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-700">Email</label>
            <input
              v-model="newEmail"
              type="email"
              required
              placeholder="name@example.com"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2"
              style="--tw-ring-color: var(--color-brand-400)"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-700">Display name (optional)</label>
            <input
              v-model="newDisplayName"
              type="text"
              placeholder="Jane Doe"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2"
              style="--tw-ring-color: var(--color-brand-400)"
            />
          </div>
          <div>
            <div class="mb-1 flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-700">Password</label>
              <button type="button" @click="generatePassword" class="text-[11px] font-semibold" style="color: var(--color-brand-600)">Generate</button>
            </div>
            <input
              v-model="newPassword"
              type="text"
              required
              minlength="8"
              placeholder="At least 8 characters"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm focus:border-transparent focus:outline-none focus:ring-2"
              style="--tw-ring-color: var(--color-brand-400)"
            />
            <p class="mt-1 text-[11px] text-slate-400">They'll sign in with this email + password — share it with them yourself.</p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-700">Role</label>
            <select
              v-model="newRole"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="citizen">Citizen</option>
              <option value="responder">Responder</option>
              <option value="admin">Admin</option>
            </select>
            <p class="mt-1 text-[11px] text-slate-400">You can pick Responder here to preview the responder workspace right away.</p>
          </div>

          <p v-if="addError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ addError }}</p>

          <button
            type="submit"
            :disabled="adding || !newEmail.trim() || newPassword.length < 8"
            class="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            style="background-color: var(--color-brand-500)"
          >
            {{ adding ? 'Creating…' : 'Create user' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
