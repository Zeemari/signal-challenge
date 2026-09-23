import crypto from 'node:crypto'
import { requirePermission, PERMISSIONS, isValidRole, sendAuthError } from './_lib/auth.js'
import { getServerClient } from './_lib/supabase.js'

const INSTITUTION_TYPES = new Set(['police_station', 'news_outlet', 'newspaper', 'government_agency', 'ngo', 'other'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Not shown to the created user anywhere — only returned once in the API
// response so the admin can hand it off manually (no SMTP/email service is
// assumed to be configured for this project).
function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64url') + 'A1!'
}

export default async function handler(req, res) {
  try {
    const { user } = await requirePermission(req, PERMISSIONS.USERS_MANAGE)
    const db = getServerClient()
    if (req.method === 'GET') {
      let profiles = []
      let authUsers = []

      // 1. Fetch profiles table dynamically with select('*')
      const profileRes = await db
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profileRes.error) throw profileRes.error
      profiles = profileRes.data || []

      // 2. Safely attempt to fetch auth users for email mapping (requires service_role key)
      try {
        const authRes = await db.auth.admin.listUsers({ page: 1, perPage: 100 })
        if (authRes.data?.users) {
          authUsers = authRes.data.users
        }
      } catch (err) {
        console.warn('[Admin Users] Could not list auth users:', err.message)
      }

      const authMap = new Map((authUsers || []).map((u) => [u.id, u]))

      // Combine profiles with auth details
      const userList = profiles.map((p) => {
        const authAcc = authMap.get(p.id)
        return {
          ...p,
          is_verified_correspondent: !!(p.is_verified_correspondent || p.is_verified_informant),
          email: authAcc?.email || p.display_name || 'User (' + p.id.slice(0, 8) + ')',
        }
      })

      return res.status(200).json({ users: userList })
    }
    if (req.method === 'POST') {
      const email = req.body?.email
      const role = req.body?.role || 'citizen'
      const displayName = req.body?.display_name
      const suppliedPassword = req.body?.password

      if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
        return res.status(400).json({ error: 'A valid email is required' })
      }
      if (!isValidRole(role)) return res.status(400).json({ error: 'Invalid role' })
      if (suppliedPassword !== undefined && suppliedPassword !== null && suppliedPassword !== '') {
        if (typeof suppliedPassword !== 'string' || suppliedPassword.length < 8) {
          return res.status(400).json({ error: 'Password must be at least 8 characters' })
        }
      }

      const generatedPassword = suppliedPassword ? null : generateTempPassword()
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: email.trim(),
        password: suppliedPassword || generatedPassword,
        email_confirm: true,
        user_metadata: displayName && typeof displayName === 'string' ? { display_name: displayName.trim().slice(0, 120) } : undefined,
      })
      if (createError) return res.status(400).json({ error: createError.message || 'Unable to create user' })

      const newId = created.user.id
      if (role !== 'citizen') {
        const { error: roleError } = await db.from('profiles').update({ role }).eq('id', newId)
        if (roleError) throw roleError
        await db.from('audit_logs').insert({ actor_id: user.id, action: 'role_changed', target_user_id: newId, metadata: { role, created: true } })
      }

      return res.status(201).json({
        user: { id: newId, email: created.user.email, role, display_name: displayName || null, is_active: true },
        temp_password: generatedPassword,
      })
    }
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })
    const targetId = req.body?.user_id
    const role = req.body?.role
    const isActive = req.body?.is_active
    const phone = req.body?.phone
    const smsAlertsEnabled = req.body?.sms_alerts_enabled
    const institutionName = req.body?.institution_name
    const institutionType = req.body?.institution_type
    const isVerifiedCorrespondent = req.body?.is_verified_correspondent

    const changesRoleOrActive = role !== undefined || isActive !== undefined
    if (!targetId) return res.status(400).json({ error: 'user_id is required' })
    if (changesRoleOrActive && targetId === user.id) {
      return res.status(400).json({ error: "You can't change your own role or active status — ask another admin to do it." })
    }
    if (role !== undefined && !isValidRole(role)) return res.status(400).json({ error: 'Invalid role' })
    if (isActive !== undefined && typeof isActive !== 'boolean') return res.status(400).json({ error: 'is_active must be true or false' })
    if (isVerifiedCorrespondent !== undefined && typeof isVerifiedCorrespondent !== 'boolean') return res.status(400).json({ error: 'is_verified_correspondent must be true or false' })
    if (phone !== undefined && phone !== null && typeof phone !== 'string') return res.status(400).json({ error: 'Invalid phone number' })
    if (smsAlertsEnabled !== undefined && typeof smsAlertsEnabled !== 'boolean') return res.status(400).json({ error: 'sms_alerts_enabled must be true or false' })
    if (institutionName !== undefined && institutionName !== null && typeof institutionName !== 'string') return res.status(400).json({ error: 'Invalid institution name' })
    if (institutionType !== undefined && institutionType !== null && institutionType !== '' && !INSTITUTION_TYPES.has(institutionType)) {
      return res.status(400).json({ error: 'Invalid institution type' })
    }
    const patch = {}
    if (role !== undefined) patch.role = role
    if (isActive !== undefined) patch.is_active = isActive
    if (isVerifiedCorrespondent !== undefined) patch.is_verified_correspondent = isVerifiedCorrespondent
    if (phone !== undefined) patch.phone = phone ? phone.trim().slice(0, 20) : null
    if (smsAlertsEnabled !== undefined) patch.sms_alerts_enabled = smsAlertsEnabled
    if (institutionName !== undefined) patch.institution_name = institutionName ? institutionName.trim().slice(0, 120) : null
    if (institutionType !== undefined) patch.institution_type = institutionType || null
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'No user changes supplied' })
    let { data: profile, error } = await db.from('profiles').update(patch).eq('id', targetId).select('id, role, is_active, phone, sms_alerts_enabled, institution_name, institution_type, is_verified_correspondent').maybeSingle()
    if (error && patch.is_verified_correspondent !== undefined) {
      delete patch.is_verified_correspondent
      if (Object.keys(patch).length > 0) {
        const retry = await db.from('profiles').update(patch).eq('id', targetId).select('id, role, is_active, phone, sms_alerts_enabled, institution_name, institution_type').maybeSingle()
        profile = retry.data
        error = retry.error
      } else {
        return res.status(400).json({ error: 'Database table does not have is_verified_correspondent column yet. Please run migration 011_verified_correspondent.sql' })
      }
    }
    if (error) throw error
    if (!profile) return res.status(404).json({ error: 'User not found' })
    if (role !== undefined) await db.from('audit_logs').insert({ actor_id: user.id, action: 'role_changed', target_user_id: targetId, metadata: { role } })
    if (isActive !== undefined) await db.from('audit_logs').insert({ actor_id: user.id, action: isActive ? 'user_activated' : 'user_deactivated', target_user_id: targetId, metadata: {} })
    return res.status(200).json({ user: profile })
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) return sendAuthError(res, error)
    console.error('[Admin Users API Error]:', error)
    return res.status(500).json({ error: error.message || error.details || 'Unable to manage users' })
  }
}
