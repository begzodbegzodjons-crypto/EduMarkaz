import { NextRequest, NextResponse } from 'next/server'
import {
  getSession,
  getUserById,
  verifyPassword,
  hashPassword,
  setSessionCookie,
  audit,
} from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * POST /api/auth/change-credentials
 * Body: { current_password, new_email?, new_password? }
 *
 * O'quv markaz admini o'z login (email) va parolini o'zgartiradi.
 * Xavfsizlik uchun joriy parolni tekshiradi.
 */
export async function POST(req: NextRequest) {
  try {
    const sess = await getSession()
    if (!sess) {
      return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
    }

    const body = await req.json()
    const { current_password, new_email, new_password } = body || {}

    if (!current_password) {
      return NextResponse.json({ ok: false, error: 'Joriy parolni kiriting.' }, { status: 400 })
    }

    // Foydalanuvchini olish
    const sb = isSupabaseConfigured() ? getSupabase() : null
    if (!sb) {
      return NextResponse.json({ ok: false, error: 'Ma\'lumotlar bazasi sozlanmagan.' }, { status: 500 })
    }

    const { data: user, error: userErr } = await sb.from('users')
      .select('id, email, password_hash, full_name, center_name, role, status, trial_ends_at, active_until')
      .eq('id', sess.id)
      .maybeSingle()

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: 'Foydalanuvchi topilmadi.' }, { status: 404 })
    }

    // Joriy parolni tekshirish
    const passwordOk = await verifyPassword(current_password, user.password_hash)
    if (!passwordOk) {
      return NextResponse.json({ ok: false, error: 'Joriy parol noto\'g\'ri.' }, { status: 401 })
    }

    // Hech narsa o'zgartirilmagan bo'lsa
    if (!new_email && !new_password) {
      return NextResponse.json({ ok: false, error: 'O\'zgartirish uchun yangi email yoki parol kiriting.' }, { status: 400 })
    }

    // Update payload
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }

    let newEmail = user.email

    // Email (login) ni o'zgartirish
    if (new_email && new_email.trim() !== user.email) {
      const emailLower = new_email.trim().toLowerCase()

      // Email formatini tekshirish
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailLower)) {
        return NextResponse.json({ ok: false, error: 'Email formati noto\'g\'ri.' }, { status: 400 })
      }

      // Email unique ekanligini tekshirish
      const { data: existing } = await sb.from('users')
        .select('id, email')
        .eq('email', emailLower)
        .neq('id', sess.id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ ok: false, error: 'Bu email allaqachon ro\'yxatdan o\'tgan.' }, { status: 409 })
      }

      updatePayload.email = emailLower
      newEmail = emailLower
    }

    // Parolni o'zgartirish
    if (new_password) {
      if (new_password.length < 6) {
        return NextResponse.json({ ok: false, error: 'Yangi parol kamida 6 belgi bo\'lishi kerak.' }, { status: 400 })
      }
      if (new_password === current_password) {
        return NextResponse.json({ ok: false, error: 'Yangi parol joriy paroldan farqli bo\'lishi kerak.' }, { status: 400 })
      }

      const newHash = await hashPassword(new_password)
      updatePayload.password_hash = newHash
      // plain_password ni ham yangilaymiz (super admin ko'rishi uchun)
      try {
        updatePayload.plain_password = new_password
      } catch (e) {
        // plain_password ustuni yo'q bo'lsa e'tibor berilmaydi
      }
    }

    // Yangilash
    const { error: updErr } = await sb.from('users')
      .update(updatePayload)
      .eq('id', sess.id)

    if (updErr) {
      console.error('change credentials error:', updErr)
      // plain_password xatosi bo'lsa, uni olib tashlab qayta urinish
      if (updErr.message && updErr.message.includes('plain_password')) {
        const { plain_password: _pp, ...safePayload } = updatePayload
        const { error: retryErr } = await sb.from('users')
          .update(safePayload)
          .eq('id', sess.id)
        if (retryErr) {
          return NextResponse.json({ ok: false, error: 'Yangilashda xatolik: ' + retryErr.message }, { status: 500 })
        }
      } else {
        return NextResponse.json({ ok: false, error: 'Yangilashda xatolik: ' + updErr.message }, { status: 500 })
      }
    }

    // Email o'zgarsa, session cookie ni yangilash
    if (newEmail !== user.email) {
      await setSessionCookie({
        id: user.id,
        email: newEmail,
        full_name: user.full_name,
        center_name: user.center_name,
        role: user.role,
        status: user.status,
        trial_ends_at: user.trial_ends_at,
        active_until: user.active_until,
      })
    }

    // Audit log
    await audit(sess.id, 'change_credentials', 'users', sess.id, {
      email_changed: newEmail !== user.email,
      password_changed: !!new_password,
    })

    return NextResponse.json({
      ok: true,
      message: 'Ma\'lumotlar muvaffaqiyatli yangilandi!',
      new_email: newEmail !== user.email ? newEmail : undefined,
    })
  } catch (e: any) {
    console.error('change credentials crash:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
