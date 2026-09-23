<script setup>
import { ref, onMounted } from 'vue'
import ReportListItem from '../components/ReportListItem.vue'
import { apiFetch } from '../lib/api.js'

const reports = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try { reports.value = (await apiFetch('/api/my-reports')).reports }
  catch (e) { error.value = e.message }
  finally { loading.value = false }
})
</script>

<template>
  <div>
    <div class='mb-6'>
      <h1 class='text-[28px] font-bold leading-tight tracking-tight text-slate-900'>My reports</h1>
      <p class='mt-1.5 text-sm text-slate-500'>Reports you have submitted to SIGNAL.</p>
    </div>
    <div v-if='loading' class='space-y-3'><div v-for='i in 3' :key='i' class='skeleton h-20 rounded-2xl border border-slate-200' /></div>
    <p v-else-if='error' class='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{{ error }}</p>
    <div v-else-if='!reports.length' class='rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center'><p class='text-sm font-semibold text-slate-700'>No reports yet</p><RouterLink to='/report' class='mt-3 inline-block text-sm font-semibold' style='color: var(--color-brand-600)'>Submit your first report</RouterLink></div>
    <ul v-else class='space-y-3'><ReportListItem v-for='report in reports' :key='report.id' :report='report' /></ul>
  </div>
</template>
