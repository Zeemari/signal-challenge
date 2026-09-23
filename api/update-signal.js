import { requirePermission, PERMISSIONS, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

const STATUSES = new Set(['emerging', 'corroborating', 'conflicting', 'unconfirmed'])
const REVIEWS = new Set(['unverified', 'verified', 'rejected'])

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { user } = await requirePermission(req, PERMISSIONS.INCIDENT_UPDATE)
    const id = req.body?.signal_id
    const status = req.body?.status
    const reviewStatus = req.body?.review_status
    if (!id || !/^[0-9a-f-]{36}$/i.test(id) || !STATUSES.has(status) || (reviewStatus && !REVIEWS.has(reviewStatus))) return res.status(400).json({ error: 'Invalid signal update' })
    const db = getServerClient()
    const patch = { status, last_updated: new Date().toISOString() }
    if (reviewStatus) Object.assign(patch, { review_status: reviewStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    if (typeof req.body?.notes === 'string') patch.responder_notes = req.body.notes.trim().slice(0, 2000)
    const { data: signal, error } = await db.from('signals').update(patch).eq('id', id).select('id, status, review_status, responder_notes, last_updated').maybeSingle()
    if (error) throw error
    if (!signal) return res.status(404).json({ error: 'Signal not found' })
    await db.from('audit_logs').insert({ actor_id: user.id, action: 'signal_status_changed', signal_id: id, metadata: { status, review_status: reviewStatus || null } })
    return res.status(200).json({ signal })
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) return sendAuthError(res, error)
    console.error(error)
    return res.status(500).json({ error: 'Unable to update signal' })
  }
}
