import { NextResponse } from 'next/server'
import { verifyToken } from './auth'
import { getSupabase, isSupabaseConfigured } from './supabase'
import { getDemoSupabase } from './demo-db'
import { cookies } from 'next/headers'

const TEACHER_COOKIE = 'erp_teacher_session'

<<<<<<< HEAD
=======
/**
 * Aktiv o'qituvchini qaytaradi.
 * Cookie'dan token o'qiydi, o'qituvchi ma'lumotlarini bazadan oladi.
 * Markaz holatini ham tekshiradi (blocked bo'lmasligi kerak).
 *
 * @returns { teacher, sb, user_id } — user_id = markaz egasi (admin) id
 */
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
export async function requireActiveTeacher() {
  const store = await cookies()
  const token = store.get(TEACHER_COOKIE)?.value
  if (!token) {
<<<<<<< HEAD
    return { error: NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 }) }
=======
    return {
      error: NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
    }
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  }

  const payload = verifyToken(token)
  if (!payload) {
<<<<<<< HEAD
    return { error: NextResponse.json({ ok: false, error: 'Sessiya tugagan. Qayta kiring.' }, { status: 401 }) }
=======
    return {
      error: NextResponse.json({ ok: false, error: 'Sessiya tugagan. Qayta kiring.' }, { status: 401 })
    }
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  }

  const sb = isSupabaseConfigured() ? getSupabase() : getDemoSupabase() as any

<<<<<<< HEAD
=======
  // 1) O'qituvchini bazadan olamiz
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  const { data: teacher, error } = await sb.from('teachers')
    .select('id, user_id, full_name, phone, login, subject')
    .eq('id', payload.id)
    .maybeSingle()

  if (error || !teacher) {
<<<<<<< HEAD
    return { error: NextResponse.json({ ok: false, error: 'O\'qituvchi topilmadi.' }, { status: 404 }) }
=======
    return {
      error: NextResponse.json({ ok: false, error: 'O\'qituvchi topilmadi.' }, { status: 404 })
    }
  }

  // 2) Markaz holatini tekshiramiz (blocked emasligi)
  const { data: center, error: centerErr } = await sb.from('users')
    .select('id, center_name, status, trial_ends_at, active_until')
    .eq('id', teacher.user_id)
    .maybeSingle()

  if (centerErr || !center) {
    return {
      error: NextResponse.json({ ok: false, error: 'O\'quv markazi topilmadi.' }, { status: 404 })
    }
  }

  // Markaz bloklangan bo'lsa, o'qituvchi ham kir olmaydi
  const now = new Date()
  let isBlocked = false
  if (center.status === 'blocked') {
    isBlocked = true
  } else if (center.status === 'trial') {
    if (center.trial_ends_at && new Date(center.trial_ends_at) <= now) {
      isBlocked = true
    }
  } else if (center.status === 'active') {
    if (center.active_until && new Date(center.active_until) <= now) {
      isBlocked = true
    }
  }
  if (isBlocked) {
    return {
      error: NextResponse.json({
        ok: false,
        error: 'O\'quv markazining ruxsat muddati tugagan. Markaz admini bilan bog\'laning.'
      }, { status: 403 })
    }
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  }

  return {
    teacher,
    sb,
<<<<<<< HEAD
    user_id: teacher.user_id,
=======
    user_id: teacher.user_id, // markaz egasi id (o'qituvchi shu markazga tegishli)
    center_name: center.center_name,
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  }
}
