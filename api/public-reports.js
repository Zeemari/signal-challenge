import { getServerClient } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { data, error } = await getServerClient()
      .from('reports')
      .select('id, content, location, source_type, perceived_situation, reported_at, created_at, ai_summary, ai_urgency, review_status, responder_notes, responder_name, signal_id')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return res.status(200).json({ reports: data || [] })
  } catch (error) {
    console.error('Error fetching public reports:', error)
    return res.status(500).json({ error: 'Unable to load public reports' })
  }
}
