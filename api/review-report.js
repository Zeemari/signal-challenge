import { requirePermission, PERMISSIONS, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const action = req.body?.action
    const permission = action === 'verify' ? PERMISSIONS.REPORT_VERIFY : action === 'reject' ? PERMISSIONS.REPORT_REJECT : null
    if (!permission) return res.status(400).json({ error: 'Invalid review action' })
    const { user } = await requirePermission(req, permission)
    const reportId = req.body?.report_id
    if (!reportId || !/^[0-9a-f-]{36}$/i.test(reportId)) return res.status(400).json({ error: 'Invalid report' })
    const status = action === 'verify' ? 'verified' : 'rejected'
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 2000) : null
    const db = getServerClient()
    const { data: report, error } = await db.from('reports').update({ review_status: status, reviewed_by: user.id, reviewed_at: new Date().toISOString(), responder_notes: notes }).eq('id', reportId).select('id, signal_id, review_status, reviewed_at, responder_notes').maybeSingle()
    if (error) throw error
    if (!report) return res.status(404).json({ error: 'Report not found' })
    await db.from('audit_logs').insert({ actor_id: user.id, action: action === 'verify' ? 'report_verified' : 'report_rejected', report_id: reportId, signal_id: report.signal_id, metadata: { notes } })
    return res.status(200).json({ report })
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) return sendAuthError(res, error)
    console.error(error)
    return res.status(500).json({ error: 'Unable to review report' })
  }
}
