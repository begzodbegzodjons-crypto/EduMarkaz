import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

// Markazni aktivlashtirish — kun berish
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin(req)
    if (!adminCheck.ok) return NextResponse.json({ ok: false, error: adminCheck.error }, { status: 403 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const days = Number(body?.days) || 30

    const sb = getDB()

    // Mavjud active_until ni olish
    const { data: existing } = await sb.from('users').select('active_until, status').eq('id', id).maybeSingle()
    const now = new Date()
    const baseDate = existing?.active_until && new Date(existing.active_until) > now
      ? new Date(existing.active_until)
      : now
    const newActiveUntil = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

    const { data, error } = await sb.from('users')
      .update({
        status: 'active',
        active_until: newActiveUntil.toISOString(),
        last_activation_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', id)
      .select('id, full_name, status, active_until')
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, user: data, message: `${data.full_name} aktivlashtirildi (+${days} kun)` })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
