import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

// Markazni bloklash
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin(req)
    if (!adminCheck.ok) return NextResponse.json({ ok: false, error: adminCheck.error }, { status: 403 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const reason = body?.reason || 'Admin tomonidan bloklandi'

    const sb = getDB()
    const { data, error } = await sb.from('users')
      .update({ status: 'blocked', active_until: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, full_name, status')
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, user: data, message: `${data.full_name} bloklandi` })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
