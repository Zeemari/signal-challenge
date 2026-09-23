import { getServerClient } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const id = req.query?.id
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(404).json({ error: 'Signal not found' })
  try {
    const db = getServerClient()
    const [{ data: signal, error }, { data: reports, error: reportsError }] = await Promise.all([
      db.from('signals').select('id, title, location, status, review_status, summary, why_explanation, last_updated, created_at').eq('id', id).maybeSingle(),
      db.from('reports').select('id, signal_id, ai_summary, source_type, reported_at, ai_urgency, responder_name, content, perceived_situation').eq('signal_id', id).order('reported_at', { ascending: false }),
    ])
    if (error || reportsError) throw error || reportsError
    if (!signal) return res.status(404).json({ error: 'Signal not found' })
    return res.status(200).json({ signal, reports: reports || [] })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Unable to load signal' })
  }
}
