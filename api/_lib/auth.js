import { createUserClient } from './supabase.js'

export const PERMISSIONS = Object.freeze({
  REPORT_CREATE: 'reports:create',
  REPORTS_READ_OWN: 'reports:read:own',
  REPORTS_READ_ALL: 'reports:read:all',
  REPORTS_REVIEW: 'reports:review',
  REPORT_VERIFY: 'reports:verify',
  REPORT_REJECT: 'reports:reject',
  INCIDENT_UPDATE: 'incidents:update',
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',
})

const ROLE_PERMISSIONS = Object.freeze({
  citizen: new Set([PERMISSIONS.REPORT_CREATE, PERMISSIONS.REPORTS_READ_OWN]),
  responder: new Set([
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORTS_READ_OWN,
    PERMISSIONS.REPORTS_READ_ALL,
    PERMISSIONS.REPORTS_REVIEW,
    PERMISSIONS.REPORT_VERIFY,
    PERMISSIONS.REPORT_REJECT,
    PERMISSIONS.INCIDENT_UPDATE,
  ]),
  admin: new Set([
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORTS_READ_OWN,
    PERMISSIONS.REPORTS_READ_ALL,
    PERMISSIONS.REPORTS_REVIEW,
    PERMISSIONS.REPORT_VERIFY,
    PERMISSIONS.REPORT_REJECT,
    PERMISSIONS.INCIDENT_UPDATE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.ROLES_MANAGE,
  ]),
})

export class AuthError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function tokenFromRequest(req) {
  const header = req.headers?.authorization ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

export async function getOptionalAuth(req) {
  try {
    const token = tokenFromRequest(req)
    if (!token) return { token: null, user: null, profile: null }

    const client = createUserClient(token)
    const { data: userData } = await client.auth.getUser(token)
    if (!userData?.user) return { token: null, user: null, profile: null }

    const { data: profile } = await client
      .from('profiles')
      .select('id, display_name, role, is_active')
      .eq('id', userData.user.id)
      .maybeSingle()

    return { token, user: userData.user, profile: profile?.is_active ? profile : null }
  } catch {
    return { token: null, user: null, profile: null }
  }
}

export async function requireAuth(req) {
  const token = tokenFromRequest(req)
  if (!token) throw new AuthError(401, 'Authentication required')

  const client = createUserClient(token)
  const { data: userData, error: userError } = await client.auth.getUser(token)
  if (userError || !userData.user) throw new AuthError(401, 'Authentication required')

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, display_name, role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || !profile) throw new AuthError(403, 'Account is not configured')
  if (!profile.is_active) throw new AuthError(403, 'Account is inactive')

  return { token, user: userData.user, profile }
}

export async function requirePermission(req, permission) {
  const context = await requireAuth(req)
  if (!hasPermission(context.profile.role, permission)) {
    throw new AuthError(403, 'You do not have permission to perform this action')
  }
  return context
}

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false
}

export function isValidRole(role) {
  return role === 'citizen' || role === 'responder' || role === 'admin'
}

export function sendAuthError(res, error) {
  const status = error instanceof AuthError ? error.status : 500
  const message = status === 500 ? 'Unexpected server error' : error.message
  return res.status(status).json({ error: message })
}
