import { NextRequest, NextResponse } from 'next/server'
import { getSession, audit, } from '@/lib/auth'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const sess = await getSession()
    if (!sess) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
    if (sess.role !== 'admin') return NextResponse.json({ ok: false, error: 'Faqat admin.' }, { status: 403 })
    if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: 'Supabase sozlanmagan.' }, { status: 500 })

    const sb = getSupabase()
    const { data, error } = await sb
      .from('users')
      .select('id, full_name, email, phone, center_name, role, status, trial_started_at, trial_ends_at, active_until, last_login_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, users: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
