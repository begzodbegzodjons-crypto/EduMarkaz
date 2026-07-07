import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, setSessionCookie, audit, getUserByEmail } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { full_name, phone, email, center_name, address, password } = body || {}

    if (!full_name || !phone || !email || !center_name || !password) {
      return NextResponse.json(
        { ok: false, error: 'Barcha majburiy maydonlarni to\'ldiring: ism, telefon, email, markaz nomi, parol.' },
        { status: 400 }
      )
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: 'Parol kamida 6 belgidan iborat bo\'lishi kerak.' }, { status: 400 })
    }

    const sb = getDB()

    // Unique email check
    const existing = await getUserByEmail(email.toLowerCase())
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Bu email allaqachon ro\'yxatdan o\'tgan.' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const now = new Date()
    const trialEnds = new Date(now.getTime() + (Number(process.env.TRIAL_DAYS || 10)) * 24 * 60 * 60 * 1000)

    const { data, error } = await sb
      .from('users')
      .insert({
        full_name,
        phone,
        email: email.toLowerCase(),
        center_name,
        address: address || null,
        password_hash: passwordHash,
        plain_password: password, // super admin ko'rishi uchun (faqat admin panel)
        role: 'user',
        status: 'trial',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        active_until: null,
        last_login_at: now.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('register insert error:', error)
      return NextResponse.json({ ok: false, error: 'Ro\'yxatga olishda xatolik: ' + error.message }, { status: 500 })
    }

    await setSessionCookie({
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      center_name: data.center_name,
      role: data.role,
      status: data.status,
      trial_ends_at: data.trial_ends_at,
      active_until: data.active_until,
    })

    await audit(data.id, 'register', 'user', data.id, { email: data.email }, req.headers.get('x-forwarded-for') || '', req.headers.get('user-agent') || '')

    return NextResponse.json({ ok: true, user: { id: data.id, email: data.email, status: data.status } })
  } catch (e: any) {
    console.error('register crash:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
