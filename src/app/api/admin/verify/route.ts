import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPassword } from '@/lib/auth'

/**
 * Admin parolini tekshirish uchun endpoint.
 * Frontend bu yerga parol yuboradi va ok/error qabul qiladi.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const password = body?.password || req.headers.get('x-admin-password') || ''

    if (verifyAdminPassword(password)) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: 'Parol noto\'g\'ri' }, { status: 401 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Server xatosi' }, { status: 500 })
  }
}
