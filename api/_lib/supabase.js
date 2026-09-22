import { createClient } from '@supabase/supabase-js'

// Server-side client. Reuses the same project URL/anon key the client uses —
// RLS policies (see supabase/schema.sql) already permit these operations,
// so no service-role key is needed for this prototype.
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)
