import { NextRequest, NextResponse } from 'next/server'
import {
  verifyPassword,
  setSessionCookie,
  getUserByEmail,
  syncUserStatus,
  audit,
} from '@/lib/auth'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Email va parol majburiy.' }, { status: 400 })
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Supabase sozlanmagan.' }, { status: 500 })
    }

    const user = await getUserByEmail(email.toLowerCase())
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Email yoki parol noto\'g\'ri.' }, { status: 401 })
    }
    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Email yoki parol noto\'g\'ri.' }, { status: 401 })
    }

    // Statusni yangilash (trial tugagan bo'lsa blocked ga o'tadi)
    const synced = await syncUserStatus(user)

    // last_login_at
    const sb = getSupabase()
    await sb.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', synced.id)

    await setSessionCookie({
      id: synced.id,
      email: synced.email,
      full_name: synced.full_name,
      center_name: synced.center_name,
      role: synced.role,
      status: synced.status,
      trial_ends_at: synced.trial_ends_at,
      active_until: synced.active_until,
    })

    await audit(synced.id, 'login', 'user', synced.id, null, req.headers.get('x-forwarded-for') || '', req.headers.get('user-agent') || '')

    return NextResponse.json({ ok: true, user: { id: synced.id, email: synced.email, status: synced.status, role: synced.role } })
  } catch (e: any) {
    console.error('login crash:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
