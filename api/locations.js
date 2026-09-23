import { getOptionalAuth } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const db = getServerClient()
    const { user, profile } = await getOptionalAuth(req)
    const { lga_id, state_id } = req.query || {}

    // 1. Fetch States
    const { data: states, error: statesErr } = await db
      .from('states')
      .select('id, name, code')
      .order('name', { ascending: true })

    if (statesErr) throw statesErr

    // 2. Fetch LGAs (filtered by state_id if provided)
    let lgasQuery = db.from('lgas').select('id, state_id, name').order('name', { ascending: true })
    if (state_id) {
      lgasQuery = lgasQuery.eq('state_id', state_id)
    }
    const { data: lgas, error: lgasErr } = await lgasQuery
    if (lgasErr) throw lgasErr

    // 3. Fetch Locations if lga_id is requested
    let locations = []
    if (lga_id) {
      // Get all approved locations for the LGA
      const { data: approvedLocs, error: locsErr } = await db
        .from('locations')
        .select('id, lga_id, name, source, status, submitted_by, created_at')
        .eq('lga_id', lga_id)
        .eq('status', 'approved')
        .order('name', { ascending: true })

      if (locsErr) throw locsErr
      locations = approvedLocs || []

      // If user is authenticated, also fetch their own pending locations for this LGA
      if (user?.id) {
        const { data: userPendingLocs } = await db
          .from('locations')
          .select('id, lga_id, name, source, status, submitted_by, created_at')
          .eq('lga_id', lga_id)
          .eq('status', 'pending')
          .eq('submitted_by', user.id)
          .order('name', { ascending: true })

        if (userPendingLocs?.length) {
          // Merge avoiding duplicates
          const existingIds = new Set(locations.map((l) => l.id))
          for (const pendingLoc of userPendingLocs) {
            if (!existingIds.has(pendingLoc.id)) {
              locations.push(pendingLoc)
            }
          }
        }
      }
    }

    return res.status(200).json({ states, lgas, locations })
  } catch (error) {
    console.error('[Locations API Error]:', error)
    return res.status(500).json({ error: error.message || 'Unable to fetch location data' })
  }
}
