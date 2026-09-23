<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../lib/api.js'

const reports = ref([])
const signals = ref([])
const loading = ref(true)
const error = ref(null)
const busy = ref(null)
const notes = ref({})
const statusOptions = ['emerging', 'corroborating', 'conflicting', 'unconfirmed']

async function load() {
  try {
    const data = await apiFetch('/api/responder-reports')
    reports.value = data.reports
    signals.value = data.signals
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
async function review(report, action) {
  busy.value = report.id
  try { await apiFetch('/api/review-report', { method: 'POST', body: JSON.stringify({ report_id: report.id, action, notes: notes.value[report.id] || '' }) }); await load() }
  catch (e) { error.value = e.message }
  finally { busy.value = null }
}
function verifyReport(report) { return review(report, 'verify') }
function rejectReport(report) { return review(report, 'reject') }
async function updateSignal(signal, status) {
  busy.value = signal.id
  try { await apiFetch('/api/update-signal', { method: 'PATCH', body: JSON.stringify({ signal_id: signal.id, status, review_status: signal.review_status, notes: signal.responder_notes || '' }) }); await load() }
  catch (e) { error.value = e.message }
  finally { busy.value = null }
}
onMounted(load)
</script>

<template>
  <div>
    <div class='mb-6'>
      <p class='text-xs font-semibold uppercase tracking-[0.16em]' style='color: var(--color-brand-600)'>Responder workspace</p>
      <h1 class='mt-2 text-[28px] font-bold leading-tight tracking-tight text-slate-900'>Review queue</h1>
      <p class='mt-1.5 text-sm text-slate-500'>Review incoming reports and keep signal status current.</p>
    </div>
    <p v-if='error' class='mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{{ error }}</p>
    <div v-if='loading' class='space-y-3'><div v-for='i in 3' :key='i' class='h-28 animate-pulse rounded-2xl border border-slate-200 bg-white' /></div>
    <template v-else>
      <section class='mb-7'>
        <h2 class='mb-2 text-sm font-semibold text-slate-900'>Reports</h2>
        <div v-if='!reports.length' class='rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500'>No reports in the queue.</div>
        <ul v-else class='space-y-3'>
          <li v-for='report in reports' :key='report.id' class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
            <div class='flex items-start justify-between gap-3'><p class='text-sm leading-relaxed text-slate-800'>{{ report.content }}</p><span class='shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600'>{{ report.review_status }}</span></div>
            <p class='mt-2 text-xs text-slate-500'>{{ report.location }} · {{ report.source_type }}<span v-if="report.responder_name" class="ml-2 font-semibold text-teal-700">· Submitted by {{ report.responder_name }} (Responder)</span></p>
            <textarea v-model='notes[report.id]' rows='2' placeholder='Optional responder note' class='mt-3 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm' />
            <div class='mt-2 flex gap-2'><button :disabled='busy === report.id' @click='verifyReport(report)' class='rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50'>Verify</button><button :disabled='busy === report.id' @click='rejectReport(report)' class='rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50'>Reject</button></div>
          </li>
        </ul>
      </section>
      <section>
        <h2 class='mb-2 text-sm font-semibold text-slate-900'>Signal status</h2>
        <ul class='space-y-3'>
          <li v-for='signal in signals' :key='signal.id' class='rounded-2xl border border-slate-200 bg-white p-4'>
            <div class='flex items-start justify-between gap-3'><div><p class='font-semibold text-slate-900'>{{ signal.title }}</p><p class='mt-1 text-xs text-slate-500'>{{ signal.review_status }} · {{ signal.status }}</p></div><select :value='signal.status' @change='updateSignal(signal, $event.target.value)' class='rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs'><option v-for='status in statusOptions' :key='status' :value='status'>{{ status }}</option></select></div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
