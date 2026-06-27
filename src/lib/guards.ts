import { NextResponse } from 'next/server'
import { getSession, getUserById, syncUserStatus } from './auth'
import { getSupabase, isSupabaseConfigured } from './supabase'

/**
 * Aktiv (trial/active) foydalanuvchini qaytaradi.
 * Bloklangan bo'lsa { blocked: true } qaytaradi.
 */
export async function requireActiveUser() {
  const sess = await getSession()
  if (!sess) return { error: NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 }) }
  if (!isSupabaseConfigured()) return { error: NextResponse.json({ ok: false, error: 'Supabase sozlanmagan.' }, { status: 500 }) }

  const dbUser = await getUserById(sess.id)
  if (!dbUser) return { error: NextResponse.json({ ok: false, error: 'Foydalanuvchi topilmadi.' }, { status: 404 }) }

  const synced = await syncUserStatus(dbUser)
  // Admin har doim aktiv
  if (synced.role === 'admin') return { user: synced, sb: getSupabase() }

  if (synced.status === 'blocked') {
    return {
      error: NextResponse.json(
        { ok: false, error: 'blocked', message: 'Sizning bepul muddatingiz tugagan. Davom etish uchun aktivatsiya kodini kiriting.' },
        { status: 403 }
      ),
    }
  }
  return { user: synced, sb: getSupabase() }
}
