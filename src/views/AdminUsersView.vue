<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../lib/api.js'

const users = ref([])
const loading = ref(true)
const error = ref(null)
const busy = ref(null)
async function load() {
  try { users.value = (await apiFetch('/api/admin-users')).users }
  catch (e) { error.value = e.message }
  finally { loading.value = false }
}
async function update(user, field, value) {
  busy.value = user.id
  try { const data = { user_id: user.id }; data[field] = value; await apiFetch('/api/admin-users', { method: 'PATCH', body: JSON.stringify(data) }); await load() }
  catch (e) { error.value = e.message }
  finally { busy.value = null }
}
function updateRole(user, value) { return update(user, 'role', value) }
function toggleActive(user) { return update(user, 'is_active', !user.is_active) }
onMounted(load)
</script>

<template>
  <div>
    <div class='mb-6'><p class='text-xs font-semibold uppercase tracking-[0.16em]' style='color: var(--color-brand-600)'>Administration</p><h1 class='mt-2 text-[28px] font-bold leading-tight tracking-tight text-slate-900'>Users</h1><p class='mt-1.5 text-sm text-slate-500'>Manage access without exposing role decisions to the browser.</p></div>
    <p v-if='error' class='mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{{ error }}</p>
    <div v-if='loading' class='space-y-3'><div v-for='i in 3' :key='i' class='h-20 animate-pulse rounded-2xl border border-slate-200 bg-white' /></div>
    <ul v-else class='space-y-3'>
      <li v-for='user in users' :key='user.id' class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div class='flex items-start justify-between gap-3'><div><p class='text-sm font-semibold text-slate-900'>{{ user.email || user.display_name || 'Signal user' }}</p><p class='mt-1 text-xs text-slate-500'>{{ user.id }}</p></div><span class='rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600'>{{ user.is_active ? 'Active' : 'Inactive' }}</span></div>
        <div class='mt-3 flex flex-wrap items-center gap-2'><select :value='user.role' :disabled='busy === user.id' @change='updateRole(user, $event.target.value)' class='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm'><option value='citizen'>Citizen</option><option value='responder'>Responder</option><option value='admin'>Admin</option></select><button :disabled='busy === user.id' @click='toggleActive(user)' class='rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600'>{{ user.is_active ? 'Deactivate' : 'Activate' }}</button></div>
      </li>
    </ul>
  </div>
</template>
