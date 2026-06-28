import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (!adminCheck.ok) return NextResponse.json({ ok: false, error: adminCheck.error }, { status: 403 })

    const sb = getDB()
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
