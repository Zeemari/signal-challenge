import { ref } from 'vue'
import { supabase } from './supabase.js'

export function useSignalsFeed() {
  const signals = ref([])
  const reportCounts = ref({})
  const loading = ref(true)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const { data: signalRows, error: signalsError } = await supabase
        .from('signals')
        .select('*')
        .order('last_updated', { ascending: false })
      if (signalsError) throw signalsError
      signals.value = signalRows ?? []

      let reportRows = []
      try {
        const response = await fetch('/api/public-signals')
        const contentType = response.headers.get('content-type') || ''
        if (response.ok && contentType.includes('application/json')) {
          const publicData = await response.json()
          if (publicData?.signals) {
            reportRows = publicData.signals.flatMap((signal) =>
              Array.from({ length: signal.report_count }, () => ({ signal_id: signal.id }))
            )
          }
        } else {
          const { data: rData } = await supabase.from('reports').select('signal_id')
          reportRows = rData ?? []
        }
      } catch {
        const { data: rData } = await supabase.from('reports').select('signal_id')
        reportRows = rData ?? []
      }

      const counts = {}
      for (const r of reportRows ?? []) {
        if (!r.signal_id) continue
        counts[r.signal_id] = (counts[r.signal_id] ?? 0) + 1
      }
      reportCounts.value = counts
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return { signals, reportCounts, loading, error, load }
}
