<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import SignalMark from '../components/SignalMark.vue'

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
  <div class="flex min-h-screen w-full">
    <!-- Brand panel -->
    <div
      class="relative hidden w-1/2 shrink-0 flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14"
      style="background-color: var(--color-brand-700)"
    >
      <div class="absolute -right-24 -top-24 h-72 w-72 rounded-full" style="background-color: var(--color-brand-600)" />
      <div class="absolute -bottom-32 -left-16 h-96 w-96 rounded-full" style="background-color: var(--color-brand-800)" />

      <RouterLink to="/" class="relative z-10 flex items-center gap-2.5">
        <SignalMark class="h-10 w-10" />
        <span class="text-lg font-extrabold tracking-tight">SIGNAL</span>
      </RouterLink>

      <div class="relative z-10 max-w-md">
        <h2 class="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">Know what's known, see what's fresh.</h2>
        <p class="mt-4 text-sm leading-relaxed text-white/75">
          SIGNAL organizes community reports so you can see what's being reported nearby and how well it's corroborated
          — transparent, time-sensitive, and never a substitute for trusted local authorities.
        </p>
      </div>

      <p class="relative z-10 text-xs text-white/50">SIGNAL &middot; Community reporting, plainly explained.</p>
    </div>

    <!-- Form panel -->
    <div class="flex w-full flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">
      <div class="mx-auto w-full max-w-sm">
        <RouterLink to="/" class="mb-8 flex items-center gap-2.5 lg:hidden">
          <SignalMark class="h-9 w-9" />
          <span class="text-base font-extrabold tracking-tight text-slate-900">SIGNAL</span>
        </RouterLink>

        <p class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--color-brand-600)">SIGNAL access</p>
        <h1 class="mt-2 text-[28px] font-bold leading-tight tracking-tight text-slate-900">
          {{ signup ? 'Create your account' : 'Welcome back' }}
        </h1>
        <p class="mt-1.5 text-sm text-slate-500">
          {{ signup ? 'Join SIGNAL to submit and track reports.' : 'Sign in to continue to SIGNAL.' }}
        </p>

        <form @submit.prevent="submit" class="mt-6 space-y-4">
          <label v-if="signup" class="block text-sm font-semibold text-slate-800">
            Name
            <input v-model="displayName" class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-brand-400)" autocomplete="name" />
          </label>
          <label class="block text-sm font-semibold text-slate-800">
            Email
            <input v-model="email" required type="email" class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-brand-400)" autocomplete="email" />
          </label>
          <label class="block text-sm font-semibold text-slate-800">
            Password
            <input v-model="password" required type="password" minlength="6" class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-brand-400)" autocomplete="current-password" />
          </label>
          <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>
          <p v-if="message" class="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ message }}</p>
          <button :disabled="busy" class="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.99] disabled:opacity-50" style="background-color: var(--color-brand-500)">
            {{ busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in' }}
          </button>
          <RouterLink :to="switchPath" class="block text-center text-sm font-medium text-slate-600 hover:text-slate-900">
            {{ signup ? 'Already have an account? Sign in' : 'New to SIGNAL? Create an account' }}
          </RouterLink>
        </form>
      </div>
    </div>
  </div>
</template>
