import { createClient } from "@supabase/supabase-js"

// Server-only client. JANGAN import file ini di komponen "use client".
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } },
)
