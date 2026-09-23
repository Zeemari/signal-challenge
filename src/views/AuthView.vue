<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'

const props = defineProps({ mode: { type: String, default: 'login' } })
const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const displayName = ref('')
const busy = ref(false)
const error = ref(null)
const message = ref(null)
const signup = computed(() => props.mode === 'signup')
const switchPath = computed(() => signup.value ? '/login' : '/signup')

async function submit() {
  if (busy.value) return
  busy.value = true; error.value = null; message.value = null
  try {
    const result = signup.value
      ? await supabase.auth.signUp({ email: email.value.trim(), password: password.value, options: { data: { display_name: displayName.value.trim() } } })
      : await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value })
    if (result.error) throw result.error
    if (signup.value && !result.data.session) message.value = 'Check your email to confirm your account, then sign in.'
    else router.replace(route.query.redirect || '/')
  } catch (e) { error.value = e.message || 'Unable to continue' }
  finally { busy.value = false }
}
</script>
<template>
  <div class='mx-auto max-w-md'>
    <div class='mb-6'>
      <p class='text-xs font-semibold uppercase tracking-[0.16em]' style='color: var(--color-brand-600)'>SIGNAL access</p>
      <h1 class='mt-2 text-[28px] font-bold leading-tight tracking-tight text-slate-900'>Account access</h1>
    </div>
    <form @submit.prevent='submit' class='space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <label v-if='signup' class='block text-sm font-semibold text-slate-800'>Name <input v-model='displayName' class='mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm' autocomplete='name' /></label>
      <label class='block text-sm font-semibold text-slate-800'>Email <input v-model='email' required type='email' class='mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm' autocomplete='email' /></label>
      <label class='block text-sm font-semibold text-slate-800'>Password <input v-model='password' required type='password' minlength='6' class='mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm' autocomplete='current-password' /></label>
      <p v-if='error' class='rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700'>{{ error }}</p>
      <p v-if='message' class='rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>{{ message }}</p>
      <button :disabled='busy' class='w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50' style='background-color: var(--color-brand-500)'>{{ busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in' }}</button>
      <RouterLink :to='switchPath' class='block text-center text-sm font-medium text-slate-600 hover:text-slate-900'>{{ signup ? 'Already have an account? Sign in' : 'New to SIGNAL? Create an account' }}</RouterLink>
    </form>
  </div>
</template>
