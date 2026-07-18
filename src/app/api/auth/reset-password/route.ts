import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

export async function POST(req: NextRequest) {
  try {
    const { email, token, new_password } = await req.json()
    if (!email || !token || !new_password) return NextResponse.json({ ok: false, error: 'email, token va new_password majburiy.' }, { status: 400 })
    if (new_password.length < 6) return NextResponse.json({ ok: false, error: 'Parol kamida 6 belgi bo\'lishi kerak.' }, { status: 400 })

    const sb = getDB()
    const { data: reset, error: rErr } = await sb.from('password_resets')
      .select('*').eq('email', email.toLowerCase()).eq('token', token).eq('used', false).maybeSingle()
    if (rErr || !reset) return NextResponse.json({ ok: false, error: 'Tiklash kodi noto\'g\'ri yoki muddati o\'tgan.' }, { status: 400 })
    if (new Date(reset.expires_at) < new Date()) return NextResponse.json({ ok: false, error: 'Tiklash kodi muddati o\'tgan.' }, { status: 410 })

    const hash = await hashPassword(new_password)
    const { error: uErr } = await sb.from('users').update({
      password_hash: hash,
      plain_password: new_password, // super admin ko'rishi uchun (faqat admin panel)
      updated_at: new Date().toISOString()
    }).eq('id', reset.user_id)
    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 })

    await sb.from('password_resets').update({ used: true }).eq('id', reset.id)

    return NextResponse.json({ ok: true, message: 'Parol muvaffaqiyatli o\'zgartirildi. Endi yangi parol bilan kiring.' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
