import { requirePermission, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user, profile } = await requirePermission(req, 'locations:review')
    const { location_id, action } = req.body || {}

    if (!location_id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Valid location_id and action (approve or reject) are required' })
    }

    const db = getServerClient()

    // 1. Fetch location to inspect
    const { data: location, error: locErr } = await db
      .from('locations')
      .select('id, name, status, submitted_by')
      .eq('id', location_id)
      .single()

    if (locErr || !location) {
      return res.status(404).json({ error: 'Location not found' })
    }

    // Security check: Citizen must not be able to approve their own submitted location
    // Even if a user has responder permissions, if they were the submitter of this location, another responder/admin must review it
    if (action === 'approve' && location.submitted_by === user.id && profile.role !== 'admin') {
      return res.status(403).json({ error: 'Security Policy: You cannot approve a location that you submitted. Another responder or admin must review it.' })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { data: updated, error: updateErr } = await db
      .from('locations')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', location_id)
      .select(`
        id,
        name,
        source,
        status,
        reviewed_at,
        lga:lgas (
          id,
          name,
          state:states (
            id,
            name
          )
        )
      `)
      .single()

    if (updateErr) throw updateErr

    // Create an audit log entry for transparency
    await db.from('audit_logs').insert({
      actor_id: user.id,
      action: action === 'approve' ? 'location_approved' : 'location_rejected',
      metadata: {
        location_id: location.id,
        location_name: location.name,
        previous_status: location.status,
        new_status: newStatus,
      },
    }).catch((e) => console.error('Audit log error for location review:', e))

    return res.status(200).json({ location: updated })
  } catch (error) {
    console.error('[Review Location API Error]:', error)
    return sendAuthError(res, error)
  }
}
