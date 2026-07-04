import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

const TEACHER_COOKIE = 'erp_teacher_session'

export async function GET() {
  try {
    const store = await cookies()
    const token = store.get(TEACHER_COOKIE)?.value
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Sessiya tugagan.' }, { status: 401 })
    }

    const sb = getSupabase()
    // O'qituvchi ma'lumotlarini yangilab olamiz
    const { data: teacher, error } = await sb.from('teachers')
      .select('id, user_id, full_name, phone, login, subject')
      .eq('id', payload.id)
      .maybeSingle()

    if (error || !teacher) {
      return NextResponse.json({ ok: false, error: 'O\'qituvchi topilmadi.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, teacher })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
