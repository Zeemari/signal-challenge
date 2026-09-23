import { requirePermission, PERMISSIONS, isValidRole, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

export default async function handler(req, res) {
  try {
    const { user } = await requirePermission(req, PERMISSIONS.USERS_MANAGE)
    const db = getServerClient()
    if (req.method === 'GET') {
      const [{ data: authUsers, error: authError }, { data: profiles, error: profileError }] = await Promise.all([
        db.auth.admin.listUsers({ page: 1, perPage: 100 }),
        db.from('profiles').select('id, display_name, role, is_active, created_at, updated_at').order('created_at', { ascending: false }),
      ])
      if (authError || profileError) throw authError || profileError
      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))
      return res.status(200).json({ users: (authUsers.users || []).map((account) => ({ ...profileMap.get(account.id), id: account.id, email: account.email })) })
    }
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })
    const targetId = req.body?.user_id
    const role = req.body?.role
    const isActive = req.body?.is_active
    if (!targetId || targetId === user.id || (role !== undefined && !isValidRole(role)) || (isActive !== undefined && typeof isActive !== 'boolean')) return res.status(400).json({ error: 'Invalid user update' })
    const patch = {}
    if (role !== undefined) patch.role = role
    if (isActive !== undefined) patch.is_active = isActive
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'No user changes supplied' })
    const { data: profile, error } = await db.from('profiles').update(patch).eq('id', targetId).select('id, role, is_active').maybeSingle()
    if (error) throw error
    if (!profile) return res.status(404).json({ error: 'User not found' })
    if (role !== undefined) await db.from('audit_logs').insert({ actor_id: user.id, action: 'role_changed', target_user_id: targetId, metadata: { role } })
    if (isActive !== undefined) await db.from('audit_logs').insert({ actor_id: user.id, action: isActive ? 'user_activated' : 'user_deactivated', target_user_id: targetId, metadata: {} })
    return res.status(200).json({ user: profile })
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) return sendAuthError(res, error)
    console.error(error)
    return res.status(500).json({ error: 'Unable to manage users' })
  }
}
