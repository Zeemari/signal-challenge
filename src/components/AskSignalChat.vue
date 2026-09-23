<script setup>
import { ref, nextTick } from 'vue'
import { formatClock } from '../lib/time.js'
import SignalMark from './SignalMark.vue'

const props = defineProps({
  variant: { type: String, default: 'page' }, // 'page' | 'panel'
})
defineEmits(['close'])

const question = ref('')
const asking = ref(false)
const messages = ref([])
const scrollEl = ref(null)

const suggestions = [
  'What do we know about Mopol Junction?',
  'What do we know about Northern Road?',
  'Any updates on Market Road?',
]

let nextId = 1

async function scrollToBottom() {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}

async function ask(q) {
  const text = (q ?? question.value).trim()
  if (!text || asking.value) return
  question.value = ''
  messages.value.push({ id: nextId++, role: 'user', text })
  asking.value = true
  scrollToBottom()

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
    const answer = await res.json()
    messages.value.push({ id: nextId++, role: 'assistant', answer })
  } catch (e) {
    messages.value.push({ id: nextId++, role: 'assistant', error: e.message })
  } finally {
    asking.value = false
    scrollToBottom()
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <header v-if="variant === 'panel'" class="flex shrink-0 items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-4 py-3">
      <div class="flex items-center gap-2">
        <SignalMark class="h-7 w-7" />
        <div class="leading-none">
          <p class="text-sm font-bold text-slate-900">Ask SIGNAL</p>
          <p class="mt-0.5 text-[11px] text-slate-500">AI assistant &middot; reports only</p>
        </div>
      </div>
      <button
        type="button"
        @click="$emit('close')"
        class="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        aria-label="Close chat"
      >
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <template v-else>
      <h1 class="text-[28px] font-bold leading-tight tracking-tight text-slate-900">Ask SIGNAL</h1>
      <p class="mt-1.5 mb-5 text-sm text-slate-500">
        Ask about a specific location. Answers come from stored reports evaluated by AI — never a permanent verdict.
      </p>
    </template>

    <div
      ref="scrollEl"
      class="min-h-0 flex-1 space-y-3 overflow-y-auto"
      :class="variant === 'panel' ? 'bg-slate-50 px-3 py-3' : 'py-1'"
    >
      <div v-if="!messages.length" class="flex flex-1 flex-col items-start justify-end gap-3 py-4">
        <p class="text-sm text-slate-500">Try asking:</p>
        <div class="flex flex-wrap gap-1.5">
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
      </div>

      <template v-for="m in messages" :key="m.id">
        <div v-if="m.role === 'user'" class="flex justify-end">
          <p
            class="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm text-white"
            style="background-color: var(--color-brand-600)"
          >
            {{ m.text }}
          </p>
        </div>

        <div v-else class="flex justify-start">
          <div class="max-w-[92%] space-y-2.5">
            <p v-if="m.error" class="rounded-2xl rounded-bl-sm bg-red-50 px-3.5 py-2 text-sm text-red-700">{{ m.error }}</p>

            <section v-else class="rounded-2xl rounded-bl-sm border border-slate-200 bg-white p-3.5">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-1.5">
                  <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--color-brand-500)" viewBox="0 0 20 20" fill="none">
                    <rect x="3.5" y="2.5" width="13" height="15" rx="1.5" stroke="currentColor" stroke-width="1.4" />
                    <path d="M6.5 6.5h7M6.5 9.5h7M6.5 12.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                  </svg>
                  <h2 class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Situation report</h2>
                </div>

                <div class="flex items-center gap-1.5 flex-wrap">
                  <span
                    v-if="m.answer.is_unsafe"
                    class="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
                  >
                    ⚠️ UNSAFE - Verified Alert
                  </span>

                  <span
                    v-if="m.answer.matched"
                    class="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200"
                  >
                    {{ m.answer.caution_guidance || 'Apply with caution' }}
                  </span>
                </div>
              </div>

              <p class="mt-2 text-sm leading-relaxed text-slate-800">{{ m.answer.current_picture }}</p>
              
              <div v-if="m.answer.matched" class="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
                <span>Updated {{ formatClock(m.answer.last_updated) }} &middot; not independently verified</span>
                <span v-if="m.answer.total_reports_analyzed" class="font-medium text-slate-600">
                  {{ m.answer.total_reports_analyzed }} total report(s) evaluated
                </span>
              </div>

              <div v-if="m.answer.sources_summary?.length" class="mt-3 bg-slate-50 rounded-xl p-2.5">
                <h3 class="mb-1 text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <svg class="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Sources Summary
                </h3>
                <div class="flex flex-wrap gap-1.5 mt-1">
                  <span
                    v-for="(src, idx) in m.answer.sources_summary"
                    :key="idx"
                    class="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700 font-medium"
                  >
                    {{ src }}
                  </span>
                </div>
              </div>

              <div v-if="m.answer.what_supports_this?.length" class="mt-3 border-t border-slate-100 pt-2.5">
                <h3 class="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-900">
                  <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--color-fresh)" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.4" />
                    <path d="M6.8 10.2l2.1 2.1 4.3-4.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  What supports this
                </h3>
                <ul class="space-y-0.5 text-xs text-slate-700">
                  <li v-for="(item, i) in m.answer.what_supports_this" :key="i" class="flex items-start gap-1.5">
                    <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    <span>{{ item }}</span>
                  </li>
                </ul>
              </div>

              <div v-if="m.answer.what_is_unknown?.length" class="mt-3 rounded-xl bg-amber-50 p-2.5">
                <h3 class="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-800">
                  <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2.5 18 16.5H2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
                    <path d="M10 8v3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                    <circle cx="10" cy="14" r="0.8" fill="currentColor" />
                  </svg>
                  What is unknown
                </h3>
                <ul class="space-y-0.5 text-xs text-amber-700">
                  <li v-for="(item, i) in m.answer.what_is_unknown" :key="i" class="flex items-start gap-1.5">
                    <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                    <span>{{ item }}</span>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </template>

      <div v-if="asking" class="flex justify-start">
        <div class="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3">
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay: 0ms" />
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay: 120ms" />
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay: 240ms" />
        </div>
      </div>
    </div>

    <form
      @submit.prevent="ask()"
      class="flex shrink-0 gap-2 border-t border-slate-200 bg-white pt-3"
      :class="variant === 'panel' ? 'rounded-b-2xl px-3 pb-3' : 'px-0 pb-0'"
    >
      <input
        v-model="question"
        placeholder="Ask about a location…"
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
  </div>
</template>
