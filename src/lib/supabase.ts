import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client (service_role) — FAQAT server tomonida ishlatiladi.
 * Brauzerga hech qachon expose qilinmaydi.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Haqiqiy Supabase sozlanganmi yoki yo'q — environment'dagi qiymatlar bo'yicha
// "placeholder" qiymatlar demo rejim hisoblanadi
function isRealSupabase(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseServiceKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseServiceKey.includes('placeholder') &&
    supabaseUrl.startsWith('https://') &&
    supabaseServiceKey.startsWith('eyJ')
  )
}

export const SUPABASE_MODE: 'real' | 'demo' = isRealSupabase() ? 'real' : 'demo'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_client) return _client
  if (!isRealSupabase()) {
    throw new Error('DEMO_MODE')
  }
  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

export function isSupabaseConfigured(): boolean {
  return isRealSupabase()
}
