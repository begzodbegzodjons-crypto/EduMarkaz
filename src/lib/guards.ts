import { NextResponse } from 'next/server'
import { getSession, getUserById, syncUserStatus } from './auth'
import { isSupabaseConfigured } from './supabase'
import { getDemoSupabase } from './demo-db'

/**
 * Aktiv (trial/active) foydalanuvchini qaytaradi.
 * Bloklangan bo'lsa { blocked: true } qaytaradi.
 *
 * Demo rejimda (Supabase sozlanmagan) ham ishlaydi — getDemoSupabase() orqali.
 */
export async function requireActiveUser() {
  const sess = await getSession()
  if (!sess) return { error: NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 }) }

  const dbUser = await getUserById(sess.id)
  if (!dbUser) return { error: NextResponse.json({ ok: false, error: 'Foydalanuvchi topilmadi.' }, { status: 404 }) }

  const synced = await syncUserStatus(dbUser)
  // Admin har doim aktiv
  if (synced.role === 'admin') {
    return { user: synced, sb: isSupabaseConfigured() ? (await import('./supabase')).getSupabase() : getDemoSupabase() as any }
  }

  if (synced.status === 'blocked') {
    return {
      error: NextResponse.json(
        { ok: false, error: 'blocked', message: 'Sizning bepul muddatingiz tugagan. Davom etish uchun aktivatsiya kodini kiriting.' },
        { status: 403 }
      ),
    }
  }
  return { user: synced, sb: isSupabaseConfigured() ? (await import('./supabase')).getSupabase() : getDemoSupabase() as any }
}
