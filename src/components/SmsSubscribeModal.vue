<script setup>
import { ref, computed } from 'vue'
import CascadingLocationPicker from './CascadingLocationPicker.vue'

const props = defineProps({
  locationName: { type: String, default: '' },
  locationId: { type: String, default: null },
  lgaId: { type: String, default: null },
})

const emit = defineEmits(['close'])

const step = ref('input') // 'input' | 'verify' | 'active'
const phone = ref('')
const code = ref('')
const subscriptionId = ref(null)
const loading = ref(false)
const error = ref(null)
const successMessage = ref('')

// Cascading Location Picker state
const pickerData = ref({})
const isCustomizingLocation = ref(false)

const hasPresetLocation = computed(() => {
  return (!!props.locationId || !!props.lgaId || (!!props.locationName && props.locationName !== 'Your Area')) && !isCustomizingLocation.value
})

const effectiveLocationName = computed(() => {
  if (hasPresetLocation.value) return props.locationName
  if (pickerData.value.location_text) return pickerData.value.location_text
  if (pickerData.value.custom_location_name) return pickerData.value.custom_location_name
  return ''
})

const isPhoneValid = computed(() => {
  const p = phone.value.trim()
  return p.length >= 8
})

const isLocationValid = computed(() => {
  if (hasPresetLocation.value) return true
  return pickerData.value.isValid || !!pickerData.value.lga_id || !!pickerData.value.location_id
})

async function handleSubscribe() {
  if (!isPhoneValid.value) return
  if (!isLocationValid.value) {
    error.value = 'Please select a State and LGA/Area to receive alerts.'
    return
  }

  loading.value = true
  error.value = null
  try {
    const payload = {
      phone_number: phone.value.trim(),
      location_id: hasPresetLocation.value ? props.locationId : (pickerData.value.location_id || null),
      lga_id: hasPresetLocation.value ? props.lgaId : (pickerData.value.lga_id || null),
      location_text: effectiveLocationName.value,
      custom_location_name: pickerData.value.custom_location_name || null,
    }

    const res = await fetch('/api/sms/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send confirmation code')

    subscriptionId.value = data.subscription_id
    if (data.phone_number) phone.value = data.phone_number
    step.value = 'verify'
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleVerify() {
  if (!code.value.trim()) return
  loading.value = true
  error.value = null
  try {
    const res = await fetch('/api/sms/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription_id: subscriptionId.value,
        code: code.value.trim(),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Invalid code')

    successMessage.value = data.message || 'Subscription active!'
    step.value = 'active'
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleUnsubscribe() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch('/api/sms/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription_id: subscriptionId.value,
        phone_number: phone.value.trim(),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to unsubscribe')

    step.value = 'input'
    phone.value = ''
    code.value = ''
    subscriptionId.value = null
    successMessage.value = 'Unsubscribed successfully.'
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
    <div class="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
      <!-- Close Button -->
      <button
        @click="emit('close')"
        class="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Header Icon & Title -->
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900">SMS Safety Alerts</h3>
          <p class="text-xs text-slate-500">
            Get instant SMS alerts when safety reports are corroborated.
          </p>
        </div>
      </div>

      <!-- Alert Error Banner -->
      <div v-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        {{ error }}
      </div>

      <!-- Step 1: Input Phone Number & Location Selection -->
      <div v-if="step === 'input'" class="mt-5 space-y-4">
        <!-- Location Picker / Target Area Display -->
        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Target Location / LGA</label>

          <div v-if="hasPresetLocation" class="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/60 p-3">
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="text-xs font-semibold text-teal-900">{{ effectiveLocationName }}</span>
            </div>
            <button
              @click="isCustomizingLocation = true"
              class="text-[11px] font-semibold text-teal-700 hover:underline"
            >
              Change
            </button>
          </div>

          <!-- Cascading Picker if no preset location -->
          <div v-else class="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
            <CascadingLocationPicker v-model="pickerData" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600">Phone Number</label>
          <input
            v-model="phone"
            type="tel"
            placeholder="+234 801 234 5678"
            class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
          <p class="mt-1 text-[11px] text-slate-400">Include country code (e.g. +234 for Nigeria).</p>
        </div>

        <button
          :disabled="!isPhoneValid || !isLocationValid || loading"
          @click="handleSubscribe"
          class="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-700 disabled:opacity-50"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
            Sending code...
          </span>
          <span v-else>Send Confirmation Code</span>
        </button>
      </div>

      <!-- Step 2: Verify 6-digit OTP Code -->
      <div v-else-if="step === 'verify'" class="mt-5 space-y-4">
        <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          We sent a 6-digit verification code to <span class="font-semibold text-slate-900">{{ phone }}</span>.
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600">6-Digit Code</label>
          <input
            v-model="code"
            type="text"
            maxlength="6"
            placeholder="123456"
            class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-center text-lg font-bold tracking-widest text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div class="flex gap-2">
          <button
            @click="step = 'input'"
            class="w-1/3 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            :disabled="!code || loading"
            @click="handleVerify"
            class="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-700 disabled:opacity-50"
          >
            <span v-if="loading">Verifying...</span>
            <span v-else>Confirm & Subscribe</span>
          </button>
        </div>
      </div>

      <!-- Step 3: Active Subscription Confirmation -->
      <div v-else-if="step === 'active'" class="mt-5 text-center space-y-4">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h4 class="text-base font-bold text-slate-900">Subscription Active!</h4>
          <p class="mt-1 text-xs text-slate-500">
            You will receive SMS alerts for <span class="font-medium text-slate-800">{{ effectiveLocationName || 'this location' }}</span> when safety events are corroborated.
          </p>
        </div>

        <div class="pt-2 flex flex-col gap-2">
          <button
            @click="emit('close')"
            class="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Done
          </button>

          <button
            :disabled="loading"
            @click="handleUnsubscribe"
            class="text-xs font-medium text-red-600 hover:underline"
          >
            Unsubscribe from this location
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
