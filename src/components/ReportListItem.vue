<script setup>
import SourceBadge from './SourceBadge.vue'
import FreshnessBadge from './FreshnessBadge.vue'

defineProps({
  report: { type: Object, required: true },
})

const SITUATION_META = {
  safe: { label: 'Safe', icon: '🟢', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  cautious: { label: 'Cautious', icon: '🟡', class: 'bg-amber-50 text-amber-800 border-amber-200' },
  tense: { label: 'Tense / Uneasy', icon: '🟠', class: 'bg-orange-50 text-orange-800 border-orange-200' },
  dangerous: { label: 'Dangerous', icon: '🔴', class: 'bg-red-50 text-red-800 border-red-200' },
  not_sure: { label: 'Not sure', icon: '⚪', class: 'bg-slate-50 text-slate-700 border-slate-200' },
}
</script>

<template>
  <li class="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
    <!-- Tag ABOVE the report for Responders -->
    <div v-if="report.responder_name" class="mb-2">
      <span class="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
        <svg class="h-3.5 w-3.5 shrink-0 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
        </svg>
        <span>
          Verified Source: {{ report.responder_name }}
          <template v-if="report.responder_institution_name"> · {{ report.responder_institution_name }}</template>
        </span>
      </span>
    </div>

    <!-- Report Content -->
    <p class="text-sm leading-relaxed text-slate-800">{{ report.content }}</p>

    <!-- Location line -->
    <p class="mt-1.5 text-xs text-slate-500">
      📍 {{ report.location }}
      <span
        v-if="report.location_ref?.status === 'pending'"
        class="ml-1.5 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
      >
        🟡 Location Pending Approval
      </span>
    </p>

    <!-- Metadata Badges -->
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span
        v-if="report.perceived_situation && SITUATION_META[report.perceived_situation]"
        class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold"
        :class="SITUATION_META[report.perceived_situation].class"
      >
        <span>{{ SITUATION_META[report.perceived_situation].icon }}</span>
        <span>{{ SITUATION_META[report.perceived_situation].label }}</span>
      </span>
      <SourceBadge :source-type="report.source_type" />
      <FreshnessBadge :timestamp="report.reported_at" />
    </div>
  </li>
</template>
