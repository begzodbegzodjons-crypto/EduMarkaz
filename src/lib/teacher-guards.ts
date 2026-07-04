import { NextResponse } from 'next/server'
import { verifyToken } from './auth'
import { getSupabase, isSupabaseConfigured } from './supabase'
import { getDemoSupabase } from './demo-db'
import { cookies } from 'next/headers'

const TEACHER_COOKIE = 'erp_teacher_session'

/**
 * Aktiv o'qituvchini qaytaradi.
 * Cookie'dan token o'qiydi, o'qituvchi ma'lumotlarini bazadan oladi.
 * @returns { teacher, sb, user_id } — user_id = markaz egasi (admin) id
 */
export async function requireActiveTeacher() {
  const store = await cookies()
  const token = store.get(TEACHER_COOKIE)?.value
  if (!token) {
    return {
      error: NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
    }
  }

  const payload = verifyToken(token)
  if (!payload) {
    return {
      error: NextResponse.json({ ok: false, error: 'Sessiya tugagan. Qayta kiring.' }, { status: 401 })
    }
  }

  const sb = isSupabaseConfigured() ? getSupabase() : getDemoSupabase() as any

  // O'qituvchini bazadan olamiz
  const { data: teacher, error } = await sb.from('teachers')
    .select('id, user_id, full_name, phone, login, subject')
    .eq('id', payload.id)
    .maybeSingle()

  if (error || !teacher) {
    return {
      error: NextResponse.json({ ok: false, error: 'O\'qituvchi topilmadi.' }, { status: 404 })
    }
  }

  return {
    teacher,
    sb,
    user_id: teacher.user_id, // markaz egasi id (o'qituvchi shu markazga tegishli)
  }
}
