import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ ok: false, error: 'Email majburiy.' }, { status: 400 })

    const user = await getUserByEmail(email.toLowerCase())
    if (!user) {
      return NextResponse.json({ ok: true, message: 'Agar email to\'g\'ri bo\'lsa, tiklash kodi yaratildi. Admin @norinkomp orqali kodni oling.' })
    }

    const token = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    const sb = getDB()
    await sb.from('password_resets').update({ used: true }).eq('user_id', user.id).eq('used', false)
    const { error } = await sb.from('password_resets').insert({
      user_id: user.id, email: user.email, token, expires_at: expiresAt.toISOString(),
    })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      message: `Tiklash kodi yaratildi. Admin @norinkomp orqali kodni oling.`,
      dev_token: token, // Demo rejimda kod ko'rsatiladi
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
