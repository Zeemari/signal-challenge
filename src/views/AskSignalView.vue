<script setup>
import { ref } from 'vue'
import { formatClock } from '../lib/time.js'

const question = ref('')
const asking = ref(false)
const error = ref(null)
const answer = ref(null)

const suggestions = [
  'What do we know about Northern Road?',
  'Any updates on Market Road?',
  "What's happening at Riverside Junction?",
]

async function ask(q) {
  const text = (q ?? question.value).trim()
  if (!text || asking.value) return
  question.value = text
  asking.value = true
  error.value = null
  answer.value = null
  try {
    const res = await fetch('/api/ask-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Something went wrong')
    }
    answer.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    asking.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-[28px] font-bold leading-tight tracking-tight text-slate-900">Ask SIGNAL</h1>
    <p class="mt-1.5 mb-5 text-sm text-slate-500">
      Ask about a specific location. Answers come only from stored reports — never a safety verdict.
    </p>

    <form @submit.prevent="ask()" class="mb-3 flex gap-2">
      <input
        v-model="question"
        placeholder="What do we know about Northern Road?"
        class="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2"
        style="--tw-ring-color: var(--color-brand-400)"
      />
      <button
        type="submit"
        :disabled="asking || !question.trim()"
        class="flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-900/15 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        style="background-color: var(--color-brand-500)"
      >
        <svg v-if="asking" class="h-4 w-4 animate-spin" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="2" opacity="0.25" />
          <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span v-else>Ask</span>
      </button>
    </form>

    <div v-if="!answer && !asking" class="mb-6 flex flex-wrap gap-1.5">
      <button
        v-for="s in suggestions"
        :key="s"
        type="button"
        @click="ask(s)"
        class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
      >
        {{ s }}
      </button>
    </div>

    <p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

    <div v-if="asking" class="space-y-3">
      <div class="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div class="h-16 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>

    <div v-else-if="answer" class="space-y-4">
      <section class="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 class="mb-1.5 text-sm font-semibold text-slate-900">Current picture</h2>
        <p class="text-sm leading-relaxed text-slate-700">{{ answer.current_picture }}</p>
      </section>

      <section v-if="answer.what_supports_this?.length" class="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <svg class="h-4 w-4 shrink-0" style="color: var(--color-fresh)" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.4" />
            <path d="M6.8 10.2l2.1 2.1 4.3-4.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          What supports this
        </h2>
        <ul class="space-y-1 pl-0.5 text-sm text-slate-700">
          <li v-for="(item, i) in answer.what_supports_this" :key="i" class="flex items-start gap-2">
            <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
            <span>{{ item }}</span>
          </li>
        </ul>
      </section>

      <section class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none">
            <path d="M10 2.5 18 16.5H2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
            <path d="M10 8v3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            <circle cx="10" cy="14" r="0.8" fill="currentColor" />
          </svg>
          What is unknown
        </h2>
        <ul class="space-y-1 pl-0.5 text-sm text-amber-700">
          <li v-for="(item, i) in answer.what_is_unknown" :key="i" class="flex items-start gap-2">
            <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
            <span>{{ item }}</span>
          </li>
        </ul>
      </section>

      <p v-if="answer.last_updated" class="text-xs text-slate-500">
        Last updated: {{ formatClock(answer.last_updated) }}
      </p>
    </div>
  </div>
</template>
