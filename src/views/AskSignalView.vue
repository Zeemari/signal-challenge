<script setup>
import { ref } from 'vue'
import { formatClock } from '../lib/time.js'

const question = ref('')
const asking = ref(false)
const error = ref(null)
const answer = ref(null)

async function ask() {
  if (!question.value.trim() || asking.value) return
  asking.value = true
  error.value = null
  answer.value = null
  try {
    const res = await fetch('/api/ask-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.value.trim() }),
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
    <h1 class="text-xl font-semibold text-slate-900 mb-1">Ask SIGNAL</h1>
    <p class="text-sm text-slate-500 mb-5">Ask about a specific location, e.g. "What do we know about Northern Road?"</p>

    <form @submit.prevent="ask" class="flex gap-2 mb-5">
      <input
        v-model="question"
        placeholder="What do we know about Northern Road?"
        class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        :disabled="asking"
        class="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        style="background-color: var(--color-brand-500)"
      >
        {{ asking ? '…' : 'Ask' }}
      </button>
    </form>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div v-if="answer" class="space-y-4">
      <section>
        <h2 class="text-sm font-semibold text-slate-900 mb-1">Current picture</h2>
        <p class="text-sm text-slate-700 leading-relaxed">{{ answer.current_picture }}</p>
      </section>

      <section v-if="answer.what_supports_this?.length">
        <h2 class="text-sm font-semibold text-slate-900 mb-1">What supports this</h2>
        <ul class="text-sm text-slate-700 list-disc pl-5 space-y-0.5">
          <li v-for="(item, i) in answer.what_supports_this" :key="i">{{ item }}</li>
        </ul>
      </section>

      <section>
        <h2 class="text-sm font-semibold text-slate-900 mb-1">What is unknown</h2>
        <ul class="text-sm text-amber-700 list-disc pl-5 space-y-0.5">
          <li v-for="(item, i) in answer.what_is_unknown" :key="i">{{ item }}</li>
        </ul>
      </section>

      <p v-if="answer.last_updated" class="text-xs text-slate-500">
        Last updated: {{ formatClock(answer.last_updated) }}
      </p>
    </div>
  </div>
</template>
