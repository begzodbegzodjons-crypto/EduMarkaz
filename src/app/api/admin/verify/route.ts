import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPassword, setSessionCookie } from '@/lib/auth'

/**
 * Admin parolini tekshirish uchun endpoint.
 * Frontend bu yerga parol yuboradi va ok/error qabul qiladi.
 * Muvaffaqiyatli bo'lsa, admin session cookie o'rnatadi.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const password = body?.password || req.headers.get('x-admin-password') || ''

    if (!password) {
      return NextResponse.json({ ok: false, error: 'Parol kiritilmagan' }, { status: 400 })
    }

    if (verifyAdminPassword(password)) {
      // Admin session o'rnatamiz (requireAdmin'da session ham tekshiriladi)
      try {
        await setSessionCookie({
          id: 'admin',
          email: 'admin@system',
          full_name: 'Super Admin',
          center_name: 'System',
          role: 'admin',
          status: 'active',
          trial_ends_at: null,
          active_until: null,
        } as any)
      } catch (e) {
        // Cookie o'rnatish muvaffaqiyatsiz bo'lsa ham, parol to'g'ri - OK
        console.error('Admin cookie set error:', e)
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: 'Parol noto\'g\'ri' }, { status: 401 })
  } catch (e: any) {
    console.error('Admin verify crash:', e)
    return NextResponse.json({ ok: false, error: 'Server xatosi: ' + (e?.message || '') }, { status: 500 })
  }
}
