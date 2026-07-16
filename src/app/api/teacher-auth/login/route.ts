import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, signToken } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

const TEACHER_COOKIE = 'erp_teacher_session'
<<<<<<< HEAD
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7
=======
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 kun
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c

export async function POST(req: NextRequest) {
  try {
    const { login, password, center_name } = await req.json()

<<<<<<< HEAD
    if (!login || !password || !center_name) {
      return NextResponse.json({ ok: false, error: 'O\'quv markazi nomi, login va parol majburiy.' }, { status: 400 })
=======
    // 3 ta maydon majburiy: markaz nomi + login + parol
    if (!login || !password || !center_name) {
      return NextResponse.json({
        ok: false,
        error: 'O\'quv markazi nomi, login va parol majburiy.'
      }, { status: 400 })
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
    }

    const sb = getSupabase()

<<<<<<< HEAD
    // 1) Markaz nomi bo'yicha topamiz (case-insensitive)
=======
    // 1-QADAM: Markaz nomi bo'yicha o'quv markazini topamiz (users jadvalidan)
    // center_name noyob bo'lishi kerak (email unique kabi)
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
    const { data: center, error: centerErr } = await sb.from('users')
      .select('id, full_name, center_name, email, status, trial_ends_at, active_until')
      .ilike('center_name', center_name.trim())
      .maybeSingle()

    if (centerErr || !center) {
<<<<<<< HEAD
      return NextResponse.json({ ok: false, error: 'Bunday o\'quv markazi topilmadi. Markaz nomini to\'g\'ri kiriting.' }, { status: 404 })
    }

    // 2) Markaz holatini tekshirish
=======
      return NextResponse.json({
        ok: false,
        error: 'Bunday o\'quv markazi topilmadi. Markaz nomini to\'g\'ri kiriting.'
      }, { status: 404 })
    }

    // 2-QADAM: Markaz holatini tekshirish (trial/active, blocked emas)
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
    const now = new Date()
    let isBlocked = false
    if (center.status === 'blocked') {
      isBlocked = true
    } else if (center.status === 'trial') {
<<<<<<< HEAD
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
=======
      if (center.trial_ends_at && new Date(center.trial_ends_at) <= now) {
        isBlocked = true
      }
    } else if (center.status === 'active') {
      if (center.active_until && new Date(center.active_until) <= now) {
        isBlocked = true
      }
    }
    if (isBlocked) {
      return NextResponse.json({
        ok: false,
        error: 'O\'quv markazining ruxsat muddati tugagan. Markaz admini bilan bog\'laning.'
      }, { status: 403 })
    }

    // 3-QADAM: Shu markazga tegishli o'qituvchini qidiramiz
    // FAQAT user_id = center.id bo'lgan o'qituvchilar (izolyatsiya)
    const { data: teacher, error: teacherErr } = await sb.from('teachers')
      .select('id, user_id, full_name, phone, login, subject, password_hash')
      .eq('user_id', center.id) // FAQAT SHU MARKAZNING O'QITUVCHISI
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
      .or(`login.eq.${login},phone.eq.${login}`)
      .maybeSingle()

    if (teacherErr || !teacher) {
<<<<<<< HEAD
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
=======
      return NextResponse.json({
        ok: false,
        error: 'O\'qituvchi topilmadi. Login va parolni tekshiring yoki markaz adminiga murojaat qiling.'
      }, { status: 401 })
    }

    // 4-QADAM: Parol o'rnatilganmi?
    if (!teacher.password_hash) {
      return NextResponse.json({
        ok: false,
        error: 'Sizga parol o\'rnatilmagan. Markaz admini bilan bog\'laning.'
      }, { status: 403 })
    }

    // 5-QADAM: Parolni tekshirish
    const ok = await verifyPassword(password, teacher.password_hash)
    if (!ok) {
      return NextResponse.json({
        ok: false,
        error: 'Login yoki parol noto\'g\'ri.'
      }, { status: 401 })
    }

    // 6-QADAM: JWT token yaratish — markaz ma'lumotlari bilan
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
    const token = signToken({
      id: teacher.id,
      email: teacher.login || teacher.phone || '',
      full_name: teacher.full_name,
<<<<<<< HEAD
      center_name: center.center_name,
=======
      center_name: center.center_name, // markaz nomi
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
      role: 'user',
      status: 'active',
      trial_ends_at: null,
      active_until: null,
    } as any)

<<<<<<< HEAD
=======
    // Cookie o'rnatish
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
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
<<<<<<< HEAD
      center: { id: center.id, center_name: center.center_name }
=======
      center: {
        id: center.id,
        center_name: center.center_name,
      }
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
    })
  } catch (e: any) {
    console.error('teacher login crash:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
