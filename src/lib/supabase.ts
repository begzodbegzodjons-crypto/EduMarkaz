import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client (service_role) — FAQAT server tomonida ishlatiladi.
 * Brauzerga hech qachon expose qilinmaydi.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_client) return _client
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase env o\'zgaruvchilari sozlanmagan. .env.local faylida NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY bo\'lishi kerak.'
    )
  }
  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

/**
 * Statik sozlangan yoki yo'q — local dev uchun xavfsiz fallback.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey)
}
