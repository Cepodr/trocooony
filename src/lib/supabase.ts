import { createClient } from "@supabase/supabase-js"

// Server-only client. Do NOT import this file into a "use client" component.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } },
)
