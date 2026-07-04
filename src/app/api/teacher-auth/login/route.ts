import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, signToken } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

const TEACHER_COOKIE = 'erp_teacher_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 kun

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json()
    if (!login || !password) {
      return NextResponse.json({ ok: false, error: 'Login va parol majburiy.' }, { status: 400 })
    }

    const sb = getSupabase()

    // Login yoki telefon bo'yicha qidirish
    const { data: teacher, error } = await sb.from('teachers')
      .select('id, user_id, full_name, phone, login, subject, password_hash')
      .or(`login.eq.${login},phone.eq.${login}`)
      .maybeSingle()

    if (error || !teacher) {
      return NextResponse.json({ ok: false, error: 'Login yoki parol noto\'g\'ri.' }, { status: 401 })
    }

    if (!teacher.password_hash) {
      return NextResponse.json({
        ok: false,
        error: 'Sizga parol o\'rnatilmagan. Admin bilan bog\'laning.'
      }, { status: 403 })
    }

    const ok = await verifyPassword(password, teacher.password_hash)
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Login yoki parol noto\'g\'ri.' }, { status: 401 })
    }

    // JWT token yaratish
    const token = signToken({
      id: teacher.id,
      email: teacher.login || teacher.phone || '',
      full_name: teacher.full_name,
      center_name: '',
      role: 'user', // o'qituvchi sifatida
      status: 'active',
      trial_ends_at: null,
      active_until: null,
    } as any)

    // Cookie o'rnatish
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
      }
    })
  } catch (e: any) {
    console.error('teacher login crash:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
