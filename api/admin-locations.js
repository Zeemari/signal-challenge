import { requirePermission, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

export default async function handler(req, res) {
  try {
    const db = getServerClient()

    if (req.method === 'GET') {
      const { user, profile } = await requirePermission(req, 'locations:review')

      // 1. Fetch pending community locations
      const { data: pendingLocations, error: pendingErr } = await db
        .from('locations')
        .select(`
          id,
          name,
          source,
          status,
          created_at,
          submitted_by,
          lga:lgas (
            id,
            name,
            state:states (
              id,
              name,
              code
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (pendingErr) throw pendingErr

      // Attach report counts for each pending location
      const pendingWithCounts = await Promise.all(
        (pendingLocations || []).map(async (loc) => {
          const { count } = await db
            .from('reports')
            .select('id', { count: 'exact', head: true })
            .eq('location_id', loc.id)

          return {
            ...loc,
            report_count: count || 0,
          }
        })
      )

      // 2. Fetch full hierarchy for admin browse view (all approved locations)
      const { data: states } = await db.from('states').select('id, name, code').order('name')
      const { data: lgas } = await db.from('lgas').select('id, state_id, name').order('name')
      const { data: approvedLocations } = await db
        .from('locations')
        .select('id, lga_id, name, source, status, created_at')
        .eq('status', 'approved')
        .order('name')

      return res.status(200).json({
        pending: pendingWithCounts,
        hierarchy: {
          states: states || [],
          lgas: lgas || [],
          approved_locations: approvedLocations || [],
        },
      })
    }

    if (req.method === 'POST') {
      // Direct Admin addition of trusted location
      const { user, profile } = await requirePermission(req, 'locations:manage')
      const { lga_id, name } = req.body || {}

      if (!lga_id || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'LGA and location name are required' })
      }

      const trimmedName = name.trim()

      // Check for existing location in this LGA
      const { data: existing } = await db
        .from('locations')
        .select('id, status, source')
        .eq('lga_id', lga_id)
        .ilike('name', trimmedName)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'approved') {
          return res.status(400).json({ error: 'A location with this name already exists and is approved in this LGA' })
        }
        // If it was pending or rejected, upgrade it to admin-approved
        const { data: updated, error: updateErr } = await db
          .from('locations')
          .update({
            status: 'approved',
            source: 'admin',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateErr) throw updateErr
        return res.status(200).json({ location: updated, message: 'Location upgraded to admin approved' })
      }

      // Insert new trusted admin location
      const { data: newLoc, error: insertErr } = await db
        .from('locations')
        .insert({
          lga_id,
          name: trimmedName,
          source: 'admin',
          status: 'approved',
          submitted_by: user.id,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .select(`
          id,
          name,
          source,
          status,
          created_at,
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

      if (insertErr) throw insertErr

      return res.status(201).json({ location: newLoc })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[Admin Locations API Error]:', error)
    return sendAuthError(res, error)
  }
}
