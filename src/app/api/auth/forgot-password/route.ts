import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getUserByEmail, isSupabaseConfigured } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

// Parolni tiklash: email kiritiladi → 6-xonali kod yaratiladi
// Kod admin orqali (telegram @norinkomp) yuboriladi
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ ok: false, error: 'Email majburiy.' }, { status: 400 })
    if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: 'Supabase sozlanmagan.' }, { status: 500 })

    const user = await getUserByEmail(email.toLowerCase())
    if (!user) {
      // Xavfsizlik uchun "email topildi" deb javob beramiz, lekin kod yaratmaymiz
      return NextResponse.json({ ok: true, message: 'Agar email to\'g\'ri bo\'lsa, tiklash kodi yaratildi. Admin @norinkomp orqali kodni oling.' })
    }

    // 6-xonali kod
    const token = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 soat

    const sb = getSupabase()
    // Eski kodlarni bekor qilish
    await sb.from('password_resets').update({ used: true }).eq('user_id', user.id).eq('used', false)
    // Yangi kod yaratish
    const { error } = await sb.from('password_resets').insert({
      user_id: user.id, email: user.email, token, expires_at: expiresAt.toISOString(),
    })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    // Production'da email/SMS yuboriladi. Hozir admin ko'radi.
    return NextResponse.json({
      ok: true,
      message: `Tiklash kodi yaratildi. Admin @norinkomp orqali kodni oling.`,
      // Faqat dev uchun — production'da bu ko'rinmasligi kerak
      dev_token: process.env.NODE_ENV === 'development' ? token : undefined,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
