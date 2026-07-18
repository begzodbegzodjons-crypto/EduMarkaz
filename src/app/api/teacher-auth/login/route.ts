import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, signToken } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

const TEACHER_COOKIE = 'erp_teacher_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json()

    if (!login || !password) {
      return NextResponse.json({ ok: false, error: 'Login va parol majburiy.' }, { status: 400 })
    }

    const sb = getSupabase()
    const loginTrimmed = login.trim()

    // 1) Avval login maydoni bo'yicha qidirish
    let { data: teacher, error: teacherErr } = await sb.from('teachers')
      .select('id, user_id, full_name, phone, login, subject, password_hash')
      .eq('login', loginTrimmed)
      .maybeSingle()

    // 2) Agar topilmasa, telefon bo'yicha qidirish
    if (!teacher) {
      const res2 = await sb.from('teachers')
        .select('id, user_id, full_name, phone, login, subject, password_hash')
        .eq('phone', loginTrimmed)
        .maybeSingle()
      teacher = res2.data
      teacherErr = res2.error
    }

    // 3) Agar hali topilmasa, login maydoni phone bilan teng bo'lishi mumkin
    if (!teacher) {
      const res3 = await sb.from('teachers')
        .select('id, user_id, full_name, phone, login, subject, password_hash')
        .eq('phone', loginTrimmed)
        .maybeSingle()
      teacher = res3.data
    }

    if (teacherErr || !teacher) {
      return NextResponse.json({ ok: false, error: 'Login yoki parol noto\'g\'ri.' }, { status: 401 })
    }

    if (!teacher.password_hash) {
      return NextResponse.json({ ok: false, error: 'Sizga parol o\'rnatilmagan. Markaz admini bilan bog\'laning.' }, { status: 403 })
    }

    // 4) Parol tekshirish
    const ok = await verifyPassword(password, teacher.password_hash)
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Login yoki parol noto\'g\'ri.' }, { status: 401 })
    }

    // 5) Markaz ma'lumotlarini olish
    const { data: center } = await sb.from('users')
      .select('id, full_name, center_name, email, status, trial_ends_at, active_until')
      .eq('id', teacher.user_id)
      .maybeSingle()

    if (!center) {
      return NextResponse.json({ ok: false, error: 'O\'quv markazi topilmadi.' }, { status: 404 })
    }

    // 6) Markaz holatini tekshirish
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

    // 7) Token yaratish
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
