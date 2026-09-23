import { requirePermission, PERMISSIONS, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    await requirePermission(req, PERMISSIONS.REPORTS_READ_ALL)
    const db = getServerClient()
    const [{ data: reports, error }, { data: signals, error: signalError }] = await Promise.all([
      db.from('reports').select('id, created_by, content, location, source_type, reported_at, created_at, ai_summary, ai_urgency, review_status, reviewed_by, reviewed_at, responder_notes, responder_name, perceived_situation, signal_id').order('created_at', { ascending: false }),
      db.from('signals').select('id, title, location, status, review_status, summary, responder_notes, last_updated').order('last_updated', { ascending: false }),
    ])
    if (error || signalError) throw error || signalError
    return res.status(200).json({ reports: reports || [], signals: signals || [] })
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) return sendAuthError(res, error)
    console.error(error)
    return res.status(500).json({ error: 'Unable to load responder data' })
  }
}
