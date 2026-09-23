import { getServerClient } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const db = getServerClient()
    const [{ data: signals, error }, { data: reports, error: reportsError }] = await Promise.all([
      db.from('signals').select('id, title, location, status, review_status, summary, why_explanation, last_updated, created_at').order('last_updated', { ascending: false }),
      db.from('reports').select('signal_id'),
    ])
    if (error || reportsError) throw error || reportsError
    const counts = (reports || []).reduce((out, row) => {
      if (row.signal_id) out[row.signal_id] = (out[row.signal_id] || 0) + 1
      return out
    }, {})
    return res.status(200).json({ signals: (signals || []).map((signal) => ({ ...signal, report_count: counts[signal.id] || 0 })) })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Unable to load signals' })
  }
}
