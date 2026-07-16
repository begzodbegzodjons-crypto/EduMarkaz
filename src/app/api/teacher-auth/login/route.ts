import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, signToken } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

const TEACHER_COOKIE = 'erp_teacher_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export async function POST(req: NextRequest) {
  try {
    const { login, password, center_name } = await req.json()

    if (!login || !password || !center_name) {
      return NextResponse.json({ ok: false, error: 'O\'quv markazi nomi, login va parol majburiy.' }, { status: 400 })
    }

    const sb = getSupabase()

    // 1) Markaz nomi bo'yicha topamiz (case-insensitive)
    const { data: center, error: centerErr } = await sb.from('users')
      .select('id, full_name, center_name, email, status, trial_ends_at, active_until')
      .ilike('center_name', center_name.trim())
      .maybeSingle()

    if (centerErr || !center) {
      return NextResponse.json({ ok: false, error: 'Bunday o\'quv markazi topilmadi. Markaz nomini to\'g\'ri kiriting.' }, { status: 404 })
    }

    // 2) Markaz holatini tekshirish
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
      return NextResponse.json({ ok: false, error: 'O\'quv markazining ruxsat muddati tugagan.' }, { status: 403 })
    }

    // 3) FAQAT shu markazga tegishli o'qituvchini qidirish
    const { data: teacher, error: teacherErr } = await sb.from('teachers')
      .select('id, user_id, full_name, phone, login, subject, password_hash')
      .eq('user_id', center.id)
      .or(`login.eq.${login},phone.eq.${login}`)
      .maybeSingle()

    if (teacherErr || !teacher) {
      return NextResponse.json({ ok: false, error: 'O\'qituvchi topilmadi. Login va parolni tekshiring.' }, { status: 401 })
    }

    if (!teacher.password_hash) {
      return NextResponse.json({ ok: false, error: 'Sizga parol o\'rnatilmagan. Markaz admini bilan bog\'laning.' }, { status: 403 })
    }

    // 4) Parol tekshirish
    const ok = await verifyPassword(password, teacher.password_hash)
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Login yoki parol noto\'g\'ri.' }, { status: 401 })
    }

    // 5) Token
    const token = signToken({
      id: teacher.id,
      email: teacher.login || teacher.phone || '',
      full_name: teacher.full_name,
      center_name: center.center_name,
      role: 'user',
      status: 'active',
      trial_ends_at: null,
      active_until: null,
    } as any)

    const store = await cookies()
    store.set(TEACHER_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    })

    return NextResponse.json({
      ok: true,
      teacher: {
        id: teacher.id,
        user_id: teacher.user_id,
        full_name: teacher.full_name,
        phone: teacher.phone,
        login: teacher.login,
        subject: teacher.subject,
      },
      center: { id: center.id, center_name: center.center_name }
    })
  } catch (e: any) {
    console.error('teacher login crash:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
