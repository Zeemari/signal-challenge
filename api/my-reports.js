import { requirePermission, PERMISSIONS, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { user } = await requirePermission(req, PERMISSIONS.REPORTS_READ_OWN)
    const { data, error } = await getServerClient().from('reports')
      .select('id, content, location, source_type, reported_at, created_at, ai_summary, ai_urgency, review_status, responder_notes, signal_id')
      .eq('created_by', user.id).order('created_at', { ascending: false })
    if (error) throw error
    return res.status(200).json({ reports: data || [] })
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) return sendAuthError(res, error)
    console.error(error)
    return res.status(500).json({ error: 'Unable to load your reports' })
  }
}
