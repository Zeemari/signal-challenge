import { requirePermission, PERMISSIONS, isValidRole, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

const INSTITUTION_TYPES = new Set(['police_station', 'news_outlet', 'newspaper', 'government_agency', 'ngo', 'other'])

export default async function handler(req, res) {
  try {
    const { user } = await requirePermission(req, PERMISSIONS.USERS_MANAGE)
    const db = getServerClient()
    if (req.method === 'GET') {
      const [{ data: authUsers, error: authError }, { data: profiles, error: profileError }] = await Promise.all([
        db.auth.admin.listUsers({ page: 1, perPage: 100 }),
        db.from('profiles').select('id, display_name, role, is_active, phone, sms_alerts_enabled, institution_name, institution_type, created_at, updated_at').order('created_at', { ascending: false }),
      ])
      if (authError || profileError) throw authError || profileError
      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))
      return res.status(200).json({ users: (authUsers.users || []).map((account) => ({ ...profileMap.get(account.id), id: account.id, email: account.email })) })
    }
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })
    const targetId = req.body?.user_id
    const role = req.body?.role
    const isActive = req.body?.is_active
    const phone = req.body?.phone
    const smsAlertsEnabled = req.body?.sms_alerts_enabled
    const institutionName = req.body?.institution_name
    const institutionType = req.body?.institution_type
    // Self-editing role/is_active risks locking an admin out of their own
    // account, so that's blocked — but the rest are safe to self-edit (an
    // admin needs to be able to set their own alert number/affiliation).
    const changesRoleOrActive = role !== undefined || isActive !== undefined
    if (
      !targetId ||
      (changesRoleOrActive && targetId === user.id) ||
      (role !== undefined && !isValidRole(role)) ||
      (isActive !== undefined && typeof isActive !== 'boolean') ||
      (phone !== undefined && phone !== null && typeof phone !== 'string') ||
      (smsAlertsEnabled !== undefined && typeof smsAlertsEnabled !== 'boolean') ||
      (institutionName !== undefined && institutionName !== null && typeof institutionName !== 'string') ||
      (institutionType !== undefined && institutionType !== null && institutionType !== '' && !INSTITUTION_TYPES.has(institutionType))
    ) {
      return res.status(400).json({ error: 'Invalid user update' })
    }
    const patch = {}
    if (role !== undefined) patch.role = role
    if (isActive !== undefined) patch.is_active = isActive
    if (phone !== undefined) patch.phone = phone ? phone.trim().slice(0, 20) : null
    if (smsAlertsEnabled !== undefined) patch.sms_alerts_enabled = smsAlertsEnabled
    if (institutionName !== undefined) patch.institution_name = institutionName ? institutionName.trim().slice(0, 120) : null
    if (institutionType !== undefined) patch.institution_type = institutionType || null
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'No user changes supplied' })
    const { data: profile, error } = await db.from('profiles').update(patch).eq('id', targetId).select('id, role, is_active, phone, sms_alerts_enabled, institution_name, institution_type').maybeSingle()
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
