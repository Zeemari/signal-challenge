// Creates (or resets) the demo responder and admin accounts used for judging.
// Usage: npm run seed:demo   (needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env)
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

export const DEMO_USERS = [
  {
    email: 'demo.admin@signal-demo.com',
    password: 'SignalDemo#Admin1',
    role: 'admin',
    display_name: 'Demo Admin',
  },
  {
    email: 'demo.responder@signal-demo.com',
    password: 'SignalDemo#Responder1',
    role: 'responder',
    display_name: 'Demo Responder',
    institution_name: 'Demo Police Station',
    institution_type: 'police_station',
    is_verified_correspondent: true,
  },
]

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run via "npm run seed:demo".')
  process.exit(1)
}
const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws }, // Node < 22 has no native WebSocket
})

async function findUserByEmail(email) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const hit = data.users.find((u) => u.email?.toLowerCase() === email)
    if (hit || data.users.length < 100) return hit
  }
}

for (const { email, password, role, display_name, ...extra } of DEMO_USERS) {
  let user = await findUserByEmail(email)
  if (user) {
    const { error } = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true })
    if (error) throw error
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { display_name },
    })
    if (error) throw error
    user = data.user
  }
  const { error } = await db
    .from('profiles')
    .upsert({ id: user.id, role, display_name, is_active: true, ...extra }, { onConflict: 'id' })
  if (error) throw error
  console.log(`ready  ${role.padEnd(9)} ${email}`)
}
