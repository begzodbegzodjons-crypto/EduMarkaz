import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

const TEACHER_COOKIE = 'erp_teacher_session'

export async function GET() {
  try {
    const store = await cookies()
    const token = store.get(TEACHER_COOKIE)?.value
<<<<<<< HEAD
    if (!token) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ ok: false, error: 'Sessiya tugagan.' }, { status: 401 })

    const sb = getSupabase()
=======
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Sessiya tugagan.' }, { status: 401 })
    }

    const sb = getSupabase()
    // O'qituvchi ma'lumotlarini yangilab olamiz
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
    const { data: teacher, error } = await sb.from('teachers')
      .select('id, user_id, full_name, phone, login, subject')
      .eq('id', payload.id)
      .maybeSingle()

<<<<<<< HEAD
    if (error || !teacher) return NextResponse.json({ ok: false, error: 'O\'qituvchi topilmadi.' }, { status: 404 })

=======
    if (error || !teacher) {
      return NextResponse.json({ ok: false, error: 'O\'qituvchi topilmadi.' }, { status: 404 })
    }

    // Markaz ma'lumotlarini ham olamiz (markaz nomi uchun)
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
    const { data: center } = await sb.from('users')
      .select('id, center_name, status, trial_ends_at, active_until')
      .eq('id', teacher.user_id)
      .maybeSingle()

<<<<<<< HEAD
    if (center) {
      const now = new Date()
      let isBlocked = false
      if (center.status === 'blocked') isBlocked = true
      else if (center.status === 'trial' && center.trial_ends_at && new Date(center.trial_ends_at) <= now) isBlocked = true
      else if (center.status === 'active' && center.active_until && new Date(center.active_until) <= now) isBlocked = true
      if (isBlocked) return NextResponse.json({ ok: false, error: 'Markaz ruxsat muddati tugagan.' }, { status: 403 })
    }

    return NextResponse.json({ ok: true, teacher: { ...teacher, center_name: center?.center_name || '' } })
=======
    // Markaz holatini tekshirish
    if (center) {
      const now = new Date()
      let isBlocked = false
      if (center.status === 'blocked') {
        isBlocked = true
      } else if (center.status === 'trial') {
        if (center.trial_ends_at && new Date(center.trial_ends_at) <= now) isBlocked = true
      } else if (center.status === 'active') {
        if (center.active_until && new Date(center.active_until) <= now) isBlocked = true
      }
      if (isBlocked) {
        return NextResponse.json({
          ok: false,
          error: 'O\'quv markazining ruxsat muddati tugagan. Markaz admini bilan bog\'laning.'
        }, { status: 403 })
      }
    }

    return NextResponse.json({
      ok: true,
      teacher: {
        ...teacher,
        center_name: center?.center_name || '',
      }
    })
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
<<<<<<< HEAD
=======

>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
